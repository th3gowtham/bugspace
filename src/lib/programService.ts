import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ProgramData } from "@/components/ProgramCard";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProgramFormData {
  programName: string;
  companyName: string;
  platformType?: string;
  bountyRange?: string;
  programUrl?: string;
  scope?: string[];        // array of in-scope domains / targets
  programRules?: string;
  disclosureEmail?: string;
  isPremium: boolean;
  status?: string;        // "active" | "paused" | "closed" | "inactive"
}

export interface FirestoreProgram {
  programName: string;
  companyName: string;
  platformType?: string;
  bountyRange?: string;
  programUrl?: string;
  scope?: string[];
  programRules?: string;
  disclosureEmail?: string;
  createdBy: string;
  createdAt: { toDate: () => Date } | null;
  updatedAt: { toDate: () => Date } | null;
  status: string;
  isPremium?: boolean;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateProgramForm(data: Partial<ProgramFormData>): string | null {
  if (!data.programName?.trim()) return "Program name is required.";
  if (!data.companyName?.trim()) return "Company name is required.";
  if (data.disclosureEmail?.trim() && !EMAIL_RE.test(data.disclosureEmail.trim()))
    return "Disclosure email must be a valid email address.";
  return null;
}

// ─── Employer check (by email field in employers collection) ─────────────────
// employers collection uses auto-generated doc IDs; email is stored as a field.

export async function isEmployerUser(email: string): Promise<boolean> {
  const q = query(
    collection(db, "employers"),
    where("email", "==", email.toLowerCase().trim())
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

// ─── Fetch single program by document ID ───────────────────────────────────────────

export async function getProgram(id: string): Promise<(FirestoreProgram & { id: string }) | null> {
  const snap = await getDoc(doc(db, "programs", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as FirestoreProgram) };
}

// ─── Update an existing program (employer edit) ────────────────────────────────────

export async function updateProgram(
  programId: string,
  uid: string,
  formData: ProgramFormData
): Promise<void> {
  const validationError = validateProgramForm(formData);
  if (validationError) throw new Error(validationError);

  const ref = doc(db, "programs", programId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Program not found.");
  if ((snap.data() as FirestoreProgram).createdBy !== uid)
    throw new Error("Unauthorized: you can only edit your own programs.");

  await updateDoc(ref, {
    programName:     formData.programName.trim(),
    companyName:     formData.companyName.trim(),
    platformType:    formData.platformType || "self-hosted",
    bountyRange:     formData.bountyRange?.trim() || "",
    programUrl:      formData.programUrl?.trim() || "",
    scope:           (formData.scope ?? []).map((s) => s.trim()).filter(Boolean),
    programRules:    formData.programRules?.trim() || "",
    disclosureEmail: formData.disclosureEmail?.trim() || "",
    isPremium:       formData.isPremium ?? false,
    status:          formData.status ?? "active",
    updatedAt:       serverTimestamp(),
  });
}

// ─── Delete a program (employer only, must own it) ────────────────────────────

export async function deleteProgram(programId: string, uid: string): Promise<void> {
  const ref = doc(db, "programs", programId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Program not found.");
  if ((snap.data() as FirestoreProgram).createdBy !== uid)
    throw new Error("Unauthorized: you can only delete your own programs.");
  await deleteDoc(ref);
}

// ─── Add program ──────────────────────────────────────────────────────────────

export async function addProgram(
  formData: ProgramFormData,
  uid: string,
  email: string
): Promise<string> {
  const employer = await isEmployerUser(email);
  if (!employer) {
    throw new Error("Unauthorized: only employers can submit programs.");
  }

  const validationError = validateProgramForm(formData);
  if (validationError) throw new Error(validationError);

  const docRef = await addDoc(collection(db, "programs"), {
    programName:      formData.programName.trim(),
    companyName:      formData.companyName.trim(),
    platformType:     formData.platformType || "self-hosted",
    bountyRange:      formData.bountyRange?.trim() || "",
    programUrl:       formData.programUrl?.trim() || "",
    scope:            (formData.scope ?? []).map((s) => s.trim()).filter(Boolean),
    programRules:     formData.programRules?.trim() || "",
    disclosureEmail:  formData.disclosureEmail?.trim() || "",
    createdBy:        uid,
    createdAt:        serverTimestamp(),
    updatedAt:        serverTimestamp(),
    status:           formData.status ?? "active",
    isPremium:        formData.isPremium ?? false,
  });

  return docRef.id;
}

// ─── Fetch premium-only programs ─────────────────────────────────────────────
export async function fetchPremiumPrograms(pageLimit = 50): Promise<(ProgramData & { rawStatus: string; rawCreatedAt: Date | null })[]> {
  const q = query(
    collection(db, "programs"),
    orderBy("createdAt", "desc"),
    limit(pageLimit)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .filter((d) => {
      const d2 = d.data() as FirestoreProgram;
      return d2.isPremium === true && d2.status !== "inactive";
    })
    .map((d) => {
      const data = d.data() as FirestoreProgram;
      const base = mapFirestoreToProgramData(d.id, data);
      return {
        ...base,
        rawStatus:    data.status ?? "active",
        rawCreatedAt: data.createdAt?.toDate?.() ?? null,
      };
    });
}

// ─── Fetch ALL programs ordered by createdAt ────────────────────────────────────────
// No status filter here – BrowsePrograms filters client-side.
// Ordering is also applied client-side so no composite index needed.

export async function fetchPrograms(pageLimit = 50): Promise<(ProgramData & { rawStatus: string; rawCreatedAt: Date | null })[]> {
  const q = query(
    collection(db, "programs"),
    orderBy("createdAt", "desc"),
    limit(pageLimit)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .filter((d) => (d.data() as FirestoreProgram).status !== "inactive")
    .map((d) => {
      const data = d.data() as FirestoreProgram;
      const base = mapFirestoreToProgramData(d.id, data);
      return {
        ...base,
        rawStatus:    data.status ?? "active",
        rawCreatedAt: data.createdAt?.toDate?.() ?? null,
      };
    });
}

// Keep for backward compat (Dashboard, EmployerDashboard use via programService)
export async function fetchActivePrograms(pageLimit = 20): Promise<ProgramData[]> {
  const q = query(
    collection(db, "programs"),
    orderBy("createdAt", "desc"),
    limit(pageLimit)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .filter((d) => (d.data() as FirestoreProgram).status === "active")
    .map((d) => mapFirestoreToProgramData(d.id, d.data() as FirestoreProgram));
}

// ─── Fetch employer's own programs ───────────────────────────────────────────
// Single-field where() needs no composite index. Sort by createdAt client-side.

export async function fetchEmployerPrograms(uid: string): Promise<ProgramData[]> {
  const q = query(
    collection(db, "programs"),
    where("createdBy", "==", uid)
  );
  const snapshot = await getDocs(q);
  const docs = snapshot.docs.map((d) =>
    mapFirestoreToProgramData(d.id, d.data() as FirestoreProgram)
  );
  // Sort latest first on the client
  return docs.sort((a, b) => a.updatedDaysAgo - b.updatedDaysAgo);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapPlatformType(raw: string): ProgramData["platform"] {
  const normalised = raw.toLowerCase().replace(/[- ]/g, "");
  if (normalised === "hackerone")  return "HackerOne";
  if (normalised === "bugcrowd")   return "Bugcrowd";
  if (normalised === "intigriti")  return "Intigriti";
  if (normalised === "yeswehack")  return "YesWeHack";
  return "Self-Hosted";
}

function daysSince(timestamp: { toDate: () => Date } | null): number {
  if (!timestamp?.toDate) return 0;
  return Math.floor((Date.now() - timestamp.toDate().getTime()) / 86_400_000);
}

function mapFirestoreStatus(raw: string): ProgramData["status"] {
  switch (raw?.toLowerCase()) {
    case "paused":   return "Paused";
    case "closed":   return "Closed";
    case "new":      return "New";
    case "active":
    default:         return "Active";
  }
}

export function mapFirestoreToProgramData(id: string, data: FirestoreProgram): ProgramData {
  const scope = Array.isArray(data.scope) ? data.scope : [];
  return {
    id,
    name:           data.programName ?? "",
    company:        data.companyName ?? "",
    platform:       mapPlatformType(data.platformType ?? ""),
    bountyRange:    data.bountyRange ?? "Not specified",
    status:         mapFirestoreStatus(data.status ?? "active"),
    updatedDaysAgo: daysSince(data.createdAt),
    scopePreview:   scope.join(", "),
    isPremium:      data.isPremium ?? false,
  };
}
