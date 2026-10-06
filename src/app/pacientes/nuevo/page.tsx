import { PageHeader } from "@/components/ui/PageHeader";
import { PatientForm } from "@/components/patients/PatientForm";
import { createPatient } from "../actions";

export const metadata = { title: "Nuevo paciente" };

export default function NewPatientPage() {
  return (
    <>
      <PageHeader title="Nuevo paciente" description="Los campos con * son obligatorios" />
      <PatientForm action={createPatient} cancelHref="/pacientes" />
    </>
  );
}
