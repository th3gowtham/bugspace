import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BugCurrency = "USD" | "INR" | "EUR" | "GBP" | "AUD";

export interface ExclusiveBugCategory {
  categoryId: string;
  name: string;
  createdAt: Date;
}

export interface ExclusiveBug {
  bugId: string;
  title: string;
  summary: string;
  stepsToReproduce: string;
  pocLink: string;
  referenceLink: string;
  bountyAmount: number;
  currency: BugCurrency;
  categoryId: string;
  categoryName: string;
  createdBy: string; // employer uid
  createdAt: Date;
  updatedAt: Date;
  status: "published";
}

export interface ExclusiveBugInput {
  title: string;
  summary: string;
  stepsToReproduce: string;
  pocLink: string;
  referenceLink: string;
  bountyAmount: number;
  currency: BugCurrency;
  categoryId: string;
  categoryName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BUGS_COL       = "exclusive_bugs";
const CATEGORIES_COL = "exclusive_bug_categories";

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date)      return value;
  return new Date(0);
}

function mapBug(id: string, data: Record<string, unknown>): ExclusiveBug {
  return {
    bugId:            id,
    title:            data.title            as string,
    summary:          data.summary          as string,
    stepsToReproduce: data.stepsToReproduce as string,
    pocLink:          data.pocLink          as string,
    referenceLink:    data.referenceLink    as string,
    bountyAmount:     data.bountyAmount     as number,
    currency:         data.currency         as BugCurrency,
    categoryId:       data.categoryId       as string,
    categoryName:     data.categoryName     as string,
    createdBy:        data.createdBy        as string,
    createdAt:        toDate(data.createdAt),
    updatedAt:        toDate(data.updatedAt),
    status:           "published",
  };
}

function mapCategory(id: string, data: Record<string, unknown>): ExclusiveBugCategory {
  return {
    categoryId: id,
    name:       data.name as string,
    createdAt:  toDate(data.createdAt),
  };
}

// ─── Category CRUD ────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<ExclusiveBugCategory[]> {
  const q   = query(collection(db, CATEGORIES_COL), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapCategory(d.id, d.data() as Record<string, unknown>));
}

export async function addCategory(name: string): Promise<ExclusiveBugCategory> {
  const ref = await addDoc(collection(db, CATEGORIES_COL), {
    name: name.trim(),
    createdAt: serverTimestamp(),
  });
  return { categoryId: ref.id, name: name.trim(), createdAt: new Date() };
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await deleteDoc(doc(db, CATEGORIES_COL, categoryId));
}

// ─── Bug CRUD ─────────────────────────────────────────────────────────────────

export async function fetchExclusiveBugs(): Promise<ExclusiveBug[]> {
  const q   = query(collection(db, BUGS_COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapBug(d.id, d.data() as Record<string, unknown>));
}

export async function fetchEmployerBugs(employerUid: string): Promise<ExclusiveBug[]> {
  // Fetch all then filter client-side (avoids composite index requirement)
  const all = await fetchExclusiveBugs();
  return all.filter((b) => b.createdBy === employerUid);
}

export async function addExclusiveBug(
  input: ExclusiveBugInput,
  employerUid: string,
): Promise<string> {
  const ref = await addDoc(collection(db, BUGS_COL), {
    title:            input.title.trim(),
    summary:          input.summary.trim(),
    stepsToReproduce: input.stepsToReproduce.trim(),
    pocLink:          input.pocLink.trim(),
    referenceLink:    input.referenceLink.trim(),
    bountyAmount:     input.bountyAmount,
    currency:         input.currency,
    categoryId:       input.categoryId,
    categoryName:     input.categoryName,
    createdBy:        employerUid,
    status:           "published",
    createdAt:        serverTimestamp(),
    updatedAt:        serverTimestamp(),
  });
  return ref.id;
}

export async function updateExclusiveBug(
  bugId: string,
  input: ExclusiveBugInput,
): Promise<void> {
  await updateDoc(doc(db, BUGS_COL, bugId), {
    title:            input.title.trim(),
    summary:          input.summary.trim(),
    stepsToReproduce: input.stepsToReproduce.trim(),
    pocLink:          input.pocLink.trim(),
    referenceLink:    input.referenceLink.trim(),
    bountyAmount:     input.bountyAmount,
    currency:         input.currency,
    categoryId:       input.categoryId,
    categoryName:     input.categoryName,
    updatedAt:        serverTimestamp(),
  });
}

export async function deleteExclusiveBug(bugId: string): Promise<void> {
  await deleteDoc(doc(db, BUGS_COL, bugId));
}
