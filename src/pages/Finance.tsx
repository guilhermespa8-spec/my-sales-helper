import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Wallet, TrendingUp, TrendingDown } from "lucide-react";

const Finance = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" description="Controle de contas a pagar e a receber" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">A receber</p>
                <p className="text-2xl font-bold text-success mt-1">R$ 0,00</p>
              </div>
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">A pagar</p>
                <p className="text-2xl font-bold text-destructive mt-1">R$ 0,00</p>
              </div>
              <TrendingDown className="w-6 h-6 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className="text-2xl font-bold mt-1">R$ 0,00</p>
              </div>
              <Wallet className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Lançamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Wallet} title="Nenhum lançamento" description="O controle financeiro será implementado em breve." />
        </CardContent>
      </Card>
    </div>
  );
};

export default Finance;
