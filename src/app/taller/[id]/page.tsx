import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Check,
  Clock,
  Download,
  Eye,
  FilePlus2,
  FileText,
  History,
  Package,
  Pencil,
  Play,
  Plus,
  Printer,
  Receipt,
  Send,
  ThumbsDown,
  ThumbsUp,
  RotateCcw,
  ScanBarcode,
  Square,
  Trash2,
  Wrench,
} from "lucide-react";
import type { WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { computeWorkOrderTotals, formatEUR } from "@/lib/money";
import { toDateInput } from "@/lib/forms";
import { WORK_ORDER_FLOW, equipmentCategory, partCategory, priority, quoteStatus, serviceType, workOrderStatus } from "@/lib/labels";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubmitButton } from "@/components/ui/Form";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { InlineForm } from "@/components/ui/InlineForm";
import { Elapsed } from "@/components/workshop/Elapsed";
import { addManualTime, addPart, changeStatus, deletePart, deleteTimeEntry, startTimer, stopTimer } from "../actions";
import { createQuote, setQuoteStatus } from "../quotes";
import { effectiveQuoteStatus } from "@/lib/quotes";

const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}` : `${m} min`);

export default async function WorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, settings, technicians] = await Promise.all([
    prisma.workOrder.findUnique({
      where: { id },
      include: {
        patient: true,
        technician: true,
        product: true,
        parts: { orderBy: { createdAt: "asc" } },
        timeEntries: { include: { technician: { select: { name: true } } }, orderBy: { startedAt: "desc" } },
        statusHistory: { orderBy: { changedAt: "asc" } },
        quotes: { orderBy: { issuedAt: "desc" } },
      },
    }),
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.technician.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  if (!order) notFound();

  const closed = order.status === "DELIVERED" || order.status === "CANCELLED";
  const running = order.timeEntries.filter((t) => !t.endedAt);
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
  const partsCost = order.parts.reduce((s, p) => s + p.quantity * p.unitCostCents, 0);

  const idx = WORK_ORDER_FLOW.indexOf(order.status);
  const prev = idx > 0 && order.status !== "DELIVERED" ? WORK_ORDER_FLOW[idx - 1] : null;
  const next = idx >= 0 && idx < WORK_ORDER_FLOW.length - 1 ? WORK_ORDER_FLOW[idx + 1] : null;

  const row = (label: string, value: string, strong = false) => (
    <div className={`flex justify-between gap-4 py-1.5 ${strong ? "mt-1 border-t border-slate-200 pt-3 text-lg font-semibold text-slate-900" : "text-slate-600"}`}>
      <span>{label}</span>
      <span className="whitespace-nowrap">{value}</span>
    </div>
  );

  const statusForm = (to: WorkOrderStatus, content: React.ReactNode) => (
    <form action={changeStatus.bind(null, id, to)} className="contents">
      {content}
    </form>
  );

  return (
    <>
      <Link href="/taller" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="size-4" /> Taller
      </Link>
      <PageHeader
        title={`${order.code} · ${equipmentCategory[order.equipmentCategory]}`}
        description={[order.equipmentBrand, order.equipmentModel, order.serialNumber && `S/N ${order.serialNumber}`].filter(Boolean).join(" · ")}
        actions={
          <>
            <a href={`/api/taller/${id}/resguardo`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
              <Printer className="size-5" /> Resguardo
            </a>
            <LinkButton href={`/taller/${id}/editar`} variant="secondary" icon={Pencil}>Editar</LinkButton>
          </>
        }
      />

      {/* ── Estado ─────────────────────────────────────────────────────── */}
      <Card className="mb-6 p-5">
        <ol className="mb-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {WORK_ORDER_FLOW.map((s, i) => {
            const done = idx > i || order.status === "DELIVERED";
            const current = s === order.status;
            return (
              <li
                key={s}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  current ? "bg-teal-600 text-white" : done ? "bg-teal-50 text-teal-700" : "bg-slate-50 text-slate-400"
                }`}
              >
                {done && !current ? <Check className="size-4 shrink-0" /> : <span className="grid size-4 shrink-0 place-items-center text-xs">{i + 1}</span>}
                <span className="truncate">{workOrderStatus[s].label}</span>
              </li>
            );
          })}
        </ol>

        {order.status === "CANCELLED" ? (
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="rose">Orden anulada</Badge>
            {statusForm("RECEIVED", <SubmitButton icon={<RotateCcw className="size-5" />} variant="secondary">Reactivar orden</SubmitButton>)}
          </div>
        ) : order.status === "DELIVERED" ? (
          <p className="flex items-center gap-2 font-medium text-emerald-700">
            <Check className="size-5" /> Entregada el {formatDate(order.deliveredAt)}
            {order.productId && <span className="font-normal text-slate-500"> · registrada en el histórico del nº de serie</span>}
          </p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {next &&
              statusForm(
                next,
                next === "DELIVERED" ? (
                  <ConfirmButton message="¿Confirmar la entrega del equipo al cliente?" icon={<ArrowRight className="size-5" />} className="bg-emerald-600 px-6 text-white shadow-sm hover:bg-emerald-700 sm:min-w-64">
                    Marcar como entregado
                  </ConfirmButton>
                ) : (
                  <SubmitButton icon={<ArrowRight className="size-5" />} className="sm:min-w-64">
                    Pasar a «{workOrderStatus[next].label}»
                  </SubmitButton>
                ),
              )}
            {prev && statusForm(prev, <SubmitButton icon={<ArrowLeft className="size-5" />} variant="secondary">Volver a «{workOrderStatus[prev].label}»</SubmitButton>)}
            <div className="sm:ml-auto">
              {statusForm(
                "CANCELLED",
                <ConfirmButton message="¿Anular esta orden? (por ejemplo, presupuesto rechazado)" icon={<Ban className="size-5" />} className="w-full px-4 text-rose-600 hover:bg-rose-50">
                  Anular
                </ConfirmButton>,
              )}
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* ── Datos del servicio ─────────────────────────────────────── */}
          <Card>
            <CardHeader
              title={serviceType[order.serviceType]}
              icon={Wrench}
              subtitle={order.patient ? `${order.patient.firstName} ${order.patient.lastName}` : [order.customerName, order.customerPhone].filter(Boolean).join(" · ")}
              action={
                <div className="flex flex-wrap justify-end gap-1.5">
                  {order.priority !== "NORMAL" && <Badge tone={priority[order.priority].tone}>{priority[order.priority].label}</Badge>}
                  {order.underWarranty && <Badge tone="indigo">Garantía</Badge>}
                </div>
              }
            />
            <dl className="grid gap-4 px-5 py-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><dt className="text-sm text-slate-500">Avería indicada</dt><dd className="text-slate-800">{order.reportedIssue}</dd></div>
              {order.diagnosis && <div className="sm:col-span-2"><dt className="text-sm text-slate-500">Diagnóstico</dt><dd className="text-slate-800">{order.diagnosis}</dd></div>}
              {order.workDone && <div className="sm:col-span-2"><dt className="text-sm text-slate-500">Trabajo realizado</dt><dd className="text-slate-800">{order.workDone}</dd></div>}
              {order.internalNotes && <div className="sm:col-span-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{order.internalNotes}</div>}
              <div><dt className="text-sm text-slate-500">Entrada</dt><dd>{formatDate(order.receivedAt)}</dd></div>
              <div><dt className="text-sm text-slate-500">Fecha comprometida</dt><dd>{formatDate(order.promisedAt)}</dd></div>
              <div><dt className="text-sm text-slate-500">Técnico</dt><dd>{order.technician?.name ?? "Sin asignar"}</dd></div>
              {order.accessories && <div><dt className="text-sm text-slate-500">Accesorios</dt><dd>{order.accessories}</dd></div>}
              {order.product && (
                <div className="sm:col-span-2">
                  <Link href={`/trazabilidad?q=${encodeURIComponent(order.product.serialNumber)}`} className="inline-flex min-h-10 items-center gap-2 font-medium text-teal-700 hover:text-teal-800">
                    <ScanBarcode className="size-4" /> Ver histórico del nº de serie {order.product.serialNumber}
                  </Link>
                </div>
              )}
            </dl>
          </Card>

          {/* ── Piezas ─────────────────────────────────────────────────── */}
          <Card>
            <CardHeader title="Piezas y materiales" icon={Package} subtitle={partsCost > 0 ? `Coste interno ${formatEUR(Math.round(partsCost))}` : undefined} />
            <ul className="divide-y divide-slate-100">
              {order.parts.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{p.description}</p>
                    <p className="text-sm text-slate-500">
                      <Badge tone="slate">{partCategory[p.category]}</Badge>
                      <span className="ml-2">{p.quantity.toLocaleString("es-ES")} {p.unit} × {formatEUR(p.unitPriceCents)}</span>
                      {p.reference && <span className="ml-2 font-mono">Ref. {p.reference}</span>}
                    </p>
                  </div>
                  <span className="font-medium whitespace-nowrap">{formatEUR(Math.round(p.quantity * p.unitPriceCents))}</span>
                  {!closed && (
                    <form action={deletePart.bind(null, id, p.id)}>
                      <ConfirmButton message={`¿Quitar «${p.description}»?`} icon={<Trash2 className="size-5" />} ariaLabel="Quitar pieza" className="w-12 text-slate-400 hover:bg-rose-50 hover:text-rose-600" />
                    </form>
                  )}
                </li>
              ))}
              {order.parts.length === 0 && <li className="px-5 py-4 text-slate-500">Sin piezas registradas.</li>}
            </ul>
            {!closed && (
              <InlineForm action={addPart.bind(null, id)} className="border-t border-slate-100 bg-slate-50/60 p-5">
                <p className="mb-3 font-medium text-slate-700">Añadir pieza o material</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                  <select name="category" required defaultValue="" className="field col-span-2" aria-label="Categoría">
                    <option value="" disabled>Categoría…</option>
                    {Object.entries(partCategory).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                  <input name="description" required placeholder="Descripción" className="field col-span-2 sm:col-span-4" aria-label="Descripción" />
                  <input name="quantity" inputMode="decimal" placeholder="Cant." className="field" aria-label="Cantidad" />
                  <select name="unit" defaultValue="ud" className="field" aria-label="Unidad">
                    {["ud", "m", "m²", "kg", "l", "par"].map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <input name="unitPrice" required inputMode="decimal" placeholder="PVP €" className="field" aria-label="Precio de venta por unidad" />
                  <input name="unitCost" inputMode="decimal" placeholder="Coste €" className="field" aria-label="Coste por unidad" />
                  <input name="reference" placeholder="Ref. proveedor" className="field col-span-2" aria-label="Referencia" />
                </div>
                <SubmitButton icon={<Plus className="size-5" />} className="mt-3 w-full sm:w-auto">Añadir</SubmitButton>
              </InlineForm>
            )}
          </Card>

          {/* ── Tiempo ─────────────────────────────────────────────────── */}
          <Card>
            <CardHeader title="Tiempo de trabajo" icon={Clock} subtitle={`Total registrado: ${fmtMinutes(minutesWorked)}`} />
            {running.length > 0 && (
              <ul className="space-y-2 px-5 pt-4">
                {running.map((t) => (
                  <li key={t.id} className="flex items-center gap-4 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
                    <span className="relative flex size-3"><span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" /><span className="relative inline-flex size-3 rounded-full bg-amber-500" /></span>
                    <div className="flex-1">
                      <p className="text-2xl font-semibold text-amber-900"><Elapsed since={t.startedAt.toISOString()} /></p>
                      <p className="text-sm text-amber-800">{t.technician?.name ?? "Sin técnico"}</p>
                    </div>
                    <form action={stopTimer.bind(null, id, t.id)}>
                      <SubmitButton icon={<Square className="size-5" />} variant="danger">Parar</SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            {!closed && (
              <div className="grid gap-4 p-5 md:grid-cols-2">
                <form action={startTimer.bind(null, id)} className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <p className="font-medium text-slate-700">Cronómetro</p>
                  <select name="technicianId" defaultValue={order.technicianId ?? ""} className="field" aria-label="Técnico">
                    <option value="">— Sin técnico —</option>
                    {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <SubmitButton icon={<Play className="size-5" />} className="w-full">Iniciar</SubmitButton>
                </form>
                <InlineForm action={addManualTime.bind(null, id)} className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <p className="font-medium text-slate-700">Añadir tiempo a mano</p>
                  <div className="grid grid-cols-2 gap-3">
                    <input name="hours" inputMode="decimal" placeholder="Horas" className="field" aria-label="Horas" />
                    <input name="minutes" inputMode="numeric" placeholder="Minutos" className="field" aria-label="Minutos" />
                    <input name="date" type="date" defaultValue={toDateInput(new Date())} className="field col-span-2" aria-label="Fecha" />
                    <select name="technicianId" defaultValue={order.technicianId ?? ""} className="field col-span-2" aria-label="Técnico">
                      <option value="">— Sin técnico —</option>
                      {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <input name="description" placeholder="Qué se ha hecho (opcional)" className="field col-span-2" aria-label="Descripción" />
                  </div>
                  <SubmitButton icon={<Plus className="size-5" />} variant="secondary" className="w-full">Añadir tiempo</SubmitButton>
                </InlineForm>
              </div>
            )}
            <ul className="divide-y divide-slate-100 border-t border-slate-100 text-sm">
              {order.timeEntries.filter((t) => t.endedAt).map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-5 py-2">
                  <span className="w-24 text-slate-500">{formatDate(t.startedAt)}</span>
                  <span className="flex-1 truncate">{t.technician?.name ?? "—"}{t.description && <span className="text-slate-500"> · {t.description}</span>}</span>
                  <span className="font-medium">{fmtMinutes(t.minutes ?? 0)}</span>
                  {!closed && (
                    <form action={deleteTimeEntry.bind(null, id, t.id)}>
                      <ConfirmButton message="¿Borrar este registro de tiempo?" icon={<Trash2 className="size-5" />} ariaLabel="Borrar registro" className="w-12 text-slate-400 hover:bg-rose-50 hover:text-rose-600" />
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          {/* ── Costes ─────────────────────────────────────────────────── */}
          <Card>
            <CardHeader title="Desglose de costes" icon={Receipt} />
            <div className="px-5 py-4">
              {row("Piezas y materiales", formatEUR(totals.partsCents))}
              {row(
                order.laborMode === "FIXED" ? "Mano de obra (precio cerrado)" : `Mano de obra (${(minutesWorked / 60).toLocaleString("es-ES", { maximumFractionDigits: 2 })} h × ${formatEUR(laborRateCents)})`,
                formatEUR(totals.laborCents),
              )}
              {totals.discountCents > 0 && row(`Descuento ${order.discountPercent} %`, `−${formatEUR(totals.discountCents)}`)}
              {row("Base imponible", formatEUR(totals.subtotalCents))}
              {row(`IVA ${order.taxRate} %`, formatEUR(totals.taxCents))}
              {row("Total", formatEUR(totals.totalCents), true)}
              {running.length > 0 && <p className="mt-2 text-xs text-amber-700">Hay un cronómetro en marcha: su tiempo se suma al pararlo.</p>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Presupuestos" icon={FileText} subtitle="PDF con desglose, validez y pie legal" />
            <ul className="divide-y divide-slate-100">
              {order.quotes.map((q, _i, all) => {
                const hasAccepted = all.some((x) => x.status === "ACCEPTED");
                const st = effectiveQuoteStatus(q) as keyof typeof quoteStatus;
                const open = st === "DRAFT" || st === "SENT";
                const quoteForm = (to: "SENT" | "ACCEPTED" | "REJECTED", label: string, variant: "primary" | "secondary" | "danger", icon: React.ReactNode) => (
                  <form action={setQuoteStatus.bind(null, id, q.id, to)} className="contents">
                    <SubmitButton icon={icon} variant={variant} className="min-h-11 flex-1 px-3 text-sm">{label}</SubmitButton>
                  </form>
                );
                return (
                  <li key={q.id} className="space-y-3 px-5 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-medium">{q.number}</span>
                      <Badge tone={quoteStatus[st].tone}>{quoteStatus[st].label}</Badge>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <p className="text-xs text-slate-500">{formatDate(q.issuedAt)} · válido hasta {formatDate(q.validUntil)}</p>
                      <p className="text-lg font-semibold text-slate-900">{formatEUR(q.totalCents)}</p>
                    </div>
                    <div className="flex gap-2">
                      <a href={`/api/presupuestos/${q.id}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                        <Eye className="size-4" /> Ver PDF
                      </a>
                      <a href={`/api/presupuestos/${q.id}?descargar=1`} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                        <Download className="size-4" /> Descargar
                      </a>
                    </div>
                    {open && !closed && !hasAccepted && (
                      <div className="flex flex-wrap gap-2">
                        {st === "DRAFT" && quoteForm("SENT", "Entregado al cliente", "secondary", <Send className="size-4" />)}
                        {quoteForm("ACCEPTED", "Aceptado", "primary", <ThumbsUp className="size-4" />)}
                        {quoteForm("REJECTED", "Rechazado", "secondary", <ThumbsDown className="size-4" />)}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {!closed && (
              <InlineForm action={createQuote.bind(null, id)} className="space-y-3 border-t border-slate-100 bg-slate-50/60 p-5">
                <p className="font-medium text-slate-700">{order.quotes.length ? "Nuevo presupuesto" : "Generar presupuesto"}</p>
                <div className="grid grid-cols-2 gap-3">
                  {order.laborMode === "HOURLY" && (
                    <div>
                      <label htmlFor="estimatedHours" className="field-label">Horas estimadas</label>
                      <input id="estimatedHours" name="estimatedHours" inputMode="decimal" defaultValue={minutesWorked ? (minutesWorked / 60).toFixed(2).replace(".", ",") : ""} placeholder="p. ej. 1,5" className="field" />
                      <p className="mt-1 text-xs text-slate-500">Vacío = tiempo ya registrado</p>
                    </div>
                  )}
                  <div>
                    <label htmlFor="validityDays" className="field-label">Validez (días)</label>
                    <input id="validityDays" name="validityDays" inputMode="numeric" defaultValue={settings?.quoteValidityDays ?? 30} className="field" />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="quoteNotes" className="field-label">Observaciones para el cliente</label>
                    <textarea id="quoteNotes" name="notes" rows={2} placeholder="Plazo de entrega, condiciones…" className="field min-h-20 py-3" />
                  </div>
                </div>
                <SubmitButton icon={<FilePlus2 className="size-5" />} className="w-full">Generar presupuesto</SubmitButton>
                <p className="text-xs text-slate-500">Se guarda una copia fija de las piezas y la mano de obra actuales.</p>
              </InlineForm>
            )}
          </Card>

          <Card>
            <CardHeader title="Historial" icon={History} />
            <ol className="space-y-3 px-5 py-4">
              {order.statusHistory.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge tone={workOrderStatus[h.toStatus].tone}>{workOrderStatus[h.toStatus].label}</Badge>
                  <span className="text-slate-500">
                    {h.changedAt.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                  {h.note && <span className="w-full text-slate-600">{h.note}</span>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
