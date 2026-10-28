import { prisma } from "@/lib/prisma";
import { getItemFormOptions } from "@/lib/orders";
import { PageHeader } from "@/components/ui/PageHeader";
import { ItemForm } from "@/components/orders/ItemForm";
import { saveItem } from "../actions";

export const metadata = { title: "Apuntar para pedir" };

export default async function NewItemPage({ searchParams }: { searchParams: Promise<{ reparacion?: string; plantilla?: string; paciente?: string; centro?: string; marca?: string }> }) {
  const { reparacion, plantilla, paciente, centro, marca } = await searchParams;
  const [options, wo, io] = await Promise.all([
    getItemFormOptions(),
    reparacion ? prisma.workOrder.findUnique({ where: { id: reparacion }, select: { id: true, code: true, equipmentCategory: { select: { label: true } } } }) : null,
    plantilla ? prisma.insoleOrder.findUnique({ where: { id: plantilla }, select: { id: true, code: true, patient: { select: { firstName: true, lastName: true } } } }) : null,
  ]);
  const context = wo
    ? { workOrderId: wo.id, label: `la reparación ${wo.code} (${wo.equipmentCategory.label})` }
    : io
      ? { insoleOrderId: io.id, label: `las plantillas ${io.code} de ${io.patient.firstName} ${io.patient.lastName}` }
      : undefined;
  const back = wo ? `/taller/${wo.id}` : io ? `/plantillas/${io.id}` : paciente ? `/pacientes/${paciente}` : centro ? `/centros/${centro}` : "/pedidos";
  return (
    <>
      <PageHeader eyebrow="Pedidos" title="Apuntar para pedir" description="Queda en «Por pedir», agrupado por marca, hasta que se haga el pedido" />
      <ItemForm action={saveItem.bind(null, null)} options={options} defaults={{ patientId: paciente, centerId: centro, supplierId: marca }} context={context} back={back} />
    </>
  );
}
