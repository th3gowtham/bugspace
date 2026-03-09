import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  arrayUnion,
  getDoc,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Announcement {
  id: string;
  title: string;
  message: string;
  createdAt: Date;
  active: boolean;
}

function toAnnouncement(d: QueryDocumentSnapshot<DocumentData>): Announcement {
  return {
    id: d.id,
    title: d.data().title ?? "",
    message: d.data().message ?? "",
    createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
    active: d.data().active ?? false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  const snap = await getDocs(
    query(collection(db, "announcements"), orderBy("createdAt", "desc"))
  );
  return snap.docs.map(toAnnouncement);
}

export async function createAnnouncement(
  title: string,
  message: string
): Promise<string> {
  const ref = await addDoc(collection(db, "announcements"), {
    title,
    message,
    createdAt: Timestamp.now(),
    active: true,
  });
  return ref.id;
}

export async function updateAnnouncement(
  id: string,
  data: Partial<Pick<Announcement, "title" | "message" | "active">>
): Promise<void> {
  await updateDoc(doc(db, "announcements", id), data);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await deleteDoc(doc(db, "announcements", id));
}

// ─────────────────────────────────────────────────────────────────────────────
// RESEARCHER - reading
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllActiveAnnouncements(): Promise<Announcement[]> {
  const snap = await getDocs(
    query(collection(db, "announcements"), orderBy("createdAt", "desc"))
  );
  return snap.docs
    .filter((d) => d.data().active === true)
    .map(toAnnouncement);
}

export async function getSeenAnnouncementIds(uid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return [];
  const data = snap.data();
  const seen: string[] = data.seenAnnouncements ?? [];
  const legacy: string[] = data.dismissedAnnouncements ?? [];
  return Array.from(new Set([...seen, ...legacy]));
}

export async function getLatestUnseenAnnouncement(
  uid: string
): Promise<Announcement | null> {
  const [announcementsSnap, userSnap] = await Promise.all([
    getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc"))),
    getDoc(doc(db, "users", uid)),
  ]);

  const seenData = userSnap.exists() ? userSnap.data() : {};
  const seen = new Set<string>([
    ...(seenData.seenAnnouncements ?? []),
    ...(seenData.dismissedAnnouncements ?? []),
  ]);

  for (const d of announcementsSnap.docs) {
    if (d.data().active === true && !seen.has(d.id)) {
      return toAnnouncement(d);
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// RESEARCHER - writing
// ─────────────────────────────────────────────────────────────────────────────

export async function markAnnouncementSeen(
  uid: string,
  announcementId: string
): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    seenAnnouncements: arrayUnion(announcementId),
  });
}
