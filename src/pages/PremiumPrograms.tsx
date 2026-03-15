import { useState, useEffect } from "react";
import { Star, Sparkles, Crown } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProgramCard } from "@/components/ProgramCard";
import type { ProgramData } from "@/components/ProgramCard";
import { fetchPremiumPrograms } from "@/lib/programService";
import { toggleBookmark, fetchUserBookmarkPrograms } from "@/lib/bookmarkService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type RichProgram = ProgramData & { rawStatus: string; rawCreatedAt: Date | null };

const PremiumPrograms = () => {
  const { firebaseUser, isPremium } = useAuth();

  const [programs, setPrograms] = useState<RichProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
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

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-amber-500/20">
      <Navbar />

      {/* Hero Header */}
      <div className="relative border-b border-border/40 bg-muted/10 pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-64 bg-amber-500/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="container relative text-center max-w-3xl animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 mb-6 text-sm font-semibold text-amber-500 tracking-wide uppercase shadow-sm shadow-amber-500/10">
            <Crown className="h-4 w-4" /> Exclusive Access
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground mb-6">
            Elite Bug Bounties for <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Top Hackers</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            Access high-paying, confidential programs reserved for our premium members. Less competition, higher rewards.
          </p>

          {!isPremium && !loading && (
            <div className="mt-8 inline-flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto p-4 rounded-2xl glass-card border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors cursor-pointer group" onClick={() => setLockedProgramId("upgrade")}>
              <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-sm font-bold text-foreground">You're viewing as a free user</p>
                <p className="text-xs text-muted-foreground mt-0.5">Subscribe to BugSpace Premium to unlock these programs.</p>
              </div>
              <button className="sm:ml-4 rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-colors w-full sm:w-auto">
                Upgrade Now
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="container flex-1 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-foreground">
            Available Premium Programs
            <span className="ml-3 inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {loading ? "..." : programs.length}
            </span>
          </h2>
        </div>

        {/* Program grid */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin mb-4" />
            <p className="text-muted-foreground font-medium animate-pulse">Loading elite targets…</p>
          </div>
        ) : programs.length === 0 ? (
          <div className="text-center py-24 glass-card border-dashed">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-5 text-muted-foreground/60">
              <Star className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">No Premium Programs Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">Check back later for exclusive high-paying bug bounty opportunities.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((program, idx) => (
              <div key={program.id} className="animate-fade-in group relative" style={{ animationDelay: `${(idx % 10) * 100}ms`, animationFillMode: 'both' }}>
                <div className="absolute -inset-0.5 bg-gradient-to-br from-amber-500/20 to-orange-500/0 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <ProgramCard
                  program={program}
                  isBookmarked={bookmarkedIds.has(program.id)}
                  onBookmark={handleBookmark}
                  isUserPremium={isPremium}
                  onLockedClick={(id) => setLockedProgramId(id)}
                  className="relative h-full"
                />
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />

      {/* Subscription modal for non-premium users */}
      {lockedProgramId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-card w-full max-w-md p-8 space-y-6 text-center relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-tr from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/20 shadow-inner">
              <Star className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Premium Access Required</h2>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Secure manual verification. Premium access will be activated after payment confirmation via our support team.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={() => setLockedProgramId(null)}
                className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-bold text-foreground hover:bg-secondary transition-colors"
              >
                Close
              </button>
              <a
                href={`https://wa.me/919363277862?text=${encodeURIComponent(`Hello, I would like to upgrade to BugSpace Premium.\nMy registered email is: ${firebaseUser?.email ?? "(not logged in)"}\nPlease share the payment details.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all hover:-translate-y-0.5"
              >
                Upgrade via WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumPrograms;
