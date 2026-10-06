import "server-only";
import { prisma } from "./prisma";
import { computeWorkOrderTotals } from "./money";

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export interface MonthStat {
  key: string; // 2026-10
  label: string; // oct
  longLabel: string; // octubre 2026
  workshopCents: number;
  insoleCents: number;
  stockingCents: number;
  ordersDelivered: number;
  insolesDelivered: number;
  stockingsDelivered: number;
  quotesIssued: number;
  quotesAccepted: number;
  newPatients: number;
}

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

/**
 * Cifras orientativas de los últimos `months` meses (incluido el actual), calculadas con
 * los importes registrados en la app. No sustituyen a la contabilidad.
 */
export async function getStats(months = 12) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [settings, orders, insoles, stockings, quotes, patients, byCategory, active] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 }, select: { defaultHourlyRateCents: true } }),
    prisma.workOrder.findMany({
      where: { status: "DELIVERED", deliveredAt: { gte: from } },
      include: { parts: true, timeEntries: { select: { minutes: true } }, technician: { select: { hourlyRateCents: true } } },
    }),
    prisma.insolePrescription.findMany({ where: { status: "DELIVERED", deliveredAt: { gte: from } }, select: { deliveredAt: true, priceCents: true } }),
    prisma.compressionStocking.findMany({ where: { status: "DELIVERED", deliveredAt: { gte: from } }, select: { deliveredAt: true, priceCents: true } }),
    prisma.quote.findMany({ where: { issuedAt: { gte: from } }, select: { issuedAt: true, status: true } }),
    prisma.patient.findMany({ where: { createdAt: { gte: from } }, select: { createdAt: true } }),
    prisma.workOrder.groupBy({ by: ["equipmentCategory"], where: { receivedAt: { gte: from } }, _count: { _all: true } }),
    prisma.workOrder.count({ where: { status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
  ]);

  const series: MonthStat[] = Array.from({ length: months }, (_, i) => {
    const d = new Date(from.getFullYear(), from.getMonth() + i, 1);
    return {
      key: monthKey(d),
      label: MONTHS[d.getMonth()],
      longLabel: `${new Intl.DateTimeFormat("es-ES", { month: "long" }).format(d)} ${d.getFullYear()}`,
      workshopCents: 0, insoleCents: 0, stockingCents: 0,
      ordersDelivered: 0, insolesDelivered: 0, stockingsDelivered: 0,
      quotesIssued: 0, quotesAccepted: 0, newPatients: 0,
    };
  });
  const at = (d: Date | null) => (d ? series.find((m) => m.key === monthKey(d)) : undefined);

  let turnaroundDays = 0;
  for (const o of orders) {
    const m = at(o.deliveredAt);
    if (!m) continue;
    const t = computeWorkOrderTotals({
      parts: o.parts,
      laborMode: o.laborMode,
      laborRateCents: o.laborRateCents ?? o.technician?.hourlyRateCents ?? settings?.defaultHourlyRateCents ?? 0,
      laborFixedCents: o.laborFixedCents,
      minutesWorked: o.timeEntries.reduce((s, e) => s + (e.minutes ?? 0), 0),
      discountPercent: o.discountPercent,
      taxRate: o.taxRate,
    });
    m.workshopCents += t.totalCents;
    m.ordersDelivered++;
    turnaroundDays += (o.deliveredAt!.getTime() - o.receivedAt.getTime()) / 86_400_000;
  }
  for (const i of insoles) {
    const m = at(i.deliveredAt);
    if (m) { m.insoleCents += i.priceCents ?? 0; m.insolesDelivered++; }
  }
  for (const s of stockings) {
    const m = at(s.deliveredAt);
    if (m) { m.stockingCents += s.priceCents ?? 0; m.stockingsDelivered++; }
  }
  for (const q of quotes) {
    const m = at(q.issuedAt);
    if (m) { m.quotesIssued++; if (q.status === "ACCEPTED") m.quotesAccepted++; }
  }
  for (const p of patients) {
    const m = at(p.createdAt);
    if (m) m.newPatients++;
  }

  const sum = (f: (m: MonthStat) => number) => series.reduce((s, m) => s + f(m), 0);
  const quotesIssued = sum((m) => m.quotesIssued);
  return {
    from,
    series,
    current: series[series.length - 1],
    previous: series[series.length - 2],
    totals: {
      revenueCents: sum((m) => m.workshopCents + m.insoleCents + m.stockingCents),
      ordersDelivered: sum((m) => m.ordersDelivered),
      quoteAcceptance: quotesIssued ? sum((m) => m.quotesAccepted) / quotesIssued : null,
      avgTurnaroundDays: orders.length ? turnaroundDays / orders.length : null,
      newPatients: sum((m) => m.newPatients),
      activeOrders: active,
    },
    byCategory: byCategory.map((c) => ({ category: c.equipmentCategory, count: c._count._all })).sort((a, b) => b.count - a.count),
  };
}
