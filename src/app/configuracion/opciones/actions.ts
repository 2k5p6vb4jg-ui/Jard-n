"use server";

import { revalidatePath } from "next/cache";
import { OptionKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { type ActionState, bool, FormError, handle, required } from "@/lib/forms";

/** Listas en las que siempre debe quedar al menos una opción activa (el formulario la exige). */
const NEED_ONE_ACTIVE: OptionKind[] = ["TYPE", "STATUS", "EQUIPMENT_CATEGORY", "SERVICE_TYPE", "PART_CATEGORY", "PRIORITY", "CENTER_TYPE", "CENTER_STATUS", "APPOINTMENT_TYPE"];

const usage = { select: { typeOrders: true, materialOrders: true, statusOrders: true, equipmentOrders: true, serviceOrders: true, priorityOrders: true, parts: true, products: true, centerTypes: true, centerStatuses: true, appointments: true } };

/** Alta (id = null) o edición de una opción. Los estados de reparación solo se renombran: su flujo lo fija la app. */
export async function saveOption(id: string | null, kind: OptionKind, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    if (!Object.values(OptionKind).includes(kind)) throw new FormError("Lista no válida.");
    const label = required(fd, "label", "Nombre");
    if (label.length > 60) throw new FormError("El nombre es demasiado largo (máximo 60 caracteres).");
    const clash = await prisma.catalogOption.findFirst({ where: { kind, label, NOT: id ? { id } : undefined } });
    if (clash) throw new FormError(`Ya existe la opción «${label}».`);

    if (kind === "WORK_STATUS") {
      if (!id) throw new FormError("Los estados de reparación no se pueden añadir, solo renombrar.");
      await prisma.catalogOption.update({ where: { id }, data: { label } });
    } else if (id) {
      const active = bool(fd, "active");
      const isFinal = kind === "STATUS" && bool(fd, "isFinal");
      if (!active && NEED_ONE_ACTIVE.includes(kind)) await ensureAnotherActive(kind, id);
      if (kind === "STATUS" && (!active || isFinal)) await ensureAnOpenStatus(id);
      await prisma.catalogOption.update({ where: { id }, data: { label, active, isFinal } });
    } else {
      const last = await prisma.catalogOption.findFirst({ where: { kind }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
      await prisma.catalogOption.create({ data: { kind, label, isFinal: kind === "STATUS" && bool(fd, "isFinal"), sortOrder: (last?.sortOrder ?? 0) + 10 } });
    }
    await audit(id ? "UPDATE" : "CREATE", "CatalogOption", id ?? undefined, `${kind}: ${label}`);
  });
  if (!res?.error) revalidatePath("/", "layout");
  return res;
}

async function ensureAnotherActive(kind: OptionKind, exceptId: string) {
  const others = await prisma.catalogOption.count({ where: { kind, active: true, NOT: { id: exceptId } } });
  if (others === 0) throw new FormError("Debe quedar al menos una opción activa en esta lista.");
}

/** Siempre debe quedar al menos un estado de plantillas activo «en curso» para dar de alta pedidos nuevos. */
async function ensureAnOpenStatus(exceptId: string) {
  const others = await prisma.catalogOption.count({ where: { kind: "STATUS", active: true, isFinal: false, NOT: { id: exceptId } } });
  if (others === 0) throw new FormError("Debe quedar al menos un estado activo que no sea final (por ejemplo «Pendiente de fabricar»).");
}

/** Sube o baja una opción en la lista (intercambia el orden con la vecina). */
export async function moveOption(id: string, direction: "up" | "down") {
  const opt = await prisma.catalogOption.findUnique({ where: { id } });
  if (!opt || opt.kind === "WORK_STATUS") return;
  const list = await prisma.catalogOption.findMany({ where: { kind: opt.kind }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  const i = list.findIndex((o) => o.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await prisma.$transaction(list.map((o, k) => prisma.catalogOption.update({ where: { id: o.id }, data: { sortOrder: (k + 1) * 10 } })));
  revalidatePath("/", "layout");
}

/** Solo se borran las opciones que ningún registro usa; las demás se desactivan. */
export async function deleteOption(id: string) {
  const opt = await prisma.catalogOption.findUnique({ where: { id }, include: { _count: usage } });
  if (!opt || opt.kind === "WORK_STATUS") return;
  if (Object.values(opt._count).some((n) => n > 0)) return;
  if (opt.active && NEED_ONE_ACTIVE.includes(opt.kind)) {
    const others = await prisma.catalogOption.count({ where: { kind: opt.kind, active: true, NOT: { id } } });
    if (others === 0) return;
  }
  if (opt.kind === "STATUS" && opt.active && !opt.isFinal) {
    const open = await prisma.catalogOption.count({ where: { kind: "STATUS", active: true, isFinal: false, NOT: { id } } });
    if (open === 0) return;
  }
  await prisma.catalogOption.delete({ where: { id } });
  await audit("DELETE", "CatalogOption", id, `${opt.kind}: ${opt.label}`);
  revalidatePath("/", "layout");
}
