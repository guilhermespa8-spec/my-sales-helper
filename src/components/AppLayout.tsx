import { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Gauge,
  ScanBarcode,
  Boxes,
  ReceiptText,
  Banknote,
  SlidersHorizontal,
  LogOut,
  Sun,
  Moon,
} from "lucide-react";

type Item = {
  to: string;
  label: string;
  code: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
};

export const menu: Item[] = [
  { to: "/", label: "Balcão", code: "01", icon: ScanBarcode, end: true },
  { to: "/pecas", label: "Peças", code: "02", icon: Boxes },
];


const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nav = useNavigate();
  const location = useLocation();

  const isActive = (item: Item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);

  const current = menu.find(isActive);

  const handleSignOut = async () => {
    await signOut();
    nav("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Rail lateral — desktop */}
      <aside className="no-print hidden md:flex fixed left-0 top-0 bottom-0 z-50 w-[84px] flex-col bg-sidebar border-r border-sidebar-border">
        <div className="h-16 flex items-center justify-center border-b border-sidebar-border">
          <span className="font-display text-xl leading-none text-sidebar-primary">AB</span>
        </div>
        <nav className="flex-1 py-2">
          {menu.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 py-4 transition-colors",
                  active
                    ? "text-sidebar-primary bg-sidebar-accent"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-0 h-full w-[3px] bg-sidebar-primary" aria-hidden />
                )}
                <Icon className="w-5 h-5" />
                <span className="text-[9px] uppercase tracking-[0.16em] font-semibold">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
        <div className="p-2 border-t border-sidebar-border">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex flex-col items-center gap-1 py-3 text-sidebar-foreground/60 hover:text-destructive transition-colors"
            aria-label="Sair"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[9px] uppercase tracking-[0.16em] font-semibold">Sair</span>
          </button>
        </div>
      </aside>

      <div className="md:pl-[84px]">
        {/* Barra superior */}
        <header className="no-print sticky top-0 z-40 h-16 bg-background border-b border-border">
          <div className="h-full px-4 sm:px-8 flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-3 min-w-0">
              <span className="md:hidden font-display text-lg text-primary">AB</span>
              <span className="rule-label text-primary hidden sm:inline">
                {current?.code ?? "00"}
              </span>
              <span className="stripe-title text-lg leading-none truncate">
                {current?.label ?? "Abrantes"}
              </span>
              <span className="hidden lg:inline rule-label">Abrantes Auto Peças</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden md:block rule-label normal-case tracking-normal max-w-[200px] truncate">
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
                className="md:hidden"
                onClick={handleSignOut}
                aria-label="Sair"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 sm:px-8 py-8 pb-28 md:pb-12 max-w-[1600px]">{children}</main>
      </div>

      {/* Barra inferior — mobile */}
      <nav className="md:hidden no-print fixed bottom-0 inset-x-0 z-50 bg-sidebar border-t border-sidebar-border grid grid-cols-6">
        {menu.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5",
                active ? "text-sidebar-primary" : "text-sidebar-foreground/60"
              )}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="text-[9px] uppercase tracking-[0.12em] font-semibold">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default AppLayout;
