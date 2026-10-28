import { PageHeader } from "@/components/ui/PageHeader";
import { InsoleOrderForm } from "@/components/insoleOrders/InsoleOrderForm";
import { getInsoleOrderFormOptions } from "@/lib/insoleOrders";
import { createInsoleOrder } from "../actions";

export const metadata = { title: "Nuevas plantillas" };

export default async function NewInsoleOrderPage({ searchParams }: { searchParams: Promise<{ paciente?: string; centro?: string }> }) {
  const { paciente, centro } = await searchParams;
  return (
    <>
      <PageHeader title="Nuevas plantillas" description="Se asigna un código PL automáticamente" />
      <InsoleOrderForm
        action={createInsoleOrder}
        options={await getInsoleOrderFormOptions()}
        defaults={{ patientId: paciente, centerId: centro }}
        cancelHref={centro ? `/centros/${centro}` : paciente ? `/pacientes/${paciente}` : "/plantillas"}
      />
    </>
  );
}
