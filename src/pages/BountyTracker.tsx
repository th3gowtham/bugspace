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
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const FREE_LIMIT = 10;
const PLATFORMS = ["HackerOne", "Bugcrowd", "Intigriti", "YesWeHack", "OpenBugBounty", "Self-hosted", "Other"];
const SEVERITIES: BountySeverity[] = ["Low", "Medium", "High", "Critical"];
const STATUSES: BountyStatus[] = ["Pending", "Approved", "Paid"];
const CURRENCIES: BountyCurrency[] = ["USD", "INR", "EUR", "GBP", "AUD"];

const SEVERITY_BG: Record<BountySeverity, string> = {
  Low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  High: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  Critical: "bg-red-500/10 text-red-500 border-red-500/20",
};

const STATUS_BG: Record<BountyStatus, string> = {
  Pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Approved: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Paid: "bg-green-500/10 text-green-500 border-green-500/20",
};

// Use gradient-like colors for the pie chart
const PIE_COLORS = ["#3b82f6", "#eab308", "#f97316", "#ef4444"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

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
  title, value, icon: Icon, color, sub, delay
}: { title: string; value: string; icon: React.ElementType; color: string; sub?: string; delay?: number }) {
  return (
    <div
      className={cn(
        "glass-card p-6 flex items-start gap-4 group hover:border-primary/30 transition-all duration-300 relative overflow-hidden",
        delay !== undefined ? "animate-fade-in" : ""
      )}
      style={delay !== undefined ? { animationDelay: `${delay}ms`, animationFillMode: 'both' } : {}}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-primary/10 transition-colors" />
      <div className={cn("rounded-xl p-3 shadow-inner border border-background/20", color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 z-10 relative">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
        <p className="text-2xl font-black text-foreground truncate drop-shadow-sm">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1.5 font-medium">{sub}</p>}
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
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>}
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full rounded-xl border border-input bg-background/50 backdrop-blur-sm px-4 pr-10 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 hover:bg-background/80 transition-colors cursor-pointer"
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const BountyTracker = () => {
  const { firebaseUser, isPremium } = useAuth();

  const [entries, setEntries] = useState<BountyEntry[]>([]);
  const [entryCount, setEntryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEntry, setEditEntry] = useState<BountyEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BountyEntry | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [form, setForm] = useState<BountyEntryInput>(blankForm());
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const [chartYear, setChartYear] = useState(CURRENT_YEAR);
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
      if (filterStatus && e.status !== filterStatus) return false;
      if (filterPlatform && e.platform !== filterPlatform) return false;
      if (filterYear && e.reportDate.getFullYear() !== parseInt(filterYear, 10)) return false;
      if (filterMonth && e.reportDate.getMonth() !== parseInt(filterMonth, 10)) return false;
      return true;
    });
  }, [entries, filterStatus, filterPlatform, filterYear, filterMonth]);

  const barData = useMemo(() => monthlyEarningsData(entries, chartYear), [entries, chartYear]);
  const pieData = useMemo(() => severityDistributionData(entries), [entries]);

  const allPlatforms = useMemo(() => [...new Set(entries.map((e) => e.platform))], [entries]);

  const atFreeLimit = !isPremium && entryCount >= FREE_LIMIT;

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
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
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
            paidDate: newStatus === "Paid" && !e.paidDate ? new Date() : e.paidDate,
            updatedAt: new Date(),
          }
          : e
      )
    );
    setStatusDropdownId(null);
    try {
      await updateBountyStatus(firebaseUser.uid, entry.entryId, newStatus, {
        approvedDate: entry.approvedDate,
        paidDate: entry.paidDate,
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
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20">
      <Navbar />

      <div className="container flex-1 py-10 space-y-10">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4 shadow-inner border border-primary/20">
              <BarChart2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-2">Bounty Tracker</h1>
            <p className="text-lg text-muted-foreground font-medium">
              Track your earnings, pending rewards, and analytics seamlessly.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap animate-in fade-in slide-in-from-right-4 duration-500">
            <button
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              className="group flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground hover:border-primary/30 disabled:opacity-40 transition-all shadow-sm"
            >
              <Download className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform" />
              Export CSV
            </button>
            <button
              onClick={openAdd}
              className={cn(
                "group flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold shadow-md transition-all",
                atFreeLimit
                  ? "bg-secondary text-muted-foreground border border-border"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 hover:shadow-primary/20"
              )}
            >
              <PlusCircle className={cn("h-4 w-4 transition-transform", !atFreeLimit && "group-hover:rotate-90")} />
              {atFreeLimit ? `Limit reached (${FREE_LIMIT})` : "Add Entry"}
            </button>
          </div>
        </div>

        {/* Free-plan usage bar */}
        {!isPremium && (
          <div className="glass-card px-6 py-5 flex flex-col md:flex-row md:items-center gap-6 animate-fade-in border border-amber-500/10">
            <div className="flex-1">
              <div className="flex justify-between text-sm font-bold text-muted-foreground mb-2 uppercase tracking-wider">
                <span className="text-foreground">Free Plan Usage</span>
                <span>{entryCount} / {FREE_LIMIT} entries</span>
              </div>
              <div className="h-2.5 rounded-full bg-secondary overflow-hidden shadow-inner">
                <div
                  className={cn("h-full rounded-full transition-all duration-700 ease-out", entryCount >= FREE_LIMIT ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-gradient-to-r from-amber-400 to-orange-500")}
                  style={{ width: `${Math.min((entryCount / FREE_LIMIT) * 100, 100)}%` }}
                />
              </div>
            </div>
            <button
              onClick={() => setShowUpgrade(true)}
              className="shrink-0 flex items-center justify-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-6 py-3 text-sm font-bold text-amber-500 hover:bg-amber-500 hover:text-white transition-all w-full md:w-auto hover:shadow-lg hover:shadow-amber-500/20"
            >
              <Star className="h-4 w-4" />
              Upgrade to Premium
            </button>
          </div>
        )}

        {/* ── Downgrade warning banner ─────────────────────────────────── */}
        {!isPremium && entryCount > FREE_LIMIT && (
          <div className="flex items-start gap-3 rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/10 to-transparent px-5 py-4 shadow-sm animate-in fade-in slide-in-from-top-2">
            <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-bold text-orange-500">Your account is on the Free plan.</span>{" "}
                You currently have <span className="font-bold">{entryCount} entries</span>, but the Free plan allows only{" "}
                <span className="font-bold">{FREE_LIMIT} entries</span>. Please delete{" "}
                <span className="font-bold">{entryCount - FREE_LIMIT}</span> {entryCount - FREE_LIMIT === 1 ? "entry" : "entries"} to add new ones.
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                Upgrade again to Premium to keep unlimited bounty entries.
              </p>
            </div>
          </div>
        )}

        {/* Delayed-payment banner */}
        {delayedCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 to-transparent px-5 py-4 shadow-sm animate-in fade-in slide-in-from-top-2">
            <div className="h-8 w-8 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="text-sm font-medium text-foreground">
              <span className="font-bold text-yellow-500">{delayedCount} {delayedCount === 1 ? "bounty" : "bounties"}</span>{" "}
              approved 30+ days ago {delayedCount === 1 ? "has" : "have"} not been paid yet. Follow up with the company.
            </p>
          </div>
        )}

        {/* ── Stat Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Earned (Paid)"
            value={`$${sumPaid(entries).toLocaleString()}`}
            icon={DollarSign}
            color="bg-green-500/10 text-green-500"
            sub={`${entries.filter((e) => e.status === "Paid").length} paid bounties`}
            delay={100}
          />
          <StatCard
            title="Total Pending"
            value={`$${sumPending(entries).toLocaleString()}`}
            icon={Clock}
            color="bg-yellow-500/10 text-yellow-500"
            sub={`${entries.filter((e) => e.status !== "Paid").length} open reports`}
            delay={200}
          />
          <StatCard
            title="Earned This Month"
            value={`$${sumPaidThisMonth(entries).toLocaleString()}`}
            icon={CalendarDays}
            color="bg-blue-500/10 text-blue-500"
            sub={`${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()}`}
            delay={300}
          />
          <StatCard
            title="Delayed Payments"
            value={String(delayedCount)}
            icon={AlertTriangle}
            color={delayedCount > 0 ? "bg-orange-500/10 text-orange-500" : "bg-secondary text-muted-foreground"}
            sub="Approved 30+ days ago"
            delay={400}
          />
        </div>

        {/* ── Charts ──────────────────────────────────────────────────────── */}
        <div className="grid lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 fill-mode-both">
          {/* Bar chart */}
          <div className="glass-card p-6 lg:col-span-2 group hover:border-primary/20 transition-colors">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Monthly Earnings
              </h2>
              <div className="relative">
                <select
                  value={chartYear}
                  onChange={(e) => setChartYear(Number(e.target.value))}
                  className="appearance-none rounded-xl border border-input bg-background/50 backdrop-blur-sm px-4 pr-9 py-2 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
                >
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.1} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 500 }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted-foreground))", opacity: 0.05 }}
                  contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)", padding: "12px 16px" }}
                  itemStyle={{ color: "hsl(var(--primary))", fontWeight: "bold" }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, "Earned"]}
                  labelStyle={{ color: "hsl(var(--muted-foreground))", marginBottom: 4 }}
                />
                <Bar dataKey="amount" fill="url(#colorEarnings)" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="glass-card p-6 group hover:border-primary/20 transition-colors">
            <h2 className="text-lg font-bold text-foreground mb-8 flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Severity Distribution
            </h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={4} dataKey="value" stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} className="hover:opacity-80 transition-opacity outline-none" />)}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(v) => <span className="text-sm font-medium text-muted-foreground mr-3">{v}</span>}
                    iconType="circle"
                  />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 13, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                    itemStyle={{ fontWeight: "bold" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[260px] text-center border-2 border-dashed border-border/50 rounded-2xl bg-muted/5">
                <PieChart className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No data available to chart</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="glass-card p-6 bg-muted/5 border-dashed relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-700 fill-mode-both">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="flex flex-wrap gap-4 items-end relative z-10">
            <SelectField
              label="Month"
              value={filterMonth}
              onChange={setFilterMonth}
              options={[{ label: "All Months", value: "" }, ...MONTH_NAMES.map((m, i) => ({ label: m, value: String(i) }))]}
              className="flex-1 min-w-[140px]"
            />
            <SelectField
              label="Year"
              value={filterYear}
              onChange={setFilterYear}
              options={[{ label: "All Years", value: "" }, ...YEARS.map((y) => ({ label: String(y), value: String(y) }))]}
              className="flex-1 min-w-[140px]"
            />
            <SelectField
              label="Status"
              value={filterStatus}
              onChange={setFilterStatus}
              options={[{ label: "All Statuses", value: "" }, ...STATUSES.map((s) => ({ label: s, value: s }))]}
              className="flex-1 min-w-[140px]"
            />
            <SelectField
              label="Platform"
              value={filterPlatform}
              onChange={setFilterPlatform}
              options={[{ label: "All Platforms", value: "" }, ...allPlatforms.map((p) => ({ label: p, value: p }))]}
              className="flex-1 min-w-[150px]"
            />
            {filtersActive && (
              <button
                onClick={() => { setFilterMonth(""); setFilterYear(""); setFilterStatus(""); setFilterPlatform(""); }}
                className="flex items-center gap-1.5 h-[42px] px-4 rounded-xl text-sm font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-all shrink-0"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* ── Entries Table ────────────────────────────────────────────────── */}
        <div className="glass-card overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700 delay-1000 fill-mode-both">
          <div className="flex items-center justify-between px-6 py-5 border-b border-border/60 bg-muted/10">
            <h2 className="text-lg font-bold text-foreground">
              Bounty Entries
            </h2>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary uppercase tracking-widest">
              {filtered.length}{filtered.length !== entries.length && ` of ${entries.length}`}
            </span>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <div className="h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin mb-4" />
              <p className="text-muted-foreground font-medium animate-pulse">Loading entries…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center border-dashed border-t border-border/40">
              <div className="h-16 w-16 mx-auto rounded-full bg-secondary text-muted-foreground/60 flex items-center justify-center mb-5">
                <TrendingUp className="h-8 w-8" />
              </div>
              <p className="text-lg font-bold text-foreground mb-2">No entries found</p>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                {entries.length === 0 ? "Add your first bounty entry to start tracking your success. It only takes a minute!" : "Try adjusting your filters to find what you're looking for."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-card">
                    {["Company", "Bug / Platform", "Severity", "Amount", "Status", "Report Date", "Actions"].map((h, i) => (
                      <th key={i} className={`px-${i === 0 ? "6" : "5"} py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider ${i === 3 ? "text-right" : i === 6 ? "text-right" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filtered.map((entry) => {
                    const delayed = entry.status === "Approved" && !entry.paidDate && entry.approvedDate &&
                      Date.now() - entry.approvedDate.getTime() >= 30 * 86400000;
                    return (
                      <tr key={entry.entryId} className="hover:bg-primary/5 transition-colors group">
                        <td className="px-6 py-4 w-48 align-middle">
                          <div className="font-bold text-foreground truncate max-w-[180px]">{entry.companyName}</div>
                          {delayed && (
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-yellow-500 mt-1 uppercase tracking-wider">
                              <AlertTriangle className="h-3 w-3" />
                              Delayed
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 w-1/3 align-middle">
                          <div className="text-foreground font-medium truncate max-w-xs md:max-w-md lg:max-w-lg mb-1" title={entry.bugTitle}>{entry.bugTitle}</div>
                          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{entry.platform}</div>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase ${SEVERITY_BG[entry.severity]}`}>
                            {entry.severity}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right align-middle">
                          <div className="font-bold text-foreground text-base">
                            {entry.currency} {entry.amount.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-5 py-4 align-middle">
                          <div className="relative inline-block text-left w-full">
                            <button
                              onClick={() => setStatusDropdownId(statusDropdownId === entry.entryId ? null : entry.entryId)}
                              className={`inline-flex w-full min-w[100px] justify-between items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold tracking-wide uppercase cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-sm ${STATUS_BG[entry.status]}`}
                            >
                              {entry.status}
                              <ChevronDown className="h-3 w-3 opacity-70" />
                            </button>
                            {statusDropdownId === entry.entryId && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setStatusDropdownId(null)}
                                />
                                <div className="absolute left-0 top-full mt-2 z-20 w-36 rounded-xl border border-border bg-background/95 backdrop-blur-md shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                                  {STATUSES.map((s) => (
                                    <button
                                      key={s}
                                      onClick={() => handleInlineStatusChange(entry, s)}
                                      className={`w-full flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-wider font-bold transition-all hover:bg-secondary hover:pl-5 ${entry.status === s ? "text-foreground bg-primary/5" : "text-muted-foreground"
                                        }`}
                                    >
                                      <span className={`h-2 w-2 rounded-full flex-shrink-0 shadow-sm ${s === "Paid" ? "bg-green-500 shadow-green-500/50" : s === "Approved" ? "bg-blue-500 shadow-blue-500/50" : "bg-yellow-500 shadow-yellow-500/50"
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
                        <td className="px-5 py-4 text-sm font-medium text-muted-foreground align-middle whitespace-nowrap">
                          {entry.reportDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(entry)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary hover:shadow-sm transition-all" title="Edit Entry">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => setDeleteTarget(entry)} className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 hover:shadow-sm transition-all" title="Delete Entry">
                              <Trash2 className="h-4 w-4" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-8 py-6 border-b border-border/40 bg-muted/10">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">
                  {editEntry ? "Edit Bounty Entry" : "Add Bounty Entry"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 font-medium">Log the details of your successful hunt.</p>
              </div>
              <button onClick={() => { setShowModal(false); setEditEntry(null); }} className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
              <div className="grid sm:grid-cols-2 gap-5 border-b border-border/40 pb-6">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Company Name *</label>
                  <input required value={form.companyName} onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                    placeholder="e.g. Google"
                    className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Platform</label>
                  <div className="relative group">
                    <select value={form.platform} onChange={(e) => setForm((p) => ({ ...p, platform: e.target.value }))}
                      className="appearance-none w-full rounded-xl border border-input bg-background/50 px-4 pr-10 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow cursor-pointer">
                      {PLATFORMS.map((pl) => <option key={pl} value={pl}>{pl}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </div>

              <div className="border-b border-border/40 pb-6">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Bug Title *</label>
                <input required value={form.bugTitle} onChange={(e) => setForm((p) => ({ ...p, bugTitle: e.target.value }))}
                  placeholder="e.g. Stored XSS in user profile leading to account takeover"
                  className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" />
              </div>

              <div className="grid sm:grid-cols-2 gap-5 border-b border-border/40 pb-6">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Severity</label>
                  <div className="relative group">
                    <select value={form.severity} onChange={(e) => setForm((p) => ({ ...p, severity: e.target.value as BountySeverity }))}
                      className="appearance-none w-full rounded-xl border border-input bg-background/50 px-4 pr-10 py-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow cursor-pointer">
                      {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Status</label>
                  <div className="relative group">
                    <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as BountyStatus }))}
                      className="appearance-none w-full rounded-xl border border-input bg-background/50 px-4 pr-10 py-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow cursor-pointer">
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5 border-b border-border/40 pb-6">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Amount *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">{form.currency === 'USD' ? '$' : form.currency === 'EUR' ? '€' : form.currency === 'GBP' ? '£' : form.currency === 'INR' ? '₹' : form.currency}</span>
                    <input required type="number" min={0.01} step={0.01}
                      value={form.amount || ""} onChange={(e) => setForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-input bg-background/50 pl-10 pr-4 py-3 text-sm font-extrabold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Currency</label>
                  <div className="relative group">
                    <select value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value as BountyCurrency }))}
                      className="appearance-none w-full rounded-xl border border-input bg-background/50 px-4 pr-10 py-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow cursor-pointer">
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-5 border-b border-border/40 pb-6">
                {[
                  { label: "Report Date", key: "reportDate", required: true, val: form.reportDate, nullable: false },
                  { label: "Approved Date", key: "approvedDate", required: false, val: form.approvedDate, nullable: true },
                  { label: "Paid Date", key: "paidDate", required: false, val: form.paidDate, nullable: true },
                ].map(({ label, key, val, nullable }) => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{label}</label>
                    <input
                      type="date"
                      value={toInputDate(val as Date | null)}
                      onChange={(e) => setForm((p) => ({
                        ...p,
                        [key]: nullable ? fromInputDate(e.target.value) : (fromInputDate(e.target.value) ?? new Date()),
                      }))}
                      className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                    />
                  </div>
                ))}
              </div>

              <div className="pb-4">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Additional Notes</label>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Link to report, reproduction steps, or any other context..."
                  className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-shadow" />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border/40 bg-background sticky bottom-0">
                <button type="button" onClick={() => { setShowModal(false); setEditEntry(null); }}
                  className="rounded-full border border-border px-6 py-3 text-sm font-bold text-foreground hover:bg-secondary transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5 shadow-lg shadow-primary/20 disabled:opacity-60 disabled:hover:translate-y-0 disabled:shadow-none transition-all">
                  {submitting ? "Saving…" : editEntry ? "Update Entry" : "Save Bounty Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
              <div className="mx-auto h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20 shadow-inner">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-3">Delete Entry?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed px-4">
                Are you sure you want to delete the <span className="font-bold text-foreground">{deleteTarget.bugTitle}</span> entry from <span className="font-bold text-foreground">{deleteTarget.companyName}</span>? This action is permanent and cannot be undone.
              </p>
            </div>

            <div className="flex bg-muted/20 border-t border-border/40 p-4 gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-bold text-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete}
                className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-500/20 hover:bg-red-600 hover:-translate-y-0.5 transition-all">
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upgrade Modal ──────────────────────────────────────────────────── */}
      {showUpgrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-background shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center mb-6 shadow-lg shadow-amber-500/30">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-extrabold text-foreground mb-3">Limit Reached</h2>
              <p className="text-sm font-medium text-foreground mb-4">You have used all <span className="font-bold text-amber-500">{FREE_LIMIT} free bounty entries.</span></p>
              <p className="text-sm text-muted-foreground leading-relaxed px-2">
                Upgrade to <strong className="text-amber-500 font-bold">BugSpace Premium</strong> to log an unlimited number of bounties, unlock advanced analytics, and get exclusive access to premium bug programs.
              </p>
            </div>

            <div className="flex bg-muted/10 border-t border-border/40 p-4 gap-3">
              <button onClick={() => setShowUpgrade(false)}
                className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-bold text-foreground hover:bg-secondary transition-colors">
                Maybe Later
              </button>
              <a href={`https://wa.me/919363277862?text=${encodeURIComponent(`Hello, I would like to upgrade to BugSpace Premium.\nMy registered email is: ${firebaseUser?.email ?? "(not logged in)"}\nPlease share the payment details.`)}`}
                className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-bold text-white text-center shadow-lg shadow-amber-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                Upgrade Now
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BountyTracker;
