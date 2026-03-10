import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/ProtectedRoute";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { detectUserRole } from "@/lib/authService";
import { useEffect, useRef, useState } from "react";
import { getLatestUnseenAnnouncement, type Announcement } from "@/lib/announcementService";
import { AnnouncementModal } from "@/components/AnnouncementModal";
import Index from "./pages/Index";
import BrowsePrograms from "./pages/BrowsePrograms";
import PremiumPrograms from "./pages/PremiumPrograms";
import ProgramDetail from "./pages/ProgramDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import BountyTracker from "./pages/BountyTracker";
import ExclusiveBugs from "./pages/ExclusiveBugs";
import ExclusiveBugDetail from "./pages/ExclusiveBugDetail";
import ResearchNotes from "./pages/ResearchNotes";
import EmployerDashboard from "./pages/EmployerDashboard";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Checks for unseen announcements on every protected-page navigation,
 * page refresh, and login — not only at login time.
 *
 * Two separate effects:
 *  1. Auth effect  — tracks the current researcher uid.
 *  2. Check effect — re-runs on every route change to fetch the latest
 *     unseen announcement.  Uses an in-session dismissed-IDs ref so a
 *     popup that was already acknowledged never re-appears, and a
 *     `checking` flag prevents overlapping Firestore reads.
 */
function AnnouncementWrapper() {
  const [uid, setUid] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const location = useLocation();
  // In-session cache: IDs dismissed by the user this page session
  const dismissedThisSession = useRef(new Set<string>());
  // Prevent concurrent Firestore fetches
  const checking = useRef(false);
  // Mirror of announcement state as a ref so the check effect can read it
  // without adding `announcement` to its dependency array (avoids re-fetching
  // immediately after every dismiss).
  const showingPopup = useRef(false);

  useEffect(() => {
    showingPopup.current = !!announcement;
  }, [announcement]);

  // Effect 1 — track auth state and set uid for researcher accounts only.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUid(null);
        setAnnouncement(null);
        dismissedThisSession.current.clear();
        return;
      }
      try {
        const role = await detectUserRole(fbUser.email);
        setUid(role === "user" ? fbUser.uid : null);
      } catch {
        setUid(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Effect 2 — check for unseen announcements on every route change.
  // Triggers on: login, page refresh, dashboard load, any protected page load.
  useEffect(() => {
    if (!uid || showingPopup.current || checking.current) return;
    checking.current = true;
    getLatestUnseenAnnouncement(uid)
      .then((ann) => {
        if (ann && !dismissedThisSession.current.has(ann.id)) {
          setAnnouncement(ann);
        }
      })
      .catch((err) => console.warn("[AnnouncementWrapper]", err))
      .finally(() => {
        checking.current = false;
      });
  }, [uid, location.pathname]); // re-run on every page navigation

  if (!uid || !announcement) return null;

  return (
    <AnnouncementModal
      announcement={announcement}
      uid={uid}
      onDismiss={() => {
        dismissedThisSession.current.add(announcement.id);
        setAnnouncement(null);
      }}
    />
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="dark">
            <AnnouncementWrapper />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/browse" element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <BrowsePrograms />
                </ProtectedRoute>
              } />
              <Route path="/premium" element={<PremiumPrograms />} />
              <Route path="/program/:id" element={<ProgramDetail />} />
              
              {/* Auth routes - only accessible when not logged in */}
              <Route path="/login" element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              } />
              <Route path="/register" element={
                <PublicOnlyRoute>
                  <Register />
                </PublicOnlyRoute>
              } />
              {/* /signup is the referral link entry point — same page as /register */}
              <Route path="/signup" element={
                <PublicOnlyRoute>
                  <Register />
                </PublicOnlyRoute>
              } />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              
              {/* Protected routes - require authentication */}
              <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <Dashboard />
                </ProtectedRoute>
              } />

              {/* Bounty Tracker - researcher reward tracking */}
              <Route path="/bounty-tracker" element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <BountyTracker />
                </ProtectedRoute>
              } />

              {/* Exclusive Bugs - premium vulnerability insights */}
              <Route path="/exclusive-bugs" element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <ExclusiveBugs />
                </ProtectedRoute>
              } />
              <Route path="/exclusive-bugs/:bugId" element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <ExclusiveBugDetail />
                </ProtectedRoute>
              } />

              {/* Research Notes - free note-taking for researchers */}
              <Route path="/notes" element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <ResearchNotes />
                </ProtectedRoute>
              } />

              {/* Employer routes - require employer role */}
              <Route path="/employer" element={
                <ProtectedRoute allowedRoles={["employer"]}>
                  <EmployerDashboard />
                </ProtectedRoute>
              } />
              
              {/* Admin routes - require admin role */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminPanel />
                </ProtectedRoute>
              } />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
