import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getItemFormOptions } from "@/lib/orders";
import { PageHeader } from "@/components/ui/PageHeader";
import { ItemForm } from "@/components/orders/ItemForm";
import { saveItem } from "../../actions";

export const metadata = { title: "Editar artículo" };

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, options] = await Promise.all([
    prisma.orderItem.findUnique({ where: { id }, include: { workOrder: { select: { code: true } }, insoleOrder: { select: { code: true } } } }),
    getItemFormOptions(),
  ]);
  if (!item) notFound();
  const context =
    item.workOrderId || item.insoleOrderId
      ? { workOrderId: item.workOrderId ?? undefined, insoleOrderId: item.insoleOrderId ?? undefined, label: item.workOrder ? `la reparación ${item.workOrder.code}` : `las plantillas ${item.insoleOrder!.code}` }
      : undefined;
  return (
    <>
      <PageHeader eyebrow="Pedidos" title="Editar artículo" />
      <ItemForm action={saveItem.bind(null, id)} item={item} options={options} context={context} back={item.purchaseOrderId ? `/pedidos/${item.purchaseOrderId}` : "/pedidos"} />
    </>
  );
}
