import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { cn } from "@/lib/utils";
import {
  ScanBarcode,
  Boxes,
  ReceiptText,
  Banknote,
  TriangleAlert,
  ArrowUpRight,
} from "lucide-react";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

interface SaleRow {
  id: string;
  total: number;
  payment_method: string;
  created_at: string | null;
}

interface LowStock {
  id: string;
  name: string;
  stock: number;
}

const Home = () => {
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [stockValue, setStockValue] = useState(0);
  const [partsCount, setPartsCount] = useState(0);
  const [low, setLow] = useState<LowStock[]>([]);
  const [recent, setRecent] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const [salesToday, products, lastSales] = await Promise.all([
        supabase.from("sales").select("id,total,payment_method,created_at").gte("created_at", start.toISOString()),
        supabase.from("products").select("id,name,price,stock"),
        supabase
          .from("sales")
          .select("id,total,payment_method,created_at")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      const st = (salesToday.data ?? []) as SaleRow[];
      setTodayTotal(st.reduce((s, r) => s + Number(r.total), 0));
      setTodayCount(st.length);

      const ps = (products.data ?? []) as { id: string; name: string; price: number; stock: number }[];
      setPartsCount(ps.length);
      setStockValue(ps.reduce((s, p) => s + Number(p.price) * Number(p.stock), 0));
      setLow(
        ps
          .filter((p) => Number(p.stock) <= 3)
          .sort((a, b) => Number(a.stock) - Number(b.stock))
          .slice(0, 8)
          .map((p) => ({ id: p.id, name: p.name, stock: Number(p.stock) }))
      );

      setRecent((lastSales.data ?? []) as SaleRow[]);
      setLoading(false);
    })();
  }, []);

  const shortcuts = [
    { to: "/balcao", label: "Abrir balcão", icon: ScanBarcode },
    { to: "/pecas", label: "Cadastrar peça", icon: Boxes },
    { to: "/vendas", label: "Ver vendas", icon: ReceiptText },
    { to: "/caixa", label: "Fechar caixa", icon: Banknote },
  ];

  return (
    <div>
      <PageHeader code="00 · Painel" title="Visão da loja" description="Resumo operacional de hoje." />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Vendido hoje" value={loading ? "—" : brl(todayTotal)} icon={Banknote} variant="success" hint={`${todayCount} vendas`} />
        <StatCard title="Peças cadastradas" value={loading ? "—" : String(partsCount)} icon={Boxes} />
        <StatCard title="Valor em estoque" value={loading ? "—" : brl(stockValue)} icon={ReceiptText} variant="accent" />
        <StatCard title="Estoque crítico" value={loading ? "—" : String(low.length)} icon={TriangleAlert} variant="destructive" hint="3 unidades ou menos" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border mt-4">
        {shortcuts.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.to}
              to={s.to}
              className="group bg-card hover:bg-secondary transition-colors p-5 flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-primary" />
                <span className="text-sm font-semibold uppercase tracking-wider">{s.label}</span>
              </span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <section className="border border-border bg-card">
          <h2 className="stripe-title text-sm px-5 py-3 border-b border-border">Últimas vendas</h2>
          <div className="divide-y divide-border">
            {recent.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Nenhuma venda registrada.</p>
            ) : (
              recent.map((s) => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <span className="rule-label normal-case tracking-normal">
                    {s.created_at
                      ? new Date(s.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                  <span className="rule-label">{s.payment_method}</span>
                  <span className="font-semibold tabular-nums">{brl(Number(s.total))}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="border border-border bg-card">
          <h2 className="stripe-title text-sm px-5 py-3 border-b border-border flex items-center gap-2">
            <TriangleAlert className="w-4 h-4 text-destructive" /> Repor estoque
          </h2>
          <div className="divide-y divide-border">
            {low.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Estoque em dia.</p>
            ) : (
              low.map((p) => (
                <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <span className="text-sm truncate">{p.name}</span>
                  <span
                    className={cn(
                      "text-xs font-semibold px-2 py-1 border tabular-nums",
                      p.stock <= 0
                        ? "border-destructive text-destructive"
                        : "border-warning text-warning"
                    )}
                  >
                    {p.stock} un
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
