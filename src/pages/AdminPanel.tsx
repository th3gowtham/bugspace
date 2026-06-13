import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { StatusBadge } from "@/components/Badges";
import { Shield, Users, BarChart3, Star, Trash2, MinusCircle, Search, DollarSign, TrendingUp, GitBranch, Megaphone, Plus, Pencil, ToggleLeft, ToggleRight, Activity, Mail } from "lucide-react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  fetchEmailCampaigns,
  getCampaignSummaryStats,
  type EmailCampaignRecord,
  type CampaignSummaryStats,
} from "@/lib/emailCampaignService";
import {
  fetchAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type Announcement,
} from "@/lib/announcementService";
import {
  fetchAllPremiumUsers,
  fetchAllUsers,
  fetchReferralPremiumUsers,
  assignPremiumUser,
  updatePremiumUser,
  removePremiumUser,
  type PremiumUserRecord,
  type ReferralPremiumUser,
  type AppUser,
} from "@/lib/premiumService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// â”€â”€ Analytics helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function last6Months(): { label: string; year: number; month: number }[] {
  const result: { label: string; year: number; month: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ label: MONTH_LABELS[d.getMonth()], year: d.getFullYear(), month: d.getMonth() });
  }
  return result;
}

function groupByMonth(dates: Date[], months: { label: string; year: number; month: number }[]) {
  return months.map(({ label, year, month }) => ({
    label,
    count: dates.filter((d) => d.getFullYear() === year && d.getMonth() === month).length,
  }));
}

