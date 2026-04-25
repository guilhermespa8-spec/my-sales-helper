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
    const c = car.trim().toLowerCase();
    let base = products;
    if (c) {
      base = base.filter((p) => (p.description ?? "").toLowerCase().includes(c));
    }
    if (!q) return c ? base : [];
    return base.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q)
    );
  }, [products, search, car]);

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
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-primary">{isEdit ? `Editar orçamento${quoteNumber ? ` #${String(quoteNumber).padStart(4, "0")}` : ""}` : "Novo orçamento"}</h1>
        <p className="text-sm text-muted-foreground">Adicione produtos e gere a notinha</p>
      </div>

      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Nome do cliente (opcional)</Label><Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Ex: João Silva" maxLength={120} /></div>
          <div>
            <Label>Nome do vendedor</Label>
            <Select value={seller} onValueChange={setSeller}>
              <SelectTrigger><SelectValue placeholder="Selecione o vendedor" /></SelectTrigger>
              <SelectContent>
                {SELLERS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Observações (opcional)</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} /></div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Itens</CardTitle>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar produto por nome..."
              className="pl-9"
            />
          </div>
          {search.trim() && (
            <div className="border rounded-lg max-h-72 overflow-auto divide-y">
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
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
              <Plus className="w-8 h-8 mx-auto mb-1 opacity-40" />
              Selecione um produto acima para adicionar
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
              <div className="flex justify-end pt-3 border-t">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-2xl font-bold text-primary font-mono">R$ {total.toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => nav("/")}>Cancelar</Button>
        <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar orçamento"}</Button>
      </div>
    </div>
  );
};

export default QuoteNew;
