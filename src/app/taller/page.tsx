import Link from "next/link";
import { ClipboardPlus, Wrench } from "lucide-react";
import type { WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { WORK_ORDER_FLOW, priorityTone, workOrderStatus } from "@/lib/labels";
import { getStatusLabels } from "@/lib/workOrderOptions";
import { getCentersForSelect } from "@/lib/centers";
import { UrlSelect } from "@/components/ui/UrlSelect";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Cell, chipClass, Row, RowLink, Table } from "@/components/ui/Table";

export const metadata = { title: "Reparaciones" };

/** Situación de las piezas pedidas a marcas para la orden */
function PartsBadge({ items }: { items: { status: string }[] }) {
  if (items.some((i) => i.status === "PENDING" || i.status === "ORDERED")) return <Badge tone="sky">Esperando pieza</Badge>;
  if (items.some((i) => i.status === "RECEIVED")) return <Badge tone="teal">Pieza recibida</Badge>;
  return null;
}

export default async function WorkshopPage({ searchParams }: { searchParams: Promise<{ estado?: string; centro?: string }> }) {
  const { estado, centro } = await searchParams;
  const status = estado && estado in workOrderStatus ? (estado as WorkOrderStatus) : undefined;

  const [st, centers] = await Promise.all([getStatusLabels(), getCentersForSelect()]);
  const orders = await prisma.workOrder.findMany({
    where: {
      ...(status ? { status } : { status: { notIn: ["DELIVERED", "CANCELLED"] } }),
      ...(centro && { OR: [{ centerId: centro }, { centerId: null, patient: { centerId: centro } }] }),
    },
    include: {
      patient: { select: { firstName: true, lastName: true } },
      technician: { select: { name: true } },
      equipmentCategory: { select: { label: true } },
      serviceType: { select: { label: true } },
      priority: { select: { label: true, key: true } },
      orderItems: { where: { status: { in: ["PENDING", "ORDERED", "RECEIVED"] } }, select: { status: true } },
    },
    orderBy: [{ receivedAt: "desc" }],
  });

  const chip = (href: string, label: string, active: boolean) => (
    <Link key={href} href={centro ? `${href}${href.includes("?") ? "&" : "?"}centro=${centro}` : href} className={chipClass(active)}>
      {label}
    </Link>
  );
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const who = (o: (typeof orders)[number]) => (o.patient ? `${o.patient.firstName} ${o.patient.lastName}` : o.customerName);

  return (
    <>
      <PageHeader
        title="Reparaciones"
        description="Sillas de ruedas, scooters, grúas, andadores, órtesis y prótesis"
        actions={<LinkButton href="/taller/nueva" icon={ClipboardPlus}>Nueva reparación</LinkButton>}
      />
      {centers.length > 0 && (
        <div className="mb-3">
          <UrlSelect param="centro" label="Filtrar por centro" placeholder="Todos los clientes y centros" options={centers.map((c) => ({ value: c.id, label: c.label }))} />
        </div>
      )}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {chip("/taller", "Activas", !status)}
        {WORK_ORDER_FLOW.map((s) => chip(`/taller?estado=${s}`, st[s], status === s))}
      </div>
      <Card>
        {orders.length === 0 ? (
          <EmptyState icon={Wrench} title="No hay órdenes en este estado" />
        ) : (
          <>
            <Table head={["Orden", "Equipo y servicio", "Cliente", "Entrada · compromiso", "Técnico", { label: "Estado", className: "text-right" }]}>
              {orders.map((o) => {
                const late = !["DELIVERED", "CANCELLED"].includes(o.status) && o.promisedAt && o.promisedAt < today;
                return (
                  <Row key={o.id}>
                    <Cell className="whitespace-nowrap font-mono text-xs text-slate-500"><RowLink href={`/taller/${o.id}`}>{o.code}</RowLink></Cell>
                    <Cell>
                      <p className="font-medium text-slate-800">{o.equipmentCategory.label}{o.equipmentModel && <span className="font-normal text-slate-500"> · {o.equipmentModel}</span>}</p>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                        {o.serviceType.label}
                        {o.priority.key !== "NORMAL" && <Badge tone={priorityTone(o.priority.key)}>{o.priority.label}</Badge>}
                        {o.underWarranty && <Badge tone="gold">Garantía</Badge>}
                        <PartsBadge items={o.orderItems} />
                      </p>
                    </Cell>
                    <Cell className="text-slate-700">{who(o)}</Cell>
                    <Cell className="whitespace-nowrap text-slate-500">
                      {formatDate(o.receivedAt)} · <span className={late ? "font-medium text-rose-600" : ""}>{formatDate(o.promisedAt)}</span>
                    </Cell>
                    <Cell className="text-slate-500">{o.technician?.name ?? "—"}</Cell>
                    <Cell className="whitespace-nowrap text-right"><Badge tone={workOrderStatus[o.status].tone}>{st[o.status]}</Badge></Cell>
                  </Row>
                );
              })}
            </Table>
            <ul className="divide-y divide-slate-100 md:hidden">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/taller/${o.id}`} className="block px-5 py-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-800">{o.equipmentCategory.label}</p>
                      <Badge tone={workOrderStatus[o.status].tone}>{st[o.status]}</Badge>
                    </div>
                    <p className="text-sm text-slate-500">{o.serviceType.label} · {who(o)}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span className="font-mono">{o.code}</span> · Entrada {formatDate(o.receivedAt)}
                      {o.priority.key !== "NORMAL" && <Badge tone={priorityTone(o.priority.key)}>{o.priority.label}</Badge>}
                      {o.underWarranty && <Badge tone="gold">Garantía</Badge>}
                      <PartsBadge items={o.orderItems} />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
