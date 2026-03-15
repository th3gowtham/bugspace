import { useState, useEffect } from "react";
import { Search, ChevronDown, Sparkles, Lock } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProgramCard } from "@/components/ProgramCard";
import { FilterPanel } from "@/components/FilterPanel";
import type { ProgramData } from "@/components/ProgramCard";
import { fetchPrograms } from "@/lib/programService";
import { toggleBookmark, fetchUserBookmarkPrograms } from "@/lib/bookmarkService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

type RichProgram = ProgramData & { rawStatus: string; rawCreatedAt: Date | null };

const sortOptions = ["Newest", "Older"];
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const BrowsePrograms = () => {
  const { firebaseUser, isPremium } = useAuth();

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlatform, setPlatform] = useState("All");
  const [selectedStatus, setStatus] = useState("All");
  const [sort, setSort] = useState("Newest");
  const [programs, setPrograms] = useState<RichProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [lockedProgramId, setLockedProgramId] = useState<string | null>(null);

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
      .catch(() => {/* silent */ });
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

  const featuredPrograms = programs.filter(p => p.isPremium).slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <Navbar />

      {/* Hero Section */}
      <div className="relative border-b border-border/40 bg-muted/10 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />

        <div className="container relative pt-12 pb-8">
          <div className="max-w-2xl text-center sm:text-left mb-10 animate-fade-in">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground mb-4">
              Discover <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-amber-500">Vulnerabilities</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Browse top-tier bug bounty programs, exploit high-value targets, and earn rewards. Your next big bounty starts here.
            </p>
          </div>

          {featuredPrograms.length > 0 && !loading && (
            <div className="animate-fade-in" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-bold">Featured Premium Targets</h2>
              </div>
              <Carousel
                opts={{ align: "start", loop: true }}
                className="w-full"
              >
                <CarouselContent className="-ml-4">
                  {featuredPrograms.map((program) => (
                    <CarouselItem key={program.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                      <ProgramCard
                        program={program}
                        isBookmarked={bookmarkedIds.has(program.id)}
                        onBookmark={handleBookmark}
                        isUserPremium={isPremium}
                        onLockedClick={handleLockedClick}
                        className="h-full border-amber-500/20 shadow-amber-500/5 hover:border-amber-500/40 hover:shadow-amber-500/10"
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="hidden sm:block">
                  <CarouselPrevious className="-left-4 bg-background/50 backdrop-blur border-border" />
                  <CarouselNext className="-right-4 bg-background/50 backdrop-blur border-border" />
                </div>
              </Carousel>
            </div>
          )}
        </div>
      </div>

      <div className="container flex-1 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">All Programs</h2>
            <p className="text-sm text-muted-foreground mt-1">{loading ? "Loading…" : `${filtered.length} matching programs available`}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar filters - desktop */}
          <FilterPanel
            className="hidden lg:block sticky top-24 self-start"
            selectedPlatform={selectedPlatform}
            onPlatformChange={setPlatform}
            selectedStatus={selectedStatus}
            onStatusChange={setStatus}
          />

          <div className="flex-1 min-w-0">
            {/* Search & Sort */}
            

            {/* Mobile filters */}
            <div className={cn(
              "lg:hidden grid transition-all duration-300 ease-in-out",
              showFilters ? "grid-rows-[1fr] opacity-100 mb-8" : "grid-rows-[0fr] opacity-0"
            )}>
              <div className="overflow-hidden">
                <div className="p-5 border border-border rounded-2xl bg-muted/20 backdrop-blur-md">
                  <FilterPanel
                    selectedPlatform={selectedPlatform}
                    onPlatformChange={setPlatform}
                    selectedStatus={selectedStatus}
                    onStatusChange={setStatus}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Results */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4" />
                <p className="text-muted-foreground font-medium">Loading vulnerability programs…</p>
              </div>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2">
                  {filtered.map((program, idx) => (
                    <div
                      key={program.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${(idx % 10) * 100}ms`, animationFillMode: 'both' }}
                    >
                      <ProgramCard
                        program={program}
                        isBookmarked={bookmarkedIds.has(program.id)}
                        onBookmark={handleBookmark}
                        isUserPremium={isPremium}
                        onLockedClick={handleLockedClick}
                        className="h-full"
                      />
                    </div>
                  ))}
                </div>

                {filtered.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 px-4 text-center glass-card border-dashed mt-4">
                    <div className="h-16 w-16 mb-4 rounded-full bg-muted flex items-center justify-center">
                      <Search className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">No programs found</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {programs.length === 0
                        ? "There are currently no programs available. Please check back later."
                        : "We couldn't find any programs matching your current filters. Try adjusting your search or clearing some filters."}
                    </p>
                    {programs.length > 0 && (
                      <button
                        onClick={() => { setSearch(""); setPlatform("All"); setStatus("All"); }}
                        className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                )}
              </>
            )}<div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <input
                  type="text"
                  placeholder="Search programs, companies, or scope..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-full border border-input bg-background/50 py-2.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-background transition-all shadow-sm"
                />
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="appearance-none h-full rounded-full border border-input bg-background/50 backdrop-blur-sm py-2.5 pl-4 pr-10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm cursor-pointer"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>

                {/* Mobile filter toggle */}
                <button
                  className="lg:hidden flex items-center justify-center h-full rounded-full border border-input bg-background/50 py-2.5 px-5 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  Filters
                </button>
              </div>
            </div>

            {/* Pagination */}
            {!loading && filtered.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-12 animate-fade-in" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
                {[1, 2, 3].map((page) => (
                  <button
                    key={page}
                    className={cn(
                      "h-10 w-10 rounded-full text-sm font-bold transition-all duration-200",
                      page === 1
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-110"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent hover:border-border"
                    )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md p-8 space-y-5 text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-tr from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/20 shadow-inner">
              <Lock className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Premium Access Required</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Unlock high-value confidential programs, detailed scope, and advanced reconnaissance data.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => setLockedProgramId(null)}
                className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                Maybe Later
              </button>
              <a
                href={`https://wa.me/919363277862?text=${encodeURIComponent(`Hello, I would like to upgrade to BugSpace Premium.\nMy registered email is: ${firebaseUser?.email ?? "(not logged in)"}\nPlease share the payment details.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all hover:-translate-y-0.5"
              >
                Upgrade Now
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowsePrograms;
