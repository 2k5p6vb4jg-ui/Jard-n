import { PageHeader } from "@/components/ui/PageHeader";
import { PatientForm } from "@/components/patients/PatientForm";
import { createPatient } from "../actions";
import { getCentersForSelect } from "@/lib/centers";

export const metadata = { title: "Nuevo cliente" };

export default async function NewPatientPage({ searchParams }: { searchParams: Promise<{ centro?: string }> }) {
  const { centro } = await searchParams;
  return (
    <>
      <PageHeader title="Nuevo cliente" description="Los campos con * son obligatorios" />
      <PatientForm action={createPatient} centers={await getCentersForSelect()} defaultCenterId={centro} cancelHref={centro ? `/centros/${centro}` : "/pacientes"} />
    </>
  );
}
