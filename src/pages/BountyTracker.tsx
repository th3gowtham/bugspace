import { useState, useEffect, useMemo, useCallback } from "react";
import {
  PlusCircle, Pencil, Trash2, Download, DollarSign, Clock,
  TrendingUp, CalendarDays, AlertTriangle, X, ChevronDown,
  Star, BarChart2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  fetchBountyEntries,
  getBountyEntryCount,
  addBountyEntry,
  updateBountyEntry,
  updateBountyStatus,
  deleteBountyEntry,
  sumPaid,
  sumPaidThisMonth,
  sumPending,
  getDelayedEntries,
  monthlyEarningsData,
  severityDistributionData,
  entriesToCSV,
  type BountyEntry,
  type BountyEntryInput,
  type BountySeverity,
  type BountyStatus,
  type BountyCurrency,
} from "@/lib/bountyService";

// ─── Constants ────────────────────────────────────────────────────────────────

const FREE_LIMIT   = 20;
const PLATFORMS    = ["HackerOne","Bugcrowd","Intigriti","YesWeHack","OpenBugBounty","Self-hosted","Other"];
const SEVERITIES: BountySeverity[] = ["Low","Medium","High","Critical"];
const STATUSES:   BountyStatus[]   = ["Pending","Approved","Paid"];
const CURRENCIES: BountyCurrency[] = ["USD","INR","EUR","GBP","AUD"];

const SEVERITY_BG: Record<BountySeverity, string> = {
  Low:      "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Medium:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  High:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Critical: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_BG: Record<BountyStatus, string> = {
  Pending:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Approved: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Paid:     "bg-green-500/10 text-green-400 border-green-500/20",
};

const PIE_COLORS   = ["#3b82f6","#eab308","#f97316","#ef4444"];
const MONTH_NAMES  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS        = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function blankForm(): BountyEntryInput {
  return {
    companyName: "", platform: "HackerOne", bugTitle: "",
    severity: "Medium", amount: 0, currency: "USD", status: "Pending",
    reportDate: new Date(), approvedDate: null, paidDate: null, notes: "",
  };
}

