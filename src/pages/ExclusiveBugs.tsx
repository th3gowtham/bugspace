import { useState, useEffect, useMemo } from "react";
import { Search, Lock, ChevronDown, ExternalLink, Bug, Star, X, CalendarDays, DollarSign, Bookmark } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-amber-500/30 bg-card shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg bg-amber-500/10 p-2.5">
            <Lock className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Premium Access Required</h2>
            <p className="text-xs text-muted-foreground">Exclusive content for paid members.</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Exclusive Bugs are available only for{" "}
          <span className="font-medium text-amber-400">premium members</span>. Upgrade to unlock
          full bug details, reproduction steps, PoC links, and reference resources.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
          >
            Close
          </button>
          <a
            href={`https://wa.me/919363277862?text=${encodeURIComponent(
              `Hello, I would like to upgrade to BugSpace Premium.\nMy registered email is: ${email ?? "(not logged in)"}\nPlease share the payment details.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
          >
            Upgrade via WhatsApp
          </a>
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/65 backdrop-blur-md"
      style={{ animation: "fadeIn 0.18s ease" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>

      <div
        className="relative w-full bg-card border border-border flex flex-col"
        style={{
          maxWidth: "1000px",
          borderRadius: "14px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
          maxHeight: "90vh",
          animation: "slideUp 0.22s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* ── Sticky header ── */}
        <div
          className="flex items-start justify-between px-8 py-5 border-b border-border shrink-0"
          style={{ borderRadius: "14px 14px 0 0" }}
        >
          <div className="flex-1 min-w-0 pr-6">
            {/* Meta badges */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {bug.categoryName}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
                <CalendarDays className="h-3 w-3" />
                {bug.createdAt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-400">
                <DollarSign className="h-3 w-3" />
                {bug.currency} {bug.bountyAmount.toLocaleString()}
              </span>
            </div>
            {/* Title */}
            <h2 style={{ fontSize: "22px", fontWeight: 600, lineHeight: 1.35 }} className="text-foreground">
              {bug.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0 mt-0.5"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-8 py-7" style={{ scrollbarGutter: "stable" }}>
          <div className="space-y-7">

            {/* Summary – always visible */}
            <section>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Summary
              </p>
              <p className="text-sm text-foreground" style={{ lineHeight: 1.75 }}>
                {bug.summary}
              </p>
            </section>

            {isPremium ? (
              <>
                {/* Steps to Reproduce */}
                <section>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    Steps to Reproduce
                  </p>
                  <pre
                    className="whitespace-pre-wrap text-sm font-mono overflow-x-auto rounded-[10px] p-5 leading-[1.7] border bg-slate-100 text-gray-900 border-slate-200 dark:bg-[#0f172a] dark:text-slate-200 dark:border-white/[0.06]"
                  >
                    {bug.stepsToReproduce || "—"}
                  </pre>
                </section>

                {/* Links */}
                <section>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                    Resources
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: "PoC Link", href: bug.pocLink },
                      { label: "Reference Blog", href: bug.referenceLink },
                    ].map(({ label, href }) =>
                      href ? (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 rounded-lg border border-border px-4 py-3 text-sm text-primary hover:bg-secondary transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 shrink-0" />
                          <span className="truncate font-medium">{label}</span>
                        </a>
                      ) : (
                        <div
                          key={label}
                          className="flex items-center gap-2.5 rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground opacity-40"
                        >
                          <ExternalLink className="h-4 w-4 shrink-0" />
                          <span className="truncate">{label} — N/A</span>
                        </div>
                      )
                    )}
                  </div>
                </section>
              </>
            ) : (
              /* Locked overlay */
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-6 py-8 text-center space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">Premium Content Locked</p>
                  <p className="text-xs text-muted-foreground">
                    Reproduction steps, PoC link, and reference blog are only available to premium members.
                  </p>
                </div>
                <button
                  onClick={onUpgrade}
                  className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-5 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
                >
                  <Star className="h-3.5 w-3.5" />
                  Upgrade to Premium
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ExclusiveBugs = () => {
  const { isPremium, firebaseUser } = useAuth();

  const [bugs,       setBugs]       = useState<ExclusiveBug[]>([]);
  const [categories, setCategories] = useState<ExclusiveBugCategory[]>([]);
  const [loading,    setLoading]    = useState(true);

  const [search,         setSearch]         = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterAccess,   setFilterAccess]   = useState<"" | "free" | "premium">("")

  const [selectedBug,   setSelectedBug]   = useState<ExclusiveBug | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // ─── Bookmark state ────────────────────────────────────────────────────────

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

  // ─── Load data ─────────────────────────────────────────────────────────────

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

  // ─── Filtered list ─────────────────────────────────────────────────────────

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
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="container flex-1 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bug className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Exclusive Bugs</h1>
              {!isPremium && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-500">
                  <Star className="h-2.5 w-2.5" />
                  Premium
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Real vulnerability discoveries, techniques, and reproduction steps from the community.
            </p>
          </div>
          {!isPremium && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
            >
              <Star className="h-3.5 w-3.5" />
              Upgrade to Premium
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search bugs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {/* Category */}
          <div className="relative min-w-[160px]">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="appearance-none w-full rounded-md border border-input bg-background px-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
          {(search || filterCategory || filterAccess) && (
            <button
              onClick={() => { setSearch(""); setFilterCategory(""); setFilterAccess(""); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Access type filter pills */}
        <div className="flex gap-2">
          {([["", "All Bugs"], ["free", "Free"], ["premium", "Premium"]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterAccess(val)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filterAccess === val
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {val === "premium" && <Lock className="h-3 w-3" />}
              {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass-card p-5 space-y-3 animate-pulse">
                <div className="h-4 bg-secondary rounded w-3/4" />
                <div className="h-3 bg-secondary rounded w-full" />
                <div className="h-3 bg-secondary rounded w-5/6" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Bug className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">No bugs found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {bugs.length === 0 ? "No exclusive bugs have been published yet." : "Try adjusting your filters."}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((bug) => (
              <div
                key={bug.bugId}
                className="glass-card p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => {
                  if (bug.accessType === "premium" && !isPremium) {
                    setShowUpgradeModal(true);
                  } else {
                    setSelectedBug(bug);
                  }
                }}
              >
                {/* Category + date + bookmark */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary truncate max-w-[140px]">
                    {bug.categoryName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {bug.createdAt.toLocaleDateString()}
                    </span>
                    {firebaseUser && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleBookmark(bug.bugId); }}
                        disabled={togglingId === bug.bugId}
                        title="Bookmark this bug"
                        className={`rounded p-0.5 transition-colors disabled:opacity-50 ${
                          bookmarkedIds.has(bug.bugId)
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Bookmark
                          className={`h-4 w-4 transition-all ${
                            bookmarkedIds.has(bug.bugId) ? "fill-primary" : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {bug.title}
                </h3>

                {/* Summary */}
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">
                  {bug.summary}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-400">
                    <DollarSign className="h-3 w-3" />
                    {bug.currency} {bug.bountyAmount.toLocaleString()}
                  </span>
                  {bug.accessType === "free" ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-400 bg-green-500/10 rounded-full px-2 py-0.5">
                      FREE
                    </span>
                  ) : isPremium ? (
                    <span className="text-xs text-primary font-medium">View Details →</span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
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
