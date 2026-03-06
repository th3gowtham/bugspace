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
  ReferralStats,
  ReferredUser,
} from "@/lib/referralService";
import { Timestamp } from "firebase/firestore";

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
    <div className="glass-card p-4 flex items-start gap-3">
      <div className="p-2 rounded-md bg-primary/10 text-primary shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function TierBadge({ months, required }: { months: number; required: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm">
      <Gift className="h-4 w-4 text-primary shrink-0" />
      <span className="text-foreground font-medium">
        {required} referrals → {months} month{months > 1 ? "s" : ""} premium
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReferralDashboard() {
  const { firebaseUser } = useAuth();

  const [stats, setStats]             = useState<ReferralStats | null>(null);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [copied, setCopied]           = useState(false);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const [s, ru] = await Promise.all([
        getReferralStats(firebaseUser.uid),
        getReferredUsers(firebaseUser.uid),
      ]);
      setStats(s);
      setReferredUsers(ru);
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
  const count        = stats.referralCount;
  const nextTier     = getNextTier(count);
  const premiumActive = isPremiumActive(stats.premiumUntil as Timestamp | null);

  const premiumLabel = premiumActive && stats.premiumUntil
    ? `Active until ${(stats.premiumUntil as Timestamp).toDate().toLocaleDateString()}`
    : "Not active";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* ── Header ── */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Referral Program</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Invite friends to BugSpace and earn free premium rewards.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={Users}  label="Total Referrals"  value={count} />
        <StatCard
          icon={Star}
          label="Premium Status"
          value={premiumActive ? "Active" : "Inactive"}
          sub={premiumLabel}
        />
        <StatCard
          icon={Trophy}
          label="Next Reward"
          value={nextTier ? `${nextTier.required - count} more` : "All tiers reached!"}
          sub={nextTier ? `${nextTier.months} month${nextTier.months > 1 ? "s" : ""} premium` : undefined}
        />
      </div>

      {/* ── Referral link box ── */}
      <div className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Link2 className="h-4 w-4 text-primary" />
          Your Referral Link
        </div>
        <div className="flex items-stretch gap-2">
          <input
            readOnly
            value={referralLink}
            className="flex-1 min-w-0 rounded-md border border-input bg-muted px-3 py-2 text-xs text-muted-foreground font-mono focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {copied ? (
              <><Check className="h-3.5 w-3.5" /> Copied</>
            ) : (
              <><Copy className="h-3.5 w-3.5" /> Copy</>
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Your code:{" "}
          <span className="font-mono font-semibold text-foreground">{stats.referralCode}</span>
        </p>
      </div>

      {/* ── Reward tiers ── */}
      <div className="glass-card p-5 space-y-3">
        <p className="text-sm font-medium text-foreground">Reward Tiers</p>
        <div className="space-y-2">
          <TierBadge required={20} months={1} />
          <TierBadge required={40} months={2} />
        </div>
      </div>

      {/* ── Progress bar ── */}
      {nextTier && (
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Progress to next reward</span>
            <span className="text-muted-foreground font-mono">
              {count} / {nextTier.required} referrals
            </span>
          </div>
          <ProgressBar value={count} max={nextTier.required} />
          <p className="text-xs text-muted-foreground">
            Reach {nextTier.required} referrals and get{" "}
            <strong>{nextTier.months} month{nextTier.months > 1 ? "s" : ""}</strong> of premium free.
          </p>
        </div>
      )}

      {/* ── Invited users list ── */}
      <div className="glass-card p-5">
        <p className="text-sm font-medium text-foreground mb-3">
          Invited Researchers{" "}
          {referredUsers.length > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">({referredUsers.length})</span>
          )}
        </p>
        {referredUsers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No referrals yet.</p>
            <p className="text-xs text-muted-foreground mt-0.5">Share your link to get started!</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {referredUsers.map((u, i) => (
              <li key={i} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold uppercase shrink-0">
                    {u.email[0]}
                  </div>
                  <span className="text-sm text-foreground truncate">{u.email}</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0 ml-3">
                  {(u.createdAt as Timestamp).toDate().toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
