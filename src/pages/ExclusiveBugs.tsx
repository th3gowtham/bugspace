import { useState, useEffect, useMemo } from "react";
import { Search, Lock, ChevronDown, ExternalLink, Bug, Star, X, CalendarDays, DollarSign, Bookmark, Crown, ShieldAlert } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  fetchExclusiveBugs,
  fetchCategories,
  type ExclusiveBug,
  type ExclusiveBugCategory,
} from "@/lib/exclusiveBugService";
import {
  getBugBookmarkIds,
  addBugBookmark,
  removeBugBookmark,
} from "@/lib/bugBookmarkService";

// ─── Sub-components ───────────────────────────────────────────────────────────

function PremiumModal({ onClose, email }: { onClose: () => void; email: string | null | undefined }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-background shadow-2xl p-8 relative overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col items-center text-center mb-6 relative z-10">
          <div className="rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 p-4 mb-4 shadow-lg shadow-amber-500/30">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-foreground mb-2">Premium Access Required</h2>
          <p className="text-sm font-medium text-amber-500">Exclusive content for Elite members.</p>
        </div>
        <p className="text-sm text-muted-foreground mb-8 text-center leading-relaxed">
          Detailed write-ups, step-by-step reproduction instructions, PoC links, and references are strictly limited to
          <span className="font-bold text-amber-500"> premium members</span> to ensure high-value intel stays secure.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href={`https://wa.me/919363277862?text=${encodeURIComponent(
              `Hello, I would like to upgrade to BugSpace Premium.\nMy registered email is: ${email ?? "(not logged in)"}\nPlease share the payment details.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex justify-center items-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            Upgrade via WhatsApp
          </a>
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function BugDetailModal({
  bug,
  isPremium,
  onClose,
  onUpgrade,
}: {
  bug: ExclusiveBug;
  isPremium: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-4xl bg-background border border-border flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh]">
        {/* ── Sticky header ── */}
        <div className="flex items-start justify-between px-8 py-6 border-b border-border/60 bg-muted/10 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="flex-1 min-w-0 pr-8 relative z-10">
            {/* Meta badges */}
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary shadow-sm shadow-primary/10">
                {bug.categoryName}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground border border-border/60 bg-background/50 backdrop-blur-sm rounded-full px-3 py-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {bug.createdAt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 border border-green-500/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-green-500 shadow-sm shadow-green-500/10">
                <DollarSign className="h-3.5 w-3.5" />
                {bug.currency} {bug.bountyAmount.toLocaleString()}
              </span>
            </div>
            {/* Title */}
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight tracking-tight">
              {bug.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary hover:shadow-sm transition-all shrink-0 mt-1 relative z-10 bg-background/50 backdrop-blur-sm border border-border/50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 p-8 space-y-10 bg-background/50 relative z-10" style={{ scrollbarGutter: "stable" }}>
          {/* Summary – always visible */}
          <section className="glass-card p-6 border-l-4 border-l-primary/50">
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Executive Summary
            </h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              {bug.summary}
            </p>
          </section>

          {isPremium ? (
            <>
              {/* Steps to Reproduce */}
              <section>
                <h3 className="text-sm font-extrabold text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Bug className="h-4 w-4 text-muted-foreground" />
                  Technical Details & Proof of Concept
                </h3>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <pre
                    className="whitespace-pre-wrap text-sm font-mono overflow-x-auto rounded-xl p-6 leading-relaxed border border-border/60 bg-muted/30 text-foreground shadow-inner relative z-10"
                  >
                    {bug.stepsToReproduce || "No detailed steps provided."}
                  </pre>
                </div>
              </section>

              {/* Links */}
              <section className="pb-4">
                <h3 className="text-sm font-extrabold text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  External Resources
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "View Original PoC", href: bug.pocLink, active: true },
                    { label: "Read Reference Blog", href: bug.referenceLink, active: false },
                  ].map(({ label, href, active }) =>
                    href ? (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border transition-all group",
                          active ? "border-primary/30 bg-primary/5 hover:bg-primary/10" : "border-border hover:bg-secondary hover:border-foreground/20"
                        )}
                      >
                        <span className={cn("font-bold truncate", active ? "text-primary" : "text-foreground")}>{label}</span>
                        <ExternalLink className={cn("h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5", active ? "text-primary" : "text-muted-foreground")} />
                      </a>
                    ) : (
                      <div
                        key={label}
                        className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-muted/10 text-muted-foreground opacity-50 cursor-not-allowed"
                      >
                        <span className="truncate font-medium">{label} — Not Available</span>
                        <ExternalLink className="h-4 w-4 shrink-0" />
                      </div>
                    )
                  )}
                </div>
              </section>
            </>
          ) : (
            /* Locked overlay */
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent p-10 text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-32 bg-amber-500/10 blur-3xl pointer-events-none" />
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-inner relative z-10">
                <Lock className="h-8 w-8 text-amber-500" />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-extrabold text-foreground mb-2">Restricted Intel</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Detailed technical write-ups, payloads, vulnerability paths, and external references are strictly reserved for premium members.
                </p>
              </div>
              <button
                onClick={onUpgrade}
                className="relative z-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all"
              >
                <Crown className="h-4 w-4" />
                Unlock Premium Access
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ExclusiveBugs = () => {
  const { isPremium, firebaseUser } = useAuth();

  const [bugs, setBugs] = useState<ExclusiveBug[]>([]);
  const [categories, setCategories] = useState<ExclusiveBugCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterAccess, setFilterAccess] = useState<"" | "free" | "premium">("")

  const [selectedBug, setSelectedBug] = useState<ExclusiveBug | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // ─── Bookmark state ──

  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    getBugBookmarkIds(firebaseUser.uid).then((ids) => setBookmarkedIds(new Set(ids)));
  }, [firebaseUser]);

  const handleToggleBookmark = async (bugId: string) => {
    if (!firebaseUser) return;
    const isBookmarked = bookmarkedIds.has(bugId);
    // Optimistic update
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (isBookmarked) next.delete(bugId); else next.add(bugId);
      return next;
    });
    setTogglingId(bugId);
    try {
      if (isBookmarked) {
        await removeBugBookmark(firebaseUser.uid, bugId);
      } else {
        await addBugBookmark(firebaseUser.uid, bugId);
        toast.success("Bug bookmarked!");
      }
    } catch {
      // Roll back
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        if (isBookmarked) next.add(bugId); else next.delete(bugId);
        return next;
      });
      toast.error("Failed to update bookmark.");
    } finally {
      setTogglingId(null);
    }
  };

  // ─── Load data ──

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [bugData, catData] = await Promise.all([
          fetchExclusiveBugs(),
          fetchCategories(),
        ]);
        setBugs(bugData);
        setCategories(catData);
      } catch {
        toast.error("Failed to load exclusive bugs.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ─── Filtered list ──

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return bugs.filter((b) => {
      if (filterAccess && b.accessType !== filterAccess) return false;
      if (filterCategory && b.categoryId !== filterCategory) return false;
      if (q) {
        return (
          b.title.toLowerCase().includes(q) ||
          b.summary.toLowerCase().includes(q) ||
          b.categoryName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bugs, search, filterCategory, filterAccess]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <Navbar />

      {/* Hero Header */}
      <div className="relative border-b border-border/40 bg-muted/10 pt-16 pb-20 overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px]" />
        <div className="absolute top-1/2 left-[10%] -translate-y-1/2 w-full max-w-lg h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="container relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="inline-flex items-center gap-2 mb-4">
                <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 shadow-inner">
                  <Bug className="h-6 w-6 text-primary" />
                </div>
                {!isPremium && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-500 shadow-sm">
                    <Crown className="h-3 w-3" />
                    Premium Access Available
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
                Exclusive <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">Vulnerability Lab</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed">
                Deep-dive analysis, reproduction steps, and PoCs for high-impact bugs discovered by elite researchers. Learn, adapt, and earn more.
              </p>
            </div>

            {!isPremium && (
              <div className="shrink-0 animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="group relative overflow-hidden rounded-2xl bg-amber-500 p-px"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 opacity-70 group-hover:opacity-100 transition-opacity bg-[length:200%_auto] animate-gradient" />
                  <div className="relative flex items-center gap-2 rounded-2xl bg-background/90 backdrop-blur-sm px-6 py-4 transition-all group-hover:bg-background/80">
                    <div className="bg-amber-500/20 p-2 rounded-full">
                      <Crown className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-amber-500 uppercase tracking-widest leading-none mb-1">Unlock Everything</p>
                      <p className="text-sm font-bold text-foreground">Upgrade to Premium</p>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container flex-1 py-10 space-y-8">

        {/* Filters */}
        <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center justify-between border-dashed relative z-20 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 fill-mode-both">
          <div className="flex flex-col sm:flex-row w-full md:w-auto gap-4 flex-1">
            {/* Search */}
            <div className="relative w-full sm:max-w-xs group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
              <input
                type="text"
                placeholder="Search write-ups..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 py-2.5 pl-11 pr-4 text-sm font-medium text-foreground placeholder:-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-background/80"
              />
            </div>
            {/* Category */}
            <div className="relative w-full sm:max-w-[200px] group">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="appearance-none w-full rounded-xl border border-input bg-background/50 px-4 pr-10 py-2.5 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all hover:bg-background/80 cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </div>

          {/* Access Tabs */}
          <div className="flex bg-muted/30 p-1.5 rounded-xl border border-border/50 shrink-0 w-full md:w-auto overflow-x-auto hide-scrollbar">
            {([["", "All Content"], ["free", "Free Only"], ["premium", "Premium Only"]] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterAccess(val)}
                className={cn(
                  "flex-1 md:flex-none flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                  filterAccess === val
                    ? "bg-background text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
                )}
              >
                {val === "premium" && <Lock className="h-3 w-3" />}
                {val === "free" && <ShieldAlert className="h-3 w-3" />}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        {(search || filterCategory || filterAccess) && (
          <div className="flex items-center justify-between animate-in fade-in">
            <p className="text-sm font-bold text-muted-foreground">
              Found <span className="text-foreground">{filtered.length}</span> {filtered.length === 1 ? 'result' : 'results'}
            </p>
            <button
              onClick={() => { setSearch(""); setFilterCategory(""); setFilterAccess(""); }}
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
            >
              <X className="h-3.5 w-3.5" />
              Clear Filters
            </button>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-6 h-[260px] flex flex-col justify-between animate-pulse">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-5 bg-secondary rounded-full w-24" />
                    <div className="h-4 bg-secondary rounded w-16" />
                  </div>
                  <div className="h-5 bg-muted rounded w-3/4 mb-4" />
                  <div className="space-y-2">
                    <div className="h-3 bg-secondary rounded w-full" />
                    <div className="h-3 bg-secondary rounded w-5/6" />
                    <div className="h-3 bg-secondary rounded w-2/3" />
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-border/40">
                  <div className="h-4 bg-secondary rounded w-20" />
                  <div className="h-4 bg-secondary rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center border-dashed border-t border-border/40 mt-8">
            <div className="h-16 w-16 mx-auto rounded-full bg-secondary text-muted-foreground/60 flex items-center justify-center mb-5">
              <Bug className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No intelligence found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {bugs.length === 0 ? "No exclusive bugs have been published yet. Check back soon." : "We couldn't find any write-ups matching your current filters."}
            </p>
            {(search || filterCategory || filterAccess) && (
              <button
                onClick={() => { setSearch(""); setFilterCategory(""); setFilterAccess(""); }}
                className="mt-6 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground hover:bg-secondary transition-colors inline-block"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((bug, idx) => (
              <div
                key={bug.bugId}
                className="glass-card flex flex-col overflow-hidden hover:border-primary/40 transition-all duration-300 cursor-pointer group animate-fade-in relative hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5"
                style={{ animationDelay: `${(idx % 12) * 80}ms`, animationFillMode: 'both' }}
                onClick={() => {
                  if (bug.accessType === "premium" && !isPremium) {
                    setShowUpgradeModal(true);
                  } else {
                    setSelectedBug(bug);
                  }
                }}
              >
                {/* Subtle hover glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="p-6 flex-1 flex flex-col relative z-10">
                  {/* Header: Category + date + bookmark */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-primary shadow-sm">
                      {bug.categoryName}
                    </span>
                    <div className="flex items-center gap-2 shrink-0 bg-secondary/50 rounded-full px-2 py-1 select-none">
                      <CalendarDays className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {bug.createdAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {firebaseUser && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleBookmark(bug.bugId); }}
                          disabled={togglingId === bug.bugId}
                          title={bookmarkedIds.has(bug.bugId) ? "Remove bookmark" : "Bookmark this bug"}
                          className="rounded-full p-1 transition-colors hover:bg-background disabled:opacity-50 ml-1"
                        >
                          <Bookmark
                            className={`h-3 w-3 transition-colors ${bookmarkedIds.has(bug.bugId) ? "fill-primary text-primary" : "text-muted-foreground"
                              }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2 mb-3">
                    {bug.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed line-clamp-3 mb-4">
                    {bug.summary}
                  </p>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border/40 bg-muted/5 flex items-center justify-between relative z-10">
                  <span className="flex items-center gap-1.5 text-sm font-extrabold text-green-500 bg-green-500/10 px-2 py-1 rounded-md">
                    <DollarSign className="h-4 w-4" />
                    {bug.currency} {bug.bountyAmount.toLocaleString()}
                  </span>

                  {bug.accessType === "free" ? (
                    <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-foreground bg-secondary/80 border border-border/60 rounded-full px-3 py-1.5 shadow-sm">
                      Free Intel
                    </span>
                  ) : isPremium ? (
                    <span className="text-xs font-bold uppercase tracking-wider text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      Read Intel <span className="text-lg leading-none">&rarr;</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1.5 shadow-sm">
                      <Lock className="h-3 w-3" />
                      Premium
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Footer />

      {/* Bug Detail Modal */}
      {selectedBug && (
        <BugDetailModal
          bug={selectedBug}
          isPremium={!!isPremium || selectedBug.accessType === "free"}
          onClose={() => setSelectedBug(null)}
          onUpgrade={() => { setSelectedBug(null); setShowUpgradeModal(true); }}
        />
      )}

      {/* Premium Upgrade Modal */}
      {showUpgradeModal && (
        <PremiumModal onClose={() => setShowUpgradeModal(false)} email={firebaseUser?.email} />
      )}
    </div>
  );
};

export default ExclusiveBugs;
