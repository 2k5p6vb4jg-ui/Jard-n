import "server-only";
import type { CenterLink, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { computeWorkOrderTotals } from "./money";
import { FormError, oneOf, str } from "./forms";
import { getInsoleOptions, statusTones } from "./insoleOrders";
import { getStatusLabels } from "./workOrderOptions";
import { normalize } from "./search";
import { type Tone, workOrderStatus } from "./labels";

export async function getCenterOptions() {
  const all = await prisma.catalogOption.findMany({ where: { kind: { in: ["CENTER_TYPE", "CENTER_STATUS"] } }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  return { types: all.filter((o) => o.kind === "CENTER_TYPE"), statuses: all.filter((o) => o.kind === "CENTER_STATUS") };
}

/** Centros para los desplegables (los inactivos al final). */
export async function getCentersForSelect() {
  const centers = await prisma.center.findMany({ select: { id: true, name: true, city: true, status: { select: { key: true } } }, orderBy: { name: "asc" } });
  return centers
    .sort((a, b) => Number(a.status.key === "INACTIVE") - Number(b.status.key === "INACTIVE"))
    .map((c) => ({ id: c.id, label: `${c.name}${c.city ? ` (${c.city})` : ""}` }));
}

/**
 * Lee «Centro» y «Relación con el centro» de un formulario de reparación o plantillas.
 * Si no se indica centro pero el cliente acude a uno, se enlaza como usuario de ese centro.
 */
export async function readCenterLink(fd: FormData, patientId: string | null): Promise<{ centerId: string | null; centerLink: CenterLink | null }> {
  let centerId = str(fd, "centerId");
  let centerLink = oneOf(fd, "centerLink", ["ORDERED", "REFERRED", "RESIDENT"] as const);
  if (centerId && !(await prisma.center.findUnique({ where: { id: centerId }, select: { id: true } }))) throw new FormError("El centro seleccionado ya no existe.");
  if (!centerId && patientId) {
    centerId = (await prisma.patient.findUnique({ where: { id: patientId }, select: { centerId: true } }))?.centerId ?? null;
    if (centerId) centerLink = "RESIDENT";
  }
  if (!centerId) return { centerId: null, centerLink: null };
  return { centerId, centerLink: centerLink ?? (patientId ? "RESIDENT" : "ORDERED") };
}

export type ActivityRow = {
  kind: "repair" | "insole";
  id: string;
  href: string;
  code: string;
  title: string;
  client: string;
  centerId: string | null;
  link: CenterLink | null;
  date: Date;
  totalCents: number;
  /** Cuenta como facturado: reparación entregada o plantillas no anuladas */
  billed: boolean;
  open: boolean;
  status: { label: string; tone: Tone };
};

/**
 * Reparaciones y plantillas en una sola lista, con su importe. Sirve para la ficha del centro
 * (todo su historial) y para las cifras de los últimos 12 meses (lista y estadísticas).
 * El centro de un pedido es el suyo propio o, si no tiene, el del cliente (usuario del centro).
 */
export async function orderActivity(filter: { centerId?: string; since?: Date; onlyCenters?: boolean }): Promise<ActivityRow[]> {
  const byCenter = filter.centerId
    ? { OR: [{ centerId: filter.centerId }, { centerId: null, patient: { centerId: filter.centerId } }] }
    : filter.onlyCenters
      ? { OR: [{ centerId: { not: null } }, { patient: { centerId: { not: null } } }] }
      : {};
  const woWhere: Prisma.WorkOrderWhereInput = { ...byCenter, ...(filter.since && { receivedAt: { gte: filter.since } }) };
  const ioWhere: Prisma.InsoleOrderWhereInput = { ...byCenter, ...(filter.since && { createdAt: { gte: filter.since } }) };

  const [settings, labels, orders, insoles, insoleOpts] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 }, select: { defaultHourlyRateCents: true } }),
    getStatusLabels(),
    prisma.workOrder.findMany({
      where: woWhere,
      include: {
        parts: { select: { quantity: true, unitPriceCents: true } },
        timeEntries: { select: { minutes: true } },
        technician: { select: { hourlyRateCents: true } },
        patient: { select: { firstName: true, lastName: true, centerId: true } },
        equipmentCategory: { select: { label: true } },
      },
    }),
    prisma.insoleOrder.findMany({
      where: ioWhere,
      include: { patient: { select: { firstName: true, lastName: true, centerId: true } }, type: { select: { label: true } }, status: true },
    }),
    getInsoleOptions(),
  ]);
  const tones = statusTones(insoleOpts.statuses);

  const rows: ActivityRow[] = [
    ...orders.map((o): ActivityRow => {
      const t = computeWorkOrderTotals({
        parts: o.parts,
        laborMode: o.laborMode,
        laborRateCents: o.laborRateCents ?? o.technician?.hourlyRateCents ?? settings?.defaultHourlyRateCents ?? 0,
        laborFixedCents: o.laborFixedCents,
        minutesWorked: o.timeEntries.reduce((s, e) => s + (e.minutes ?? 0), 0),
        discountPercent: o.discountPercent,
        taxRate: o.taxRate,
      });
      return {
        kind: "repair",
        id: o.id,
        href: `/taller/${o.id}`,
        code: o.code,
        title: o.equipmentCategory.label + (o.equipmentModel ? ` · ${o.equipmentModel}` : ""),
        client: o.patient ? `${o.patient.firstName} ${o.patient.lastName}` : (o.customerName ?? "—"),
        centerId: o.centerId ?? o.patient?.centerId ?? null,
        link: o.centerLink ?? (o.patient?.centerId ? "RESIDENT" : null),
        date: o.receivedAt,
        totalCents: t.totalCents,
        billed: o.status === "DELIVERED",
        open: o.status !== "DELIVERED" && o.status !== "CANCELLED",
        status: { label: labels[o.status], tone: workOrderStatus[o.status].tone },
      };
    }),
    ...insoles.map((o): ActivityRow => {
      const cancelled = o.status.isFinal && tones[o.statusId] === "slate";
      return {
        kind: "insole",
        id: o.id,
        href: `/plantillas/${o.id}`,
        code: o.code,
        title: `Plantillas ${o.type.label.toLowerCase()}`,
        client: `${o.patient.firstName} ${o.patient.lastName}`,
        centerId: o.centerId ?? o.patient.centerId ?? null,
        link: o.centerLink ?? (o.patient.centerId ? "RESIDENT" : null),
        date: o.createdAt,
        totalCents: o.priceCents ?? 0,
        billed: !cancelled,
        open: !o.status.isFinal,
        status: { label: o.status.label, tone: tones[o.statusId] ?? "slate" },
      };
    }),
  ];
  return rows.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Suma de lo facturado en las filas, separando pedidos directos del centro y lo que llega a través de él. */
export function revenueSplit(rows: ActivityRow[]) {
  const billed = rows.filter((r) => r.billed);
  const direct = billed.filter((r) => r.link === "ORDERED").reduce((s, r) => s + r.totalCents, 0);
  const total = billed.reduce((s, r) => s + r.totalCents, 0);
  return { totalCents: total, directCents: direct, throughCents: total - direct };
}

export const twelveMonthsAgo = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d;
};

/** Órdenes antiguas sin centro cuyo «nombre del cliente» coincide con el del centro (antes se apuntaba a mano). */
export async function findLegacyOrders(centerId: string) {
  const center = await prisma.center.findUnique({ where: { id: centerId }, select: { name: true } });
  if (!center) return [];
  const name = normalize(center.name);
  const candidates = await prisma.workOrder.findMany({
    where: { centerId: null, patientId: null, customerName: { not: null } },
    select: { id: true, code: true, customerName: true },
  });
  return candidates.filter((o) => {
    const n = normalize(o.customerName!);
    return n.length >= 4 && (n.includes(name) || name.includes(n));
  });
}
