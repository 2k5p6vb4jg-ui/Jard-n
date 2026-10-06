import { PageHeader } from "@/components/ui/PageHeader";
import { WorkOrderForm } from "@/components/workshop/WorkOrderForm";
import { getWorkOrderFormOptions } from "@/lib/workOrderOptions";
import { createWorkOrder } from "../actions";

export const metadata = { title: "Nueva orden de taller" };

export default async function NewWorkOrderPage({ searchParams }: { searchParams: Promise<{ paciente?: string; producto?: string }> }) {
  const { paciente, producto } = await searchParams;
  return (
    <>
      <PageHeader title="Entrada de equipo al taller" description="Se asigna un código OT automáticamente" />
      <WorkOrderForm
        action={createWorkOrder}
        options={await getWorkOrderFormOptions()}
        defaults={{ patientId: paciente, productId: producto }}
        cancelHref={paciente ? `/pacientes/${paciente}` : "/taller"}
      />
    </>
  );
}
