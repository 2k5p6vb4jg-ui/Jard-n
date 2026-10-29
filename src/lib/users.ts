import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { FormError } from "./forms";
import { cookieOptions, createSessionToken, invalidateAuthCache, isPredictablePin, isValidPin, SESSION_COOKIE, verifyPin } from "./auth";

/** Valida un PIN nuevo: formato, repetición, que no sea obvio y que no lo use ya otra persona (el PIN identifica). */
export async function checkNewPin(fd: FormData, exceptUserId?: string) {
  const pin = String(fd.get("pin") ?? "");
  if (!isValidPin(pin)) throw new FormError("El PIN debe tener entre 4 y 8 cifras.");
  if (pin !== String(fd.get("confirmPin") ?? "")) throw new FormError("Los dos PIN no coinciden.");
  if (isPredictablePin(pin)) throw new FormError("Elija un PIN menos previsible (no 1111 ni 1234).");
  const others = await prisma.user.findMany({ where: exceptUserId ? { id: { not: exceptUserId } } : undefined, select: { pinHash: true } });
  if (others.some((u) => verifyPin(pin, u.pinHash))) throw new FormError("Ese PIN no está disponible. Elija otro.");
  return pin;
}

/** Abre (o renueva) la sesión de este dispositivo para el usuario. */
export async function issueSession(userId: string) {
  invalidateAuthCache();
  let s = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
  if (!s.sessionSecret) s = await prisma.settings.update({ where: { id: 1 }, data: { sessionSecret: crypto.randomBytes(32).toString("base64url") } });
  const u = await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  const { token, maxAge } = createSessionToken({ secret: s.sessionSecret!, version: s.sessionVersion, hours: s.sessionHours }, { id: u.id, version: u.sessionVersion });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(maxAge));
}
