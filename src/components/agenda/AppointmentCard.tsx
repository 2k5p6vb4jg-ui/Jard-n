import Link from "next/link";
import { appointmentStatus } from "@/lib/labels";
import { messages } from "@/lib/whatsapp";
import { type AppointmentFull, dayFmt, timeFmt } from "@/lib/appointments";
import { Badge } from "@/components/ui/Badge";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";

/** Texto «martes, 3 de noviembre a las 10:30» para recordatorios */
export const whenText = (d: Date) => `${dayFmt.format(d)} a las ${timeFmt.format(d)}`;

/** Una cita en la agenda, el panel o una ficha: hora, tipo, con quién y recordatorio por WhatsApp. */
export function AppointmentCard({ a, business, showDay = false }: { a: AppointmentFull; business: string; showDay?: boolean }) {
  const st = appointmentStatus[a.status];
  const who = a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : a.center?.name;
  const faded = a.status === "CANCELLED" || a.status === "NO_SHOW";
  return (
    <div className={`relative rounded-xl border border-slate-200 bg-white p-3 transition hover:border-teal-300 hover:bg-teal-50/30 ${faded ? "opacity-60" : ""}`}>
      <Link href={`/agenda/${a.id}`} className="absolute inset-0 rounded-xl" aria-label={`Cita: ${a.type.label}${who ? ` con ${who}` : ""}`} />
      <div className="min-w-0">
        <p className={`flex flex-wrap items-center gap-x-2 text-sm ${a.status === "SCHEDULED" && a.patient?.phone ? "pr-11" : ""}`}>
          <span className="font-semibold tabular-nums text-slate-900">{showDay ? `${dayFmt.format(a.startsAt)}, ` : ""}{timeFmt.format(a.startsAt)}</span>
          <span className="text-slate-600">{a.type.label}</span>
        </p>
        <p className={`break-words font-medium leading-snug text-slate-800 ${a.status === "CANCELLED" ? "line-through" : ""}`}>{who ?? "Sin cliente"}</p>
        {(a.patient && a.center) || a.location || a.technician ? (
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{[a.patient && a.center?.name, a.location, a.technician?.name].filter(Boolean).join(" · ")}</p>
        ) : null}
        {a.status !== "SCHEDULED" && <div className="mt-1"><Badge tone={st.tone}>{st.label}</Badge></div>}
      </div>
      {a.status === "SCHEDULED" && a.patient && (
        <div className="absolute right-2 top-2">
          <WhatsAppButton compact phone={a.patient.phone} label="Recordar la cita por WhatsApp" text={messages.appointment(a.patient.firstName, a.type.label, whenText(a.startsAt), business)} />
        </div>
      )}
    </div>
  );
}
