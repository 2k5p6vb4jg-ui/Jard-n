import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, ArrowRight, BellRing, CalendarCheck, CalendarDays, ClipboardPlus, Truck, Footprints, Plus, UserPlus, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getRenewalAlerts } from "@/lib/renewals";
import { formatDate } from "@/lib/dates";
import { WORK_ORDER_FLOW, priorityTone, workOrderStatus } from "@/lib/labels";
import { getStatusLabels } from "@/lib/workOrderOptions";
import { getInsoleOptions, statusTones } from "@/lib/insoleOrders";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { RenewalList } from "@/components/dashboard/RenewalList";
import { SubmitButton } from "@/components/ui/Form";
import { getDueVisits } from "@/lib/contracts";
import { orderCounts } from "@/lib/orders";
import { createVisitOrder } from "@/app/centros/propuestas";
import { todaysAppointments } from "@/lib/appointments";
import { currentSession } from "@/lib/session";
import { canSee } from "@/lib/permissions";
import { AppointmentCard } from "@/components/agenda/AppointmentCard";

export const dynamic = "force-dynamic";

function Kpi({ href, label, value, hint, icon: Icon, tone = "plain" }: { href: string; label: string; value: number; hint: ReactNode; icon: typeof Wrench; tone?: "hero" | "plain" | "alert" }) {
  const styles = {
    hero: "bg-teal-600 text-white border-transparent",
    plain: "bg-white text-slate-900 border-slate-200/80",
    alert: "bg-white text-slate-900 border-rose-200",
  }[tone];
  return (
    <Link href={href} className={`group flex flex-col justify-between gap-4 rounded-2xl border p-4 shadow-card transition hover:shadow-lift sm:p-5 ${styles}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium ${tone === "hero" ? "text-white/80" : "text-slate-500"}`}>{label}</p>
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tone === "hero" ? "bg-white/10 text-gold-400" : tone === "alert" ? "bg-rose-50 text-rose-600" : "bg-gold-50 text-gold-700"}`}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <div>
        <p className={`text-3xl font-semibold tracking-tight sm:text-4xl ${tone === "hero" ? "text-white" : tone === "alert" && value > 0 ? "text-rose-600" : ""}`}>{value}</p>
        <p className={`mt-1 text-xs sm:text-sm ${tone === "hero" ? "text-white/70" : "text-slate-500"}`}>{hint}</p>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const [alerts, byStatus, activeOrders, st, insoleOpts, openInsoles, lateOrders, dueVisits, orders, backup, appointments] = await Promise.all([
    getRenewalAlerts(),
    prisma.workOrder.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.workOrder.findMany({
      where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
      include: {
        patient: { select: { firstName: true, lastName: true } },
        equipmentCategory: { select: { label: true } },
        priority: { select: { label: true, key: true } },
      },
      orderBy: [{ promisedAt: "asc" }, { receivedAt: "asc" }],
      take: 8,
    }),
    getStatusLabels(),
    getInsoleOptions(),
    prisma.insoleOrder.findMany({
      where: { status: { isFinal: false } },
      include: { patient: { select: { firstName: true, lastName: true } }, type: { select: { label: true } }, status: true },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.workOrder.count({ where: { status: { notIn: ["DELIVERED", "CANCELLED"] }, promisedAt: { lt: today } } }),
    getDueVisits(14),
    orderCounts(),
    prisma.settings.findUnique({ where: { id: 1 }, select: { businessName: true, autoBackup: true, lastAutoBackupAt: true, backupMirrorDir: true, lastMirrorError: true } }),
    todaysAppointments(),
  ]);
  const { user } = await currentSession();
  const showRenewals = canSee(user?.role, "clientes");

  const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const activeCount = WORK_ORDER_FLOW.filter((s) => s !== "DELIVERED").reduce((n, s) => n + count(s), 0);
  const overdue = alerts.filter((a) => a.severity === "overdue").length;
  const tones = statusTones(insoleOpts.statuses);
  // «Listas para recoger»: el último estado en curso de la lista configurada
  const lastOpen = insoleOpts.statuses.filter((s) => !s.isFinal).at(-1)?.id;
  const insolesReady = openInsoles.filter((o) => o.statusId === lastOpen).length;
  const lateInsoles = openInsoles.filter((o) => o.dueAt && o.dueAt < today).length;
  const hour = new Date().getHours();
  const who = (p: { firstName: string; lastName: string } | null, fallback?: string | null) => (p ? `${p.firstName} ${p.lastName}` : (fallback ?? "—"));

  return (
    <>
      {/* Aviso si las copias de seguridad no se están haciendo bien */}
      {canSee(user?.role, "ajustes") && backup && ((backup.autoBackup && (!backup.lastAutoBackupAt || backup.lastAutoBackupAt < new Date(Date.now() - 3 * 86_400_000))) || (backup.backupMirrorDir && backup.lastMirrorError)) && (
        <Link href="/configuracion" className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 hover:bg-rose-100">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <span>
            <strong>Revise las copias de seguridad.</strong>{" "}
            {backup.backupMirrorDir && backup.lastMirrorError
              ? `La segunda copia en «${backup.backupMirrorDir}» falla (¿está conectado el disco?).`
              : "Hace más de 3 días que no se hace la copia automática."}
          </span>
        </Link>
      )}
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("es-ES", { dateStyle: "full" }).format(new Date())}
        title={`${hour < 14 ? "Buenos días" : hour < 21 ? "Buenas tardes" : "Buenas noches"}${user ? `, ${user.name}` : ""}`}
        description="Resumen del taller, las plantillas y los avisos de hoy"
        actions={
          <>
            {showRenewals && <LinkButton href="/pacientes/nuevo" variant="secondary" icon={UserPlus}>Nuevo cliente</LinkButton>}
            <LinkButton href="/plantillas/nueva" variant="secondary" icon={Plus}>Plantillas</LinkButton>
            <LinkButton href="/taller/nueva" icon={ClipboardPlus}>Nueva reparación</LinkButton>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Kpi href="/taller" tone="hero" icon={Wrench} label="Reparaciones en curso" value={activeCount} hint={`${count("READY")} ${count("READY") === 1 ? "lista" : "listas"} para entregar`} />
        <Kpi href="/plantillas" icon={Footprints} label="Plantillas en curso" value={openInsoles.length} hint={`${insolesReady} ${insolesReady === 1 ? "lista" : "listas"} para recoger`} />
        <Kpi href="/taller" tone="alert" icon={AlertTriangle} label="Retrasadas" value={lateOrders + lateInsoles} hint="Fecha prevista superada" />
        {showRenewals ? <Kpi href="#avisos" icon={BellRing} label="Renovaciones" value={alerts.length} hint={overdue ? `${overdue} ${overdue === 1 ? "vencida" : "vencidas"}` : "Ninguna vencida"} /> : <Kpi href="/agenda" icon={CalendarDays} label="Citas de hoy" value={appointments.length} hint="Ver la agenda" />}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <Card>
            <CardHeader
              title="Reparaciones en curso"
              icon={Wrench}
              action={<Link href="/taller" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">Ver todas <ArrowRight className="size-4" /></Link>}
            />
            {/* Flujo: cuántas órdenes hay en cada paso */}
            <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-5 py-3">
              {WORK_ORDER_FLOW.filter((s) => s !== "DELIVERED").map((s) => (
                <Link key={s} href={`/taller?estado=${s}`} className="flex min-h-10 flex-none items-center justify-between gap-2.5 whitespace-nowrap rounded-lg bg-slate-50 px-3 text-sm hover:bg-slate-100 2xl:flex-1">
                  <span className="truncate text-slate-600">{st[s]}</span>
                  <span className="font-semibold text-slate-900">{count(s)}</span>
                </Link>
              ))}
            </div>
            {activeOrders.length === 0 ? (
              <EmptyState icon={Wrench} title="No hay reparaciones en curso" />
            ) : (
              <>
                {/* Ordenador: tabla */}
                <table className="hidden w-full text-left text-sm md:table">
                  <thead className="text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-5 py-2.5 font-medium">Orden</th>
                      <th className="px-3 py-2.5 font-medium">Equipo</th>
                      <th className="px-3 py-2.5 font-medium">Cliente · compromiso</th>
                      <th className="px-5 py-2.5 text-right font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeOrders.map((o) => {
                      const late = o.promisedAt && o.promisedAt < today;
                      return (
                        <tr key={o.id} className="relative transition hover:bg-slate-50">
                          <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-slate-500">
                            <Link href={`/taller/${o.id}`} className="after:absolute after:inset-0">{o.code}</Link>
                          </td>
                          <td className="px-3 py-3 font-medium text-slate-800">
                            <p>{o.equipmentCategory.label}</p>
                            {o.priority.key !== "NORMAL" && <Badge tone={priorityTone(o.priority.key)}>{o.priority.label}</Badge>}
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-slate-700">{who(o.patient, o.customerName)}</p>
                            {o.promisedAt && <p className={`text-xs ${late ? "font-medium text-rose-600" : "text-slate-500"}`}>Compromiso {formatDate(o.promisedAt)}</p>}
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right"><Badge tone={workOrderStatus[o.status].tone}>{st[o.status]}</Badge></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Móvil: tarjetas */}
                <ul className="divide-y divide-slate-100 md:hidden">
                  {activeOrders.map((o) => (
                    <li key={o.id}>
                      <Link href={`/taller/${o.id}`} className="block px-5 py-3 transition hover:bg-slate-50">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-800">{o.equipmentCategory.label}</span>
                          <Badge tone={workOrderStatus[o.status].tone}>{st[o.status]}</Badge>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-sm text-slate-500">
                          <span className="truncate">{who(o.patient, o.customerName)} · <span className="font-mono text-xs">{o.code}</span></span>
                          {o.priority.key !== "NORMAL" && <Badge tone={priorityTone(o.priority.key)}>{o.priority.label}</Badge>}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Plantillas en curso"
              icon={Footprints}
              action={<Link href="/plantillas" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">Ver todas <ArrowRight className="size-4" /></Link>}
            />
            {openInsoles.length === 0 ? (
              <EmptyState icon={Footprints} title="No hay plantillas en curso" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {openInsoles.slice(0, 6).map((o) => {
                  const late = o.dueAt && o.dueAt < today;
                  return (
                    <li key={o.id}>
                      <Link href={`/plantillas/${o.id}`} className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-800">{who(o.patient)}</p>
                          <p className="truncate text-sm text-slate-500">
                            {o.type.label} · <span className={late ? "font-medium text-rose-600" : ""}>entrega {formatDate(o.dueAt)}</span>
                          </p>
                        </div>
                        <Badge tone={tones[o.statusId]}>{o.status.label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader
              title="Citas de hoy"
              icon={CalendarDays}
              action={<Link href="/agenda" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">Agenda <ArrowRight className="size-4" /></Link>}
            />
            {appointments.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-500">
                Ninguna cita hoy. <Link href="/agenda/nueva" className="font-medium text-teal-700 hover:underline">Dar cita</Link>
              </p>
            ) : (
              <div className="space-y-2 p-3">{appointments.map((a) => <AppointmentCard key={a.id} a={a} business={backup?.businessName ?? ""} />)}</div>
            )}
          </Card>
          {dueVisits.length > 0 && (
            <Card>
              <CardHeader title="Revisiones de contratos" icon={CalendarCheck} subtitle="Próximos 14 días y atrasadas" />
              <ul className="divide-y divide-slate-100">
                {dueVisits.map((v) => {
                  const late = v.dueAt < today;
                  return (
                    <li key={v.id} className="flex items-center gap-3 px-5 py-3">
                      <Link href={`/centros/${v.proposal.centerId}/propuestas/${v.proposal.id}`} className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800">{v.proposal.center.name}</p>
                        <p className="truncate text-sm text-slate-500">
                          <span className={late ? "font-medium text-rose-600" : ""}>{late ? "Atrasada · " : ""}{formatDate(v.dueAt)}</span> · {v.proposal._count.products} equipos · {v.proposal.number}
                        </p>
                      </Link>
                      <form action={createVisitOrder.bind(null, v.id)}>
                        <SubmitButton icon={<ClipboardPlus className="size-4" />} className="min-h-11 px-3 text-sm lg:min-h-10">Crear orden</SubmitButton>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
          {orders.pending + orders.ordered + orders.toDeliver > 0 && (
            <Card>
              <CardHeader title="Pedidos a marcas" icon={Truck} action={<Link href="/pedidos" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800">Ver <ArrowRight className="size-4" /></Link>} />
              <div className="grid grid-cols-3 divide-x divide-slate-100">
                {[
                  { href: "/pedidos", label: "Por pedir", value: orders.pending, hint: null },
                  { href: "/pedidos?vista=encamino", label: "En camino", value: orders.ordered, hint: orders.late ? `${orders.late} con retraso` : null },
                  { href: "/pedidos?vista=porentregar", label: "Por entregar", value: orders.toDeliver, hint: null },
                ].map((k) => (
                  <Link key={k.href} href={k.href} className="p-4 hover:bg-slate-50">
                    <p className="text-xs font-medium text-slate-500">{k.label}</p>
                    <p className="text-2xl font-semibold text-slate-900">{k.value}</p>
                    {k.hint && <p className="text-xs font-medium text-rose-600">{k.hint}</p>}
                  </Link>
                ))}
              </div>
            </Card>
          )}
          {showRenewals && (
            <Card className="h-fit">
              <div id="avisos" className="scroll-mt-20" />
              <CardHeader
                title="Avisos de renovación"
                subtitle="Medias cada 6 meses · Plantillas cada 12"
                icon={BellRing}
                action={overdue > 0 ? <Badge tone="rose"><AlertTriangle className="size-3.5" />{overdue} vencidos</Badge> : undefined}
              />
              <RenewalList alerts={alerts} business={backup?.businessName ?? ""} />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
