import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Save, Search, Package } from "lucide-react";
import { toast } from "sonner";

interface Product { id: string; name: string; price: number; }
interface Item { product_id: string; product_name: string; quantity: number; unit_price: number; }

const QuoteNew = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("products").select("id,name,price").order("name").then(({ data }) => {
      setProducts((data ?? []) as Product[]);
    });
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

  const save = async () => {
    if (items.length === 0) { toast.error("Adicione ao menos 1 item"); return; }
    setSaving(true);
    try {
      const { data: quote, error } = await supabase.from("quotes").insert({
        user_id: user!.id,
        quote_number: 0, // trigger sets
        customer_name: customer.trim() || null,
        notes: notes.trim() || null,
        total,
      }).select().single();
      if (error) throw error;

      const { error: itErr } = await supabase.from("quote_items").insert(
        items.map((i) => ({
          quote_id: quote.id, product_id: i.product_id, product_name: i.product_name,
          quantity: i.quantity, unit_price: i.unit_price, subtotal: i.quantity * i.unit_price,
        }))
      );
      if (itErr) throw itErr;

      toast.success(`Orçamento #${String(quote.quote_number).padStart(4, "0")} criado`);
      nav(`/orcamentos/${quote.id}`);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-primary">Novo orçamento</h1>
        <p className="text-sm text-muted-foreground">Adicione produtos e gere a notinha</p>
      </div>

      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Nome do cliente (opcional)</Label><Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Ex: João Silva" maxLength={120} /></div>
          <div><Label>Observações (opcional)</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} /></div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Itens</CardTitle>
          <div className="w-72">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-muted-foreground font-normal">
                  <Search className="w-4 h-4 mr-2" /> Pesquisar produto...
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0" align="end">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Digite o nome..." value={search} onValueChange={setSearch} />
                  <CommandList>
                    <CommandEmpty>Nenhum produto encontrado</CommandEmpty>
                    <CommandGroup>
                      {products
                        .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
                        .slice(0, 50)
                        .map((p) => (
                          <CommandItem
                            key={p.id}
                            value={p.id}
                            onSelect={() => { addItem(p.id); setSearch(""); setPickerOpen(false); }}
                          >
                            <span className="flex-1 truncate">{p.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground font-mono">R$ {Number(p.price).toFixed(2)}</span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
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
