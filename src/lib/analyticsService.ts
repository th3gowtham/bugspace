import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export interface AnalyticsStats {
  totalUsers: number;
  activeToday: number;
  activeThisWeek: number;
  newUsersToday: number;
  visitsToday: number;
  dailyActiveUsers: { date: string; count: number }[];
  visitsByPage: { page: string; count: number }[];
}

/** Record a page visit for the current user (fire-and-forget from the client). */
export async function trackPageVisit(
  userId: string,
  page: string
): Promise<void> {
  await addDoc(collection(db, "analytics"), {
    userId,
    page,
    timestamp: serverTimestamp(),
  });
}

/**
 * Stamp lastActiveAt on the user document.
 * Called once per session when auth state resolves (login / page reload).
 */
export async function updateLastActive(userId: string): Promise<void> {
  await updateDoc(doc(db, "users", userId), {
    lastActiveAt: serverTimestamp(),
  });
}

/**
 * Fetch aggregated platform analytics for the admin dashboard.
 * Only fetches the analytics documents created in the last 7 days,
 * and the full users collection for activity/growth counts.
 */
export async function fetchAnalyticsStats(): Promise<AnalyticsStats> {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  // 7-day window (today + previous 6 days)
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  const weekTs = Timestamp.fromDate(startOfWeek);

  const [usersSnap, weekVisitsSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(
      query(collection(db, "analytics"), where("timestamp", ">=", weekTs))
    ),
  ]);

  const totalUsers = usersSnap.size;

  const users = usersSnap.docs.map((d) => ({
    lastActiveAt: (d.data().lastActiveAt?.toDate?.() ?? null) as Date | null,
    createdAt: (d.data().createdAt?.toDate?.() ?? null) as Date | null,
  }));

  const activeToday = users.filter(
    (u) => u.lastActiveAt && u.lastActiveAt >= startOfToday
  ).length;

  const activeThisWeek = users.filter(
    (u) => u.lastActiveAt && u.lastActiveAt >= startOfWeek
  ).length;

  const newUsersToday = users.filter(
    (u) => u.createdAt && u.createdAt >= startOfToday
  ).length;

  const weekVisits = weekVisitsSnap.docs.map((d) => ({
    userId: d.data().userId as string,
    page: d.data().page as string,
    timestamp: (d.data().timestamp?.toDate?.() ?? null) as Date | null,
  }));

  const visitsToday = weekVisits.filter(
    (v) => v.timestamp && v.timestamp >= startOfToday
  ).length;

  // Daily active unique users per day for the last 7 days
  const dailyActiveUsers: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(startOfToday);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const uniqueUsers = new Set(
      weekVisits
        .filter(
          (v) =>
            v.timestamp && v.timestamp >= dayStart && v.timestamp < dayEnd
        )
        .map((v) => v.userId)
    );

    dailyActiveUsers.push({
      date: dayStart.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      count: uniqueUsers.size,
    });
  }

  // Visits by page aggregated over the 7-day window
  const pageCountMap: Record<string, number> = {};
  weekVisits.forEach((v) => {
    if (v.page) {
      pageCountMap[v.page] = (pageCountMap[v.page] ?? 0) + 1;
    }
  });
  const visitsByPage = Object.entries(pageCountMap)
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalUsers,
    activeToday,
    activeThisWeek,
    newUsersToday,
    visitsToday,
    dailyActiveUsers,
    visitsByPage,
  };
}
