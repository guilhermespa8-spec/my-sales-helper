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
} from "lucide-react";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
};

const menu: Item[] = [
  { to: "/", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/pdv", label: "PDV", icon: ShoppingCart },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/estoque", label: "Estoque", icon: PackageCheck },
  { to: "/vendas", label: "Vendas", icon: Receipt },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/ordens", label: "Ordens", icon: Wrench },
  { to: "/configuracoes", label: "Ajustes", icon: Settings },
];

const useActive = () => {
  const location = useLocation();
  return (item: Item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
};

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nav = useNavigate();
  const isActive = useActive();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    nav("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Masthead */}
      <header className="no-print border-b border-border bg-background sticky top-0 z-40">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            <NavLink to="/" className="flex items-baseline gap-3 min-w-0">
              <span className="font-display text-2xl sm:text-3xl leading-none text-foreground truncate">
                Abrantes
              </span>
              <span className="hidden sm:inline rule-label text-primary">Auto Peças</span>
            </NavLink>

            <div className="flex items-center gap-1">
              <span className="hidden md:block rule-label mr-3 max-w-[180px] truncate normal-case tracking-normal">
                {user?.email}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Modo claro" : "Modo escuro"}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex"
                onClick={handleSignOut}
                aria-label="Sair"
              >
                <LogOut className="w-4 h-4" />
              </Button>

              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 p-0">
                  <div className="px-5 h-16 flex items-center border-b border-border">
                    <span className="font-display text-2xl">Abrantes</span>
                  </div>
                  <nav className="p-3 space-y-0.5">
                    {menu.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-3 text-sm font-medium border-l-2 transition-colors",
                            isActive(item)
                              ? "border-primary text-primary bg-secondary"
                              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </NavLink>
                      );
                    })}
                  </nav>
                  <div className="p-3 border-t border-border">
                    <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4" /> Sair
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Tabs desktop */}
        <div className="hidden md:block border-t border-border">
          <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-8">
            <nav className="flex items-center gap-7 overflow-x-auto scrollbar-thin">
              {menu.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={cn(
                    "relative py-3 text-[13px] uppercase tracking-[0.14em] font-semibold whitespace-nowrap transition-colors",
                    isActive(item)
                      ? "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-8 pb-24 md:pb-12">
        {children}
      </main>

      {/* Bottom bar mobile */}
      <nav className="md:hidden no-print fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background grid grid-cols-5">
        {menu.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] uppercase tracking-wider font-semibold",
                isActive(item) ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default AppLayout;
