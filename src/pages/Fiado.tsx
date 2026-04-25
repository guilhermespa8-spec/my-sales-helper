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
  created_at: string;
  fiado: boolean;
}

const Fiado = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quotes")
      .select("id,quote_number,customer_name,total,created_at,fiado")
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
                        <div className="font-mono font-semibold">R$ {Number(q.total).toFixed(2)}</div>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/orcamentos/${q.id}`}>Ver</Link>
                        </Button>
                        <Button size="sm" onClick={() => setConfirmingId(q.id)}>
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Quitar
                        </Button>
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
    </div>
  );
};

export default Fiado;
