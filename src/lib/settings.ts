import "server-only";
import { prisma } from "./prisma";

let ensured = false;

/** En una instalación nueva (sin datos de prueba) crea la configuración inicial una sola vez. */
export async function ensureSettings() {
  if (ensured) return;
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, businessName: "Jardón Ortopedia" } });
  ensured = true;
}

/** Nombre comercial (para mensajes y documentos). */
export async function businessName() {
  return (await prisma.settings.findUnique({ where: { id: 1 }, select: { businessName: true } }))?.businessName ?? "Jardón Ortopedia";
}
