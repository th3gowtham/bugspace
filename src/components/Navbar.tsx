import { Link, useLocation, useNavigate } from "react-router-dom";
import { Shield, Menu, X, LogOut, User, Settings, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/authService";
import { getRedirectPath } from "@/lib/authService";

export function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getRoleLabel = () => {
    switch (role) {
      case "admin":
        return "Admin";
      case "employer":
        return "Employer";
      default:
        return "Researcher";
    }
  };

  const getDashboardLink = () => {
    return getRedirectPath(role);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
          <Shield className="h-5 w-5 text-primary" />
          BugSpace
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/browse"
            className={cn(
              "text-sm font-medium transition-colors hover:text-foreground",
              location.pathname === "/browse" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            Browse Programs
          </Link>
          <Link
            to="/premium"
            className={cn(
              "text-sm font-medium transition-colors hover:text-foreground flex items-center gap-1",
              location.pathname === "/premium" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <span className="text-amber-500">★</span>
            Premium
          </Link>
          {user && (
            <Link
              to={getDashboardLink()}
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground",
                location.pathname === getDashboardLink() ? "text-foreground" : "text-muted-foreground"
              )}
            >
              Dashboard
            </Link>
          )}
          {user && role === "user" && (
            <Link
              to="/bounty-tracker"
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground flex items-center gap-1",
                location.pathname === "/bounty-tracker" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="text-amber-500">★</span>
              Bounty Tracker
            </Link>
          )}
          {user && role === "user" && (
            <Link
              to="/exclusive-bugs"
              className={cn(
                "text-sm font-medium transition-colors hover:text-foreground flex items-center gap-1",
                location.pathname === "/exclusive-bugs" ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="text-amber-500">★</span>
              Exclusive Bugs
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground">
                    {user.userData?.fullName || user.email}
                  </span>
                  <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {dropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-border bg-card shadow-lg z-20">
                    <Link
                      to={getDashboardLink()}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <User className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground w-full"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-muted-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-3 animate-fade-in">
          <Link
            to="/browse"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Browse Programs
          </Link>
          <Link
            to="/premium"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <span className="text-amber-500">★</span>
            Premium
          </Link>
          {user && (
            <Link
              to={getDashboardLink()}
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Dashboard
            </Link>
          )}
          {user && role === "user" && (
            <Link
              to="/bounty-tracker"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <span className="text-amber-500">★</span>
              Bounty Tracker
            </Link>
          )}
          {user && role === "user" && (
            <Link
              to="/exclusive-bugs"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <span className="text-amber-500">★</span>
              Exclusive Bugs
            </Link>
          )}
          <div className="pt-3 border-t border-border space-y-2">
            {user ? (
              <>
                <div className="flex items-center gap-2 px-2 py-1">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {user.userData?.fullName || user.email}
                    </span>
                    <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="block text-sm text-muted-foreground">Sign In</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="block text-sm font-medium text-primary">Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
