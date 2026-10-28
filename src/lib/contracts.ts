import "server-only";
import { prisma } from "./prisma";
import { addDays, addMonths } from "./dates";
import type { Tone } from "./labels";

/** Fechas de las revisiones de un contrato: la primera al empezar y luego cada 12/visitsPerYear meses. */
export function visitSchedule(start: Date, visitsPerYear: number, durationMonths: number | null) {
  const perYear = Math.min(12, Math.max(1, Math.round(visitsPerYear)));
  const every = 12 / perYear;
  const months = durationMonths ?? 12;
  const count = Math.max(1, Math.floor((months * perYear) / 12));
  return Array.from({ length: count }, (_, i) => addMonths(start, Math.round(i * every)));
}

export function contractEnd(p: { decidedAt: Date | null; durationMonths: number | null }) {
  return p.decidedAt ? addMonths(p.decidedAt, p.durationMonths ?? 12) : null;
}

export type VisitState = { key: "done" | "in_progress" | "overdue" | "pending"; label: string; tone: Tone };

export function visitState(v: { dueAt: Date; workOrder: { status: string } | null }, now = new Date()): VisitState {
  if (v.workOrder?.status === "DELIVERED") return { key: "done", label: "Hecha", tone: "emerald" };
  if (v.workOrder && v.workOrder.status !== "CANCELLED") return { key: "in_progress", label: "Orden abierta", tone: "sky" };
  const today = new Date(new Date(now).setHours(0, 0, 0, 0));
  return v.dueAt < today ? { key: "overdue", label: "Atrasada", tone: "rose" } : { key: "pending", label: "Pendiente", tone: "slate" };
}

/** Revisiones de contratos sin orden creada que vencen en los próximos `days` días (o ya han vencido). */
export async function getDueVisits(days = 14) {
  return prisma.maintenanceVisit.findMany({
    where: { dueAt: { lte: addDays(new Date(), days) }, OR: [{ workOrderId: null }, { workOrder: { status: "CANCELLED" } }], proposal: { status: "ACCEPTED" } },
    include: { proposal: { select: { id: true, number: true, title: true, centerId: true, center: { select: { name: true } }, _count: { select: { products: true } } } } },
    orderBy: { dueAt: "asc" },
  });
}
