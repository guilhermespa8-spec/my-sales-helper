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

interface Product { id: string; name: string; description: string | null; price: number; car_filter?: string | null; }
interface Item { product_id: string; product_name: string; quantity: number; unit_price: number; }
interface Mechanic { id: string; name: string; }
interface CarRecord { id: string; name: string; notes: string | null; }

const QuoteNew = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const isEdit = Boolean(editId);
  const [products, setProducts] = useState<Product[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [carsList, setCarsList] = useState<CarRecord[]>([]);
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
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Cabeçalho Minimalista */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight">
            {isEdit ? "Editar Orçamento" : "Novo Orçamento"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preencha os dados e adicione os itens para gerar o orçamento.
            {quoteNumber && <span className="ml-2 font-mono font-bold text-primary">#{String(quoteNumber).padStart(4, "0")}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => nav("/")}>
            <X className="w-4 h-4 mr-2" /> Cancelar
          </Button>
          <Button onClick={save} disabled={saving || items.length === 0} size="sm" className="shadow-sm">
            <Save className="w-4 h-4 mr-2" /> {saving ? "Salvando..." : "Finalizar Orçamento"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Lado Esquerdo: Dados e Busca */}
        <div className="lg:col-span-7 space-y-8">
          {/* Card de Dados */}
          <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Mecânico</Label>
                <Select value={customer || "__none__"} onValueChange={(v) => setCustomer(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="bg-background border-muted-foreground/20">
                    <SelectValue placeholder={mechanics.length ? "Selecione" : "Cadastre em Mecânicos"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {mechanics.map((m) => (<SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Vendedor</Label>
                <Select value={seller} onValueChange={setSeller}>
                  <SelectTrigger className="bg-background border-muted-foreground/20">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {SELLERS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Carro</Label>
                <Select value={car || "__none__"} onValueChange={(v) => setCar(v === "__none__" ? "" : v)}>
                  <SelectTrigger className="bg-background border-muted-foreground/20">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {CARS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Observações</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Notas do orçamento"
                  className="bg-background border-muted-foreground/20 focus-visible:ring-primary/20" />
              </div>
            </CardContent>
          </Card>

          {/* Busca de Produtos */}
          <div className="space-y-4">
            <div className="relative group">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar produtos (Ctrl+K)..."
                className="pl-12 h-14 text-lg bg-background border-muted-foreground/20 rounded-xl shadow-sm focus-visible:ring-primary/20 focus-visible:border-primary transition-all"
                autoFocus
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="bg-card/30 rounded-xl border border-muted-foreground/10 overflow-hidden divide-y divide-muted-foreground/10">
              <div className="px-4 py-2 bg-muted/50 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                <span>{search.trim() ? "Resultados da Busca" : car ? `Sugeridos para ${car}` : "Catálogo"}</span>
                <span>{catalog.length} itens</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto divide-y divide-muted-foreground/5 scrollbar-thin">
                {catalog.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground italic">Nenhum produto encontrado</div>
                ) : (
                  catalog.map((p) => {
                    const added = items.find((i) => i.product_id === p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addItem(p.id)}
                        className="w-full text-left flex items-center gap-4 px-5 py-4 transition-colors hover:bg-primary/5 group"
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                          added ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground group-hover:bg-primary/10"
                        }`}>
                          {added ? <span className="text-xs font-bold">{added.quantity}</span> : <Plus className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.description || "Sem descrição"}</div>
                        </div>
                        <div className="text-base font-mono font-bold text-primary">
                          R$ {Number(p.price).toFixed(2)}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito: Carrinho */}
        <div className="lg:col-span-5 lg:sticky lg:top-8">
          <Card className="border-none shadow-lg bg-card overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10 flex flex-row items-center justify-between py-5">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                Resumo do Pedido
              </CardTitle>
              <div className="px-2 py-1 rounded-full border bg-background/50 text-[10px] font-bold uppercase tracking-wider">{items.length} itens</div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto divide-y divide-muted-foreground/5 scrollbar-thin">
                {items.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-muted-foreground text-sm gap-3 italic">
                    <Package className="w-10 h-10 opacity-20" />
                    Adicione itens ao carrinho
                  </div>
                ) : (
                  items.map((i, idx) => (
                    <div key={idx} className="px-6 py-4 space-y-3 group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="text-sm font-semibold text-foreground leading-tight flex-1">{i.product_name}</div>
                        <button onClick={() => setItems(items.filter((_, k) => k !== idx))}
                          className="text-muted-foreground/50 hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-muted-foreground/5">
                          <button onClick={() => updateItem(idx, { quantity: Math.max(1, i.quantity - 1) })}
                            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background transition-colors">
                            <Minus className="w-3 h-3 text-muted-foreground" />
                          </button>
                          <span className="w-10 text-center text-sm font-bold">{i.quantity}</span>
                          <button onClick={() => updateItem(idx, { quantity: i.quantity + 1 })}
                            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-background transition-colors">
                            <Plus className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                        <div className="flex-1 max-w-[120px]">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">R$</span>
                            <Input type="number" step="0.01" min="0" value={i.unit_price}
                              onChange={(e) => updateItem(idx, { unit_price: Math.max(0, Number(e.target.value)) })}
                              className="h-9 pl-6 font-mono text-xs bg-background/50 border-muted-foreground/10" />
                          </div>
                        </div>
                        <div className="text-sm font-mono font-bold text-foreground text-right min-w-[90px]">
                          R$ {(i.quantity * i.unit_price).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totais */}
              <div className="p-6 bg-primary/5 space-y-6 border-t border-primary/10">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Total Geral</span>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-primary font-mono tracking-tighter">
                      R$ {total.toFixed(2)}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {items.reduce((s, i) => s + i.quantity, 0)} volumes selecionados
                    </p>
                  </div>
                </div>
                <Button onClick={save} disabled={saving || items.length === 0} size="lg" className="w-full shadow-lg shadow-primary/20 h-14 text-lg font-bold">
                  {saving ? "Salvando Orçamento..." : "Confirmar Venda"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default QuoteNew;
