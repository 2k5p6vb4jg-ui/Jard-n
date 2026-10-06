"use server";

import crypto from "node:crypto";
import path from "node:path";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { cookieOptions, createSessionToken, hashPin, invalidateAuthCache, isValidPin, SESSION_COOKIE, verifyPin } from "@/lib/auth";
import { createBackupFile } from "@/lib/backup";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { deleteUpload, saveLogo } from "@/lib/storage";
import { type ActionState, bool, cents, FormError, handle, int, num, required, str } from "@/lib/forms";

const refreshAll = () => revalidatePath("/", "layout");

function inRange(v: number | null, min: number, max: number, label: string): number | undefined {
  if (v === null) return undefined;
  if (v < min || v > max) throw new FormError(`«${label}» debe estar entre ${min} y ${max}.`);
  return v;
}

export async function saveSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const email = str(fd, "email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new FormError("El email no es válido.");
    const data = {
      businessName: required(fd, "businessName", "Nombre comercial"),
      legalName: str(fd, "legalName"),
      taxId: str(fd, "taxId")?.toUpperCase() ?? null,
      healthLicense: str(fd, "healthLicense"),
      address: str(fd, "address"),
      postalCode: str(fd, "postalCode"),
      city: str(fd, "city"),
      province: str(fd, "province"),
      phone: str(fd, "phone"),
      email,
      website: str(fd, "website"),
      defaultHourlyRateCents: inRange(cents(fd, "defaultHourlyRate"), 0, 100_000, "Tarifa por hora"),
      defaultTaxRate: inRange(num(fd, "defaultTaxRate"), 0, 100, "IVA por defecto"),
      quoteValidityDays: inRange(int(fd, "quoteValidityDays"), 1, 365, "Validez de presupuestos"),
      quoteLegalFooter: str(fd, "quoteLegalFooter"),
      insoleRenewalMonths: inRange(int(fd, "insoleRenewalMonths"), 1, 60, "Renovación de plantillas"),
      stockingRenewalMonths: inRange(int(fd, "stockingRenewalMonths"), 1, 60, "Renovación de medias"),
      renewalWarningDays: inRange(int(fd, "renewalWarningDays"), 0, 180, "Días de antelación del aviso"),
    };
    await prisma.settings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
    await audit("UPDATE", "Settings", "1");
  });
  if (!res?.error) refreshAll();
  return res;
}

export async function uploadLogo(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const file = fd.get("logo");
    if (!(file instanceof File) || file.size === 0) throw new FormError("Seleccione una imagen.");
    let logoPath: string;
    try {
      logoPath = await saveLogo(file);
    } catch (e) {
      throw new FormError((e as Error).message);
    }
    const prev = await prisma.settings.findUnique({ where: { id: 1 }, select: { logoPath: true } });
    await prisma.settings.update({ where: { id: 1 }, data: { logoPath } });
    if (prev?.logoPath) await deleteUpload(prev.logoPath);
  });
  if (!res?.error) refreshAll();
  return res;
}

export async function removeLogo() {
  const prev = await prisma.settings.findUnique({ where: { id: 1 }, select: { logoPath: true } });
  await prisma.settings.update({ where: { id: 1 }, data: { logoPath: null } });
  if (prev?.logoPath) await deleteUpload(prev.logoPath);
  refreshAll();
}

/** Alta o edición de un técnico. Los técnicos no se borran (conservan su historial): se desactivan. */
export async function saveTechnician(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const data = {
      name: required(fd, "name", "Nombre del técnico"),
      hourlyRateCents: inRange(cents(fd, "hourlyRate"), 0, 100_000, "Tarifa por hora") ?? null,
      active: id ? bool(fd, "active") : true,
    };
    if (id) await prisma.technician.update({ where: { id }, data });
    else await prisma.technician.create({ data });
  });
  if (!res?.error) revalidatePath("/configuracion");
  return res;
}

// ── Acceso con PIN ──────────────────────────────────────────────────────────

/** Pone o cambia el PIN. Cierra las sesiones de los demás dispositivos y mantiene abierta la de este. */
export async function setPin(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const s = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
    if (s.pinHash && !verifyPin(String(fd.get("currentPin") ?? ""), s.pinHash)) throw new FormError("El PIN actual no es correcto.");
    const pin = String(fd.get("newPin") ?? "");
    if (!isValidPin(pin)) throw new FormError("El PIN debe tener entre 4 y 8 cifras.");
    if (pin !== String(fd.get("confirmPin") ?? "")) throw new FormError("Los dos PIN nuevos no coinciden.");
    if (/^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin)) throw new FormError("Elija un PIN menos previsible (no 1111 ni 1234).");
    const hours = inRange(int(fd, "sessionHours"), 1, 168, "Duración de la sesión") ?? s.sessionHours;

    const updated = await prisma.settings.update({
      where: { id: 1 },
      data: {
        pinHash: hashPin(pin),
        sessionSecret: s.sessionSecret ?? crypto.randomBytes(32).toString("base64url"),
        sessionVersion: { increment: 1 },
        sessionHours: hours,
      },
    });
    invalidateAuthCache();
    const { token, maxAge } = createSessionToken({ secret: updated.sessionSecret!, version: updated.sessionVersion, hours: updated.sessionHours });
    (await cookies()).set(SESSION_COOKIE, token, cookieOptions(maxAge));
    await audit("UPDATE", "Settings", "1", s.pinHash ? "PIN cambiado" : "PIN activado");
  });
  if (!res?.error) revalidatePath("/", "layout");
  return res;
}

export async function removePin(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const s = await prisma.settings.findUniqueOrThrow({ where: { id: 1 } });
    if (!s.pinHash) return;
    if (!verifyPin(String(fd.get("currentPin") ?? ""), s.pinHash)) throw new FormError("El PIN actual no es correcto.");
    await prisma.settings.update({ where: { id: 1 }, data: { pinHash: null, sessionVersion: { increment: 1 } } });
    invalidateAuthCache();
    (await cookies()).delete(SESSION_COOKIE);
    await audit("UPDATE", "Settings", "1", "PIN desactivado");
  });
  if (!res?.error) revalidatePath("/", "layout");
  return res;
}

// ── Copias de seguridad ─────────────────────────────────────────────────────

export async function saveBackupOptions(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    await prisma.settings.update({
      where: { id: 1 },
      data: { autoBackup: bool(fd, "autoBackup"), autoBackupKeep: inRange(int(fd, "autoBackupKeep"), 1, 365, "Copias a conservar") },
    });
  });
  if (!res?.error) revalidatePath("/configuracion");
  return res;
}

export async function backupNow(_prev: ActionState, _fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const { file, size } = await createBackupFile("manual");
    await prisma.backupRecord.create({ data: { fileName: path.basename(file), sizeBytes: size } });
    await audit("BACKUP", "Database", undefined, path.basename(file));
  });
  revalidatePath("/configuracion");
  return res;
}
