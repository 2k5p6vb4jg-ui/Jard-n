import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { orderActivity, twelveMonthsAgo } from "@/lib/centers";
import { BarChart3, Building2, CalendarClock, Clock, FileCheck2, Footprints, Info, Users, Wrench } from "lucide-react";
import { getStats } from "@/lib/stats";
import { formatEUR } from "@/lib/money";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarChart } from "@/components/charts/BarChart";

export const metadata = { title: "Estadísticas" };
export const dynamic = "force-dynamic";

function Tile({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: typeof Users }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-500"><span className="grid size-8 place-items-center rounded-lg bg-gold-50 text-gold-700"><Icon className="size-4" /></span>{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const eur0 = (c: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(c / 100);

export default async function StatsPage() {
  const [s, activity, centers] = await Promise.all([
    getStats(12),
    orderActivity({ since: twelveMonthsAgo() }),
    prisma.center.findMany({ select: { id: true, name: true } }),
  ]);
  const billed = activity.filter((r) => r.billed);
  const sum = (rows: typeof billed) => rows.reduce((t, r) => t + r.totalCents, 0);
  const origin = [
    { label: "Particulares", cents: sum(billed.filter((r) => !r.centerId)), tone: "bg-slate-400" },
    { label: "Pedidos directos de centros", cents: sum(billed.filter((r) => r.centerId && r.link === "ORDERED")), tone: "bg-teal-600" },
    { label: "A través de centros (derivados y usuarios)", cents: sum(billed.filter((r) => r.centerId && r.link !== "ORDERED")), tone: "bg-gold-500" },
  ];
  const originTotal = Math.max(1, origin.reduce((t, o) => t + o.cents, 0));
  const topCenters = centers
    .map((c) => ({ ...c, cents: sum(billed.filter((r) => r.centerId === c.id)) }))
    .filter((c) => c.cents > 0)
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 5);
  const delta = s.previous ? s.current.workshopCents + s.current.insoleCents + s.current.stockingCents - (s.previous.workshopCents + s.previous.insoleCents + s.previous.stockingCents) : 0;
  const series = (f: (m: (typeof s.series)[number]) => number, fmt: (v: number) => string) =>
    s.series.map((m) => ({ label: m.label, longLabel: m.longLabel, value: f(m), display: fmt(f(m)) }));
  const maxCat = Math.max(1, ...s.byCategory.map((c) => c.count));

  return (
    <>
      <PageHeader title="Estadísticas" description="Últimos 12 meses · importes registrados en la app (IVA incluido)" />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          icon={BarChart3}
          label="Facturado este mes"
          value={eur0(s.current.workshopCents + s.current.insoleCents + s.current.stockingCents)}
          hint={s.previous ? `${delta >= 0 ? "+" : "−"}${eur0(Math.abs(delta))} respecto a ${s.previous.label}` : undefined}
        />
        <Tile icon={Wrench} label="Órdenes en curso" value={String(s.totals.activeOrders)} hint={`${s.totals.ordersDelivered} entregadas en 12 meses`} />
        <Tile
          icon={Clock}
          label="Tiempo medio en taller"
          value={s.totals.avgTurnaroundDays === null ? "—" : `${s.totals.avgTurnaroundDays.toLocaleString("es-ES", { maximumFractionDigits: 1 })} días`}
          hint="Desde la entrada hasta la entrega"
        />
        <Tile
          icon={FileCheck2}
          label="Presupuestos aceptados"
          value={s.totals.quoteAcceptance === null ? "—" : `${Math.round(s.totals.quoteAcceptance * 100)} %`}
          hint={`${s.totals.newPatients} pacientes nuevos en 12 meses`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Facturación del taller" icon={Wrench} subtitle="Órdenes entregadas, por mes" />
          <div className="p-5"><BarChart title="Facturación del taller" data={series((m) => m.workshopCents, eur0)} /></div>
        </Card>
        <Card>
          <CardHeader title="Plantillas y medias" icon={Footprints} subtitle="Importe de las entregadas, por mes" />
          <div className="p-5"><BarChart title="Plantillas y medias" data={series((m) => m.insoleCents + m.stockingCents, eur0)} /></div>
        </Card>
        <Card>
          <CardHeader title="Plantillas entregadas" icon={Footprints} subtitle="Unidades por mes" />
          <div className="p-5"><BarChart title="Plantillas entregadas" data={series((m) => m.insolesDelivered, (v) => `${v}`)} height={120} /></div>
        </Card>
        <Card>
          <CardHeader title="Medias entregadas" icon={CalendarClock} subtitle="Unidades por mes" />
          <div className="p-5"><BarChart title="Medias entregadas" data={series((m) => m.stockingsDelivered, (v) => `${v}`)} height={120} /></div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Origen de la facturación" icon={Building2} subtitle="Reparaciones entregadas y plantillas, últimos 12 meses" />
          <div className="grid gap-6 p-5 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
                {origin.map((o) => <span key={o.label} className={o.tone} style={{ width: `${(o.cents / originTotal) * 100}%` }} />)}
              </div>
              <ul className="space-y-2 text-sm">
                {origin.map((o) => (
                  <li key={o.label} className="flex items-center gap-2">
                    <span className={`size-3 shrink-0 rounded-sm ${o.tone}`} />
                    <span className="flex-1 text-slate-600">{o.label}</span>
                    <span className="font-medium text-slate-800">{eur0(o.cents)}</span>
                    <span className="w-12 text-right text-slate-500">{Math.round((o.cents / originTotal) * 100)} %</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-600">Centros que más facturan</p>
              {topCenters.length === 0 ? (
                <p className="text-sm text-slate-500">Aún no hay facturación vinculada a centros.</p>
              ) : (
                <ol className="divide-y divide-slate-100 text-sm">
                  {topCenters.map((c, i) => (
                    <li key={c.id} className="flex items-center gap-3 py-2">
                      <span className="w-4 text-slate-400">{i + 1}</span>
                      <Link href={`/centros/${c.id}`} className="flex-1 truncate font-medium text-teal-700 hover:underline">{c.name}</Link>
                      <span className="font-medium text-slate-800">{eur0(c.cents)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Equipos recibidos en el taller" icon={Wrench} subtitle="Por categoría, últimos 12 meses" />
          <ul className="space-y-3 p-5">
            {s.byCategory.length === 0 && <li className="text-sm text-slate-500">Sin órdenes en este periodo.</li>}
            {s.byCategory.map((c) => (
              <li key={c.category} className="grid grid-cols-[10rem_1fr_2.5rem] items-center gap-3 text-sm sm:grid-cols-[14rem_1fr_3rem]">
                <span className="truncate text-slate-700">{c.category}</span>
                <span className="block h-4 rounded-r-[4px] bg-teal-600" style={{ width: `${(c.count / maxCat) * 100}%` }} />
                <span className="text-right font-medium text-slate-700">{c.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <p className="mt-6 flex items-start gap-2 text-sm text-slate-500">
        <Info className="mt-0.5 size-4 shrink-0" />
        Cifras orientativas calculadas con los importes registrados en la app (taller: piezas + mano de obra − descuento + IVA). No sustituyen a la contabilidad.
      </p>
    </>
  );
}
