import "server-only";
import { headers } from "next/headers";
import type { AuditAction } from "@prisma/client";
import { prisma } from "./prisma";
import { currentSession } from "./session";

/** Registro de cambios sobre datos personales/de salud (trazabilidad RGPD), con quién los hizo. */
export async function audit(action: AuditAction, entity: string, entityId?: string, summary?: string, who?: { id: string; name: string }) {
  const h = await headers();
  const user = who ?? (await currentSession().catch(() => null))?.user;
  await prisma.auditLog.create({
    data: {
      action,
      entity,
      entityId,
      summary,
      userId: user?.id,
      userName: user?.name,
      ip: h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? undefined,
      userAgent: h.get("user-agent")?.slice(0, 200) ?? undefined,
    },
  });
}
