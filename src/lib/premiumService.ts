import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type PremiumSource = "paid" | "referral" | "admin-granted";

export interface PremiumUserRecord {
  id: string;
  userId: string;
  email: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  assignedBy: string;
  createdAt: Date;
  source: PremiumSource;
}

/** Referral-awarded premium users (stored in `users` collection, not `premiumUsers`) */
export interface ReferralPremiumUser {
  uid: string;
  email: string;
  referralCount: number;
  premiumUntil: Date;
  premiumGrantedAt: Date | null;
}

export interface AppUser {
  uid: string;
  email: string;
  fullName: string;
}

// ─── Check if a user currently has valid premium access ───────────────────────
export async function checkPremiumAccess(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "premiumUsers", uid));
    if (!snap.exists()) return false;
    const data = snap.data();
    if (!data.isActive) return false;
    const endDate: Date = data.endDate?.toDate?.() ?? new Date(0);
    return endDate >= new Date();
  } catch {
    return false;
  }
}

// ─── Admin: fetch all registered users ───────────────────────────────────────
export async function fetchAllUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      email: data.email ?? "",
      fullName: data.fullName ?? data.displayName ?? "",
    };
  });
}

// ─── Admin: assign premium to a user ─────────────────────────────────────────
export async function assignPremiumUser(
  uid: string,
  email: string,
  startDate: Date,
  endDate: Date,
  adminUid: string,
  source: PremiumSource = "admin-granted"
): Promise<void> {
  await setDoc(doc(db, "premiumUsers", uid), {
    userId: uid,
    email,
    startDate: Timestamp.fromDate(startDate),
    endDate: Timestamp.fromDate(endDate),
    isActive: true,
    assignedBy: adminUid,
    source,
    createdAt: serverTimestamp(),
  });
}

// ─── Admin: update endDate or isActive ───────────────────────────────────────
export async function updatePremiumUser(
  uid: string,
  updates: { endDate?: Date; isActive?: boolean }
): Promise<void> {
  const mapped: Record<string, unknown> = {};
  if (updates.isActive !== undefined) mapped.isActive = updates.isActive;
  if (updates.endDate !== undefined) mapped.endDate = Timestamp.fromDate(updates.endDate);
  await updateDoc(doc(db, "premiumUsers", uid), mapped);
}

// ─── Admin: remove premium access ────────────────────────────────────────────
export async function removePremiumUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, "premiumUsers", uid));
}

// ─── Admin: fetch all premium user records ───────────────────────────────────
export async function fetchAllPremiumUsers(): Promise<PremiumUserRecord[]> {
  const snap = await getDocs(collection(db, "premiumUsers"));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id:         d.id,
      userId:     data.userId     ?? d.id,
      email:      data.email      ?? "",
      startDate:  data.startDate?.toDate?.() ?? new Date(),
      endDate:    data.endDate?.toDate?.()   ?? new Date(),
      isActive:   data.isActive   ?? false,
      assignedBy: data.assignedBy ?? "",
      createdAt:  data.createdAt?.toDate?.() ?? new Date(),
      source:     (data.source as PremiumSource | undefined) ?? "admin-granted",
    };
  });
}

// ─── Fetch referral-awarded premium users (from `users` collection) ────────────
export async function fetchReferralPremiumUsers(): Promise<ReferralPremiumUser[]> {
  const snap = await getDocs(
    query(collection(db, "users"), where("premiumSource", "==", "referral"))
  );
  const now = new Date();
  return snap.docs
    .map((d) => {
      const data = d.data();
      return {
        uid:             d.id,
        email:           data.email          ?? "",
        referralCount:   data.referralCount  ?? 0,
        premiumUntil:    data.premiumUntil?.toDate?.()    ?? new Date(0),
        premiumGrantedAt: data.premiumGrantedAt?.toDate?.() ?? null,
      };
    })
    .filter((u) => u.premiumUntil >= now); // only currently active
}
