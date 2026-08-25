import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { BarChart3 } from "lucide-react";

const Reports = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" description="Relatórios de vendas, estoque e financeiro" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vendas por período</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState icon={BarChart3} title="Em breve" description="Gráfico de vendas por período." />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Produtos mais vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState icon={BarChart3} title="Em breve" description="Ranking de produtos mais vendidos." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
