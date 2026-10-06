import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CalendarClock,
  FileText,
  Footprints,
  ImageIcon,
  Pencil,
  Plus,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import {
  compressionClass,
  correctionType,
  documentType,
  equipmentCategory,
  footPathology,
  garmentType,
  insoleFinish,
  insoleMaterial,
  prescriptionStatus,
  workOrderStatus,
} from "@/lib/labels";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";

function AddLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 font-medium text-teal-700 ring-1 ring-inset ring-teal-200 hover:bg-teal-50">
      <Plus className="size-4" />
      {children}
    </Link>
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
      workOrders: { orderBy: { receivedAt: "desc" } },
    },
  });
  if (!patient) notFound();

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
        title={`${patient.firstName} ${patient.lastName}`}
        description={patient.dni ?? undefined}
        actions={
          <>
            <span className="self-center">
              {patient.gdprConsent ? <Badge tone="emerald"><ShieldCheck className="size-3.5" />Consentimiento RGPD</Badge> : <Badge tone="rose">Sin consentimiento RGPD</Badge>}
            </span>
            <LinkButton href={`/pacientes/${patient.id}/editar`} variant="secondary" icon={Pencil}>Editar ficha</LinkButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ficha general */}
        <Card className="lg:col-span-1">
          <CardHeader title="Ficha general" icon={Stethoscope} />
          <dl className="space-y-3 px-5 py-4 text-slate-700">
            {patient.phone && <p className="flex items-center gap-3"><Phone className="size-4 text-slate-400" /><a href={`tel:${patient.phone.replace(/\s/g, "")}`}>{patient.phone}</a></p>}
            {patient.email && <p className="flex items-center gap-3"><Mail className="size-4 text-slate-400" />{patient.email}</p>}
            {(patient.address || patient.city) && <p className="flex items-center gap-3"><MapPin className="size-4 text-slate-400" />{[patient.address, patient.city].filter(Boolean).join(", ")}</p>}
            {patient.birthDate && <p className="flex items-center gap-3"><CalendarClock className="size-4 text-slate-400" />Nacimiento: {formatDate(patient.birthDate)}</p>}
            {patient.notes && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{patient.notes}</p>}
          </dl>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {/* Plantillas */}
          <Card>
            <CardHeader title="Plantillas a medida" icon={Footprints} subtitle="Renovación cada 12 meses" action={<AddLink href={`/pacientes/${patient.id}/plantillas/nueva`}>Nuevas</AddLink>} />
            {patient.insoles.length === 0 ? (
              <EmptyState icon={Footprints} title="Sin plantillas registradas" />
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
          </Card>

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
            <CardHeader title="Documentos y estudios de pisada" icon={FileText} />
            {patient.documents.length === 0 ? (
              <EmptyState icon={FileText} title="Sin documentos" />
            ) : (
              <ul className="grid gap-3 p-5 sm:grid-cols-2">
                {patient.documents.map((d) => (
                  <li key={d.id}>
                    <a
                      href={`/api/uploads/${d.storagePath}`}
                      target="_blank"
                      className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-teal-300"
                    >
                      <span className="grid size-10 place-items-center rounded-lg bg-slate-100 text-slate-500">
                        {d.mimeType.startsWith("image/") ? <ImageIcon className="size-5" /> : <FileText className="size-5" />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{d.title}</p>
                        <p className="text-xs text-slate-500">{documentType[d.type]} · {formatDate(d.takenAt ?? d.createdAt)}</p>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Taller */}
          <Card>
            <CardHeader title="Órdenes de taller" icon={Wrench} action={<AddLink href={`/taller/nueva?paciente=${patient.id}`}>Nueva</AddLink>} />
            {patient.workOrders.length === 0 && <EmptyState icon={Wrench} title="Sin órdenes de taller" />}
            <ul className="divide-y divide-slate-100">
              {patient.workOrders.map((o) => (
                <li key={o.id}>
                  <Link href={`/taller/${o.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                    <span><span className="font-mono text-sm text-slate-500">{o.code}</span> · {equipmentCategory[o.equipmentCategory]}</span>
                    <Badge tone={workOrderStatus[o.status].tone}>{workOrderStatus[o.status].label}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
