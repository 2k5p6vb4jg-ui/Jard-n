"use server";

import { revalidatePath } from "next/cache";
import type { RenewalStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { addDays } from "@/lib/dates";

export type RenewalAction = "CONTACTED" | "SNOOZE" | "DISMISSED" | "RENEWED" | "REOPEN";

/**
 * Gestiona un aviso de renovación desde el panel o la ficha:
 *  - CONTACTED: se ha llamado al paciente (el aviso sigue visible con la fecha de la llamada)
 *  - SNOOZE:    ocultar el aviso 30 días (no cambia la fecha real de revisión)
 *  - DISMISSED: el paciente no renueva (desaparece del panel)
 *  - RENEWED:   renovado fuera del sistema
 *  - REOPEN:    volver a activar un aviso descartado
 */
export async function updateRenewal(kind: "INSOLE" | "STOCKING", id: string, action: RenewalAction) {
  const now = new Date();
  const select = { patientId: true } as const;
  const rec =
    kind === "INSOLE"
      ? await prisma.insolePrescription.findUnique({ where: { id }, select })
      : await prisma.compressionStocking.findUnique({ where: { id }, select });
  if (!rec) return;

  const data: { renewalUpdatedAt: Date; renewalStatus?: RenewalStatus; renewalSnoozedUntil?: Date | null } = { renewalUpdatedAt: now };
  if (action === "SNOOZE") data.renewalSnoozedUntil = addDays(now, 30);
  else {
    data.renewalStatus = action === "REOPEN" ? "PENDING" : action;
    data.renewalSnoozedUntil = null;
  }

  if (kind === "INSOLE") await prisma.insolePrescription.update({ where: { id }, data });
  else await prisma.compressionStocking.update({ where: { id }, data });
  await audit("UPDATE", kind === "INSOLE" ? "InsolePrescription" : "CompressionStocking", id, `Aviso de renovación: ${action}`);
  revalidatePath("/");
  revalidatePath(`/pacientes/${rec.patientId}`);
}
