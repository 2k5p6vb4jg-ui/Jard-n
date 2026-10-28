import "server-only";
import type { OrderItemStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { Tone } from "./labels";

/** Datos de «para quién» que se cargan con cada artículo. */
export const recipientInclude = {
  supplier: { select: { id: true, name: true } },
  patient: { select: { id: true, firstName: true, lastName: true } },
  center: { select: { id: true, name: true } },
  workOrder: { select: { id: true, code: true } },
  insoleOrder: { select: { id: true, code: true } },
  purchaseOrder: { select: { id: true, number: true, expectedAt: true } },
} satisfies Prisma.OrderItemInclude;

export type ItemWithRecipient = Prisma.OrderItemGetPayload<{ include: typeof recipientInclude }>;

/** «Para quién»: el cliente o centro y, si lo hay, el pedido de la app al que va (reparación o plantillas). */
export function recipient(i: ItemWithRecipient) {
  const who = i.patient ? `${i.patient.firstName} ${i.patient.lastName}` : (i.center?.name ?? null);
  const ref = i.workOrder ? { label: i.workOrder.code, href: `/taller/${i.workOrder.id}` } : i.insoleOrder ? { label: i.insoleOrder.code, href: `/plantillas/${i.insoleOrder.id}` } : null;
  const href = i.patient ? `/pacientes/${i.patient.id}` : i.center ? `/centros/${i.center.id}` : null;
  return { who: who ?? "Stock de la tienda", href, ref, isStock: !who && !ref };
}

/** Estado de un pedido a una marca según sus artículos. */
export function purchaseOrderState(items: { status: OrderItemStatus }[]): { label: string; tone: Tone; open: boolean } {
  const live = items.filter((i) => i.status !== "CANCELLED");
  if (live.length === 0) return { label: "Anulado", tone: "slate", open: false };
  const arrived = live.filter((i) => i.status === "RECEIVED" || i.status === "DELIVERED").length;
  if (arrived === live.length) return { label: "Recibido", tone: "emerald", open: false };
  if (arrived > 0) return { label: `Recibido ${arrived} de ${live.length}`, tone: "amber", open: true };
  return { label: "En camino", tone: "sky", open: true };
}

export const qty = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

/** Texto del pedido para pegar en un email o WhatsApp a la marca. */
export function orderText(o: { number: string; supplierRef?: string | null; supplier: { name: string; customerNo: string | null } }, items: ItemWithRecipient[], business: string) {
  return [
    `Pedido ${o.number} · ${business}${o.supplier.customerNo ? ` (cliente nº ${o.supplier.customerNo})` : ""}`,
    "",
    ...items.filter((i) => i.status !== "CANCELLED").map((i) => `- ${qty(i.quantity)} × ${i.description}${i.reference ? ` (ref. ${i.reference})` : ""}`),
    "",
    "Gracias.",
  ].join("\n");
}

/** Recuentos para el Panel. */
export async function orderCounts() {
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  const [pending, ordered, late, toDeliver] = await Promise.all([
    prisma.orderItem.count({ where: { status: "PENDING" } }),
    prisma.orderItem.count({ where: { status: "ORDERED" } }),
    prisma.orderItem.count({ where: { status: "ORDERED", purchaseOrder: { expectedAt: { lt: today } } } }),
    prisma.orderItem.count({ where: { status: "RECEIVED", OR: [{ patientId: { not: null } }, { centerId: { not: null } }, { workOrderId: { not: null } }, { insoleOrderId: { not: null } }] } }),
  ]);
  return { pending, ordered, late, toDeliver };
}

export async function getItemFormOptions() {
  const { getCentersForSelect } = await import("./centers");
  const [suppliers, patients, centers] = await Promise.all([
    prisma.supplier.findMany({ select: { id: true, name: true, active: true }, orderBy: { name: "asc" } }),
    prisma.patient.findMany({ where: { archivedAt: null }, select: { id: true, firstName: true, lastName: true, dni: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    getCentersForSelect(),
  ]);
  return { suppliers, patients, centers };
}

/** Selección para <LinkedItems> */
export const linkedItemsSelect = {
  where: { status: { not: "CANCELLED" } },
  select: { id: true, description: true, quantity: true, status: true, neededBy: true, supplier: { select: { name: true } }, purchaseOrder: { select: { id: true, expectedAt: true } } },
  orderBy: { createdAt: "desc" },
} satisfies Prisma.WorkOrder$orderItemsArgs;
