import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { lazy, Suspense } from "react";

// Lazy loading components for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Products = lazy(() => import("./pages/Products"));
const QuoteNew = lazy(() => import("./pages/QuoteNew"));
const QuoteDetail = lazy(() => import("./pages/QuoteDetail"));
const Mechanics = lazy(() => import("./pages/Mechanics"));
const Fiado = lazy(() => import("./pages/Fiado"));
const FiadosPagos = lazy(() => import("./pages/FiadosPagos"));
const Cars = lazy(() => import("./pages/Cars"));
const Sellers = lazy(() => import("./pages/Sellers"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Settings = lazy(() => import("./pages/Settings"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

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
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Protected><Index /></Protected>} />
              <Route path="/produtos" element={<Protected><Products /></Protected>} />
              <Route path="/orcamentos/novo" element={<Protected><QuoteNew /></Protected>} />
              <Route path="/orcamentos/:id/editar" element={<Protected><QuoteNew /></Protected>} />
              <Route path="/orcamentos/:id" element={<Protected><QuoteDetail /></Protected>} />
              <Route path="/mecanicos" element={<Protected><Mechanics /></Protected>} />
              <Route path="/fiado" element={<Protected><Fiado /></Protected>} />
              <Route path="/fiados-pagos" element={<Protected><FiadosPagos /></Protected>} />
              <Route path="/carros" element={<Protected><Cars /></Protected>} />
              <Route path="/vendedores" element={<Protected><Sellers /></Protected>} />
              <Route path="/configuracoes" element={<Protected><Settings /></Protected>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
