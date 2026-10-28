"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { BillingPeriod, ProposalKind, type QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { addDays } from "@/lib/dates";
import { type ProposalLine, proposalTotals } from "@/lib/proposals";
import { type ActionState, FormError, handle, int, num, oneOf, required, str } from "@/lib/forms";

async function nextNumber() {
  const prefix = `PROP-${new Date().getFullYear()}-`;
  const last = await prisma.centerProposal.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } });
  return `${prefix}${String((last ? Number(last.number.slice(prefix.length)) : 0) + 1).padStart(4, "0")}`;
}

function readLines(fd: FormData): ProposalLine[] {
  let raw: unknown;
  try {
    raw = JSON.parse(String(fd.get("lines") ?? "[]"));
  } catch {
    throw new FormError("No se han podido leer los conceptos.");
  }
  if (!Array.isArray(raw)) throw new FormError("No se han podido leer los conceptos.");
  const lines = raw
    .map((l) => ({
      description: String(l?.description ?? "").trim(),
      quantity: Number(String(l?.quantity ?? "").replace(",", ".")),
      unit: String(l?.unit ?? "ud").trim() || "ud",
      unitPriceCents: Math.round(Number(String(l?.unitPrice ?? "").replace(/\s/g, "").replace(",", ".")) * 100),
    }))
    .filter((l) => l.description || l.unitPriceCents);
  if (lines.length === 0) throw new FormError("Añada al menos un concepto con su precio.");
  for (const l of lines) {
    if (!l.description) throw new FormError("Hay un concepto sin descripción.");
    if (!Number.isFinite(l.quantity) || l.quantity <= 0) throw new FormError(`Cantidad no válida en «${l.description}».`);
    if (!Number.isFinite(l.unitPriceCents) || l.unitPriceCents < 0) throw new FormError(`Precio no válido en «${l.description}».`);
  }
  return lines;
}

async function proposalData(centerId: string, fd: FormData) {
  const kind = oneOf(fd, "kind", Object.values(ProposalKind));
  if (!kind) throw new FormError("Elija el tipo de propuesta.");
  const lines = readLines(fd);
  const discountPercent = num(fd, "discountPercent") ?? 0;
  if (discountPercent < 0 || discountPercent > 100) throw new FormError("El descuento debe estar entre 0 y 100 %.");
  const taxRate = num(fd, "taxRate") ?? 21;
  const validityDays = int(fd, "validityDays") ?? 30;
  if (validityDays < 1 || validityDays > 365) throw new FormError("La validez debe estar entre 1 y 365 días.");
  const billing = oneOf(fd, "billingPeriod", Object.values(BillingPeriod)) ?? "ONE_OFF";
  const durationMonths = billing === "ONE_OFF" ? null : int(fd, "durationMonths");
  if (durationMonths !== null && (durationMonths < 1 || durationMonths > 120)) throw new FormError("La duración debe estar entre 1 y 120 meses.");
  // Solo equipos del centro o de sus usuarios
  const ids = fd.getAll("productIds").map(String);
  const products = ids.length
    ? await prisma.trackedProduct.findMany({ where: { id: { in: ids }, OR: [{ centerId }, { patient: { centerId } }] }, select: { id: true } })
    : [];
  const t = proposalTotals(lines, discountPercent, taxRate);
  return {
    data: {
      kind,
      title: required(fd, "title", "Título"),
      intro: str(fd, "intro"),
      linesJson: JSON.stringify(lines),
      discountPercent,
      taxRate,
      subtotalCents: t.subtotalCents,
      taxCents: t.taxCents,
      totalCents: t.totalCents,
      billingPeriod: billing,
      durationMonths,
      visitsPerYear: kind === "MAINTENANCE" ? int(fd, "visitsPerYear") : null,
      internalNotes: str(fd, "internalNotes"),
    },
    validityDays,
    productIds: products.map((p) => p.id),
  };
}

export async function saveProposal(centerId: string, proposalId: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let id = proposalId ?? "";
  const res = await handle(async () => {
    const { data, validityDays, productIds } = await proposalData(centerId, fd);
    if (proposalId) {
      const prev = await prisma.centerProposal.findUniqueOrThrow({ where: { id: proposalId } });
      if (prev.status === "ACCEPTED" || prev.status === "REJECTED") throw new FormError("Una propuesta aceptada o rechazada no se modifica: cree una nueva.");
      await prisma.centerProposal.update({
        where: { id: proposalId },
        data: { ...data, validUntil: addDays(prev.issuedAt, validityDays), products: { set: productIds.map((pid) => ({ id: pid })) } },
      });
      await audit("UPDATE", "CenterProposal", proposalId);
    } else {
      const p = await prisma.centerProposal.create({
        data: { ...data, centerId, number: await nextNumber(), validUntil: addDays(new Date(), validityDays), products: { connect: productIds.map((pid) => ({ id: pid })) } },
      });
      id = p.id;
      await audit("CREATE", "CenterProposal", id, p.number);
    }
  });
  if (res?.error) return res;
  revalidatePath(`/centros/${centerId}`);
  redirect(`/centros/${centerId}/propuestas/${id}`);
}

export async function setProposalStatus(id: string, to: QuoteStatus) {
  const p = await prisma.centerProposal.findUnique({ where: { id } });
  if (!p || !["SENT", "ACCEPTED", "REJECTED", "DRAFT"].includes(to)) return;
  await prisma.centerProposal.update({ where: { id }, data: { status: to, decidedAt: to === "ACCEPTED" || to === "REJECTED" ? new Date() : null } });
  // Al aceptar una propuesta, un centro «posible cliente» pasa a activo
  if (to === "ACCEPTED") {
    const active = await prisma.catalogOption.findFirst({ where: { kind: "CENTER_STATUS", key: "ACTIVE", active: true } });
    const center = await prisma.center.findUnique({ where: { id: p.centerId }, include: { status: true } });
    if (active && center?.status.key === "PROSPECT") await prisma.center.update({ where: { id: p.centerId }, data: { statusId: active.id } });
  }
  await audit("UPDATE", "CenterProposal", id, `Estado: ${to}`);
  revalidatePath(`/centros/${p.centerId}`);
  revalidatePath(`/centros/${p.centerId}/propuestas/${id}`);
}

export async function deleteProposal(id: string) {
  const p = await prisma.centerProposal.delete({ where: { id } });
  await audit("DELETE", "CenterProposal", id, p.number);
  revalidatePath(`/centros/${p.centerId}`);
  redirect(`/centros/${p.centerId}`);
}
