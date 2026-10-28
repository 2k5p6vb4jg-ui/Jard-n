import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { PatientForm } from "@/components/patients/PatientForm";
import { updatePatient } from "../../actions";
import { getCentersForSelect } from "@/lib/centers";

export const metadata = { title: "Editar cliente" };

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) notFound();
  return (
    <>
      <PageHeader title={`Editar · ${patient.firstName} ${patient.lastName}`} />
      <PatientForm action={updatePatient.bind(null, id)} patient={patient} centers={await getCentersForSelect()} cancelHref={`/pacientes/${id}`} />
    </>
  );
}
