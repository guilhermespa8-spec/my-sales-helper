import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Trash2, Plus, Minus, Receipt, ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
}

interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const PDV = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [seller, setSeller] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [pieceType, setPieceType] = useState("");
  const [sellersList, setSellersList] = useState<{ id: string; name: string }[]>([]);
  const [finishing, setFinishing] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sellers").select("id,name").order("name");
      if (data) setSellersList(data as { id: string; name: string }[]);
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const q = search.trim();
        const r = q
          ? await supabase.rpc("search_products", { search_term: q })
          : await supabase.from("products").select("id,name,description,price,stock").order("name").limit(50);
        if (!r.error) setProducts((r.data ?? []) as Product[]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const addToCart = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const existing = cart.find((i) => i.product_id === p.id);
    if (existing) {
      setCart(cart.map((i) => (i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setCart([...cart, { product_id: p.id, product_name: p.name, quantity: 1, unit_price: Number(p.price) }]);
    }
    setSearch("");
    searchRef.current?.focus();
  };

  const updateQty = (id: string, delta: number) => {
    setCart(
      cart
        .map((i) => (i.product_id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeItem = (id: string) => setCart(cart.filter((i) => i.product_id !== id));

  const updatePrice = (id: string, price: number) => {
    setCart(cart.map((i) => (i.product_id === id ? { ...i, unit_price: Math.max(0, price) } : i)));
  };

  const total = useMemo(() => cart.reduce((s, i) => s + i.quantity * i.unit_price, 0), [cart]);

  const finishSale = async () => {
    if (cart.length === 0) {
      toast.error("Adicione ao menos 1 item");
      return;
    }
    if (!paymentMethod) {
      toast.error("Selecione a forma de pagamento");
      return;
    }
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
        const { data: p } = await supabase.from("products").select("stock").eq("id", i.product_id).single();
        if (p) {
          await supabase
            .from("products")
            .update({ stock: Math.max(0, Number(p.stock) - i.quantity) })
            .eq("id", i.product_id);
        }
      }

      toast.success(`Venda finalizada: ${brl(total)}`);
      setCart([]);
      nav("/vendas");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao finalizar venda");
    } finally {
      setFinishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="PDV" description="Registre vendas rapidamente">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-3xl font-bold text-foreground">{brl(total)}</p>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  ref={searchRef}
                  placeholder="Buscar produto por nome ou código de barras..."
                  className="pl-9 h-12 text-base"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && products.length > 0) addToCart(products[0].id);
                  }}
                />
              </div>
              {searching && <p className="text-xs text-muted-foreground mt-2">Buscando...</p>}
              {search && !searching && products.length > 0 && (
                <div className="mt-3 border rounded-lg divide-y max-h-64 overflow-y-auto">
                  {products.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">{p.name}</p>
                        <p className="text-xs text-muted-foreground">Estoque: {p.stock}</p>
                      </div>
                      <span className="font-semibold text-foreground">{brl(Number(p.price))}</span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" /> Itens da venda
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Carrinho vazio</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.product_id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">{brl(item.unit_price)} un</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => updateQty(item.product_id, -1)}>
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-semibold">{item.quantity}</span>
                        <Button variant="outline" size="icon" onClick={() => updateQty(item.product_id, 1)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => updatePrice(item.product_id, Number(e.target.value))}
                          className="w-28"
                        />
                        <span className="font-bold w-24 text-right">{brl(item.quantity * item.unit_price)}</span>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(item.product_id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Receipt className="w-5 h-5" /> Finalizar venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select value={seller} onValueChange={setSeller}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellersList.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Forma de pagamento *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                    <SelectItem value="Pix">Pix</SelectItem>
                    <SelectItem value="Fiado">Fiado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de peça</Label>
                <Select value={pieceType} onValueChange={setPieceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Peça">Peça</SelectItem>
                    <SelectItem value="Peça Separada">Peça Separada</SelectItem>
                    <SelectItem value="LED">LED</SelectItem>
                    <SelectItem value="Vonixx">Vonixx</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-medium">Total</span>
                  <span className="text-2xl font-bold">{brl(total)}</span>
                </div>
                <Button className="w-full h-12 text-base" onClick={finishSale} disabled={finishing || cart.length === 0}>
                  {finishing ? "Finalizando..." : "Finalizar venda"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PDV;
