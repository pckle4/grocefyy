import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Inventory from "@/pages/Inventory";
import Billing from "@/pages/Billing";
import Reports from "@/pages/Reports";
import Restock from "@/pages/Restock";
import SettingsPage from "@/pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/20 mx-auto mb-3 animate-float" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (profile && !profile.is_onboarded) return <Navigate to="/onboarding" replace />;

  return (
    <AppLayout />
  );
}

function AuthRoute() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (user && profile?.is_onboarded) return <Navigate to="/" replace />;
  if (user && profile && !profile.is_onboarded) return <Navigate to="/onboarding" replace />;
  return <Auth />;
}

function OnboardingRoute() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.is_onboarded) return <Navigate to="/" replace />;
  return <Onboarding />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/onboarding" element={<OnboardingRoute />} />
            <Route element={<ProtectedRoutes />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/restock" element={<Restock />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
