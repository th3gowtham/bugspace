import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  PromoterDashboardSummary,
  PromoterListItem,
  PromoterRecord,
  PromoterReferralRecord,
  PromoterSession,
  ReferralValidationStatus,
} from "@/types/promoter";

const PROMO_CODE_KEY = "bugspace_promo_code";
const SIGNUP_IP_KEY = "bugspace_signup_ip";
const SIGNUP_FP_KEY = "bugspace_signup_fp";
const PROMOTER_SESSION_KEY = "bugspace_promoter_session";
const COMMISSION_RATE = 0.02;
const REWARD_REFERRAL_THRESHOLD = 20;
const MAX_IP_SIGNUPS_IN_WINDOW = 3;
const IP_WINDOW_MS = 30 * 60 * 1000;

function normalizePromoCode(input: string): string {
  return input.trim().toUpperCase();
}

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === "object" && "toDate" in value) {
    const candidate = value as { toDate?: () => Date };
    if (typeof candidate.toDate === "function") {
      return candidate.toDate();
    }
  }
  return new Date(0);
}

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const parsed = toDate(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function mapPromoterRecord(docSnap: QueryDocumentSnapshot<DocumentData>): PromoterRecord {
  const data = docSnap.data();
  return {
    promoterId: data.promoterId ?? docSnap.id,
    username: data.username ?? "",
    email: data.email ?? "",
    passwordHash: data.passwordHash ?? "",
    promoCode: data.promoCode ?? "",
    createdAt: toDate(data.createdAt),
    totalSignups: data.totalSignups ?? 0,
    premiumConversions: data.premiumConversions ?? 0,
    commissionEarned: data.commissionEarned ?? 0,
    rewardPremiumMonths: data.rewardPremiumMonths ?? 0,
    deviceFingerprint: data.deviceFingerprint ?? null,
  };
}

function mapPromoterReferralRecord(docSnap: QueryDocumentSnapshot<DocumentData>): PromoterReferralRecord {
  const data = docSnap.data();
  return {
    referralId: data.referralId ?? docSnap.id,
    promoCode: data.promoCode ?? "",
    userId: data.userId ?? "",
    userEmail: data.userEmail ?? "",
    signupTimestamp: toDate(data.signupTimestamp),
    ipAddress: data.ipAddress ?? null,
    deviceFingerprint: data.deviceFingerprint ?? "",
    status: (data.status as ReferralValidationStatus | undefined) ?? "suspicious",
    premiumStatus: Boolean(data.premiumStatus),
    premiumPurchaseDate: toDateOrNull(data.premiumPurchaseDate),
    premiumAmount: typeof data.premiumAmount === "number" ? data.premiumAmount : null,
    commissionAmount: typeof data.commissionAmount === "number" ? data.commissionAmount : null,
    reviewNote: data.reviewNote ?? null,
  };
}

function safeReadLocalStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

function safeWriteLocalStorage(key: string, value: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value);
}

