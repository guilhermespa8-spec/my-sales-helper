import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import {
  ShoppingCart,
  Package,
  AlertTriangle,
  Wrench,
  Plus,
  ArrowRight,
  TrendingUp,
} from "lucide-react";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const Dashboard = () => {
  const [stats, setStats] = useState({
    salesToday: 0,
    stockValue: 0,
    lowStock: 0,
    pendingOrders: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split("T")[0];
        const { data: sales } = await supabase
          .from("sales")
          .select("total, created_at")
          .gte("created_at", `${today}T00:00:00`)
          .lte("created_at", `${today}T23:59:59`);
        const salesToday = (sales ?? []).reduce((acc, s) => acc + Number(s.total), 0);

        const { data: products } = await supabase.from("products").select("price, stock");
        const stockValue = (products ?? []).reduce((acc, p) => acc + Number(p.price) * Number(p.stock), 0);
        const lowStock = (products ?? []).filter((p) => Number(p.stock) <= 5).length;

        const { data: recent } = await supabase
          .from("sales")
          .select("id, total, created_at, customer_name")
          .order("created_at", { ascending: false })
          .limit(5);

        setStats({ salesToday, stockValue, lowStock, pendingOrders: 0 });
        setRecentSales(recent ?? []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Visão geral do seu negócio">
        <Button asChild>
          <Link to="/pdv" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Abrir PDV
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Vendas hoje" value={brl(stats.salesToday)} icon={TrendingUp} variant="success" />
        <StatCard title="Valor em estoque" value={brl(stats.stockValue)} icon={Package} />
        <StatCard title="Estoque baixo" value={String(stats.lowStock)} icon={AlertTriangle} variant="warning" />
        <StatCard title="OS pendentes" value={String(stats.pendingOrders)} icon={Wrench} variant="destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Vendas recentes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/vendas" className="gap-1">
                Ver todas <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground">Carregando...</div>
            ) : recentSales.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="Nenhuma venda ainda"
                description="Comece registrando uma venda no PDV."
              />
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">{sale.customer_name || "Venda avulsa"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <span className="font-bold text-foreground">{brl(Number(sale.total))}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link to="/produtos">
                <Plus className="w-4 h-4" /> Novo produto
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link to="/ordens">
                <Wrench className="w-4 h-4" /> Nova ordem de serviço
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" asChild>
              <Link to="/estoque">
                <Package className="w-4 h-4" /> Movimentar estoque
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
