import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { InsoleForm } from "@/components/patients/InsoleForm";
import { saveInsole } from "../../../prescriptions";

export const metadata = { title: "Nuevas plantillas" };

export default async function NewInsolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await prisma.patient.findUnique({ where: { id }, select: { firstName: true, lastName: true } });
  if (!patient) notFound();
  return (
    <>
      <PageHeader title="Nuevas plantillas a medida" description={`${patient.firstName} ${patient.lastName}`} />
      <InsoleForm action={saveInsole.bind(null, id, null)} cancelHref={`/pacientes/${id}`} />
    </>
  );
}
