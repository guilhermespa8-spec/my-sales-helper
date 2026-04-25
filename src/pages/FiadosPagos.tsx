import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Receipt, CheckCircle2, History, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Quote {
  id: string;
  quote_number: number;
  customer_name: string | null;
  total: number;
  desconto: number;
  created_at: string;
  pago_em: string | null;
}

const FiadosPagos = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const load = async () => {
    setLoading(true);
    // Fetch quotes that were fiado but now are not (fiado = false) and have a pay date
    const { data, error } = await supabase
      .from("quotes")
      .select("id,quote_number,customer_name,total,desconto,created_at,pago_em")
      .eq("fiado", false)
      .not("pago_em", "is", null)
      .order("pago_em", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar fiados pagos");
    } else {
      setQuotes((data ?? []) as Quote[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => 
      q.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(q.quote_number).includes(searchTerm)
    );
  }, [quotes, searchTerm]);

  const grouped = useMemo(() => {
    const map = new Map<string, Quote[]>();
    filteredQuotes.forEach((q) => {
      const key = q.customer_name?.trim() || "Sem mecânico";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(q);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, [filteredQuotes]);

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "var(--gradient-brand)" }}
          >
            <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Fiados Pagos</h1>
            <p className="text-sm text-muted-foreground">Histórico de fiados liquidados</p>
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Buscar mecânico ou Nº..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground italic">
            Nenhum fiado pago encontrado.
          </CardContent>
        </Card>
      ) : (
        grouped.map(([mechanic, list]) => {
          const total = list.reduce((s, q) => s + Number(q.total), 0);
          return (
            <Card key={mechanic} className="shadow-sm border-muted-foreground/10 overflow-hidden">
              <CardHeader className="bg-muted/30 flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-primary/60" />
                  {mechanic}
                  <Badge variant="outline" className="font-normal">{list.length}</Badge>
                </CardTitle>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider font-bold">Total Recebido</div>
                  <div className="text-lg font-bold text-primary font-mono">R$ {total.toFixed(2)}</div>
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y divide-muted-foreground/5">
                {list.map((q) => {
                  const num = String(q.quote_number).padStart(4, "0");
                  const payDate = q.pago_em ? new Date(q.pago_em).toLocaleDateString("pt-BR") : "—";
                  return (
                    <div key={q.id} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                          <History className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold font-mono text-sm">#{num}</div>
                          <div className="text-[10px] text-muted-foreground">Pago em: {payDate}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                          {q.desconto > 0 && (
                            <span className="text-[10px] text-muted-foreground line-through decoration-destructive/50">
                              R$ {(Number(q.total) + Number(q.desconto)).toFixed(2)}
                            </span>
                          )}
                          <div className="font-mono font-bold text-sm text-foreground">R$ {Number(q.total).toFixed(2)}</div>
                        </div>
                        <Button asChild variant="ghost" size="sm" className="h-8">
                          <Link to={`/orcamentos/${q.id}`}>Ver Detalhes</Link>
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
    </div>
  );
};

export default FiadosPagos;
