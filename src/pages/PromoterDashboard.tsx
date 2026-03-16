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
import logoImg from "@/assets/logo.png";

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
    <div className="min-h-screen bg-background selection:bg-primary/20 relative overflow-hidden flex flex-col">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px] pointer-events-none" />
      <div className="absolute top-1/4 left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none opacity-40" />

      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center group transition-transform hover:scale-105">
            <img src={logoImg} alt="BugSpace Logo" className="h-10 w-auto transition-transform group-hover:scale-110 dark:invert" />
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm font-medium text-muted-foreground">
              Signed in as <span className="text-foreground">{session?.username}</span>
            </span>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-4 py-2 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-secondary hover:border-foreground/20 transition-all shadow-sm"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="container flex-1 py-10 space-y-8 relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Promoter Dashboard</h1>
          <p className="text-base text-muted-foreground mt-2 max-w-2xl">
            Track signups, premium conversions, commissions, and reward eligibility.
          </p>
        </div>

        <div className="glass-card p-6 md:p-8 space-y-4 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none group-hover:bg-primary/10 transition-colors" />
          <div className="flex items-center gap-3 text-sm font-bold text-foreground relative z-10">
            <div className="p-2 rounded-lg bg-primary/10">
              <Megaphone className="h-4 w-4 text-primary" />
            </div>
            Your Unique Referral Link
          </div>
          <div className="flex flex-col sm:flex-row gap-3 relative z-10">
            <input
              readOnly
              value={loadingSummary ? "Loading..." : referralLink}
              className="flex-1 rounded-xl border border-input bg-background/50 px-4 py-3 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            />
            <button
              onClick={copyReferralLink}
              disabled={loadingSummary || !referralLink}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50"
            >
              <Copy className="h-4 w-4" />
              Copy Link
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total referrals" value={totalSignups} icon={Users} loading={loadingSummary} />
          <StatCard label="Premium conversions" value={premiumConversions} icon={Crown} loading={loadingSummary} />
          <StatCard label="Commission earned" value={`$${commissionEarned.toFixed(2)}`} icon={Wallet} loading={loadingSummary} />
          <StatCard label="Reward premium months" value={rewardPremiumMonths} icon={Sparkles} loading={loadingSummary} />
        </div>

        <div className="glass-card p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Reward progress</p>
            <p className="text-sm font-semibold text-foreground">
              {rewardProgressCount} / {rewardProgressRequired} <span className="text-muted-foreground font-normal">valid referrals</span>
            </p>
          </div>
          <div className="h-3 w-full rounded-full bg-secondary/50 overflow-hidden relative">
            <div
              className="absolute top-0 left-0 h-full rounded-full bg-primary transition-all duration-1000 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Every <strong className="text-foreground">{rewardProgressRequired}</strong> valid referrals unlocks <strong className="text-amber-500">1 premium month reward</strong>.
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
                  <tr className="border-b border-border/60 bg-secondary/30">
                    <th className="px-5 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">User Email</th>
                    <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Signup Date</th>
                    <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Premium Status</th>
                    <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Premium Purchase Date</th>
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
    <div className="glass-card p-5 group hover:shadow-md transition-all relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors pointer-events-none" />
      <div className="flex items-center gap-2 mb-3 relative z-10">
        <div className="p-1.5 rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-extrabold text-foreground tracking-tight relative z-10">
        {loading ? "..." : value}
      </p>
    </div>
  );
}

export default PromoterDashboard;
