import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Banknote, Printer, Wallet, Receipt } from "lucide-react";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

interface SaleRow {
  id: string;
  total: number;
  payment_method: string;
  piece_type: string | null;
  created_at: string | null;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

const Cash = () => {
  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59.999`);
      const { data } = await supabase
        .from("sales")
        .select("id,total,payment_method,piece_type,created_at")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: true });
      setRows((data ?? []) as SaleRow[]);
      setLoading(false);
    })();
  }, [date]);

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.total), 0), [rows]);

  const byPayment = useMemo(() => {
    const map = new Map<string, { count: number; sum: number }>();
    rows.forEach((r) => {
      const k = r.payment_method || "Não informado";
      const cur = map.get(k) ?? { count: 0, sum: 0 };
      map.set(k, { count: cur.count + 1, sum: cur.sum + Number(r.total) });
    });
    return [...map.entries()].sort((a, b) => b[1].sum - a[1].sum);
  }, [rows]);

  const byPiece = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const k = r.piece_type || "Sem tipo";
      map.set(k, (map.get(k) ?? 0) + Number(r.total));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const cash = byPayment.find(([k]) => k === "Dinheiro")?.[1].sum ?? 0;
  const fiado = byPayment.find(([k]) => k === "Fiado")?.[1].sum ?? 0;

  return (
    <div>
      <PageHeader code="04 · Caixa" title="Fechamento" description="Conferência do movimento do dia.">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-10 w-[170px]"
        />
        <Button variant="outline" onClick={() => window.print()} className="no-print">
          <Printer className="w-4 h-4 mr-2" /> Imprimir
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard title="Total do dia" value={loading ? "—" : brl(total)} icon={Banknote} variant="success" />
        <StatCard title="Vendas" value={loading ? "—" : String(rows.length)} icon={Receipt} />
        <StatCard title="Em dinheiro" value={loading ? "—" : brl(cash)} icon={Wallet} />
        <StatCard title="Fiado" value={loading ? "—" : brl(fiado)} icon={Wallet} variant="destructive" />
      </div>

      <div className="print-area grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <section className="border border-border bg-card">
          <h2 className="stripe-title text-sm px-5 py-3 border-b border-border">Por forma de pagamento</h2>
          <div className="divide-y divide-border">
            {byPayment.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Sem movimento nesta data.</p>
            ) : (
              byPayment.map(([k, v]) => (
                <div key={k} className="px-5 py-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{k}</span>
                  <span className="rule-label">{v.count}x</span>
                  <span className="font-semibold tabular-nums">{brl(v.sum)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="border border-border bg-card">
          <h2 className="stripe-title text-sm px-5 py-3 border-b border-border">Por tipo de peça</h2>
          <div className="divide-y divide-border">
            {byPiece.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">Sem movimento nesta data.</p>
            ) : (
              byPiece.map(([k, v]) => (
                <div key={k} className="px-5 py-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{k}</span>
                  <span className="font-semibold tabular-nums">{brl(v)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Cash;
