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
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <div className="container flex-1 py-8">
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

        <h1 className="text-2xl font-bold text-foreground mb-6">
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
              {statCards.map((card) => (
                <div key={card.title} className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`${card.bg} p-1.5 rounded-md`}>
                      <card.icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {card.title}
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {card.value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Active This Week banner */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Active Users This Week
                </span>
                <span className="ml-auto text-xl font-bold text-foreground">
                  {stats.activeThisWeek.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Daily Active Users Chart */}
            <div className="glass-card p-5">
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
            <div className="glass-card p-5">
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