function safeRemoveLocalStorage(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

async function sha256Hex(input: string): Promise<string> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new Error("Secure crypto API is unavailable in this environment.");
  }
  const bytes = new TextEncoder().encode(input);
  const digest = await cryptoApi.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function buildDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "";
  const fingerprintSource = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    String(navigator.hardwareConcurrency ?? ""),
    `${window.screen.width}x${window.screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");

  return sha256Hex(fingerprintSource);
}

async function fetchPublicIpAddress(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch("https://api64.ipify.org?format=json", {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { ip?: string };
    return payload.ip ?? null;
  } catch {
    return null;
  }
}

function clearPromoSignupState(): void {
  safeRemoveLocalStorage(PROMO_CODE_KEY);
  safeRemoveLocalStorage(SIGNUP_FP_KEY);
  safeRemoveLocalStorage(SIGNUP_IP_KEY);
}

async function findPromoterDocByPromoCode(
  promoCode: string
): Promise<{ id: string; data: PromoterRecord } | null> {
  const promoterQuery = query(
    collection(db, "promoters"),
    where("promoCode", "==", normalizePromoCode(promoCode)),
    limit(1),
  );
  const promoterSnap = await getDocs(promoterQuery);
  if (promoterSnap.empty) return null;
  const promoterDoc = promoterSnap.docs[0];
  return {
    id: promoterDoc.id,
    data: mapPromoterRecord(promoterDoc),
  };
}

export function storePromoCodeFromUrl(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const promo = params.get("promo");
  if (!promo) return;
  safeWriteLocalStorage(PROMO_CODE_KEY, normalizePromoCode(promo));
}

export function getStoredPromoCode(): string | null {
  const stored = safeReadLocalStorage(PROMO_CODE_KEY);
  return stored ? normalizePromoCode(stored) : null;
}

export async function primePromoterSignupContext(): Promise<void> {
  const promoCode = getStoredPromoCode();
  if (!promoCode) return;

  if (!safeReadLocalStorage(SIGNUP_FP_KEY)) {
    try {
      const fp = await buildDeviceFingerprint();
      if (fp) safeWriteLocalStorage(SIGNUP_FP_KEY, fp);
    } catch {
      // Best effort only.
    }
  }

  if (!safeReadLocalStorage(SIGNUP_IP_KEY)) {
    const ip = await fetchPublicIpAddress();
    if (ip) safeWriteLocalStorage(SIGNUP_IP_KEY, ip);
  }
}

export function buildPromoterReferralLink(promoCode: string): string {
  return `https://bugspace.in/signup?promo=${normalizePromoCode(promoCode)}`;
}

export async function hashPromoterPassword(password: string): Promise<string> {
  return sha256Hex(password);
}

export interface CreatePromoterInput {
  username: string;
  email: string;
  password: string;
  promoCode: string;
}

export async function createPromoterAccount(input: CreatePromoterInput): Promise<PromoterRecord> {
  const username = input.username.trim();
  const usernameLower = username.toLowerCase();
  const email = normalizeEmail(input.email);
  const promoCode = normalizePromoCode(input.promoCode);

  if (!username || !email || !input.password || !promoCode) {
    throw new Error("All promoter fields are required.");
  }

  const [emailSnap, usernameSnap, promoSnap] = await Promise.all([
    getDocs(query(collection(db, "promoters"), where("email", "==", email), limit(1))),
    getDocs(query(collection(db, "promoters"), where("usernameLower", "==", usernameLower), limit(1))),
    getDocs(query(collection(db, "promoters"), where("promoCode", "==", promoCode), limit(1))),
  ]);

  if (!emailSnap.empty) throw new Error("A promoter with this email already exists.");
  if (!usernameSnap.empty) throw new Error("A promoter with this username already exists.");
  if (!promoSnap.empty) throw new Error("Promo code already exists.");

  const promoterRef = doc(collection(db, "promoters"));
  const passwordHash = await hashPromoterPassword(input.password);

  await setDoc(promoterRef, {
    promoterId: promoterRef.id,
    username,
    usernameLower,
    email,
    passwordHash,
    promoCode,
    createdAt: serverTimestamp(),
    totalSignups: 0,
    premiumConversions: 0,
    commissionEarned: 0,
    rewardPremiumMonths: 0,
    deviceFingerprint: null,
  });

  const created = await getDoc(promoterRef);
  if (!created.exists()) {
    throw new Error("Failed to create promoter account.");
  }

  return mapPromoterRecord(created as QueryDocumentSnapshot<DocumentData>);
}

