import React from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProgramCard } from "@/components/ProgramCard";
import type { ProgramData } from "@/components/ProgramCard";
import { ReferralDashboard } from "@/components/ReferralDashboard";
import { Bookmark, Bell, Settings, Inbox, Users2, Megaphone, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUserBookmarkPrograms } from "@/lib/bookmarkService";
import {
  getAllActiveAnnouncements,
  getSeenAnnouncementIds,
  markAnnouncementSeen,
  type Announcement,
} from "@/lib/announcementService";
import { toast } from "sonner";

const tabs = [
  { id: "bookmarks", label: "Bookmarked",     icon: Bookmark },
  { id: "updates",   label: "Recent Updates", icon: Bell },
  { id: "referrals", label: "Referrals",       icon: Users2 },
  { id: "settings",  label: "Settings",        icon: Settings },
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("bookmarks");
  const { firebaseUser } = useAuth();

  // â”€â”€ bookmarks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [bookmarked, setBookmarked] = useState<ProgramData[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);

  // â”€â”€ announcements â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);

  // â”€â”€ bell dropdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    setBookmarksLoading(true);
    fetchUserBookmarkPrograms(firebaseUser.uid)
      .then(setBookmarked)
      .catch(() => toast.error("Failed to load bookmarks."))
      .finally(() => setBookmarksLoading(false));
  }, [firebaseUser]);

  // Fetch all active announcements + seen IDs together (single round-trip pair)
  useEffect(() => {
    if (!firebaseUser) return;
    setAnnouncementsLoading(true);
    getAllActiveAnnouncements()
      .then(setAllAnnouncements)
      .catch(() => {})
      .finally(() => setAnnouncementsLoading(false));
  }, [firebaseUser]);

  // Refresh seenIds on mount and every time the "Recent Updates" tab is opened,
  // so the badge count stays accurate after the popup is dismissed.
  useEffect(() => {
    if (!firebaseUser) return;
    getSeenAnnouncementIds(firebaseUser.uid)
      .then(setSeenIds)
      .catch(() => {});
  }, [firebaseUser, activeTab]);

  // Close bell dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unseenCount = allAnnouncements.filter((a) => !seenIds.includes(a.id)).length;

  const handleMarkSeen = async (ann: Announcement) => {
    if (!firebaseUser || seenIds.includes(ann.id)) return;
    // Optimistic update
    setSeenIds((prev) => [...prev, ann.id]);
    try {
      await markAnnouncementSeen(firebaseUser.uid, ann.id);
    } catch {
      // Roll back
      setSeenIds((prev) => prev.filter((id) => id !== ann.id));
      toast.error("Failed to mark announcement as seen.");
    }
  };

  const handleBellItemClick = (ann: Announcement) => {
    handleMarkSeen(ann);
    setActiveTab("updates");
    setBellOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container flex-1 py-8">

        {/* Page header with notification bell */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

          {/* Bell */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setBellOpen((o) => !o)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Announcements"
            >
              <Bell className="h-4 w-4" />
              {unseenCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-bold text-primary-foreground">
                  {unseenCount > 9 ? "9+" : unseenCount}
                </span>
              )}
            </button>

            {/* Bell dropdown */}
            {bellOpen && (
              <div className="absolute right-0 top-11 z-40 w-80 rounded-xl border border-border bg-card shadow-xl">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Announcements</p>
                  <button
                    onClick={() => setBellOpen(false)}
                    className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-border">
                  {announcementsLoading ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">Loadingâ€¦</p>
                  ) : allAnnouncements.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">No announcements yet.</p>
                  ) : (
                    allAnnouncements.map((ann) => {
                      const isSeen = seenIds.includes(ann.id);
                      return (
                        <button
                          key={ann.id}
                          onClick={() => handleBellItemClick(ann)}
                          className="w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="flex items-start gap-2.5">
                            {!isSeen && (
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            )}
                            <div className={!isSeen ? "" : "pl-4"}>
                              <p className={`text-sm font-medium leading-snug ${isSeen ? "text-muted-foreground" : "text-foreground"}`}>
                                {ann.title}
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">
                                {ann.message}
                              </p>
                              <p className="text-xs text-muted-foreground/50 mt-1">
                                {ann.createdAt.toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {allAnnouncements.length > 0 && (
                  <div className="border-t border-border px-4 py-2.5">
                    <button
                      onClick={() => { setActiveTab("updates"); setBellOpen(false); }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View all in Recent Updates â†’
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden md:block w-56 shrink-0 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.id === "updates" && unseenCount > 0 && (
                  <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-bold text-primary-foreground">
                    {unseenCount > 9 ? "9+" : unseenCount}
                  </span>
                )}
              </button>
            ))}
          </aside>

          {/* Mobile tabs */}
          <div className="flex-1 min-w-0">
            <div className="md:hidden flex gap-1 mb-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.id === "updates" && unseenCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[10px] font-bold text-primary-foreground">
                      {unseenCount > 9 ? "9+" : unseenCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* â”€â”€ Bookmarks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {activeTab === "bookmarks" && (
              <div>
                {bookmarksLoading ? (
                  <p className="text-sm text-muted-foreground py-16 text-center">Loading bookmarksâ€¦</p>
                ) : bookmarked.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {bookmarked.map((p) => (
                      <ProgramCard key={p.id} program={p} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Bookmark}
                    title="No bookmarked programs"
                    description="Bookmark programs to track them here."
                  />
                )}
              </div>
            )}

            {/* â”€â”€ Recent Updates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {activeTab === "updates" && (
              <div>
                {announcementsLoading ? (
                  <p className="text-sm text-muted-foreground py-16 text-center">Loading updatesâ€¦</p>
                ) : allAnnouncements.length > 0 ? (
                  <div className="space-y-3">
                    {allAnnouncements.map((ann) => {
                      const isSeen = seenIds.includes(ann.id);
                      return (
                        <div
                          key={ann.id}
                          className={`glass-card p-4 transition-colors ${!isSeen ? "border-primary/30" : ""}`}
                          onClick={() => handleMarkSeen(ann)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 mt-0.5">
                              <Megaphone className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">{ann.title}</p>
                                {!isSeen && (
                                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                                    New
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 leading-relaxed whitespace-pre-wrap">
                                {ann.message}
                              </p>
                              <p className="text-xs text-muted-foreground/60 mt-2">
                                {ann.createdAt.toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={Inbox}
                    title="No announcements yet"
                    description="Admin broadcasts will appear here."
                  />
                )}
              </div>
            )}

            {activeTab === "referrals" && <ReferralDashboard />}

            {activeTab === "settings" && (
              <div className="glass-card p-6 max-w-md">
                <h2 className="text-lg font-semibold text-foreground mb-4">Account Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Display Name</label>
                    <input
                      type="text"
                      defaultValue="Researcher"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Email Notifications</label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" defaultChecked className="accent-primary" />
                      Receive updates on bookmarked programs
                    </label>
                  </div>
                  <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="text-center py-16">
      <Icon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

export default Dashboard;

