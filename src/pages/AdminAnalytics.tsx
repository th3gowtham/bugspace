import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import {
  Users,
  Activity,
  UserPlus,
  Eye,
  TrendingUp,
  LayoutGrid,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  fetchAnalyticsStats,
  type AnalyticsStats,
} from "@/lib/analyticsService";
import { toast } from "sonner";

// ── Stat card definition ────────────────────────────────────────────────────
interface StatCard {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}

// ── Page component ───────────────────────────────────────────────────────────
export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = () => {
    setLoading(true);
    fetchAnalyticsStats()
      .then(setStats)
      .catch(() => toast.error("Failed to load analytics data."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, []);

  const statCards: StatCard[] = stats
    ? [
      {
        title: "Total Users",
        value: stats.totalUsers,
        icon: Users,
        color: "text-primary",
        bg: "bg-primary/10",
      },
      {
        title: "Active Today",
        value: stats.activeToday,
        icon: Activity,
        color: "text-green-500",
        bg: "bg-green-500/10",
      },
      {
        title: "New Users Today",
        value: stats.newUsersToday,
        icon: UserPlus,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
      },
      {
        title: "Visits Today",
        value: stats.visitsToday,
        icon: Eye,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
      },
    ]
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px] pointer-events-none" />
      <div className="absolute top-1/4 left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none opacity-50" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none opacity-40" />

      <Navbar />

      <div className="container flex-1 py-10 relative z-10 animate-in fade-in zoom-in-95 duration-700">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => navigate("/admin")}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Admin Panel
            </button>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium text-foreground">
              Platform Analytics
            </span>
          </div>

          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <h1 className="text-3xl font-extrabold text-foreground mb-8 tracking-tight">
          Platform Analytics
        </h1>

        {/* ── Loading state ── */}
        {loading && (
          <div className="py-20 text-center text-muted-foreground text-sm">
            Loading analytics…
          </div>
        )}

        {/* ── Content ── */}
        {!loading && stats && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {statCards.map((card, index) => (
                <div
                  key={card.title}
                  className="glass-card p-6 flex flex-col justify-between group hover:shadow-lg transition-all relative overflow-hidden animate-in fade-in zoom-in slide-in-from-bottom-2 duration-700"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-colors pointer-events-none" />
                  <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className={`${card.bg} p-2 rounded-lg`}>
                      <card.icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{card.title}</span>
                  </div>
                  <p className="text-4xl font-extrabold text-foreground tracking-tight relative z-10">
                    {card.value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Active This Week banner */}
            <div className="glass-card p-5 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Activity className="h-5 w-5 text-emerald-500 shrink-0" />
                </div>
                <span className="text-base font-medium text-foreground">
                  Active Users This Week
                </span>
                <span className="ml-auto text-2xl font-extrabold text-foreground">
                  {stats.activeThisWeek.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Daily Active Users Chart */}
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Daily Active Users
                </h3>
                <span className="ml-auto text-xs text-muted-foreground">
                  Last 7 days
                </span>
              </div>

              {stats.dailyActiveUsers.every((d) => d.count === 0) ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No activity data yet. Data appears as users navigate pages.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={stats.dailyActiveUsers}
                    margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                      cursor={{ fill: "hsl(var(--secondary))" }}
                    />
                    <Bar
                      dataKey="count"
                      name="Active Users"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Page Visit Distribution Chart */}
            <div className="glass-card p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4">
                <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  Page Visits Distribution
                </h3>
                <span className="ml-auto text-xs text-muted-foreground">
                  Last 7 days
                </span>
              </div>

              {stats.visitsByPage.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No page visit data yet.
                </p>
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={stats.visitsByPage.length * 44 + 24}
                >
                  <BarChart
                    data={stats.visitsByPage}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="hsl(var(--border))"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="page"
                      width={130}
                      tick={{
                        fontSize: 11,
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                      cursor={{ fill: "hsl(var(--secondary))" }}
                    />
                    <Bar
                      dataKey="count"
                      name="Visits"
                      fill="#22c55e"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
