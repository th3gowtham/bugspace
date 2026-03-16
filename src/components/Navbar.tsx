import { Link, useLocation, useNavigate } from "react-router-dom";
import { Shield, Menu, X, LogOut, User, ChevronDown, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { signOut } from "@/lib/authService";
import { getRedirectPath } from "@/lib/authService";
import { useTheme } from "@/contexts/ThemeContext";
import logoImg from "@/assets/logo.png";

export function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

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
        <Link to="/" className="flex items-center gap-2 group transition-transform hover:scale-105">
          <img src={logoImg} alt="BugSpace Logo" className="h-10 w-auto transition-transform group-hover:scale-110 dark:invert" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/browse"
            className={cn(
              "text-sm font-medium transition-all duration-300 hover:text-foreground relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full",
              location.pathname === "/browse" ? "text-foreground after:w-full" : "text-muted-foreground"
            )}
          >
            Browse Programs
          </Link>
          <Link
            to="/premium"
            className={cn(
              "text-sm font-medium transition-all duration-300 hover:text-foreground flex items-center gap-1 group relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-amber-500 after:transition-all after:duration-300 hover:after:w-full",
              location.pathname === "/premium" ? "text-foreground after:w-full" : "text-muted-foreground"
            )}
          >
            <span className="text-amber-500 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12"></span>
            Premium
          </Link>
          {user && (
            <Link
              to={getDashboardLink()}
              className={cn(
                "text-sm font-medium transition-all duration-300 hover:text-foreground relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full",
                location.pathname === getDashboardLink() ? "text-foreground after:w-full" : "text-muted-foreground"
              )}
            >
              Dashboard
            </Link>
          )}
          {user && role === "user" && (
            <Link
              to="/notes"
              className={cn(
                "text-sm font-medium transition-all duration-300 hover:text-foreground relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full",
                location.pathname === "/notes" ? "text-foreground after:w-full" : "text-muted-foreground"
              )}
            >
              Notes
            </Link>
          )}
          {user && role === "user" && (
            <Link
              to="/bounty-tracker"
              className={cn(
                "text-sm font-medium transition-all duration-300 hover:text-foreground flex items-center gap-1 group relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-amber-500 after:transition-all after:duration-300 hover:after:w-full",
                location.pathname === "/bounty-tracker" ? "text-foreground after:w-full" : "text-muted-foreground"
              )}
            >
              <span className="text-amber-500 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12"></span>
              Bounty Tracker
            </Link>
          )}
          {user && role === "user" && (
            <Link
              to="/exclusive-bugs"
              className={cn(
                "text-sm font-medium transition-all duration-300 hover:text-foreground flex items-center gap-1 group relative after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-0 after:bg-amber-500 after:transition-all after:duration-300 hover:after:w-full",
                location.pathname === "/exclusive-bugs" ? "text-foreground after:w-full" : "text-muted-foreground"
              )}
            >
              <span className="text-amber-500 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12"></span>
              Exclusive Bugs
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {loading ? (
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted transition-all duration-200 active:scale-95 group"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground">
                    {user.userData?.fullName || user.email}
                  </span>
                  <span className="text-xs text-muted-foreground">{getRoleLabel()}</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", dropdownOpen && "rotate-180")} />
              </button>

              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border/50 bg-card/95 backdrop-blur shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <Link
                      to={getDashboardLink()}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors group"
                    >
                      <User className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:text-primary" />
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full group"
                    >
                      <LogOut className="h-4 w-4 transition-transform group-hover:scale-110 group-hover:-translate-x-0.5" />
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
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-105"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
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
        <div className="md:hidden absolute top-full right-2 top-15 rounded-[10px] border-b border-border bg-background/95 backdrop-blur-md p-8 space-y-4 animate-in slide-in-from-top-4 fade-in duration-300 shadow-xl z-50">
          <Link
            to="/browse"
            onClick={() => setMobileOpen(false)}
            className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Browse Programs
          </Link>
          <Link
            to="/premium"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-amber-500">★</span>
            Premium
          </Link>
          {user && (
            <Link
              to={getDashboardLink()}
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Dashboard
            </Link>
          )}
          {user && role === "user" && (
            <Link
              to="/notes"
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Notes
            </Link>
          )}
          {user && role === "user" && (
            <Link
              to="/bounty-tracker"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="text-amber-500">★</span>
              Bounty Tracker
            </Link>
          )}
          {user && role === "user" && (
            <Link
              to="/exclusive-bugs"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="text-amber-500">★</span>
              Exclusive Bugs
            </Link>
          )}
          {/* Mobile theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {theme === "dark" ? (
              <><Sun className="h-4 w-4" /> Light Mode</>
            ) : (
              <><Moon className="h-4 w-4" /> Dark Mode</>
            )}
          </button>

          <div className="pt-4 mt-2 border-t border-border space-y-3">
            {user ? (
              <>
                <div className="flex items-center gap-3 px-2 py-1.5 bg-secondary/30 rounded-lg">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {user.userData?.fullName || user.email}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">{getRoleLabel()}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    handleSignOut();
                  }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive w-full px-2 py-1.5 rounded-lg transition-colors border border-transparent hover:border-destructive/20 hover:bg-destructive/5"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center py-2 text-sm font-semibold text-foreground border border-border rounded-xl transition-colors hover:bg-secondary"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center py-2 text-sm font-bold text-primary-foreground bg-primary rounded-xl transition-colors hover:bg-primary/90 shadow-md"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
