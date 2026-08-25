import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/PageHeader";
import { SearchInput } from "@/components/SearchInput";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Package, Upload, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  car_filter: string | null;
  created_at?: string;
  updated_at?: string;
}

const empty = { name: "", description: "", price: "0", stock: "0", car_filter: "" };

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const Products = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (searchQuery = "") => {
    setLoading(true);
    try {
      const q = searchQuery.trim();
      const r = q
        ? await supabase.rpc("search_products", { search_term: q })
        : await supabase.from("products").select("*").order("name").limit(200);
      if (r.error) toast.error(r.error.message);
      else setItems((r.data ?? []) as Product[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
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
    });
    setOpen(true);
  };

  const save = async () => {
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.name.trim()) { toast.error("Nome obrigatório"); return; }
    if (isNaN(price) || price < 0) { toast.error("Preço inválido"); return; }
    if (isNaN(stock) || stock < 0) { toast.error("Estoque inválido"); return; }

    const payload = {
      name: form.name.trim(),
      price,
      stock,
      description: form.description.trim() || null,
      car_filter: form.car_filter.trim() || null,
      user_id: user!.id,
    };

    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert([payload]);

    if (error) toast.error(error.message);
    else {
      toast.success(editing ? "Produto atualizado" : "Produto cadastrado");
      setOpen(false);
      load(query);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Produto excluído"); load(query); }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["nome", "preco", "estoque", "descricao"],
      ["Pastilha de freio", 89.9, 12, "Dianteira"],
      ["Filtro de óleo", 24.5, 30, ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "modelo-produtos.xlsx");
  };

  const parseNumber = (v: any) => {
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
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "", raw: true });
      const normalizeKey = (k: string) =>
        k.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

      const parsed = rows
        .map((r) => {
          const obj: Record<string, any> = {};
          Object.keys(r).forEach((k) => { obj[normalizeKey(k)] = r[k]; });
          const name = String(obj.nome ?? obj.name ?? obj.produto ?? obj.descricao ?? "").trim();
          const price = parseNumber(obj.preco ?? obj.price ?? obj.valor ?? obj.precovenda);
          const stock = Math.floor(parseNumber(obj.estoque ?? obj.stock ?? obj.quantidade));
          const description = String(obj.descricaolonga ?? obj.observacao ?? "").trim();
          return { name, price, stock, description };
        })
        .filter((p) => p.name.length > 0);

      if (parsed.length === 0) { toast.error("Nenhuma linha válida encontrada."); return; }

      if (!user) return;
      const { error } = await supabase.from("products").insert(
        parsed.map((p) => ({ ...p, user_id: user.id }))
      );
      if (error) throw error;
      toast.success(`${parsed.length} produtos importados`);
      load(query);
    } catch (e: any) {
      toast.error("Erro ao importar: " + e.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Produtos" description="Cadastro e controle de produtos">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1">
            <Download className="w-4 h-4" /> Modelo
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1">
            <Upload className="w-4 h-4" /> Importar
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button size="sm" onClick={openNew} className="gap-1">
            <Plus className="w-4 h-4" /> Novo produto
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">Lista de produtos</CardTitle>
          <SearchInput
            placeholder="Buscar produto..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            wrapperClassName="w-full sm:w-80"
          />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-40 flex items-center justify-center text-muted-foreground">Carregando...</div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhum produto cadastrado"
              description="Importe uma planilha ou cadastre um novo produto."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Estoque</TableHead>
                    <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium text-foreground break-words whitespace-normal max-w-xs">{p.name}</p>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-foreground">{brl(Number(p.price))}</TableCell>
                      <TableCell className="text-right">{p.stock}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground truncate max-w-xs">
                        {p.description || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
            <DialogDescription>Preencha os dados do produto.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Preço *</Label>
                <Input id="price" type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Estoque *</Label>
                <Input id="stock" type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Salvar alterações" : "Cadastrar produto"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
