import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { NoteShare } from "@/types/notes";

const SHARES_COL = "notes_shares";

function toDate(v: unknown): Date {
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date)      return v;
  return new Date(0);
}

function mapShare(id: string, d: Record<string, unknown>): NoteShare {
  return {
    shareId:     id,
    ownerEmail:  d.ownerEmail  as string,
    targetEmail: d.targetEmail as string,
    folderId:    (d.folderId   as string) || null,
    permission:  d.permission  as "viewer" | "editor",
    status:      d.status      as "pending" | "accepted" | "rejected",
    folderName:  (d.folderName as string) || "",
    createdAt:   toDate(d.createdAt),
  };
}

/** Create a share invite (status = pending). */
export async function createShare(
  ownerEmail: string,
  targetEmail: string,
  folderId: string,
  permission: "viewer" | "editor",
  folderName: string,
): Promise<NoteShare> {
  const target = targetEmail.toLowerCase().trim();
  const ref = await addDoc(collection(db, SHARES_COL), {
    ownerEmail,
    targetEmail: target,
    folderId,
    permission,
    status: "pending",
    folderName,
    createdAt: serverTimestamp(),
  });
  return {
    shareId: ref.id, ownerEmail, targetEmail: target,
    folderId, permission, status: "pending", folderName, createdAt: new Date(),
  };
}

/** All shares sent by ownerEmail (outgoing). */
export async function fetchSentShares(ownerEmail: string): Promise<NoteShare[]> {
  const q    = query(collection(db, SHARES_COL), where("ownerEmail", "==", ownerEmail));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapShare(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** All shares received by email (incoming). */
export async function fetchReceivedShares(email: string): Promise<NoteShare[]> {
  const q    = query(collection(db, SHARES_COL), where("targetEmail", "==", email));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => mapShare(d.id, d.data() as Record<string, unknown>))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function acceptShare(shareId: string): Promise<void> {
  await updateDoc(doc(db, SHARES_COL, shareId), { status: "accepted" });
}

export async function rejectShare(shareId: string): Promise<void> {
  await updateDoc(doc(db, SHARES_COL, shareId), { status: "rejected" });
}

export async function deleteShare(shareId: string): Promise<void> {
  await deleteDoc(doc(db, SHARES_COL, shareId));
}

export async function updateSharePermission(
  shareId: string,
  permission: "viewer" | "editor",
): Promise<void> {
  await updateDoc(doc(db, SHARES_COL, shareId), { permission });
}
