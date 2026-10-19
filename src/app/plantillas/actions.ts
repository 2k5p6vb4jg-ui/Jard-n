"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { type InsoleOptionKind, Side } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { nextInsoleOrderCode } from "@/lib/insoleOrders";
import { type ActionState, bool, cents, date, FormError, handle, num, oneOf, required, str } from "@/lib/forms";

const refresh = (id?: string, patientId?: string) => {
  if (id) revalidatePath(`/plantillas/${id}`);
  if (patientId) revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/plantillas");
};

async function option(fd: FormData, key: string, kind: InsoleOptionKind, label: string, isRequired: boolean) {
  const id = isRequired ? required(fd, key, label) : str(fd, key);
  if (!id) return null;
  const opt = await prisma.insoleOrderOption.findUnique({ where: { id } });
  if (!opt || opt.kind !== kind) throw new FormError(`Opción no válida en «${label}».`);
  return opt.id;
}

async function insoleOrderData(fd: FormData) {
  const patientId = required(fd, "patientId", "Cliente");
  if (!(await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } }))) throw new FormError("El cliente seleccionado ya no existe.");
  const shoeSize = num(fd, "shoeSize");
  if (shoeSize !== null && (shoeSize < 15 || shoeSize > 52)) throw new FormError("El número de pie debe estar entre 15 y 52.");
  const priceCents = cents(fd, "price");
  if (priceCents !== null && priceCents < 0) throw new FormError("El precio no puede ser negativo.");
  return {
    patientId,
    typeId: (await option(fd, "typeId", "TYPE", "Tipo de plantilla", true))!,
    side: oneOf(fd, "side", Object.values(Side)) ?? "BOTH",
    shoeSize,
    materialId: await option(fd, "materialId", "MATERIAL", "Material", false),
    statusId: (await option(fd, "statusId", "STATUS", "Estado", true))!,
    measuredAt: date(fd, "measuredAt"),
    dueAt: date(fd, "dueAt"),
    priceCents,
    paid: bool(fd, "paid"),
    notes: str(fd, "notes"),
  };
}

export async function createInsoleOrder(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  let patientId = "";
  const res = await handle(async () => {
    const data = await insoleOrderData(fd);
    const saved = await prisma.insoleOrder.create({ data: { ...data, code: await nextInsoleOrderCode() } });
    ({ id, patientId } = saved);
    await audit("CREATE", "InsoleOrder", id, saved.code);
  });
  if (res?.error) return res;
  refresh(id, patientId);
  redirect(`/plantillas/${id}`);
}

export async function updateInsoleOrder(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let patientId = "";
  const res = await handle(async () => {
    const data = await insoleOrderData(fd);
    const before = await prisma.insoleOrder.findUnique({ where: { id }, select: { patientId: true } });
    await prisma.insoleOrder.update({ where: { id }, data });
    if (before && before.patientId !== data.patientId) revalidatePath(`/pacientes/${before.patientId}`);
    patientId = data.patientId;
    await audit("UPDATE", "InsoleOrder", id);
  });
  if (res?.error) return res;
  refresh(id, patientId);
  redirect(`/plantillas/${id}`);
}

/** Cambio rápido de estado desde la ficha del pedido. */
export async function setInsoleOrderStatus(id: string, statusId: string) {
  const status = await prisma.insoleOrderOption.findUnique({ where: { id: statusId } });
  if (!status || status.kind !== "STATUS") return;
  const order = await prisma.insoleOrder.update({ where: { id }, data: { statusId } });
  await audit("UPDATE", "InsoleOrder", id, `Estado: ${status.label}`);
  refresh(id, order.patientId);
}

export async function togglePaid(id: string) {
  const current = await prisma.insoleOrder.findUnique({ where: { id }, select: { paid: true } });
  if (!current) return;
  const order = await prisma.insoleOrder.update({ where: { id }, data: { paid: !current.paid } });
  await audit("UPDATE", "InsoleOrder", id, order.paid ? "Marcada como pagada" : "Marcada como no pagada");
  refresh(id, order.patientId);
}

export async function deleteInsoleOrder(id: string) {
  const order = await prisma.insoleOrder.delete({ where: { id } });
  await audit("DELETE", "InsoleOrder", id, order.code);
  refresh(undefined, order.patientId);
  redirect("/plantillas");
}

// ── Opciones (Ajustes → Opciones de plantillas) ─────────────────────────────

const KINDS = ["TYPE", "MATERIAL", "STATUS"] as const;

/** Alta (id = null) o edición de una opción. */
export async function saveInsoleOption(id: string | null, kind: InsoleOptionKind, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    if (!KINDS.includes(kind)) throw new FormError("Tipo de opción no válido.");
    const label = required(fd, "label", "Nombre");
    if (label.length > 60) throw new FormError("El nombre es demasiado largo (máximo 60 caracteres).");
    const clash = await prisma.insoleOrderOption.findFirst({ where: { kind, label, NOT: id ? { id } : undefined } });
    if (clash) throw new FormError(`Ya existe la opción «${label}».`);
    const isFinal = kind === "STATUS" && bool(fd, "isFinal");

    if (id) {
      const active = bool(fd, "active");
      if (kind === "STATUS" && (!active || isFinal)) await ensureAnOpenStatus(id);
      await prisma.insoleOrderOption.update({ where: { id }, data: { label, active, isFinal } });
    } else {
      const last = await prisma.insoleOrderOption.findFirst({ where: { kind }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
      await prisma.insoleOrderOption.create({ data: { kind, label, isFinal, sortOrder: (last?.sortOrder ?? 0) + 10 } });
    }
  });
  if (!res?.error) revalidatePath("/", "layout");
  return res;
}

/** Siempre debe quedar al menos un estado activo «en curso» para dar de alta pedidos nuevos. */
async function ensureAnOpenStatus(exceptId: string) {
  const others = await prisma.insoleOrderOption.count({ where: { kind: "STATUS", active: true, isFinal: false, NOT: { id: exceptId } } });
  if (others === 0) throw new FormError("Debe quedar al menos un estado activo que no sea final (por ejemplo «Pendiente de fabricar»).");
}

/** Sube o baja una opción en la lista (intercambia el orden con la vecina). */
export async function moveInsoleOption(id: string, direction: "up" | "down") {
  const opt = await prisma.insoleOrderOption.findUnique({ where: { id } });
  if (!opt) return;
  const list = await prisma.insoleOrderOption.findMany({ where: { kind: opt.kind }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  const i = list.findIndex((o) => o.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await prisma.$transaction(list.map((o, k) => prisma.insoleOrderOption.update({ where: { id: o.id }, data: { sortOrder: (k + 1) * 10 } })));
  revalidatePath("/", "layout");
}

/** Solo se borran las opciones que ningún pedido usa; las demás se desactivan. */
export async function deleteInsoleOption(id: string) {
  const opt = await prisma.insoleOrderOption.findUnique({
    where: { id },
    include: { _count: { select: { typeOrders: true, materialOrders: true, statusOrders: true } } },
  });
  if (!opt) return;
  const used = opt._count.typeOrders + opt._count.materialOrders + opt._count.statusOrders;
  if (used > 0) return;
  if (opt.kind === "STATUS" && opt.active && !opt.isFinal) {
    const others = await prisma.insoleOrderOption.count({ where: { kind: "STATUS", active: true, isFinal: false, NOT: { id } } });
    if (others === 0) return;
  }
  await prisma.insoleOrderOption.delete({ where: { id } });
  revalidatePath("/", "layout");
}
