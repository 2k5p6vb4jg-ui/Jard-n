import { BarChart3, CalendarClock, Clock, FileCheck2, Footprints, Info, Users, Wrench } from "lucide-react";
import { getStats } from "@/lib/stats";
import { formatEUR } from "@/lib/money";
import { equipmentCategory } from "@/lib/labels";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { BarChart } from "@/components/charts/BarChart";

export const metadata = { title: "Estadísticas" };
export const dynamic = "force-dynamic";

function Tile({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: typeof Users }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="flex items-center gap-2 text-sm text-slate-500"><Icon className="size-4" />{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

const eur0 = (c: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(c / 100);

export default async function StatsPage() {
  const s = await getStats(12);
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
          <CardHeader title="Equipos recibidos en el taller" icon={Wrench} subtitle="Por categoría, últimos 12 meses" />
          <ul className="space-y-3 p-5">
            {s.byCategory.length === 0 && <li className="text-sm text-slate-500">Sin órdenes en este periodo.</li>}
            {s.byCategory.map((c) => (
              <li key={c.category} className="grid grid-cols-[10rem_1fr_2.5rem] items-center gap-3 text-sm sm:grid-cols-[14rem_1fr_3rem]">
                <span className="truncate text-slate-700">{equipmentCategory[c.category]}</span>
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
