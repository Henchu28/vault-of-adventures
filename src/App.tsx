import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Characters from "./pages/Characters";
import Campaigns from "./pages/Campaigns";
import Gallery from "./pages/Gallery";
import Music from "./pages/Music";
import Notes from "./pages/Notes";
import Settings from "./pages/Settings";
import Ficha from "./pages/Ficha";
import Combat from "./pages/Combat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
              <Route path="/" element={
                <ProtectedRoute><Layout><Index /></Layout></ProtectedRoute>
              } />
              <Route path="/characters" element={
                <ProtectedRoute><Layout><Characters /></Layout></ProtectedRoute>
              } />
              <Route path="/campaigns" element={
                <ProtectedRoute><Layout><Campaigns /></Layout></ProtectedRoute>
              } />
              <Route path="/gallery" element={
                <ProtectedRoute><Layout><Gallery /></Layout></ProtectedRoute>
              } />
              <Route path="/music" element={
                <ProtectedRoute><Layout><Music /></Layout></ProtectedRoute>
              } />
              <Route path="/notes" element={
                <ProtectedRoute requireMaster={true}><Layout><Notes /></Layout></ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>
              } />
              <Route path="/ficha" element={
                <ProtectedRoute><Layout><Ficha /></Layout></ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
