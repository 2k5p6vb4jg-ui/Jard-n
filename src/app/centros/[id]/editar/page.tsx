import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { CenterForm } from "@/components/centers/CenterForm";
import { getCenterOptions } from "@/lib/centers";
import { updateCenter } from "../../actions";

export const metadata = { title: "Editar centro" };

export default async function EditCenterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const center = await prisma.center.findUnique({ where: { id } });
  if (!center) notFound();
  return (
    <>
      <PageHeader eyebrow="Centros" title={`Editar ${center.name}`} />
      <CenterForm action={updateCenter.bind(null, id)} center={center} options={await getCenterOptions()} cancelHref={`/centros/${id}`} />
    </>
  );
}
