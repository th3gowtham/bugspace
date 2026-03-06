import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Constants ────────────────────────────────────────────────────────────────
const REFERRAL_CODE_KEY = "bugspace_ref_code";
const REFERRAL_TIERS = [
  { required: 20, months: 1 },
  { required: 40, months: 2 },
];

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ReferralStats {
  referralCode: string;
  referralCount: number;
  referredBy: string | null;
  premiumUntil: Timestamp | null;
}

export interface ReferredUser {
  email: string;
  createdAt: Timestamp;
}

// ─── Code Generation ──────────────────────────────────────────────────────────

/** Generate a random 8-character alphanumeric referral code */
export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/** Build a shareable referral URL */
export function buildReferralLink(code: string): string {
  return `https://bugspace.netlify.app/signup?ref=${code}`;
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

/** Persist referral code from URL into localStorage */
export function storeRefCodeFromUrl(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref) {
    localStorage.setItem(REFERRAL_CODE_KEY, ref);
  }
}

/** Read the stored referral code (if any) */
export function getStoredRefCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFERRAL_CODE_KEY);
}

/** Clear the stored referral code after it has been processed */
export function clearStoredRefCode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REFERRAL_CODE_KEY);
}

// ─── Firestore helpers ────────────────────────────────────────────────────────

/** Find a user document that owns a given referral code (returns uid | null) */
export async function findUserByReferralCode(code: string): Promise<string | null> {
  const q = query(collection(db, "users"), where("referralCode", "==", code));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id; // uid
}

/** Retrieve referral stats for a user. Auto-repairs a missing referral code. */
export async function getReferralStats(uid: string): Promise<ReferralStats | null> {
  const ref  = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const d = snap.data();

  // Auto-repair: if the user doc pre-dates the referral system, generate a code now.
  let referralCode = (d.referralCode as string | undefined) ?? "";
  if (!referralCode) {
    referralCode = generateReferralCode();
    await updateDoc(ref, { referralCode, referralCount: 0, referredBy: null, premiumUntil: null });
  }

  return {
    referralCode,
    referralCount: (d.referralCount as number | undefined)  ?? 0,
    referredBy:    (d.referredBy  as string | null | undefined) ?? null,
    premiumUntil:  (d.premiumUntil as Timestamp | null | undefined) ?? null,
  };
}

/** List all users referred by a given uid */
export async function getReferredUsers(uid: string): Promise<ReferredUser[]> {
  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists()) {
    const referrerEmail = snap.data()?.email ?? "";
    const q = query(
      collection(db, "referrals"),
      where("referrerEmail", "==", referrerEmail)
    );
    const refSnap = await getDocs(q);
    return refSnap.docs.map((d) => ({
      email:     d.data().referredUserEmail as string,
      createdAt: d.data().createdAt as Timestamp,
    }));
  }
  return [];
}

// ─── Core referral processing ─────────────────────────────────────────────────

/**
 * Called immediately after a new user document has been created in Firestore.
 *
 * The referral code is already written by createUserDocument.
 * This function only:
 *   1. Persists referredBy on the new user's document (if they arrived via a link)
 *   2. Increments the referrer's referralCount
 *   3. Creates a referral record in the "referrals" collection
 *   4. Awards premium if a reward tier is reached
 */
export async function processReferralOnSignup(
  newUid: string,
  newUserEmail: string
): Promise<void> {
  const refCode = getStoredRefCode();

  // Always clear the localStorage entry so it isn't reused on a subsequent login
  clearStoredRefCode();

  if (!refCode) return; // visitor did not come from a referral link

  // 1. Anti-abuse: a user cannot refer themselves
  const referrerUid = await findUserByReferralCode(refCode);
  if (!referrerUid || referrerUid === newUid) return;

  const referrerRef  = doc(db, "users", referrerUid);
  const referrerSnap = await getDoc(referrerRef);
  if (!referrerSnap.exists()) return;

  const referrerEmail = referrerSnap.data().email as string;

  // 2. Anti-abuse: one referral per email address
  const dupQ = query(
    collection(db, "referrals"),
    where("referrerEmail",     "==", referrerEmail),
    where("referredUserEmail", "==", newUserEmail)
  );
  const dupSnap = await getDocs(dupQ);
  if (!dupSnap.empty) return;

  // 3. Record which code invited this user (purely informational)
  const newUserRef = doc(db, "users", newUid);
  await updateDoc(newUserRef, { referredBy: refCode });

  // 4. Increment referrer's count
  await updateDoc(referrerRef, { referralCount: increment(1) });

  // 5. Create referral record
  await addDoc(collection(db, "referrals"), {
    referrerEmail:     referrerEmail,
    referredUserEmail: newUserEmail,
    referrerUid:       referrerUid,
    referredUid:       newUid,
    createdAt:         serverTimestamp(),
  });

  // 6. Re-read updated count and check reward tiers
  const updatedSnap = await getDoc(referrerRef);
  const newCount    = updatedSnap.data()?.referralCount ?? 0;
  await checkAndAwardPremium(referrerUid, newCount, updatedSnap.data()?.premiumUntil ?? null);
}

/**
 * Checks if the referrer has crossed a reward tier and extends premiumUntil.
 * Only awards when the count *exactly* hits a tier to prevent double-awards.
 */
async function checkAndAwardPremium(
  uid: string,
  count: number,
  currentPremiumUntil: Timestamp | null
): Promise<void> {
  const tier = REFERRAL_TIERS.find((t) => t.required === count);
  if (!tier) return;

  const now       = new Date();
  const baseDate  = currentPremiumUntil
    ? new Date(currentPremiumUntil.toMillis())
    : now;

  // Extend from whichever is later: now or current expiry
  const startFrom = baseDate > now ? baseDate : now;
  const newExpiry = new Date(startFrom);
  newExpiry.setMonth(newExpiry.getMonth() + tier.months);

  await updateDoc(doc(db, "users", uid), {
    premiumUntil: Timestamp.fromDate(newExpiry),
  });
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Returns next tier info for progress display */
export function getNextTier(count: number): { required: number; months: number } | null {
  return REFERRAL_TIERS.find((t) => count < t.required) ?? null;
}

/** Returns whether a user currently has an active premium subscription */
export function isPremiumActive(premiumUntil: Timestamp | null): boolean {
  if (!premiumUntil) return false;
  return premiumUntil.toMillis() > Date.now();
}
