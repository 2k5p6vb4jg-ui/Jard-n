"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { normalizeDni } from "@/lib/forms";
import { normalize } from "@/lib/search";
import type { ImportRow } from "@/lib/csv";

const digits = (s?: string | null) => (s ?? "").replace(/\D/g, "").slice(-9);

/** dd/mm/aaaa, d/m/aa, aaaa-mm-dd → fecha (mediodía local) */
function parseDate(v?: string): Date | null {
  if (!v) return null;
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(v);
  let y: number, mo: number, d: number;
  if (m) [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v))) [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else return null;
  if (y < 100) y += y > new Date().getFullYear() % 100 ? 1900 : 2000;
  const date = new Date(y, mo - 1, d, 12);
  return date.getMonth() === mo - 1 && date.getDate() === d && y > 1900 && date < new Date() ? date : null;
}

function splitName(r: ImportRow) {
  let first = r.firstName ?? "";
  let last = [r.lastName, r.lastName2].filter(Boolean).join(" ");
  if (!first && !last && r.fullName) {
    const full = r.fullName.trim().replace(/\s+/g, " ");
    if (full.includes(",")) [last, first] = full.split(",").map((x) => x.trim());
    else {
      const words = full.split(" ");
      first = words.shift() ?? "";
      last = words.join(" ");
    }
  }
  return { firstName: first, lastName: last };
}

export interface ImportResult {
  created: number;
  duplicates: string[];
  errors: string[];
}

/**
 * Da de alta una tanda de clientes importados (el navegador envía el archivo en tandas).
 * Se saltan los que ya existen: mismo DNI, o mismo teléfono y primer apellido.
 */
export async function importPatients(rows: ImportRow[], firstRow: number, gdprConsent: boolean): Promise<ImportResult> {
  const result: ImportResult = { created: 0, duplicates: [], errors: [] };
  const existing = await prisma.patient.findMany({ select: { dni: true, phone: true, lastName: true } });
  const dnis = new Set(existing.map((p) => p.dni).filter(Boolean));
  const phoneKey = (phone?: string | null, last?: string) => (digits(phone).length >= 9 ? `${digits(phone)}|${normalize(last ?? "").split(" ")[0]}` : null);
  const phones = new Set(existing.map((p) => phoneKey(p.phone, p.lastName)).filter(Boolean));
  const data: Prisma.PatientCreateManyInput[] = [];

  rows.forEach((r, i) => {
    const n = firstRow + i;
    const { firstName, lastName } = splitName(r);
    if (!firstName && !lastName) {
      result.errors.push(`Fila ${n}: sin nombre`);
      return;
    }
    const notes: string[] = [];
    let dni: string | null = null;
    if (r.dni) {
      try {
        dni = normalizeDni(r.dni);
      } catch {
        notes.push(`DNI importado no válido: ${r.dni}`);
      }
    }
    const name = `${firstName} ${lastName}`.trim();
    if (dni && dnis.has(dni)) {
      result.duplicates.push(`Fila ${n}: ${name} (DNI ${dni} ya existe)`);
      return;
    }
    const pk = phoneKey(r.phone, lastName);
    if (!dni && pk && phones.has(pk)) {
      result.duplicates.push(`Fila ${n}: ${name} (mismo teléfono y apellido)`);
      return;
    }
    const birthDate = parseDate(r.birthDate);
    if (r.birthDate && !birthDate) notes.push(`Fecha de nacimiento importada: ${r.birthDate}`);
    let email = r.email ?? null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notes.push(`Email importado: ${email}`);
      email = null;
    }
    if (r.notes) notes.unshift(r.notes);
    if (dni) dnis.add(dni);
    if (pk) phones.add(pk);
    data.push({
      firstName: firstName || "—",
      lastName,
      dni,
      phone: r.phone ?? null,
      phoneAlt: r.phoneAlt ?? null,
      email,
      address: r.address ?? null,
      postalCode: r.postalCode ?? null,
      city: r.city ?? null,
      birthDate,
      healthCardNo: r.healthCardNo ?? null,
      notes: notes.join("\n") || null,
      gdprConsent,
      gdprConsentAt: gdprConsent ? new Date() : null,
    });
  });

  if (data.length) {
    result.created = (await prisma.patient.createMany({ data })).count;
    await audit("CREATE", "Patient", undefined, `Importación: ${result.created} clientes (filas ${firstRow}-${firstRow + rows.length - 1})`);
    revalidatePath("/pacientes");
  }
  return result;
}
