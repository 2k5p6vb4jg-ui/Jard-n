import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { StockingForm } from "@/components/patients/StockingForm";
import { saveStocking } from "../../../prescriptions";

export const metadata = { title: "Nuevas medias" };

export default async function NewStockingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await prisma.patient.findUnique({ where: { id }, select: { firstName: true, lastName: true } });
  if (!patient) notFound();
  return (
    <>
      <PageHeader title="Nuevas medias de compresión" description={`${patient.firstName} ${patient.lastName}`} />
      <StockingForm action={saveStocking.bind(null, id, null)} cancelHref={`/pacientes/${id}`} />
    </>
  );
}
