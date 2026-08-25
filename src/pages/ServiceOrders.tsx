import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Wrench } from "lucide-react";

const ServiceOrders = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Ordens de Serviço" description="Controle de serviços e manutenções" />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ordens abertas</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={Wrench} title="Nenhuma ordem de serviço" description="O módulo de ordens de serviço será implementado em breve." />
        </CardContent>
      </Card>
    </div>
  );
};

export default ServiceOrders;
