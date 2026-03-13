import { type ElementType, useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Loader2, LogOut, Megaphone, Shield, Users, Wallet, Sparkles, Crown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  clearPromoterSession,
  fetchPromoterReferralsPage,
  getPromoterDashboardSummary,
  getPromoterSession,
} from "@/lib/promoterService";
import type { PromoterReferralRecord } from "@/types/promoter";

const PAGE_SIZE = 10;

const PromoterDashboard = () => {
  const navigate = useNavigate();
  const session = useMemo(() => getPromoterSession(), []);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingReferrals, setLoadingReferrals] = useState(true);
  const [page, setPage] = useState(1);

  const [referralLink, setReferralLink] = useState("");
  const [totalSignups, setTotalSignups] = useState(0);
  const [premiumConversions, setPremiumConversions] = useState(0);
  const [commissionEarned, setCommissionEarned] = useState(0);
  const [rewardPremiumMonths, setRewardPremiumMonths] = useState(0);
  const [rewardProgressCount, setRewardProgressCount] = useState(0);
  const [rewardProgressRequired, setRewardProgressRequired] = useState(20);

  const [rows, setRows] = useState<PromoterReferralRecord[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadSummary = useCallback(async () => {
    if (!session) return;
    setLoadingSummary(true);
    try {
      const summary = await getPromoterDashboardSummary(session.promoterId);
      setReferralLink(summary.referralLink);
      setTotalSignups(summary.promoter.totalSignups);
      setPremiumConversions(summary.promoter.premiumConversions);
      setCommissionEarned(summary.promoter.commissionEarned);
      setRewardPremiumMonths(summary.promoter.rewardPremiumMonths);
      setRewardProgressCount(summary.rewardProgress.validReferralsTowardReward);
      setRewardProgressRequired(summary.rewardProgress.requiredForNextReward);
    } catch {
      toast.error("Failed to load promoter dashboard.");
    } finally {
      setLoadingSummary(false);
    }
  }, [session]);

  const loadReferrals = useCallback(async () => {
    if (!session) return;
    setLoadingReferrals(true);
    try {
      const result = await fetchPromoterReferralsPage(session.promoCode, page, PAGE_SIZE);
      setRows(result.rows);
      setTotalRows(result.totalRows);
      setTotalPages(result.totalPages);
    } catch {
      toast.error("Failed to load referrals.");
    } finally {
      setLoadingReferrals(false);
    }
  }, [page, session]);

  useEffect(() => {
    if (!session) {
      navigate("/promoter/login", { replace: true });
      return;
    }
    void loadSummary();
  }, [loadSummary, navigate, session]);

  useEffect(() => {
    if (!session) return;
    void loadReferrals();
  }, [loadReferrals, session]);

  const copyReferralLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied.");
  };

  const handleSignOut = () => {
    clearPromoterSession();
    navigate("/promoter/login", { replace: true });
  };

  const progressPercent = Math.min(100, Math.round((rewardProgressCount / rewardProgressRequired) * 100));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="container h-14 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 font-semibold text-foreground">
            <Shield className="h-5 w-5 text-primary" />
            BugSpace
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-muted-foreground">
              Signed in as {session?.username}
            </span>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Promoter Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track signups, premium conversions, commissions, and reward eligibility.
          </p>
        </div>

        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Megaphone className="h-4 w-4 text-primary" />
            Referral link
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={loadingSummary ? "Loading..." : referralLink}
              className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-xs text-muted-foreground font-mono"
            />
            <button
              onClick={copyReferralLink}
              disabled={loadingSummary || !referralLink}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total referrals" value={totalSignups} icon={Users} loading={loadingSummary} />
          <StatCard label="Premium conversions" value={premiumConversions} icon={Crown} loading={loadingSummary} />
          <StatCard label="Commission earned" value={`$${commissionEarned.toFixed(2)}`} icon={Wallet} loading={loadingSummary} />
          <StatCard label="Reward premium months" value={rewardPremiumMonths} icon={Sparkles} loading={loadingSummary} />
        </div>

        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <p className="font-medium text-foreground">Reward progress</p>
            <p className="text-muted-foreground">
              {rewardProgressCount}/{rewardProgressRequired} valid referrals
            </p>
          </div>
          <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-2.5 rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Every 20 valid referrals unlocks 1 premium month reward.
          </p>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Referral users</h2>
            <span className="text-xs text-muted-foreground">{totalRows} total</span>
          </div>

          {loadingReferrals ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Loading referrals...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No referrals yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">User Email</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Signup Date</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Premium Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Premium Purchase Date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.referralId} className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors">
                      <td className="py-3 px-4 text-foreground">{row.userEmail || "-"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{row.signupTimestamp.toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        {row.premiumStatus ? (
                          <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {row.premiumPurchaseDate ? row.premiumPurchaseDate.toLocaleDateString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Page {Math.min(page, totalPages)} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number;
  icon: ElementType;
  loading: boolean;
}) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-semibold text-foreground">{loading ? "..." : value}</p>
    </div>
  );
}

export default PromoterDashboard;
