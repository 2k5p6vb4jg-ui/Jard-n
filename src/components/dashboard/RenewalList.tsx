import Link from "next/link";
import { BellRing, CalendarClock, Clock, Footprints, PhoneCall, PhoneOutgoing, Plus, UserX } from "lucide-react";
import type { RenewalAlert } from "@/lib/renewals";
import { formatDate } from "@/lib/dates";
import { updateRenewal, type RenewalAction } from "@/app/renewals";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubmitButton } from "@/components/ui/Form";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

const small = "min-h-11 px-3 text-sm";

/** Avisos de renovación con acciones rápidas, pensadas para usar con el dedo en la tablet. */
export function RenewalList({ alerts }: { alerts: RenewalAlert[] }) {
  if (alerts.length === 0) {
    return <EmptyState icon={BellRing} title="Sin renovaciones pendientes" text="Aquí aparecerán los pacientes cuya prescripción vence en los próximos días." />;
  }

  const act = (a: RenewalAlert, action: RenewalAction) => updateRenewal.bind(null, a.kind, a.id, action);

  return (
    <ul className="divide-y divide-slate-100">
      {alerts.map((a) => {
        const contacted = a.renewalStatus === "CONTACTED";
        const newHref = `/pacientes/${a.patientId}/${a.kind === "INSOLE" ? "plantillas" : "medias"}/nueva`;
        return (
          <li key={`${a.kind}-${a.id}`} className={`space-y-3 px-5 py-4 ${contacted ? "bg-slate-50/70" : ""}`}>
            <div className="flex items-start gap-4">
              <span className={`grid size-10 shrink-0 place-items-center rounded-full ${a.kind === "INSOLE" ? "bg-indigo-50 text-indigo-600" : "bg-teal-50 text-teal-600"}`}>
                {a.kind === "INSOLE" ? <Footprints className="size-5" /> : <CalendarClock className="size-5" />}
              </span>
              <Link href={`/pacientes/${a.patientId}`} className="min-w-0 flex-1 hover:underline">
                <p className="truncate font-medium text-slate-800">{a.patientName}</p>
                <p className="truncate text-sm text-slate-500">{a.detail} · entregadas {formatDate(a.deliveredAt)}</p>
              </Link>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Badge tone={a.severity === "overdue" ? "rose" : "amber"}>
                  {a.daysLeft < 0 ? `Vencido hace ${-a.daysLeft} d` : a.daysLeft === 0 ? "Vence hoy" : `En ${a.daysLeft} d`}
                </Badge>
                {contacted && <Badge tone="sky"><PhoneCall className="size-3" />Llamado {formatDate(a.renewalUpdatedAt)}</Badge>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:pl-14">
              {a.phone && (
                <a href={`tel:${a.phone.replace(/\s/g, "")}`} className={`inline-flex items-center gap-2 rounded-xl bg-white font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 ${small}`}>
                  <PhoneOutgoing className="size-4" />
                  {a.phone}
                </a>
              )}
              {!contacted && (
                <form action={act(a, "CONTACTED")}>
                  <SubmitButton icon={<PhoneCall className="size-4" />} variant="secondary" className={small}>Llamado</SubmitButton>
                </form>
              )}
              <Link href={newHref} className={`inline-flex items-center gap-2 rounded-xl bg-teal-600 font-medium text-white shadow-sm hover:bg-teal-700 ${small}`}>
                <Plus className="size-4" />
                Renovar
              </Link>
              <form action={act(a, "SNOOZE")}>
                <SubmitButton icon={<Clock className="size-4" />} variant="secondary" className={small}>En 30 días</SubmitButton>
              </form>
              <form action={act(a, "DISMISSED")}>
                <ConfirmButton message={`¿${a.patientName} no va a renovar? El aviso dejará de mostrarse.`} icon={<UserX className="size-4" />} className={`text-slate-500 hover:bg-rose-50 hover:text-rose-600 ${small}`}>
                  No renueva
                </ConfirmButton>
              </form>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
