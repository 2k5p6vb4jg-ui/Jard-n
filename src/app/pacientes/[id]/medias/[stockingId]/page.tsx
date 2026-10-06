import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { StockingForm } from "@/components/patients/StockingForm";
import { saveStocking } from "../../../prescriptions";

export const metadata = { title: "Editar medias" };

export default async function EditStockingPage({ params }: { params: Promise<{ id: string; stockingId: string }> }) {
  const { id, stockingId } = await params;
  const stocking = await prisma.compressionStocking.findUnique({
    where: { id: stockingId, patientId: id },
    include: { patient: { select: { firstName: true, lastName: true } } },
  });
  if (!stocking) notFound();
  return (
    <>
      <PageHeader title="Editar medias de compresión" description={`${stocking.patient.firstName} ${stocking.patient.lastName}`} />
      <StockingForm action={saveStocking.bind(null, id, stockingId)} stocking={stocking} cancelHref={`/pacientes/${id}`} />
    </>
  );
}
