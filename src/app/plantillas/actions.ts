"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Side } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { readOption } from "@/lib/options";
import { nextInsoleOrderCode } from "@/lib/insoleOrders";
import { type ActionState, bool, cents, date, FormError, handle, num, oneOf, required, str } from "@/lib/forms";

const refresh = (id?: string, patientId?: string) => {
  if (id) revalidatePath(`/plantillas/${id}`);
  if (patientId) revalidatePath(`/pacientes/${patientId}`);
  revalidatePath("/plantillas");
};

async function insoleOrderData(fd: FormData) {
  const patientId = required(fd, "patientId", "Cliente");
  if (!(await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } }))) throw new FormError("El cliente seleccionado ya no existe.");
  const shoeSize = num(fd, "shoeSize");
  if (shoeSize !== null && (shoeSize < 15 || shoeSize > 52)) throw new FormError("El número de pie debe estar entre 15 y 52.");
  const priceCents = cents(fd, "price");
  if (priceCents !== null && priceCents < 0) throw new FormError("El precio no puede ser negativo.");
  return {
    patientId,
    typeId: await readOption(fd, "typeId", "TYPE", "Tipo de plantilla", true),
    side: oneOf(fd, "side", Object.values(Side)) ?? "BOTH",
    shoeSize,
    materialId: await readOption(fd, "materialId", "MATERIAL", "Material", false),
    statusId: await readOption(fd, "statusId", "STATUS", "Estado", true),
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
  const status = await prisma.catalogOption.findUnique({ where: { id: statusId } });
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
