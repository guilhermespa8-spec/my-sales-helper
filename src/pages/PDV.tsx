import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Search, X, Command, Delete, CheckCheck } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
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
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [pieceType, setPieceType] = useState<string>("");
  const [discount, setDiscount] = useState(0);
  const [sellersList, setSellersList] = useState<{ id: string; name: string }[]>([]);
  const [finishing, setFinishing] = useState(false);

  const [templates, setTemplates] = useState<TemplateRow[]>([]);

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

  const applyTemplate = async (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const ids = t.quote_template_items.map((i) => i.product_id).filter(Boolean) as string[];
    const { data: prods } = ids.length
      ? await supabase.from("products").select("id,price").in("id", ids)
      : { data: [] as { id: string; price: number }[] };
    const priceOf = new Map((prods ?? []).map((p) => [p.id, Number(p.price)]));
    setCart(
      t.quote_template_items.map((i) => ({
        product_id: i.product_id ?? crypto.randomUUID(),
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.product_id ? priceOf.get(i.product_id) ?? 0 : 0,
      }))
    );
    toast.success(`Modelo "${t.car_name}" carregado`);
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
              .select("id,name,description,price,stock")
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
          customer_name: null,
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

      toast.success(`Venda finalizada — ${brl(total)}`);
      setCart([]);
      setDiscount(0);
      setPaymentMethod("");
      setPieceType("");
      nav("/");
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="stripe-title text-2xl sm:text-3xl">Orçamento</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Busque as peças, ajuste valores e finalize.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {templates.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) void applyTemplate(e.target.value);
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
          <span className="hidden sm:flex items-center gap-1.5 rule-label">
            <Command className="w-3.5 h-3.5" /> F2 buscar · F4 finalizar
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px] items-start">
        {/* Busca e resultados */}
        <section className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={onSearchKey}
                placeholder="Bipe o código ou digite o nome da peça"
                className="pl-9 pr-9 h-12 text-base"
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
          </div>

          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin divide-y divide-border">
            {searching && <p className="p-4 rule-label">Buscando...</p>}
            {!searching && products.length === 0 && (
              <p className="p-4 rule-label">Nenhuma peça encontrada</p>
            )}
            {products.map((p, idx) => {
              const out = Number(p.stock) <= 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  onMouseEnter={() => setCursor(idx)}
                  onClick={() => addToCart(p)}
                  className={cn(
                    "w-full text-left px-4 py-3 flex items-center gap-4 transition-colors",
                    idx === cursor ? "bg-secondary" : "hover:bg-secondary/60"
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{p.name}</span>
                    <span
                      className={cn("rule-label", out ? "text-destructive" : "")}
                    >
                      {out ? "Sem estoque" : `${p.stock} un disponíveis`}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums text-primary shrink-0">
                    {brl(Number(p.price))}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Orçamento atual */}
        <aside className="rounded-xl border border-border bg-card lg:sticky lg:top-20">
          <div className="px-5 py-4 border-b border-border flex items-baseline justify-between">
            <span className="font-display text-lg">Itens</span>
            <span className="rule-label">{itemCount} no orçamento</span>
          </div>

          <div className="max-h-[38vh] overflow-y-auto scrollbar-thin divide-y divide-border">
            {cart.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                Nenhuma peça adicionada ainda.
              </p>
            ) : (
              cart.map((i) => (
                <div key={i.product_id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold leading-snug flex-1">{i.product_name}</p>
                    <button
                      type="button"
                      onClick={() => setQty(i.product_id, 0)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remover item"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex items-center rounded-md border border-border overflow-hidden">
                      <button
                        type="button"
                        className="w-8 h-8 text-lg leading-none hover:bg-secondary"
                        onClick={() => setQty(i.product_id, i.quantity - 1)}
                      >
                        −
                      </button>
                      <span className="w-9 text-center text-sm font-semibold tabular-nums">
                        {i.quantity}
                      </span>
                      <button
                        type="button"
                        className="w-8 h-8 text-lg leading-none hover:bg-secondary"
                        onClick={() => setQty(i.product_id, i.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={i.unit_price}
                      onChange={(e) => setPrice(i.product_id, Number(e.target.value))}
                      className="h-8 w-24 tabular-nums"
                    />
                    <span className="ml-auto text-sm font-semibold tabular-nums">
                      {brl(i.quantity * i.unit_price)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
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
                <span className="rule-label">Desconto</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="mt-1 h-10 tabular-nums"
                />
              </label>
            </div>

            <div>
              <span className="rule-label">Pagamento</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {PAYMENTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPaymentMethod(p)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                      paymentMethod === p
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-secondary"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

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

            <div className="pt-3 border-t border-border space-y-1">
              <div className="flex justify-between rule-label">
                <span>Subtotal</span>
                <span className="tabular-nums">{brl(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between rule-label text-destructive">
                  <span>Desconto</span>
                  <span className="tabular-nums">-{brl(discount)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between pt-1">
                <span className="rule-label">Total</span>
                <span className="font-display text-3xl leading-none text-primary tabular-nums">
                  {brl(total)}
                </span>
              </div>
            </div>

            <Button
              className="w-full h-12 text-base"
              onClick={finishSale}
              disabled={finishing || cart.length === 0}
            >
              <CheckCheck className="w-5 h-5 mr-2" />
              {finishing ? "Finalizando..." : "Finalizar (F4)"}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
};


export default PDV;
