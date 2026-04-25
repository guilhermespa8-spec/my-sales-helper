import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, Receipt, CheckCircle2, Percent, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Quote {
  id: string;
  quote_number: number;
  customer_name: string | null;
  total: number;
  desconto: number;
  created_at: string;
  fiado: boolean;
}

const Fiado = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [discountingQuote, setDiscountingQuote] = useState<Quote | null>(null);
  const [discountValue, setDiscountValue] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quotes")
      .select("id,quote_number,customer_name,total,desconto,created_at,fiado")
      .eq("fiado", true)
      .order("created_at", { ascending: false });
    if (error) toast.error("Erro ao carregar fiado");
    setQuotes((data ?? []) as Quote[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Quote[]>();
    quotes.forEach((q) => {
      const key = q.customer_name?.trim() || "Sem mecânico";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(q);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [quotes]);

  const markPaid = async () => {
    if (!confirmingId) return;
    
    setIsSubmitting(true);
    const { error } = await supabase
      .from("quotes")
      .update({ fiado: false, pago_em: new Date().toISOString() })
      .eq("id", confirmingId);
    setIsSubmitting(false);
    
    if (error) {
      toast.error("Erro ao baixar fiado");
    } else {
      toast.success("Fiado quitado com sucesso");
      setConfirmingId(null);
      load();
    }
  };

  const applyDiscount = async () => {
    if (!discountingQuote) return;
    const discountPercent = Number(discountValue);
    if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      toast.error("Porcentagem de desconto inválida (0-100)");
      return;
    }

    const discountAmount = (discountingQuote.total * discountPercent) / 100;
    
    if (discountAmount >= discountingQuote.total && discountingQuote.total > 0) {
      toast.error("O desconto não pode ser de 100% ou mais");
      return;
    }

    setIsSubmitting(true);
    const newTotal = discountingQuote.total - discountAmount;
    const { error } = await supabase
      .from("quotes")
      .update({ 
        total: newTotal,
        desconto: (discountingQuote.desconto || 0) + discountAmount
      })
      .eq("id", discountingQuote.id);
    
    setIsSubmitting(false);

    if (error) {
      toast.error("Erro ao aplicar desconto");
    } else {
      toast.success("Desconto aplicado com sucesso");
      setDiscountingQuote(null);
      setDiscountValue("");
      load();
    }
  };

  const removeDiscount = async (quote: Quote) => {
    if (quote.desconto <= 0) return;

    setIsSubmitting(true);
    const originalTotal = Number(quote.total) + Number(quote.desconto);
    const { error } = await supabase
      .from("quotes")
      .update({ 
        total: originalTotal,
        desconto: 0
      })
      .eq("id", quote.id);
    
    setIsSubmitting(false);

    if (error) {
      toast.error("Erro ao remover desconto");
    } else {
      toast.success("Desconto removido com sucesso");
      load();
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: "var(--gradient-accent)" }}
        >
          <Wrench className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary">Fiado</h1>
          <p className="text-sm text-muted-foreground">Vendas em aberto agrupadas por mecânico</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : grouped.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma venda em fiado.</CardContent></Card>
      ) : (
        grouped.map(([mechanic, list]) => {
          const total = list.reduce((s, q) => s + Number(q.total), 0);
          return (
            <Card key={mechanic} className="shadow-[var(--shadow-soft)]">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-accent" />
                  {mechanic}
                  <Badge variant="secondary">{list.length}</Badge>
                </CardTitle>
                <div className="text-right">
                  <div className="text-xs uppercase text-muted-foreground tracking-wide">Total devedor</div>
                  <div className="text-xl font-bold text-primary font-mono">R$ {total.toFixed(2)}</div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {list.map((q) => {
                  const num = String(q.quote_number).padStart(4, "0");
                  const date = new Date(q.created_at).toLocaleDateString("pt-BR");
                  return (
                    <div key={q.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-card/50">
                      <div className="flex items-center gap-3 min-w-0">
                        <Receipt className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold font-mono">#{num}</div>
                          <div className="text-xs text-muted-foreground">{date}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                          {q.desconto > 0 && (
                            <span className="text-[10px] text-muted-foreground line-through decoration-destructive/50">
                              R$ {(Number(q.total) + Number(q.desconto)).toFixed(2)}
                            </span>
                          )}
                          <div className="font-mono font-semibold">R$ {Number(q.total).toFixed(2)}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          {q.desconto > 0 ? (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
                              onClick={() => removeDiscount(q)} 
                              title="Remover Desconto"
                              disabled={isSubmitting}
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-primary" 
                              onClick={() => setDiscountingQuote(q)} 
                              title="Aplicar Desconto"
                            >
                              <Percent className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button asChild variant="outline" size="sm" className="h-8">
                            <Link to={`/orcamentos/${q.id}`}>Ver</Link>
                          </Button>
                          <Button size="sm" className="h-8" onClick={() => setConfirmingId(q.id)}>
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Quitar
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })
      )}

      <AlertDialog open={!!confirmingId} onOpenChange={(open) => !open && setConfirmingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar liquidação de fiado</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a marcar esta venda como paga. Esta ação removerá o débito da conta do mecânico e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                markPaid();
              }}
              className="bg-primary hover:bg-primary/90"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processando..." : "Confirmar e Quitar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!discountingQuote} onOpenChange={(open) => !open && setDiscountingQuote(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-primary" />
              Aplicar Desconto
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-1">
              <div className="text-xs uppercase text-muted-foreground tracking-wider font-semibold">Valor Atual</div>
              <div className="text-2xl font-bold font-mono">R$ {discountingQuote?.total.toFixed(2)}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discount">Desconto (%)</Label>
              <div className="relative">
                <Input
                  id="discount"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="pr-8"
                  autoFocus
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  %
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                O desconto será calculado sobre o valor atual (R$ {discountingQuote?.total.toFixed(2)}).
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDiscountingQuote(null)}>Cancelar</Button>
            <Button onClick={applyDiscount} disabled={isSubmitting || !discountValue}>
              {isSubmitting ? "Aplicando..." : "Aplicar Desconto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fiado;
