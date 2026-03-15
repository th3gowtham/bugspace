import { FormEvent, useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { Loader2, Megaphone, ShieldCheck, X } from "lucide-react";
import {
  createPromoterAccount,
  fetchPromoterById,
  fetchPromoterReferralsPage,
  fetchPromotersForAdmin,
  reviewPromoterReferral,
} from "@/lib/promoterService";
import type { PromoterListItem, PromoterRecord, PromoterReferralRecord, ReferralValidationStatus } from "@/types/promoter";

const PAGE_SIZE = 10;

const AdminPromoters = () => {
  const [loadingList, setLoadingList] = useState(true);
  const [creating, setCreating] = useState(false);
  const [promoters, setPromoters] = useState<PromoterListItem[]>([]);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [promoCode, setPromoCode] = useState("");

  const [activePromoterId, setActivePromoterId] = useState<string | null>(null);
  const [activePromoter, setActivePromoter] = useState<PromoterRecord | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailPage, setDetailPage] = useState(1);
  const [detailTotalPages, setDetailTotalPages] = useState(1);
  const [detailTotalRows, setDetailTotalRows] = useState(0);
  const [detailRows, setDetailRows] = useState<PromoterReferralRecord[]>([]);
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);

  const isModalOpen = activePromoterId !== null;

  const loadPromoters = async () => {
    setLoadingList(true);
    try {
      const list = await fetchPromotersForAdmin();
      setPromoters(list);
    } catch {
      toast.error("Failed to load promoters.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    void loadPromoters();
  }, []);

  const loadDetailModal = async (promoterId: string, page: number) => {
    setLoadingDetail(true);
    try {
      const profile = await fetchPromoterById(promoterId);
      const referrals = await fetchPromoterReferralsPage(profile.promoCode, page, PAGE_SIZE);
      setActivePromoter(profile);
      setDetailRows(referrals.rows);
      setDetailTotalRows(referrals.totalRows);
      setDetailTotalPages(referrals.totalPages);
    } catch {
      toast.error("Failed to load promoter details.");
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (!activePromoterId) return;
    void loadDetailModal(activePromoterId, detailPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePromoterId, detailPage]);

  const closeModal = () => {
    setActivePromoterId(null);
    setActivePromoter(null);
    setDetailRows([]);
    setDetailPage(1);
    setDetailTotalPages(1);
    setDetailTotalRows(0);
  };

  const handleCreatePromoter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);

    try {
      await createPromoterAccount({
        username,
        email,
        password,
        promoCode,
      });
      toast.success("Promoter account created.");
      setUsername("");
      setEmail("");
      setPassword("");
      setPromoCode("");
      await loadPromoters();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create promoter account.";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleReview = async (referralId: string, status: ReferralValidationStatus) => {
    setSavingReviewId(referralId);
    try {
      await reviewPromoterReferral(referralId, status, status === "valid" ? "Approved by admin review." : "Rejected by admin review.");
      toast.success(`Referral marked as ${status}.`);
      await loadPromoters();
      if (activePromoterId) {
        await loadDetailModal(activePromoterId, detailPage);
      }
    } catch {
      toast.error("Failed to update referral review status.");
    } finally {
      setSavingReviewId(null);
    }
  };

  const selectedSummary = useMemo(
    () => promoters.find((row) => row.promoterId === activePromoterId) ?? null,
    [activePromoterId, promoters],
  );

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px] pointer-events-none" />
      <div className="absolute top-1/4 left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none opacity-40" />

      <Navbar />

      <main className="container flex-1 py-10 space-y-8 relative z-10 animate-in fade-in zoom-in-95 duration-700">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Promoter Analytics</h1>
          <p className="text-base text-muted-foreground mt-2 max-w-2xl">
            Manage promoter accounts and monitor referral quality, conversions, and commissions.
          </p>
        </div>

        <section className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Create promoter account
          </div>

          <form className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" onSubmit={handleCreatePromoter}>
            <input
              type="text"
              placeholder="Promoter name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            />
            <input
              type="password"
              placeholder="Temporary password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            />
            <input
              type="text"
              placeholder="Promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
            />
            <button
              type="submit"
              disabled={creating}
              className="md:col-span-2 xl:col-span-4 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Creating promoter..." : "Create promoter"}
            </button>
          </form>
        </section>

        <section className="glass-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Promoters</h2>
            {!loadingList && <span className="text-xs text-muted-foreground">{promoters.length} total</span>}
          </div>

          {loadingList ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
              Loading promoters...
            </div>
          ) : promoters.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No promoters added yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-secondary/30">
                    <th className="px-5 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Promoter Name</th>
                    <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Email</th>
                    <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Promo Code</th>
                    <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Total Signups</th>
                    <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Premium Conversions</th>
                    <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Commission Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {promoters.map((promoter) => (
                    <tr
                      key={promoter.promoterId}
                      onClick={() => {
                        setActivePromoterId(promoter.promoterId);
                        setDetailPage(1);
                      }}
                      className="cursor-pointer border-b border-border last:border-0 hover:bg-secondary/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-foreground font-medium">{promoter.username}</td>
                      <td className="py-3 px-4 text-muted-foreground">{promoter.email}</td>
                      <td className="py-3 px-4 text-muted-foreground font-mono">{promoter.promoCode}</td>
                      <td className="py-3 px-4 text-muted-foreground">{promoter.totalSignups}</td>
                      <td className="py-3 px-4 text-muted-foreground">{promoter.premiumConversions}</td>
                      <td className="py-3 px-4 text-muted-foreground">${promoter.commissionEarned.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-5xl rounded-2xl border border-border/50 glass-card shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
            <div className="px-6 py-5 border-b border-border/40 flex items-center justify-between relative z-10">
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-1">Promoter detail</p>
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedSummary?.username ?? activePromoter?.username ?? "Promoter"}
                </h3>
              </div>
              <button onClick={closeModal} className="p-2 rounded-md bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)] space-y-6 relative z-10">
              {loadingDetail ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <Loader2 className="inline h-4 w-4 mr-2 animate-spin" />
                  Loading promoter details...
                </div>
              ) : activePromoter ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    <InfoCard title="Promoter profile" value={activePromoter.username} sub={activePromoter.email} />
                    <InfoCard title="Referral statistics" value={`${activePromoter.totalSignups} valid`} sub={`Code: ${activePromoter.promoCode}`} />
                    <InfoCard title="Commission earned" value={`$${activePromoter.commissionEarned.toFixed(2)}`} sub={`${activePromoter.premiumConversions} premium conversions`} />
                    <InfoCard title="Reward eligibility" value={`${activePromoter.rewardPremiumMonths} month(s)`} sub="1 month per 20 valid referrals" />
                  </div>

                  <div className="glass-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Megaphone className="h-4 w-4 text-primary" />
                        Referral users list
                      </div>
                      <span className="text-xs text-muted-foreground">{detailTotalRows} total</span>
                    </div>

                    {detailRows.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No referrals for this promoter yet.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/60 bg-secondary/30">
                              <th className="px-5 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">User Email</th>
                              <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Signup Date</th>
                              <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Premium Status</th>
                              <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Premium Purchase Date</th>
                              <th className="px-4 py-4 text-xs font-extrabold text-foreground uppercase tracking-widest text-left">Review</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailRows.map((row) => (
                              <tr key={row.referralId} className="border-b border-border last:border-0">
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
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${row.status === "valid"
                                        ? "bg-emerald-500/15 text-emerald-400"
                                        : row.status === "rejected"
                                          ? "bg-destructive/15 text-destructive"
                                          : "bg-amber-500/15 text-amber-400"
                                      }`}>
                                      {row.status}
                                    </span>
                                    {row.status === "suspicious" && (
                                      <>
                                        <button
                                          onClick={() => handleReview(row.referralId, "valid")}
                                          disabled={savingReviewId === row.referralId}
                                          className="rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => handleReview(row.referralId, "rejected")}
                                          disabled={savingReviewId === row.referralId}
                                          className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/15 transition-colors disabled:opacity-50"
                                        >
                                          Reject
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="px-4 py-3 border-t border-border flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Page {detailPage} of {detailTotalPages}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDetailPage((current) => Math.max(1, current - 1))}
                          disabled={detailPage <= 1}
                          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setDetailPage((current) => Math.min(detailTotalPages, current + 1))}
                          disabled={detailPage >= detailTotalPages}
                          className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-10 text-center text-sm text-muted-foreground">Promoter details are unavailable.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

function InfoCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="glass-card p-5 group hover:shadow-md transition-all relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors pointer-events-none" />
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 relative z-10">{title}</p>
      <p className="text-2xl font-extrabold text-foreground tracking-tight relative z-10">{value}</p>
      <p className="text-xs font-medium text-muted-foreground mt-1 relative z-10">{sub}</p>
    </div>
  );
}

export default AdminPromoters;
