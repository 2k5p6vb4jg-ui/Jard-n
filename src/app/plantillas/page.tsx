import Link from "next/link";
import { Footprints, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import { side } from "@/lib/labels";
import { matcher } from "@/lib/search";
import { getInsoleOptions, statusTones } from "@/lib/insoleOrders";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Cell, chipClass, Row, RowLink, Table } from "@/components/ui/Table";

export const metadata = { title: "Plantillas" };

export default async function InsoleOrdersPage({ searchParams }: { searchParams: Promise<{ estado?: string; q?: string }> }) {
  const { estado = "", q = "" } = await searchParams;
  const { statuses } = await getInsoleOptions();
  const tones = statusTones(statuses);
  const status = statuses.find((s) => s.id === estado);
  const all = estado === "todas";

  const rows = await prisma.insoleOrder.findMany({
    where: status ? { statusId: status.id } : all || q.trim() ? undefined : { status: { isFinal: false } },
    include: { patient: { select: { firstName: true, lastName: true, phone: true, dni: true } }, type: true, material: true, status: true },
    orderBy: [{ createdAt: "desc" }],
  });
  const m = matcher(q);
  const orders = q.trim()
    ? rows.filter((o) => m(o.code, o.patient.firstName, o.patient.lastName, o.patient.phone, o.patient.dni, o.type.label, o.material?.label, o.notes))
    : rows;

  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const isLate = (o: (typeof orders)[number]) => !o.status.isFinal && !!o.dueAt && o.dueAt < today;
  const detail = (o: (typeof orders)[number]) =>
    [o.type.label, `pie ${side[o.side].toLowerCase()}`, o.shoeSize != null && `nº ${o.shoeSize.toLocaleString("es-ES")}`, o.material?.label].filter(Boolean).join(" · ");
  const chip = (value: string, label: string, active: boolean) => (
    <Link
      key={value || "curso"}
      href={{ pathname: "/plantillas", query: { ...(value && { estado: value }), ...(q && { q }) } }}
      className={chipClass(active)}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Plantillas"
        description="Fabricación, entrega y cobro de plantillas"
        actions={<LinkButton href="/plantillas/nueva" icon={Plus}>Nuevas plantillas</LinkButton>}
      />
      <form className="relative mb-4">
        {estado && <input type="hidden" name="estado" value={estado} />}
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <input name="q" defaultValue={q} type="search" placeholder="Buscar por cliente, teléfono, código PL-…, tipo o material" aria-label="Buscar plantillas" className="field pl-12" />
      </form>
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {chip("", q.trim() ? "Todas" : "En curso", !status && !all)}
        {statuses.filter((s) => s.active || s.id === estado).map((s) => chip(s.id, s.label, status?.id === s.id))}
        {!q.trim() && chip("todas", "Todas", all)}
      </div>
      <Card>
        {orders.length === 0 ? (
          <EmptyState icon={Footprints} title={q.trim() ? `Sin resultados para «${q}»` : "No hay plantillas en este estado"} />
        ) : (
          <>
            <Table head={["Código", "Cliente", "Plantillas", "Medidas · entrega", { label: "Importe", className: "text-right" }, { label: "Estado", className: "text-right" }]}>
              {orders.map((o) => (
                <Row key={o.id}>
                  <Cell className="whitespace-nowrap font-mono text-xs text-slate-500"><RowLink href={`/plantillas/${o.id}`}>{o.code}</RowLink></Cell>
                  <Cell className="font-medium text-slate-800">{o.patient.lastName}, {o.patient.firstName}</Cell>
                  <Cell className="text-slate-600">{detail(o)}</Cell>
                  <Cell className="whitespace-nowrap text-slate-500">
                    {formatDate(o.measuredAt)} · <span className={isLate(o) ? "font-medium text-rose-600" : ""}>{formatDate(o.dueAt)}</span>
                  </Cell>
                  <Cell className="whitespace-nowrap text-right">
                    {o.priceCents != null ? (
                      <>
                        <p className="font-medium text-slate-800">{formatEUR(o.priceCents)}</p>
                        <p className={`text-xs ${o.paid ? "text-emerald-700" : "text-rose-600"}`}>{o.paid ? "Pagado" : "Pendiente de pago"}</p>
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </Cell>
                  <Cell className="whitespace-nowrap text-right">
                    <Badge tone={tones[o.statusId]}>{o.status.label}</Badge>
                    {isLate(o) && <p className="mt-1 text-xs font-medium text-rose-600">Retrasada</p>}
                  </Cell>
                </Row>
              ))}
            </Table>
            <ul className="divide-y divide-slate-100 md:hidden">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/plantillas/${o.id}`} className="block px-5 py-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-800">{o.patient.lastName}, {o.patient.firstName}</p>
                      <Badge tone={tones[o.statusId]}>{o.status.label}</Badge>
                    </div>
                    <p className="truncate text-sm text-slate-500">{detail(o)}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <span className="font-mono">{o.code}</span> · Entrega <span className={isLate(o) ? "font-medium text-rose-600" : ""}>{formatDate(o.dueAt)}</span>
                      {o.priceCents != null && <Badge tone={o.paid ? "emerald" : "rose"}>{formatEUR(o.priceCents)} · {o.paid ? "pagado" : "pendiente"}</Badge>}
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
