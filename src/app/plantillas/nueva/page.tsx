import { PageHeader } from "@/components/ui/PageHeader";
import { InsoleOrderForm } from "@/components/insoleOrders/InsoleOrderForm";
import { getInsoleOrderFormOptions } from "@/lib/insoleOrders";
import { createInsoleOrder } from "../actions";

export const metadata = { title: "Nuevas plantillas" };

export default async function NewInsoleOrderPage({ searchParams }: { searchParams: Promise<{ paciente?: string }> }) {
  const { paciente } = await searchParams;
  return (
    <>
      <PageHeader title="Nuevas plantillas" description="Se asigna un código PL automáticamente" />
      <InsoleOrderForm
        action={createInsoleOrder}
        options={await getInsoleOrderFormOptions()}
        defaults={{ patientId: paciente }}
        cancelHref={paciente ? `/pacientes/${paciente}` : "/plantillas"}
      />
    </>
  );
}
