import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

const Stock = () => {
  const [items, setItems] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("products").select("id,name,price,stock").order("name");
      if (error) console.error(error);
      else setItems((data ?? []) as Product[]);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = items.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const lowStock = filtered.filter((p) => Number(p.stock) <= 5);

  return (
    <div className="space-y-6">
      <PageHeader title="Estoque" description="Controle de entrada, saída e produtos com estoque baixo" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total de produtos</p>
            <p className="text-2xl font-bold mt-1">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Estoque baixo</p>
            <p className="text-2xl font-bold mt-1 text-destructive">{items.filter((p) => Number(p.stock) <= 5).length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">Produtos</CardTitle>
          <SearchInput
            placeholder="Buscar produto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            wrapperClassName="w-full sm:w-72"
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={Package} title="Nenhum produto encontrado" description="Cadastre produtos na aba Produtos." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Produto</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Preço</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Estoque</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="py-3 px-2 font-medium">{p.name}</td>
                      <td className="py-3 px-2 text-right">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(p.price))}
                      </td>
                      <td className="py-3 px-2 text-right">{p.stock}</td>
                      <td className="py-3 px-2">
                        {Number(p.stock) <= 5 ? (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" /> Baixo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">OK</Badge>
                        )}
                      </td>
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

export default Stock;
