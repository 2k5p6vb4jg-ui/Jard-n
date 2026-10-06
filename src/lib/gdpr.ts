import "server-only";
import fsp from "node:fs/promises";
import path from "node:path";
import type { Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ZipArchive, type ZipEntryData } from "archiver";
import { prisma } from "./prisma";
import { formatDate } from "./dates";
import { formatEUR } from "./money";
import { resolveUploadPath, UPLOADS_ROOT } from "./storage";
import { renderTextPdf, type TextSection } from "./pdf/textPdf";
import {
  compressionClass,
  correctionType,
  documentType,
  equipmentCategory,
  footPathology,
  garmentType,
  insoleFinish,
  insoleMaterial,
  interventionType,
  prescriptionStatus,
  serviceType,
  workOrderStatus,
} from "./labels";

/** Todo lo que la app guarda de un paciente (derecho de acceso, art. 15 RGPD). */
export async function collectPatientData(patientId: string) {
  return prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      insoles: { include: { pathologies: true, corrections: true }, orderBy: { measuredAt: "asc" } },
      stockings: { orderBy: { measuredAt: "asc" } },
      documents: { orderBy: { createdAt: "asc" } },
      workOrders: { include: { parts: true, quotes: true, statusHistory: true }, orderBy: { receivedAt: "asc" } },
      products: { include: { interventions: { orderBy: { date: "asc" } } } },
    },
  });
}

type PatientData = NonNullable<Awaited<ReturnType<typeof collectPatientData>>>;

const yesNo = (b: boolean) => (b ? "Sí" : "No");

async function reportPdf(p: PatientData): Promise<Uint8Array> {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });
  const business = s?.businessName ?? "La ortopedia";
  const sections: TextSection[] = [
    {
      heading: "Datos personales",
      rows: [
        ["Nombre", `${p.firstName} ${p.lastName}`],
        ["DNI / NIE", p.dni ?? ""],
        ["Fecha de nacimiento", formatDate(p.birthDate)],
        ["Teléfono", [p.phone, p.phoneAlt].filter(Boolean).join(" · ")],
        ["Email", p.email ?? ""],
        ["Dirección", [p.address, p.postalCode, p.city].filter(Boolean).join(", ")],
        ["Tarjeta sanitaria", p.healthCardNo ?? ""],
        ["Observaciones", p.notes ?? ""],
        ["Alta en el sistema", formatDate(p.createdAt)],
      ],
    },
    {
      heading: "Consentimientos",
      rows: [
        ["Tratamiento de datos de salud", `${yesNo(p.gdprConsent)}${p.gdprConsentAt ? ` (desde ${formatDate(p.gdprConsentAt)})` : ""}`],
        ["Avisos y comunicaciones", yesNo(p.marketingOptIn)],
      ],
    },
    {
      heading: "Plantillas a medida",
      rows: p.insoles.flatMap((i) => [
        `${insoleMaterial[i.material]}${i.shoreDensity ? ` ${i.shoreDensity}º Shore` : ""} · ${insoleFinish[i.finish]} · ${prescriptionStatus[i.status].label}`,
        ["Toma de medidas / entrega", `${formatDate(i.measuredAt)} / ${formatDate(i.deliveredAt)}`],
        ["Patologías", i.pathologies.map((x) => footPathology[x.pathology]).join(", ")],
        ["Correcciones", i.corrections.map((c) => `${correctionType[c.type]}${c.valueMm ? ` ${c.valueMm} mm` : ""}`).join(", ")],
        ["Talla / longitudes", [i.shoeSize && `T${i.shoeSize}`, i.footLengthLeftMm && `izq. ${i.footLengthLeftMm} mm`, i.footLengthRightMm && `dcha. ${i.footLengthRightMm} mm`].filter(Boolean).join(" · ")],
        ["Notas", [i.diagnosisNotes, i.technicalNotes].filter(Boolean).join(" ")],
      ]),
    },
    {
      heading: "Medias de compresión",
      rows: p.stockings.flatMap((m) => [
        `${garmentType[m.garmentType]} · ${compressionClass[m.compressionClass]} · ${prescriptionStatus[m.status].label}`,
        ["Toma de medidas / entrega", `${formatDate(m.measuredAt)} / ${formatDate(m.deliveredAt)}`],
        ["Diagnóstico", m.diagnosis ?? ""],
        ["Medidas (cm)", (["cB", "cC", "cD", "cE", "cF", "cG", "cH", "lAD", "lAG", "lAT"] as const).filter((k) => m[k] != null).map((k) => `${k} ${m[k]}`).join(" · ")],
        ["Prescripción", [m.prescribingDoctor, m.prescriptionNumber, m.isPublicHealth ? "Seguridad Social" : null].filter(Boolean).join(" · ")],
      ]),
    },
    {
      heading: "Documentos y estudios",
      rows: p.documents.map((d) => [documentType[d.type], `${d.title} (${formatDate(d.takenAt ?? d.createdAt)}) · incluido en la carpeta «documentos»`] as [string, string]),
    },
    {
      heading: "Taller",
      rows: p.workOrders.flatMap((o) => [
        `${o.code} · ${equipmentCategory[o.equipmentCategory]} · ${serviceType[o.serviceType]} · ${workOrderStatus[o.status].label}`,
        ["Entrada / entrega", `${formatDate(o.receivedAt)} / ${formatDate(o.deliveredAt)}`],
        ["Motivo", o.reportedIssue],
        ["Presupuestos", o.quotes.map((q) => `${q.number} (${formatEUR(q.totalCents)})`).join(", ")],
      ]),
    },
    {
      heading: "Productos con número de serie",
      rows: p.products.flatMap((pr) => [
        `${equipmentCategory[pr.category]} · ${pr.brand} ${pr.model} · S/N ${pr.serialNumber}`,
        ["Entrega / garantía", `${formatDate(pr.deliveredAt)} / hasta ${formatDate(pr.warrantyUntil)}`],
        ["Intervenciones", pr.interventions.map((i) => `${interventionType[i.type]} ${formatDate(i.date)}`).join(", ")],
      ]),
    },
  ];

  return renderTextPdf({
    title: `Datos personales de ${p.firstName} ${p.lastName}`,
    subtitle: `Informe generado el ${formatDate(new Date())} por ${business} en respuesta al ejercicio del derecho de acceso (art. 15 RGPD). Los datos completos en formato electrónico se incluyen en el archivo datos.json (derecho de portabilidad, art. 20).`,
    sections,
    footer: [business, s?.legalName, s?.taxId && `CIF ${s.taxId}`, s?.address, s?.city, s?.phone, s?.email].filter(Boolean).join(" · "),
  });
}

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "documento";

