import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkOrderForm } from "@/components/workshop/WorkOrderForm";
import { getWorkOrderFormOptions } from "@/lib/workOrderOptions";
import { updateWorkOrder } from "../../actions";

export const metadata = { title: "Editar orden" };

export default async function EditWorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.workOrder.findUnique({ where: { id } });
  if (!order) notFound();
  return (
    <>
      <PageHeader title={`Editar ${order.code}`} />
      <WorkOrderForm action={updateWorkOrder.bind(null, id)} order={order} options={await getWorkOrderFormOptions()} cancelHref={`/taller/${id}`} />
    </>
  );
}
