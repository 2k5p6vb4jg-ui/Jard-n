import { notFound } from "next/navigation";
import { Clock, FileText, History, Package, Receipt, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { computeWorkOrderTotals, formatEUR } from "@/lib/money";
import { equipmentCategory, partCategory, quoteStatus, serviceType, workOrderStatus } from "@/lib/labels";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function WorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, settings] = await Promise.all([
    prisma.workOrder.findUnique({
      where: { id },
      include: {
        patient: true,
        technician: true,
        product: true,
        parts: { orderBy: { createdAt: "asc" } },
        timeEntries: true,
        statusHistory: { orderBy: { changedAt: "asc" } },
        quotes: { orderBy: { issuedAt: "desc" } },
      },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  if (!order) notFound();

  const minutesWorked = order.timeEntries.reduce((s, t) => s + (t.minutes ?? 0), 0);
  const laborRateCents = order.laborRateCents ?? order.technician?.hourlyRateCents ?? settings?.defaultHourlyRateCents ?? 0;
  const totals = computeWorkOrderTotals({
    parts: order.parts,
    laborMode: order.laborMode,
    laborRateCents,
    laborFixedCents: order.laborFixedCents,
    minutesWorked,
    discountPercent: order.discountPercent,
    taxRate: order.taxRate,
  });

  const row = (label: string, value: string, strong = false) => (
    <div className={`flex justify-between py-1.5 ${strong ? "border-t border-slate-200 pt-3 text-lg font-semibold text-slate-900" : "text-slate-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <>
      <PageHeader
        title={`${order.code} · ${equipmentCategory[order.equipmentCategory]}`}
        description={[order.equipmentBrand, order.equipmentModel, order.serialNumber && `S/N ${order.serialNumber}`].filter(Boolean).join(" · ")}
        actions={<Badge tone={workOrderStatus[order.status].tone}>{workOrderStatus[order.status].label}</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={serviceType[order.serviceType]} icon={Wrench} subtitle={order.patient ? `${order.patient.firstName} ${order.patient.lastName}` : order.customerName ?? undefined} />
            <dl className="space-y-4 px-5 py-4">
              <div><dt className="text-sm text-slate-500">Avería indicada</dt><dd className="text-slate-800">{order.reportedIssue}</dd></div>
              {order.diagnosis && <div><dt className="text-sm text-slate-500">Diagnóstico</dt><dd className="text-slate-800">{order.diagnosis}</dd></div>}
              {order.workDone && <div><dt className="text-sm text-slate-500">Trabajo realizado</dt><dd className="text-slate-800">{order.workDone}</dd></div>}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Piezas y materiales" icon={Package} />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr><th className="px-5 py-2 font-medium">Concepto</th><th className="px-3 py-2 font-medium">Cant.</th><th className="px-3 py-2 text-right font-medium">P. unit.</th><th className="px-5 py-2 text-right font-medium">Importe</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.parts.map((p) => (
                    <tr key={p.id}>
                      <td className="px-5 py-3"><Badge tone="slate">{partCategory[p.category]}</Badge> <span className="ml-1 text-slate-800">{p.description}</span></td>
                      <td className="px-3 py-3">{p.quantity} {p.unit}</td>
                      <td className="px-3 py-3 text-right">{formatEUR(p.unitPriceCents)}</td>
                      <td className="px-5 py-3 text-right font-medium">{formatEUR(Math.round(p.quantity * p.unitPriceCents))}</td>
                    </tr>
                  ))}
                  {order.parts.length === 0 && <tr><td colSpan={4} className="px-5 py-6 text-center text-slate-500">Sin piezas registradas</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Historial de estados" icon={History} />
            <ol className="space-y-3 px-5 py-4">
              {order.statusHistory.map((h) => (
                <li key={h.id} className="flex items-center gap-3 text-sm">
                  <Badge tone={workOrderStatus[h.toStatus].tone}>{workOrderStatus[h.toStatus].label}</Badge>
                  <span className="text-slate-500">{formatDate(h.changedAt)}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Desglose de costes" icon={Receipt} />
            <div className="px-5 py-4">
              {row("Piezas y materiales", formatEUR(totals.partsCents))}
              {row(
                order.laborMode === "FIXED" ? "Mano de obra (fija)" : `Mano de obra (${(minutesWorked / 60).toFixed(2)} h × ${formatEUR(laborRateCents)})`,
                formatEUR(totals.laborCents),
              )}
              {totals.discountCents > 0 && row(`Descuento ${order.discountPercent}%`, `−${formatEUR(totals.discountCents)}`)}
              {row("Base imponible", formatEUR(totals.subtotalCents))}
              {row(`IVA ${order.taxRate}%`, formatEUR(totals.taxCents))}
              {row("Total", formatEUR(totals.totalCents), true)}
            </div>
          </Card>
          <Card>
            <CardHeader title="Tiempo registrado" icon={Clock} subtitle={`${minutesWorked} min`} />
            <ul className="divide-y divide-slate-100 text-sm">
              {order.timeEntries.map((t) => (
                <li key={t.id} className="flex justify-between px-5 py-2.5"><span>{formatDate(t.startedAt)}</span><span>{t.minutes ?? "En curso"} min</span></li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Presupuestos" icon={FileText} />
            <ul className="divide-y divide-slate-100 text-sm">
              {order.quotes.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-2 px-5 py-3">
                  <span className="font-mono">{q.number}</span>
                  <Badge tone={quoteStatus[q.status].tone}>{quoteStatus[q.status].label}</Badge>
                  <span className="font-medium">{formatEUR(q.totalCents)}</span>
                </li>
              ))}
              {order.quotes.length === 0 && <li className="px-5 py-4 text-slate-500">Generador de PDF en la fase 2.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
