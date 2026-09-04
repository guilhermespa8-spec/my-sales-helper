import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Boxes, Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  car_filter: string | null;
  color: string | null;
}

const emptyForm = { name: "", description: "", price: "0", stock: "0", car_filter: "", color: "" };

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

type Filter = "todos" | "baixo" | "zerado";

const Products = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (searchQuery = "") => {
    setLoading(true);
    try {
      const q = searchQuery.trim();
      const r = q
        ? await supabase.rpc("search_products", { search_term: q })
        : await supabase.from("products").select("*").order("name").limit(20);
      if (r.error) toast.error(r.error.message);
      else setItems(((r.data ?? []) as Product[]).slice(0, 20));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const visible = useMemo(() => {
    if (filter === "baixo") return items.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 3);
    if (filter === "zerado") return items.filter((p) => Number(p.stock) <= 0);
    return items;
  }, [items, filter]);

  const stockValue = useMemo(
    () => items.reduce((s, p) => s + Number(p.price) * Number(p.stock), 0),
    [items]
  );

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      stock: String(p.stock),
      car_filter: p.car_filter ?? "",
      color: p.color ?? "",
    });
    setOpen(true);
  };

  const save = async () => {
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.name.trim()) return toast.error("Informe o nome da peça");
    if (isNaN(price) || price < 0) return toast.error("Preço inválido");
    if (isNaN(stock) || stock < 0) return toast.error("Estoque inválido");

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price,
        stock,
        description: form.description.trim() || null,
        car_filter: form.car_filter.trim() || null,
        color: form.color.trim() || null,
        user_id: user!.id,
      };
      const { error } = editing
        ? await supabase.from("products").update(payload).eq("id", editing.id)
        : await supabase.from("products").insert([payload]);
      if (error) throw error;
      toast.success(editing ? "Peça atualizada" : "Peça cadastrada");
      setOpen(false);
      load(query);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta peça?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Peça excluída");
      load(query);
    }
  };

  const adjustStock = async (p: Product, delta: number) => {
    const next = Math.max(0, Number(p.stock) + delta);
    setItems((prev) => prev.map((i) => (i.id === p.id ? { ...i, stock: next } : i)));
    const { error } = await supabase.from("products").update({ stock: next }).eq("id", p.id);
    if (error) {
      toast.error(error.message);
      load(query);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["nome", "preco", "estoque", "descricao"],
      ["Pastilha de freio", 89.9, 12, "Dianteira"],
      ["Filtro de óleo", 24.5, 30, ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pecas");
    XLSX.writeFile(wb, "modelo-pecas.xlsx");
  };

  const parseNumber = (v: unknown) => {
    if (v === null || v === undefined || v === "") return 0;
    if (typeof v === "number") return v;
    let s = String(v).replace(/[R$\s]/g, "").replace(/[^\d.,-]/g, "");
    if (!s) return 0;
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > -1 && lastDot > -1) {
      s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    } else if (lastComma > -1) {
      const after = s.length - lastComma - 1;
      s = after === 1 || after === 2 ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
    }
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  };

  const handleFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "", raw: true });
      const normalizeKey = (k: string) =>
        k.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

      const parsed = rows
        .map((r) => {
          const obj: Record<string, unknown> = {};
          Object.keys(r).forEach((k) => {
            obj[normalizeKey(k)] = r[k];
          });
          const name = String(obj.nome ?? obj.name ?? obj.produto ?? obj.descricao ?? "").trim();
          const price = parseNumber(obj.preco ?? obj.price ?? obj.valor ?? obj.precovenda);
          const stock = Math.floor(parseNumber(obj.estoque ?? obj.stock ?? obj.quantidade));
          const description = String(obj.descricaolonga ?? obj.observacao ?? "").trim();
          return { name, price, stock, description };
        })
        .filter((p) => p.name.length > 0);

      if (parsed.length === 0) return toast.error("Nenhuma linha válida encontrada.");
      if (!user) return;

      const { error } = await supabase
        .from("products")
        .insert(parsed.map((p) => ({ ...p, user_id: user.id })));
      if (error) throw error;
      toast.success(`${parsed.length} peças importadas`);
      load(query);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao importar planilha");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "todos", label: "Todas" },
    { key: "baixo", label: "Estoque baixo" },
    { key: "zerado", label: "Zeradas" },
  ];

  return (
    <div>
      <PageHeader code="02 · Peças" title="Catálogo" description="Cadastro e estoque das peças da loja.">
        <Button variant="outline" onClick={downloadTemplate}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Modelo
        </Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" /> Importar
        </Button>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Nova peça
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder="Buscar peça por nome"
          wrapperClassName="flex-1"
        />
        <div className="flex gap-px bg-border border border-border">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-4 py-2 text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap",
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-secondary"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-y border-border py-2 mb-4">
        <span className="rule-label">{visible.length} peças listadas</span>
        <span className="rule-label">
          Valor em estoque <span className="text-foreground tabular-nums">{brl(stockValue)}</span>
        </span>
      </div>

      {loading ? (
        <p className="rule-label">Carregando...</p>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Nenhuma peça"
          description="Cadastre manualmente ou importe sua planilha de peças."
        />
      ) : (
        <div className="border border-border bg-card overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-secondary text-muted-foreground">
                <th className="text-left font-semibold uppercase tracking-wider px-3 py-2 border-b border-border">Código</th>
                <th className="text-left font-semibold uppercase tracking-wider px-3 py-2 border-b border-border">Descrição</th>
                <th className="text-left font-semibold uppercase tracking-wider px-3 py-2 border-b border-border">Aplicação</th>
                <th className="text-left font-semibold uppercase tracking-wider px-3 py-2 border-b border-border">Cor</th>
                <th className="text-right font-semibold uppercase tracking-wider px-3 py-2 border-b border-border">Estoque</th>
                <th className="text-right font-semibold uppercase tracking-wider px-3 py-2 border-b border-border">Preço</th>
                <th className="px-3 py-2 border-b border-border"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p, i) => {
                const stock = Number(p.stock);
                return (
                  <tr
                    key={p.id}
                    onDoubleClick={() => openEdit(p)}
                    className={cn(
                      "border-b border-border hover:bg-secondary/60",
                      i % 2 === 1 && "bg-secondary/25"
                    )}
                  >
                    <td className="px-3 py-1.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {String(i + 1).padStart(6, "0")}
                    </td>
                    <td className="px-3 py-1.5 font-medium">{p.name}</td>
                    <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{p.car_filter || "—"}</td>
                    <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{p.color || "—"}</td>
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      <span className="inline-flex items-center border border-border">
                        <button type="button" onClick={() => adjustStock(p, -1)} className="w-6 h-6 hover:bg-secondary" aria-label="Baixar estoque">−</button>
                        <span className={cn(
                          "w-10 text-center tabular-nums font-semibold",
                          stock <= 0 ? "text-destructive" : stock <= 3 ? "text-warning" : "text-foreground"
                        )}>{stock}</span>
                        <button type="button" onClick={() => adjustStock(p, 1)} className="w-6 h-6 hover:bg-secondary" aria-label="Entrada de estoque">+</button>
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-primary whitespace-nowrap">
                      {brl(Number(p.price))}
                    </td>
                    <td className="px-2 py-1 text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)} aria-label="Editar peça">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(p.id)} aria-label="Excluir peça">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="stripe-title">{editing ? "Editar peça" : "Nova peça"}</DialogTitle>
            <DialogDescription>Dados usados no balcão e no controle de estoque.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Pastilha de freio dianteira"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Estoque</Label>
                <Input
                  id="stock"
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="car">Aplicação / veículo</Label>
              <Input
                id="car"
                value={form.car_filter}
                onChange={(e) => setForm({ ...form, car_filter: e.target.value })}
                placeholder="Gol G5, Onix..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <Input
                id="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="Preta, branca, prata..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Observações</Label>
              <Textarea
                id="desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
