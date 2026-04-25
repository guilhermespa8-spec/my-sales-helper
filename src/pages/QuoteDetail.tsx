import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Printer, ArrowLeft, Receipt } from "lucide-react";
import { toast } from "sonner";

interface Quote {
  id: string; quote_number: number; customer_name: string | null;
  total: number; notes: string | null; created_at: string;
  seller: string | null; car: string | null;
}
interface Item { id: string; product_name: string; quantity: number; unit_price: number; subtotal: number; }

const QuoteDetail = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: q, error } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
      if (error || !q) { toast.error("Orçamento não encontrado"); nav("/"); return; }
      setQuote(q as Quote);
      const { data: its } = await supabase.from("quote_items").select("*").eq("quote_id", id);
      setItems((its ?? []) as Item[]);
    })();
  }, [id, nav]);

  if (!quote) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  const num = String(quote.quote_number).padStart(4, "0");
  const date = new Date(quote.created_at).toLocaleDateString("pt-BR");

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="no-print flex items-center justify-between">
        <Button variant="ghost" onClick={() => nav("/")}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
        <Button onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> Imprimir notinha</Button>
      </div>

      <Card className="print-area p-8 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between border-b-2 border-primary pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
              <Receipt className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <div className="text-xl font-bold text-primary">VendaPro</div>
              <div className="text-xs text-muted-foreground">Orçamento de venda</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Orçamento Nº</div>
            <div className="text-2xl font-bold text-primary font-mono">#{num}</div>
            <div className="text-xs text-muted-foreground mt-1">{date}</div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          {quote.customer_name && (
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Cliente</div>
              <div className="font-semibold">{quote.customer_name}</div>
            </div>
          )}
          {quote.seller && (
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Vendedor</div>
              <div className="font-semibold">{quote.seller}</div>
            </div>
          )}
          {quote.car && (
            <div>
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Carro</div>
              <div className="font-semibold">{quote.car}</div>
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2">Produto</th>
              <th className="py-2 text-center w-16">Qtd</th>
              <th className="py-2 text-right w-28">Preço un.</th>
              <th className="py-2 text-right w-28">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-b">
                <td className="py-2">{i.product_name}</td>
                <td className="py-2 text-center">{i.quantity}</td>
                <td className="py-2 text-right font-mono">R$ {Number(i.unit_price).toFixed(2)}</td>
                <td className="py-2 text-right font-mono">R$ {Number(i.subtotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mt-6">
          <div className="bg-secondary px-6 py-3 rounded-lg text-right">
            <div className="text-xs uppercase text-muted-foreground tracking-wide">Total geral</div>
            <div className="text-3xl font-bold text-primary font-mono">R$ {Number(quote.total).toFixed(2)}</div>
          </div>
        </div>

        {quote.notes && (
          <div className="mt-6 pt-4 border-t">
            <div className="text-xs uppercase text-muted-foreground tracking-wide mb-1">Observações</div>
            <div className="text-sm whitespace-pre-wrap">{quote.notes}</div>
          </div>
        )}

        <div className="mt-10 pt-4 border-t text-center text-xs text-muted-foreground">
          Documento de orçamento — não possui valor fiscal
        </div>
      </Card>
    </div>
  );
};

export default QuoteDetail;
