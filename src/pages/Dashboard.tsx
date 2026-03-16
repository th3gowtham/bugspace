import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProgramCard, type ProgramData } from "@/components/ProgramCard";
import { ReferralDashboard } from "@/components/ReferralDashboard";
import { Bookmark, Bell, Settings, Inbox, Users2, Megaphone, X, Bug, Lock, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { fetchUserBookmarkPrograms } from "@/lib/bookmarkService";
import { fetchBookmarkedBugs, removeBugBookmark } from "@/lib/bugBookmarkService";
import type { ExclusiveBug } from "@/lib/exclusiveBugService";
import { getAllActiveAnnouncements, getSeenAnnouncementIds, markAnnouncementSeen, type Announcement } from "@/lib/announcementService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "bookmarks", label: "Bookmarked", icon: Bookmark },
  { id: "savedbugs", label: "Saved Bugs", icon: Bug },
  { id: "updates", label: "Recent Updates", icon: Bell },
  { id: "referrals", label: "Referrals", icon: Users2 },
  { id: "settings", label: "Settings", icon: Settings },
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("bookmarks");
  const { firebaseUser, isPremium } = useAuth();
  const navigate = useNavigate();

  // ── bookmarks ───────────────────────────────────────────────────────────────
  const [bookmarked, setBookmarked] = useState<ProgramData[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);

  // saved bugs
  const [savedBugs, setSavedBugs] = useState<ExclusiveBug[]>([]);
  const [savedBugsLoading, setSavedBugsLoading] = useState(false);

  // ── announcements ───────────────────────────────────────────────────────────
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);

  // ── bell dropdown ───────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (!firebaseUser || activeTab !== "savedbugs") return;
    setSavedBugsLoading(true);
    fetchBookmarkedBugs(firebaseUser.uid)
      .then(setSavedBugs)
      .catch(() => toast.error("Failed to load saved bugs."))
      .finally(() => setSavedBugsLoading(false));
  }, [firebaseUser, activeTab]);

  useEffect(() => {
    if (!firebaseUser) return;
    setAnnouncementsLoading(true);
    getAllActiveAnnouncements()
      .then(setAllAnnouncements)
      .catch(() => { })
      .finally(() => setAnnouncementsLoading(false));
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) return;
    getSeenAnnouncementIds(firebaseUser.uid)
      .then(setSeenIds)
      .catch(() => { });
  }, [firebaseUser, activeTab]);

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

  const handleRemoveBugBookmark = async (bugId: string) => {
    if (!firebaseUser) return;
    // Optimistic remove
    setSavedBugs((prev) => prev.filter((b) => b.bugId !== bugId));
    try {
      await removeBugBookmark(firebaseUser.uid, bugId);
    } catch {
      toast.error("Failed to remove bookmark.");
      // Reload to restore
      fetchBookmarkedBugs(firebaseUser.uid).then(setSavedBugs).catch(() => { });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <Navbar />

      {/* Premium Banner */}
      {isPremium && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-b border-amber-500/20 py-2">
          <div className="container flex items-center justify-center gap-2 text-sm font-medium text-amber-500">
            <Sparkles className="h-4 w-4" />
            Active BugSpace Premium Member
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative border-b border-border/40 bg-muted/10 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />

        <div className="container relative pt-12 pb-10 flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="max-w-2xl text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground mb-4">
              Dash<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">board</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Manage your bookmarked programs, track exclusive vulnerabilities, and review your latest updates.
            </p>
          </div>

          {/* Bell */}
          <div ref={bellRef} className="relative z-2 shrink-0 mt-2 animate-in fade-in zoom-in-95 duration-500 delay-100 fill-mode-both">
            <button
              onClick={() => setBellOpen((o) => !o)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-card hover:bg-secondary/80 text-foreground transition-all duration-200 hover:shadow-md"
              aria-label="Announcements"
            >
              <Bell className="h-5 w-5" />
              {unseenCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-in zoom-in">
                  {unseenCount > 9 ? "9+" : unseenCount}
                </span>
              )}
            </button>

            {/* Bell dropdown */}
            {bellOpen && (
              <div className="absolute right-0 top-14 w-80 rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-2xl animate-in slide-in-from-top-2 fade-in duration-200">
                <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
                  <p className="text-sm font-bold text-foreground">Announcements</p>
                  <button
                    onClick={() => setBellOpen(false)}
                    className="rounded-full p-1 text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-border/30">
                  {announcementsLoading ? (
                    <div className="p-6 flex justify-center">
                      <div className="h-5 w-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                    </div>
                  ) : allAnnouncements.length === 0 ? (
                    <div className="py-8 text-center px-4">
                      <Inbox className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No announcements right now.</p>
                    </div>
                  ) : (
                    allAnnouncements.map((ann) => {
                      const isSeen = seenIds.includes(ann.id);
                      return (
                        <button
                          key={ann.id}
                          onClick={() => handleBellItemClick(ann)}
                          className={cn(
                            "w-full text-left px-4 py-3 transition-colors hover:bg-secondary/50",
                            !isSeen && "bg-primary/5"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              {!isSeen ? (
                                <span className="flex h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                              ) : (
                                <span className="flex h-2 w-2 rounded-full bg-muted-foreground/30" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-sm leading-snug truncate", isSeen ? "text-muted-foreground font-medium" : "text-foreground font-semibold")}>
                                {ann.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {ann.message}
                              </p>
                              <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground/50 mt-1.5">
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
                  <div className="border-t border-border/40 p-2 bg-muted/20 rounded-b-2xl">
                    <button
                      onClick={() => { setActiveTab("updates"); setBellOpen(false); }}
                      className="w-full text-xs font-semibold text-primary/80 hover:text-primary py-1.5 transition-colors"
                    >
                      View All Updates
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container flex-1 py-10 relative z-10">
        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Sidebar Tabs */}
          <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-28 z-10 animate-in fade-in slide-in-from-left-8 duration-700">
            <div className="glass-card p-2.5 flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible hide-scrollbar rounded-2xl shadow-xl bg-background/50 backdrop-blur-xl border-border/60">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "shrink-0 flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-sm font-bold transition-all duration-300",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]"
                        : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground hover:scale-[1.01]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <tab.icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "opacity-70")} />
                      {tab.label}
                    </div>
                    {tab.id === "updates" && unseenCount > 0 && (
                      <span className={cn(
                        "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                        isActive ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                      )}>
                        {unseenCount > 9 ? "9+" : unseenCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Tab Content */}
          <div className="flex-1 min-w-0 w-full relative z-0">
            {/* ── Bookmarks ─────────────────────────────────────────────────── */}
            {activeTab === "bookmarks" && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="mb-8 flex items-center gap-3 border-b border-border/40 pb-5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Bookmark className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-foreground">Bookmarked Programs</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Quick access to your saved targets.</p>
                  </div>
                </div>

                {bookmarksLoading ? (
                  <LoadingState message="Fetching your bookmarks..." />
                ) : bookmarked.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {bookmarked.map((p, idx) => (
                      <div key={p.id} className="animate-fade-in" style={{ animationDelay: `${(idx % 8) * 100}ms`, animationFillMode: 'both' }}>
                        <ProgramCard program={p} isBookmarked={true} className="h-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Bookmark}
                    title="No bookmarked programs"
                    description="Keep track of your favorite high-value targets. Programs you bookmark while browsing will appear right here."
                    action={{ label: "Browse Programs", onClick: () => navigate("/browse") }}
                  />
                )}
              </div>
            )}

            {/* Saved Bugs */}
            {activeTab === "savedbugs" && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="mb-8 flex items-center gap-3 border-b border-border/40 pb-5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Bug className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-foreground">Saved Vulnerabilities</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Premium bugs you've collected for research.</p>
                  </div>
                </div>

                {savedBugsLoading ? (
                  <LoadingState message="Loading saved bugs..." />
                ) : savedBugs.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {savedBugs.map((bug, idx) => (
                      <div
                        key={bug.bugId}
                        className="group relative glass-card p-5 flex flex-col gap-3 cursor-pointer hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 animate-fade-in shadow-sm hover:shadow-lg"
                        style={{ animationDelay: `${(idx % 8) * 100}ms`, animationFillMode: 'both' }}
                        onClick={() => navigate(`/exclusive-bugs/${bug.bugId}`)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
                        <div className="flex items-start justify-between gap-2 relative z-10">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-xs font-bold text-primary">
                              {bug.categoryName}
                            </span>
                            {bug.accessType === "free" ? (
                              <span className="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-xs font-bold text-green-500 uppercase tracking-wider">Free</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-500 uppercase tracking-wider">
                                <Lock className="h-2.5 w-2.5" /> Premium
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveBugBookmark(bug.bugId); }}
                            title="Remove bookmark"
                            className="p-1.5 -mr-1.5 -mt-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors shrink-0"
                          >
                            <Bookmark className="h-4 w-4 fill-primary" />
                          </button>
                        </div>
                        <h3 className="text-base font-bold text-foreground leading-tight line-clamp-2 relative z-10 group-hover:text-primary transition-colors">
                          {bug.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1 relative z-10">
                          {bug.summary}
                        </p>
                        <div className="flex items-center justify-between pt-3 mt-1 border-t border-border/50 relative z-10">
                          <span className="text-sm font-bold text-success drop-shadow-sm">
                            {bug.currency} {bug.bountyAmount.toLocaleString()}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {bug.createdAt.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Bug}
                    title="No saved bugs"
                    description="You haven't bookmarked any exclusive bugs yet. Find them in the Exclusive Bugs section."
                    action={{ label: "View Exclusive Bugs", onClick: () => navigate("/exclusive-bugs") }}
                  />
                )}
              </div>
            )}

            {/* ── Recent Updates ────────────────────────────────────────────── */}
            {activeTab === "updates" && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="mb-8 flex items-center gap-3 border-b border-border/40 pb-5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Megaphone className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-foreground">Announcements & Updates</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Stay up to date with the latest platform news.</p>
                  </div>
                </div>

                {announcementsLoading ? (
                  <LoadingState message="Fetching latest updates..." />
                ) : allAnnouncements.length > 0 ? (
                  <div className="space-y-4">
                    {allAnnouncements.map((ann, idx) => {
                      const isSeen = seenIds.includes(ann.id);
                      return (
                        <div
                          key={ann.id}
                          className={cn(
                            "glass-card p-5 transition-all duration-300 animate-fade-in relative overflow-hidden cursor-pointer",
                            !isSeen ? "border-primary/40 shadow-md shadow-primary/5" : "hover:border-primary/30"
                          )}
                          style={{ animationDelay: `${(idx % 8) * 100}ms`, animationFillMode: 'both' }}
                          onClick={() => handleMarkSeen(ann)}
                        >
                          {!isSeen && <div className="absolute top-0 left-0 w-1 h-full bg-primary" />}

                          <div className="flex items-start gap-4">
                            <div className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                              !isSeen ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" : "bg-secondary text-muted-foreground"
                            )}>
                              <Megaphone className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center gap-3">
                                <h3 className={cn("text-base font-bold", isSeen ? "text-foreground" : "text-primary")}>{ann.title}</h3>
                                {!isSeen && (
                                  <span className="shrink-0 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-bold text-primary uppercase tracking-widest">
                                    New
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-foreground/80 mt-2 leading-relaxed whitespace-pre-wrap">
                                {ann.message}
                              </p>
                              <p className="text-xs font-medium text-muted-foreground mt-3 uppercase tracking-wider">
                                {ann.createdAt.toLocaleDateString(undefined, {
                                  year: "numeric",
                                  month: "short",
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
                    title="You're all caught up"
                    description="When administrators post new announcements or platform updates, they will appear here."
                  />
                )}
              </div>
            )}

            {activeTab === "referrals" && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                <ReferralDashboard />
              </div>
            )}

            {activeTab === "settings" && (
              <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="mb-8 flex items-center gap-3 border-b border-border/40 pb-5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-foreground">Account Settings</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage your preferences and profile details.</p>
                  </div>
                </div>

                <div className="glass-card p-8 max-w-xl">
                  <div className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">Display Name</label>
                      <input
                        type="text"
                        defaultValue="Researcher"
                        className="w-full rounded-xl border border-input bg-background/50 px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                      />
                      <p className="text-xs text-muted-foreground font-medium">This name is used for leaderboards and public profiles.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-foreground">Email Notifications</label>
                      <div className="mt-2 rounded-xl border border-input bg-background/50 p-4 hover:border-primary/30 transition-colors">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <div className="mt-0.5">
                            <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border accent-primary focus:ring-primary/50" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Program Updates</p>
                            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">Receive an email whenever a bookmarked program changes its scope or bounty.</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border/40">
                      <button className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 hover:scale-105 transition-all shadow-md shadow-primary/20">
                        Save Preferences
                      </button>
                    </div>
                  </div>
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

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4" />
      <p className="text-muted-foreground font-medium">{message}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center glass-card border-dashed">
      <div className="h-16 w-16 rounded-full bg-secondary text-muted-foreground/60 flex items-center justify-center mb-5">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-full bg-secondary px-6 py-2.5 text-sm font-bold text-foreground hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default Dashboard;
