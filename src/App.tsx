import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import BrowsePrograms from "./pages/BrowsePrograms";
import PremiumPrograms from "./pages/PremiumPrograms";
import ProgramDetail from "./pages/ProgramDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import BountyTracker from "./pages/BountyTracker";
import EmployerDashboard from "./pages/EmployerDashboard";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="dark">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/browse" element={<BrowsePrograms />} />
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
