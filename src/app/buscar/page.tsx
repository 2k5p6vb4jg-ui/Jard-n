import Link from "next/link";
import { Building2, ChevronRight, FileText, Footprints, ScanBarcode, Search, Users, Wrench } from "lucide-react";
import { globalSearch } from "@/lib/search";
import { formatDate } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import { quoteStatus, workOrderStatus } from "@/lib/labels";
import { getStatusLabels } from "@/lib/workOrderOptions";
import { effectiveQuoteStatus } from "@/lib/quotes";
import { getInsoleOptions, statusTones } from "@/lib/insoleOrders";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Buscar" };

const row = "flex min-h-14 items-center gap-3 px-5 py-3 hover:bg-slate-50";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const r = await globalSearch(q);
  const total = r ? r.centers.length + r.patients.length + r.orders.length + r.insoleOrders.length + r.products.length + r.quotes.length : 0;
  const st = await getStatusLabels();
  const tones = r?.insoleOrders.length ? statusTones((await getInsoleOptions()).statuses) : {};

  return (
    <>
      <PageHeader title="Buscar" description="Clientes, centros, reparaciones, plantillas, números de serie y presupuestos" />
      <form className="relative mb-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <input name="q" defaultValue={q} autoFocus placeholder="Nombre, DNI, teléfono, OT-2026-…, PL-2026-…, nº de serie…" className="field pl-12" />
      </form>

      {!r ? (
        <Card><EmptyState icon={Search} title="Escriba al menos 2 letras" text="No importan las tildes ni las mayúsculas." /></Card>
      ) : total === 0 ? (
        <Card><EmptyState icon={Search} title={`Sin resultados para «${q}»`} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {r.centers.length > 0 && (
            <Card>
              <CardHeader title="Centros" icon={Building2} subtitle={`${r.centers.length}`} />
              <ul className="divide-y divide-slate-100">
                {r.centers.map((c) => (
                  <li key={c.id}>
                    <Link href={`/centros/${c.id}`} className={row}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800">{c.name}</p>
                        <p className="truncate text-sm text-slate-500">{[c.type.label, c.city].filter(Boolean).join(" · ")}</p>
                      </div>
                      <ChevronRight className="size-5 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {r.patients.length > 0 && (
            <Card>
              <CardHeader title="Clientes" icon={Users} subtitle={`${r.patients.length}`} />
              <ul className="divide-y divide-slate-100">
                {r.patients.map((p) => (
                  <li key={p.id}>
                    <Link href={`/pacientes/${p.id}`} className={row}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800">{p.lastName}, {p.firstName}</p>
                        <p className="truncate text-sm text-slate-500">{[p.dni, p.phone].filter(Boolean).join(" · ") || "—"}</p>
                      </div>
                      <ChevronRight className="size-5 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {r.orders.length > 0 && (
            <Card>
              <CardHeader title="Reparaciones" icon={Wrench} subtitle={`${r.orders.length}`} />
              <ul className="divide-y divide-slate-100">
                {r.orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/taller/${o.id}`} className={row}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800"><span className="font-mono text-sm text-slate-500">{o.code}</span> · {o.equipmentCategory.label}</p>
                        <p className="truncate text-sm text-slate-500">
                          {o.patient ? `${o.patient.firstName} ${o.patient.lastName}` : o.customerName} · {formatDate(o.receivedAt)}{o.serialNumber && ` · S/N ${o.serialNumber}`}
                        </p>
                      </div>
                      <Badge tone={workOrderStatus[o.status].tone}>{st[o.status]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {r.insoleOrders.length > 0 && (
            <Card>
              <CardHeader title="Plantillas" icon={Footprints} subtitle={`${r.insoleOrders.length}`} />
              <ul className="divide-y divide-slate-100">
                {r.insoleOrders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/plantillas/${o.id}`} className={row}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800"><span className="font-mono text-sm text-slate-500">{o.code}</span> · {o.type.label}</p>
                        <p className="truncate text-sm text-slate-500">{o.patient.firstName} {o.patient.lastName} · {formatDate(o.measuredAt)}{o.material && ` · ${o.material.label}`}</p>
                      </div>
                      <Badge tone={tones[o.statusId]}>{o.status.label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {r.products.length > 0 && (
            <Card>
              <CardHeader title="Productos con nº de serie" icon={ScanBarcode} subtitle={`${r.products.length}`} />
              <ul className="divide-y divide-slate-100">
                {r.products.map((p) => (
                  <li key={p.id}>
                    <Link href={`/trazabilidad?q=${encodeURIComponent(p.serialNumber)}`} className={row}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-800">{p.brand} {p.model}</p>
                        <p className="truncate text-sm text-slate-500"><span className="font-mono">{p.serialNumber}</span>{p.patient && ` · ${p.patient.firstName} ${p.patient.lastName}`}</p>
                      </div>
                      <ChevronRight className="size-5 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {r.quotes.length > 0 && (
            <Card>
              <CardHeader title="Presupuestos" icon={FileText} subtitle={`${r.quotes.length}`} />
              <ul className="divide-y divide-slate-100">
                {r.quotes.map((qt) => {
                  const st = effectiveQuoteStatus(qt) as keyof typeof quoteStatus;
                  return (
                    <li key={qt.id}>
                      <Link href={`/taller/${qt.workOrderId}`} className={row}>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono font-medium text-slate-800">{qt.number}</p>
                          <p className="text-sm text-slate-500">{qt.workOrder.code} · {formatEUR(qt.totalCents)}</p>
                        </div>
                        <Badge tone={quoteStatus[st].tone}>{quoteStatus[st].label}</Badge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
