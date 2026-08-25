import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";

interface Sale {
  id: string;
  total: number;
  payment_method: string;
  piece_type: string | null;
  created_at: string;
  customer_name: string | null;
}

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const Sales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("sales")
        .select("id,total,payment_method,piece_type,created_at,customer_name")
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      else setSales((data ?? []) as Sale[]);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Vendas" description="Histórico de vendas realizadas" />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Todas as vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">Carregando...</div>
          ) : sales.length === 0 ? (
            <EmptyState icon={Receipt} title="Nenhuma venda registrada" description="As vendas feitas no PDV aparecerão aqui." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Data</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Pagamento</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-muted/30">
                      <td className="py-3 px-2">{new Date(sale.created_at).toLocaleString("pt-BR")}</td>
                      <td className="py-3 px-2">{sale.customer_name || "Avulso"}</td>
                      <td className="py-3 px-2">
                        <Badge variant="outline">{sale.payment_method}</Badge>
                      </td>
                      <td className="py-3 px-2">{sale.piece_type || "—"}</td>
                      <td className="py-3 px-2 text-right font-bold">{brl(Number(sale.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Sales;
