"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  CompressionClass,
  CorrectionType,
  FootPathology,
  GarmentType,
  InsoleFinish,
  InsoleMaterial,
  InsoleType,
  KnitType,
  PrescriptionStatus,
  Side,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { addMonths } from "@/lib/dates";
import { type ActionState, bool, cents, date, FormError, handle, int, num, oneOf, str } from "@/lib/forms";

const SIDES = Object.values(Side);

/**
 * Fechas de entrega y próxima revisión:
 * al marcar como ENTREGADA se fija la entrega (hoy si no se indica) y la revisión
 * a +12 meses (plantillas) o +6 meses (medias), según Ajustes.
 */
async function lifecycle(fd: FormData, kind: "insole" | "stocking") {
  const status = oneOf(fd, "status", Object.values(PrescriptionStatus)) ?? "PENDING";
  let deliveredAt = date(fd, "deliveredAt");
  if (status === "DELIVERED" && !deliveredAt) deliveredAt = new Date();
  if (status !== "DELIVERED") deliveredAt = null;
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const months = kind === "insole" ? (settings?.insoleRenewalMonths ?? 12) : (settings?.stockingRenewalMonths ?? 6);
  return {
    status,
    measuredAt: date(fd, "measuredAt") ?? new Date(),
    deliveredAt,
    nextReviewAt: deliveredAt ? addMonths(deliveredAt, months) : null,
    priceCents: cents(fd, "price"),
  };
}

/** Una nueva prescripción entregada "renueva" las anteriores del mismo tipo: se cierran sus avisos. */
async function closePreviousRenewals(kind: "insole" | "stocking", saved: { id: string; patientId: string; deliveredAt: Date | null }) {
  if (!saved.deliveredAt) return;
  const where = {
    patientId: saved.patientId,
    id: { not: saved.id },
    deliveredAt: { lt: saved.deliveredAt }, // solo las anteriores, nunca una más reciente
    status: "DELIVERED" as const, renewalStatus: { in: ["PENDING" as const, "CONTACTED" as const] } };
  const data = { renewalStatus: "RENEWED" as const };
  if (kind === "insole") await prisma.insolePrescription.updateMany({ where, data });
  else await prisma.compressionStocking.updateMany({ where, data });
}

// ── Plantillas ──────────────────────────────────────────────────────────────

function insoleData(fd: FormData) {
  return {
    insoleType: oneOf(fd, "insoleType", Object.values(InsoleType)) ?? "DAILY",
    side: oneOf(fd, "side", SIDES) ?? "BOTH",
    diagnosisNotes: str(fd, "diagnosisNotes"),
    prescribedBy: str(fd, "prescribedBy"),
    material: oneOf(fd, "material", Object.values(InsoleMaterial)) ?? "EVA",
    shoreDensity: int(fd, "shoreDensity"),
    baseMaterial: oneOf(fd, "baseMaterial", Object.values(InsoleMaterial)),
    baseDensity: int(fd, "baseDensity"),
    finish: oneOf(fd, "finish", Object.values(InsoleFinish)) ?? "NONE",
    thicknessMm: num(fd, "thicknessMm"),
    shoeSize: num(fd, "shoeSize"),
    footLengthLeftMm: num(fd, "footLengthLeftMm"),
    footLengthRightMm: num(fd, "footLengthRightMm"),
    footWidthLeftMm: num(fd, "footWidthLeftMm"),
    footWidthRightMm: num(fd, "footWidthRightMm"),
    archHeightLeftMm: num(fd, "archHeightLeftMm"),
    archHeightRightMm: num(fd, "archHeightRightMm"),
    heelLiftMm: num(fd, "heelLiftMm"),
    technicalNotes: str(fd, "technicalNotes"),
  };
}

function insolePathologies(fd: FormData) {
  return Object.values(FootPathology).flatMap((p) => {
    const side = oneOf(fd, `path_${p}`, SIDES);
    return side ? [{ pathology: p, side }] : [];
  });
}

