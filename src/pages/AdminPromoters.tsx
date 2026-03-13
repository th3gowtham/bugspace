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
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="container flex-1 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Promoter Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage promoter accounts and monitor referral quality, conversions, and commissions.
          </p>
        </div>

        <section className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Create promoter account
          </div>

          <form className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3" onSubmit={handleCreatePromoter}>
            <input
              type="text"
              placeholder="Promoter name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              placeholder="Temporary password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              placeholder="Promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={creating}
              className="md:col-span-2 xl:col-span-4 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
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
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Promoter Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Promo Code</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Total Signups</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Premium Conversions</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Commission Earned</th>
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Promoter detail</p>
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedSummary?.username ?? activePromoter?.username ?? "Promoter"}
                </h3>
              </div>
              <button onClick={closeModal} className="p-1 rounded text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(90vh-72px)] space-y-5">
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
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">User Email</th>
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Signup Date</th>
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Premium Status</th>
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Premium Purchase Date</th>
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Review</th>
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
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                      row.status === "valid"
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
                                          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-60"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => handleReview(row.referralId, "rejected")}
                                          disabled={savingReviewId === row.referralId}
                                          className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-60"
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
    <div className="glass-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <p className="text-base font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

export default AdminPromoters;
