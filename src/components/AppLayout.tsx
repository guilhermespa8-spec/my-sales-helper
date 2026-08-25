import { ReactNode, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  PackageCheck,
  Receipt,
  Wallet,
  BarChart3,
  Wrench,
  Settings,
  LogOut,
  Sun,
  Moon,
  Menu,
  ChevronRight,
} from "lucide-react";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
};

const menu: Item[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/pdv", label: "PDV", icon: ShoppingCart },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/estoque", label: "Estoque", icon: PackageCheck },
  { to: "/vendas", label: "Vendas", icon: Receipt },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/ordens", label: "Ordens de Serviço", icon: Wrench },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const location = useLocation();
  return (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <PackageCheck className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sidebar-foreground tracking-tight">Abrantes Auto Peças</span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 scrollbar-thin">
        {menu.map(({ to, label, icon: Icon, end }) => {
          const active = end ? location.pathname === to : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className={cn("w-4 h-4", active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground")} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-4 h-4 opacity-60" />}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    nav("/auth");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-40 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <SidebarContent />
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.email}</p>
              <p className="text-xs text-sidebar-foreground/60">Administrador</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="flex-1 h-9 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="flex-1 h-9 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={handleSignOut}
              aria-label="Sair"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main wrapper */}
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden no-print sticky top-0 z-30 h-16 border-b bg-card/95 backdrop-blur flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <PackageCheck className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground tracking-tight">Abrantes Auto Peças</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Tema">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72 bg-sidebar border-r-sidebar-border">
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
                <div className="p-4 border-t border-sidebar-border">
                  <p className="text-sm font-medium text-sidebar-foreground truncate mb-3">{user?.email}</p>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    onClick={handleSignOut}
                  >
                    <LogOut className="w-4 h-4" /> Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
