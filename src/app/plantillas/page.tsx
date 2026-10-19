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

  const chip = (value: string, label: string, active: boolean) => (
    <Link
      key={value || "curso"}
      href={{ pathname: "/plantillas", query: { ...(value && { estado: value }), ...(q && { q }) } }}
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
          <ul className="divide-y divide-slate-100">
            {orders.map((o) => {
              const late = !o.status.isFinal && o.dueAt && o.dueAt < new Date(new Date().setHours(0, 0, 0, 0));
              return (
                <li key={o.id}>
                  <Link href={`/plantillas/${o.id}`} className="grid gap-2 px-5 py-4 hover:bg-slate-50 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm text-slate-500">{o.code}</span>
                        <Badge tone={tones[o.statusId]}>{o.status.label}</Badge>
                        {o.priceCents != null && <Badge tone={o.paid ? "emerald" : "rose"}>{o.paid ? "Pagado" : "Pendiente de pago"}</Badge>}
                        {late && <Badge tone="rose">Retrasada</Badge>}
                      </div>
                      <p className="mt-1 font-medium text-slate-800">{o.patient.lastName}, {o.patient.firstName}</p>
                      <p className="truncate text-sm text-slate-500">
                        {[o.type.label, `pie ${side[o.side].toLowerCase()}`, o.shoeSize != null && `nº ${o.shoeSize.toLocaleString("es-ES")}`, o.material?.label].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="text-sm text-slate-500 sm:text-right">
                      {o.priceCents != null && <p className="font-medium text-slate-700">{formatEUR(o.priceCents)}</p>}
                      <p>Medidas {formatDate(o.measuredAt)}{o.dueAt && ` · Entrega ${formatDate(o.dueAt)}`}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