export function getPromoterSession(): PromoterSession | null {
  const raw = safeReadLocalStorage(PROMOTER_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PromoterSession;
    if (!parsed.promoterId || !parsed.promoCode) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setPromoterSession(session: PromoterSession): void {
  safeWriteLocalStorage(PROMOTER_SESSION_KEY, JSON.stringify(session));
}

export function clearPromoterSession(): void {
  safeRemoveLocalStorage(PROMOTER_SESSION_KEY);
}

export async function loginPromoter(
  identifier: string,
  password: string,
): Promise<{ success: boolean; session?: PromoterSession; error?: string }> {
  const lookup = identifier.trim().toLowerCase();
  if (!lookup || !password) {
    return { success: false, error: "Username/email and password are required." };
  }

  const [usernameSnap, emailSnap] = await Promise.all([
    getDocs(query(collection(db, "promoters"), where("usernameLower", "==", lookup), limit(1))),
    getDocs(query(collection(db, "promoters"), where("email", "==", lookup), limit(1))),
  ]);

  const candidate = !usernameSnap.empty ? usernameSnap.docs[0] : emailSnap.docs[0];
  if (!candidate) {
    return { success: false, error: "Invalid promoter credentials." };
  }

  const data = candidate.data();
  const inputHash = await hashPromoterPassword(password);
  if ((data.passwordHash as string | undefined) !== inputHash) {
    return { success: false, error: "Invalid promoter credentials." };
  }

  const session: PromoterSession = {
    promoterId: data.promoterId ?? candidate.id,
    username: data.username ?? "",
    email: data.email ?? "",
    promoCode: data.promoCode ?? "",
  };
  setPromoterSession(session);

  let deviceFingerprint: string | null = null;
  try {
    deviceFingerprint = await buildDeviceFingerprint();
  } catch {
    deviceFingerprint = null;
  }

  await updateDoc(doc(db, "promoters", candidate.id), {
    lastLoginAt: serverTimestamp(),
    ...(deviceFingerprint ? { deviceFingerprint } : {}),
  });

  return { success: true, session };
}

export async function processPromoterReferralOnSignup(
  newUid: string,
  newUserEmail: string,
): Promise<void> {
  const promoCode = getStoredPromoCode();
  if (!promoCode) return;

  try {
    const [promoterMatch, ipFromApi, generatedFingerprint] = await Promise.all([
      findPromoterDocByPromoCode(promoCode),
      safeReadLocalStorage(SIGNUP_IP_KEY) ? Promise.resolve(safeReadLocalStorage(SIGNUP_IP_KEY)) : fetchPublicIpAddress(),
      safeReadLocalStorage(SIGNUP_FP_KEY) ? Promise.resolve(safeReadLocalStorage(SIGNUP_FP_KEY)) : buildDeviceFingerprint(),
    ]);

    const ipAddress = ipFromApi ?? null;
    const deviceFingerprint = generatedFingerprint ?? "unknown-device";

    if (!promoterMatch) {
      await updateDoc(doc(db, "users", newUid), {
        referredByPromoCode: promoCode,
        referralSource: "promoter",
        signupIP: ipAddress,
        deviceFingerprint,
      });
      return;
    }

    const referralsSnap = await getDocs(
      query(collection(db, "promoterReferrals"), where("promoCode", "==", promoCode)),
    );
    const existingReferrals = referralsSnap.docs.map(mapPromoterReferralRecord);

    let status: ReferralValidationStatus = "valid";
    let reviewNote: string | null = null;

    if (normalizeEmail(promoterMatch.data.email) === normalizeEmail(newUserEmail)) {
      status = "rejected";
      reviewNote = "Self-referral blocked: promoter email matches referred user.";
    }

    if (
      status !== "rejected" &&
      promoterMatch.data.deviceFingerprint &&
      promoterMatch.data.deviceFingerprint === deviceFingerprint
    ) {
      status = "rejected";
      reviewNote = "Self-referral blocked: promoter fingerprint matches referred user.";
    }

    if (status === "valid") {
      const duplicateDevice = existingReferrals.some(
        (item) => item.deviceFingerprint === deviceFingerprint,
      );
      if (duplicateDevice) {
        status = "suspicious";
        reviewNote = "Duplicate device fingerprint detected.";
      }
    }

    if (status === "valid" && ipAddress) {
      const now = Date.now();
      const sameIpRecent = existingReferrals.filter((item) => {
        if (!item.ipAddress || item.ipAddress !== ipAddress) return false;
        const signupMs = item.signupTimestamp.getTime();
        if (Number.isNaN(signupMs)) return false;
        return now - signupMs <= IP_WINDOW_MS;
      }).length;

      if (sameIpRecent >= MAX_IP_SIGNUPS_IN_WINDOW) {
        status = "suspicious";
        reviewNote = "Rate limit triggered: multiple signups from the same IP.";
      }
    }

    const referralRef = doc(collection(db, "promoterReferrals"));
    await setDoc(referralRef, {
      referralId: referralRef.id,
      promoCode,
      userId: newUid,
      userEmail: normalizeEmail(newUserEmail),
      signupTimestamp: serverTimestamp(),
      ipAddress,
      deviceFingerprint,
      status,
      premiumStatus: false,
      premiumPurchaseDate: null,
      premiumAmount: null,
      commissionAmount: null,
      reviewNote,
    });

    await updateDoc(doc(db, "users", newUid), {
      referredByPromoCode: promoCode,
      referralSource: "promoter",
      signupIP: ipAddress,
      deviceFingerprint,
    });

    if (status === "valid") {
      await runTransaction(db, async (tx) => {
        const promoterRef = doc(db, "promoters", promoterMatch.id);
        const promoterSnap = await tx.get(promoterRef);
        if (!promoterSnap.exists()) return;

        const currentSignups = promoterSnap.data().totalSignups ?? 0;
        const nextSignups = currentSignups + 1;

        tx.update(promoterRef, {
          totalSignups: nextSignups,
          rewardPremiumMonths: Math.floor(nextSignups / REWARD_REFERRAL_THRESHOLD),
        });
      });
    }
  } finally {
    clearPromoSignupState();
  }
}

export async function markPromoterPremiumConversion(
  userId: string,
  premiumPrice: number,
  purchaseDate: Date = new Date(),
): Promise<boolean> {
  if (premiumPrice <= 0) return false;

  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return false;

  const referredByPromoCode = userSnap.data().referredByPromoCode as string | undefined;
  if (!referredByPromoCode) return false;

  const promoterMatch = await findPromoterDocByPromoCode(referredByPromoCode);
  if (!promoterMatch) return false;

  const referralSnap = await getDocs(
    query(
      collection(db, "promoterReferrals"),
      where("promoCode", "==", referredByPromoCode),
      where("userId", "==", userId),
      limit(1),
    ),
  );
  if (referralSnap.empty) return false;

  const referralDoc = referralSnap.docs[0];
  const referralData = referralDoc.data();
  const status = (referralData.status as ReferralValidationStatus | undefined) ?? "suspicious";
  if (status !== "valid") return false;
  if (referralData.premiumStatus === true) return true;

  const commissionAmount = roundCurrency(premiumPrice * COMMISSION_RATE);
  const promoterRef = doc(db, "promoters", promoterMatch.id);
  const referralRef = doc(db, "promoterReferrals", referralDoc.id);

  await runTransaction(db, async (tx) => {
    const [latestPromoter, latestReferral] = await Promise.all([
      tx.get(promoterRef),
      tx.get(referralRef),
    ]);
    if (!latestPromoter.exists() || !latestReferral.exists()) return;
    if (latestReferral.data().premiumStatus === true) return;
    if (((latestReferral.data().status as ReferralValidationStatus | undefined) ?? "suspicious") !== "valid") {
      return;
    }

    const currentConversions = latestPromoter.data().premiumConversions ?? 0;
    const currentCommission = latestPromoter.data().commissionEarned ?? 0;

    tx.update(promoterRef, {
      premiumConversions: currentConversions + 1,
      commissionEarned: roundCurrency(currentCommission + commissionAmount),
    });

    tx.update(referralRef, {
      premiumStatus: true,
      premiumPurchaseDate: Timestamp.fromDate(purchaseDate),
      premiumAmount: premiumPrice,
      commissionAmount,
    });

    tx.update(userRef, {
      premiumStatus: true,
      premiumPurchaseDate: Timestamp.fromDate(purchaseDate),
    });
  });

  return true;
}

export async function getPromoterDashboardSummary(
  promoterId: string,
): Promise<PromoterDashboardSummary> {
  const promoterSnap = await getDoc(doc(db, "promoters", promoterId));
  if (!promoterSnap.exists()) {
    throw new Error("Promoter account not found.");
  }

  const promoter = mapPromoterRecord(promoterSnap as QueryDocumentSnapshot<DocumentData>);
  const towardNext = promoter.totalSignups % REWARD_REFERRAL_THRESHOLD;

  return {
    promoter,
    referralLink: buildPromoterReferralLink(promoter.promoCode),
    rewardProgress: {
      validReferralsTowardReward: towardNext,
      requiredForNextReward: REWARD_REFERRAL_THRESHOLD,
      nextRewardMonths: promoter.rewardPremiumMonths + 1,
    },
  };
}

export async function fetchPromoterReferralsPage(
  promoCode: string,
  page: number,
  pageSize: number,
): Promise<{ rows: PromoterReferralRecord[]; totalRows: number; totalPages: number }> {
  const referralsSnap = await getDocs(
    query(collection(db, "promoterReferrals"), where("promoCode", "==", normalizePromoCode(promoCode))),
  );
  const allRows = referralsSnap.docs
    .map(mapPromoterReferralRecord)
    .sort((a, b) => b.signupTimestamp.getTime() - a.signupTimestamp.getTime());

  const totalRows = allRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    rows: allRows.slice(start, start + pageSize),
    totalRows,
    totalPages,
  };
}

export async function fetchPromotersForAdmin(): Promise<PromoterListItem[]> {
  const promotersSnap = await getDocs(collection(db, "promoters"));
  return promotersSnap.docs
    .map((docSnap) => {
      const promoter = mapPromoterRecord(docSnap);
      return {
        promoterId: promoter.promoterId,
        username: promoter.username,
        email: promoter.email,
        promoCode: promoter.promoCode,
        totalSignups: promoter.totalSignups,
        premiumConversions: promoter.premiumConversions,
        commissionEarned: promoter.commissionEarned,
        rewardPremiumMonths: promoter.rewardPremiumMonths,
        createdAt: promoter.createdAt,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function fetchPromoterById(promoterId: string): Promise<PromoterRecord> {
  const promoterSnap = await getDoc(doc(db, "promoters", promoterId));
  if (!promoterSnap.exists()) {
    throw new Error("Promoter not found.");
  }
  return mapPromoterRecord(promoterSnap as QueryDocumentSnapshot<DocumentData>);
}

export async function reviewPromoterReferral(
  referralId: string,
  nextStatus: ReferralValidationStatus,
  reviewNote: string | null,
): Promise<void> {
  const referralRef = doc(db, "promoterReferrals", referralId);
  const referralSnap = await getDoc(referralRef);
  if (!referralSnap.exists()) {
    throw new Error("Referral record not found.");
  }

  const referralData = referralSnap.data();
  const promoCode = (referralData.promoCode as string | undefined) ?? "";
  const promoterMatch = await findPromoterDocByPromoCode(promoCode);
  if (!promoterMatch) {
    throw new Error("Promoter record not found for referral.");
  }

  const promoterRef = doc(db, "promoters", promoterMatch.id);

  await runTransaction(db, async (tx) => {
    const [latestPromoter, latestReferral] = await Promise.all([
      tx.get(promoterRef),
      tx.get(referralRef),
    ]);
    if (!latestPromoter.exists() || !latestReferral.exists()) return;

    const promoterData = latestPromoter.data();
    const row = latestReferral.data();
    const prevStatus = (row.status as ReferralValidationStatus | undefined) ?? "suspicious";
    const isPremium = Boolean(row.premiumStatus);
    const commissionAmount = typeof row.commissionAmount === "number" ? row.commissionAmount : 0;

    let signupsDelta = 0;
    if (prevStatus !== "valid" && nextStatus === "valid") signupsDelta = 1;
    if (prevStatus === "valid" && nextStatus !== "valid") signupsDelta = -1;

    let conversionDelta = 0;
    let commissionDelta = 0;
    if (isPremium) {
      if (prevStatus !== "valid" && nextStatus === "valid") {
        conversionDelta = 1;
        commissionDelta = commissionAmount;
      }
      if (prevStatus === "valid" && nextStatus !== "valid") {
        conversionDelta = -1;
        commissionDelta = -commissionAmount;
      }
    }

    const nextSignups = Math.max(0, (promoterData.totalSignups ?? 0) + signupsDelta);
    const nextConversions = Math.max(0, (promoterData.premiumConversions ?? 0) + conversionDelta);
    const nextCommission = Math.max(0, roundCurrency((promoterData.commissionEarned ?? 0) + commissionDelta));

    tx.update(promoterRef, {
      totalSignups: nextSignups,
      premiumConversions: nextConversions,
      commissionEarned: nextCommission,
      rewardPremiumMonths: Math.floor(nextSignups / REWARD_REFERRAL_THRESHOLD),
    });

    tx.update(referralRef, {
      status: nextStatus,
      reviewNote,
      reviewedAt: serverTimestamp(),
    });
  });
}