function toInputDate(d: Date | null) { return d ? d.toISOString().slice(0, 10) : ""; }
function fromInputDate(s: string): Date | null { return s ? new Date(s) : null; }

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  title, value, icon: Icon, color, sub,
}: { title: string; value: string; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="glass-card p-5 flex items-start gap-4">
      <div className={`rounded-lg p-2.5 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground mb-1">{title}</p>
        <p className="text-xl font-bold text-foreground truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SelectField({
  label, value, onChange, options, className = "",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs text-muted-foreground">{label}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full rounded-md border border-input bg-background px-3 pr-8 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const BountyTracker = () => {
  const { firebaseUser, isPremium } = useAuth();

  const [entries,      setEntries]      = useState<BountyEntry[]>([]);
  const [entryCount,   setEntryCount]   = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [editEntry,    setEditEntry]    = useState<BountyEntry | null>(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BountyEntry | null>(null);
  const [showUpgrade,  setShowUpgrade]  = useState(false);

  const [form,           setForm]           = useState<BountyEntryInput>(blankForm());
  const [filterMonth,    setFilterMonth]    = useState("");
  const [filterYear,     setFilterYear]     = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const [chartYear,      setChartYear]      = useState(CURRENT_YEAR);
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);

  // ─── Load + delayed-payment toast ─────────────────────────────────────────

  const loadEntries = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const [data, count] = await Promise.all([
        fetchBountyEntries(firebaseUser.uid),
        getBountyEntryCount(firebaseUser.uid),
      ]);
      setEntries(data);
      setEntryCount(count);

      // Delayed-payment alert
      const delayed = getDelayedEntries(data);
      if (delayed.length > 0) {
        toast.warning(
          `⚠️ ${delayed.length} approved ${delayed.length === 1 ? "bounty has" : "bounties have"} not been paid for 30+ days.`,
          { duration: 8000 }
        );
      }
    } catch {
      toast.error("Failed to load bounty entries.");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // ─── Derived data ──────────────────────────────────────────────────────────

  const delayedCount = useMemo(() => getDelayedEntries(entries).length, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (filterStatus   && e.status   !== filterStatus)   return false;
      if (filterPlatform && e.platform !== filterPlatform) return false;
      if (filterYear  && e.reportDate.getFullYear() !== parseInt(filterYear, 10))  return false;
      if (filterMonth && e.reportDate.getMonth()    !== parseInt(filterMonth, 10)) return false;
      return true;
    });
  }, [entries, filterStatus, filterPlatform, filterYear, filterMonth]);

  const barData = useMemo(() => monthlyEarningsData(entries, chartYear), [entries, chartYear]);
  const pieData = useMemo(() => severityDistributionData(entries), [entries]);

  const allPlatforms = useMemo(() => [...new Set(entries.map((e) => e.platform))], [entries]);

  const atFreeLimit  = !isPremium && entryCount >= FREE_LIMIT;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function openAdd() {
    if (atFreeLimit) { setShowUpgrade(true); return; }
    setEditEntry(null);
    setForm(blankForm());
    setShowModal(true);
  }

  function openEdit(e: BountyEntry) {
    setEditEntry(e);
    setForm({
      companyName: e.companyName, platform: e.platform, bugTitle: e.bugTitle,
      severity: e.severity, amount: e.amount, currency: e.currency, status: e.status,
      reportDate: e.reportDate, approvedDate: e.approvedDate, paidDate: e.paidDate,
      notes: e.notes,
    });
    setShowModal(true);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!firebaseUser) return;
    if (!form.companyName.trim() || !form.bugTitle.trim() || form.amount <= 0) {
      toast.error("Company name, bug title, and a positive amount are required.");
      return;
    }
    setSubmitting(true);
    try {
      if (editEntry) {
        await updateBountyEntry(firebaseUser.uid, editEntry.entryId, form);
        toast.success("Entry updated.");
      } else {
        await addBountyEntry(firebaseUser.uid, form);
        toast.success("Entry added.");
      }
      await loadEntries();
      setShowModal(false);
      setEditEntry(null);
    } catch {
      toast.error("Failed to save entry.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!firebaseUser || !deleteTarget) return;
    try {
      await deleteBountyEntry(firebaseUser.uid, deleteTarget.entryId);
      toast.success("Entry deleted.");
      setDeleteTarget(null);
      await loadEntries();
    } catch {
      toast.error("Failed to delete entry.");
    }
  }

  function handleExportCSV() {
    const blob = new Blob([entriesToCSV(filtered)], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "bounty-entries.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported.");
  }

  async function handleInlineStatusChange(entry: BountyEntry, newStatus: BountyStatus) {
    if (!firebaseUser || entry.status === newStatus) { setStatusDropdownId(null); return; }
    // Optimistic update
    setEntries((prev) =>
      prev.map((e) =>
        e.entryId === entry.entryId
          ? {
              ...e,
              status: newStatus,
              approvedDate: newStatus === "Approved" && !e.approvedDate ? new Date() : e.approvedDate,
              paidDate:     newStatus === "Paid"     && !e.paidDate     ? new Date() : e.paidDate,
              updatedAt: new Date(),
            }
          : e
      )
    );
    setStatusDropdownId(null);
    try {
      await updateBountyStatus(firebaseUser.uid, entry.entryId, newStatus, {
        approvedDate: entry.approvedDate,
        paidDate:     entry.paidDate,
      });
      toast.success(`Status updated to ${newStatus}.`);
    } catch {
      toast.error("Failed to update status.");
      // Revert on error
      await loadEntries();
    }
  }

  const filtersActive = filterMonth || filterYear || filterStatus || filterPlatform;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="container flex-1 py-8 space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart2 className="h-5 w-5 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Bounty Tracker</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Track your earnings, pending rewards, and analytics.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              onClick={openAdd}
              className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                atFreeLimit
                  ? "bg-secondary text-muted-foreground border border-border"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              {atFreeLimit ? `Limit reached (${FREE_LIMIT})` : "Add Entry"}
            </button>
          </div>
        </div>

        {/* Free-plan usage bar */}
        {!isPremium && (
          <div className="glass-card px-5 py-3 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Free plan usage</span>
                <span>{entryCount} / {FREE_LIMIT} entries</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${entryCount >= FREE_LIMIT ? "bg-red-500" : "bg-primary"}`}
                  style={{ width: `${Math.min((entryCount / FREE_LIMIT) * 100, 100)}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => setShowUpgrade(true)}
              className="shrink-0 flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Star className="h-3.5 w-3.5" />
              Upgrade
            </button>
          </div>
        )}

        {/* Delayed-payment banner */}
        {delayedCount > 0 && (
          <div className="flex items-start gap-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-sm text-yellow-400">
              <span className="font-medium">{delayedCount} {delayedCount === 1 ? "bounty" : "bounties"}</span>{" "}
              approved 30+ days ago {delayedCount === 1 ? "has" : "have"} not been paid yet. Follow up with the company.
            </p>
          </div>
        )}

        {/* ── Stat Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Earned (Paid)"
            value={`$${sumPaid(entries).toLocaleString()}`}
            icon={DollarSign}
            color="bg-green-500/10 text-green-400"
            sub={`${entries.filter((e) => e.status === "Paid").length} paid`}
          />
          <StatCard
            title="Total Pending"
            value={`$${sumPending(entries).toLocaleString()}`}
            icon={Clock}
            color="bg-yellow-500/10 text-yellow-400"
            sub={`${entries.filter((e) => e.status !== "Paid").length} open`}
          />
          <StatCard
            title="This Month"
            value={`$${sumPaidThisMonth(entries).toLocaleString()}`}
            icon={CalendarDays}
            color="bg-blue-500/10 text-blue-400"
          />
          <StatCard
            title="Delayed Payments"
            value={String(delayedCount)}
            icon={AlertTriangle}
            color={delayedCount > 0 ? "bg-orange-500/10 text-orange-400" : "bg-muted text-muted-foreground"}
            sub="Approved 30+ days ago"
          />
        </div>

        {/* ── Charts ──────────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Bar chart */}
          <div className="glass-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">
                Monthly Earnings
              </h2>
              <div className="relative">
                <select
                  value={chartYear}
                  onChange={(e) => setChartYear(Number(e.target.value))}
                  className="appearance-none rounded-md border border-input bg-background px-3 pr-7 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Earned"]}
                />
                <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="glass-card p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">Severity Distribution</h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Legend formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">No data yet</div>
            )}
          </div>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="glass-card p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <SelectField
              label="Month"
              value={filterMonth}
              onChange={setFilterMonth}
              options={[{ label: "All months", value: "" }, ...MONTH_NAMES.map((m, i) => ({ label: m, value: String(i) }))]}
              className="min-w-[110px]"
            />
            <SelectField
              label="Year"
              value={filterYear}
              onChange={setFilterYear}
              options={[{ label: "All years", value: "" }, ...YEARS.map((y) => ({ label: String(y), value: String(y) }))]}
              className="min-w-[100px]"
            />
            <SelectField
              label="Status"
              value={filterStatus}
              onChange={setFilterStatus}
              options={[{ label: "All statuses", value: "" }, ...STATUSES.map((s) => ({ label: s, value: s }))]}
              className="min-w-[120px]"
            />
            <SelectField
              label="Platform"
              value={filterPlatform}
              onChange={setFilterPlatform}
              options={[{ label: "All platforms", value: "" }, ...allPlatforms.map((p) => ({ label: p, value: p }))]}
              className="min-w-[130px]"
            />
            {filtersActive && (
              <button
                onClick={() => { setFilterMonth(""); setFilterYear(""); setFilterStatus(""); setFilterPlatform(""); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pb-1"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Entries Table ────────────────────────────────────────────────── */}
        <div className="glass-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Entries
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {filtered.length}{filtered.length !== entries.length && ` of ${entries.length}`}
              </span>
            </h2>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No entries found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {entries.length === 0 ? "Add your first bounty entry to get started." : "Try adjusting your filters."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40">
                    {["Company","Bug / Platform","Severity","Amount","Status","Report Date",""].map((h, i) => (
                      <th key={i} className={`px-${i === 0 ? "5" : "4"} py-3 text-xs font-medium text-muted-foreground ${i === 3 ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((entry) => {
                    const delayed = entry.status === "Approved" && !entry.paidDate && entry.approvedDate &&
                      Date.now() - entry.approvedDate.getTime() >= 30 * 86400000;
                    return (
                      <tr key={entry.entryId} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-foreground">{entry.companyName}</div>
                          {delayed && (
                            <div className="flex items-center gap-1 text-xs text-yellow-400 mt-0.5">
                              <AlertTriangle className="h-3 w-3" />
                              Payment delayed
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-foreground truncate max-w-[200px]" title={entry.bugTitle}>{entry.bugTitle}</div>
                          <div className="text-xs text-muted-foreground">{entry.platform}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${SEVERITY_BG[entry.severity]}`}>
                            {entry.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-foreground">
                          {entry.currency} {entry.amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="relative inline-block">
                            <button
                              onClick={() => setStatusDropdownId(statusDropdownId === entry.entryId ? null : entry.entryId)}
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${STATUS_BG[entry.status]}`}
                            >
                              {entry.status}
                              <ChevronDown className="h-2.5 w-2.5" />
                            </button>
                            {statusDropdownId === entry.entryId && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setStatusDropdownId(null)}
                                />
                                <div className="absolute left-0 top-full mt-1 z-20 w-28 rounded-md border border-border bg-card shadow-lg overflow-hidden">
                                  {STATUSES.map((s) => (
                                    <button
                                      key={s}
                                      onClick={() => handleInlineStatusChange(entry, s)}
                                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-secondary transition-colors ${
                                        entry.status === s ? "font-semibold text-foreground" : "text-muted-foreground"
                                      }`}
                                    >
                                      <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                                        s === "Paid" ? "bg-green-400" : s === "Approved" ? "bg-blue-400" : "bg-yellow-400"
                                      }`} />
                                      {s}
                                      {entry.status === s && <span className="ml-auto text-primary">✓</span>}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">{entry.reportDate.toLocaleDateString()}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(entry)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => setDeleteTarget(entry)} className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* ── Add / Edit Modal ───────────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">
                {editEntry ? "Edit Entry" : "Add Bounty Entry"}
              </h2>
              <button onClick={() => { setShowModal(false); setEditEntry(null); }} className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Company Name *</label>
                  <input required value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                    placeholder="e.g. Google"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Platform</label>
                  <div className="relative">
                    <select value={form.platform} onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
                      className="appearance-none w-full rounded-md border border-input bg-background px-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      {PLATFORMS.map((pl) => <option key={pl} value={pl}>{pl}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Bug Title *</label>
                <input required value={form.bugTitle} onChange={(e) => setForm((p) => ({ ...p, bugTitle: e.target.value }))}
                  placeholder="e.g. XSS in login page"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Severity</label>
                  <div className="relative">
                    <select value={form.severity} onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value as BountySeverity }))}
                      className="appearance-none w-full rounded-md border border-input bg-background px-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Status</label>
                  <div className="relative">
                    <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as BountyStatus }))}
                      className="appearance-none w-full rounded-md border border-input bg-background px-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Amount *</label>
                  <input required type="number" min={0.01} step={0.01}
                    value={form.amount || ""} onChange={(e) => setForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Currency</label>
                  <div className="relative">
                    <select value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value as BountyCurrency }))}
                      className="appearance-none w-full rounded-md border border-input bg-background px-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Report Date", key: "reportDate", required: true, val: form.reportDate, nullable: false },
                  { label: "Approved Date", key: "approvedDate", required: false, val: form.approvedDate, nullable: true },
                  { label: "Paid Date", key: "paidDate", required: false, val: form.paidDate, nullable: true },
                ].map(({ label, key, val, nullable }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-foreground mb-1">{label}</label>
                    <input
                      type="date"
                      value={toInputDate(val as Date | null)}
                      onChange={(e) => setForm((p) => ({
                        ...p,
                        [key]: nullable ? fromInputDate(e.target.value) : (fromInputDate(e.target.value) ?? new Date()),
                      }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Notes</label>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional notes…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setShowModal(false); setEditEntry(null); }}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  {submitting ? "Saving…" : editEntry ? "Update" : "Add Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-red-500/10 p-2.5"><Trash2 className="h-5 w-5 text-red-400" /></div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Delete Entry</h2>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Delete <span className="font-medium text-foreground">{deleteTarget.bugTitle}</span> from{" "}
              <span className="font-medium text-foreground">{deleteTarget.companyName}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upgrade Modal ──────────────────────────────────────────────────── */}
      {showUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-amber-500/30 bg-card shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-amber-500/10 p-2.5"><Star className="h-5 w-5 text-amber-400" /></div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Free Limit Reached</h2>
                <p className="text-xs text-muted-foreground">You've used all {FREE_LIMIT} free entries.</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Upgrade to <span className="font-medium text-amber-400">Premium</span> for unlimited bounty entries, advanced analytics, and priority support.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowUpgrade(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
                Not now
              </button>
              <a href="/premium"
                className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors">
                View Premium
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BountyTracker;
