import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, UserPlus, Save, UserCheck } from "lucide-react";
import { Label } from "@/components/ui/label";

interface Seller {
  id: string;
  name: string;
  venda_facil_user_id: string | null;
  active: boolean;
}

const Sellers = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [newName, setNewName] = useState("");
  const [newVfId, setNewVfId] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSellers = async () => {
    const { data, error } = await supabase
      .from("sellers")
      .select("*")
      .order("name");
    
    if (error) {
      toast.error("Erro ao carregar vendedores");
    } else {
      setSellers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handleAddSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { error } = await supabase.from("sellers").insert({
      name: newName,
      venda_facil_user_id: newVfId.trim() || null,
      user_id: userData.user.id,
    });

    if (error) {
      toast.error("Erro ao adicionar vendedor");
    } else {
      toast.success("Vendedor adicionado");
      setNewName("");
      setNewVfId("");
      fetchSellers();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("sellers").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Excluído com sucesso");
      fetchSellers();
    }
  };

  const handleUpdateVfId = async (id: string, vfId: string) => {
    const { error } = await supabase
      .from("sellers")
      .update({ venda_facil_user_id: vfId.trim() || null })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar ID");
    } else {
      toast.success("ID atualizado");
      fetchSellers();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
          <UserCheck className="w-8 h-8 text-blue-600" />
          Gerenciar Vendedores
        </h1>
      </div>

      <Card className="p-6">
        <form onSubmit={handleAddSeller} className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Novo Vendedor
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Vendedor</Label>
              <Input
                placeholder="Ex: André"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>ID no Venda Fácil (UUID)</Label>
              <Input
                placeholder="Opcional: ID do usuário no Venda Fácil"
                value={newVfId}
                onChange={(e) => setNewVfId(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            Adicionar Vendedor
          </Button>
        </form>
      </Card>

      <div className="grid gap-4">
        {loading ? (
          <p>Carregando...</p>
        ) : sellers.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">Nenhum vendedor cadastrado.</p>
        ) : (
          sellers.map((seller) => (
            <Card key={seller.id} className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-black text-lg">{seller.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">VF ID:</span>
                  <Input
                    className="h-8 text-xs font-mono"
                    defaultValue={seller.venda_facil_user_id || ""}
                    placeholder="Cole o ID do Venda Fácil aqui"
                    onBlur={(e) => handleUpdateVfId(seller.id, e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="text-red-500 hover:bg-red-50"
                  onClick={() => handleDelete(seller.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Sellers;