function insoleCorrections(fd: FormData) {
  const types = fd.getAll("corr_type").map(String);
  const sides = fd.getAll("corr_side").map(String);
  const mms = fd.getAll("corr_mm").map(String);
  const notes = fd.getAll("corr_notes").map(String);
  return types.map((type, i) => {
    if (!Object.values(CorrectionType).includes(type as CorrectionType)) throw new FormError("Tipo de corrección no válido.");
    const mm = mms[i]?.trim() ? Number(mms[i].replace(",", ".")) : null;
    if (mm !== null && !Number.isFinite(mm)) throw new FormError(`Milímetros no válidos: «${mms[i]}».`);
    return {
      type: type as CorrectionType,
      side: (SIDES.includes(sides[i] as Side) ? sides[i] : "BOTH") as Side,
      valueMm: mm,
      notes: notes[i]?.trim() || null,
    };
  });
}

export async function saveInsole(patientId: string, insoleId: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const data = { ...insoleData(fd), ...(await lifecycle(fd, "insole")) };
    const pathologies = insolePathologies(fd);
    const corrections = insoleCorrections(fd);

    const saved = await prisma.$transaction(async (tx) => {
      if (insoleId) {
        await tx.insolePathology.deleteMany({ where: { insoleId } });
        await tx.insoleCorrection.deleteMany({ where: { insoleId } });
        return tx.insolePrescription.update({
          where: { id: insoleId, patientId },
          data: { ...data, pathologies: { create: pathologies }, corrections: { create: corrections } },
        });
      }
      return tx.insolePrescription.create({
        data: { ...data, patientId, pathologies: { create: pathologies }, corrections: { create: corrections } },
      });
    });
    if (saved.status === "DELIVERED") await closePreviousRenewals("insole", saved);
    await audit(insoleId ? "UPDATE" : "CREATE", "InsolePrescription", saved.id);
  });
  if (res?.error) return res;
  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/");
  redirect(`/pacientes/${patientId}`);
}

// ── Medias de compresión ────────────────────────────────────────────────────

const STOCKING_MEASURES = ["cB", "cB1", "cC", "cD", "cE", "cF", "cG", "cH", "cT", "cY", "lAB1", "lAC", "lAD", "lAE", "lAF", "lAG", "lAT", "footLengthCm"] as const;

function stockingData(fd: FormData) {
  const compressionClass = oneOf(fd, "compressionClass", Object.values(CompressionClass));
  const garmentType = oneOf(fd, "garmentType", Object.values(GarmentType));
  if (!compressionClass) throw new FormError("Indique la clase de compresión.");
  if (!garmentType) throw new FormError("Indique el tipo de prenda.");
  const measures = Object.fromEntries(STOCKING_MEASURES.map((k) => [k, num(fd, k)])) as Record<(typeof STOCKING_MEASURES)[number], number | null>;
  return {
    compressionClass,
    garmentType,
    knitType: oneOf(fd, "knitType", Object.values(KnitType)) ?? "CIRCULAR",
    side: oneOf(fd, "side", SIDES) ?? "BOTH",
    madeToMeasure: bool(fd, "madeToMeasure"),
    openToe: bool(fd, "openToe"),
    brand: str(fd, "brand"),
    model: str(fd, "model"),
    color: str(fd, "color"),
    diagnosis: str(fd, "diagnosis"),
    ...measures,
    measurementNotes: str(fd, "measurementNotes"),
    prescribingDoctor: str(fd, "prescribingDoctor"),
    doctorLicenseNo: str(fd, "doctorLicenseNo"),
    prescriptionNumber: str(fd, "prescriptionNumber"),
    prescriptionDate: date(fd, "prescriptionDate"),
    isPublicHealth: bool(fd, "isPublicHealth"),
    publicHealthCode: str(fd, "publicHealthCode"),
    patientContribCents: cents(fd, "patientContrib"),
  };
}

export async function saveStocking(patientId: string, stockingId: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const data = { ...stockingData(fd), ...(await lifecycle(fd, "stocking")) };
    const saved = stockingId
      ? await prisma.compressionStocking.update({ where: { id: stockingId, patientId }, data })
      : await prisma.compressionStocking.create({ data: { ...data, patientId } });
    if (saved.status === "DELIVERED") await closePreviousRenewals("stocking", saved);
    await audit(stockingId ? "UPDATE" : "CREATE", "CompressionStocking", saved.id);
  });
  if (res?.error) return res;
  revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/");
  redirect(`/pacientes/${patientId}`);
}
