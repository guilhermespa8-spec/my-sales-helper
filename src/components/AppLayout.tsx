import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  Package,
  FileText,
  LogOut,
  Moon,
  Sun,
  Home,
  DollarSign,
  ClipboardList,
  Users,
  Truck,
  Zap,
  Wrench,
  BarChart3,
  Wallet,
  FileSpreadsheet,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";


type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  disabled?: boolean;
};

const menu: Item[] = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/orcamentos/novo", label: "Orçamento Rápido", icon: Zap },
  { to: "#vendas", label: "Vendas", icon: DollarSign, disabled: true },
  { to: "#cadastros", label: "Cadastros", icon: ClipboardList, disabled: true },
  { to: "/mecanicos", label: "Mecânicos", icon: Wrench },
  { to: "/fiado", label: "Fiado", icon: Wallet },
  { to: "#fornecedores", label: "Fornecedores", icon: Truck, disabled: true },
  { to: "#servicos", label: "Serviços", icon: Wrench, disabled: true },
  { to: "#relatorios", label: "Relatórios", icon: BarChart3, disabled: true },
  { to: "#financeiro", label: "Financeiro", icon: Wallet, disabled: true },
  { to: "#notas", label: "Notas Fiscais", icon: FileSpreadsheet, disabled: true },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nav = useNavigate();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="no-print sticky top-0 h-screen w-20 shrink-0 border-r bg-card flex flex-col z-30">
        <div className="flex items-center justify-center h-16 border-b">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Receipt className="w-5 h-5 text-accent-foreground" />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {menu.map(({ to, label, icon: Icon, end, disabled }) =>
            disabled ? (
              <div
                key={label}
                className="flex flex-col items-center gap-1 py-2.5 px-1 text-[10px] leading-tight text-center text-muted-foreground/50 cursor-not-allowed select-none"
                title={`${label} (em breve)`}
              >
                <Icon className="w-5 h-5" />
                <span className="truncate w-full">{label}</span>
              </div>
            ) : (
              <NavLink
                key={label}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 py-2.5 px-1 text-[10px] leading-tight text-center transition-colors border-l-2 ${
                    isActive
                      ? "bg-secondary text-secondary-foreground border-accent font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="truncate w-full">{label}</span>
              </NavLink>
            )
          )}
        </nav>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="no-print border-b bg-card sticky top-0 z-20">
          <div className="flex items-center justify-between h-16 px-4 md:px-6">
            <span className="font-bold text-lg text-primary">VendaPro</span>
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-[180px]">
                {user?.email}
              </span>
              <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  nav("/auth");
                }}
              >
                <LogOut className="w-4 h-4 mr-1" /> Sair
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 container py-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
