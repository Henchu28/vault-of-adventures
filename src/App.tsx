import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { KeepAlivePages } from "@/components/KeepAlivePages";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Characters from "./pages/Characters";
import Campaigns from "./pages/Campaigns";
import Gallery from "./pages/Gallery";
import Music from "./pages/Music";
import Encyclopedia from "./pages/Encyclopedia";
import Settings from "./pages/Settings";
import Ficha from "./pages/Ficha";
import Combat from "./pages/Combat";
import CurrentStatus from "./pages/CurrentStatus";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const pages = {
  '/': <Index />,
  '/characters': <Characters />,
  '/campaigns': <Campaigns />,
  '/gallery': <Gallery />,
  '/music': <Music />,
  '/encyclopedia': <Encyclopedia />,
  '/settings': <Settings />,
  '/ficha': <Ficha />,
  '/combat': <Combat />,
  '/status': <CurrentStatus />,
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <ThemeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={
                <ProtectedRoute><Layout><KeepAlivePages pages={pages} fallback={<NotFound />} /></Layout></ProtectedRoute>
              } />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
