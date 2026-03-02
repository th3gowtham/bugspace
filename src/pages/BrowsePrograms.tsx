import { useState, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProgramCard } from "@/components/ProgramCard";
import { FilterPanel } from "@/components/FilterPanel";
import type { ProgramData } from "@/components/ProgramCard";
import { fetchPrograms } from "@/lib/programService";
import { toggleBookmark, fetchUserBookmarkPrograms } from "@/lib/bookmarkService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type RichProgram = ProgramData & { rawStatus: string; rawCreatedAt: Date | null };

const sortOptions = ["Newest", "Older"];
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const BrowsePrograms = () => {
  const { firebaseUser, isPremium } = useAuth();

  const [search,          setSearch]          = useState("");
  const [showFilters,     setShowFilters]      = useState(false);
  const [selectedPlatform, setPlatform]        = useState("All");
  const [selectedStatus,   setStatus]          = useState("All");
  const [sort,             setSort]            = useState("Newest");
  const [programs,         setPrograms]        = useState<RichProgram[]>([]);
  const [loading,          setLoading]         = useState(true);
  const [bookmarkedIds,    setBookmarkedIds]   = useState<Set<string>>(new Set());
  const [lockedProgramId,  setLockedProgramId] = useState<string | null>(null);

  // Fetch programs on mount
  useEffect(() => {
    fetchPrograms()
      .then(setPrograms)
      .catch(() => toast.error("Failed to load programs. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  // Fetch user's bookmarks on mount
  useEffect(() => {
    if (!firebaseUser) return;
    fetchUserBookmarkPrograms(firebaseUser.uid)
      .then((bms) => setBookmarkedIds(new Set(bms.map((b) => b.id))))
      .catch(() => {/* silent */});
  }, [firebaseUser]);

  const handleBookmark = async (programId: string) => {
    if (!firebaseUser) { toast.error("Please log in to bookmark programs."); return; }
    try {
      const nowBookmarked = await toggleBookmark(firebaseUser.uid, programId);
      setBookmarkedIds((prev) => {
        const next = new Set(prev);
        nowBookmarked ? next.add(programId) : next.delete(programId);
        return next;
      });
      toast.success(nowBookmarked ? "Program bookmarked!" : "Bookmark removed.");
    } catch {
      toast.error("Failed to update bookmark.");
    }
  };

  const handleLockedClick = (programId: string) => {
    setLockedProgramId(programId);
  };

  // ── Client-side filtering ──────────────────────────────────────────────────
  const filtered = programs
    .filter((p) => {
      // Search: programName or companyName
      const term = search.toLowerCase();
      if (term && !p.name.toLowerCase().includes(term) && !p.company.toLowerCase().includes(term))
        return false;

      // Platform filter
      if (selectedPlatform !== "All" && p.platform !== selectedPlatform)
        return false;

      // Status filter
      if (selectedStatus !== "All") {
        if (selectedStatus === "New") {
          const age = p.rawCreatedAt ? Date.now() - p.rawCreatedAt.getTime() : Infinity;
          if (age > SEVEN_DAYS_MS) return false;
        } else {
          if (p.rawStatus.toLowerCase() !== selectedStatus.toLowerCase()) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      const aMs = a.rawCreatedAt?.getTime() ?? 0;
      const bMs = b.rawCreatedAt?.getTime() ?? 0;
      return sort === "Newest" ? bMs - aMs : aMs - bMs;
    });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container flex-1 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Browse Programs</h1>
          <p className="text-sm text-muted-foreground mt-1">{loading ? "Loading…" : `${filtered.length} programs available`}</p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar filters - desktop */}
          <FilterPanel
            className="hidden lg:block sticky top-20 self-start"
            selectedPlatform={selectedPlatform}
            onPlatformChange={setPlatform}
            selectedStatus={selectedStatus}
            onStatusChange={setStatus}
          />

          <div className="flex-1 min-w-0">
            {/* Search & Sort */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search programs or companies..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>

              {/* Mobile filter toggle */}
              <button
                className="lg:hidden rounded-md border border-input bg-background px-4 py-2 text-sm text-foreground"
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </button>
            </div>

            {/* Mobile filters */}
            {showFilters && (
              <div className="lg:hidden mb-6 p-4 glass-card animate-fade-in">
                <FilterPanel
                  selectedPlatform={selectedPlatform}
                  onPlatformChange={setPlatform}
                  selectedStatus={selectedStatus}
                  onStatusChange={setStatus}
                />
              </div>
            )}

            {/* Results */}
            {loading ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">Loading programs…</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  {filtered.map((program) => (
                    <ProgramCard
                      key={program.id}
                      program={program}
                      isBookmarked={bookmarkedIds.has(program.id)}
                      onBookmark={handleBookmark}
                      isUserPremium={isPremium}
                      onLockedClick={handleLockedClick}
                    />
                  ))}
                </div>

                {filtered.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-muted-foreground">
                      {programs.length === 0
                        ? "No programs have been published yet."
                        : "No programs found matching your filters."}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Pagination */}
            {!loading && filtered.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {[1, 2, 3].map((page) => (
                  <button
                    key={page}
                    className={`h-8 w-8 rounded-md text-sm font-medium transition-colors ${
                      page === 1
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />

      {/* Subscription Modal */}
      {lockedProgramId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-8 space-y-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/15 flex items-center justify-center">
              <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground">Premium Program Access Required</h2>
            <p className="text-sm text-muted-foreground">
              This program is available only for premium members. Upgrade your account to access exclusive bug bounty programs.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href="mailto:support@bugspace.io?subject=Premium Subscription"
                className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Contact Support
              </a>
              <button
                onClick={() => setLockedProgramId(null)}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowsePrograms;
