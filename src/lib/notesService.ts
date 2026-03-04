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
import type { NoteFolder, NotePage, SearchResult } from "@/types/notes";

// ─── Collection names ─────────────────────────────────────────────────────────

const FOLDERS_COL = "notes_folders";
const PAGES_COL   = "notes_pages";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(value: unknown): Date {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date)      return value;
  return new Date(0);
}

export function encodeContent(text: string): string {
  try { return btoa(unescape(encodeURIComponent(text))); } catch { return btoa(text); }
}

export function decodeContent(encoded: string): string {
  if (!encoded) return "";
  try { return decodeURIComponent(escape(atob(encoded))); }
  catch { try { return atob(encoded); } catch { return encoded; } }
}

function mapFolder(id: string, d: Record<string, unknown>): NoteFolder {
  return {
    folderId:  id,
    email:     d.email     as string,
    name:      d.name      as string,
    createdAt: toDate(d.createdAt),
  };
}

function mapPage(id: string, d: Record<string, unknown>): NotePage {
  return {
    pageId:    id,
    folderId:  d.folderId  as string,
    email:     d.email     as string,
    title:     d.title     as string,
    content:   (d.content  as string) ?? "",
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
  };
}

// ─── Folder CRUD ──────────────────────────────────────────────────────────────

export async function fetchFolders(email: string): Promise<NoteFolder[]> {
  const q    = query(collection(db, FOLDERS_COL), where("email", "==", email));
  const snap = await getDocs(q);
  const folders = snap.docs.map((d) => mapFolder(d.id, d.data() as Record<string, unknown>));
  return folders.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function addFolder(email: string, name: string): Promise<NoteFolder> {
  const ref = await addDoc(collection(db, FOLDERS_COL), {
    email,
    name: name.trim(),
    createdAt: serverTimestamp(),
  });
  return { folderId: ref.id, email, name: name.trim(), createdAt: new Date() };
}

export async function renameFolder(folderId: string, name: string): Promise<void> {
  await updateDoc(doc(db, FOLDERS_COL, folderId), { name: name.trim() });
}

export async function deleteFolder(folderId: string): Promise<void> {
  // cascade-delete all pages inside this folder
  const q    = query(collection(db, PAGES_COL), where("folderId", "==", folderId));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, FOLDERS_COL, folderId));
}

// ─── Page CRUD ────────────────────────────────────────────────────────────────

export async function fetchPages(email: string, folderId: string): Promise<NotePage[]> {
  const q    = query(
    collection(db, PAGES_COL),
    where("email",    "==", email),
    where("folderId", "==", folderId),
  );
  const snap = await getDocs(q);
  const pages = snap.docs.map((d) => mapPage(d.id, d.data() as Record<string, unknown>));
  return pages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function addPage(email: string, folderId: string, title: string): Promise<NotePage> {
  const now = serverTimestamp();
  const ref = await addDoc(collection(db, PAGES_COL), {
    email,
    folderId,
    title: title.trim(),
    content: "",
    createdAt: now,
    updatedAt: now,
  });
  const d = new Date();
  return { pageId: ref.id, folderId, email, title: title.trim(), content: "", createdAt: d, updatedAt: d };
}

export async function renamePage(pageId: string, title: string): Promise<void> {
  await updateDoc(doc(db, PAGES_COL, pageId), { title: title.trim(), updatedAt: serverTimestamp() });
}

export async function savePage(pageId: string, content: string): Promise<void> {
  await updateDoc(doc(db, PAGES_COL, pageId), {
    content: encodeContent(content),
    updatedAt: serverTimestamp(),
  });
}

export async function deletePage(pageId: string): Promise<void> {
  await deleteDoc(doc(db, PAGES_COL, pageId));
}

/** Fetch all pages for a folder regardless of email owner — used for shared folders. */
export async function fetchFolderPages(folderId: string): Promise<NotePage[]> {
  const q    = query(collection(db, PAGES_COL), where("folderId", "==", folderId));
  const snap = await getDocs(q);
  const pages = snap.docs.map((d) => mapPage(d.id, d.data() as Record<string, unknown>));
  return pages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

// ─── Search ───────────────────────────────────────────────────────────────────

export function searchNotes(
  folders: NoteFolder[],
  pages: NotePage[],
  searchQuery: string,
): SearchResult[] {
  const q = searchQuery.toLowerCase().trim();
  if (!q) return [];

  const folderMap = Object.fromEntries(folders.map((f) => [f.folderId, f.name]));

  return pages
    .filter((p) => {
      const decoded = decodeContent(p.content);
      return (
        p.title.toLowerCase().includes(q) ||
        decoded.toLowerCase().includes(q) ||
        (folderMap[p.folderId] ?? "").toLowerCase().includes(q)
      );
    })
    .map((p) => {
      const decoded = decodeContent(p.content);
      const idx     = decoded.toLowerCase().indexOf(q);
      const snippet = idx >= 0
        ? "…" + decoded.slice(Math.max(0, idx - 40), idx + 80).replace(/\n/g, " ") + "…"
        : decoded.slice(0, 120).replace(/\n/g, " ");
      return {
        pageId:     p.pageId,
        folderId:   p.folderId,
        folderName: folderMap[p.folderId] ?? "",
        pageTitle:  p.title,
        snippet,
      };
    });
}
