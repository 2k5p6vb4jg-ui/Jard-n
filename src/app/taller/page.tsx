import Link from "next/link";
import { ClipboardPlus, Wrench } from "lucide-react";
import type { WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { WORK_ORDER_FLOW, equipmentCategory, priority, serviceType, workOrderStatus } from "@/lib/labels";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Taller" };

export default async function WorkshopPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const status = estado && estado in workOrderStatus ? (estado as WorkOrderStatus) : undefined;

  const orders = await prisma.workOrder.findMany({
    where: status ? { status } : { status: { notIn: ["DELIVERED", "CANCELLED"] } },
    include: { patient: { select: { firstName: true, lastName: true } }, technician: { select: { name: true } } },
    orderBy: [{ receivedAt: "desc" }],
  });

  const chip = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={`flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium ring-1 ring-inset transition ${
        active ? "bg-teal-600 text-white ring-teal-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Taller y reparaciones"
        description="Sillas de ruedas, scooters, grúas, andadores, órtesis y prótesis"
        actions={<LinkButton href="/taller/nueva" icon={ClipboardPlus}>Nueva orden</LinkButton>}
      />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {chip("/taller", "Activas", !status)}
        {WORK_ORDER_FLOW.map((s) => chip(`/taller?estado=${s}`, workOrderStatus[s].label, status === s))}
      </div>
      <Card>
        {orders.length === 0 ? (
          <EmptyState icon={Wrench} title="No hay órdenes en este estado" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/taller/${o.id}`} className="grid gap-2 px-5 py-4 hover:bg-slate-50 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm text-slate-500">{o.code}</span>
                      <Badge tone={workOrderStatus[o.status].tone}>{workOrderStatus[o.status].label}</Badge>
                      {o.priority !== "NORMAL" && <Badge tone={priority[o.priority].tone}>{priority[o.priority].label}</Badge>}
                      {o.underWarranty && <Badge tone="indigo">Garantía</Badge>}
                    </div>
                    <p className="mt-1 font-medium text-slate-800">
                      {equipmentCategory[o.equipmentCategory]} · {serviceType[o.serviceType]}
                    </p>
                    <p className="truncate text-sm text-slate-500">{o.reportedIssue}</p>
                  </div>
                  <div className="text-sm text-slate-500 sm:text-right">
                    <p className="font-medium text-slate-700">{o.patient ? `${o.patient.firstName} ${o.patient.lastName}` : o.customerName}</p>
                    <p>Entrada {formatDate(o.receivedAt)}{o.promisedAt && ` · Compromiso ${formatDate(o.promisedAt)}`}</p>
                    {o.technician && <p>Técnico: {o.technician.name}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
