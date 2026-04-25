import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Receipt, Package, FileText, LogOut, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const links = [
  { to: "/", label: "Orçamentos", icon: FileText, end: true },
  { to: "/produtos", label: "Produtos", icon: Package },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="no-print border-b bg-card sticky top-0 z-30">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
                <Receipt className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-bold text-lg text-primary">VendaPro</span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {links.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}>
                  <Icon className="w-4 h-4" /> {label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-[180px]">{user?.email}</span>
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); nav("/auth"); }}>
              <LogOut className="w-4 h-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
        <nav className="md:hidden border-t flex">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex-1 flex items-center justify-center gap-2 py-2 text-sm ${
                  isActive ? "text-accent font-semibold" : "text-muted-foreground"
                }`}>
              <Icon className="w-4 h-4" /> {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 container py-6">{children}</main>
    </div>
  );
};

export default AppLayout;
