import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Search, Package, ShoppingCart, X, Sparkles, Minus, Command } from "lucide-react";
import { toast } from "sonner";

const SELLERS = ["André", "João Victor", "Mateus", "Loja"] as const;
const CARS = ["Corsa VHC"] as const;

interface Product { id: string; name: string; description: string | null; price: number; }
interface Item { product_id: string; product_name: string; quantity: number; unit_price: number; }
interface Mechanic { id: string; name: string; }

const QuoteNew = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEdit = Boolean(editId);
  const [products, setProducts] = useState<Product[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [customer, setCustomer] = useState("");
  const [seller, setSeller] = useState<string>("");
  const [car, setCar] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape" && document.activeElement === searchRef.current) { setSearch(""); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      const { data: q, error } = await supabase.from("quotes").select("*").eq("id", editId).single();
      if (error) { toast.error(error.message); return; }
      setCustomer(q.customer_name ?? "");
      setSeller((q as any).seller ?? "");
      setCar((q as any).car ?? "");
      setNotes(q.notes ?? "");
      setQuoteNumber(q.quote_number);
      const { data: its, error: e2 } = await supabase.from("quote_items").select("*").eq("quote_id", editId);
      if (e2) { toast.error(e2.message); return; }
      setItems((its ?? []).map((i: any) => ({
        product_id: i.product_id, product_name: i.product_name,
        quantity: i.quantity, unit_price: Number(i.unit_price),
      })));
    })();
  }, [editId]);

  useEffect(() => {
    const loadProducts = async () => {
      const pageSize = 1000;
      let from = 0;
      const all: Product[] = [];

      while (true) {
        const { data, error } = await supabase
          .from("products")
          .select("id,name,description,price")
          .order("name")
          .range(from, from + pageSize - 1);

        if (error) {
          toast.error(error.message);
          return;
        }

        const batch = (data ?? []) as Product[];
        all.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }

      setProducts(all);
    };

    loadProducts();
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("mechanics").select("id,name").order("name");
      if (error) { toast.error(error.message); return; }
      setMechanics((data ?? []) as Mechanic[]);
    })();
  }, []);

  const addItem = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    if (items.find((i) => i.product_id === p.id)) {
      setItems(items.map((i) => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { product_id: p.id, product_name: p.name, quantity: 1, unit_price: Number(p.price) }]);
    }
  };

  const updateItem = (idx: number, patch: Partial<Item>) => {
    setItems(items.map((i, k) => k === idx ? { ...i, ...patch } : i));
  };

  const total = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unit_price, 0), [items]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const suggestedParts = useMemo(() => {
    const c = car.trim().toLowerCase();
    if (!c) return [];
    return products.filter((p) => (p.description ?? "").toLowerCase().includes(c));
  }, [products, car]);

  const save = async () => {
    if (items.length === 0) { toast.error("Adicione ao menos 1 item"); return; }
    setSaving(true);
    try {
      let quoteId = editId;
      let qNumber = quoteNumber ?? 0;

      if (isEdit && editId) {
        const { error } = await supabase.from("quotes").update({
          customer_name: customer.trim() || null,
          seller: seller || null,
          car: car.trim() || null,
          notes: notes.trim() || null,
          total,
        } as any).eq("id", editId);
        if (error) throw error;
        const { error: delErr } = await supabase.from("quote_items").delete().eq("quote_id", editId);
        if (delErr) throw delErr;
      } else {
        const { data: quote, error } = await supabase.from("quotes").insert({
          user_id: user!.id,
          quote_number: 0,
          customer_name: customer.trim() || null,
          seller: seller || null,
          car: car.trim() || null,
          notes: notes.trim() || null,
          total,
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

  const catalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) return filteredProducts;
    if (car) return suggestedParts;
    return products.slice(0, 24);
  }, [search, filteredProducts, car, suggestedParts, products]);

  return (
    <div className="max-w-7xl mx-auto pb-24 lg:pb-0">
      {/* Header minimalista */}
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6 border-b pb-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
            {isEdit ? "Editando" : "Novo"}
          </div>
          <h1 className="text-3xl font-light text-foreground">
            Orçamento{quoteNumber ? <span className="text-primary font-mono ml-2">#{String(quoteNumber).padStart(4, "0")}</span> : null}
          </h1>
        </div>
        <Button variant="ghost" onClick={() => nav("/")} className="text-muted-foreground">Cancelar</Button>
      </div>

      {/* Barra de seletores compacta */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Mecânico</Label>
          <Select value={customer || "__none__"} onValueChange={(v) => setCustomer(v === "__none__" ? "" : v)}>
            <SelectTrigger className="h-9 border-0 border-b rounded-none bg-transparent px-1 focus:ring-0 focus:border-primary">
              <SelectValue placeholder={mechanics.length ? "Selecione" : "Cadastre em Mecânicos"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {mechanics.map((m) => (<SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Vendedor</Label>
          <Select value={seller} onValueChange={setSeller}>
            <SelectTrigger className="h-9 border-0 border-b rounded-none bg-transparent px-1 focus:ring-0 focus:border-primary">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {SELLERS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Carro</Label>
          <Select value={car || "__none__"} onValueChange={(v) => setCar(v === "__none__" ? "" : v)}>
            <SelectTrigger className="h-9 border-0 border-b rounded-none bg-transparent px-1 focus:ring-0 focus:border-primary">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {CARS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Observações</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Opcional"
            className="h-9 border-0 border-b rounded-none bg-transparent px-1 focus-visible:ring-0 focus-visible:border-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Catálogo lista */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar produto..."
              className="pl-10 h-11 bg-card/60 border-border/60"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="flex items-center gap-1.5">
              {car && !search.trim() ? <><Sparkles className="w-3 h-3 text-accent" /> Sugeridos para {car}</>
                : search.trim() ? <><Search className="w-3 h-3" /> Resultados</>
                : <><Package className="w-3 h-3" /> Catálogo</>}
            </span>
            <span>{catalog.length} {catalog.length === 1 ? "item" : "itens"}</span>
          </div>

          <div className="border rounded-lg bg-card/40 divide-y max-h-[65vh] overflow-y-auto">
            {catalog.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Nenhum produto encontrado
              </div>
            ) : (
              catalog.map((p) => {
                const added = items.some((i) => i.product_id === p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addItem(p.id)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 ${
                      added ? "bg-accent/5" : ""
                    }`}
                  >
                    <div className={`w-1 h-8 rounded-full transition-colors ${added ? "bg-accent" : "bg-transparent"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      {p.description && <div className="text-xs text-muted-foreground truncate">{p.description}</div>}
                    </div>
                    <div className="text-sm font-mono font-semibold text-primary whitespace-nowrap">R$ {Number(p.price).toFixed(2)}</div>
                    <Plus className={`w-4 h-4 transition-colors ${added ? "text-accent" : "text-muted-foreground"}`} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Carrinho lateral minimal */}
        <div className="lg:col-span-2 lg:sticky lg:top-20 lg:self-start">
          <div className="border rounded-lg bg-card/60 backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShoppingCart className="w-4 h-4" /> Itens
                <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
              </div>
              {items.length > 0 && (
                <button onClick={() => setItems([])} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                  Limpar
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground px-4">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Selecione produtos do catálogo
              </div>
            ) : (
              <div className="divide-y max-h-[45vh] overflow-y-auto">
                {items.map((i, idx) => (
                  <div key={idx} className="px-4 py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium flex-1 line-clamp-2">{i.product_name}</div>
                      <button onClick={() => setItems(items.filter((_, k) => k !== idx))} className="text-muted-foreground hover:text-destructive shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input type="number" min="1" value={i.quantity}
                        onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                        className="h-8 w-14 text-center" />
                      <span className="text-xs text-muted-foreground">×</span>
                      <Input type="number" step="0.01" min="0" value={i.unit_price}
                        onChange={(e) => updateItem(idx, { unit_price: Math.max(0, Number(e.target.value)) })}
                        className="h-8 flex-1 font-mono text-sm" />
                      <span className="text-sm font-mono font-semibold whitespace-nowrap min-w-[80px] text-right">
                        R$ {(i.quantity * i.unit_price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t px-4 py-4 bg-muted/30">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="text-3xl font-light text-primary font-mono">R$ {total.toFixed(2)}</span>
              </div>
              <Button onClick={save} disabled={saving || items.length === 0} className="w-full" size="lg">
                <Save className="w-4 h-4 mr-2" /> {saving ? "Salvando..." : "Finalizar orçamento"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteNew;
