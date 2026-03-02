import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { ProgramData } from "@/components/ProgramCard";
import { mapFirestoreToProgramData, type FirestoreProgram } from "./programService";

// ─── Check if a program is already bookmarked by the user ─────────────────────

export async function getBookmarkDoc(
  uid: string,
  programId: string
): Promise<string | null> {
  const q = query(
    collection(db, "bookmarks"),
    where("userId", "==", uid),
    where("programId", "==", programId)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function isBookmarked(uid: string, programId: string): Promise<boolean> {
  return (await getBookmarkDoc(uid, programId)) !== null;
}

// ─── Toggle bookmark (add if absent, remove if present) ──────────────────────
// Returns true if the bookmark now exists, false if it was removed.

export async function toggleBookmark(
  uid: string,
  programId: string
): Promise<boolean> {
  const existingId = await getBookmarkDoc(uid, programId);
  if (existingId) {
    await deleteDoc(doc(db, "bookmarks", existingId));
    return false;
  }
  await addDoc(collection(db, "bookmarks"), {
    userId:    uid,
    programId,
    createdAt: serverTimestamp(),
  });
  return true;
}

// ─── Fetch all bookmarked ProgramData for a user ─────────────────────────────

export async function fetchUserBookmarkPrograms(uid: string): Promise<ProgramData[]> {
  // 1. Get all bookmark docs for this user
  const bSnap = await getDocs(
    query(collection(db, "bookmarks"), where("userId", "==", uid))
  );
  if (bSnap.empty) return [];

  // 2. Fetch each program by document ID
  const programIds = bSnap.docs.map((d) => d.data().programId as string);
  const results: ProgramData[] = [];

  await Promise.all(
    programIds.map(async (pid) => {
      const pSnap = await getDoc(doc(db, "programs", pid));
      if (pSnap.exists()) {
        results.push(mapFirestoreToProgramData(pSnap.id, pSnap.data() as FirestoreProgram));
      }
    })
  );

  return results;
}
