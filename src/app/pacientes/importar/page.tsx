import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { PatientImporter } from "@/components/patients/PatientImporter";

export const metadata = { title: "Importar clientes" };

export default function ImportPatientsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Clientes"
        title="Importar clientes"
        description="Desde un CSV exportado de su programa anterior o de una hoja de Excel"
        actions={<LinkButton href="/pacientes" variant="secondary">Volver a Clientes</LinkButton>}
      />
      <PatientImporter />
    </>
  );
}
