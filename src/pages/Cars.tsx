import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Car, Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface CarType {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
}

const Cars = () => {
  const { user } = useAuth();
  const [cars, setCars] = useState<CarType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<CarType | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCars = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cars")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar carros");
    } else {
      setCars(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCars();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("O nome do carro é obrigatório");
      return;
    }

    setSaving(true);
    const carData = {
      name: name.trim(),
      notes: notes.trim() || null,
      user_id: user?.id,
    };

    let error;
    if (editingCar) {
      const { error: updateError } = await supabase
        .from("cars")
        .update(carData)
        .eq("id", editingCar.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("cars")
        .insert(carData);
      error = insertError;
    }

    if (error) {
      toast.error("Erro ao salvar carro");
    } else {
      toast.success(editingCar ? "Carro atualizado" : "Carro cadastrado");
      setIsDialogOpen(false);
      resetForm();
      fetchCars();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este carro?")) return;

    const { error } = await supabase.from("cars").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir carro");
    } else {
      toast.success("Carro excluído");
      fetchCars();
    }
  };

  const openEdit = (car: CarType) => {
    setEditingCar(car);
    setName(car.name);
    setNotes(car.notes || "");
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingCar(null);
    setName("");
    setNotes("");
  };

  const filteredCars = cars.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "var(--gradient-accent)" }}
          >
            <Car className="w-5 h-5 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Carros</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie os veículos cadastrados no sistema
            </p>
          </div>
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" /> Novo Carro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCar ? "Editar Carro" : "Novo Carro"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Carro</Label>
                <Input
                  id="name"
                  placeholder="Ex: Corsa VHC, BMW F30..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações / Filtro</Label>
                <Textarea
                  id="notes"
                  placeholder="Dica: Use um termo único que facilite a filtragem de peças..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">
                  Este termo será usado para encontrar peças compatíveis automaticamente.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar Carro"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-muted-foreground/5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar carros..."
              className="pl-9 bg-background/50 border-muted-foreground/10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : filteredCars.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground italic">
              Nenhum carro encontrado.
            </div>
          ) : (
            <div className="divide-y divide-muted-foreground/5">
              {filteredCars.map((car) => (
                <div
                  key={car.id}
                  className="p-4 flex items-center justify-between hover:bg-primary/5 transition-colors group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Car className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {car.name}
                      </h3>
                      {car.notes && (
                        <p className="text-xs text-muted-foreground truncate">
                          Filtro: {car.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary"
                      onClick={() => openEdit(car)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(car.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Cars;
