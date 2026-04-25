import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";

interface Mechanic {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
}

const Mechanics = () => {
  const { user } = useAuth();
  const [list, setList] = useState<Mechanic[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Mechanic | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("mechanics").select("*").order("name");
    if (error) { toast.error(error.message); return; }
    setList((data ?? []) as Mechanic[]);
  };

  useEffect(() => { load(); }, []);

  const reset = () => { setEditing(null); setName(""); setPhone(""); setNotes(""); };

  const openNew = () => { reset(); setOpen(true); };
  const openEdit = (m: Mechanic) => {
    setEditing(m); setName(m.name); setPhone(m.phone ?? ""); setNotes(m.notes ?? ""); setOpen(true);
  };

  const save = async () => {
    if (!name.trim()) { toast.error("Informe o nome"); return; }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase.from("mechanics").update({
          name: name.trim(), phone: phone.trim() || null, notes: notes.trim() || null,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Mecânico atualizado");
      } else {
        const { error } = await supabase.from("mechanics").insert({
          user_id: user!.id, name: name.trim(), phone: phone.trim() || null, notes: notes.trim() || null,
        });
        if (error) throw error;
        toast.success("Mecânico cadastrado");
      }
      setOpen(false); reset(); load();
    } catch (e: any) { toast.error(e.message ?? "Erro"); } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este mecânico?")) return;
    const { error } = await supabase.from("mechanics").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Removido"); load();
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Mecânicos</h1>
          <p className="text-sm text-muted-foreground">Cadastre os mecânicos que recebem orçamentos</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Novo mecânico</Button>
      </div>

      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4" /> Lista
            <span className="text-xs font-normal text-muted-foreground">({list.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Wrench className="w-10 h-10 mx-auto mb-2 opacity-40" />
              Nenhum mecânico cadastrado
            </div>
          ) : (
            <div className="grid gap-2">
              {list.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-card/60">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.name}</div>
                    {m.phone && <div className="text-xs text-muted-foreground">{m.phone}</div>}
                    {m.notes && <div className="text-xs text-muted-foreground line-clamp-1">{m.notes}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar mecânico" : "Novo mecânico"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={500} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Mechanics;
