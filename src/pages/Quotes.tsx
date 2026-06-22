import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Eye, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface Quote {
  id: string; quote_number: number; customer_name: string | null;
  total: number; created_at: string;
  seller: string | null; payment_method: string | null; piece_type: string | null;
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Orçamentos
            <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-bold animate-pulse">
              v0.1.1
            </span>
          </h1>
          <p className="text-slate-500 mt-1">Gerencie e acompanhe todas as suas propostas de venda</p>
        </div>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95">
          <Link to="/orcamentos/novo" className="flex items-center gap-2">
            <Plus className="w-5 h-5" /> 
            <span className="font-bold">Novo Orçamento</span>
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-transparent border-none shadow-none ring-1 ring-slate-200/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total de Orçamentos</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">{items.length}</h3>
              </div>
              <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-transparent border-none shadow-none ring-1 ring-slate-200/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Volume Total (Mês)</p>
                <h3 className="text-2xl font-bold text-foreground mt-1">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    items.reduce((acc, curr) => acc + Number(curr.total), 0)
                  )}
                </h3>
              </div>
              <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">$</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-transparent border-none shadow-none ring-1 ring-slate-200/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Última Atualização</p>
                <h3 className="text-base font-bold text-foreground mt-1">
                  {items.length > 0 ? new Date(items[0].created_at).toLocaleDateString('pt-BR') : 'Sem dados'}
                </h3>
              </div>
              <div className="h-10 w-10 bg-orange-50 rounded-full flex items-center justify-center">
                <Eye className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-transparent rounded-xl border border-slate-200 shadow-none overflow-hidden">
        {items.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-10" />
            <p className="text-lg font-medium">Nenhum orçamento encontrado</p>
            <p className="text-sm mb-6">Comece criando o seu primeiro orçamento de venda.</p>
            <Button asChild variant="outline">
              <Link to="/orcamentos/novo">Clique aqui para começar</Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px] py-4 pl-6 font-bold text-foreground">Pedido</TableHead>
                <TableHead className="font-bold text-foreground">Cliente</TableHead>
                <TableHead className="font-bold text-foreground">Vendedor</TableHead>
                <TableHead className="font-bold text-foreground">Pagamento</TableHead>
                <TableHead className="font-bold text-foreground">Tipo</TableHead>
                <TableHead className="font-bold text-foreground">Data e Hora</TableHead>
                <TableHead className="text-right font-bold text-foreground">Valor Total</TableHead>
                <TableHead className="w-[140px] text-right py-4 pr-6 font-bold text-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((q) => (
                <TableRow key={q.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="py-4 pl-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-foreground border border-slate-200">
                      #{String(q.quote_number).padStart(5, "0")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-foreground">
                        {q.customer_name || "Consumidor Final"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-slate-600">
                      {q.seller || "Loja"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm font-medium text-slate-600">
                      {q.payment_method || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                      {q.piece_type || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-500 font-medium">
                    {new Date(q.created_at).toLocaleString("pt-BR", { 
                      day: "2-digit", 
                      month: "2-digit", 
                      year: "2-digit", 
                      hour: "2-digit", 
                      minute: "2-digit" 
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-lg font-bold text-foreground">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(q.total)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-4 pr-6">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                        <Link to={`/orcamentos/${q.id}`} title="Visualizar"><Eye className="w-4 h-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild className="h-9 w-9 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                        <Link to={`/orcamentos/${q.id}/editar`} title="Editar"><Pencil className="w-4 h-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(q.id)} className="h-9 w-9 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>

  );
};

export default Quotes;
