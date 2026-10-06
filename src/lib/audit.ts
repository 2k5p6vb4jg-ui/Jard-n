import "server-only";
import { headers } from "next/headers";
import type { AuditAction } from "@prisma/client";
import { prisma } from "./prisma";

/** Registro de cambios sobre datos personales/de salud (trazabilidad RGPD). */
export async function audit(action: AuditAction, entity: string, entityId?: string, summary?: string) {
  const h = await headers();
  await prisma.auditLog.create({
    data: {
      action,
      entity,
      entityId,
      summary,
      ip: h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? undefined,
      userAgent: h.get("user-agent")?.slice(0, 200) ?? undefined,
    },
  });
}
