import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { ReceiptText, ChevronDown } from "lucide-react";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

interface SaleItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Sale {
  id: string;
  total: number;
  payment_method: string;
  piece_type: string | null;
  customer_name: string | null;
  created_at: string | null;
  sale_items: SaleItem[];
}

const Sales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [payment, setPayment] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sales")
        .select("id,total,payment_method,piece_type,customer_name,created_at,sale_items(id,product_name,quantity,unit_price,subtotal)")
        .order("created_at", { ascending: false })
        .limit(200);
      setSales((data ?? []) as Sale[]);
      setLoading(false);
    })();
  }, []);

  const payments = useMemo(
    () => [...new Set(sales.map((s) => s.payment_method).filter(Boolean))],
    [sales]
  );

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return sales.filter((s) => {
      if (payment && s.payment_method !== payment) return false;
      if (!t) return true;
      return (
        (s.customer_name ?? "").toLowerCase().includes(t) ||
        s.sale_items.some((i) => i.product_name.toLowerCase().includes(t))
      );
    });
  }, [sales, query, payment]);

  const totalShown = filtered.reduce((s, r) => s + Number(r.total), 0);

  return (
    <div>
      <PageHeader code="03 · Vendas" title="Histórico" description="Todas as vendas registradas no balcão.">
        <div className="text-right">
          <p className="rule-label">Total listado</p>
          <p className="font-display text-2xl leading-none tabular-nums text-primary">{brl(totalShown)}</p>
        </div>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder="Buscar por peça ou cliente"
          wrapperClassName="flex-1"
        />
        <div className="flex gap-px bg-border border border-border overflow-x-auto">
          <button
            type="button"
            onClick={() => setPayment("")}
            className={cn(
              "px-4 py-2 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap",
              payment === "" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"
            )}
          >
            Todas
          </button>
          {payments.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPayment(p)}
              className={cn(
                "px-4 py-2 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap",
                payment === p ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="rule-label">Carregando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Nenhuma venda"
          description="As vendas finalizadas no balcão aparecem aqui."
        />
      ) : (
        <div className="border border-border bg-card divide-y divide-border">
          {filtered.map((s) => {
            const open = openId === s.id;
            return (
              <div key={s.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : s.id)}
                  className="w-full px-4 sm:px-5 py-4 flex items-center gap-4 text-left hover:bg-secondary/60 transition-colors"
                >
                  <span className="font-mono text-xs text-muted-foreground w-28 shrink-0">
                    {s.created_at
                      ? new Date(s.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </span>
                  <span className="flex-1 min-w-0 text-sm truncate">
                    {s.sale_items.map((i) => i.product_name).join(" · ") || "Venda"}
                  </span>
                  <span className="hidden sm:inline rule-label">{s.payment_method}</span>
                  {s.piece_type && (
                    <span className="hidden md:inline text-[10px] uppercase tracking-wider border border-border px-2 py-0.5 text-muted-foreground">
                      {s.piece_type}
                    </span>
                  )}
                  <span className="font-semibold tabular-nums w-24 text-right">{brl(Number(s.total))}</span>
                  <ChevronDown
                    className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")}
                  />
                </button>
                {open && (
                  <div className="bg-secondary/40 border-t border-border px-4 sm:px-5 py-3">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-border">
                        {s.sale_items.map((i) => (
                          <tr key={i.id}>
                            <td className="py-2 pr-3">{i.product_name}</td>
                            <td className="py-2 px-3 text-right tabular-nums w-16">{i.quantity}x</td>
                            <td className="py-2 px-3 text-right tabular-nums w-28">{brl(Number(i.unit_price))}</td>
                            <td className="py-2 pl-3 text-right tabular-nums w-28 font-semibold">
                              {brl(Number(i.subtotal))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Sales;
