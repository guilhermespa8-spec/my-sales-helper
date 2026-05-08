import { useEffect, useRef, useState } from "react";
import { Copy, RefreshCw, ShieldCheck, Key } from "lucide-react";
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
  car_filter: string | null;
  created_at?: string; updated_at?: string;
}

const schema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").max(120),
  description: z.string().trim().max(500).optional(),
  price: z.number().min(0).max(9999999),
  stock: z.number().int().min(0).max(999999),
});

const empty = { name: "", description: "", price: "0", stock: "0", car_filter: "" };

const Products = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<Array<{ name: string; description: string; price: number; stock: number; hasStock: boolean }>>([]);
  const [importing, setImporting] = useState(false);
  const [removeMissing, setRemoveMissing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const gproRef = useRef<HTMLInputElement>(null);
  const [isGpro, setIsGpro] = useState(false);
  const [query, setQuery] = useState("");
  const [gproSettingsOpen, setGproSettingsOpen] = useState(false);
  const [gproKey, setGproKey] = useState("");
  const [loadingGpro, setLoadingGpro] = useState(false);
  const [searching, setSearching] = useState(false);
  
  const load = async (searchQuery = "") => {
    setSearching(true);
    try {
      const q = searchQuery.trim();
      let response;
      
      if (q) {
        // Use the specialized RPC function for optimized trgm search
        response = await supabase.rpc('search_products', { search_term: q });
      } else {
        response = await supabase
          .from("products")
          .select("*")
          .order("name")
          .limit(100);
      }
      
      if (response.error) {
        toast.error(response.error.message);
        return;
      }
      setItems((response.data ?? []) as Product[]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      load(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filtered = items; // Already filtered by database

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
        const changed = Number(existing.price) !== p.price || (p.hasStock && existing.stock !== p.stock) || (existing.description ?? "") !== p.description;
        if (changed) toUpdate.push({ existing, next: p });
      } else {
        toCreate.push(p);
      }
    });
    const toDelete = items.filter(p => !seen.has(p.name.trim().toLowerCase()));
    return { toUpdate, toCreate, toDelete };
  })();

  const fetchGproKey = async () => {
    if (!user) return;
    setLoadingGpro(true);
    try {
      const { data, error } = await supabase
        .from('gpro_settings')
        .select('api_key')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      if (data) setGproKey(data.api_key);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingGpro(false);
    }
  };

  const generateGproKey = async () => {
    if (!user) return;
    setLoadingGpro(true);
    const newKey = 'lovc_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    try {
      const { error } = await supabase
        .from('gpro_settings')
        .upsert({ user_id: user.id, api_key: newKey, is_active: true }, { onConflict: 'user_id' });
      
      if (error) throw error;
      setGproKey(newKey);
      toast.success("Nova chave GPRO gerada!");
    } catch (e: any) {
      toast.error("Erro ao gerar chave: " + e.message);
    } finally {
      setLoadingGpro(false);
    }
  };

  useEffect(() => { 
    load(); 
    if (user) fetchGproKey();
  }, [user]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      stock: String(p.stock),
      car_filter: p.car_filter ?? ""
    });
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
      description: d.description ?? null,
      car_filter: form.car_filter.trim() || null,
      user_id: user!.id,
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

  const handleFile = async (file: File, gpro = false) => {
    try {
      if (gpro && !file.name.toLowerCase().endsWith(".xlsx")) {
        toast.error("Arquivo inválido. Envie um arquivo .xlsx exportado do GPRO.");
        return;
      }
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (gpro) {
        const headerRow = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" })[0] ?? [];
        const headers = (headerRow as any[]).map((h) => normalizeKey(String(h ?? "")));
        const missing: string[] = [];
        if (!headers.some((h) => h === "codigo" || h === "cod" || h === "code")) missing.push("Código");
        if (!headers.some((h) => h === "descricao" || h === "descricaoproduto" || h === "descproduto" || h === "description")) missing.push("Descrição");
        if (!headers.some((h) => h === "precovenda" || h === "altpreco" || h === "vlrvenda" || h === "valorvenda" || h === "preco")) missing.push("Preço Venda/Alt.Preço");
        if (missing.length > 0) {
          toast.error("Colunas obrigatórias do GPRO ausentes: " + missing.join(", "));
          return;
        }
      }
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "", raw: true });
       const parsed = rows.map((r) => {
         const obj: Record<string, any> = {};
         Object.keys(r).forEach((k) => { obj[normalizeKey(k)] = r[k]; });
         const name = String(
           obj.nome ?? obj.name ?? obj.produto ??
           obj.descricao ?? obj.descricaoproduto ?? obj.descproduto ?? obj.description ?? ""
         ).trim();
         const price = parseNumber(
           obj.preco ?? obj.price ?? obj.valor ??
           obj.precovenda ?? obj.vlrvenda ?? obj.valorvenda ?? obj.precovista ?? obj.altpreco
         );
         const rawStock = obj.estoque ?? obj.stock ?? obj.quantidade ??
           obj.qtdestoque ?? obj.saldoestoque ?? obj.estoqueatual ?? obj.saldo;
         const hasStock = rawStock !== undefined && rawStock !== "" && rawStock !== null;
         const stock = hasStock ? Math.floor(parseNumber(rawStock)) : 0;
         const description = String(obj.descricaolonga ?? obj.observacao ?? obj.obs ?? "").trim();
         return { name, description, price, stock, hasStock };
       }).filter(p => p.name.length > 0);
      if (parsed.length === 0) { toast.error("Nenhuma linha válida. Verifique as colunas do arquivo."); return; }
      setIsGpro(gpro);
      setImportPreview(parsed);
      setImportOpen(true);
    } catch (e: any) {
      toast.error("Erro ao ler arquivo: " + e.message);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
      if (gproRef.current) gproRef.current.value = "";
    }
  };

  const confirmImport = async () => {
    if (!user) return;
    setImporting(true);
    try {
      // 1. Insert new (Agora habilitado para GPRO também para permitir migração total)
      if (diff.toCreate.length > 0) {
        const payload = diff.toCreate.map(p => ({
          name: p.name, price: p.price, stock: p.stock,
          description: p.description || null, user_id: user.id,
        }));
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
      // 2. Update changed (em GPRO atualiza só preço e estoque)
      for (const { existing, next } of diff.toUpdate) {
        // Para GPRO, mantemos a descrição original se já existir, para o resto atualizamos tudo
        const updatePayload: { price: number; stock?: number; description?: string | null } = { price: next.price };
        if (next.hasStock) updatePayload.stock = next.stock;
        if (!isGpro) updatePayload.description = next.description || null;
        const { error } = await supabase.from("products").update(updatePayload).eq("id", existing.id);
        if (error) throw error;
      }
      // 3. Delete missing (somente fora do modo GPRO)
      if (!isGpro && removeMissing && diff.toDelete.length > 0) {
        const ids = diff.toDelete.map(p => p.id);
        const { error } = await supabase.from("products").delete().in("id", ids);
        if (error) throw error;
      }
      toast.success(
        isGpro
          ? `GPRO sincronizado: ${diff.toCreate.length} novo(s) e ${diff.toUpdate.length} atualizado(s)`
          : `Sincronizado: ${diff.toCreate.length} novo(s), ${diff.toUpdate.length} atualizado(s)` +
            (removeMissing ? `, ${diff.toDelete.length} removido(s)` : "")
      );
      setImportOpen(false);
      setImportPreview([]);
      setRemoveMissing(false);
      setIsGpro(false);
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
        <input
          ref={gproRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f, true); }}
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
              <div>
                <Label>Carro (Filtro)</Label>
                <Input
                  value={form.car_filter}
                  onChange={(e) => setForm({ ...form, car_filter: e.target.value })}
                  placeholder="Ex: corsa, vhc, f30..."
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Use palavras-chave que correspondam ao "Filtro" cadastrado no carro.
                </p>
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
            placeholder={searching ? "Buscando..." : "Pesquisa por descrição, nome..."}
            className="pl-9"
          />
        </div>

        <Button variant="outline" onClick={() => setGproSettingsOpen(true)}>
          <RefreshCw className="w-4 h-4 mr-1" /> Configurar Auto-Sync
        </Button>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-1" /> Modelo
        </Button>
        <Button onClick={() => fileRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
          <Upload className="w-4 h-4 mr-1" /> Importar Produtos
        </Button>
        <Button onClick={() => gproRef.current?.click()} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold">
          <Upload className="w-4 h-4 mr-1" /> Sincronizar com GPRO
        </Button>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[45%] py-4 font-semibold text-slate-900">Produto</TableHead>
                <TableHead className="text-center font-semibold text-slate-900">Estoque</TableHead>
                <TableHead className="text-center font-semibold text-slate-900">Preço Unitário</TableHead>
                <TableHead className="text-right py-4 pr-6 font-semibold text-slate-900">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm md:text-base leading-tight">
                        {p.name}
                      </span>
                      {p.description && (
                        <span className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
                          {p.description}
                        </span>
                      )}
                      {p.car_filter && (
                        <div className="flex mt-1.5">
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-blue-100">
                            {p.car_filter}
                          </span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className={`text-sm font-bold ${p.stock <= 5 ? 'text-red-600' : 'text-slate-700'}`}>
                        {p.stock}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase font-medium">unidades</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-mono font-bold text-slate-900 text-base">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-4 pr-6">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEdit(p)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={() => remove(p.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>


      {items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
          {query ? (
            <>
              <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium">Nenhum produto encontrado</p>
              <p className="text-sm">Tente ajustar sua pesquisa para "{query}"</p>
            </>
          ) : (
            <>
              <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium">Seu catálogo está vazio</p>
              <p className="text-sm">Clique em "Novo Produto" ou importe uma planilha para começar.</p>
            </>
          )}
        </div>
      )}


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
            <DialogTitle>{isGpro ? "Sincronizar com GPRO" : "Sincronizar planilha"}</DialogTitle>
            <DialogDescription>
              {isGpro
                ? "Apenas preço e estoque serão atualizados nos produtos correspondentes (busca por descrição/nome). Itens novos não serão criados."
                : "Resumo das mudanças que serão aplicadas no catálogo."}
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
      <Dialog open={gproSettingsOpen} onOpenChange={setGproSettingsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-orange-600" />
              Sincronização Automática GPRO
            </DialogTitle>
            <DialogDescription>
              Use esta chave no seu Sincronizador Local para atualizar preços e estoque automaticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sua Chave de API (GPRO)</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input 
                    value={gproKey} 
                    readOnly 
                    placeholder="Nenhuma chave gerada"
                    className="pr-10 bg-muted/50 font-mono text-xs"
                  />
                  <Key className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground opacity-50" />
                </div>
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => {
                    navigator.clipboard.writeText(gproKey);
                    toast.success("Chave copiada!");
                  }}
                  disabled={!gproKey}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={generateGproKey}
                  disabled={loadingGpro}
                >
                  {gproKey ? "Regerar" : "Gerar"}
                </Button>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                Como configurar no seu PC:
              </h4>
              <ol className="text-xs space-y-2 list-decimal pl-4 text-muted-foreground">
                <li>Instale o Python no computador onde o GPRO está instalado.</li>
                <li>Baixe o script de sincronização (ponte) para Firebird.</li>
                <li>Insira sua <strong>Chave de API</strong> e a <strong>URL do seu site</strong> no script.</li>
                <li>Configure o Agendador de Tarefas do Windows para rodar o script a cada 5 minutos.</li>
              </ol>
            </div>
            
            <div className="text-[10px] text-muted-foreground bg-orange-50 p-2 border border-orange-100 rounded">
              <strong>Endpoint da API:</strong><br />
              <code>{window.location.origin}/functions/v1/gpro-sync</code>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setGproSettingsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
