"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";
import { BACKUP_DIR, createBackupFile, listBackups, mirrorBackup, testWritableDir, verifyBackup } from "@/lib/backup";
import { DEFAULT_COLORS, isHexColor } from "@/lib/branding.colors";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { requireSection } from "@/lib/session";
import { deleteUpload, saveLogo } from "@/lib/storage";
import { type ActionState, bool, cents, FormError, handle, inRange, int, num, required, str } from "@/lib/forms";

const refreshAll = () => revalidatePath("/", "layout");

function colors(fd: FormData) {
  const pick = (k: string) => {
    const v = str(fd, k);
    if (v && !isHexColor(v)) throw new FormError("Color no válido.");
    return v?.toUpperCase() ?? undefined;
  };
  return { brandColor: pick("brandColor"), accentColor: pick("accentColor"), darkColor: pick("darkColor") };
}


export async function saveSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    await requireSection("ajustes");
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
      ...(bool(fd, "resetColors") ? DEFAULT_COLORS : colors(fd)),
    };
    await prisma.settings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
    await audit("UPDATE", "Settings", "1");
  });
  if (!res?.error) refreshAll();
  return res;
}

export async function uploadLogo(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    await requireSection("ajustes");
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
  await requireSection("ajustes");
  const prev = await prisma.settings.findUnique({ where: { id: 1 }, select: { logoPath: true } });
  await prisma.settings.update({ where: { id: 1 }, data: { logoPath: null } });
  if (prev?.logoPath) await deleteUpload(prev.logoPath);
  refreshAll();
}

/** Alta o edición de un técnico. Los técnicos no se borran (conservan su historial): se desactivan. */
export async function saveTechnician(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    await requireSection("ajustes");
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

// ── Copias de seguridad ─────────────────────────────────────────────────────

export async function saveBackupOptions(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    await requireSection("ajustes");
    const mirror = str(fd, "backupMirrorDir");
    if (mirror) {
      if (!path.isAbsolute(mirror)) throw new FormError("Escriba la ruta completa de la carpeta, por ejemplo E:\\CopiasJardon o \\\\NAS\\copias.");
      try {
        await testWritableDir(mirror);
      } catch (e) {
        throw new FormError(`No se puede escribir en «${mirror}»: ${(e as Error).message}. ¿Está conectado el disco?`);
      }
    }
    const before = await prisma.settings.findUnique({ where: { id: 1 }, select: { backupMirrorDir: true } });
    await prisma.settings.update({
      where: { id: 1 },
      data: { autoBackup: bool(fd, "autoBackup"), autoBackupKeep: inRange(int(fd, "autoBackupKeep"), 1, 365, "Copias a conservar"), backupMirrorDir: mirror, ...(!mirror && { lastMirrorError: null }) },
    });
    // Al indicar una carpeta nueva se lleva allí enseguida la copia más reciente
    if (mirror && mirror !== before?.backupMirrorDir) {
      const latest = (await listBackups())[0];
      if (latest) await mirrorBackup(path.join(BACKUP_DIR, latest.name));
    }
  });
  if (!res?.error) revalidatePath("/configuracion");
  return res;
}

export async function backupNow(_prev: ActionState, _fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    await requireSection("ajustes");
    const { file, size } = await createBackupFile("manual");
    await prisma.backupRecord.create({ data: { fileName: path.basename(file), sizeBytes: size } });
    await audit("BACKUP", "Database", undefined, path.basename(file));
  });
  revalidatePath("/configuracion");
  return res;
}

/** Comprueba la copia más reciente sin restaurarla. */
export async function verifyLatestBackup(_prev: { ok?: boolean; message?: string } | undefined, _fd: FormData): Promise<{ ok: boolean; message: string }> {
  await requireSection("ajustes");
  const latest = (await listBackups())[0];
  if (!latest) return { ok: false, message: "Todavía no hay ninguna copia guardada en el equipo." };
  try {
    const r = await verifyBackup(path.join(BACKUP_DIR, latest.name));
    await audit("VIEW", "Backup", undefined, `Comprobada ${latest.name}`);
    return {
      ok: true,
      message: `Copia correcta (${new Date(r.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}): ${r.patients} clientes, ${r.workOrders} reparaciones y ${r.files} archivos. Se podría restaurar sin problemas.`,
    };
  } catch (e) {
    return { ok: false, message: `La copia ${latest.name} no es válida: ${(e as Error).message}` };
  }
}
