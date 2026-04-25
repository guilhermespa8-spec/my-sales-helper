import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Products from "./pages/Products";
import QuoteNew from "./pages/QuoteNew";
import QuoteDetail from "./pages/QuoteDetail";
import Mechanics from "./pages/Mechanics";
import Fiado from "./pages/Fiado";
import Cars from "./pages/Cars";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const Protected = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute><AppLayout>{children}</AppLayout></ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Protected><Index /></Protected>} />
            <Route path="/produtos" element={<Protected><Products /></Protected>} />
            <Route path="/orcamentos/novo" element={<Protected><QuoteNew /></Protected>} />
            <Route path="/orcamentos/:id/editar" element={<Protected><QuoteNew /></Protected>} />
            <Route path="/orcamentos/:id" element={<Protected><QuoteDetail /></Protected>} />
            <Route path="/mecanicos" element={<Protected><Mechanics /></Protected>} />
            <Route path="/fiado" element={<Protected><Fiado /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
