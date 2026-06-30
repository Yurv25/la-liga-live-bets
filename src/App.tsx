
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import BottomNav from "@/components/BottomNav";
import RequireAuth from "@/components/RequireAuth";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useTheme } from '@/hooks/useTheme';
import Index from "./pages/Index";
import GroupsList from "./pages/GroupsList";
import CreateGroup from "./pages/CreateGroup";
import GroupPage from "./pages/GroupPage";
import AuthPage from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { supabase } from '@/lib/supabaseClient';

const queryClient = new QueryClient();

function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const platform = Capacitor.getPlatform();
  const topInset = platform === 'web' ? '0px' : platform === 'ios' ? 'env(safe-area-inset-top, 0px)' : '48px';
  const authHandled = useRef(false); // track if auth callback has been handled

  useTheme(); // bootstrap time-based theme on app load

  useEffect(() => {
    if (platform === "web") return;

    const handleDeepLink = async (url?: string) => {
      if (!url) return;

      try {
        const incomingUrl = new URL(url);
        const path = incomingUrl.pathname;
        // Handle Google OAuth callback
        if (path === "/auth/callback" || incomingUrl.hash.includes("access_token")) {
          if (authHandled.current) return; // ADD THIS — ignore if already handled
          authHandled.current = true;      // ADD THIS — mark as handled
          const hashParams = new URLSearchParams(incomingUrl.hash.replace("#", ""));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!error) {
              navigate("/");
            }
          }
          return;
        }

        if (path.startsWith("/group/")) {
          const id = path.split("/")[2];
          if (id) {
            navigate(`/group/${id}`);
          }
        }
      } catch {
        // ignore malformed or unsupported URLs
      }
    };

    let removeListener: (() => void) | undefined;

    const initDeepLinking = async () => {
      try {
        const launchUrl = await CapacitorApp.getLaunchUrl();
        handleDeepLink(launchUrl?.url);
      } catch {
        // ignore if launch URL cannot be retrieved
      }

      try {
        const listener = await CapacitorApp.addListener("appUrlOpen", (event) => {
          handleDeepLink(event.url);
        });
        removeListener = () => listener.remove();
      } catch {
        // ignore listener registration failure
      }
    };

    initDeepLinking();

    return () => {
      removeListener?.();
    };
  }, [navigate]);

  return (
    
    <div>
    {/* Status bar spacer — works on iOS, Android, and web */}
    <div style={{ height: topInset }} className="fixed top-0 left-0 right-0 bg-header z-50" />
    {/* Page content */}
    <div style={{ paddingTop: topInset }}></div>
    <div>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Index />} />
            <Route path="/groups" element={<GroupsList />} />
            <Route path="/create-group" element={<CreateGroup />} />
            <Route path="/group/:id" element={<GroupPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        {user && <BottomNav />}
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
