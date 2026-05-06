import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Search, X, Plus, Minus, Trash2 } from "lucide-react";

const SELLERS = ["André", "João Victor", "Mateus", "Loja"] as const;

interface Product { id: string; name: string; description: string | null; price: number; car_filter?: string | null; }
interface Item { product_id: string; product_name: string; quantity: number; unit_price: number; }
interface Mechanic { id: string; name: string; }
interface CarRecord { id: string; name: string; notes: string | null; }

// ---------- Retro UI primitives ----------
const RetroField = ({ label, color = "text-[#38bdf8]", children }: { label: string; color?: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <span className={`text-[11px] font-semibold ${color}`}>{label}</span>
    <div className="min-w-0">{children}</div>
  </div>
);

const retroInputCls =
  "h-7 px-2 py-0 text-[12px] rounded-none bg-[#0f172a] border border-[#334155] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#38bdf8] shadow-none text-slate-100";

const retroSelectCls =
  "h-7 px-2 py-0 text-[12px] rounded-none bg-[#0f172a] border border-[#334155] text-slate-100 w-full focus:outline-none focus:border-[#38bdf8]";

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
  const [showSearch, setShowSearch] = useState(false);
  const [showConsulta, setShowConsulta] = useState(false);
  const [consultaSearch, setConsultaSearch] = useState("");
  const [consultaSelected, setConsultaSelected] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const consultaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 50); }
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
    const loadData = async () => {
      const [mecsRes, carsRes] = await Promise.all([
        supabase.from("mechanics").select("id,name").order("name"),
        supabase.from("cars").select("id,name,notes").order("name")
      ]);
      if (mecsRes.data) setMechanics(mecsRes.data as Mechanic[]);
      if (carsRes.data) setCarsList(carsRes.data as CarRecord[]);

      const pageSize = 1000;
      let from = 0;
      const all: Product[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("products")
          .select("id,name,description,price,car_filter")
          .order("name")
          .range(from, from + pageSize - 1);
        if (error) { toast.error("Erro ao carregar produtos"); break; }
        const batch = (data ?? []) as Product[];
        all.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }
      setProducts(all);
    };
    loadData();
  }, []);

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

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const normalize = (str: string) => str.toLowerCase().replace(/[\s\.\-]/g, "");
    const searchTerms = q.split(/\s+/).filter(t => t.length > 0);
    const searchNormalized = normalize(q);
    return products.filter((p) => {
      const pName = p.name.toLowerCase();
      const pDesc = (p.description ?? "").toLowerCase();
      const pNameNormalized = normalize(p.name);
      const pDescNormalized = normalize(p.description ?? "");
      const allTermsMatch = searchTerms.every(t => pName.includes(t) || pDesc.includes(t));
      const normalizedMatch = pNameNormalized.includes(searchNormalized) || pDescNormalized.includes(searchNormalized);
      return allTermsMatch || normalizedMatch;
    }).slice(0, 50);
  }, [products, search]);

  const consultaResults = useMemo(() => {
    const q = consultaSearch.trim().toLowerCase().replace(/^%/, "");
    if (!q) return products.slice(0, 200);
    const normalize = (str: string) => str.toLowerCase().replace(/[\s\.\-]/g, "");
    const terms = q.split(/\s+/).filter(Boolean);
    const qn = normalize(q);
    return products.filter((p) => {
      const n = p.name.toLowerCase();
      const d = (p.description ?? "").toLowerCase();
      return terms.every(t => n.includes(t) || d.includes(t)) ||
        normalize(p.name).includes(qn) || normalize(p.description ?? "").includes(qn);
    }).slice(0, 200);
  }, [products, consultaSearch]);

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

  const totalProdutos = total;
  const numFmt = `0${String(quoteNumber ?? 0).padStart(5, "0")}`;

  // Toolbar button
  const ToolBtn = ({ label, onClick, disabled, accent }: { label: string; onClick?: () => void; disabled?: boolean; accent?: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-3 h-8 text-[12px] border border-transparent hover:border-[#334155] hover:bg-[#1e293b] active:bg-[#0f172a] disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors ${accent ? "font-semibold" : ""}`}
    >
      {label}
    </button>
  );

  return (
    <div className="-mx-4 sm:-mx-6 -my-6 min-h-[calc(100vh-4rem)] bg-[#020617] text-slate-100 font-[Tahoma,Geneva,sans-serif] text-[12px]">
      <div className="max-w-[1100px] mx-auto bg-[#0f172a] border border-[#334155] shadow-[0_10px_40px_-10px_rgba(56,189,248,0.25)]">
        {/* Title bar */}
        <div className="h-7 bg-gradient-to-b from-[#0c4a6e] to-[#082f49] text-white flex items-center justify-between px-2 select-none border-b border-[#334155]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#22d3ee] rounded-sm border border-[#0891b2]" />
            <span className="text-[12px] font-semibold">
              {isEdit ? "Editar Orçamento" : "Pedidos de venda"}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[12px]">
            <button onClick={() => nav("/")} className="w-5 h-5 hover:bg-white/20 leading-none">_</button>
            <button onClick={() => nav("/")} className="w-5 h-5 hover:bg-white/20 leading-none">▢</button>
            <button onClick={() => nav("/")} className="w-5 h-5 hover:bg-red-600 leading-none">×</button>
          </div>
        </div>

        {/* Menu / Toolbar */}
        <div className="bg-[#1e293b] border-b border-[#334155] flex items-center justify-between px-1">
          <div className="flex items-center">
            <ToolBtn label="Vínculos" />
            <ToolBtn label="Confere" disabled />
            <ToolBtn label="Filtros" />
            <ToolBtn label="Adicionar produto" onClick={openConsulta} accent />
            <ToolBtn label="Movimentar Estoque" disabled />
            <ToolBtn label="Gerar Financeiro" disabled />
            <ToolBtn label="Pagamentos" disabled />
          </div>
          <div className="flex items-center gap-1 px-2">
            <button onClick={() => nav("/")} className="text-slate-300 hover:text-white px-1">«</button>
            <button onClick={() => nav("/")} className="text-slate-300 hover:text-white px-1">‹</button>
            <button onClick={() => nav("/")} className="text-slate-300 hover:text-white px-1">›</button>
            <button onClick={() => nav("/")} className="text-slate-300 hover:text-white px-1">»</button>
            <div className="w-3 h-4 bg-[#22d3ee] ml-2" />
          </div>
        </div>

        {/* Número do pedido */}
        <div className="bg-[#0f172a] border border-[#334155] mx-2 mt-2 px-2 py-1 flex items-center gap-2">
          <span className="text-[#22d3ee] font-semibold text-[12px]">Número do Pedido:</span>
          <span className="text-[#22d3ee] font-mono text-[13px]">{numFmt}</span>
        </div>

        {/* Tabs cliente */}
        <div className="mx-2 mt-2 flex items-end gap-0">
          <div className="px-3 py-1 bg-[#1e293b] border border-[#334155] border-b-0 text-[12px] font-semibold text-slate-100">Cliente</div>
          <div className="px-3 py-1 bg-[#0f172a] border border-[#334155] border-b-0 text-[12px] text-slate-500">Endereço de Entrega</div>
          <div className="flex-1 border-b border-[#334155]" />
        </div>

        {/* Bloco cliente */}
        <div className="mx-2 border border-[#334155] border-t-0 bg-[#1e293b] p-2 space-y-2">
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-6">
              <RetroField label="Cliente / Mecânico:">
                <select
                  value={customer || "__none__"}
                  onChange={(e) => setCustomer(e.target.value === "__none__" ? "" : e.target.value)}
                  className={retroSelectCls}
                >
                  <option value="__none__">000000  Consumidor</option>
                  {mechanics.map((m) => (<option key={m.id} value={m.name}>{m.name}</option>))}
                </select>
              </RetroField>
            </div>
            <div className="col-span-3">
              <RetroField label="Vendedor:">
                <select value={seller} onChange={(e) => setSeller(e.target.value)} className={retroSelectCls}>
                  <option value="">Selecione</option>
                  {SELLERS.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </RetroField>
            </div>
            <div className="col-span-3">
              <RetroField label="Carro:">
                <select
                  value={car || "__none__"}
                  onChange={(e) => setCar(e.target.value === "__none__" ? "" : e.target.value)}
                  className={retroSelectCls}
                >
                  <option value="__none__">Nenhum</option>
                  {carsList.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}
                </select>
              </RetroField>
            </div>
          </div>

          <RetroField label="Informações complementares:" color="text-[#fb923c]">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full px-2 py-1 text-[12px] rounded-none bg-[#0f172a] border border-[#334155] resize-none focus:outline-none focus:border-[#38bdf8] text-slate-100"
            />
          </RetroField>
        </div>

        {/* Tabela de itens */}
        <div className="mx-2 mt-2 border border-[#334155] bg-[#0f172a]">
          {/* Header */}
          <div className="grid grid-cols-[1fr_60px_80px_80px_60px_100px_100px_100px] bg-[#1e293b] border-b border-[#334155] text-[11px] font-semibold text-slate-200">
            <div className="px-2 py-1 border-r border-[#334155]">Nome do produto</div>
            <div className="px-2 py-1 border-r border-[#334155] text-center">…</div>
            <div className="px-2 py-1 border-r border-[#334155] text-center">Und.</div>
            <div className="px-2 py-1 border-r border-[#334155] text-center">Q.Ped</div>
            <div className="px-2 py-1 border-r border-[#334155] text-center">Q.Sal</div>
            <div className="px-2 py-1 border-r border-[#334155] text-right">Unitário</div>
            <div className="px-2 py-1 border-r border-[#334155] text-right">Desconto %</div>
            <div className="px-2 py-1 text-right">Total</div>
          </div>

          {/* Add row */}
          <div className="grid grid-cols-[1fr_60px_80px_80px_60px_100px_100px_100px] border-b border-[#334155] relative">
            <div className="col-span-8 relative">
              {!showSearch ? (
                <button
                  type="button"
                  onClick={() => { setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 50); }}
                  className="w-full text-left px-2 py-1.5 text-[12px] text-[#38bdf8] hover:bg-[#1e293b]"
                >
                  Incluir (Ctrl+Insert) — clique para pesquisar produto
                </button>
              ) : (
                <div className="flex items-center gap-1 px-1 py-1 bg-[#0f172a]">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Pesquisar produto..."
                    className="flex-1 h-6 px-1 text-[12px] outline-none border-0 bg-transparent text-slate-100 placeholder:text-slate-500"
                  />
                  <button onClick={() => { setShowSearch(false); setSearch(""); }} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {showSearch && search && (
                <div className="absolute left-0 right-0 top-full z-30 bg-[#0f172a] border border-[#334155] shadow-lg max-h-[280px] overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="px-3 py-3 text-[12px] text-slate-500 italic">Nenhum produto encontrado</div>
                  ) : (
                    filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => addItem(p.id)}
                        className="w-full text-left px-3 py-1.5 text-[12px] text-slate-100 hover:bg-[#0c4a6e] hover:text-white border-b border-[#1e293b] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{p.name}</div>
                          {p.description && <div className="text-[11px] opacity-70 truncate">{p.description}</div>}
                        </div>
                        <div className="font-mono shrink-0 text-[#22d3ee]">R$ {Number(p.price).toFixed(2)}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Item rows */}
          {items.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-[12px] text-slate-500 italic">
              Nenhum item adicionado
            </div>
          ) : (
            items.map((i, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_60px_80px_80px_60px_100px_100px_100px] border-b border-[#1e293b] hover:bg-[#1e293b] text-[12px] text-slate-100">
                <div className="px-2 py-1 border-r border-[#1e293b] truncate">{i.product_name}</div>
                <div className="px-1 py-1 border-r border-[#1e293b] flex items-center justify-center">
                  <button onClick={() => setItems(items.filter((_, k) => k !== idx))} className="text-red-400 hover:text-red-300">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="px-2 py-1 border-r border-[#1e293b] text-center text-slate-400">UN</div>
                <div className="px-1 py-1 border-r border-[#1e293b] flex items-center justify-center gap-0.5">
                  <button onClick={() => updateItem(idx, { quantity: Math.max(1, i.quantity - 1) })} className="px-1 hover:bg-[#334155]"><Minus className="w-3 h-3" /></button>
                  <span className="font-mono w-6 text-center">{i.quantity}</span>
                  <button onClick={() => updateItem(idx, { quantity: i.quantity + 1 })} className="px-1 hover:bg-[#334155]"><Plus className="w-3 h-3" /></button>
                </div>
                <div className="px-2 py-1 border-r border-[#1e293b] text-center font-mono text-slate-400">{i.quantity}</div>
                <div className="px-1 py-0.5 border-r border-[#1e293b]">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={i.unit_price}
                    onChange={(e) => updateItem(idx, { unit_price: Math.max(0, Number(e.target.value)) })}
                    className={`${retroInputCls} text-right font-mono`}
                  />
                </div>
                <div className="px-2 py-1 border-r border-[#1e293b] text-right font-mono text-slate-500">0,00</div>
                <div className="px-2 py-1 text-right font-mono font-semibold text-[#22d3ee]">
                  {(i.quantity * i.unit_price).toFixed(2)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé totais */}
        <div className="mx-2 mt-2 grid grid-cols-4 gap-3 text-[12px]">
          <div>
            <div className="text-[#fb923c] font-semibold">Frete:</div>
            <div className="font-mono text-slate-100">R$0,00</div>
          </div>
          <div>
            <div className="text-[#fb923c] font-semibold">Produtos:</div>
            <div className="font-mono text-slate-100">R${totalProdutos.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-[#fb923c] font-semibold">Descontos:</div>
            <div className="font-mono text-slate-100">R$0,00</div>
          </div>
          <div className="text-right">
            <div className="text-[#fb923c] font-semibold">Total do Pedido:</div>
            <div className="font-mono font-bold text-[15px] text-[#22d3ee]">R${total.toFixed(2)}</div>
          </div>
        </div>

        {/* Barra inferior de ações */}
        <div className="mt-3 border-t border-[#334155] bg-[#1e293b] flex items-center justify-around px-2 py-2 text-[11px]">
          <ActionIcon label="Listagem" onClick={() => nav("/")} />
          <ActionIcon label="Ficha" disabled />
          <ActionIcon label="Novo" onClick={() => nav("/orcamentos/novo")} highlight />
          <ActionIcon label="Desfaz" onClick={() => { setItems([]); setNotes(""); }} />
          <ActionIcon label="Salvar" onClick={save} disabled={saving || items.length === 0} highlight />
          <ActionIcon label="Apaga" onClick={() => setItems([])} />
          <ActionIcon label="Cancelar" onClick={() => nav("/")} />
          <ActionIcon label="Agrupa" disabled />
          <ActionIcon label="Campos" disabled />
          <ActionIcon label="Imprime" disabled />
          <ActionIcon label="Impresso" disabled />
          <ActionIcon label="Réplica" disabled />
        </div>
      </div>
    </div>
  );
};

const ActionIcon = ({ label, onClick, disabled, highlight }: { label: string; onClick?: () => void; disabled?: boolean; highlight?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex flex-col items-center gap-0.5 px-2 py-1 hover:bg-[#0f172a] active:bg-[#020617] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
    <div className={`w-6 h-6 border border-[#334155] ${highlight ? "bg-gradient-to-b from-[#22d3ee] to-[#0891b2]" : "bg-[#0f172a]"}`} />
    <span className="text-slate-200">{label}</span>
  </button>
);

export default QuoteNew;
