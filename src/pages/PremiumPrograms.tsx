import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProgramCard } from "@/components/ProgramCard";
import type { ProgramData } from "@/components/ProgramCard";
import { fetchPremiumPrograms } from "@/lib/programService";
import { toggleBookmark, fetchUserBookmarkPrograms } from "@/lib/bookmarkService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type RichProgram = ProgramData & { rawStatus: string; rawCreatedAt: Date | null };

const PremiumPrograms = () => {
  const { firebaseUser, isPremium } = useAuth();

  const [programs,       setPrograms]       = useState<RichProgram[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [bookmarkedIds,  setBookmarkedIds]  = useState<Set<string>>(new Set());
  const [lockedProgramId, setLockedProgramId] = useState<string | null>(null);

  useEffect(() => {
    fetchPremiumPrograms()
      .then(setPrograms)
      .catch(() => toast.error("Failed to load premium programs."))
      .finally(() => setLoading(false));
  }, []);

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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container flex-1 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-5 w-5 text-amber-500" />
            <h1 className="text-2xl font-bold text-foreground">Premium Programs</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : `${programs.length} exclusive programs available`}
          </p>

          {!isPremium && (
            <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
              You are viewing premium programs as a free user. Subscribe to unlock full access.
            </div>
          )}
        </div>

        {/* Program grid */}
        {loading ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">Loading programs…</p>
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-16">
            <Star className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No premium programs available yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((program) => (
              <ProgramCard
                key={program.id}
                program={program}
                isBookmarked={bookmarkedIds.has(program.id)}
                onBookmark={handleBookmark}
                isUserPremium={isPremium}
                onLockedClick={(id) => setLockedProgramId(id)}
              />
            ))}
          </div>
        )}
      </div>
      <Footer />

      {/* Subscription modal for non-premium users */}
      {lockedProgramId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card w-full max-w-md p-8 space-y-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Star className="h-6 w-6 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Premium Access Required</h2>
            <p className="text-sm text-muted-foreground">
              This program is available only for premium members. Contact support to upgrade your account.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => setLockedProgramId(null)}
                className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Close
              </button>
              <a
                href="mailto:support@bugspace.com?subject=Premium Subscription"
                className="flex-1 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumPrograms;
