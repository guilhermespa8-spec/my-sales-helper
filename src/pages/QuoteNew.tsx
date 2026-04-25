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
import { Plus, Trash2, Save, Search, Package } from "lucide-react";
import { toast } from "sonner";

const SELLERS = ["André", "João Victor", "Mateus", "Loja"] as const;
const CARS = ["Corsa VHC"] as const;

interface Product { id: string; name: string; description: string | null; price: number; }
interface Item { product_id: string; product_name: string; quantity: number; unit_price: number; }

const QuoteNew = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEdit = Boolean(editId);
  const [products, setProducts] = useState<Product[]>([]);
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

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            {isEdit ? `Editar orçamento${quoteNumber ? ` #${String(quoteNumber).padStart(4, "0")}` : ""}` : "Novo orçamento (PDV)"}
          </h1>
          <p className="text-sm text-muted-foreground">Pesquise, adicione e finalize</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => nav("/")}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Finalizar"}
          </Button>
        </div>
      </div>

      {/* Barra de pesquisa grande estilo PDV */}
      <Card className="shadow-[var(--shadow-soft)]">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar produto por nome ou descrição..."
              className="pl-12 h-14 text-base"
              autoFocus
            />
          </div>
          {search.trim() && (
            <div className="border rounded-lg max-h-64 overflow-auto divide-y">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { addItem(p.id); setSearch(""); }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                >
                  <span className="flex-1 truncate text-sm">{p.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">R$ {Number(p.price).toFixed(2)}</span>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  <Package className="w-8 h-8 mx-auto mb-1 opacity-40" />
                  Nenhum produto encontrado para "{search}"
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Coluna principal: itens */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Itens do orçamento</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Plus className="w-8 h-8 mx-auto mb-1 opacity-40" />
                  Pesquise um produto acima para começar
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((i, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg bg-muted/40">
                      <div className="col-span-12 sm:col-span-5 font-medium">{i.product_name}</div>
                      <div className="col-span-4 sm:col-span-2">
                        <Label className="text-xs">Qtd</Label>
                        <Input type="number" min="1" value={i.quantity} onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value)) })} />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <Label className="text-xs">Preço un.</Label>
                        <Input type="number" step="0.01" min="0" value={i.unit_price} onChange={(e) => updateItem(idx, { unit_price: Math.max(0, Number(e.target.value)) })} />
                      </div>
                      <div className="col-span-3 sm:col-span-2 text-right font-mono font-semibold">R$ {(i.quantity * i.unit_price).toFixed(2)}</div>
                      <div className="col-span-1 text-right">
                        <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, k) => k !== idx))}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {car && (
            <Card className="shadow-[var(--shadow-soft)] border-accent/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-accent" />
                  Peças Sugeridas
                  <span className="text-xs font-normal text-muted-foreground">({suggestedParts.length} para {car})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {suggestedParts.length === 0 ? (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Nenhuma peça com observação "{car}" encontrada.
                  </div>
                ) : (
                  <div className="border rounded-lg max-h-72 overflow-auto divide-y">
                    {suggestedParts.map((p) => {
                      const added = items.some((i) => i.product_id === p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addItem(p.id)}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
                        >
                          <span className="flex-1 truncate text-sm">
                            {p.name}
                            {added && <span className="ml-2 text-xs text-success">✓ adicionado</span>}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">R$ {Number(p.price).toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Coluna lateral: dados + total destacado */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="shadow-[var(--shadow-soft)] border-primary/30">
            <CardContent className="p-5 text-right bg-gradient-to-br from-primary/10 to-transparent rounded-lg">
              <div className="text-xs uppercase text-muted-foreground tracking-wide">Total</div>
              <div className="text-4xl font-bold text-primary font-mono">R$ {total.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1">{items.length} {items.length === 1 ? "item" : "itens"}</div>
            </CardContent>
          </Card>

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
                  <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
                  <SelectContent>
                    {SELLERS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Carro (opcional)</Label>
                <Select value={car || "__none__"} onValueChange={(v) => setCar(v === "__none__" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione o carro" /></SelectTrigger>
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
        </div>
      </div>
    </div>
  );
};

export default QuoteNew;
