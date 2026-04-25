import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Package, Upload, Download, Search, Eye } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string; name: string; description: string | null;
  price: number; stock: number;
  created_at?: string; updated_at?: string;
}

const schema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(120),
  description: z.string().trim().max(500).optional(),
  price: z.number().min(0).max(9999999),
  stock: z.number().int().min(0).max(999999),
});

const empty = { name: "", description: "", price: "0", stock: "0" };

const Products = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<{ name: string; description: string; price: number; stock: number }>>([]);
  const [importing, setImporting] = useState(false);
  const [removeMissing, setRemoveMissing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matched = items.filter(p => {
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);
  });
  const filtered = q ? matched : matched.slice(0, 10);

  // Computed diff for preview
  const diff = (() => {
    const byName = new Map(items.map(p => [p.name.trim().toLowerCase(), p]));
    const seen = new Set<string>();
    const toUpdate: Array<{ existing: Product; next: typeof importPreview[number] }> = [];
    const toCreate: typeof importPreview = [];
    importPreview.forEach(p => {
      const key = p.name.trim().toLowerCase();
      seen.add(key);
      const existing = byName.get(key);
      if (existing) {
        const changed = Number(existing.price) !== p.price || existing.stock !== p.stock || (existing.description ?? "") !== p.description;
        if (changed) toUpdate.push({ existing, next: p });
      } else {
        toCreate.push(p);
      }
    });
    const toDelete = items.filter(p => !seen.has(p.name.trim().toLowerCase()));
    return { toUpdate, toCreate, toDelete };
  })();

  const load = async () => {
    const pageSize = 1000;
    let from = 0;
    const all: Product[] = [];
    while (true) {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("name")
        .range(from, from + pageSize - 1);
      if (error) { toast.error(error.message); return; }
      const batch = (data ?? []) as Product[];
      all.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
    setItems(all);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, description: p.description ?? "", price: String(p.price), stock: String(p.stock) });
    setOpen(true);
  };

  const save = async () => {
    const parsed = schema.safeParse({
      name: form.name, description: form.description || undefined,
      price: Number(form.price), stock: Number(form.stock),
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    const d = parsed.data;
    const payload = {
      name: d.name, price: d.price, stock: d.stock,
      description: d.description ?? null, user_id: user!.id,
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert([payload]);
    if (error) toast.error(error.message);
    else { toast.success(editing ? "Produto atualizado" : "Produto cadastrado"); setOpen(false); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Produto excluído"); load(); }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["nome", "preco", "estoque", "descricao"],
      ["Camiseta Branca", 49.9, 10, "Algodão tamanho M"],
      ["Boné Azul", 29.9, 5, ""],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "modelo-produtos.xlsx");
  };

  const normalizeKey = (k: string) =>
    k.toString().toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

  const parseNumber = (v: any) => {
    if (v === null || v === undefined || v === "") return 0;
    if (typeof v === "number") return v;
    let s = String(v).replace(/[R$\s]/g, "").replace(/[^\d.,-]/g, "");
    if (!s) return 0;
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");

    const normalizeDecimal = (value: string, separator: "," | ".") => {
      const lastSeparator = value.lastIndexOf(separator);
      const integerPart = value.slice(0, lastSeparator).replace(/[.,]/g, "");
      const decimalPart = value.slice(lastSeparator + 1).replace(/[.,]/g, "");
      return `${integerPart || "0"}.${decimalPart}`;
    };

    if (lastComma > -1 && lastDot > -1) {
      s = normalizeDecimal(s, lastComma > lastDot ? "," : ".");
    } else if (lastComma > -1) {
      const after = s.length - lastComma - 1;
      s = after === 1 || after === 2 ? normalizeDecimal(s, ",") : s.replace(/,/g, "");
    } else if (lastDot > -1) {
      const after = s.length - lastDot - 1;
      s = after === 1 || after === 2 ? normalizeDecimal(s, ".") : s.replace(/\./g, "");
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
      const parsed = rows.map((r) => {
        const obj: Record<string, any> = {};
        Object.keys(r).forEach((k) => { obj[normalizeKey(k)] = r[k]; });
        const name = String(obj.nome ?? obj.name ?? obj.produto ?? "").trim();
        const price = parseNumber(obj.preco ?? obj.price ?? obj.valor);
        const stock = Math.floor(parseNumber(obj.estoque ?? obj.stock ?? obj.quantidade ?? 0));
        const description = String(obj.descricao ?? obj.description ?? "").trim();
        return { name, description, price, stock };
      }).filter(p => p.name.length > 0);
      if (parsed.length === 0) { toast.error("Nenhuma linha válida. Verifique a coluna 'nome'."); return; }
      setImportPreview(parsed);
      setImportOpen(true);
    } catch (e: any) {
      toast.error("Erro ao ler arquivo: " + e.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const confirmImport = async () => {
    if (!user) return;
    setImporting(true);
    try {
      // 1. Insert new
      if (diff.toCreate.length > 0) {
        const payload = diff.toCreate.map(p => ({
          name: p.name, price: p.price, stock: p.stock,
          description: p.description || null, user_id: user.id,
        }));
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
      // 2. Update changed
      for (const { existing, next } of diff.toUpdate) {
        const { error } = await supabase.from("products").update({
          price: next.price, stock: next.stock,
          description: next.description || null,
        }).eq("id", existing.id);
        if (error) throw error;
      }
      // 3. Delete missing (optional)
      if (removeMissing && diff.toDelete.length > 0) {
        const ids = diff.toDelete.map(p => p.id);
        const { error } = await supabase.from("products").delete().in("id", ids);
        if (error) throw error;
      }
      toast.success(
        `Sincronizado: ${diff.toCreate.length} novo(s), ${diff.toUpdate.length} atualizado(s)` +
        (removeMissing ? `, ${diff.toDelete.length} removido(s)` : "")
      );
      setImportOpen(false);
      setImportPreview([]);
      setRemoveMissing(false);
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao sincronizar");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-primary">Produtos</h1>
        <p className="text-sm text-muted-foreground">Gerencie seu catálogo e preços</p>
      </div>

      {/* Toolbar style inspired by reference */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="bg-green-600 hover:bg-green-700 text-white font-semibold">
              <Plus className="w-4 h-4 mr-1" /> Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Preço (R$)</Label><Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div><Label>Estoque</Label><Input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisa por descrição, nome..."
            className="pl-9"
          />
        </div>

        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-1" /> Modelo
        </Button>
        <Button onClick={() => fileRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
          <Upload className="w-4 h-4 mr-1" /> Importar Produtos
        </Button>
      </div>

      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader className="py-3">
          <CardTitle className="text-sm text-muted-foreground font-normal">
            Catálogo ({filtered.length}{query ? ` de ${items.length}` : ""})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-40" />
              Nenhum produto. Cadastre o primeiro!
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-2 opacity-40" />
              Nenhum produto encontrado para "{query}"
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Código</TableHead>
                  <TableHead className="text-center">Descrição</TableHead>
                  <TableHead className="text-center w-24">Estoque</TableHead>
                  <TableHead className="text-center w-28">Valor</TableHead>
                  <TableHead className="text-center w-24">Status</TableHead>
                  <TableHead className="text-center w-40">Última alteração</TableHead>
                  <TableHead className="text-center w-28">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p, idx) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-center font-mono text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="text-center">
                      <div className="font-medium">{p.name}</div>
                      {p.description && <div className="text-xs text-muted-foreground line-clamp-1">{p.description}</div>}
                    </TableCell>
                    <TableCell className="text-center">{p.stock}</TableCell>
                    <TableCell className="text-center font-mono">R$ {Number(p.price).toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-block px-3 py-1 rounded text-xs font-semibold text-white ${p.stock > 0 ? "bg-green-600" : "bg-muted-foreground"}`}>
                        {p.stock > 0 ? "Ativo" : "Sem estoque"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {p.updated_at && p.created_at && new Date(p.updated_at).getTime() - new Date(p.created_at).getTime() > 2000
                        ? new Date(p.updated_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-center">
                        <Button size="icon" variant="ghost" onClick={() => setViewing(p)} title="Ver observação"><Eye className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)} title="Editar"><Pencil className="w-4 h-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(p.id)} title="Excluir"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewing?.name}</DialogTitle>
            <DialogDescription>Observação do produto</DialogDescription>
          </DialogHeader>
          <div className="text-sm whitespace-pre-wrap min-h-[60px]">
            {viewing?.description?.trim() ? viewing.description : <span className="text-muted-foreground italic">Sem observação cadastrada.</span>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={(o) => { setImportOpen(o); if (!o) setRemoveMissing(false); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sincronizar planilha</DialogTitle>
            <DialogDescription>
              Resumo das mudanças que serão aplicadas no catálogo.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded border p-3">
              <div className="text-2xl font-bold text-green-600">{diff.toCreate.length}</div>
              <div className="text-xs text-muted-foreground">novos</div>
            </div>
            <div className="rounded border p-3">
              <div className="text-2xl font-bold text-blue-600">{diff.toUpdate.length}</div>
              <div className="text-xs text-muted-foreground">atualizados</div>
            </div>
            <div className="rounded border p-3">
              <div className="text-2xl font-bold text-destructive">{diff.toDelete.length}</div>
              <div className="text-xs text-muted-foreground">fora da planilha</div>
            </div>
          </div>

          <div className="max-h-72 overflow-auto border rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Preço</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {diff.toCreate.map((p, i) => (
                  <TableRow key={"c" + i}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell className="text-right font-mono">R$ {p.price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{p.stock}</TableCell>
                    <TableCell className="text-right text-xs text-green-600">novo</TableCell>
                  </TableRow>
                ))}
                {diff.toUpdate.map(({ existing, next }, i) => (
                  <TableRow key={"u" + i}>
                    <TableCell>{next.name}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      <span className="text-muted-foreground line-through">R$ {Number(existing.price).toFixed(2)}</span>
                      {" → "}
                      <span className="font-bold">R$ {next.price.toFixed(2)}</span>
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      <span className="text-muted-foreground line-through">{existing.stock}</span> → <span className="font-bold">{next.stock}</span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-blue-600">atualizar</TableCell>
                  </TableRow>
                ))}
                {diff.toDelete.map((p, i) => (
                  <TableRow key={"d" + i}>
                    <TableCell className="text-muted-foreground">{p.name}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">R$ {Number(p.price).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.stock}</TableCell>
                    <TableCell className="text-right text-xs text-destructive">não está na planilha</TableCell>
                  </TableRow>
                ))}
                {diff.toCreate.length === 0 && diff.toUpdate.length === 0 && diff.toDelete.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Nenhuma mudança detectada — tudo já está sincronizado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {diff.toDelete.length > 0 && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={removeMissing}
                onChange={(e) => setRemoveMissing(e.target.checked)}
                className="w-4 h-4"
              />
              Excluir do site os {diff.toDelete.length} produto(s) que não estão mais na planilha
            </label>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>Cancelar</Button>
            <Button
              onClick={confirmImport}
              disabled={importing || (diff.toCreate.length === 0 && diff.toUpdate.length === 0 && (!removeMissing || diff.toDelete.length === 0))}
            >
              {importing ? "Sincronizando..." : "Aplicar mudanças"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
