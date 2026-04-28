import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Printer, ArrowLeft, Receipt, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

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
  const [mechanics, setMechanics] = useState<{ id: string; name: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMechanic, setSelectedMechanic] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: q, error } = await supabase.from("quotes").select("*").eq("id", id).maybeSingle();
      if (error || !q) { toast.error("Orçamento não encontrado"); nav("/"); return; }
      setQuote(q as Quote);
      setSelectedMechanic((q as Quote).customer_name ?? "");
      const { data: its } = await supabase.from("quote_items").select("*").eq("quote_id", id);
      setItems((its ?? []) as Item[]);
      const { data: mecs } = await supabase.from("mechanics").select("id,name").order("name");
      setMechanics((mecs ?? []) as { id: string; name: string }[]);
    })();
  }, [id, nav]);

  const handleAssignMechanic = async () => {
    if (!id || !selectedMechanic) { toast.error("Selecione um mecânico"); return; }
    setSaving(true);
    const { error } = await supabase.from("quotes").update({ customer_name: selectedMechanic, fiado: true }).eq("id", id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar"); return; }
    setQuote((q) => q ? { ...q, customer_name: selectedMechanic } : q);
    setDialogOpen(false);
    toast.success(`Venda adicionada ao fiado de ${selectedMechanic}`);
    nav("/fiado");
  };

  if (!quote) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  const num = String(quote.quote_number).padStart(4, "0");
  const date = new Date(quote.created_at).toLocaleDateString("pt-BR");

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="no-print flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" onClick={() => nav("/")}><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setDialogOpen(true)}>
            <Wrench className="w-4 h-4 mr-1" /> ADICIONAR VENDA AO MECÂNICO
          </Button>
          <Button onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> Imprimir notinha</Button>
        </div>
      </div>

      <Card className="print-area p-10 shadow-[var(--shadow-elevated)] print:shadow-none print:border-0 print:p-6 text-foreground print:text-black">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between border-b-4 border-primary print:border-black pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center print:bg-black print:rounded-md"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Receipt className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-primary print:text-black">VendaPro</div>
              <div className="text-xs font-medium text-foreground/70 print:text-black">Orçamento de venda</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-foreground/70 print:text-black">
              Orçamento Nº
            </div>
            <div className="text-3xl font-extrabold text-primary print:text-black font-mono leading-tight">#{num}</div>
            <div className="text-xs font-medium text-foreground/80 print:text-black mt-1">{date}</div>
          </div>
        </div>

        {/* Dados do cliente / vendedor */}
        {(quote.customer_name || quote.seller || quote.car) && (
          <div className="mb-6 grid grid-cols-2 gap-3 bg-secondary/60 print:bg-transparent print:border print:border-black/40 rounded-lg p-4">
            {quote.customer_name && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 print:text-black mb-0.5">
                  Cliente
                </div>
                <div className="font-bold text-foreground print:text-black">{quote.customer_name}</div>
              </div>
            )}
            {quote.seller && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 print:text-black mb-0.5">
                  Vendedor
                </div>
                <div className="font-bold text-foreground print:text-black">{quote.seller}</div>
              </div>
            )}
            {quote.car && (
              <div className="col-span-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 print:text-black mb-0.5">
                  Veículo
                </div>
                <div className="font-bold text-foreground print:text-black">{quote.car}</div>
              </div>
            )}
          </div>
        )}

        {/* Tabela de itens */}
        <div className="rounded-lg overflow-hidden border border-border print:border-black">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary text-primary-foreground print:bg-black print:text-white text-left">
                <th className="py-2.5 px-3 font-bold uppercase text-xs tracking-wider">Produto</th>
                <th className="py-2.5 px-3 font-bold uppercase text-xs tracking-wider text-center w-16">Qtd</th>
                <th className="py-2.5 px-3 font-bold uppercase text-xs tracking-wider text-right w-28">Preço un.</th>
                <th className="py-2.5 px-3 font-bold uppercase text-xs tracking-wider text-right w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i, idx) => (
                <tr
                  key={i.id}
                  className={`border-t border-border print:border-black/60 ${
                    idx % 2 === 1 ? "bg-secondary/40 print:bg-transparent" : ""
                  }`}
                >
                  <td className="py-2.5 px-3 font-semibold text-foreground print:text-black">{i.product_name}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-foreground print:text-black">{i.quantity}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground print:text-black">
                    R$ {Number(i.unit_price).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground print:text-black">
                    R$ {Number(i.subtotal).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="flex justify-end mt-6">
          <div
            className="px-7 py-4 rounded-xl text-right text-primary-foreground print:bg-transparent print:text-black print:border-2 print:border-black"
            style={{ background: "var(--gradient-brand)" }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-90 print:opacity-100">
              Total geral
            </div>
            <div className="text-3xl font-extrabold font-mono leading-tight">
              R$ {Number(quote.total).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Observações */}
        {quote.notes && (
          <div className="mt-6 pt-4 border-t-2 border-dashed border-border print:border-black/60">
            <div className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 print:text-black mb-1">
              Observações
            </div>
            <div className="text-sm font-medium text-foreground print:text-black whitespace-pre-wrap">
              {quote.notes}
            </div>
          </div>
        )}

        {/* Assinaturas (apenas impressão) */}
        <div className="hidden print:grid grid-cols-2 gap-10 mt-16">
          <div className="text-center">
            <div className="border-t-2 border-black pt-1 text-xs font-semibold text-black">Assinatura do cliente</div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-black pt-1 text-xs font-semibold text-black">Assinatura do vendedor</div>
          </div>
        </div>

        <div className="mt-10 pt-4 border-t border-border print:border-black text-center text-[11px] font-semibold text-foreground/70 print:text-black">
          Documento de orçamento — não possui valor fiscal
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar venda ao mecânico</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Mecânico</Label>
            <Select value={selectedMechanic || "__none__"} onValueChange={(v) => setSelectedMechanic(v === "__none__" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder={mechanics.length ? "Selecione o mecânico" : "Cadastre em Mecânicos"} />
              </SelectTrigger>
              <SelectContent>
                {mechanics.map((m) => (<SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>))}
              </SelectContent>
            </Select>
            {quote.customer_name && (
              <p className="text-xs text-muted-foreground">Atualmente vinculado a: <strong>{quote.customer_name}</strong></p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAssignMechanic} disabled={saving || !selectedMechanic}>
              {saving ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuoteDetail;
