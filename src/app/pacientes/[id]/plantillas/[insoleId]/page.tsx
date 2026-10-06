import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { InsoleForm } from "@/components/patients/InsoleForm";
import { saveInsole } from "../../../prescriptions";

export const metadata = { title: "Editar plantillas" };

export default async function EditInsolePage({ params }: { params: Promise<{ id: string; insoleId: string }> }) {
  const { id, insoleId } = await params;
  const insole = await prisma.insolePrescription.findUnique({
    where: { id: insoleId, patientId: id },
    include: { pathologies: true, corrections: true, patient: { select: { firstName: true, lastName: true } } },
  });
  if (!insole) notFound();
  return (
    <>
      <PageHeader title="Editar plantillas" description={`${insole.patient.firstName} ${insole.patient.lastName}`} />
      <InsoleForm action={saveInsole.bind(null, id, insoleId)} insole={insole} cancelHref={`/pacientes/${id}`} />
    </>
  );
}
