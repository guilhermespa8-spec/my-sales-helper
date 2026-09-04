import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Search, X, Command, Delete, CheckCheck } from "lucide-react";
import Receipt, { type ReceiptData } from "@/components/Receipt";

interface Product {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  price: number;
  stock: number;
}

interface TemplateRow {
  id: string;
  car_name: string;
  car_year: string | null;
  car_engine: string | null;
  quote_template_items: { product_id: string | null; product_name: string; quantity: number }[];
}

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const PAYMENTS = ["Dinheiro", "Pix", "Cartão de Débito", "Cartão de Crédito", "Fiado"] as const;
const PIECE_TYPES = ["Peça", "Peça Separada", "LED", "Vonixx"] as const;

const PDV = () => {
  const { user } = useAuth();
  const nav = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [cursor, setCursor] = useState(0);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [seller, setSeller] = useState("");
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [pieceType, setPieceType] = useState<string>("");
  const [discount, setDiscount] = useState(0);
  const [sellersList, setSellersList] = useState<{ id: string; name: string }[]>([]);
  const [finishing, setFinishing] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTitle, setPickerTitle] = useState("");
  const [pickerItems, setPickerItems] = useState<CartItem[]>([]);
  const [pickerSel, setPickerSel] = useState<Set<string>>(new Set());


  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sellers").select("id,name").order("name");
      if (data) setSellersList(data as { id: string; name: string }[]);
      const { data: tpl } = await supabase
        .from("quote_templates")
        .select("id,car_name,car_year,car_engine,quote_template_items(product_id,product_name,quantity)")
        .order("car_name");
      if (tpl) setTemplates(tpl as TemplateRow[]);
    })();
    searchRef.current?.focus();
  }, []);

  const openTemplate = async (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const ids = t.quote_template_items.map((i) => i.product_id).filter(Boolean) as string[];
    const { data: prods } = ids.length
      ? await supabase.from("products").select("id,price").in("id", ids)
      : { data: [] as { id: string; price: number }[] };
    const priceOf = new Map((prods ?? []).map((p) => [p.id, Number(p.price)]));
    const items: CartItem[] = t.quote_template_items.map((i) => ({
      product_id: i.product_id ?? crypto.randomUUID(),
      product_name: i.product_name,
      quantity: i.quantity,
      unit_price: i.product_id ? priceOf.get(i.product_id) ?? 0 : 0,
    }));
    setPickerTitle([t.car_name, t.car_year, t.car_engine].filter(Boolean).join(" · "));
    setPickerItems(items);
    setPickerSel(new Set());
    setPickerOpen(true);
  };

  const pickerGroups = useMemo(() => {
    const map = new Map<string, CartItem[]>();
    for (const i of pickerItems) {
      const cat = (i.product_name.trim().split(/\s+/)[0] || "OUTROS").toUpperCase();
      map.set(cat, [...(map.get(cat) ?? []), i]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [pickerItems]);

  const confirmPicker = () => {
    const chosen = pickerItems.filter((i) => pickerSel.has(i.product_id));
    if (chosen.length === 0) return toast.error("Selecione ao menos uma peça");
    setCart((prev) => {
      const next = [...prev];
      for (const c of chosen) {
        const idx = next.findIndex((i) => i.product_id === c.product_id);
        if (idx >= 0) next[idx] = { ...next[idx], quantity: next[idx].quantity + c.quantity };
        else next.push(c);
      }
      return next;
    });
    setPickerOpen(false);
    toast.success(`${chosen.length} peça(s) adicionada(s)`);
  };


  useEffect(() => {
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const q = search.trim();
        const r = q
          ? await supabase.rpc("search_products", { search_term: q })
          : await supabase
              .from("products")
              .select("id,name,description,color,price,stock")
              .order("name")
              .limit(48);
        if (!r.error) setProducts((r.data ?? []) as Product[]);
        setCursor(0);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [search]);

  const addToCart = useCallback((p: Product) => {
    setCart((prev) => {
      const found = prev.find((i) => i.product_id === p.id);
      if (found) {
        return prev.map((i) => (i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        { product_id: p.id, product_name: p.name, quantity: 1, unit_price: Number(p.price) },
      ];
    });
    setSearch("");
    searchRef.current?.focus();
  }, []);

  const setQty = (id: string, qty: number) =>
    setCart((prev) =>
      prev.flatMap((i) =>
        i.product_id === id ? (qty <= 0 ? [] : [{ ...i, quantity: qty }]) : [i]
      )
    );

  const setPrice = (id: string, price: number) =>
    setCart((prev) =>
      prev.map((i) => (i.product_id === id ? { ...i, unit_price: Math.max(0, price) } : i))
    );

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.quantity * i.unit_price, 0),
    [cart]
  );
  const total = Math.max(0, subtotal - discount);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const finishSale = async () => {
    if (cart.length === 0) return toast.error("Nenhum item no cupom");
    if (!paymentMethod) return toast.error("Escolha a forma de pagamento");
    setFinishing(true);
    try {
      const { data: sale, error } = await supabase
        .from("sales")
        .insert({
          user_id: user!.id,
          total,
          payment_method: paymentMethod,
          piece_type: pieceType || null,
          customer_name: customer.trim() || null,
          seller_id: seller || null,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("sale_items").insert(
        cart.map((i) => ({
          sale_id: sale.id,
          product_id: i.product_id,
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          subtotal: i.quantity * i.unit_price,
        }))
      );

      for (const i of cart) {
        const { data: p } = await supabase
          .from("products")
          .select("stock")
          .eq("id", i.product_id)
          .single();
        if (p) {
          await supabase
            .from("products")
            .update({ stock: Math.max(0, Number(p.stock) - i.quantity) })
            .eq("id", i.product_id);
        }
      }

      setReceipt({
        number: String(sale.id).slice(0, 8).toUpperCase(),
        date: new Date().toLocaleString("pt-BR"),
        seller: sellersList.find((s) => s.id === seller)?.name,
        paymentMethod,
        pieceType,
        discount,
        total,
        items: cart.map((i) => ({
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
      });
      toast.success(`Venda finalizada — ${brl(total)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao finalizar venda");
    } finally {
      setFinishing(false);
    }
  };

  // Atalhos globais
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (e.key === "F4") {
        e.preventDefault();
        void finishSale();
      }
      if (e.key === "Escape") setSearch("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (products.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(products.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      addToCart(products[cursor] ?? products[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho do documento */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 border-b border-border">
          <h1 className="stripe-title text-lg sm:text-xl">
            Documento auxiliar de venda — <span className="text-primary">Orçamento</span>
          </h1>
          <span className="rule-label hidden sm:flex items-center gap-1.5">
            <Command className="w-3.5 h-3.5" /> F2 buscar · F4 finalizar
          </span>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[2fr_1fr_1fr]">
          <label className="block">
            <span className="rule-label">Cliente</span>
            <Input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Nome do cliente"
              className="mt-1 h-10"
            />
          </label>
          <label className="block">
            <span className="rule-label">Vendedor</span>
            <select
              value={seller}
              onChange={(e) => setSeller(e.target.value)}
              className="mt-1 w-full h-10 rounded-md bg-background border border-border px-2 text-sm"
            >
              <option value="">—</option>
              {sellersList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="rule-label">Forma de pagamento</span>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 w-full h-10 rounded-md bg-background border border-border px-2 text-sm"
            >
              <option value="">—</option>
              {PAYMENTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Produtos */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border">
          <span className="rule-label">Produtos</span>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={onSearchKey}
              placeholder="Incluir produto: bipe o código ou digite o nome"
              className="pl-9 pr-9 h-10"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {templates.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) void openTemplate(e.target.value);
                e.target.value = "";
              }}
              className="h-10 rounded-md bg-background border border-border px-2 text-sm"
              aria-label="Usar modelo pronto"
            >
              <option value="">Usar modelo pronto…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {[t.car_name, t.car_year, t.car_engine].filter(Boolean).join(" · ")}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Resultados da busca */}
        {search.trim() !== "" && (
          <div className="max-h-64 overflow-y-auto scrollbar-thin divide-y divide-border border-b border-border bg-secondary/30">
            {searching && <p className="p-4 rule-label">Buscando...</p>}
            {!searching && products.length === 0 && (
              <p className="p-4 rule-label">Nenhuma peça encontrada</p>
            )}
            {products.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onMouseEnter={() => setCursor(idx)}
                onClick={() => addToCart(p)}
                className={cn(
                  "w-full text-left px-4 py-2.5 flex items-center gap-4 transition-colors",
                  idx === cursor ? "bg-secondary" : "hover:bg-secondary/60"
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold truncate">{p.name}</span>
                  {(p.color || p.description) && (
                    <span className="block text-xs text-muted-foreground truncate">
                      {[p.color, p.description].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
                <span className={cn("rule-label", Number(p.stock) <= 0 && "text-destructive")}>
                  {Number(p.stock) <= 0 ? "Sem estoque" : `${p.stock} un`}
                </span>
                <span className="font-semibold tabular-nums text-primary shrink-0">
                  {brl(Number(p.price))}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Grade de itens */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="bg-secondary/60 text-left">
                <th className="px-3 py-2 w-14 rule-label">Item</th>
                <th className="px-3 py-2 w-28 rule-label">Código</th>
                <th className="px-3 py-2 rule-label">Produto</th>
                <th className="px-3 py-2 w-32 rule-label text-center">Qtd</th>
                <th className="px-3 py-2 w-32 rule-label text-right">Valor R$</th>
                <th className="px-3 py-2 w-32 rule-label text-right">Total R$</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nenhuma peça adicionada ainda.
                  </td>
                </tr>
              ) : (
                cart.map((i, idx) => (
                  <tr key={i.product_id} className="hover:bg-secondary/40">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {i.product_id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-3 py-2 font-medium">{i.product_name}</td>
                    <td className="px-3 py-2">
                      <div className="mx-auto flex w-fit items-center rounded-md border border-border overflow-hidden">
                        <button
                          type="button"
                          className="w-7 h-7 leading-none hover:bg-secondary"
                          onClick={() => setQty(i.product_id, i.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums">
                          {i.quantity}
                        </span>
                        <button
                          type="button"
                          className="w-7 h-7 leading-none hover:bg-secondary"
                          onClick={() => setQty(i.product_id, i.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={i.unit_price}
                        onChange={(e) => setPrice(i.product_id, Number(e.target.value))}
                        className="h-8 tabular-nums text-right"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {brl(i.quantity * i.unit_price)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => setQty(i.product_id, 0)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Excluir item"
                      >
                        <Delete className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rodapé: observações + totais */}
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <label className="block">
            <span className="rule-label">Observações</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-md bg-background border border-border p-2 text-sm resize-y"
            />
          </label>
          <div>
            <span className="rule-label">Tipo de peça</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {PIECE_TYPES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPieceType(pieceType === p ? "" : p)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                    pieceType === p
                      ? "bg-foreground text-background border-foreground"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="rule-label">Total produtos ({itemCount} itens)</span>
            <span className="font-semibold tabular-nums">{brl(subtotal)}</span>
          </div>
          <label className="flex items-center justify-between gap-3">
            <span className="rule-label">Desconto R$</span>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
              className="h-9 w-32 tabular-nums text-right"
            />
          </label>
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="rule-label">Total</span>
            <span className="font-display text-3xl leading-none text-primary tabular-nums">
              {brl(total)}
            </span>
          </div>
          <Button
            className="w-full h-12 text-base"
            onClick={finishSale}
            disabled={finishing || cart.length === 0}
          >
            <CheckCheck className="w-5 h-5 mr-2" />
            {finishing ? "Finalizando..." : "Fechar e imprimir (F4)"}
          </Button>
        </div>
      </div>


      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Escolher peças — {pickerTitle}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto space-y-4">
            {pickerGroups.map(([cat, items]) => (
              <div key={cat}>
                <p className="rule-label sticky top-0 bg-background py-1">{cat}</p>
                <div className="divide-y divide-border">
                  {items.map((i) => (
                    <label
                      key={i.product_id}
                      className="flex items-center gap-3 py-2.5 cursor-pointer"
                    >
                      <Checkbox
                        checked={pickerSel.has(i.product_id)}
                        onCheckedChange={() =>
                          setPickerSel((prev) => {
                            const next = new Set(prev);
                            if (next.has(i.product_id)) next.delete(i.product_id);
                            else next.add(i.product_id);
                            return next;
                          })
                        }
                      />
                      <span className="flex-1 text-sm">{i.product_name}</span>
                      <span className="rule-label">{i.quantity}x</span>
                      <span className="text-sm tabular-nums text-primary">{brl(i.unit_price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between gap-2">
            <Button
              variant="ghost"
              onClick={() =>
                setPickerSel((prev) =>
                  prev.size === pickerItems.length
                    ? new Set()
                    : new Set(pickerItems.map((i) => i.product_id))
                )
              }
            >
              Marcar/desmarcar todas
            </Button>
            <Button onClick={confirmPicker}>Adicionar selecionadas</Button>
          </div>
        </DialogContent>
      </Dialog>

      {receipt && (
        <Receipt
          data={receipt}
          onClose={() => {
            setReceipt(null);
            setCart([]);
            setDiscount(0);
            setPaymentMethod("");
            setPieceType("");
          }}
        />
      )}
    </div>


  );
};


export default PDV;
