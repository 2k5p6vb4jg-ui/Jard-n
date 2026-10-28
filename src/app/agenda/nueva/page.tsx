import { prisma } from "@/lib/prisma";
import { getAppointmentFormOptions } from "@/lib/appointments";
import { PageHeader } from "@/components/ui/PageHeader";
import { AppointmentForm } from "@/components/agenda/AppointmentForm";
import { saveAppointment } from "../actions";

export const metadata = { title: "Dar cita" };

type Params = { fecha?: string; hora?: string; paciente?: string; centro?: string; reparacion?: string; plantilla?: string; tipo?: string };

export default async function NewAppointmentPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { fecha, hora, paciente, centro, reparacion, plantilla, tipo } = await searchParams;
  const [options, wo, io] = await Promise.all([
    getAppointmentFormOptions(),
    reparacion ? prisma.workOrder.findUnique({ where: { id: reparacion }, select: { id: true, code: true, patient: { select: { firstName: true, lastName: true } }, center: { select: { name: true } } } }) : null,
    plantilla ? prisma.insoleOrder.findUnique({ where: { id: plantilla }, select: { id: true, code: true, patient: { select: { firstName: true, lastName: true } } } }) : null,
  ]);
  const owner = (p: { firstName: string; lastName: string } | null | undefined, c?: { name: string } | null) => (p ? ` de ${p.firstName} ${p.lastName}` : c ? ` de ${c.name}` : "");
  const context = wo
    ? { workOrderId: wo.id, label: `la reparación ${wo.code}${owner(wo.patient, wo.center)}` }
    : io
      ? { insoleOrderId: io.id, label: `las plantillas ${io.code}${owner(io.patient)}` }
      : undefined;
  const back = wo ? `/taller/${wo.id}` : io ? `/plantillas/${io.id}` : paciente ? `/pacientes/${paciente}` : centro ? `/centros/${centro}` : undefined;
  // Desde unas plantillas, lo normal es la entrega o la prueba; se propone el tipo por su nombre
  const guess = (word: string) => options.types.find((t) => t.active && t.label.toLowerCase().includes(word))?.id;
  const typeId = tipo ?? (io ? guess("prueba") : wo ? guess("entrega") : centro && !paciente ? guess("centro") : undefined);
  return (
    <>
      <PageHeader eyebrow="Agenda" title="Dar cita" />
      <AppointmentForm
        action={saveAppointment.bind(null, null)}
        options={options}
        defaults={{ date: fecha, time: hora, patientId: paciente, centerId: centro, typeId }}
        context={context}
        back={back}
      />
    </>
  );
}
