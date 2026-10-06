import Link from "next/link";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  ChevronRight,
  Footprints,
  Phone,
  UserPlus,
  Wrench,
  ClipboardPlus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getRenewalAlerts } from "@/lib/renewals";
import { WORK_ORDER_FLOW, equipmentCategory, priority, workOrderStatus } from "@/lib/labels";
import { formatDate } from "@/lib/dates";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [alerts, byStatus, activeOrders] = await Promise.all([
    getRenewalAlerts(),
    prisma.workOrder.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.workOrder.findMany({
      where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
      include: { patient: { select: { firstName: true, lastName: true } } },
      orderBy: [{ promisedAt: "asc" }, { receivedAt: "asc" }],
      take: 8,
    }),
  ]);

  const count = (s: string) => byStatus.find((b) => b.status === s)?._count._all ?? 0;
  const overdue = alerts.filter((a) => a.severity === "overdue").length;

  return (
    <>
      <PageHeader
        title="Panel principal"
        description={new Intl.DateTimeFormat("es-ES", { dateStyle: "full" }).format(new Date())}
        actions={
          <>
            <LinkButton href="/pacientes/nuevo" variant="secondary" icon={UserPlus}>
              Nuevo paciente
            </LinkButton>
            <LinkButton href="/taller/nueva" icon={ClipboardPlus}>
              Nueva orden de taller
            </LinkButton>
          </>
        }
      />

      {/* Órdenes por estado */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {WORK_ORDER_FLOW.map((s) => (
          <Link
            key={s}
            href={`/taller?estado=${s}`}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:shadow"
          >
            <Badge tone={workOrderStatus[s].tone}>{workOrderStatus[s].label}</Badge>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{count(s)}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        {/* Avisos de renovación */}
        <Card className="xl:col-span-3">
          <CardHeader
            title="Avisos de renovación"
            subtitle="Medias cada 6 meses · Plantillas cada 12 meses"
            icon={BellRing}
            action={overdue > 0 ? <Badge tone="rose"><AlertTriangle className="size-3.5" />{overdue} vencidos</Badge> : undefined}
          />
          {alerts.length === 0 ? (
            <EmptyState icon={BellRing} title="Sin renovaciones pendientes" text="Aquí aparecerán los pacientes cuya prescripción vence en los próximos días." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {alerts.map((a) => (
                <li key={`${a.kind}-${a.id}`}>
                  <Link href={`/pacientes/${a.patientId}`} className="flex min-h-16 items-center gap-4 px-5 py-3 transition hover:bg-slate-50">
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-full ${
                        a.kind === "INSOLE" ? "bg-indigo-50 text-indigo-600" : "bg-teal-50 text-teal-600"
                      }`}
                    >
                      {a.kind === "INSOLE" ? <Footprints className="size-5" /> : <CalendarClock className="size-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800">{a.patientName}</p>
                      <p className="truncate text-sm text-slate-500">
                        {a.detail} · entregadas {formatDate(a.deliveredAt)}
                        {a.phone && (
                          <span className="ml-2 inline-flex items-center gap-1">
                            <Phone className="size-3.5" />
                            {a.phone}
                          </span>
                        )}
                      </p>
                    </div>
                    <Badge tone={a.severity === "overdue" ? "rose" : "amber"}>
                      {a.daysLeft < 0 ? `Vencido hace ${-a.daysLeft} d` : a.daysLeft === 0 ? "Vence hoy" : `En ${a.daysLeft} d`}
                    </Badge>
                    <ChevronRight className="size-5 shrink-0 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Taller activo */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Taller en curso"
            icon={Wrench}
            action={
              <Link href="/taller" className="text-sm font-medium text-teal-600 hover:text-teal-700">
                Ver todo
              </Link>
            }
          />
          {activeOrders.length === 0 ? (
            <EmptyState icon={Wrench} title="No hay órdenes activas" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {activeOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/taller/${o.id}`} className="block px-5 py-3 transition hover:bg-slate-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm text-slate-500">{o.code}</span>
                      <Badge tone={workOrderStatus[o.status].tone}>{workOrderStatus[o.status].label}</Badge>
                    </div>
                    <p className="mt-1 font-medium text-slate-800">
                      {equipmentCategory[o.equipmentCategory]}
                      {o.equipmentModel && <span className="font-normal text-slate-500"> · {o.equipmentModel}</span>}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-sm text-slate-500">
                      <span className="truncate">
                        {o.patient ? `${o.patient.firstName} ${o.patient.lastName}` : o.customerName}
                      </span>
                      {o.priority !== "NORMAL" && <Badge tone={priority[o.priority].tone}>{priority[o.priority].label}</Badge>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
