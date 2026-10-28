"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { readOption } from "@/lib/options";
import { findLegacyOrders } from "@/lib/centers";
import { type ActionState, FormError, handle, int, required, str } from "@/lib/forms";

async function centerData(fd: FormData) {
  const email = str(fd, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new FormError("El email no es válido.");
  const places = int(fd, "places");
  if (places !== null && (places < 0 || places > 5000)) throw new FormError("El número de plazas no es válido.");
  return {
    name: required(fd, "name", "Nombre del centro"),
    typeId: await readOption(fd, "typeId", "CENTER_TYPE", "Tipo de centro", true),
    statusId: await readOption(fd, "statusId", "CENTER_STATUS", "Situación", true),
    taxId: str(fd, "taxId")?.toUpperCase() ?? null,
    phone: str(fd, "phone"),
    email,
    address: str(fd, "address"),
    postalCode: str(fd, "postalCode"),
    city: str(fd, "city"),
    places,
    conditions: str(fd, "conditions"),
    notes: str(fd, "notes"),
  };
}

export async function createCenter(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await handle(async () => {
    const c = await prisma.center.create({ data: await centerData(fd) });
    id = c.id;
    await audit("CREATE", "Center", id, c.name);
  });
  if (res?.error) return res;
  revalidatePath("/centros");
  redirect(`/centros/${id}`);
}

export async function updateCenter(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    await prisma.center.update({ where: { id }, data: await centerData(fd) });
    await audit("UPDATE", "Center", id);
  });
  if (res?.error) return res;
  revalidatePath("/centros");
  revalidatePath(`/centros/${id}`);
  redirect(`/centros/${id}`);
}

/** Borra el centro; sus clientes, pedidos y equipos se conservan, solo pierden el enlace. */
export async function deleteCenter(id: string) {
  const c = await prisma.center.delete({ where: { id } });
  await audit("DELETE", "Center", id, c.name);
  revalidatePath("/", "layout");
  redirect("/centros");
}

export async function addContact(centerId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const email = str(fd, "email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new FormError("El email no es válido.");
    await prisma.centerContact.create({
      data: { centerId, name: required(fd, "name", "Nombre"), role: str(fd, "role"), phone: str(fd, "phone"), email },
    });
  });
  if (!res?.error) revalidatePath(`/centros/${centerId}`);
  return res;
}

export async function deleteContact(centerId: string, contactId: string) {
  await prisma.centerContact.delete({ where: { id: contactId } });
  revalidatePath(`/centros/${centerId}`);
}

export async function linkLegacyOrders(centerId: string) {
  const orders = await findLegacyOrders(centerId);
  if (orders.length) {
    await prisma.workOrder.updateMany({ where: { id: { in: orders.map((o) => o.id) } }, data: { centerId, centerLink: "ORDERED" } });
    await audit("UPDATE", "Center", centerId, `${orders.length} órdenes antiguas vinculadas`);
  }
  revalidatePath(`/centros/${centerId}`);
}
