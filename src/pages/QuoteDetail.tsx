import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Printer, ArrowLeft, Receipt, Wrench, User, UserCircle2, Car as CarIcon, Phone, MapPin, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Quote {
  id: string; quote_number: number; customer_name: string | null;
  total: number; notes: string | null; created_at: string;
  seller: string | null; car: string | null;
  payment_method: string | null; piece_type: string | null;
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
  const [registering, setRegistering] = useState(false);
  const [showCustomerHeader, setShowCustomerHeader] = useState(false);
  const [customHeaderName, setCustomHeaderName] = useState("");

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

  const handleRegisterSale = async () => {
    if (!quote || items.length === 0) return;
    if (!quote.seller || !quote.payment_method || !quote.piece_type) {
      toast.error("Preencha vendedor, forma de pagamento e tipo de peça antes de registrar.");
      return;
    }

    setRegistering(true);
    try {
      const { data, error } = await supabase.functions.invoke("registrar-venda-vf", {
        body: {
          quote_id: quote.id,
          seller: quote.seller,
          payment_method: quote.payment_method,
          piece_type: quote.piece_type,
          customer_name: quote.customer_name,
          notes: quote.notes,
          total: quote.total,
          items: items.map((i) => ({
            product_name: i.product_name,
            quantity: i.quantity,
            unit_price: i.unit_price,
            subtotal: i.subtotal,
          })),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Venda registrada no Venda Fácil!");
    } catch (err: any) {
      console.error("Erro ao registrar venda:", err);
      toast.error(err?.message ?? "Erro ao registrar venda");
    } finally {
      setRegistering(false);
    }
  };

  if (!quote) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  const num = String(quote.quote_number).padStart(4, "0");
  const dateObj = new Date(quote.created_at);
  const date = dateObj.toLocaleDateString("pt-BR");
  const time = dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 py-6 md:py-10">
      <div className="no-print flex items-center justify-between gap-4 flex-wrap bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-slate-200 shadow-sm">
        <Button variant="ghost" onClick={() => nav("/orcamentos")} className="hover:bg-slate-100">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar para a lista
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDialogOpen(true)} className="border-blue-200 text-blue-700 hover:bg-blue-50">
            <Wrench className="w-4 h-4 mr-2" /> Vincular ao Fiado
          </Button>
          <Button 
            onClick={handleRegisterSale} 
            disabled={registering}
            className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-100"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" /> 
            {registering ? "Registrando..." : "REGISTRAR VENDA"}
          </Button>
          <input
            type="text"
            value={customHeaderName}
            onChange={(e) => setCustomHeaderName(e.target.value)}
            placeholder="Nome do cliente no topo (opcional)"
            className="px-3 py-2 border border-slate-200 rounded-md bg-white text-sm w-64"
          />
          <Button onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200">
            <Printer className="w-4 h-4 mr-2" /> Imprimir Documento
          </Button>
        </div>
      </div>

      {/* PRINT-ONLY RECEIPT (matches "PEDIDO DE VENDA" example) */}
      <div className="print-area hidden print:block text-black" style={{ fontFamily: "Arial, sans-serif" }}>
        {customHeaderName.trim() && (
          <div style={{ textAlign: "center", fontSize: "28px", fontWeight: 900, textTransform: "uppercase", marginTop: "-2mm", marginBottom: "4px", borderBottom: "2px solid #000", paddingBottom: "2px" }}>
            {customHeaderName}
          </div>
        )}

          </div>
        )}

        <div style={{ textAlign: "center", fontSize: "22px", fontWeight: 900, letterSpacing: "1px", marginBottom: "4px" }}>
          PEDIDO DE VENDA
        </div>

        <div style={{ borderTop: "1px solid #000", margin: "4px 0" }} />
        <div style={{ fontSize: "12px", fontWeight: 700, lineHeight: 1.35 }}>
          <div>ABRANTES &amp; ABRANTES LTDA</div>
          <div>CNPJ: 29.327.178/0001-23 &nbsp; IE: 82684360</div>
          <div>rua teixeira brandao, 519, ESTACAO, 28940-001, São Pedro da Aldeia-RJ</div>
          <div>TELEFONE: (22) 99955-4939</div>
          <div>EMAIL:</div>
        </div>
        <div style={{ textAlign: "center", marginTop: "8px", fontSize: "14px", fontWeight: 900 }}>
          PEDIDO Nº <span style={{ color: "#c00" }}>{String(quote.quote_number).padStart(6, "0")}</span>
        </div>
        <div style={{ textAlign: "center", fontSize: "11px", marginBottom: "6px" }}>
          Emissão: {date} {time}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginBottom: "6px" }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #000", padding: "3px", width: "60%" }}>
                <div style={{ fontWeight: 700 }}>Nome / Razão Social:</div>
                <div>{quote.customer_name || "Consumidor"}</div>
              </td>
              <td style={{ border: "1px solid #000", padding: "3px" }}>
                <div style={{ fontWeight: 700 }}>CNPJ / CPF:</div>
                <div>&nbsp;</div>
              </td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #000", padding: "3px" }}>
                <div style={{ fontWeight: 700 }}>Vendedor:</div>
                <div>{quote.seller || "—"}</div>
              </td>
              <td style={{ border: "1px solid #000", padding: "3px" }}>
                <div style={{ fontWeight: 700 }}>Veículo:</div>
                <div>{quote.car || "—"}</div>
              </td>
            </tr>
          </tbody>
        </table>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
              <th style={{ textAlign: "left", padding: "3px" }}>Descrição</th>
              <th style={{ textAlign: "center", padding: "3px", width: "40px" }}>Qtd</th>
              <th style={{ textAlign: "right", padding: "3px", width: "60px" }}>Unitário</th>
              <th style={{ textAlign: "right", padding: "3px", width: "70px" }}>Total(R$)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td style={{ padding: "3px", fontWeight: 700 }}>{i.product_name}</td>
                <td style={{ padding: "3px", textAlign: "center" }}>{i.quantity.toFixed(2)}</td>
                <td style={{ padding: "3px", textAlign: "right" }}>{i.unit_price.toFixed(2)}</td>
                <td style={{ padding: "3px", textAlign: "right" }}>{i.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginTop: "4px" }}>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #000", padding: "3px" }}>
                <div style={{ fontWeight: 700 }}>Quantidade</div>
                <div>{items.reduce((s, i) => s + Number(i.quantity), 0).toFixed(2)}</div>
              </td>
              <td style={{ border: "1px solid #000", padding: "3px" }}>
                <div style={{ fontWeight: 700 }}>Total</div>
                <div>R$ {quote.total.toFixed(2)}</div>
              </td>
              <td style={{ border: "1px solid #000", padding: "3px" }}>
                <div style={{ fontWeight: 700 }}>Desconto</div>
                <div>R$ 0,00</div>
              </td>
              <td style={{ border: "1px solid #000", padding: "3px" }}>
                <div style={{ fontWeight: 700 }}>Total</div>
                <div>R$ {quote.total.toFixed(2)}</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ borderTop: "1px solid #000", marginTop: "6px", padding: "3px 0", fontSize: "12px" }}>
          <div style={{ fontWeight: 700 }}>Forma(s) de Pagamento:</div>
          <div>{quote.payment_method ? `${quote.payment_method}: R$ ${quote.total.toFixed(2)}` : "—"}</div>
        </div>
        {quote.notes && (
          <div style={{ borderTop: "1px solid #000", padding: "3px 0", fontSize: "12px" }}>
            <div style={{ fontWeight: 700 }}>Observações:</div>
            <div>{quote.notes}</div>
          </div>
        )}
      </div>

      <Card className="print:hidden shadow-2xl shadow-slate-200/50 print:shadow-none border-none print:border-0 rounded-3xl overflow-hidden bg-white text-slate-900">

        {/* Decorative Top Bar */}
        <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-400 print:hidden" />
        
        <div className="p-8 md:p-12">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 mb-12 border-b border-slate-100 pb-12">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200 print:bg-black print:rounded-md">
                <Receipt className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 print:text-black uppercase">
                  Abrantes <span className="text-blue-600 print:text-black">Auto Peças</span>
                </h1>
                <p className="text-sm font-bold text-slate-400 print:text-black uppercase tracking-widest mt-0.5">
                  Orçamento de Venda Profissional
                </p>
                <div className="mt-4 space-y-1 text-slate-500 print:text-black font-medium">
                  <p className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-blue-500 print:text-black" /> Rua das Peças, 123 - Centro
                  </p>
                  <p className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-blue-500 print:text-black" /> (22) 99955-4939
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-left md:text-right bg-slate-50 print:bg-transparent p-6 rounded-2xl border border-slate-100 print:border-none min-w-[200px]">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 print:text-black mb-1">
                Número do Pedido
              </p>
              <p className="text-4xl font-black text-slate-900 print:text-black font-mono tracking-tighter">
                #{num}
              </p>
              <div className="mt-4 pt-4 border-t border-slate-200 print:border-black/10">
                <p className="text-sm font-bold text-slate-900 print:text-black">{date}</p>
                <p className="text-xs font-medium text-slate-500 print:text-black">{time}</p>
              </div>
            </div>
          </div>

          {/* Info Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
            <div className="bg-slate-50/50 print:bg-white print:border print:border-black p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 print:bg-transparent print:border print:border-black rounded-xl flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-blue-600 print:text-black" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 print:text-black mb-0.5">Cliente</p>
                <p className="font-bold text-slate-900 print:text-black truncate text-sm">{quote.customer_name || "Consumidor Final"}</p>
              </div>
            </div>

            <div className="bg-slate-50/50 print:bg-white print:border print:border-black p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-100 print:bg-transparent print:border print:border-black rounded-xl flex items-center justify-center shrink-0">
                <UserCircle2 className="w-4 h-4 text-indigo-600 print:text-black" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 print:text-black mb-0.5">Vendedor</p>
                <p className="font-bold text-slate-900 print:text-black truncate text-sm">{quote.seller || "Loja"}</p>
              </div>
            </div>

            <div className="bg-slate-50/50 print:bg-white print:border print:border-black p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-200 print:bg-transparent print:border print:border-black rounded-xl flex items-center justify-center shrink-0">
                <CarIcon className="w-4 h-4 text-slate-700 print:text-black" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 print:text-black mb-0.5">Veículo</p>
                <p className="font-bold text-slate-900 print:text-black truncate text-sm">{quote.car || "—"}</p>
              </div>
            </div>

            <div className="bg-slate-50/50 print:bg-white print:border print:border-black p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-green-100 print:bg-transparent print:border print:border-black rounded-xl flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4 text-green-600 print:text-black" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 print:text-black mb-0.5">Pagamento</p>
                <p className="font-bold text-slate-900 print:text-black truncate text-sm">{quote.payment_method || "—"}</p>
              </div>
            </div>

            <div className="bg-slate-50/50 print:bg-white print:border print:border-black p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-100 print:bg-transparent print:border print:border-black rounded-xl flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-orange-600 print:text-black" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 print:text-black mb-0.5">Tipo</p>
                <p className="font-bold text-slate-900 print:text-black truncate text-sm">{quote.piece_type || "—"}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="rounded-2xl overflow-hidden border border-slate-100 print:border-black mb-10 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-white print:bg-black print:text-white text-left">
                  <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest">Descrição do Produto</th>
                  <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-center w-20">Qtd</th>
                  <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-right w-32">Unitário</th>
                  <th className="py-4 px-6 font-bold uppercase text-[10px] tracking-widest text-right w-32">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-black/20">
                {items.map((i, idx) => (
                  <tr key={i.id} className={idx % 2 === 1 ? "bg-slate-50/30 print:bg-transparent" : ""}>
                    <td className="py-4 px-6 font-bold text-slate-800 print:text-black">{i.product_name}</td>
                    <td className="py-4 px-6 text-center">
                      <span className="bg-slate-100 print:bg-transparent px-3 py-1 rounded-full font-bold text-slate-900 print:text-black border border-slate-200 print:border-none">
                        {i.quantity}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-medium text-slate-500 print:text-black">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.unit_price)}
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-slate-900 print:text-black">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Section */}
          <div className="flex flex-col md:flex-row justify-between items-end md:items-start gap-10">
            <div className="flex-1 w-full max-w-md">
              {quote.notes && (
                <div className="bg-orange-50/50 print:bg-transparent p-6 rounded-2xl border border-orange-100 print:border-black print:border-dashed">
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 print:text-black mb-2 flex items-center gap-2">
                    <Receipt className="w-3 h-3" /> Observações do Pedido
                  </p>
                  <p className="text-sm font-medium text-slate-700 print:text-black leading-relaxed">
                    {quote.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-slate-900 text-white print:bg-white print:text-black print:border-4 print:border-black p-8 rounded-3xl text-right min-w-[280px] shadow-xl shadow-slate-200/50">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 print:opacity-100 mb-2">Total do Orçamento</p>
              <p className="text-5xl font-black font-mono tracking-tighter">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.total)}
              </p>
            </div>
          </div>

          {/* Signatures */}
          <div className="hidden print:grid grid-cols-2 gap-20 mt-24">
            <div className="text-center">
              <div className="border-t border-slate-300 print:border-black pt-2 text-[10px] font-black uppercase tracking-widest text-slate-500 print:text-black">
                Assinatura do Cliente
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-300 print:border-black pt-2 text-[10px] font-black uppercase tracking-widest text-slate-500 print:text-black">
                Abrantes Auto Peças
              </div>
            </div>
          </div>

          <div className="mt-16 pt-6 border-t border-slate-100 print:border-black text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 print:text-black italic">
              Este documento não possui valor fiscal • Orçamento válido por 5 dias
            </p>
          </div>
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
