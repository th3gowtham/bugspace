import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProgramCard } from "@/components/ProgramCard";
import type { ProgramData } from "@/components/ProgramCard";
import { ReferralDashboard } from "@/components/ReferralDashboard";
import { Bookmark, Bell, Settings, Inbox, Users2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchUserBookmarkPrograms } from "@/lib/bookmarkService";
import { toast } from "sonner";

const tabs = [
  { id: "bookmarks", label: "Bookmarked",  icon: Bookmark },
  { id: "updates",   label: "Recent Updates", icon: Bell },
  { id: "referrals", label: "Referrals",    icon: Users2 },
  { id: "settings",  label: "Settings",     icon: Settings },
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("bookmarks");
  const { firebaseUser } = useAuth();

  const [bookmarked, setBookmarked] = useState<ProgramData[]>([]);
  const [bookmarksLoading, setBookmarksLoading] = useState(false);

  useEffect(() => {
    if (!firebaseUser) return;
    setBookmarksLoading(true);
    fetchUserBookmarkPrograms(firebaseUser.uid)
      .then(setBookmarked)
      .catch(() => toast.error("Failed to load bookmarks."))
      .finally(() => setBookmarksLoading(false));
  }, [firebaseUser]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container flex-1 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Dashboard</h1>

        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="hidden md:block w-56 shrink-0 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </aside>

          {/* Mobile tabs */}
          <div className="flex-1 min-w-0">
            <div className="md:hidden flex gap-1 mb-6 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "bookmarks" && (
              <div>
                {bookmarksLoading ? (
                  <p className="text-sm text-muted-foreground py-16 text-center">Loading bookmarks…</p>
                ) : bookmarked.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {bookmarked.map((p) => (
                      <ProgramCard key={p.id} program={p} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Bookmark}
                    title="No bookmarked programs"
                    description="Bookmark programs to track them here."
                  />
                )}
              </div>
            )}

            {activeTab === "updates" && (
              <EmptyState
                icon={Inbox}
                title="No recent updates"
                description="Updates from your bookmarked programs will appear here."
              />
            )}

            {activeTab === "referrals" && <ReferralDashboard />}

            {activeTab === "settings" && (
              <div className="glass-card p-6 max-w-md">
                <h2 className="text-lg font-semibold text-foreground mb-4">Account Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Display Name</label>
                    <input
                      type="text"
                      defaultValue="Researcher"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Email Notifications</label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input type="checkbox" defaultChecked className="accent-primary" />
                      Receive updates on bookmarked programs
                    </label>
                  </div>
                  <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

function EmptyState({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="text-center py-16">
      <Icon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

export default Dashboard;
