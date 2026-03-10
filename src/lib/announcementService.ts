import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
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
  const [userSnap, collSnap] = await Promise.all([
    getDoc(doc(db, "users", uid)),
    getDocs(
      query(collection(db, "userAnnouncements"), where("userId", "==", uid))
    ),
  ]);

  const collIds = collSnap.docs.map((d) => d.data().announcementId as string);
  if (!userSnap.exists()) return collIds;
  const data = userSnap.data();
  const legacyIds: string[] = [
    ...(data.seenAnnouncements ?? []),
    ...(data.dismissedAnnouncements ?? []),
  ];
  return Array.from(new Set([...legacyIds, ...collIds]));
}

/**
 * Returns the most recent active announcement the user has not yet seen.
 * Checks both the legacy users.seenAnnouncements field and the
 * userAnnouncements collection so either write path marks it seen.
 * Only fetches the latest 10 announcements to avoid loading the full collection.
 */
export async function getLatestUnseenAnnouncement(
  uid: string
): Promise<Announcement | null> {
  const [announcementsSnap, userSnap, seenSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "announcements"),
        orderBy("createdAt", "desc"),
        limit(10)
      )
    ),
    getDoc(doc(db, "users", uid)),
    getDocs(
      query(collection(db, "userAnnouncements"), where("userId", "==", uid))
    ),
  ]);

  const seenData = userSnap.exists() ? userSnap.data() : {};
  const seen = new Set<string>([
    ...(seenData.seenAnnouncements ?? []),
    ...(seenData.dismissedAnnouncements ?? []),
    ...seenSnap.docs.map((d) => d.data().announcementId as string),
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

/**
 * Records that a user has seen an announcement.
 * Dual-writes to:
 *  1. userAnnouncements collection — new schema (userId, announcementId, seenAt)
 *  2. users.seenAnnouncements array — keeps the bell badge / Recent Updates
 *     tab accurate without extra reads (backward-compatible).
 */
export async function markAnnouncementSeen(
  uid: string,
  announcementId: string
): Promise<void> {
  await Promise.all([
    addDoc(collection(db, "userAnnouncements"), {
      userId: uid,
      announcementId,
      seenAt: Timestamp.now(),
    }),
    updateDoc(doc(db, "users", uid), {
      seenAnnouncements: arrayUnion(announcementId),
    }),
  ]);
}
