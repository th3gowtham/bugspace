import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { StatusBadge, PlatformBadge } from "@/components/Badges";
import { Timeline } from "@/components/Timeline";
import { Bookmark, ArrowLeft, ExternalLink, Globe, Mail } from "lucide-react";
import { type FirestoreProgram, mapFirestoreToProgramData } from "@/lib/programService";
import { toggleBookmark, isBookmarked } from "@/lib/bookmarkService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const timelineEvents = [
  { date: "Feb 15, 2026", title: "Bounty range updated", description: "Maximum bounty increased to $50,000", type: "bounty" as const },
  { date: "Jan 28, 2026", title: "Scope updated", description: "Added *.api.example.com and mobile endpoints", type: "scope" as const },
  { date: "Jan 10, 2026", title: "Status changed", description: "Program resumed after temporary pause", type: "status" as const },
  { date: "Dec 1, 2025", title: "Program launched", description: "Initial bug bounty program launched", type: "launch" as const },
];

const ProgramDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { firebaseUser, isPremium } = useAuth();

  const [raw, setRaw]             = useState<(FirestoreProgram & { id: string }) | null>(null);
  const [loading, setLoading]     = useState(true);
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
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="container flex-1 py-16 text-center">
          <p className="text-muted-foreground">Loading program…</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!raw) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="container flex-1 py-16 text-center">
          <p className="text-muted-foreground">Program not found.</p>
          <Link to="/browse" className="text-primary hover:underline text-sm mt-2 inline-block">
            Back to Browse
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Premium gate: show modal instead of details for non-premium users
  if (raw.isPremium && !isPremium) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <div className="container flex-1 py-16 flex items-center justify-center">
          <div className="glass-card w-full max-w-md p-8 space-y-4 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-amber-500/15 flex items-center justify-center">
              <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground">Premium Program Access Required</h2>
            <p className="text-sm text-muted-foreground">
              This program is available only for premium members. Upgrade your account to access exclusive bug bounty programs with higher payouts.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                to="/browse"
                className="flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              >
                Back to Browse
              </Link>
              <a
                href="mailto:support@bugspace.io?subject=Premium Subscription"
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Contact Support
              </a>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const program = mapFirestoreToProgramData(raw.id, raw);
  const scope   = Array.isArray(raw.scope) ? raw.scope : program.scopePreview.split(", ");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container flex-1 py-8 max-w-4xl">
        <Link to="/browse" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Back to Programs
        </Link>

        {/* Header */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{program.name}</h1>
              <p className="text-muted-foreground mt-1">{program.company}</p>
              <div className="flex items-center gap-2 mt-3">
                <PlatformBadge platform={program.platform} />
                <StatusBadge status={program.status} />
              </div>
              <p className="text-lg font-semibold text-success mt-3">{program.bountyRange}</p>
            </div>
            <button
              onClick={handleBookmark}
              disabled={bookmarking}
              className={`shrink-0 rounded-md border p-2 transition-colors ${
                bookmarked
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border bg-secondary text-muted-foreground hover:text-primary hover:border-primary"
              }`}
            >
              <Bookmark className={`h-5 w-5 ${bookmarked ? "fill-primary" : ""}`} />
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            {/* Overview */}
            <section className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">Overview</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {program.company} invites security researchers to responsibly disclose vulnerabilities in their products and services. This program rewards researchers with bounties based on severity and impact. All submissions are reviewed within 5 business days.
              </p>
              <h3 className="text-sm font-semibold text-foreground mt-4 mb-2">Rules Summary</h3>
              {raw.programRules ? (
                <p className="text-sm text-muted-foreground whitespace-pre-line">{raw.programRules}</p>
              ) : (
                <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside">
                  <li>Do not access user data without permission</li>
                  <li>No denial-of-service testing</li>
                  <li>Report vulnerabilities within 24 hours</li>
                  <li>Follow responsible disclosure guidelines</li>
                </ul>
              )}
            </section>

            {/* Scope */}
            <section className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">Scope</h2>
              <div className="space-y-2">
                {scope.map((s) => (
                  <div key={s} className="flex items-center gap-2 text-sm">
                    <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
                    <code className="text-foreground bg-secondary px-2 py-0.5 rounded text-xs">{s}</code>
                    {s.includes("*") && (
                      <span className="text-xs text-muted-foreground">(wildcard)</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Update History */}
            <section className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Update History</h2>
              <Timeline events={timelineEvents} />
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <section className="glass-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-3">Disclosure Information</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {raw.disclosureEmail ? (
                    <a href={`mailto:${raw.disclosureEmail}`} className="text-primary hover:underline">{raw.disclosureEmail}</a>
                  ) : (
                    <span className="text-muted-foreground">Not specified</span>
                  )}
                </div>
                {raw.programUrl && (
                  <div className="flex items-center gap-2 text-sm">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <a href={raw.programUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Official Program Page</a>
                  </div>
                )}
              </div>
            </section>

            <section className="glass-card p-6">
              <h2 className="text-sm font-semibold text-foreground mb-3">Program Info</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Platform</dt>
                  <dd className="text-foreground">{program.platform}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Industry</dt>
                  <dd className="text-foreground">{program.industry || "Technology"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Last Updated</dt>
                  <dd className="text-foreground">{program.updatedDaysAgo === 0 ? "Today" : `${program.updatedDaysAgo} days ago`}</dd>
                </div>
              </dl>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProgramDetail;
