"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { OrderItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { addDays } from "@/lib/dates";
import { type ActionState, bool, date, FormError, handle, int, num, required, str } from "@/lib/forms";

const refresh = () => revalidatePath("/", "layout");

// ── Marcas ──────────────────────────────────────────────────────────────────

export async function saveSupplier(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const name = required(fd, "name", "Nombre de la marca");
    const clash = await prisma.supplier.findFirst({ where: { name, NOT: id ? { id } : undefined } });
    if (clash) throw new FormError(`Ya existe la marca «${name}».`);
    const email = str(fd, "email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new FormError("El email no es válido.");
    const leadTimeDays = int(fd, "leadTimeDays");
    if (leadTimeDays !== null && (leadTimeDays < 0 || leadTimeDays > 365)) throw new FormError("El plazo debe estar entre 0 y 365 días.");
    const data = {
      name,
      contactName: str(fd, "contactName"),
      phone: str(fd, "phone"),
      email,
      website: str(fd, "website"),
      customerNo: str(fd, "customerNo"),
      leadTimeDays,
      notes: str(fd, "notes"),
      active: id ? bool(fd, "active") : true,
    };
    if (id) await prisma.supplier.update({ where: { id }, data });
    else await prisma.supplier.create({ data });
  });
  if (!res?.error) refresh();
  return res;
}

/** Solo se borran las marcas sin artículos ni pedidos; las demás se desactivan. */
export async function deleteSupplier(id: string) {
  const s = await prisma.supplier.findUnique({ where: { id }, include: { _count: { select: { items: true, orders: true } } } });
  if (!s || s._count.items + s._count.orders > 0) return;
  await prisma.supplier.delete({ where: { id } });
  refresh();
}

// ── Artículos ───────────────────────────────────────────────────────────────

async function itemData(fd: FormData) {
  const quantity = num(fd, "quantity") ?? 1;
  if (quantity <= 0) throw new FormError("La cantidad debe ser mayor que cero.");
  const workOrderId = str(fd, "workOrderId");
  const insoleOrderId = str(fd, "insoleOrderId");
  let patientId = str(fd, "patientId");
  let centerId = str(fd, "centerId");
  // Si va para una reparación o unas plantillas, el cliente/centro se toma de ellas
  if (workOrderId) {
    const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId }, select: { patientId: true, centerId: true } });
    if (!wo) throw new FormError("La reparación ya no existe.");
    patientId ??= wo.patientId;
    centerId ??= wo.centerId;
  }
  if (insoleOrderId) {
    const io = await prisma.insoleOrder.findUnique({ where: { id: insoleOrderId }, select: { patientId: true, centerId: true } });
    if (!io) throw new FormError("Las plantillas ya no existen.");
    patientId ??= io.patientId;
    centerId ??= io.centerId;
  }
  return {
    description: required(fd, "description", "Qué hay que pedir"),
    reference: str(fd, "reference"),
    quantity,
    supplierId: str(fd, "supplierId"),
    neededBy: date(fd, "neededBy"),
    notes: str(fd, "notes"),
    patientId,
    centerId,
    workOrderId,
    insoleOrderId,
  };
}

/** Vuelta segura tras guardar: solo rutas internas de la app. */
const backTo = (fd: FormData) => {
  const v = str(fd, "back");
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/pedidos";
};

export async function saveItem(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const data = await itemData(fd);
    if (id) await prisma.orderItem.update({ where: { id }, data });
    else {
      const item = await prisma.orderItem.create({ data });
      await audit("CREATE", "OrderItem", item.id, item.description);
    }
  });
  if (res?.error) return res;
  refresh();
  redirect(backTo(fd));
}

/** Cambia el estado de un artículo y apunta la fecha correspondiente. */
export async function setItemStatus(id: string, to: OrderItemStatus) {
  const now = new Date();
  const current = await prisma.orderItem.findUnique({ where: { id }, select: { orderedAt: true } });
  // «Deshacer» una recepción vuelve a «pedido» conservando la fecha del pedido
  const dates = {
    ORDERED: { orderedAt: current?.orderedAt ?? now, receivedAt: null, deliveredAt: null },
    RECEIVED: { receivedAt: now, deliveredAt: null },
    DELIVERED: { deliveredAt: now },
  } as Record<string, object>;
  await prisma.orderItem.update({
    where: { id },
    data: { status: to, ...(dates[to] ?? {}), ...(to === "PENDING" && { orderedAt: null, receivedAt: null, deliveredAt: null, purchaseOrderId: null }) },
  });
  await audit("UPDATE", "OrderItem", id, `Estado: ${to}`);
  refresh();
}

export async function deleteItem(id: string) {
  const item = await prisma.orderItem.findUnique({ where: { id } });
  if (!item || item.status !== "PENDING") return;
  await prisma.orderItem.delete({ where: { id } });
  refresh();
}

// ── Pedidos a una marca ─────────────────────────────────────────────────────

async function nextNumber() {
  const prefix = `PED-${new Date().getFullYear()}-`;
  const last = await prisma.purchaseOrder.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } });
  return `${prefix}${String((last ? Number(last.number.slice(prefix.length)) : 0) + 1).padStart(4, "0")}`;
}

/** Marca como pedidos los artículos elegidos de una marca, agrupados en un pedido. */
export async function createPurchaseOrder(supplierId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await handle(async () => {
    const ids = fd.getAll("itemIds").map(String);
    if (ids.length === 0) throw new FormError("Marque al menos un artículo.");
    const supplier = await prisma.supplier.findUniqueOrThrow({ where: { id: supplierId } });
    const items = await prisma.orderItem.findMany({ where: { id: { in: ids }, supplierId, status: "PENDING" }, select: { id: true } });
    if (items.length === 0) throw new FormError("Esos artículos ya no están por pedir.");
    const now = new Date();
    const po = await prisma.purchaseOrder.create({
      data: {
        number: await nextNumber(),
        supplierId,
        via: str(fd, "via"),
        supplierRef: str(fd, "supplierRef"),
        expectedAt: date(fd, "expectedAt") ?? (supplier.leadTimeDays != null ? addDays(now, supplier.leadTimeDays) : null),
        notes: str(fd, "notes"),
        items: { connect: items.map((i) => ({ id: i.id })) },
      },
    });
    await prisma.orderItem.updateMany({ where: { id: { in: items.map((i) => i.id) } }, data: { status: "ORDERED", orderedAt: now } });
    id = po.id;
    await audit("CREATE", "PurchaseOrder", po.id, `${po.number} · ${supplier.name}`);
  });
  if (res?.error) return res;
  refresh();
  redirect(`/pedidos/${id}`);
}

export async function updatePurchaseOrder(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    await prisma.purchaseOrder.update({
      where: { id },
      data: { via: str(fd, "via"), supplierRef: str(fd, "supplierRef"), expectedAt: date(fd, "expectedAt"), notes: str(fd, "notes") },
    });
  });
  if (!res?.error) refresh();
  return res;
}

/** Marca como recibido todo lo que falta del pedido. */
export async function receiveAll(id: string) {
  await prisma.orderItem.updateMany({ where: { purchaseOrderId: id, status: "ORDERED" }, data: { status: "RECEIVED", receivedAt: new Date() } });
  await audit("UPDATE", "PurchaseOrder", id, "Recibido completo");
  refresh();
}
