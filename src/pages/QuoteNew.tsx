import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, X, Plus, Minus, Trash2, ArrowLeft, Save, User, Car as CarIcon, FileText } from "lucide-react";

const SELLERS = ["André", "João Victor", "Mateus", "Loja"] as const;
const PAYMENT_METHODS = ["Dinheiro", "Cartão de Crédito", "Cartão de Débito", "PIX", "Boleto", "Fiado"] as const;
const PIECE_TYPES = ["Nova", "Usada", "Recondicionada", "Outro"] as const;

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
  const [paymentMethod, setPaymentMethod] = useState<string>("Dinheiro");
  const [pieceType, setPieceType] = useState<string>("Nova");
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showConsulta, setShowConsulta] = useState(false);
  const [consultaSearch, setConsultaSearch] = useState("");
  const [consultaSelected, setConsultaSelected] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const consultaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 50); }
      if (e.key === "Escape") { setShowSearch(false); setSearch(""); }
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
      setPaymentMethod((q as any).payment_method ?? "Dinheiro");
      setPieceType((q as any).piece_type ?? "Nova");
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
    const loadStaticData = async () => {
      const [mecsRes, carsRes] = await Promise.all([
        supabase.from("mechanics").select("id,name").order("name"),
        supabase.from("cars").select("id,name,notes").order("name")
      ]);
      if (mecsRes.data) setMechanics(mecsRes.data as Mechanic[]);
      if (carsRes.data) setCarsList(carsRes.data as CarRecord[]);
    };
    loadStaticData();
  }, []);

  const fetchProducts = async (q: string) => {
    setSearching(true);
    try {
      const trimmedQ = q.trim();
      let response;
      if (trimmedQ) {
        response = await supabase.rpc('search_products', { search_term: trimmedQ });
      } else {
        response = await supabase.from("products").select("id,name,description,price,car_filter").order("name").limit(100);
      }
      if (response.error) { toast.error("Erro ao carregar produtos"); return; }
      setProducts((response.data ?? []) as Product[]);
    } finally { setSearching(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => { fetchProducts(search || consultaSearch); }, 300);
    return () => clearTimeout(timer);
  }, [search, consultaSearch]);

  const addItem = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    if (items.find((i) => i.product_id === p.id)) {
      setItems(items.map((i) => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, { product_id: p.id, product_name: p.name, quantity: 1, unit_price: Number(p.price) }]);
    }
    setSearch("");
    setShowSearch(false);
  };

  const updateItem = (idx: number, patch: Partial<Item>) => {
    setItems(items.map((i, k) => k === idx ? { ...i, ...patch } : i));
  };

  const total = useMemo(() => items.reduce((s, i) => s + i.quantity * i.unit_price, 0), [items]);
  const totalProdutos = total;
  const consultaResults = products;

  const openConsulta = () => {
    setShowConsulta(true);
    setConsultaSelected(null);
    setTimeout(() => consultaRef.current?.focus(), 50);
  };

  const confirmConsulta = () => {
    if (consultaSelected) {
      addItem(consultaSelected);
      setShowConsulta(false);
      setConsultaSearch("");
      setConsultaSelected(null);
    }
  };

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
          payment_method: paymentMethod,
          piece_type: pieceType,
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
          payment_method: paymentMethod,
          piece_type: pieceType,
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

  const numFmt = String(quoteNumber ?? 0).padStart(5, "0");

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 py-6 md:py-8">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => nav("/orcamentos")} className="rounded-full">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h1 className="text-xl font-black text-slate-900 leading-none">
              {isEdit ? "Editar Orçamento" : "Novo Orçamento"}
            </h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Pedido de Venda #{numFmt}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setItems([]); setNotes(""); }} className="border-slate-200 text-slate-600 font-bold px-6">
            Limpar
          </Button>
          <Button onClick={save} disabled={saving || items.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-lg shadow-blue-100 transition-all active:scale-95">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Orçamento"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Informações do Cliente
              </h2>
            </div>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Vendedor</Label>
                  <select
                    value={seller}
                    onChange={(e) => setSeller(e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                  >
                    <option value="">Selecione um Vendedor</option>
                    {SELLERS.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Cliente / Mecânico</Label>
                  <select
                    value={customer || "__none__"}
                    onChange={(e) => setCustomer(e.target.value === "__none__" ? "" : e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                  >
                    <option value="__none__">Consumidor Final</option>
                    {mechanics.map((m) => (<option key={m.id} value={m.name}>{m.name}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Forma de Pagamento</Label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                  >
                    {PAYMENT_METHODS.map((m) => (<option key={m} value={m}>{m}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Tipo de Peça</Label>
                  <select
                    value={pieceType}
                    onChange={(e) => setPieceType(e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                  >
                    {PIECE_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs font-black uppercase text-slate-400 tracking-wider">Veículo (Opcional)</Label>
                  <select
                    value={car || "__none__"}
                    onChange={(e) => setCar(e.target.value === "__none__" ? "" : e.target.value)}
                    className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-slate-900"
                  >
                    <option value="__none__">Nenhum Veículo</option>
                    {carsList.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden min-h-[400px]">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Itens do Pedido
              </h2>
              <Button size="sm" variant="outline" onClick={openConsulta} className="text-xs font-black uppercase tracking-widest border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-50">
                <Search className="w-3.5 h-3.5 mr-1.5" />
                Buscar Produto
              </Button>
            </div>
            
            <div className="p-0">
              <div className="bg-white border-b border-slate-100 p-4">
                <div className="relative group">
                  <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); if (!showSearch) setShowSearch(true); }}
                    onFocus={() => setShowSearch(true)}
                    placeholder="Digite para pesquisar por nome ou descrição..."
                    className="w-full h-12 pl-12 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400"
                  />
                  {search && (
                    <button onClick={() => { setSearch(""); setShowSearch(false); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  )}
                  {showSearch && search && (
                    <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-[350px] overflow-y-auto">
                      {searching ? (
                        <div className="p-8 text-center text-slate-400 italic font-medium">Buscando produtos...</div>
                      ) : products.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 italic font-medium">Nenhum produto encontrado para "{search}"</div>
                      ) : (
                        products.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addItem(p.id)}
                            className="w-full text-left p-4 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors flex items-center justify-between group"
                          >
                            <div className="min-w-0 pr-4">
                              <p className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{p.name}</p>
                              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 font-medium">{p.description || "Sem descrição"}</p>
                            </div>
                            <p className="font-mono font-black text-blue-600 shrink-0 text-base">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-[0.2em] border-b border-slate-100">
                      <th className="py-4 px-6 text-left">Produto</th>
                      <th className="py-4 px-6 text-center w-32">Quantidade</th>
                      <th className="py-4 px-6 text-right w-32">Unitário</th>
                      <th className="py-4 px-6 text-right w-32">Total</th>
                      <th className="py-4 px-6 text-right w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-20 text-center text-slate-300 italic font-medium">
                          Adicione produtos pesquisando acima ou no botão "Buscar Produto"
                        </td>
                      </tr>
                    ) : (
                      items.map((i, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50/30 transition-colors">
                          <td className="py-4 px-6">
                            <p className="font-bold text-slate-900 leading-tight">{i.product_name}</p>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center gap-3 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                              <button onClick={() => updateItem(idx, { quantity: Math.max(1, i.quantity - 1) })} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-blue-600 transition-all"><Minus className="w-3.5 h-3.5" /></button>
                              <span className="font-mono font-black text-slate-900 w-8 text-center">{i.quantity}</span>
                              <button onClick={() => updateItem(idx, { quantity: i.quantity + 1 })} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-blue-600 transition-all"><Plus className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={i.unit_price}
                              onChange={(e) => updateItem(idx, { unit_price: Math.max(0, Number(e.target.value)) })}
                              className="w-24 h-9 text-right font-mono font-bold bg-white"
                            />
                          </td>
                          <td className="py-4 px-6 text-right font-mono font-black text-slate-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(i.quantity * i.unit_price)}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button onClick={() => setItems(items.filter((_, k) => k !== idx))} className="text-slate-300 hover:text-red-600 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-xl shadow-slate-200/50 ring-1 ring-slate-200 rounded-3xl overflow-hidden bg-slate-900 text-white p-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6">Resumo Financeiro</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-widest">Subtotal</span>
                <span className="font-mono font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalProdutos)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-widest">Descontos</span>
                <span className="font-mono font-bold text-green-400">R$ 0,00</span>
              </div>
              <div className="pt-6 mt-6 border-t border-white/10">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-1">Total a Pagar</span>
                  <span className="text-4xl font-black font-mono tracking-tighter text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                  </span>
                </div>
              </div>
            </div>
            <Button onClick={save} disabled={saving || items.length === 0} className="w-full mt-10 h-14 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]">
              {saving ? "Processando..." : "Confirmar Venda"}
            </Button>
          </Card>

          <Card className="border-none shadow-sm ring-1 ring-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Observações</h2>
            </div>
            <CardContent className="p-6">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                placeholder="Informações adicionais para este orçamento..."
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium text-slate-900 resize-none text-sm"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {showConsulta && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200" onClick={() => setShowConsulta(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Catálogo de Produtos</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Busque e selecione itens para o orçamento</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowConsulta(false)} className="rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 bg-slate-50 border-b border-slate-100">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={consultaRef}
                  value={consultaSearch}
                  onChange={(e) => { setConsultaSearch(e.target.value); setConsultaSelected(null); }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setShowConsulta(false);
                    if (e.key === "Enter") confirmConsulta();
                  }}
                  placeholder="Pesquisar por nome, código ou descrição..."
                  className="w-full h-14 pl-12 pr-6 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-900 shadow-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-slate-400 uppercase text-[9px] font-black tracking-widest border-b border-slate-100">
                    <th className="px-4 py-3 text-left">Descrição do Produto</th>
                    <th className="px-4 py-3 text-right w-32">Preço Unitário</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {searching ? (
                    <tr><td colSpan={2} className="py-20 text-center text-slate-400 italic font-medium">Buscando produtos...</td></tr>
                  ) : consultaResults.length === 0 ? (
                    <tr><td colSpan={2} className="py-20 text-center text-slate-400 italic font-medium">Nenhum produto encontrado</td></tr>
                  ) : (
                    consultaResults.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => setConsultaSelected(p.id)}
                        onDoubleClick={() => { addItem(p.id); setShowConsulta(false); setConsultaSearch(""); }}
                        className={`cursor-pointer group transition-all ${consultaSelected === p.id ? "bg-blue-600 rounded-xl" : "hover:bg-blue-50"}`}
                      >
                        <td className="px-4 py-4 rounded-l-xl">
                          <div className="flex flex-col">
                            <span className={`font-bold transition-colors ${consultaSelected === p.id ? "text-white" : "text-slate-900 group-hover:text-blue-700"}`}>{p.name}</span>
                            <span className={`text-xs mt-0.5 line-clamp-1 font-medium ${consultaSelected === p.id ? "text-blue-100" : "text-slate-500"}`}>{p.description || "Sem descrição disponível"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right rounded-r-xl">
                          <span className={`font-mono font-black text-lg transition-colors ${consultaSelected === p.id ? "text-white" : "text-blue-600"}`}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Dica: Clique duplo para adicionar rapidamente</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowConsulta(false)} className="rounded-xl border-slate-200 font-bold">Cancelar</Button>
                <Button onClick={confirmConsulta} disabled={!consultaSelected} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-8 shadow-lg shadow-blue-100">Confirmar Seleção</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteNew;
