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

/** Equipos del centro y de sus usuarios, para elegir los incluidos en una propuesta. */
export async function centerProductsForSelect(centerId: string) {
  const products = await prisma.trackedProduct.findMany({
    where: { OR: [{ centerId }, { patient: { centerId } }] },
    include: { category: { select: { label: true } }, patient: { select: { firstName: true, lastName: true } } },
    orderBy: [{ categoryId: "asc" }, { serialNumber: "asc" }],
  });
  return products.map((p) => ({
    id: p.id,
    label: `${p.category.label} · ${p.brand} ${p.model}`,
    detail: `S/N ${p.serialNumber} · ${p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : "del centro"}`,
  }));
}

export type Opportunity = { id: string; tone: "gold" | "rose" | "teal"; title: string; text: string; cta?: { label: string; href: string }; links?: { label: string; href: string }[] };

/**
 * Oportunidades de venta de un centro, calculadas con datos que la app ya tiene: reparaciones sueltas,
 * equipos sin revisar o sin garantía, equipos antiguos, renovaciones de sus usuarios y propuestas sin respuesta.
 */
export async function centerOpportunities(centerId: string, activity: ActivityRow[]): Promise<Opportunity[]> {
  const { getRenewalAlerts } = await import("./renewals");
  const [center, products, alerts] = await Promise.all([
    prisma.center.findUnique({
      where: { id: centerId },
      include: { status: true, contacts: { take: 1, orderBy: { createdAt: "asc" } }, proposals: { select: { id: true, number: true, title: true, status: true, issuedAt: true, kind: true, decidedAt: true, durationMonths: true, products: { select: { id: true } } } }, patients: { select: { id: true } } },
    }),
    prisma.trackedProduct.findMany({
      where: { OR: [{ centerId }, { patient: { centerId } }] },
      select: { id: true, deliveredAt: true, warrantyUntil: true, createdAt: true, interventions: { orderBy: { date: "desc" }, take: 1, select: { date: true } } },
    }),
    getRenewalAlerts(),
  ]);
  if (!center) return [];
  const now = new Date();
  const yearAgo = twelveMonthsAgo();
  const days = (n: number) => new Date(now.getTime() + n * 86_400_000);
  const base = `/centros/${centerId}/propuestas/nueva`;
  const proposalHref = (tipo: string, ids: string[], titulo: string) => `${base}?tipo=${tipo}&equipos=${ids.join(",")}&titulo=${encodeURIComponent(titulo)}`;
  const out: Opportunity[] = [];
  // Contrato de mantenimiento en vigor o propuesta pendiente: no se vuelve a sugerir
  const hasOpenMaintenance = center.proposals.some((p) => {
    if (p.kind !== "MAINTENANCE") return false;
    if (p.status === "SENT" || p.status === "DRAFT") return true;
    if (p.status !== "ACCEPTED" || !p.decidedAt) return false;
    const end = new Date(p.decidedAt);
    end.setMonth(end.getMonth() + (p.durationMonths ?? 12));
    return end > now;
  });
  const allIds = products.map((p) => p.id);

  const repairs = activity.filter((r) => r.kind === "repair" && r.billed && r.date >= yearAgo);
  if (repairs.length >= 2 && !hasOpenMaintenance) {
    const total = repairs.reduce((s, r) => s + r.totalCents, 0);
    out.push({
      id: "repairs",
      tone: "gold",
      title: `${repairs.length} reparaciones sueltas en 12 meses`,
      text: `Han supuesto ${new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(total / 100)}. Un contrato de mantenimiento les da un coste fijo y a nosotros ingresos recurrentes.`,
      cta: { label: "Preparar contrato de mantenimiento", href: proposalHref("MAINTENANCE", allIds, "Contrato de mantenimiento de equipos") },
    });
  }

  const unchecked = products.filter((p) => {
    const last = p.interventions[0]?.date ?? p.deliveredAt ?? p.createdAt;
    return last < yearAgo;
  });
  if (unchecked.length && !hasOpenMaintenance) {
    out.push({
      id: "unchecked",
      tone: "gold",
      title: `${unchecked.length} ${unchecked.length === 1 ? "equipo" : "equipos"} sin revisión en el último año`,
      text: "Una revisión preventiva evita averías y es una buena forma de entrar con un contrato.",
      cta: { label: "Proponer revisión", href: proposalHref("MAINTENANCE", unchecked.map((p) => p.id), "Revisión preventiva de equipos") },
    });
  }

  const warranty = products.filter((p) => p.warrantyUntil && p.warrantyUntil > days(-180) && p.warrantyUntil < days(60));
  if (warranty.length) {
    out.push({
      id: "warranty",
      tone: "rose",
      title: `${warranty.length} ${warranty.length === 1 ? "equipo con la garantía vencida o a punto" : "equipos con la garantía vencida o a punto"} de vencer`,
      text: "Cuando acaba la garantía, las reparaciones las paga el centro: buen momento para ofrecer mantenimiento.",
      cta: { label: "Ofrecer mantenimiento", href: proposalHref("MAINTENANCE", warranty.map((p) => p.id), "Mantenimiento tras la garantía") },
    });
  }

  const old = products.filter((p) => (p.deliveredAt ?? p.createdAt) < days(-5 * 365));
  if (old.length) {
    out.push({
      id: "old",
      tone: "teal",
      title: `${old.length} ${old.length === 1 ? "equipo" : "equipos"} con más de 5 años`,
      text: "Candidatos a renovación: un pack con precio cerrado facilita la decisión.",
      cta: { label: "Proponer pack de renovación", href: proposalHref("SALE_PACK", old.map((p) => p.id), "Renovación de equipos") },
    });
  }

  const ids = new Set(center.patients.map((p) => p.id));
  const renewals = alerts.filter((a) => ids.has(a.patientId));
  if (renewals.length) {
    out.push({
      id: "renewals",
      tone: "teal",
      title: `${renewals.length} ${renewals.length === 1 ? "usuario del centro" : "usuarios del centro"} con plantillas o medias por renovar`,
      text: "Avise al centro o a las familias: se pueden organizar las tomas de medidas en una sola visita.",
      links: renewals.slice(0, 5).map((a) => ({ label: a.patientName, href: `/pacientes/${a.patientId}` })),
    });
  }

  for (const p of center.proposals.filter((x) => x.kind === "MAINTENANCE" && x.status === "ACCEPTED" && x.decidedAt)) {
    const end = new Date(p.decidedAt!);
    end.setMonth(end.getMonth() + (p.durationMonths ?? 12));
    if (end > days(-30) && end < days(60)) {
      out.push({
        id: `renew-${p.id}`,
        tone: "rose",
        title: `El contrato ${p.number} ${end < now ? "terminó" : "termina"} el ${new Intl.DateTimeFormat("es-ES").format(end)}`,
        text: "Prepare la renovación con los mismos equipos antes de que acabe.",
        cta: { label: "Proponer renovación", href: proposalHref("MAINTENANCE", p.products.map((x) => x.id), `Renovación: ${p.title}`) },
      });
    }
  }

  const waiting = center.proposals.filter((p) => p.status === "SENT" && p.issuedAt < days(-14));
  for (const p of waiting) {
    const n = Math.round((now.getTime() - p.issuedAt.getTime()) / 86_400_000);
    out.push({
      id: `waiting-${p.id}`,
      tone: "rose",
      title: `La propuesta ${p.number} lleva ${n} días sin respuesta`,
      text: center.contacts[0] ? `Llame a ${center.contacts[0].name}${center.contacts[0].phone ? ` (${center.contacts[0].phone})` : ""} para hacer seguimiento.` : "Haga una llamada de seguimiento.",
      cta: { label: "Ver propuesta", href: `/centros/${centerId}/propuestas/${p.id}` },
    });
  }

  if (center.proposals.length === 0 && center.status.key !== "INACTIVE") {
    out.push({
      id: "first",
      tone: "gold",
      title: "Todavía no le hemos hecho ninguna propuesta",
      text: center.places ? `Con ${center.places} plazas, un pack de equipos o un contrato de revisiones puede ser un buen primer paso.` : "Un pack de equipos o un contrato de revisiones puede ser un buen primer paso.",
      cta: { label: "Nueva propuesta", href: base },
    });
  }
  return out;
}
