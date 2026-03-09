import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  fetchExclusiveBugsByIds,
  type ExclusiveBug,
} from "./exclusiveBugService";

export type { ExclusiveBug };

// ─── Read bookmarked bug IDs from the user document ──────────────────────────

export async function getBugBookmarkIds(uid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return [];
  return (snap.data().bookmarkedBugs as string[] | undefined) ?? [];
}

// ─── Add / remove individual bookmarks ───────────────────────────────────────

export async function addBugBookmark(uid: string, bugId: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { bookmarkedBugs: arrayUnion(bugId) });
}

export async function removeBugBookmark(uid: string, bugId: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), { bookmarkedBugs: arrayRemove(bugId) });
}

// ─── Fetch full bug objects for all bookmarked IDs ───────────────────────────

export async function fetchBookmarkedBugs(uid: string): Promise<ExclusiveBug[]> {
  const ids = await getBugBookmarkIds(uid);
  if (ids.length === 0) return [];
  return fetchExclusiveBugsByIds(ids);
}
