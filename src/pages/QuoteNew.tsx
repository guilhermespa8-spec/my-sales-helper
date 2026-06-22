import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, X, Plus, Minus, Trash2, ArrowLeft, ChevronDown } from "lucide-react";

interface Product { id: string; name: string; description: string | null; price: number; }
interface Item { product_id: string; product_name: string; quantity: number; unit_price: number; }

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

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

  const totalParts = brl(total).split(/\s/);
  const totalCurrency = totalParts[0];
  const totalValue = totalParts.slice(1).join(" ");

  return (
    <div className="min-h-[calc(100vh-4rem)] w-full flex items-start justify-center bg-[#0a0c10] -mx-4 md:-mx-8 -my-4 md:-my-8 px-6 py-10">
      <div className="w-full max-w-4xl bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center gap-3">
          <button
            onClick={() => nav("/orcamentos")}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              {isEdit ? "Editar Orçamento" : "Novo Orçamento"}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Preencha os dados para gerar uma nova proposta comercial.
            </p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1 block">Vendedor</label>
              <div className="relative">
                <select
                  value={seller}
                  onChange={(e) => setSeller(e.target.value)}
                  className="w-full bg-slate-800/50 border border-white/10 text-white rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                >
                  <option value="" className="bg-slate-900">Selecione o vendedor</option>
                  {sellersList.map((s) => (
                    <option key={s.id} value={s.name} className="bg-slate-900">{s.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider ml-1 block">Produto</label>
              <div className="relative">
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
                  onFocus={() => setShowResults(true)}
                  placeholder="Buscar por nome ou descrição..."
                  className="w-full bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-3 pl-11 pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
                <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                {search && (
                  <button
                    onClick={() => { setSearch(""); setShowResults(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {showResults && search && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                    {searching ? (
                      <div className="p-4 text-center text-slate-400 text-sm">Buscando...</div>
                    ) : products.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-sm">Nenhum produto encontrado</div>
                    ) : (
                      products.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => addItem(p.id)}
                          className="w-full text-left px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-white truncate">{p.name}</p>
                            <p className="text-xs text-slate-500 line-clamp-1">{p.description || "—"}</p>
                          </div>
                          <span className="font-mono font-semibold text-indigo-300 shrink-0 tabular-nums">{brl(p.price)}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="rounded-2xl border border-white/5 bg-slate-950/30 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase">Produto</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase text-center w-40">Qtd</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase text-right w-36">Preço Unit.</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-300 uppercase text-right w-36">Total</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-500 italic text-sm">
                      Use a busca acima para adicionar produtos
                    </td>
                  </tr>
                ) : (
                  items.map((i, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{i.product_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1 bg-slate-800/50 border border-white/10 rounded-lg w-fit mx-auto">
                          <button
                            onClick={() => updateItem(idx, { quantity: Math.max(1, i.quantity - 1) })}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-mono font-semibold w-8 text-center text-white">{i.quantity}</span>
                          <button
                            onClick={() => updateItem(idx, { quantity: i.quantity + 1 })}
                            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={i.unit_price}
                          onChange={(e) => updateItem(idx, { unit_price: Math.max(0, Number(e.target.value)) })}
                          className="w-28 h-9 bg-slate-800/50 border border-white/10 rounded-lg px-3 text-right font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                      </td>
                      <td className="px-6 py-4 text-right text-white font-semibold font-mono tabular-nums">
                        {brl(i.quantity * i.unit_price)}
                      </td>
                      <td className="px-2 py-4 text-right">
                        <button
                          onClick={() => setItems(items.filter((_, k) => k !== idx))}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                          aria-label="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Summary */}
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-end gap-6 pt-4">
            <div className="flex gap-3 order-2 md:order-1">
              <Button
                variant="ghost"
                onClick={() => nav("/orcamentos")}
                className="px-6 py-3 h-auto rounded-xl border border-white/10 text-slate-300 font-medium hover:bg-white/5 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={save}
                disabled={saving || items.length === 0}
                className="px-6 py-3 h-auto rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
              >
                {saving ? "Salvando..." : "Gerar Orçamento"}
              </Button>
            </div>

            <div className="text-right order-1 md:order-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Valor Total</p>
              <div className="text-4xl font-bold text-white tabular-nums">
                <span className="text-indigo-400 text-2xl mr-1">{totalCurrency}</span>{totalValue}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuoteNew;