// â”€â”€ Local types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface AdminProgram {
  id: string;
  programName: string;
  companyName: string;
  platformType: string;
  isPremium: boolean;
  createdAt: Date;
}

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  createdAt: Date;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SourceBadge({ source }: { source: string }) {
  const configs: Record<string, { label: string; classes: string }> = {
    "admin-granted": { label: "Admin",    classes: "bg-blue-500/15 text-blue-400" },
    "referral":      { label: "Referral", classes: "bg-emerald-500/15 text-emerald-400" },
    "paid":          { label: "Paid",     classes: "bg-amber-500/15 text-amber-400" },
  };
  const cfg = configs[source] ?? { label: source, classes: "bg-secondary text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

const AdminPanel = () => {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("programs");

  // â”€â”€ dashboard stat counts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [totalPrograms,     setTotalPrograms]     = useState<number | null>(null);
  const [activePremiumCount, setActivePremiumCount] = useState<number | null>(null);
  const [totalUsers,        setTotalUsers]        = useState<number | null>(null);

  // â”€â”€ programs tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [adminPrograms,    setAdminPrograms]    = useState<AdminProgram[]>([]);
  const [programsLoading,  setProgramsLoading]  = useState(false);

  // â”€â”€ users tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [adminUsers,   setAdminUsers]   = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userQuery,    setUserQuery]    = useState("");

  // â”€â”€ analytics tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [programDates,    setProgramDates]    = useState<Date[]>([]);
  const [userDates,       setUserDates]       = useState<Date[]>([]);
  const [premiumDates,    setPremiumDates]    = useState<Date[]>([]);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  // â”€â”€ premium tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [premiumUsers,          setPremiumUsers]          = useState<PremiumUserRecord[]>([]);
  const [referralPremiumUsers,  setReferralPremiumUsers]  = useState<ReferralPremiumUser[]>([]);
  const [premiumLoading,        setPremiumLoading]        = useState(false);
  const [allUsers,              setAllUsers]              = useState<AppUser[]>([]);
  const [userSearch,            setUserSearch]            = useState("");
  const [duration,              setDuration]              = useState<"1m" | "2m" | "3m" | "custom">("1m");
  const [customStart,           setCustomStart]           = useState("");
  const [customEnd,             setCustomEnd]             = useState("");
  const [assigning,             setAssigning]             = useState(false);
  const [sourceFilter,          setSourceFilter]          = useState<"all" | "admin" | "referral">("all");

  // -- announcements tab ---------------------------------------------------
  const [announcements,         setAnnouncements]         = useState<Announcement[]>([]);
  const [announcementsLoading,  setAnnouncementsLoading]  = useState(false);
  const [annTitle,              setAnnTitle]              = useState("");
  const [annMessage,            setAnnMessage]            = useState("");
  const [annSaving,             setAnnSaving]             = useState(false);
  const [editingAnn,            setEditingAnn]            = useState<Announcement | null>(null);

  // -- email campaigns tab --------------------------------------------------
  const [emailCampaigns,        setEmailCampaigns]        = useState<EmailCampaignRecord[]>([]);
  const [campaignsLoading,      setCampaignsLoading]      = useState(false);
  const [campaignStats,         setCampaignStats]         = useState<CampaignSummaryStats | null>(null);

  // â”€â”€ load dashboard stats on mount â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const now = new Date();
    getDocs(collection(db, "programs"))
      .then((snap) => setTotalPrograms(snap.size))
      .catch(() => setTotalPrograms(0));

    getDocs(query(collection(db, "premiumUsers"), where("isActive", "==", true)))
      .then((snap) => {
        const active = snap.docs.filter((d) => {
          const end: Date = d.data().endDate?.toDate?.() ?? new Date(0);
          return end >= now;
        });
        setActivePremiumCount(active.length);
      })
      .catch(() => setActivePremiumCount(0));

    getDocs(collection(db, "users"))
      .then((snap) => setTotalUsers(snap.size))
      .catch(() => setTotalUsers(0));
  }, []);

  // â”€â”€ load programs tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (activeTab !== "programs") return;
    setProgramsLoading(true);
    getDocs(query(collection(db, "programs"), orderBy("createdAt", "desc")))
      .then((snap) => {
        setAdminPrograms(snap.docs.map((d) => ({
          id:           d.id,
          programName:  d.data().programName  ?? "â€”",
          companyName:  d.data().companyName  ?? "â€”",
          platformType: d.data().platformType ?? "â€”",
          isPremium:    d.data().isPremium    ?? false,
          createdAt:    d.data().createdAt?.toDate?.() ?? new Date(),
        })));
      })
      .catch(() => toast.error("Failed to load programs."))
      .finally(() => setProgramsLoading(false));
  }, [activeTab]);

  // â”€â”€ load users tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (activeTab !== "users") return;
    setUsersLoading(true);
    getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")))
      .then((snap) => {
        setAdminUsers(snap.docs.map((d) => ({
          id:        d.id,
          fullName:  d.data().fullName  ?? "â€”",
          email:     d.data().email     ?? "â€”",
          createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
        })));
      })
      .catch(() => toast.error("Failed to load users."))
      .finally(() => setUsersLoading(false));
  }, [activeTab]);

  // â”€â”€ load analytics tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (activeTab !== "analytics" || analyticsLoaded) return;
    Promise.all([
      getDocs(collection(db, "programs")),
      getDocs(collection(db, "users")),
      getDocs(collection(db, "premiumUsers")),
    ]).then(([pSnap, uSnap, prSnap]) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toDate = (v: any): Date => v?.toDate?.() ?? new Date();
      setProgramDates(pSnap.docs.map((d)  => toDate(d.data().createdAt)));
      setUserDates(uSnap.docs.map((d)    => toDate(d.data().createdAt)));
      setPremiumDates(prSnap.docs.map((d) => toDate(d.data().createdAt)));
      setAnalyticsLoaded(true);
    }).catch(() => {});
  }, [activeTab, analyticsLoaded]);

  // -- load announcements tab -----------------------------------------------
  const loadAnnouncements = () => {
    setAnnouncementsLoading(true);
    fetchAllAnnouncements()
      .then(setAnnouncements)
      .catch(() => toast.error("Failed to load announcements."))
      .finally(() => setAnnouncementsLoading(false));
  };

  useEffect(() => {
    if (activeTab === "announcements") loadAnnouncements();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleSaveAnnouncement = async () => {
    if (!annTitle.trim() || !annMessage.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    setAnnSaving(true);
    try {
      if (editingAnn) {
        await updateAnnouncement(editingAnn.id, { title: annTitle.trim(), message: annMessage.trim() });
        toast.success("Announcement updated.");
      } else {
        await createAnnouncement(annTitle.trim(), annMessage.trim());
        toast.success("Announcement created and sent to all researchers.");
      }
      setAnnTitle("");
      setAnnMessage("");
      setEditingAnn(null);
      loadAnnouncements();
    } catch {
      toast.error("Failed to save announcement.");
    } finally {
      setAnnSaving(false);
    }
  };

  const handleEditAnnouncement = (ann: Announcement) => {
    setEditingAnn(ann);
    setAnnTitle(ann.title);
    setAnnMessage(ann.message);
  };

  const handleCancelEdit = () => {
    setEditingAnn(null);
    setAnnTitle("");
    setAnnMessage("");
  };

  const handleToggleAnnouncement = async (ann: Announcement) => {
    try {
      await updateAnnouncement(ann.id, { active: !ann.active });
      toast.success(`Announcement ${ann.active ? "disabled" : "enabled"}.`);
      loadAnnouncements();
    } catch {
      toast.error("Failed to update announcement status.");
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      toast.success("Announcement deleted.");
      loadAnnouncements();
    } catch {
      toast.error("Failed to delete announcement.");
    }
  };

  // â”€â”€ load premium tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadPremiumUsers = () => {
    setPremiumLoading(true);
    Promise.all([
      fetchAllPremiumUsers(),
      fetchReferralPremiumUsers(),
    ])
      .then(([pu, rpu]) => {
        setPremiumUsers(pu);
        setReferralPremiumUsers(rpu);
      })
      .catch(() => toast.error("Failed to load premium users."))
      .finally(() => setPremiumLoading(false));
  };

  useEffect(() => {
    if (activeTab === "premium") {
      loadPremiumUsers();
      fetchAllUsers().then(setAllUsers).catch(() => {});
    }
  }, [activeTab]);

  const filteredPremiumSearch = allUsers.filter(
    (u) =>
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.fullName.toLowerCase().includes(userSearch.toLowerCase())
  );

  const computeDates = (): { start: Date; end: Date } | null => {
    const start = new Date();
    if (duration === "1m") { const e = new Date(start); e.setMonth(e.getMonth() + 1); return { start, end: e }; }
    if (duration === "2m") { const e = new Date(start); e.setMonth(e.getMonth() + 2); return { start, end: e }; }
    if (duration === "3m") { const e = new Date(start); e.setMonth(e.getMonth() + 3); return { start, end: e }; }
    if (duration === "custom") {
      if (!customStart || !customEnd) return null;
      return { start: new Date(customStart), end: new Date(customEnd) };
    }
    return null;
  };

  const handleAssign = async (user: AppUser) => {
    if (!firebaseUser) return;
    const dates = computeDates();
    if (!dates) { toast.error("Please select valid start and end dates."); return; }
    setAssigning(true);
    try {
      await assignPremiumUser(user.uid, user.email, dates.start, dates.end, firebaseUser.uid);
      toast.success(`Premium access assigned to ${user.email}.`);
      setUserSearch("");
      loadPremiumUsers();
    } catch {
      toast.error("Failed to assign premium access.");
    } finally {
      setAssigning(false);
    }
  };

  const handleDeactivate = async (uid: string) => {
    try {
      await updatePremiumUser(uid, { isActive: false });
      toast.success("Premium access deactivated.");
      loadPremiumUsers();
    } catch { toast.error("Failed to deactivate."); }
  };

  const handleRemove = async (uid: string) => {
    try {
      await removePremiumUser(uid);
      toast.success("Premium access removed.");
      loadPremiumUsers();
    } catch { toast.error("Failed to remove."); }
  };

  // â”€â”€ derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const months = last6Months();
  const programGrowth = groupByMonth(programDates, months);
  const userGrowth    = groupByMonth(userDates,    months);
  const premiumGrowth = groupByMonth(premiumDates, months);

  const filteredAdminUsers = adminUsers.filter(
    (u) =>
      u.email.toLowerCase().includes(userQuery.toLowerCase()) ||
      u.fullName.toLowerCase().includes(userQuery.toLowerCase())
  );

  const dynamicStats = [
    { label: "Total Programs",  value: totalPrograms      === null ? "â€¦" : String(totalPrograms),      icon: Shield },
    { label: "Premium Users",   value: activePremiumCount === null ? "â€¦" : String(activePremiumCount), icon: Star },
    { label: "Active Users",    value: totalUsers         === null ? "â€¦" : String(totalUsers),         icon: Users },
    { label: "Revenue",         value: "$0",                                                           icon: DollarSign },
  ];

  const sidebarItems = [
    { id: "programs",           label: "All Programs",       icon: Shield,    href: undefined },
    { id: "users",              label: "Users",              icon: Users,     href: undefined },
    { id: "analytics",          label: "Analytics",          icon: BarChart3, href: undefined },
    { id: "premium",            label: "Premium Users",      icon: Star,      href: undefined },
    { id: "email-campaigns",    label: "Email Campaigns",    icon: Mail,      href: undefined },
    { id: "announcements",      label: "Announcements",      icon: Megaphone, href: undefined },
    { id: "promoters",          label: "Promoter Analytics", icon: Users,     href: "/admin/promoters" },
    { id: "platform-analytics", label: "Platform Analytics", icon: Activity,  href: "/admin/analytics" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container flex-1 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Admin Panel</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {dynamicStats.map((stat) => (
            <div key={stat.label} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-8">
          <aside className="hidden md:block w-56 shrink-0 space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => item.href ? navigate(item.href) : setActiveTab(item.id)}
                className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </aside>

          <div className="flex-1 min-w-0">

            {/* â”€â”€ All Programs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {activeTab === "programs" && (
              <div className="glass-card overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">All Programs</h3>
                  {!programsLoading && (
                    <span className="text-xs text-muted-foreground">{adminPrograms.length} total</span>
                  )}
                </div>
                {programsLoading ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">Loadingâ€¦</div>
                ) : adminPrograms.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">No programs found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Program</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Company</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Platform</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminPrograms.map((p) => (
                          <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                            <td className="py-3 px-4 font-medium text-foreground">{p.programName}</td>
                            <td className="py-3 px-4 text-muted-foreground">{p.companyName}</td>
                            <td className="py-3 px-4 text-muted-foreground">{p.platformType}</td>
                            <td className="py-3 px-4">
                              {p.isPremium ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-500">
                                  <Star className="h-2.5 w-2.5" />
                                  Premium
                                </span>
                              ) : (
                                <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                  Public
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground text-xs">
                              {p.createdAt.toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {activeTab === "users" && (
              <div className="space-y-4">
                <div className="glass-card p-4 flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search users by name or emailâ€¦"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {!usersLoading && (
                    <span className="text-sm text-muted-foreground shrink-0">
                      {filteredAdminUsers.length} / {adminUsers.length} users
                    </span>
                  )}
                </div>
                <div className="glass-card overflow-hidden">
                  {usersLoading ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">Loadingâ€¦</div>
                  ) : filteredAdminUsers.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">No users found.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                            <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAdminUsers.map((u) => (
                            <tr key={u.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                              <td className="py-3 px-4 font-medium text-foreground">{u.fullName}</td>
                              <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                              <td className="py-3 px-4 text-muted-foreground text-xs">
                                {u.createdAt.toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* â”€â”€ Analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                {[
                  { title: "Programs Growth",     data: programGrowth, color: "#6366f1" },
                  { title: "User Growth",          data: userGrowth,    color: "#22c55e" },
                  { title: "Premium Users Growth", data: premiumGrowth, color: "#f59e0b" },
                ].map(({ title, data, color }) => (
                  <div key={title} className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                      <span className="ml-auto text-xs text-muted-foreground">Last 6 months</span>
                    </div>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
                          cursor={{ fill: "hsl(var(--secondary))" }}
                        />
                        <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            )}

            {/* â”€â”€ Premium Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {activeTab === "premium" && (
              <div className="space-y-6">
                {/* Assign premium form */}
                <div className="glass-card p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    Assign Premium Access
                  </h3>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Duration</p>
                    <div className="flex flex-wrap gap-2">
                      {(["1m", "2m", "3m"] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => setDuration(d)}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                            duration === d ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-secondary"
                          }`}
                        >
                          {d === "1m" ? "1 Month" : d === "2m" ? "2 Months" : "3 Months"}
                        </button>
                      ))}
                      <button
                        onClick={() => setDuration("custom")}
                        className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          duration === "custom" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        Custom
                      </button>
                    </div>
                    {duration === "custom" && (
                      <div className="flex gap-3 mt-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Start Date</label>
                          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-muted-foreground mb-1">End Date</label>
                          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Search Users</p>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search by name or email…"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  {userSearch.trim() !== "" && (
                    <div className="border border-border rounded-md divide-y divide-border max-h-60 overflow-y-auto">
                      {filteredPremiumSearch.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-muted-foreground">No users found.</p>
                      ) : (
                        filteredPremiumSearch.map((u) => (
                          <div key={u.uid} className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/50 transition-colors">
                            <div>
                              <p className="text-sm font-medium text-foreground">{u.fullName || u.email}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                            <button
                              onClick={() => handleAssign(u)}
                              disabled={assigning}
                              className="rounded-md bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-500 hover:bg-amber-500/25 transition-colors disabled:opacity-60"
                            >
                              {assigning ? "Assigning…" : "Assign Premium"}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Source filter tabs */}
                <div className="flex gap-2">
                  {(["all", "admin", "referral"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setSourceFilter(f)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        sourceFilter === f
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {f === "all" ? "All" : f === "admin" ? "Admin Granted" : "Referral Earned"}
                    </button>
                  ))}
                </div>

                {/* Admin-granted premium table */}
                {(sourceFilter === "all" || sourceFilter === "admin") && (
                  <div className="glass-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-semibold text-foreground">Admin-Granted Premium</h3>
                    </div>
                    {premiumLoading ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
                    ) : premiumUsers.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No admin-granted premium users yet.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Source</th>
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Expires</th>
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                              <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {premiumUsers.map((pu) => (
                              <tr key={pu.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                                <td className="py-3 px-4 text-foreground">{pu.email}</td>
                                <td className="py-3 px-4">
                                  <SourceBadge source={pu.source ?? "admin-granted"} />
                                </td>
                                <td className="py-3 px-4 text-muted-foreground">{pu.endDate.toLocaleDateString()}</td>
                                <td className="py-3 px-4">
                                  <StatusBadge status={pu.isActive && pu.endDate >= new Date() ? "Active" : "Paused"} />
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center justify-end gap-2">
                                    {pu.isActive && (
                                      <button
                                        onClick={() => handleDeactivate(pu.id)}
                                        className="inline-flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <MinusCircle className="h-3.5 w-3.5" />
                                        Deactivate
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleRemove(pu.id)}
                                      className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/25 transition-colors"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Remove
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Referral-earned premium table */}
                {(sourceFilter === "all" || sourceFilter === "referral") && (
                  <div className="glass-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-emerald-500" />
                      <h3 className="text-sm font-semibold text-foreground">Referral-Earned Premium</h3>
                    </div>
                    {premiumLoading ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
                    ) : referralPremiumUsers.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No referral-earned premium users yet.</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Source</th>
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Referrals</th>
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Granted</th>
                              <th className="text-left py-3 px-4 font-medium text-muted-foreground">Expires</th>
                            </tr>
                          </thead>
                          <tbody>
                            {referralPremiumUsers.map((ru) => (
                              <tr key={ru.uid} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                                <td className="py-3 px-4 text-foreground">{ru.email}</td>
                                <td className="py-3 px-4">
                                  <SourceBadge source="referral" />
                                </td>
                                <td className="py-3 px-4 text-muted-foreground">{ru.referralCount}</td>
                                <td className="py-3 px-4 text-muted-foreground">
                                  {ru.premiumGrantedAt ? ru.premiumGrantedAt.toDate().toLocaleDateString() : "—"}
                                </td>
                                <td className="py-3 px-4 text-muted-foreground">
                                  {ru.premiumUntil ? ru.premiumUntil.toDate().toLocaleDateString() : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* -- Announcements ------------------------------------------------ */}
            {activeTab === "announcements" && (
              <div className="space-y-6">
                {/* Create / Edit form */}
                <div className="glass-card p-6 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-primary" />
                    {editingAnn ? "Edit Announcement" : "New Announcement"}
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Title</label>
                    <input
                      type="text"
                      placeholder="Announcement title..."
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Message</label>
                    <textarea
                      placeholder="Write your announcement message..."
                      rows={4}
                      value={annMessage}
                      onChange={(e) => setAnnMessage(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveAnnouncement}
                      disabled={annSaving}
                      className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {annSaving ? "Saving..." : editingAnn ? "Update" : "Publish Announcement"}
                    </button>
                    {editingAnn && (
                      <button
                        onClick={handleCancelEdit}
                        className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Announcements list */}
                <div className="glass-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">All Announcements</h3>
                    {!announcementsLoading && (
                      <span className="text-xs text-muted-foreground">{announcements.length} total</span>
                    )}
                  </div>
                  {announcementsLoading ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
                  ) : announcements.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">No announcements yet.</div>
                  ) : (
                    <div className="divide-y divide-border">
                      {announcements.map((ann) => (
                        <div key={ann.id} className="px-4 py-4 hover:bg-secondary/30 transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-foreground truncate">{ann.title}</p>
                                <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ ann.active ? "bg-emerald-500/15 text-emerald-400" : "bg-secondary text-muted-foreground" }`}>
                                  {ann.active ? "Active" : "Disabled"}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">{ann.message}</p>
                              <p className="text-xs text-muted-foreground/60 mt-1">{ann.createdAt.toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => handleToggleAnnouncement(ann)}
                                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                                title={ann.active ? "Disable" : "Enable"}
                              >
                                {ann.active ? <ToggleRight className="h-3.5 w-3.5 text-emerald-400" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                                {ann.active ? "Disable" : "Enable"}
                              </button>
                              <button
                                onClick={() => handleEditAnnouncement(ann)}
                                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/25 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Email Campaigns ─────────────────────────────────────────── */}
            {activeTab === "email-campaigns" && (
              <EmailCampaignsTab
                campaigns={emailCampaigns}
                campaignsLoading={campaignsLoading}
                stats={campaignStats}
                activePremiumCount={activePremiumCount}
                onLoad={() => {
                  setCampaignsLoading(true);
                  Promise.all([
                    fetchEmailCampaigns(50),
                    getCampaignSummaryStats(),
                  ])
                    .then(([campaigns, stats]) => {
                      setEmailCampaigns(campaigns);
                      setCampaignStats(stats);
                    })
                    .catch(() => {})
                    .finally(() => setCampaignsLoading(false));
                }}
              />
            )}

          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

// ─── Email Campaigns Tab Component ────────────────────────────────────────────

function EmailCampaignsTab({
  campaigns,
  campaignsLoading,
  stats,
  activePremiumCount,
  onLoad,
}: {
  campaigns: EmailCampaignRecord[];
  campaignsLoading: boolean;
  stats: CampaignSummaryStats | null;
  activePremiumCount: number | null;
  onLoad: () => void;
}) {
  useEffect(() => {
    onLoad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statCards = [
    {
      label: "Premium Users",
      value: activePremiumCount === null ? "…" : String(activePremiumCount),
      icon: Star,
      color: "text-amber-500",
    },
    {
      label: "Emails Sent",
      value: stats ? String(stats.totalEmailsSent) : "…",
      icon: Mail,
      color: "text-blue-400",
    },
    {
      label: "Success Rate",
      value: stats ? `${stats.successRate}%` : "…",
      icon: TrendingUp,
      color: "text-emerald-400",
    },
    {
      label: "Last Campaign",
      value: stats?.lastCampaignTime
        ? stats.lastCampaignTime.toLocaleDateString()
        : "Never",
      icon: Activity,
      color: "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-xs text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign History Table */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Mail className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-foreground">Campaign History</h3>
          {!campaignsLoading && (
            <span className="ml-auto text-xs text-muted-foreground">
              {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {campaignsLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="py-10 text-center">
            <Mail className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No email campaigns sent yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Campaigns are logged automatically when a new program is published.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Program</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Recipients</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Sent</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Failed</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Duration</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors">
                    <td className="py-3 px-4 text-muted-foreground text-xs">
                      {c.createdAt.toLocaleDateString()}{" "}
                      <span className="text-muted-foreground/60">
                        {c.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground truncate max-w-[180px]" title={c.programName}>
                      {c.programName}
                    </td>
                    <td className="py-3 px-4">
                      {c.templateType === "premium" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-500">
                          <Star className="h-2.5 w-2.5" />
                          Premium
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-400">
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{c.totalRecipients}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-emerald-400 font-medium">{c.totalSent}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {c.totalFailed > 0 ? (
                        <span className="text-red-400 font-medium">{c.totalFailed}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground text-xs">
                      {c.elapsedSeconds > 0 ? `${c.elapsedSeconds.toFixed(1)}s` : "–"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanel;
