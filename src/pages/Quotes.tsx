import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Quote {
  id: string; quote_number: number; customer_name: string | null;
  total: number; created_at: string;
}

const Quotes = () => {
  const [items, setItems] = useState<Quote[]>([]);

  const load = async () => {
    const { data, error } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setItems((data ?? []) as Quote[]);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Excluir este orçamento?")) return;
    const { error } = await supabase.from("quotes").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Orçamento excluído"); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">Crie e imprima notinhas de orçamento</p>
        </div>
        <Button asChild><Link to="/orcamentos/novo"><Plus className="w-4 h-4 mr-1" /> Novo orçamento</Link></Button>
      </div>

      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader><CardTitle className="text-base">Histórico ({items.length})</CardTitle></CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
              Nenhum orçamento ainda. Crie o primeiro!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono font-semibold">#{String(q.quote_number).padStart(4, "0")}</TableCell>
                    <TableCell>{q.customer_name || <span className="text-muted-foreground italic">Sem cliente</span>}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(q.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">R$ {Number(q.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" asChild><Link to={`/orcamentos/${q.id}`}><Eye className="w-4 h-4" /></Link></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(q.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Quotes;
