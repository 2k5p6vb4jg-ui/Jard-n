import { notFound } from "next/navigation";
import { UpcomingAppointments } from "@/components/agenda/UpcomingAppointments";
import Link from "next/link";
import {
  Building2,
  CalendarClock,
  ChevronDown,
  FileDown,
  FileText,
  Footprints,
  Pencil,
  PenLine,
  Plus,
  RotateCcw,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { statusTones } from "@/lib/insoleOrders";
import { LinkedItems } from "@/components/orders/LinkedItems";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { messages } from "@/lib/whatsapp";
import { businessName } from "@/lib/settings";
import { linkedItemsSelect } from "@/lib/orders";
import { getStatusLabels } from "@/lib/workOrderOptions";
import { formatDate } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import {
  compressionClass,
  correctionType,
  footPathology,
  garmentType,
  insoleFinish,
  insoleMaterial,
  prescriptionStatus,
  renewalStatus,
  workOrderStatus,
} from "@/lib/labels";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { DocumentUploader } from "@/components/patients/DocumentUploader";
import { DocumentGallery } from "@/components/patients/DocumentGallery";
import { deleteDocument, uploadDocuments } from "../documents";
import { erasePatientAction } from "../actions";
import { ErasePatientForm } from "@/components/patients/ErasePatientForm";
import { updateRenewal } from "@/app/renewals";
import { SubmitButton } from "@/components/ui/Form";
import { LinkButton } from "@/components/ui/Button";

function AddLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 font-medium text-teal-700 ring-1 ring-inset ring-teal-200 hover:bg-teal-50">
      <Plus className="size-4" />
      {children}
    </Link>
  );
}

/** Estado del aviso de renovación; un aviso descartado se puede reactivar. */
function RenewalBadge({ kind, id, status, delivered }: { kind: "INSOLE" | "STOCKING"; id: string; status: keyof typeof renewalStatus; delivered: boolean }) {
  if (!delivered || status === "PENDING") return null;
  return (
    <span className="inline-flex items-center gap-1">
      <Badge tone={renewalStatus[status].tone}>{renewalStatus[status].label}</Badge>
      {status === "DISMISSED" && (
        <form action={updateRenewal.bind(null, kind, id, "REOPEN")}>
          <SubmitButton icon={<RotateCcw className="size-3.5" />} variant="secondary" className="min-h-8 px-2 text-xs shadow-none lg:min-h-8">Reactivar aviso</SubmitButton>
        </form>
      )}
    </span>
  );
}

