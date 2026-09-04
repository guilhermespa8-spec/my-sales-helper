import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { SearchInput } from "@/components/SearchInput";
import { FileText, Plus, CheckCircle2, Clock } from "lucide-react";

interface QuoteRow {
  id: string;
  quote_number: number;
  customer_name: string | null;
  seller: string | null;
  total: number;
  created_at: string;
}

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const Quotes = () => {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [converted, setConverted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: q }, { data: s }] = await Promise.all([
        supabase
          .from("quotes")
          .select("id,quote_number,customer_name,seller,total,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("sales").select("quote_id").not("quote_id", "is", null),
      ]);
      setQuotes((q ?? []) as QuoteRow[]);
      setConverted(new Set((s ?? []).map((r: { quote_id: string | null }) => r.quote_id as string)));
      setLoading(false);
    })();
  }, []);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? quotes.filter(
        (q) =>
          (q.customer_name ?? "").toLowerCase().includes(term) ||
          (q.seller ?? "").toLowerCase().includes(term) ||
          String(q.quote_number).includes(term)
      )
    : quotes;

  return (
    <div>
      <PageHeader title="Orçamentos" description="Propostas aguardando autorização do cliente">
        <Button asChild>
          <Link to="/orcamentos/novo">
            <Plus className="w-4 h-4 mr-2" /> Novo orçamento
          </Link>
        </Button>
      </PageHeader>

      <div className="mb-6 max-w-md">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Buscar por número, cliente ou vendedor"
        />
      </div>

      {loading ? (
        <p className="rule-label">Carregando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum orçamento"
          description="Crie um orçamento e converta em pedido de venda quando o cliente autorizar."
        />
      ) : (
        <div className="border border-border divide-y divide-border bg-card">
          {filtered.map((q) => {
            const done = converted.has(q.id);
            return (
              <Link
                key={q.id}
                to={`/orcamentos/${q.id}`}
                className="flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-secondary/60 transition-colors"
              >
                <span className="font-display text-3xl w-16 shrink-0 leading-none text-muted-foreground">
                  {String(q.quote_number).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground truncate">{q.customer_name || "Cliente não informado"}</p>
                  <p className="rule-label normal-case tracking-normal mt-0.5">
                    {new Date(q.created_at).toLocaleDateString("pt-BR")}
                    {q.seller ? ` · ${q.seller}` : ""}
                  </p>
                </div>
                <span
                  className={`hidden sm:inline-flex items-center gap-1.5 rule-label ${
                    done ? "text-success" : "text-muted-foreground"
                  }`}
                >
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  {done ? "Convertido" : "Aberto"}
                </span>
                <span className="font-semibold text-primary tabular-nums">{brl(Number(q.total))}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Quotes;