/** ZIP con informe legible (PDF), datos estructurados (JSON) y los archivos originales. */
export async function writePatientExport(patientId: string, output: Writable): Promise<boolean> {
  const p = await collectPatientData(patientId);
  if (!p) return false;
  const archive = new ZipArchive({ zlib: { level: 6 } });
  const done = pipeline(archive, output);

  archive.append(Buffer.from(await reportPdf(p)), { name: "informe-datos-personales.pdf" });
  archive.append(JSON.stringify({ exportadoEl: new Date().toISOString(), paciente: p }, null, 2), { name: "datos.json" });
  archive.append(
    [
      "Exportación de datos personales",
      "",
      "- informe-datos-personales.pdf: resumen legible de todos los datos.",
      "- datos.json: los mismos datos en formato estructurado y reutilizable.",
      "- documentos/: estudios de pisada, fotos de huellas, recetas y demás archivos.",
    ].join("\r\n"),
    { name: "LEEME.txt" },
  );
  const used = new Set<string>();
  for (const d of p.documents) {
    const ext = path.extname(d.storagePath) || "";
    let name = `${formatDate(d.takenAt ?? d.createdAt).split("/").reverse().join("-")}_${slug(d.title)}${ext}`;
    for (let i = 2; used.has(name); i++) name = name.replace(/(\.\w+)?$/, `-${i}$1`);
    used.add(name);
    try {
      await fsp.access(resolveUploadPath(d.storagePath));
      archive.file(resolveUploadPath(d.storagePath), { name: `documentos/${name}`, store: true } as ZipEntryData);
    } catch {
      // Archivo no presente en disco: queda reflejado en el informe y en datos.json
    }
  }
  await archive.finalize();
  await done;
  return true;
}

/**
 * Supresión (art. 17 RGPD): borra la ficha, prescripciones, documentos y sus archivos.
 * Se conservan anonimizados los datos que pueden tener obligación legal de conservación
 * (órdenes de taller y presupuestos) y la trazabilidad de los productos por nº de serie.
 */
export async function erasePatient(patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true, documents: { select: { id: true } }, _count: { select: { insoles: true, stockings: true, documents: true, workOrders: true, products: true } } },
  });
  if (!patient) return null;
  const docIds = patient.documents.map((d) => d.id);

  await prisma.$transaction([
    prisma.workOrder.updateMany({
      where: { patientId },
      data: { patientId: null, customerName: "Paciente eliminado (RGPD)", customerPhone: null, internalNotes: null },
    }),
    // El registro de actividad no debe conservar nombres ni títulos de documentos del paciente
    prisma.auditLog.updateMany({
      where: { OR: [{ entity: "Patient", entityId: patientId }, { entity: "ClinicalDocument", entityId: { in: docIds } }] },
      data: { summary: null },
    }),
    prisma.patient.delete({ where: { id: patientId } }), // en cascada: plantillas, medias y documentos
  ]);

  // Archivos del paciente (carpeta uploads/<id>/)
  const dir = path.join(UPLOADS_ROOT, patientId);
  if (/^[a-z0-9]+$/i.test(patientId) && dir.startsWith(UPLOADS_ROOT + path.sep)) await fsp.rm(dir, { recursive: true, force: true });

  return patient._count;
}
