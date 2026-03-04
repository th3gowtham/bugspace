import { useState, useEffect, useMemo } from "react";
import { Search, Lock, ChevronDown, ExternalLink, Bug, Star, X, CalendarDays, DollarSign } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-start justify-between px-6 py-4 border-b border-border">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-base font-semibold text-foreground">{bug.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {bug.categoryName}
              </span>
              <span className="text-xs text-muted-foreground">
                {bug.createdAt.toLocaleDateString()}
              </span>
              <span className="text-xs font-semibold text-green-400">
                {bug.currency} {bug.bountyAmount.toLocaleString()}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Summary – always visible */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Summary</p>
            <p className="text-sm text-foreground leading-relaxed">{bug.summary}</p>
          </div>

          {isPremium ? (
            <>
              {/* Steps to Reproduce */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  Steps to Reproduce
                </p>
                <pre className="whitespace-pre-wrap rounded-md border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground font-mono leading-relaxed">
                  {bug.stepsToReproduce || "—"}
                </pre>
              </div>

              {/* Links */}
              <div className="grid grid-cols-2 gap-3">
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
                      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-primary hover:bg-secondary transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{label}</span>
                    </a>
                  ) : (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground opacity-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{label} — N/A</span>
                    </div>
                  )
                )}
              </div>
            </>
          ) : (
            /* Locked overlay */
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-5 py-6 text-center space-y-3">
              <div className="mx-auto w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-amber-400" />
              </div>
              <p className="text-sm font-medium text-foreground">Premium Content Locked</p>
              <p className="text-xs text-muted-foreground">
                Reproduction steps, PoC link, and reference blog are only available to premium members.
              </p>
              <button
                onClick={onUpgrade}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
              >
                <Star className="h-3.5 w-3.5" />
                Upgrade to Premium
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

  const [bugs,       setBugs]       = useState<ExclusiveBug[]>([]);
  const [categories, setCategories] = useState<ExclusiveBugCategory[]>([]);
  const [loading,    setLoading]    = useState(true);

  const [search,         setSearch]         = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [selectedBug,   setSelectedBug]   = useState<ExclusiveBug | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
  }, [bugs, search, filterCategory]);

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
          {(search || filterCategory) && (
            <button
              onClick={() => { setSearch(""); setFilterCategory(""); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
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
                onClick={() => setSelectedBug(bug)}
              >
                {/* Category + date */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary truncate max-w-[140px]">
                    {bug.categoryName}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {bug.createdAt.toLocaleDateString()}
                  </span>
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
                  {!isPremium ? (
                    <span className="flex items-center gap-1 text-xs text-amber-400">
                      <Lock className="h-3 w-3" />
                      Premium
                    </span>
                  ) : (
                    <span className="text-xs text-primary font-medium">View Details →</span>
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
          isPremium={!!isPremium}
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
