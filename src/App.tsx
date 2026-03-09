import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import ResearchNotes from "./pages/ResearchNotes";
import EmployerDashboard from "./pages/EmployerDashboard";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Listens directly to Firebase Auth (not through AuthContext) so it fires
 * as soon as auth state is known — no multi-step loading chain involved.
 * Only shows the popup for researcher-role accounts ("user").
 * Fires at most once per uid per app session (ref guard).
 */
function AnnouncementWrapper() {
  const [uid, setUid] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  // Guard: only fetch once per uid per session even in React StrictMode
  const fetchedForUid = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        // User signed out – reset everything so the next login can re-trigger
        fetchedForUid.current = null;
        setUid(null);
        setAnnouncement(null);
        return;
      }

      // Already handled this uid in this session
      if (fetchedForUid.current === fbUser.uid) return;
      fetchedForUid.current = fbUser.uid;

      try {
        // Only show popup for regular researchers (not admins or employers)
        const role = await detectUserRole(fbUser.email);
        if (role !== "user") return;

        setUid(fbUser.uid);

        const ann = await getLatestUnseenAnnouncement(fbUser.uid);
        if (ann) setAnnouncement(ann);
      } catch (err) {
        console.warn("[AnnouncementWrapper] failed to load announcement:", err);
      }
    });

    return () => unsubscribe();
  }, []);

  if (!uid || !announcement) return null;

  return (
    <AnnouncementModal
      announcement={announcement}
      uid={uid}
      onDismiss={() => setAnnouncement(null)}
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
