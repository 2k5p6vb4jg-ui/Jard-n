"use server";

import { revalidatePath } from "next/cache";
import { QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays } from "@/lib/dates";
import { buildQuoteSnapshot } from "@/lib/quotes";
import { type ActionState, FormError, handle, int, num, str } from "@/lib/forms";

async function nextQuoteNumber() {
  const prefix = `PRES-${new Date().getFullYear()}-`;
  const last = await prisma.quote.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } });
  return `${prefix}${String(last ? Number(last.number.slice(prefix.length)) + 1 : 1).padStart(4, "0")}`;
}

/**
 * Genera un presupuesto con una instantánea de las piezas y la mano de obra actuales.
 * Si la orden aún estaba en Entrada/Diagnóstico pasa a «Presupuestado».
 */
export async function createQuote(workOrderId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const [order, settings] = await Promise.all([
      prisma.workOrder.findUnique({ where: { id: workOrderId }, include: { parts: { orderBy: { createdAt: "asc" } }, timeEntries: true, technician: true } }),
      prisma.settings.findUnique({ where: { id: 1 } }),
    ]);
    if (!order) throw new FormError("La orden no existe.");
    if (order.status === "DELIVERED" || order.status === "CANCELLED") throw new FormError("No se puede presupuestar una orden entregada o anulada.");

    const estimatedHours = num(fd, "estimatedHours");
    if (estimatedHours !== null && (estimatedHours < 0 || estimatedHours > 500)) throw new FormError("Horas estimadas no válidas.");
    const registered = order.timeEntries.reduce((s, t) => s + (t.minutes ?? 0), 0);
    const laborMinutes = estimatedHours !== null ? Math.round(estimatedHours * 60) : registered;

    const snapshot = buildQuoteSnapshot({
      parts: order.parts,
      laborMode: order.laborMode,
      laborRateCents: order.laborRateCents ?? order.technician?.hourlyRateCents ?? settings?.defaultHourlyRateCents ?? 0,
      laborFixedCents: order.laborFixedCents,
      laborMinutes,
      discountPercent: order.discountPercent,
      taxRate: order.taxRate,
    });
    if (snapshot.lines.length === 0) throw new FormError("Añada piezas o indique horas de mano de obra antes de presupuestar.");

    const validityDays = int(fd, "validityDays") ?? settings?.quoteValidityDays ?? 30;
    if (validityDays < 1 || validityDays > 365) throw new FormError("La validez debe estar entre 1 y 365 días.");
    const issuedAt = new Date();

    await prisma.$transaction(async (tx) => {
      const { lines, discountPercent: _d, ...totals } = snapshot;
      await tx.quote.create({
        data: {
          number: await nextQuoteNumber(),
          workOrderId,
          issuedAt,
          validUntil: addDays(issuedAt, validityDays),
          ...totals,
          notes: str(fd, "notes"),
          linesJson: JSON.stringify({ lines }),
        },
      });
      if (order.status === "RECEIVED" || order.status === "DIAGNOSIS") {
        await tx.workOrder.update({ where: { id: workOrderId }, data: { status: "QUOTED" } });
        await tx.workOrderStatusChange.create({ data: { workOrderId, fromStatus: order.status, toStatus: "QUOTED", note: "Presupuesto generado" } });
      }
    });
  });
  if (!res?.error) {
    revalidatePath(`/taller/${workOrderId}`);
    revalidatePath("/taller");
  }
  return res;
}

/** Enviado / aceptado / rechazado. Aceptar un presupuesto pone la orden «En reparación». */
export async function setQuoteStatus(workOrderId: string, quoteId: string, status: QuoteStatus) {
  if (!Object.values(QuoteStatus).includes(status)) return;
  await prisma.$transaction(async (tx) => {
    const quote = await tx.quote.findFirst({ where: { id: quoteId, workOrderId }, include: { workOrder: { select: { status: true } } } });
    if (!quote) return;
    // Solo puede haber un presupuesto aceptado por orden
    if (status === "ACCEPTED" && (await tx.quote.count({ where: { workOrderId, status: "ACCEPTED", id: { not: quoteId } } })) > 0) return;
    await tx.quote.update({ where: { id: quoteId }, data: { status, acceptedAt: status === "ACCEPTED" ? new Date() : null } });
    if (status === "ACCEPTED" && quote.workOrder.status === "QUOTED") {
      await tx.workOrder.update({ where: { id: workOrderId }, data: { status: "IN_REPAIR" } });
      await tx.workOrderStatusChange.create({ data: { workOrderId, fromStatus: "QUOTED", toStatus: "IN_REPAIR", note: `Presupuesto ${quote.number} aceptado` } });
    }
    if (status === "REJECTED") {
      await tx.workOrderStatusChange.create({ data: { workOrderId, fromStatus: quote.workOrder.status, toStatus: quote.workOrder.status, note: `Presupuesto ${quote.number} rechazado` } });
    }
  });
  revalidatePath(`/taller/${workOrderId}`);
}
