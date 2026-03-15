import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { StatusBadge, PlatformBadge } from "@/components/Badges";
import { Timeline } from "@/components/Timeline";
import { Bookmark, ArrowLeft, ExternalLink, Globe, Mail, Sparkles, ShieldAlert, BadgeInfo } from "lucide-react";
import { type FirestoreProgram, mapFirestoreToProgramData } from "@/lib/programService";
import { toggleBookmark, isBookmarked } from "@/lib/bookmarkService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const timelineEvents = [
  { date: "Feb 15, 2026", title: "Bounty range updated", description: "Maximum bounty increased to $50,000", type: "bounty" as const },
  { date: "Jan 28, 2026", title: "Scope updated", description: "Added *.api.example.com and mobile endpoints", type: "scope" as const },
  { date: "Jan 10, 2026", title: "Status changed", description: "Program resumed after temporary pause", type: "status" as const },
  { date: "Dec 1, 2025", title: "Program launched", description: "Initial bug bounty program launched", type: "launch" as const },
];

const ProgramDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { firebaseUser, isPremium } = useAuth();

  const [raw, setRaw] = useState<(FirestoreProgram & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    const unsub = onSnapshot(
      doc(db, "programs", id),
      (snap) => {
        if (snap.exists()) {
          setRaw({ id: snap.id, ...(snap.data() as FirestoreProgram) });
        } else {
          setRaw(null);
        }
        setLoading(false);
      },
      () => {
        toast.error("Failed to load program.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!firebaseUser || !id) return;
    isBookmarked(firebaseUser.uid, id).then(setBookmarked);
  }, [firebaseUser, id]);

  const handleBookmark = async () => {
    if (!firebaseUser) { toast.error("Please log in to bookmark programs."); return; }
    if (!id) return;
    setBookmarking(true);
    try {
      const nowBookmarked = await toggleBookmark(firebaseUser.uid, id);
      setBookmarked(nowBookmarked);
      toast.success(nowBookmarked ? "Program bookmarked!" : "Bookmark removed.");
    } catch {
      toast.error("Failed to update bookmark.");
    } finally {
      setBookmarking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-16">
          <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading program details…</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!raw) {
    return (
      <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
          <div className="glass-card p-10 max-w-md w-full text-center border-dashed">
            <h2 className="text-xl font-bold text-foreground mb-2">Program not found</h2>
            <p className="text-muted-foreground mb-6">The program you're looking for doesn't exist or was removed.</p>
            <Link to="/browse" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-transform hover:scale-105">
              <ArrowLeft className="h-4 w-4" /> Back to Browse
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Premium gate: show modal instead of details for non-premium users
  if (raw.isPremium && !isPremium) {
    return (
      <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
        <Navbar />
        <div className="container flex-1 py-16 flex items-center justify-center animate-in fade-in zoom-in-95 duration-300">
          <div className="glass-card w-full max-w-md p-8 space-y-6 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10" />
            <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-tr from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/20 shadow-inner">
              <Sparkles className="h-8 w-8 text-amber-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Premium Access Required</h2>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                This is a highly-confidential premium program. Unlock premium to view its detailed scope, bounds, and vulnerabilities.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link
                to="/browse"
                className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-bold text-foreground hover:bg-secondary transition-colors"
              >
                Go Back
              </Link>
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
        <Footer />
      </div>
    );
  }

  const program = mapFirestoreToProgramData(raw.id, raw);
  const scope = Array.isArray(raw.scope) ? raw.scope : program.scopePreview.split(", ");

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 pb-20">
      <Navbar />

      {/* Hero Header */}
      <div className="relative border-b border-border/40 bg-muted/10 pt-10 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />

        <div className="container relative max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Link to="/browse" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors bg-background/50 backdrop-blur-sm px-3 py-1.5 rounded-full border border-border/50 hover:border-border w-fit">
            <ArrowLeft className="h-4 w-4" /> Back to Programs
          </Link>

          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <PlatformBadge platform={program.platform} />
                <StatusBadge status={program.status} />
                {raw.isPremium && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                    Premium
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-2">{program.name}</h1>
              <p className="text-xl text-muted-foreground font-medium flex items-center gap-2">
                by {program.company}
                {raw.programUrl && (
                  <a href={raw.programUrl} target="_blank" rel="noopener noreferrer" className="inline-flex text-primary hover:text-primary/80 transition-colors" title="Official Program Page">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-4 shrink-0 mt-4 md:mt-0">
              <div className="text-left md:text-right">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Bounty Range</p>
                <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-success to-emerald-400 drop-shadow-sm">
                  {program.bountyRange}
                </p>
              </div>

              <button
                onClick={handleBookmark}
                disabled={bookmarking}
                className={cn(
                  "group relative inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition-all duration-300 w-full md:w-auto overflow-hidden",
                  bookmarked
                    ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                    : "bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground border border-border"
                )}
              >
                <Bookmark className={cn("h-4 w-4 transition-transform group-hover:scale-110", bookmarked && "fill-primary")} />
                {bookmarked ? "Bookmarked" : "Bookmark Program"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container flex-1 pt-10 max-w-5xl">
        <div className="grid gap-8 md:grid-cols-3">

          <div className="md:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-500 delay-150 fill-mode-both">
            {/* Overview */}
            <section className="glass-card p-8 group relative overflow-hidden transition-all duration-300 hover:border-primary/20 hover:shadow-lg">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center gap-2 mb-6">
                <BadgeInfo className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Overview</h2>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed">
                {program.company} invites security researchers to responsibly disclose vulnerabilities in their products and services. This program rewards researchers with bounties based on severity and impact. All submissions are reviewed within 5 business days.
              </p>

              <div className="mt-8 pt-6 border-t border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  <h3 className="text-lg font-bold text-foreground">Rules of Engagement</h3>
                </div>
                {raw.programRules ? (
                  <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed p-4 rounded-xl bg-muted/30 border border-border/40">{raw.programRules}</p>
                ) : (
                  <ul className="grid gap-3 text-sm text-muted-foreground">
                    {[
                      "Do not access user data without permission",
                      "No denial-of-service testing",
                      "Report vulnerabilities within 24 hours",
                      "Follow responsible disclosure guidelines"
                    ].map((rule, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{rule}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            {/* Scope */}
            <section className="glass-card p-8 group relative overflow-hidden transition-all duration-300 hover:border-primary/20 hover:shadow-lg">
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-secondary/30 rounded-full blur-3xl -mr-10 -mb-10 pointer-events-none" />
              <div className="flex items-center gap-2 mb-6">
                <Globe className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">In-Scope Targets</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {scope.map((s, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-background/50 hover:border-primary/30 hover:bg-primary/5 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-mono text-foreground font-semibold truncate">{s}</p>
                      {s.includes("*") && (
                        <p className="text-[10px] text-primary font-bold uppercase tracking-wider mt-0.5">Wildcard Domain</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Update History */}
            <section className="glass-card p-8 transition-all duration-300 hover:border-primary/20 hover:shadow-lg">
              <h2 className="text-xl font-bold text-foreground mb-8">Update History</h2>
              <Timeline events={timelineEvents} />
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 delay-300 fill-mode-both">
            <section className="glass-card p-6 border-t-4 border-t-primary">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">Program Info</h2>
              <dl className="space-y-4">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform</dt>
                  <dd className="text-sm font-bold text-foreground">{program.platform}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industry</dt>
                  <dd className="text-sm font-medium text-foreground">{program.industry || "Technology Sector"}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Activity</dt>
                  <dd className="text-sm font-medium text-foreground">{program.updatedDaysAgo === 0 ? "Active Today" : `${program.updatedDaysAgo} days ago`}</dd>
                </div>
              </dl>
            </section>

            <section className="glass-card p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">Contact & Disclosure</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 bg-primary/10 p-2 rounded-lg text-primary shrink-0">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Security Team</p>
                    {raw.disclosureEmail ? (
                      <a href={`mailto:${raw.disclosureEmail}`} className="text-sm font-semibold text-primary hover:underline break-all">{raw.disclosureEmail}</a>
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">Contact not specified</span>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramDetail;
