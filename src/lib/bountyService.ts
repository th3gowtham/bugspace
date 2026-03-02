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
  getCountFromServer,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BountySeverity = "Low" | "Medium" | "High" | "Critical";
export type BountyStatus   = "Pending" | "Approved" | "Paid";
export type BountyCurrency = "USD" | "INR" | "EUR" | "GBP" | "AUD";

export interface BountyEntry {
  entryId:      string;
  uid:          string;
  companyName:  string;
  platform:     string;
  bugTitle:     string;
  severity:     BountySeverity;
  amount:       number;
  currency:     BountyCurrency;
  status:       BountyStatus;
  reportDate:   Date;
  approvedDate: Date | null;
  paidDate:     Date | null;
  notes:        string;
  createdAt:    Date;
  updatedAt:    Date;
}

export interface BountyEntryInput {
  companyName:  string;
  platform:     string;
  bugTitle:     string;
  severity:     BountySeverity;
  amount:       number;
  currency:     BountyCurrency;
  status:       BountyStatus;
  reportDate:   Date;
  approvedDate: Date | null;
  paidDate:     Date | null;
  notes:        string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function entriesCol(uid: string) {
  return collection(db, "bounties", uid, "entries");
}

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date)      return value;
  return new Date(0);
}

function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  return toDate(value);
}

