"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { hashPin, invalidateAuthCache, SESSION_COOKIE, verifyPin } from "@/lib/auth";
import { ROLES } from "@/lib/permissions";
import { requireSection } from "@/lib/session";
import { checkNewPin, issueSession } from "@/lib/users";
import { type ActionState, bool, FormError, handle, inRange, int, required } from "@/lib/forms";

const done = () => {
  invalidateAuthCache();
  revalidatePath("/", "layout");
};

/** ¿Quedaría alguien de Administración activo si `id` deja de serlo? */
async function otherActiveAdmins(id: string) {
  return prisma.user.count({ where: { role: "ADMIN", active: true, id: { not: id } } });
}

export async function saveUser(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let loginAs: string | null = null;
  const res = await handle(async () => {
    const me = await requireSection("ajustes");
    const name = required(fd, "name", "Nombre");
    if (await prisma.user.findFirst({ where: { name, NOT: id ? { id } : undefined } })) throw new FormError(`Ya hay un usuario llamado «${name}».`);
    const first = (await prisma.user.count()) === 0;
    const roleIn = String(fd.get("role") ?? "");
    const role: UserRole = first ? "ADMIN" : roleIn in ROLES ? (roleIn as UserRole) : "FRONT_DESK";

    if (!id) {
      const pin = await checkNewPin(fd);
      const u = await prisma.user.create({ data: { name, role, pinHash: hashPin(pin) } });
      await audit("CREATE", "User", u.id, `${name} · ${ROLES[role].label}`);
      // El primer usuario activa el PIN: este dispositivo queda con su sesión abierta
      if (first) loginAs = u.id;
      return;
    }

    const current = await prisma.user.findUniqueOrThrow({ where: { id } });
    const active = bool(fd, "active");
    if (me?.id === id && !active) throw new FormError("No puede desactivar su propio usuario.");
    if (current.role === "ADMIN" && current.active && (role !== "ADMIN" || !active) && (await otherActiveAdmins(id)) === 0) {
      throw new FormError("Tiene que quedar al menos una persona de Administración activa.");
    }
    const newPin = String(fd.get("pin") ?? "");
    const pinData = newPin ? { pinHash: hashPin(await checkNewPin(fd, id)), sessionVersion: { increment: 1 } } : {};
    await prisma.user.update({ where: { id }, data: { name, role, active, ...pinData } });
    await audit("UPDATE", "User", id, [name, ROLES[role].label, active ? null : "desactivado", newPin ? "PIN cambiado" : null].filter(Boolean).join(" · "));
    // Si se cambia el PIN propio, este dispositivo sigue dentro
    if (newPin && me?.id === id) loginAs = id;
  });
  if (res?.error) return res;
  if (loginAs) await issueSession(loginAs);
  done();
  return { ok: true };
}

export async function deleteUser(id: string) {
  const me = await requireSection("ajustes");
  if (me?.id === id) return;
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return;
  if (u.role === "ADMIN" && u.active && (await otherActiveAdmins(id)) === 0) return;
  await prisma.user.delete({ where: { id } });
  await audit("DELETE", "User", id, u.name);
  done();
}

export async function saveSessionHours(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    await requireSection("ajustes");
    const hours = inRange(int(fd, "sessionHours"), 1, 168, "Horas") ?? 12;
    await prisma.settings.update({ where: { id: 1 }, data: { sessionHours: hours } });
  });
  if (!res?.error) done();
  return res;
}

/** Cierra la sesión en todos los dispositivos (salvo este, que se renueva). */
export async function closeAllSessions() {
  const me = await requireSection("ajustes");
  await prisma.settings.update({ where: { id: 1 }, data: { sessionVersion: { increment: 1 } } });
  await audit("UPDATE", "Settings", "1", "Sesiones cerradas en todos los dispositivos");
  if (me) await issueSession(me.id);
  done();
}

/** Quita el acceso con PIN: borra todos los usuarios (el registro de actividad se conserva). */
export async function disableAccess(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const me = await requireSection("ajustes");
    if (!me) return;
    const u = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!verifyPin(String(fd.get("currentPin") ?? ""), u.pinHash)) throw new FormError("Su PIN no es correcto.");
    await audit("UPDATE", "Settings", "1", "Acceso con PIN desactivado (usuarios borrados)");
    await prisma.user.deleteMany();
    (await cookies()).delete(SESSION_COOKIE);
  });
  if (res?.error) return res;
  done();
  redirect("/configuracion/usuarios");
}
