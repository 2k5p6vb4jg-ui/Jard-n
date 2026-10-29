import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, CheckCircle2, PenLine, ClipboardPlus, Download, Save, Eye, FileText, Package, Pencil, Send, StickyNote, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import { billingPeriod, proposalKind, proposalStatus } from "@/lib/labels";
import { effectiveQuoteStatus } from "@/lib/quotes";
import { contractValueCents, parseProposalLines, proposalTotals } from "@/lib/proposals";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubmitButton } from "@/components/ui/Form";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { createVisitOrder, deleteProposal, rescheduleVisit, setProposalStatus } from "../../../propuestas";
import { contractEnd, visitState } from "@/lib/contracts";
import { toDateInput } from "@/lib/forms";
import { InlineForm } from "@/components/ui/InlineForm";

export default async function ProposalPage({ params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id, pid } = await params;
  const p = await prisma.centerProposal.findFirst({
    where: { id: pid, centerId: id },
    include: {
      signature: { select: { signerName: true, signedAt: true } },
      visits: { include: { workOrder: { select: { id: true, code: true, status: true } } }, orderBy: { dueAt: "asc" } },
      center: { select: { id: true, name: true } },
      products: { include: { category: { select: { label: true } } }, orderBy: { serialNumber: "asc" } } },
  });
  if (!p) notFound();
  const st = effectiveQuoteStatus(p) as keyof typeof proposalStatus;
  const lines = parseProposalLines(p.linesJson);
  const t = proposalTotals(lines, p.discountPercent, p.taxRate);
  const per = billingPeriod[p.billingPeriod].per;
  const contract = contractValueCents(p);
  const decided = p.status === "ACCEPTED" || p.status === "REJECTED";
  const statusBtn = (to: "SENT" | "ACCEPTED" | "REJECTED", label: string, icon: React.ReactNode, variant: "primary" | "secondary") => (
    <form action={setProposalStatus.bind(null, p.id, to)}>
      <SubmitButton icon={icon} variant={variant}>{label}</SubmitButton>
    </form>
  );
  const item = (label: string, value: string) => (
    <div className="p-4 lg:px-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-slate-800">{value}</p>
    </div>
  );

  return (
    <>
      <Link href={`/centros/${id}`} className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="size-4" /> {p.center.name}
      </Link>
      <PageHeader
        eyebrow={<span className="font-mono normal-case tracking-normal">{p.number}</span>}
        title={p.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={proposalStatus[st].tone}>{proposalStatus[st].label}</Badge>
            {proposalKind[p.kind].label}
          </span>
        }
        actions={
          <>
            <a href={`/api/propuestas/${p.id}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 lg:min-h-11 lg:px-4 lg:text-[15px]">
              <Eye className="size-5" /> Ver PDF
            </a>
            <a href={`/api/propuestas/${p.id}?descargar=1`} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 lg:min-h-11 lg:px-4 lg:text-[15px]">
              <Download className="size-5" /> Descargar
            </a>
            {p.status !== "REJECTED" && (
              <LinkButton
                href={`/firmar?tipo=propuesta&id=${p.id}`}
                variant="secondary"
                icon={p.signature ? CheckCircle2 : PenLine}
                title={p.signature ? `Firmada por ${p.signature.signerName} el ${formatDate(p.signature.signedAt)}` : "Firmar la propuesta en la tablet"}
              >
                {p.signature ? "Firmada" : "Firmar"}
              </LinkButton>
            )}
            {!decided && <LinkButton href={`/centros/${id}/propuestas/${p.id}/editar`} variant="secondary" icon={Pencil}>Editar</LinkButton>}
          </>
        }
      />

      <Card className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-slate-100">
        <div className="col-span-2 p-4 sm:col-span-1 lg:px-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total {per}</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">{formatEUR(p.totalCents)}</p>
          {contract != null && <p className="text-xs text-slate-500">{formatEUR(contract)} en {p.durationMonths} meses</p>}
        </div>
        {item("Facturación", billingPeriod[p.billingPeriod].label)}
        {item("Duración", p.durationMonths ? `${p.durationMonths} meses` : "—")}
        {item("Equipos incluidos", p.products.length ? `${p.products.length}${p.visitsPerYear ? ` · ${p.visitsPerYear} revisiones/año` : ""}` : "—")}
        {item("Emitida · válida hasta", `${formatDate(p.issuedAt)} · ${formatDate(p.validUntil)}`)}
      </Card>

      {!decided ? (
        <Card className="mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:flex-wrap sm:items-center">
          <p className="text-sm text-slate-600 sm:mr-auto">¿Qué ha respondido el centro?</p>
          {p.status === "DRAFT" && statusBtn("SENT", "Entregada al centro", <Send className="size-5" />, "secondary")}
          {statusBtn("ACCEPTED", "Aceptada", <ThumbsUp className="size-5" />, "primary")}
          {statusBtn("REJECTED", "Rechazada", <ThumbsDown className="size-5" />, "secondary")}
        </Card>
      ) : (
        <p className={`mb-6 rounded-2xl p-4 text-sm font-medium ${p.status === "ACCEPTED" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {p.status === "ACCEPTED" ? "Aceptada" : "Rechazada"} el {formatDate(p.decidedAt)}.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {p.visits.length > 0 && (
            <Card>
              <CardHeader
                title="Contrato activo · revisiones"
                icon={CalendarCheck}
                subtitle={`Del ${formatDate(p.decidedAt)} al ${formatDate(contractEnd(p))} · ${p.visits.filter((v) => visitState(v).key === "done").length} de ${p.visits.length} hechas`}
              />
              <ul className="divide-y divide-slate-100">
                {p.visits.map((v, i) => {
                  const state = visitState(v);
                  return (
                    <li key={v.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <span className="w-8 text-sm text-slate-400">{i + 1}.</span>
                      <div className="min-w-0 flex-1">
                        {v.workOrder ? (
                          <p className="font-medium text-slate-800">{formatDate(v.dueAt)}</p>
                        ) : (
                          <InlineForm action={rescheduleVisit.bind(null, v.id)} className="flex items-center gap-2">
                            <input type="date" name="dueAt" defaultValue={toDateInput(v.dueAt)} aria-label="Fecha de la revisión" className="field max-w-44 lg:min-h-10" />
                            <SubmitButton variant="secondary" icon={<Save className="size-4" />} className="min-h-11 px-3 text-sm lg:min-h-10">Cambiar</SubmitButton>
                          </InlineForm>
                        )}
                      </div>
                      <Badge tone={state.tone}>{state.label}</Badge>
                      {v.workOrder && v.workOrder.status !== "CANCELLED" ? (
                        <Link href={`/taller/${v.workOrder.id}`} className="font-mono text-sm text-teal-700 hover:underline">{v.workOrder.code}</Link>
                      ) : (
                        <form action={createVisitOrder.bind(null, v.id)}>
                          <SubmitButton icon={<ClipboardPlus className="size-4" />} className="min-h-11 px-3 text-sm lg:min-h-10">Crear orden</SubmitButton>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
          <Card>
            <CardHeader title="Conceptos" icon={FileText} subtitle={p.billingPeriod === "ONE_OFF" ? "Importes con IVA aparte" : `Importes ${per}, IVA aparte`} />
            {p.intro && <p className="whitespace-pre-line border-b border-slate-100 px-5 py-4 text-slate-700">{p.intro}</p>}
            <ul className="divide-y divide-slate-100">
              {lines.map((l, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{l.description}</p>
                    <p className="text-sm text-slate-500">{l.quantity.toLocaleString("es-ES")} {l.unit} × {formatEUR(l.unitPriceCents)}</p>
                  </div>
                  <span className="font-medium">{formatEUR(Math.round(l.quantity * l.unitPriceCents))}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t border-slate-100 px-5 py-4 text-sm">
              {t.discountCents > 0 && <div className="flex justify-between text-slate-600"><dt>Descuento {p.discountPercent.toLocaleString("es-ES")} %</dt><dd>−{formatEUR(t.discountCents)}</dd></div>}
              <div className="flex justify-between text-slate-600"><dt>Base imponible</dt><dd>{formatEUR(p.subtotalCents)}</dd></div>
              <div className="flex justify-between text-slate-600"><dt>IVA {p.taxRate.toLocaleString("es-ES")} %</dt><dd>{formatEUR(p.taxCents)}</dd></div>
              <div className="flex justify-between pt-1 text-lg font-semibold text-slate-900"><dt>Total {per}</dt><dd>{formatEUR(p.totalCents)}</dd></div>
            </dl>
          </Card>
        </div>
        <div className="space-y-6">
          {p.products.length > 0 && (
            <Card>
              <CardHeader title="Equipos incluidos" icon={Package} />
              <ul className="divide-y divide-slate-100">
                {p.products.map((pr) => (
                  <li key={pr.id} className="px-5 py-2.5">
                    <p className="truncate text-sm font-medium text-slate-800">{pr.category.label} · {pr.brand} {pr.model}</p>
                    <p className="font-mono text-xs text-slate-500">{pr.serialNumber}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {p.internalNotes && (
            <Card>
              <CardHeader title="Notas internas" icon={StickyNote} />
              <p className="whitespace-pre-line px-5 py-4 text-sm text-slate-700">{p.internalNotes}</p>
            </Card>
          )}
          <form action={deleteProposal.bind(null, p.id)}>
            <ConfirmButton message={`¿Borrar la propuesta ${p.number}?`} icon={<Trash2 className="size-4" />} className="w-full text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600">
              Borrar propuesta
            </ConfirmButton>
          </form>
        </div>
      </div>
    </>
  );
}
