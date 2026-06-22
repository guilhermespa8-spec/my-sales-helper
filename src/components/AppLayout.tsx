import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Package, FileText, LogOut, Moon, Sun, Receipt } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; end?: boolean };

const menu: Item[] = [
  { to: "/", label: "Orçamentos", icon: FileText, end: true },
  { to: "/produtos", label: "Produtos", icon: Package },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top header */}
      <header className="no-print border-b bg-card/95 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center justify-between h-16 px-4 md:px-8 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm"
              style={{ background: "var(--gradient-accent)" }}
            >
              <Receipt className="w-5 h-5 text-accent-foreground" />
            </div>
            <span className="font-bold text-base md:text-lg text-foreground tracking-tight">
              Abrantes Auto Peças
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {menu.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1 md:gap-2">
            <span className="hidden lg:block text-sm text-muted-foreground truncate max-w-[180px]">
              {user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => { await signOut(); nav("/auth"); }}
              aria-label="Sair"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t">
        <div className="grid grid-cols-2">
          {menu.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
