import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Star, ExternalLink, Bookmark, DollarSign, CalendarDays, Bug, ShieldAlert, Crown } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { fetchExclusiveBugsByIds, type ExclusiveBug } from "@/lib/exclusiveBugService";
import { getBugBookmarkIds, addBugBookmark, removeBugBookmark } from "@/lib/bugBookmarkService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Upgrade prompt ────────────────────────────────────────────────────────────

function UpgradePrompt({ email }: { email: string | null | undefined }) {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent p-10 mt-8 text-center space-y-6 relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
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
      <a
        href={`https://wa.me/919363277862?text=${encodeURIComponent(
          `Hello, I would like to upgrade to BugSpace Premium.\nMy registered email is: ${email ?? "(not logged in)"}\nPlease share the payment details.`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="relative z-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all"
      >
        <Crown className="h-4 w-4" />
        Unlock Premium Access
      </a>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

const ExclusiveBugDetail = () => {
  const { bugId } = useParams<{ bugId: string }>();
  const navigate = useNavigate();
  const { isPremium, firebaseUser } = useAuth();

  const [bug, setBug] = useState<ExclusiveBug | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkBusy, setBookmarkBusy] = useState(false);

  // whether this user can see the full content
  const canView = bug ? (bug.accessType === "free" || !!isPremium) : false;

  // ─── Load bug ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!bugId) { setNotFound(true); setLoading(false); return; }
    (async () => {
      setLoading(true);
      try {
        const results = await fetchExclusiveBugsByIds([bugId]);
        if (results.length === 0) { setNotFound(true); return; }
        setBug(results[0]);
      } catch {
        toast.error("Failed to load bug details.");
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [bugId]);

  // ─── Load bookmark state ──────────────────────────────────────────────────

  useEffect(() => {
    if (!firebaseUser || !bugId) return;
    getBugBookmarkIds(firebaseUser.uid).then((ids) => setIsBookmarked(ids.includes(bugId)));
  }, [firebaseUser, bugId]);

  // ─── Toggle bookmark ──────────────────────────────────────────────────────

  const handleToggleBookmark = async () => {
    if (!firebaseUser || !bugId) return;
    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked);
    setBookmarkBusy(true);
    try {
      if (wasBookmarked) {
        await removeBugBookmark(firebaseUser.uid, bugId);
      } else {
        await addBugBookmark(firebaseUser.uid, bugId);
        toast.success("Bug bookmarked!");
      }
    } catch {
      setIsBookmarked(wasBookmarked); // rollback
      toast.error("Failed to update bookmark.");
    } finally {
      setBookmarkBusy(false);
    }
  };

  // ─── Render states ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="container flex-1 py-12">
          <div className="space-y-6 max-w-3xl mx-auto animate-pulse">
            <div className="h-6 bg-secondary/50 rounded w-1/4" />
            <div className="h-48 glass-card rounded-2xl" />
            <div className="h-4 bg-secondary/50 rounded w-full" />
            <div className="h-4 bg-secondary/50 rounded w-5/6" />
            <div className="h-32 glass-card rounded-2xl" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !bug) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="container flex-1 py-12 flex flex-col items-center justify-center gap-6">
          <div className="h-20 w-20 rounded-full bg-secondary/50 flex items-center justify-center">
            <Bug className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-foreground mb-2">Intel Not Found</h2>
            <p className="text-base text-muted-foreground max-w-md mx-auto">This bug report may have been removed or securely archived.</p>
          </div>
          <button
            onClick={() => navigate("/exclusive-bugs")}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-bold text-foreground hover:bg-secondary hover:border-foreground/20 transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Exclusive Bugs
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <Navbar />

      <div className="container flex-1 py-8 md:py-12">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Back + title row */}
          <div className="flex items-center justify-between gap-4 animate-in fade-in slide-in-from-left-4 duration-500">
            <button
              onClick={() => navigate("/exclusive-bugs")}
              className="group inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-all"
            >
              <div className="p-2 rounded-full bg-secondary/50 group-hover:bg-secondary transition-colors">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              </div>
              Back to Directory
            </button>
            {firebaseUser && (
              <button
                onClick={handleToggleBookmark}
                disabled={bookmarkBusy}
                title={isBookmarked ? "Remove bookmark" : "Bookmark this bug"}
                className={cn(
                  "p-2.5 rounded-full transition-all border disabled:opacity-50",
                  isBookmarked
                    ? "bg-primary/10 border-primary/30 text-primary shadow-sm shadow-primary/10 hover:bg-primary/20"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-foreground/20"
                )}
              >
                <Bookmark className={`h-5 w-5 transition-transform ${isBookmarked ? "fill-primary scale-110" : ""}`} />
              </button>
            )}
          </div>

          {/* Header card */}
          <div className="glass-card p-8 md:p-10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <div className="relative z-10 space-y-6">
              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-primary shadow-sm">
                  {bug.categoryName}
                </span>
                {bug.accessType === "free" ? (
                  <span className="inline-flex items-center rounded-full bg-green-500/15 border border-green-500/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-green-500 shadow-sm">
                    Free Intel
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-amber-500 shadow-sm">
                    <Lock className="h-3 w-3" />
                    Premium Intel
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 rounded-full px-3 py-1 border border-border/50 shadow-sm">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {bug.createdAt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight tracking-tight">{bug.title}</h1>

              {/* Bounty */}
              <div className="flex items-center gap-2 text-lg font-extrabold text-green-500 bg-green-500/10 w-fit px-4 py-2 rounded-xl border border-green-500/20 shadow-sm shadow-green-500/10">
                <DollarSign className="h-5 w-5" />
                {bug.currency} {bug.bountyAmount.toLocaleString()} Bounty
              </div>
            </div>
          </div>

          {/* Summary — always visible */}
          <div className="glass-card p-8 border-l-4 border-l-primary/50 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            <h3 className="text-sm font-extrabold text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              Executive Summary
            </h3>
            <p className="text-base text-muted-foreground leading-relaxed">{bug.summary}</p>
          </div>

          {/* Premium-gated content */}
          {canView ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
              {/* Steps to Reproduce */}
              {bug.stepsToReproduce && (
                <div className="space-y-4">
                  <h3 className="text-sm font-extrabold text-foreground uppercase tracking-widest flex items-center gap-2 px-2">
                    <Bug className="h-4 w-4 text-muted-foreground" />
                    Technical Details & Proof of Concept
                  </h3>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    <pre className="whitespace-pre-wrap rounded-2xl border border-border/60 bg-muted/30 px-6 py-6 text-sm text-foreground font-mono leading-relaxed shadow-inner overflow-x-auto relative z-10">
                      {bug.stepsToReproduce}
                    </pre>
                  </div>
                </div>
              )}

              {/* Links */}
              {(bug.pocLink || bug.referenceLink) && (
                <div className="space-y-4 pt-4 border-t border-border/40">
                  <h3 className="text-sm font-extrabold text-foreground uppercase tracking-widest flex items-center gap-2 px-2">
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
                            "flex items-center justify-between p-5 rounded-xl border transition-all group",
                            active ? "border-primary/30 bg-primary/5 hover:bg-primary/10 hover:-translate-y-0.5 shadow-sm" : "border-border hover:bg-secondary hover:border-foreground/20 hover:-translate-y-0.5 shadow-sm"
                          )}
                        >
                          <span className={cn("font-bold truncate", active ? "text-primary" : "text-foreground")}>{label}</span>
                          <ExternalLink className={cn("h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5", active ? "text-primary" : "text-muted-foreground")} />
                        </a>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <UpgradePrompt email={firebaseUser?.email} />
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ExclusiveBugDetail;
