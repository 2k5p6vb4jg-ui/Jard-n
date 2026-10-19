import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { InsoleOrderForm } from "@/components/insoleOrders/InsoleOrderForm";
import { getInsoleOrderFormOptions } from "@/lib/insoleOrders";
import { updateInsoleOrder } from "../../actions";

export const metadata = { title: "Editar plantillas" };

export default async function EditInsoleOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.insoleOrder.findUnique({ where: { id } });
  if (!order) notFound();
  return (
    <>
      <PageHeader title={`Editar ${order.code}`} />
      <InsoleOrderForm action={updateInsoleOrder.bind(null, id)} order={order} options={await getInsoleOrderFormOptions()} cancelHref={`/plantillas/${id}`} />
    </>
  );
}
