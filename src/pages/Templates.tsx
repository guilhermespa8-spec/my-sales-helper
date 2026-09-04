import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/SearchInput";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { Plus, Trash2, Car } from "lucide-react";

interface TemplateItem {
  id: string;
  product_id: string | null;
  product_code: string | null;
  product_name: string;
  quantity: number;
}

interface Template {
  id: string;
  car_name: string;
  car_year: string | null;
  car_engine: string | null;
  quote_template_items: TemplateItem[];
}

interface ProductHit {
  id: string;
  name: string;
  price: number;
}

const Templates = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const [carName, setCarName] = useState("");
  const [carYear, setCarYear] = useState("");
  const [carEngine, setCarEngine] = useState("");
  const [saving, setSaving] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<ProductHit[]>([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("quote_templates")
      .select("id,car_name,car_year,car_engine,quote_template_items(id,product_id,product_code,product_name,quantity)")
      .order("car_name");
    if (error) toast.error("Erro ao carregar modelos");
    setTemplates((data ?? []) as Template[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_products", { search_term: q });
      setHits(((data ?? []) as ProductHit[]).slice(0, 8));
    }, 220);
    return () => clearTimeout(t);
  }, [search]);

  const createTemplate = async () => {
    if (!carName.trim()) return toast.error("Informe o carro");
    setSaving(true);
    const { data, error } = await supabase
      .from("quote_templates")
      .insert({
        user_id: user!.id,
        car_name: carName.trim(),
        car_year: carYear.trim() || null,
        car_engine: carEngine.trim() || null,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setCarName("");
    setCarYear("");
    setCarEngine("");
    setActiveId(data.id);
    await load();
  };

  const addItem = async (templateId: string, p: ProductHit | null, raw: string) => {
    const { error } = await supabase.from("quote_template_items").insert({
      template_id: templateId,
      product_id: p?.id ?? null,
      product_code: p ? null : raw.trim(),
      product_name: p?.name ?? raw.trim(),
      quantity: 1,
    });
    if (error) return toast.error(error.message);
    setSearch("");
    setHits([]);
    await load();
  };

  const removeItem = async (id: string) => {
    await supabase.from("quote_template_items").delete().eq("id", id);
    await load();
  };

  const removeTemplate = async (id: string) => {
    await supabase.from("quote_templates").delete().eq("id", id);
    await load();
  };

  const setQty = async (id: string, qty: number) => {
    if (qty < 1) return;
    await supabase.from("quote_template_items").update({ quantity: qty }).eq("id", id);
    await load();
  };

  const sorted = useMemo(() => templates, [templates]);

  return (
    <div className="space-y-6">
      <PageHeader code="Modelos" title="Orçamentos prontos" description="Monte kits de peças por carro e use no orçamento." />

      <section className="rounded-xl border border-border bg-card p-4 grid gap-3 sm:grid-cols-[1fr_120px_140px_auto]">
        <Input value={carName} onChange={(e) => setCarName(e.target.value)} placeholder="Carro (ex.: Gol G5)" />
        <Input value={carYear} onChange={(e) => setCarYear(e.target.value)} placeholder="Ano" />
        <Input value={carEngine} onChange={(e) => setCarEngine(e.target.value)} placeholder="Motor" />
        <Button onClick={createTemplate} disabled={saving}>
          <Plus className="w-4 h-4 mr-1" /> Criar
        </Button>
      </section>

      {loading && <p className="rule-label">Carregando...</p>}
      {!loading && sorted.length === 0 && <p className="rule-label">Nenhum modelo criado ainda.</p>}

      <div className="space-y-3">
        {sorted.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Car className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{t.car_name}</p>
                <p className="rule-label">
                  {[t.car_year, t.car_engine].filter(Boolean).join(" · ") || "—"} ·{" "}
                  {t.quote_template_items.length} peça(s)
                </p>
              </div>
              <div className="ml-auto flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setActiveId(activeId === t.id ? null : t.id)}>
                  {activeId === t.id ? "Fechar" : "Editar peças"}
                </Button>
                <Button variant="ghost" size="icon" aria-label="Excluir modelo" onClick={() => removeTemplate(t.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>

            {activeId === t.id && (
              <div className="p-4 space-y-3">
                <SearchInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch("")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && search.trim()) void addItem(t.id, hits[0] ?? null, search);
                  }}
                  placeholder="Código ou nome da peça (Enter para adicionar)"
                />
                {hits.length > 0 && (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {hits.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => addItem(t.id, h, "")}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary"
                      >
                        {h.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="divide-y divide-border">
                  {t.quote_template_items.map((i) => (
                    <div key={i.id} className="flex items-center gap-3 py-2">
                      <span className="flex-1 text-sm">{i.product_name}</span>
                      <Input
                        type="number"
                        min={1}
                        value={i.quantity}
                        onChange={(e) => setQty(i.id, Number(e.target.value))}
                        className="h-8 w-20 tabular-nums"
                      />
                      <button type="button" onClick={() => removeItem(i.id)} aria-label="Remover peça">
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Templates;
