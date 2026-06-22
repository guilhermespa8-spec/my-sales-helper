import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, X, Plus, Minus, Trash2, ArrowLeft, Save } from "lucide-react";

interface Product { id: string; name: string; description: string | null; price: number; }
interface Item { product_id: string; product_name: string; quantity: number; unit_price: number; }

const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const QuoteNew = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEdit = Boolean(editId);

  const [products, setProducts] = useState<Product[]>([]);
  const [sellersList, setSellersList] = useState<{ id: string; name: string }[]>([]);
  const [seller, setSeller] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sellers").select("id,name").order("name");
      if (data) setSellersList(data as { id: string; name: string }[]);
    })();
  }, []);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data: q, error } = await supabase.from("quotes").select("*").eq("id", editId).single();
      if (error) { toast.error(error.message); return; }
      setSeller((q as any).seller ?? "");
      setQuoteNumber(q.quote_number);
      const { data: its } = await supabase.from("quote_items").select("*").eq("quote_id", editId);
      setItems((its ?? []).map((i: any) => ({
        product_id: i.product_id, product_name: i.product_name,
        quantity: i.quantity, unit_price: Number(i.unit_price),
      })));
    })();
  }, [editId]);

  useEffect(() => {
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const q = search.trim();
        const r = q
          ? await supabase.rpc("search_products", { search_term: q })
          : await supabase.from("products").select("id,name,description,price").order("name").limit(50);
        if (!r.error) setProducts((r.data ?? []) as Product[]);
      } finally { setSearching(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const addItem = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    if (items.find((i) => i.product_id === p.id)) {
      setItems(items.map((i) => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { product_id: p.id, product_name: p.name, quantity: 1, unit_price: Number(p.price) }]);
    }
    setSearch("");
    setShowResults(false);
  };

  const updateItem = (idx: number, patch: Partial<Item>) =>
    setItems(items.map((i, k) => (k === idx ? { ...i, ...patch } : i)));

  const total = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unit_price, 0), [items]);

  const save = async () => {
    if (items.length === 0) { toast.error("Adicione ao menos 1 item"); return; }
    setSaving(true);
    try {
      let quoteId = editId;
      let qNumber = quoteNumber ?? 0;
      if (isEdit && editId) {
        const { error } = await supabase.from("quotes").update({
          seller: seller || null, total,
        } as any).eq("id", editId);
        if (error) throw error;
        const { error: delErr } = await supabase.from("quote_items").delete().eq("quote_id", editId);
        if (delErr) throw delErr;
      } else {
        const { data: quote, error } = await supabase.from("quotes").insert({
          user_id: user!.id, quote_number: 0, seller: seller || null, total,
        } as any).select().single();
        if (error) throw error;
        quoteId = quote.id;
        qNumber = quote.quote_number;
      }
      const { error: itErr } = await supabase.from("quote_items").insert(
        items.map((i) => ({
          quote_id: quoteId!, product_id: i.product_id, product_name: i.product_name,
          quantity: i.quantity, unit_price: i.unit_price, subtotal: i.quantity * i.unit_price,
        }))
      );
      if (itErr) throw itErr;
      toast.success(isEdit ? "Orçamento atualizado" : `Orçamento #${String(qNumber).padStart(4, "0")} criado`);
      nav(`/orcamentos/${quoteId}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => nav("/orcamentos")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isEdit ? "Editar Orçamento" : "Novo Orçamento"}
          </h1>
        </div>
        <Button onClick={save} disabled={saving || items.length === 0} className="font-semibold">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Vendedor */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Vendedor</Label>
        <select
          value={seller}
          onChange={(e) => setSeller(e.target.value)}
          className="w-full h-11 px-3 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none transition-all text-foreground"
        >
          <option value="">Selecione um vendedor</option>
          {sellersList.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}
        </select>
      </div>

      {/* Produto */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground">Produto</Label>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
            onFocus={() => setShowResults(true)}
            placeholder="Buscar produto por nome ou descrição..."
            className="w-full h-11 pl-10 pr-10 bg-background border border-input rounded-md focus:ring-2 focus:ring-ring outline-none transition-all text-foreground placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => { setSearch(""); setShowResults(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
          {showResults && search && (
            <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-popover border border-border rounded-md shadow-lg overflow-hidden max-h-80 overflow-y-auto">
              {searching ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Buscando...</div>
              ) : products.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">Nenhum produto encontrado</div>
              ) : (
                products.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addItem(p.id)}
                    className="w-full text-left p-3 hover:bg-accent border-b border-border last:border-0 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{p.description || "—"}</p>
                    </div>
                    <span className="font-mono font-semibold text-foreground shrink-0">{brl(p.price)}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Itens */}
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="border border-dashed border-border rounded-md p-10 text-center text-sm text-muted-foreground">
            Nenhum produto adicionado
          </div>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-md overflow-hidden">
            {items.map((i, idx) => (
              <li key={idx} className="p-4 flex items-center gap-3 bg-card">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{i.product_name}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 border border-border rounded-md">
                      <button onClick={() => updateItem(idx, { quantity: Math.max(1, i.quantity - 1) })} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="font-mono font-semibold w-8 text-center text-foreground">{i.quantity}</span>
                      <button onClick={() => updateItem(idx, { quantity: i.quantity + 1 })} className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={i.unit_price}
                      onChange={(e) => updateItem(idx, { unit_price: Math.max(0, Number(e.target.value)) })}
                      className="w-28 h-8 text-right font-mono"
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono font-bold text-foreground">{brl(i.quantity * i.unit_price)}</p>
                  <button onClick={() => setItems(items.filter((_, k) => k !== idx))} className="text-muted-foreground hover:text-destructive mt-1 inline-flex">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Total */}
      {items.length > 0 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total</span>
          <span className="text-2xl font-mono font-bold text-foreground">{brl(total)}</span>
        </div>
      )}
    </div>
  );
};

export default QuoteNew;
