import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Search, Package, ShoppingCart, X, Sparkles } from "lucide-react";
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
    <div className="max-w-7xl mx-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {isEdit ? `Editar orçamento${quoteNumber ? ` #${String(quoteNumber).padStart(4, "0")}` : ""}` : "Novo orçamento"}
          </h1>
          <p className="text-sm text-muted-foreground">Catálogo de produtos + carrinho</p>
        </div>
        <Button variant="outline" onClick={() => nav("/")}>Cancelar</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Catálogo */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-[var(--shadow-soft)]">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar produto..."
                  className="pl-12 h-12 text-base"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {car && !search.trim() ? (
                  <>
                    <Sparkles className="w-4 h-4 text-accent" />
                    Peças sugeridas para {car}
                  </>
                ) : search.trim() ? (
                  <>
                    <Search className="w-4 h-4" /> Resultados
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" /> Catálogo
                  </>
                )}
                <span className="text-xs font-normal text-muted-foreground">({catalog.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {catalog.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  Nenhum produto encontrado
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                  {catalog.map((p) => {
                    const added = items.some((i) => i.product_id === p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addItem(p.id)}
                        className={`group text-left p-3 rounded-lg border transition-all hover:shadow-md hover:border-primary hover:-translate-y-0.5 ${
                          added ? "border-accent bg-accent/5" : "border-border bg-card/60"
                        }`}
                      >
                        <div className="aspect-square rounded-md bg-gradient-to-br from-muted to-muted/40 mb-2 flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                        </div>
                        <div className="text-xs font-medium line-clamp-2 min-h-[2.5rem]">{p.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-bold text-primary font-mono">R$ {Number(p.price).toFixed(2)}</span>
                          {added && <span className="text-[10px] text-accent">✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Carrinho lateral */}
        <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-3"><CardTitle className="text-base">Dados</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Cliente</Label>
                <Select value={customer || "__none__"} onValueChange={(v) => setCustomer(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    <SelectItem value="Padrão">Padrão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vendedor</Label>
                <Select value={seller} onValueChange={setSeller}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {SELLERS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Carro</Label>
                <Select value={car || "__none__"} onValueChange={(v) => setCar(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {CARS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-[var(--shadow-soft)] border-primary/30">
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Carrinho
                <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-1 opacity-40" />
                  Carrinho vazio
                </div>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {items.map((i, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-muted/40 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium flex-1 line-clamp-2">{i.product_name}</div>
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setItems(items.filter((_, k) => k !== idx))}>
                          <X className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" min="1" value={i.quantity} onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value)) })} className="h-8 w-16" />
                        <span className="text-xs text-muted-foreground">×</span>
                        <Input type="number" step="0.01" min="0" value={i.unit_price} onChange={(e) => updateItem(idx, { unit_price: Math.max(0, Number(e.target.value)) })} className="h-8 flex-1" />
                        <span className="text-xs font-mono font-semibold whitespace-nowrap">R$ {(i.quantity * i.unit_price).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-gradient-to-br from-primary/10 to-transparent p-3 rounded-lg text-right border-t-2 border-primary/20">
                <div className="text-xs uppercase text-muted-foreground tracking-wide">Total</div>
                <div className="text-3xl font-bold text-primary font-mono">R$ {total.toFixed(2)}</div>
              </div>

              <Button onClick={save} disabled={saving} className="w-full" size="lg">
                <Save className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Finalizar orçamento"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QuoteNew;
