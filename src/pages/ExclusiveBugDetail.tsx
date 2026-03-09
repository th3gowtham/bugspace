import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Lock, Star, ExternalLink, Bookmark, DollarSign, CalendarDays, Bug } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { fetchExclusiveBugsByIds, type ExclusiveBug } from "@/lib/exclusiveBugService";
import { getBugBookmarkIds, addBugBookmark, removeBugBookmark } from "@/lib/bugBookmarkService";
import { toast } from "sonner";

// ─── Upgrade prompt ────────────────────────────────────────────────────────────

function UpgradePrompt({ email }: { email: string | null | undefined }) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-5 py-6 text-center space-y-3">
      <div className="mx-auto w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
        <Lock className="h-5 w-5 text-amber-400" />
      </div>
      <p className="text-sm font-medium text-foreground">Premium Content Locked</p>
      <p className="text-xs text-muted-foreground">
        Reproduction steps, PoC link, and reference blog are only available to premium members.
      </p>
      <a
        href={`https://wa.me/919363277862?text=${encodeURIComponent(
          `Hello, I would like to upgrade to BugSpace Premium.\nMy registered email is: ${email ?? "(not logged in)"}\nPlease share the payment details.`
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
      >
        <Star className="h-3.5 w-3.5" />
        Upgrade to Premium
      </a>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

const ExclusiveBugDetail = () => {
  const { bugId } = useParams<{ bugId: string }>();
  const navigate = useNavigate();
  const { isPremium, firebaseUser } = useAuth();

  const [bug, setBug]           = useState<ExclusiveBug | null>(null);
  const [loading, setLoading]   = useState(true);
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
          <div className="space-y-4 max-w-2xl mx-auto animate-pulse">
            <div className="h-5 bg-secondary rounded w-1/3" />
            <div className="h-8 bg-secondary rounded w-3/4" />
            <div className="h-4 bg-secondary rounded w-full" />
            <div className="h-4 bg-secondary rounded w-5/6" />
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
        <div className="container flex-1 py-12 flex flex-col items-center justify-center gap-4">
          <Bug className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-lg font-medium text-foreground">Bug not found</p>
          <p className="text-sm text-muted-foreground">This bug report may have been removed.</p>
          <button
            onClick={() => navigate("/exclusive-bugs")}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Exclusive Bugs
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="container flex-1 py-8">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Back + title row */}
          <div className="flex items-start justify-between gap-4">
            <button
              onClick={() => navigate("/exclusive-bugs")}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Exclusive Bugs
            </button>
            {firebaseUser && (
              <button
                onClick={handleToggleBookmark}
                disabled={bookmarkBusy}
                title={isBookmarked ? "Remove bookmark" : "Bookmark this bug"}
                className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${
                  isBookmarked ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bookmark className={`h-5 w-5 ${isBookmarked ? "fill-primary" : ""}`} />
              </button>
            )}
          </div>

          {/* Header card */}
          <div className="glass-card p-6 space-y-4">
            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {bug.categoryName}
              </span>
              {bug.accessType === "free" ? (
                <span className="inline-flex items-center rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-semibold text-green-400">
                  FREE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                  <Lock className="h-3 w-3" />
                  PREMIUM
                </span>
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                <CalendarDays className="h-3.5 w-3.5" />
                {bug.createdAt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl font-bold text-foreground leading-snug">{bug.title}</h1>

            {/* Bounty */}
            <div className="flex items-center gap-1.5 text-sm font-semibold text-green-400">
              <DollarSign className="h-4 w-4" />
              {bug.currency} {bug.bountyAmount.toLocaleString()} bounty
            </div>
          </div>

          {/* Summary — always visible */}
          <div className="glass-card p-6 space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Summary</p>
            <p className="text-sm text-foreground leading-relaxed">{bug.summary}</p>
          </div>

          {/* Premium-gated content */}
          {canView ? (
            <>
              {/* Steps to Reproduce */}
              {bug.stepsToReproduce && (
                <div className="glass-card p-6 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Steps to Reproduce</p>
                  <pre className="whitespace-pre-wrap rounded-md border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground font-mono leading-relaxed">
                    {bug.stepsToReproduce}
                  </pre>
                </div>
              )}

              {/* Links */}
              {(bug.pocLink || bug.referenceLink) && (
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
                        className="glass-card flex items-center gap-2 px-4 py-3 text-sm text-primary hover:bg-secondary transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        <span className="truncate">{label}</span>
                      </a>
                    ) : null
                  )}
                </div>
              )}
            </>
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
