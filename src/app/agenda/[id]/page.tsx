import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, CalendarClock, Check, RotateCcw, Trash2, UserX } from "lucide-react";
import type { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { appointmentStatus } from "@/lib/labels";
import { messages } from "@/lib/whatsapp";
import { businessName } from "@/lib/settings";
import { appointmentInclude, getAppointmentFormOptions } from "@/lib/appointments";
import { AppointmentForm } from "@/components/agenda/AppointmentForm";
import { whenText } from "@/components/agenda/AppointmentCard";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { deleteAppointment, saveAppointment, setAppointmentStatus } from "../actions";
import { toDateInput } from "@/lib/forms";

export const metadata = { title: "Cita" };

const STATUS_BUTTONS: { to: AppointmentStatus; label: string; icon: typeof Check; variant: "primary" | "secondary" }[] = [
  { to: "DONE", label: "Hecha", icon: Check, variant: "primary" },
  { to: "NO_SHOW", label: "No vino", icon: UserX, variant: "secondary" },
  { to: "CANCELLED", label: "Anular", icon: Ban, variant: "secondary" },
];

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a, options, business] = await Promise.all([
    prisma.appointment.findUnique({ where: { id }, include: appointmentInclude }),
    getAppointmentFormOptions(),
    businessName(),
  ]);
  if (!a) notFound();
  const st = appointmentStatus[a.status];
  const who = a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : (a.center?.name ?? "Sin cliente");
  const context =
    a.workOrder || a.insoleOrder
      ? { workOrderId: a.workOrder?.id, insoleOrderId: a.insoleOrder?.id, label: a.workOrder ? `la reparación ${a.workOrder.code}` : `las plantillas ${a.insoleOrder!.code}` }
      : undefined;
  const links = [
    a.patient && { href: `/pacientes/${a.patient.id}`, label: `Ficha de ${a.patient.firstName} ${a.patient.lastName}` },
    a.center && { href: `/centros/${a.center.id}`, label: a.center.name },
    a.workOrder && { href: `/taller/${a.workOrder.id}`, label: `Reparación ${a.workOrder.code}` },
    a.insoleOrder && { href: `/plantillas/${a.insoleOrder.id}`, label: `Plantillas ${a.insoleOrder.code}` },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/agenda?semana=${toDateInput(a.startsAt)}`} className="hover:underline">Agenda</Link>}
        title={`${a.type.label} · ${who}`}
        description={<span className="flex flex-wrap items-center gap-2"><span className="first-letter:uppercase">{whenText(a.startsAt)}</span><Badge tone={st.tone}>{st.label}</Badge></span>}
        actions={<LinkButton href={`/agenda?semana=${toDateInput(a.startsAt)}`} variant="secondary">Volver a la agenda</LinkButton>}
      />
      <Card className="mb-6">
        <CardHeader title="¿Cómo fue?" icon={CalendarClock} />
        <div className="flex flex-wrap items-center gap-2 p-5">
          {a.status === "SCHEDULED" ? (
            STATUS_BUTTONS.map((b) => (
              <form key={b.to} action={setAppointmentStatus.bind(null, a.id, b.to)}>
                <Button type="submit" variant={b.variant} icon={b.icon}>{b.label}</Button>
              </form>
            ))
          ) : (
            <form action={setAppointmentStatus.bind(null, a.id, "SCHEDULED")}>
              <Button type="submit" variant="secondary" icon={RotateCcw}>Volver a pendiente</Button>
            </form>
          )}
          {a.status === "SCHEDULED" && a.patient && (
            <WhatsAppButton phone={a.patient.phone} label="Recordar por WhatsApp" text={messages.appointment(a.patient.firstName, a.type.label, whenText(a.startsAt), business)} />
          )}
        </div>
        {links.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-100 px-5 py-3 text-sm">
            {links.map((l) => <Link key={l.href} href={l.href} className="font-medium text-teal-700 hover:underline">{l.label}</Link>)}
          </div>
        )}
      </Card>

      <AppointmentForm action={saveAppointment.bind(null, a.id)} appointment={a} options={options} context={context} back={`/agenda/${a.id}`} />

      <form action={deleteAppointment.bind(null, a.id)} className="mt-6">
        <ConfirmButton message="¿Borrar esta cita? Si solo no viene, mejor márquela como «Anular»." icon={<Trash2 className="size-4" />} className="text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600">Borrar cita</ConfirmButton>
      </form>
    </>
  );
}
