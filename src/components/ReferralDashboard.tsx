import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Users, Trophy, Gift, Loader2, Star, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  getReferralStats,
  getReferredUsers,
  buildReferralLink,
  getNextTier,
  isPremiumActive,
  checkAndAwardPremiumForUser,
  ReferralStats,
  ReferredUser,
} from "@/lib/referralService";
import { Timestamp } from "firebase/firestore"

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
      <div
        className="h-2.5 rounded-full bg-primary transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="glass-card p-5 flex items-start gap-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 group">
      <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:bg-primary/20">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-black text-foreground leading-none">{value}</p>
        {sub && <p className="text-xs text-muted-foreground font-medium mt-1.5">{sub}</p>}
      </div>
    </div>
  );
}

function TierBadge({ months, required }: { months: number; required: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-secondary/30 px-4 py-3 text-sm transition-all duration-200 hover:bg-secondary/50 hover:border-border">
      <div className="p-1.5 rounded-md bg-primary/10">
        <Gift className="h-4 w-4 text-primary shrink-0" />
      </div>
      <span className="text-foreground font-semibold">
        {required} referrals <span className="text-muted-foreground px-1">→</span> {months} month{months > 1 ? "s" : ""} premium
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReferralDashboard() {
  const { firebaseUser } = useAuth();

  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      // Run premium check first (catch back-dated referral counts)
      await checkAndAwardPremiumForUser(firebaseUser.uid);

      const [s, ru] = await Promise.all([
        getReferralStats(firebaseUser.uid),
        getReferredUsers(firebaseUser.uid),
      ]);
      setReferredUsers(ru);
      setStats(s);
    } catch {
      toast.error("Failed to load referral data.");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => { load(); }, [load]);

  const handleCopy = async () => {
    if (!stats?.referralCode) return;
    await navigator.clipboard.writeText(buildReferralLink(stats.referralCode));
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading referral data…
      </div>
    );
  }

  if (!stats) {
    return (
      <p className="text-sm text-muted-foreground py-16 text-center">
        Could not load referral information. Please refresh.
      </p>
    );
  }

  // ── Derived values ──
  const referralLink = buildReferralLink(stats.referralCode);
  const count = stats.referralCount;
  const nextTier = getNextTier(count);
  const premiumActive = isPremiumActive(stats.premiumUntil as Timestamp | null);

  const premiumLabel = premiumActive && stats.premiumUntil
    ? `Active until ${(stats.premiumUntil as Timestamp).toDate().toLocaleDateString()}`
    : "Not active";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Header ── */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Referral Program</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Invite friends to BugSpace and earn free premium rewards.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
        <StatCard
          icon={Users}
          label="Total Referrals"
          value={count}
        />
        <StatCard
          icon={Star}
          label="Premium Status"
          value={premiumActive ? "Active" : "Inactive"}
          sub={premiumLabel}
        />
        <StatCard
          icon={Trophy}
          label="Next Reward"
          value={nextTier ? `${nextTier.required - count} more` : "All reached!"}
          sub={nextTier ? `${nextTier.months} mo premium` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
        <div className="space-y-6 flex flex-col">
          {/* ── Referral link box ── */}
          <div className="glass-card p-6 space-y-4 flex-1">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground mb-1">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Link2 className="h-4 w-4 text-primary" />
              </div>
              Your Referral Link
            </div>
            <div className="flex items-stretch gap-2">
              <input
                readOnly
                value={referralLink}
                className="flex-1 min-w-0 rounded-xl border border-input bg-background/50 px-4 py-2.5 text-sm text-muted-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-inner"
              />
              <button
                onClick={handleCopy}
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md active:scale-95"
              >
                {copied ? (
                  <><Check className="h-4 w-4" /> Copied</>
                ) : (
                  <><Copy className="h-4 w-4" /> Copy</>
                )}
              </button>
            </div>
            <div className="pt-2 border-t border-border/50">
              <p className="text-sm text-muted-foreground flex items-center justify-between">
                <span>Your code:</span>
                <span className="font-mono font-bold text-foreground bg-secondary/50 px-2 py-0.5 rounded-md border border-border/50">{stats.referralCode}</span>
              </p>
            </div>
          </div>

          {/* ── Reward tiers ── */}
          <div className="glass-card p-6 space-y-4 flex-1">
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-amber-500/10">
                <Trophy className="h-4 w-4 text-amber-500" />
              </div>
              Reward Tiers
            </p>
            <div className="space-y-3">
              <TierBadge required={20} months={1} />
              <TierBadge required={40} months={2} />
            </div>
            {/* ── Progress bar ── */}
            {nextTier && (
              <div className="pt-4 mt-2 border-t border-border/50 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">Next reward progress</span>
                  <span className="text-muted-foreground font-mono font-medium">
                    {count} / {nextTier.required}
                  </span>
                </div>
                <ProgressBar value={count} max={nextTier.required} />
                <p className="text-xs text-muted-foreground font-medium">
                  Reach {nextTier.required} referrals for{" "}
                  <strong className="text-foreground">{nextTier.months} month{nextTier.months > 1 ? "s" : ""}</strong> free premium.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Invited users list ── */}
        <div className="glass-card p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              Invited Researchers
            </p>
            {referredUsers.length > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-bold text-foreground">
                {referredUsers.length}
              </span>
            )}
          </div>

          <div className="flex-1 min-h-[300px]">
            {referredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4 rounded-xl border border-dashed border-border/60 bg-secondary/20">
                <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-foreground">No referrals yet</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">Share your link to get started and earn premium access!</p>
              </div>
            ) : (
              <ul className="space-y-2 relative">
                {referredUsers.map((u, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-border/50 hover:bg-secondary/30 transition-colors animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-both"
                    style={{ animationDelay: `${300 + (i * 100)}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20 flex items-center justify-center text-sm font-bold uppercase shrink-0 shadow-inner">
                        {u.email[0]}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-foreground truncate">{u.email}</span>
                        <span className="text-xs text-muted-foreground">Joined {(u.createdAt as Timestamp).toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
