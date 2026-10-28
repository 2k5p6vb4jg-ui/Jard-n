import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, ShieldCheck } from "lucide-react";
import { addDays } from "@/lib/dates";
import { toDateInput } from "@/lib/forms";
import { businessName } from "@/lib/settings";
import { agendaBetween, weekStart } from "@/lib/appointments";
import { AppointmentCard } from "@/components/agenda/AppointmentCard";
import { Button, LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Agenda" };

const weekday = new Intl.DateTimeFormat("es-ES", { weekday: "short" });
const monthFmt = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  const picked = semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) ? new Date(`${semana}T00:00:00`) : new Date();
  const from = weekStart(Number.isNaN(picked.getTime()) ? new Date() : picked);
  const to = addDays(from, 7);
  const [{ appointments, visits }, business] = await Promise.all([agendaBetween(from, to), businessName()]);
  const today = toDateInput(new Date());

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(from, i);
    const key = toDateInput(d);
    return {
      d,
      key,
      items: appointments.filter((a) => toDateInput(a.startsAt) === key),
      visits: visits.filter((v) => toDateInput(v.dueAt) === key),
    };
  });
  // El domingo solo aparece si tiene algo
  const shown = days.filter((day, i) => i < 6 || day.items.length + day.visits.length > 0);
  const pending = appointments.filter((a) => a.status === "SCHEDULED").length;
  const range = `${monthFmt.format(from)} – ${monthFmt.format(addDays(to, -1))}`;

  return (
    <>
      <PageHeader
        title="Agenda"
        description={`Semana del ${range} · ${pending === 1 ? "1 cita pendiente" : `${pending} citas pendientes`}`}
        actions={<LinkButton href={`/agenda/nueva?fecha=${toDateInput(from) > today ? toDateInput(from) : today}`} icon={Plus}>Dar cita</LinkButton>}
      />
      <nav aria-label="Semanas" className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 sm:flex">
          <LinkButton href={`/agenda?semana=${toDateInput(addDays(from, -7))}`} variant="secondary" icon={ChevronLeft} className="px-2">Anterior</LinkButton>
          <LinkButton href="/agenda" variant={toDateInput(weekStart(new Date())) === toDateInput(from) ? "ghost" : "secondary"} className="px-3">Hoy</LinkButton>
          <LinkButton href={`/agenda?semana=${toDateInput(to)}`} variant="secondary" className="px-2">Siguiente<ChevronRight className="size-5 shrink-0" /></LinkButton>
        </div>
        <form action="/agenda" className="flex gap-2 sm:ml-auto">
          <input type="date" aria-label="Ir a un día" name="semana" defaultValue={toDateInput(from)} className="field min-w-0 flex-1 sm:w-auto" />
          <Button type="submit" variant="secondary">Ir</Button>
        </form>
      </nav>

      <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 ${shown.length === 7 ? "xl:grid-cols-7" : "xl:grid-cols-6"}`}>
        {shown.map((day) => {
          const isToday = day.key === today;
          const past = day.key < today;
          return (
            <section key={day.key} aria-label={day.key} className={`flex min-w-0 flex-col rounded-2xl border bg-white shadow-card ${past ? "max-md:order-last max-md:opacity-80" : ""} ${isToday ? "border-teal-400 ring-2 ring-teal-100" : "border-slate-200/80"}`}>
              <header className={`flex items-center justify-between rounded-t-2xl px-3 py-2.5 ${isToday ? "bg-teal-600 text-white" : "border-b border-slate-100"}`}>
                <span className="font-semibold capitalize">
                  {weekday.format(day.d).replace(".", "")} <span className="tabular-nums">{day.d.getDate()}</span>
                  {isToday && <span className="ml-1.5 text-xs font-medium opacity-90">· hoy</span>}
                  {past && <span className="ml-1.5 text-xs font-normal text-slate-400 md:hidden">· ya pasado</span>}
                </span>
                <Link
                  href={`/agenda/nueva?fecha=${day.key}`}
                  aria-label={`Dar cita el ${day.key}`}
                  className={`grid size-9 place-items-center rounded-lg ${isToday ? "hover:bg-white/15" : "text-teal-700 hover:bg-teal-50"}`}
                >
                  <Plus className="size-5" />
                </Link>
              </header>
              <div className="flex flex-1 flex-col gap-2 p-2">
                {day.visits.map((v) => (
                  <Link
                    key={v.id}
                    href={v.workOrder ? `/taller/${v.workOrder.id}` : `/centros/${v.proposal.centerId}/propuestas/${v.proposal.id}`}
                    className="flex items-start gap-2 rounded-xl bg-gold-50 p-3 text-sm ring-1 ring-inset ring-gold-200 hover:bg-gold-100"
                  >
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold-700" />
                    <span className="min-w-0">
                      <span className="block font-medium text-gold-900">Revisión de contrato</span>
                      <span className="block truncate text-gold-800">{v.proposal.center.name}</span>
                      {v.workOrder && <span className="block text-xs text-gold-700">{v.workOrder.code}</span>}
                    </span>
                  </Link>
                ))}
                {day.items.map((a) => <AppointmentCard key={a.id} a={a} business={business} />)}
                {day.items.length + day.visits.length === 0 && <p className="px-1 py-3 text-center text-sm text-slate-400">Libre</p>}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