function mapDoc(id: string, data: Record<string, unknown>): BountyEntry {
  return {
    entryId:      id,
    uid:          data.uid          as string,
    companyName:  data.companyName  as string,
    platform:     data.platform     as string,
    bugTitle:     data.bugTitle     as string,
    severity:     data.severity     as BountySeverity,
    amount:       data.amount       as number,
    currency:     data.currency     as BountyCurrency,
    status:       data.status       as BountyStatus,
    reportDate:   toDate(data.reportDate),
    approvedDate: toDateOrNull(data.approvedDate),
    paidDate:     toDateOrNull(data.paidDate),
    notes:        (data.notes as string) ?? "",
    createdAt:    toDate(data.createdAt),
    updatedAt:    toDate(data.updatedAt),
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Fetch all bounty entries for a user, sorted by reportDate desc. */
export async function fetchBountyEntries(uid: string): Promise<BountyEntry[]> {
  const q = query(entriesCol(uid), orderBy("reportDate", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>));
}

/** Get total entry count for the user (for free-plan limit check). */
export async function getBountyEntryCount(uid: string): Promise<number> {
  const snap = await getCountFromServer(entriesCol(uid));
  return snap.data().count;
}

/** Add a new bounty entry. */
export async function addBountyEntry(uid: string, input: BountyEntryInput): Promise<BountyEntry> {
  const ref = await addDoc(entriesCol(uid), {
    uid,
    ...input,
    reportDate:   Timestamp.fromDate(input.reportDate),
    approvedDate: input.approvedDate ? Timestamp.fromDate(input.approvedDate) : null,
    paidDate:     input.paidDate     ? Timestamp.fromDate(input.paidDate)     : null,
    createdAt:    serverTimestamp(),
    updatedAt:    serverTimestamp(),
  });
  return {
    entryId: ref.id,
    uid,
    ...input,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/** Update an existing bounty entry. */
export async function updateBountyEntry(
  uid: string,
  entryId: string,
  input: BountyEntryInput
): Promise<void> {
  const ref = doc(db, "bounties", uid, "entries", entryId);
  await updateDoc(ref, {
    ...input,
    reportDate:   Timestamp.fromDate(input.reportDate),
    approvedDate: input.approvedDate ? Timestamp.fromDate(input.approvedDate) : null,
    paidDate:     input.paidDate     ? Timestamp.fromDate(input.paidDate)     : null,
    updatedAt:    serverTimestamp(),
  });
}

/** Delete a bounty entry. */
export async function deleteBountyEntry(uid: string, entryId: string): Promise<void> {
  await deleteDoc(doc(db, "bounties", uid, "entries", entryId));
}

/**
 * Inline status update — updates status, updatedAt, and auto-sets
 * approvedDate / paidDate when those fields are still null.
 */
export async function updateBountyStatus(
  uid: string,
  entryId: string,
  newStatus: BountyStatus,
  current: Pick<BountyEntry, "approvedDate" | "paidDate">
): Promise<void> {
  const ref     = doc(db, "bounties", uid, "entries", entryId);
  const payload: Record<string, unknown> = {
    status:    newStatus,
    updatedAt: serverTimestamp(),
  };
  if (newStatus === "Approved" && !current.approvedDate) {
    payload.approvedDate = serverTimestamp();
  }
  if (newStatus === "Paid" && !current.paidDate) {
    payload.paidDate = serverTimestamp();
  }
  await updateDoc(ref, payload);
}

// ─── Analytics helpers ────────────────────────────────────────────────────────

export function sumPaid(entries: BountyEntry[]): number {
  return entries
    .filter((e) => e.status === "Paid")
    .reduce((acc, e) => acc + e.amount, 0);
}

export function sumPaidThisMonth(entries: BountyEntry[]): number {
  const now = new Date();
  return entries
    .filter(
      (e) =>
        e.status === "Paid" &&
        e.paidDate &&
        e.paidDate.getFullYear() === now.getFullYear() &&
        e.paidDate.getMonth()    === now.getMonth()
    )
    .reduce((acc, e) => acc + e.amount, 0);
}

export function sumPaidThisYear(entries: BountyEntry[]): number {
  const year = new Date().getFullYear();
  return entries
    .filter((e) => e.status === "Paid" && e.paidDate && e.paidDate.getFullYear() === year)
    .reduce((acc, e) => acc + e.amount, 0);
}

export function sumPending(entries: BountyEntry[]): number {
  return entries
    .filter((e) => e.status === "Pending" || e.status === "Approved")
    .reduce((acc, e) => acc + e.amount, 0);
}

/** Returns monthly totals for the given year (defaults to current year). */
export function monthlyEarningsData(entries: BountyEntry[], year = new Date().getFullYear()) {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const totals = new Array(12).fill(0) as number[];
  entries
    .filter((e) => e.status === "Paid" && e.paidDate && e.paidDate.getFullYear() === year)
    .forEach((e) => { totals[e.paidDate!.getMonth()] += e.amount; });
  return MONTHS.map((month, i) => ({ month, amount: totals[i] }));
}

/** Returns severity distribution (pie chart). */
export function severityDistributionData(entries: BountyEntry[]) {
  const counts: Record<string, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  entries.forEach((e) => { counts[e.severity] = (counts[e.severity] ?? 0) + 1; });
  return Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));
}

/** Returns entries where status == Approved, paidDate is null, and approvedDate >= 30 days ago. */
export function getDelayedEntries(entries: BountyEntry[]): BountyEntry[] {
  const MS_30_DAYS = 30 * 24 * 60 * 60 * 1000;
  return entries.filter(
    (e) =>
      e.status === "Approved" &&
      !e.paidDate &&
      e.approvedDate &&
      Date.now() - e.approvedDate.getTime() >= MS_30_DAYS
  );
}

/** Convert entries to CSV string. */
export function entriesToCSV(entries: BountyEntry[]): string {
  const headers = [
    "Company","Platform","Bug Title","Severity","Amount","Currency",
    "Status","Report Date","Approved Date","Paid Date","Notes",
  ];
  const rows = entries.map((e) => [
    `"${e.companyName}"`,
    `"${e.platform}"`,
    `"${e.bugTitle}"`,
    e.severity,
    e.amount,
    e.currency,
    e.status,
    e.reportDate.toLocaleDateString(),
    e.approvedDate?.toLocaleDateString() ?? "",
    e.paidDate?.toLocaleDateString()     ?? "",
    `"${e.notes.replace(/"/g, "'")}"`,
  ]);
  return [headers, ...rows].map((r) => r.join(",")).join("\n");
}
