"use server";

import { revalidatePath } from "next/cache";
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
