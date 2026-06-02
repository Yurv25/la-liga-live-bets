import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect } from "react";
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

const queryClient = new QueryClient();

function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useTheme(); // bootstrap time-based theme on app load

  useEffect(() => {
    if (Capacitor.getPlatform() === "web") return;

    const navigateToGroup = (url?: string) => {
      if (!url) return;

      try {
        const incomingUrl = new URL(url);
        const path = incomingUrl.pathname;

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
        navigateToGroup(launchUrl?.url);
      } catch {
        // ignore if launch URL cannot be retrieved
      }

      try {
        const listener = await CapacitorApp.addListener("appUrlOpen", (event) => {
          navigateToGroup(event.url);
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
    <>
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
    </>
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