function EditLink({ href }: { href: string }) {
  return (
    <Link href={href} className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100">
      <Pencil className="size-4" />
      Editar
    </Link>
  );
}

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      insoles: { include: { pathologies: true, corrections: true }, orderBy: { measuredAt: "desc" } },
      stockings: { orderBy: { measuredAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
      workOrders: { include: { equipmentCategory: { select: { label: true } } }, orderBy: { receivedAt: "desc" } },
      center: { select: { id: true, name: true } },
      orderItems: linkedItemsSelect,
      insoleOrders: { include: { type: true, material: true, status: true }, orderBy: { createdAt: "desc" } },
      signatures: { where: { kind: "CONSENT" }, select: { signedAt: true }, orderBy: { signedAt: "desc" }, take: 1 },
    },
  });
  if (!patient) notFound();
  const consent = patient.signatures[0];
  const st = await getStatusLabels();
  const business = await businessName();
  const tones = statusTones(await prisma.catalogOption.findMany({ where: { kind: "STATUS" }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }));

  const prescriptionLinks = [
    ...patient.insoles.map((i) => ({ value: `insole:${i.id}`, label: `Plantillas ${insoleMaterial[i.material]}${i.shoreDensity ? ` ${i.shoreDensity}º` : ""} · ${formatDate(i.measuredAt)}` })),
    ...patient.stockings.map((s) => ({ value: `stocking:${s.id}`, label: `Medias ${s.compressionClass} · ${formatDate(s.measuredAt)}` })),
  ];

  const measure = (label: string, v: number | null, unit = "cm") =>
    v != null && (
      <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="font-medium text-slate-800">
          {v} {unit}
        </dd>
      </div>
    );

  return (
    <>
      <PageHeader
        eyebrow="Cliente"
        title={`${patient.firstName} ${patient.lastName}`}
        description={[patient.dni, patient.phone, patient.city].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            {patient.center && (
              <Link href={`/centros/${patient.center.id}`} className="self-center">
                <Badge tone="teal"><Building2 className="size-3.5" />{patient.center.name}</Badge>
              </Link>
            )}
            <span className="self-center">
              {patient.gdprConsent ? <Badge tone="emerald"><ShieldCheck className="size-3.5" />Consentimiento RGPD</Badge> : <Badge tone="rose">Sin consentimiento RGPD</Badge>}
            </span>
            <LinkButton href={`/pacientes/${patient.id}/editar`} variant="secondary" icon={Pencil}>Editar ficha</LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Ficha general */}
        <div className="space-y-6 lg:col-span-1">
        <Card>
          <CardHeader title="Ficha general" icon={Stethoscope} />
          <dl className="space-y-3 px-5 py-4 text-slate-700">
            {patient.phone && (
              <p className="flex items-center gap-3">
                <Phone className="size-4 text-slate-400" />
                <a href={`tel:${patient.phone.replace(/\s/g, "")}`}>{patient.phone}</a>
                <WhatsAppButton phone={patient.phone} compact text={messages.generic(patient.firstName, business)} className="ml-auto" />
              </p>
            )}
            {patient.email && <p className="flex items-center gap-3"><Mail className="size-4 text-slate-400" />{patient.email}</p>}
            {(patient.address || patient.city) && <p className="flex items-center gap-3"><MapPin className="size-4 text-slate-400" />{[patient.address, patient.city].filter(Boolean).join(", ")}</p>}
            {patient.birthDate && <p className="flex items-center gap-3"><CalendarClock className="size-4 text-slate-400" />Nacimiento: {formatDate(patient.birthDate)}</p>}
            {patient.notes && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{patient.notes}</p>}
          </dl>
        </Card>

        <UpcomingAppointments where={{ patientId: patient.id }} newHref={`/agenda/nueva?paciente=${patient.id}`} />

        <Card>
          <CardHeader title="Protección de datos" icon={ShieldCheck} subtitle="Derechos del paciente (RGPD)" />
          <div className="space-y-3 p-5">
            {consent ? (
              <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                <p className="flex items-center gap-1.5 font-medium"><ShieldCheck className="size-4" />Consentimiento firmado el {formatDate(consent.signedAt)}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <a href={`/api/pacientes/${patient.id}/consentimiento`} target="_blank" rel="noreferrer" className="font-medium text-emerald-900 underline-offset-2 hover:underline">Ver PDF firmado</a>
                  <Link href={`/firmar?tipo=consentimiento&id=${patient.id}`} className="font-medium text-emerald-900 underline-offset-2 hover:underline">Volver a firmar</Link>
                </div>
              </div>
            ) : (
              <LinkButton href={`/firmar?tipo=consentimiento&id=${patient.id}`} icon={PenLine} className="w-full">Firmar consentimiento en la tablet</LinkButton>
            )}
            <a href={`/api/pacientes/${patient.id}/exportar`} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
              <FileDown className="size-5" />
              Exportar todos sus datos
            </a>
            <p className="text-xs text-slate-500">Acceso y portabilidad: .zip con informe PDF para entregar, datos en JSON y todos sus documentos.</p>
            <ErasePatientForm action={erasePatientAction.bind(null, patient.id)} name={`${patient.firstName} ${patient.lastName}`} />
          </div>
        </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {/* Reparaciones */}
          <Card>
            <CardHeader title="Reparaciones" icon={Wrench} action={<AddLink href={`/taller/nueva?paciente=${patient.id}`}>Nueva</AddLink>} />
            {patient.workOrders.length === 0 && <EmptyState icon={Wrench} title="Sin reparaciones" />}
            <ul className="divide-y divide-slate-100">
              {patient.workOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/taller/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                    <span><span className="font-mono text-sm text-slate-500">{o.code}</span> · {o.equipmentCategory.label}</span>
                    <Badge tone={workOrderStatus[o.status].tone}>{st[o.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {/* Plantillas (pedidos) */}
          <Card>
            <CardHeader title="Plantillas" icon={Footprints} action={<AddLink href={`/plantillas/nueva?paciente=${patient.id}`}>Nueva</AddLink>} />
            {patient.insoleOrders.length === 0 && <EmptyState icon={Footprints} title="Sin plantillas" />}
            <ul className="divide-y divide-slate-100">
              {patient.insoleOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/plantillas/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                    <span className="min-w-0">
                      <span className="font-mono text-sm text-slate-500">{o.code}</span> · {o.type.label}
                      <span className="block truncate text-sm text-slate-500">
                        {formatDate(o.measuredAt)}{o.material && ` · ${o.material.label}`}{o.priceCents != null && ` · ${formatEUR(o.priceCents)}${o.paid ? "" : " (pendiente de pago)"}`}
                      </span>
                    </span>
                    <Badge tone={tones[o.statusId]}>{o.status.label}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <LinkedItems items={patient.orderItems} newHref={`/pedidos/apuntar?paciente=${patient.id}`} hideWhenEmpty />

          {/* Medias */}
          <Card>
            <CardHeader title="Medias de compresión" icon={CalendarClock} subtitle="Renovación cada 6 meses" action={<AddLink href={`/pacientes/${patient.id}/medias/nueva`}>Nuevas</AddLink>} />
            {patient.stockings.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Sin medias registradas" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {patient.stockings.map((s) => (
                  <li key={s.id} className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-800">{garmentType[s.garmentType]} · {compressionClass[s.compressionClass]}</p>
                      <Badge tone={prescriptionStatus[s.status].tone}>{prescriptionStatus[s.status].label}</Badge>
                      <EditLink href={`/pacientes/${patient.id}/medias/${s.id}`} />
                      {s.isPublicHealth && <Badge tone="violet">Seguridad Social</Badge>}
                      {s.nextReviewAt && <Badge tone={s.nextReviewAt < new Date() ? "rose" : "slate"}>Revisión {formatDate(s.nextReviewAt)}</Badge>}
                      <RenewalBadge kind="STOCKING" id={s.id} status={s.renewalStatus} delivered={s.status === "DELIVERED"} />
                    </div>
                    <dl className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {measure("cB", s.cB)}
                      {measure("cC", s.cC)}
                      {measure("cD", s.cD)}
                      {measure("cE", s.cE)}
                      {measure("cF", s.cF)}
                      {measure("cG", s.cG)}
                      {measure("lA-D", s.lAD)}
                      {measure("lA-G", s.lAG)}
                      {measure("lA-T", s.lAT)}
                    </dl>
                    <p className="text-sm text-slate-500">
                      {[s.brand, s.model, s.color].filter(Boolean).join(" · ")}
                      {s.prescriptionNumber && ` · Receta ${s.prescriptionNumber} (${s.prescribingDoctor ?? "—"})`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Documentos */}
          <Card>
            <CardHeader title="Documentos y estudios de pisada" icon={FileText} subtitle="Fotos de huellas, estudios digitales, recetas e informes" />
            <DocumentUploader action={uploadDocuments.bind(null, patient.id)} links={prescriptionLinks} />
            <DocumentGallery
              docs={patient.documents.map((d) => ({
                ...d,
                linkLabel: d.insoleId ? (prescriptionLinks.find((l) => l.value === `insole:${d.insoleId}`)?.label ?? null) : d.stockingId ? (prescriptionLinks.find((l) => l.value === `stocking:${d.stockingId}`)?.label ?? null) : null,
              }))}
              deleteAction={deleteDocument.bind(null, patient.id)}
            />
          </Card>

          {/* Prescripción clínica de plantillas (patologías, correcciones, medidas y avisos de renovación) */}
          <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
            <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="grid size-9 place-items-center rounded-lg bg-teal-50 text-teal-600"><Stethoscope className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-800">Prescripción clínica de plantillas</span>
                <span className="block text-sm text-slate-500">{patient.insoles.length} {patient.insoles.length === 1 ? "registro" : "registros"} · Patologías, correcciones y aviso de renovación a los 12 meses</span>
              </span>
              <ChevronDown className="size-5 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <AddLink href={`/pacientes/${patient.id}/plantillas/nueva`}>Nueva prescripción</AddLink>
            </div>
            {patient.insoles.length === 0 ? (
              <EmptyState icon={Stethoscope} title="Sin prescripciones clínicas" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {patient.insoles.map((i) => (
                  <li key={i.id} className="space-y-3 px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-800">
                        {insoleMaterial[i.material]}
                        {i.shoreDensity && ` ${i.shoreDensity}º Shore`} · {insoleFinish[i.finish]}
                      </p>
                      <Badge tone={prescriptionStatus[i.status].tone}>{prescriptionStatus[i.status].label}</Badge>
                      <EditLink href={`/pacientes/${patient.id}/plantillas/${i.id}`} />
                      {i.nextReviewAt && <Badge tone={i.nextReviewAt < new Date() ? "rose" : "slate"}>Revisión {formatDate(i.nextReviewAt)}</Badge>}
                      <RenewalBadge kind="INSOLE" id={i.id} status={i.renewalStatus} delivered={i.status === "DELIVERED"} />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {i.pathologies.map((p) => <Badge key={p.id} tone="indigo">{footPathology[p.pathology]}</Badge>)}
                      {i.corrections.map((c) => <Badge key={c.id} tone="sky">{correctionType[c.type]}{c.valueMm ? ` ${c.valueMm} mm` : ""}</Badge>)}
                    </div>
                    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {measure("Talla", i.shoeSize, "EU")}
                      {measure("Long. izq.", i.footLengthLeftMm, "mm")}
                      {measure("Long. dcha.", i.footLengthRightMm, "mm")}
                      {measure("Alza", i.heelLiftMm, "mm")}
                    </dl>
                    {i.technicalNotes && <p className="text-sm text-slate-600">{i.technicalNotes}</p>}
                    <p className="text-sm text-slate-500">Entregadas {formatDate(i.deliveredAt)} · {formatEUR(i.priceCents)}</p>
                  </li>
                ))}
              </ul>
            )}
          </details>
        </div>
      </div>
    </>
  );
}
