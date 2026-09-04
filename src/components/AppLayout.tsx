import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogOut, Sun, Moon } from "lucide-react";

type Item = { to: string; label: string; end?: boolean };

export const menu: Item[] = [
  { to: "/", label: "Balcão", end: true },
  { to: "/pecas", label: "Peças" },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nav = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    nav("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="no-print sticky top-0 z-40 bg-background border-b border-border">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center gap-6">
          <span className="font-display text-base text-primary shrink-0">Abrantes</span>

          <nav className="flex items-center gap-1">
            {menu.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sair">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
};

export default AppLayout;
