import "server-only";
import type { OptionKind } from "@prisma/client";
import { prisma } from "./prisma";
import type { Tone } from "./labels";
import type { InsoleOrderFormOptions } from "@/components/insoleOrders/InsoleOrderForm";

/** Opciones de tipo, material y estado, en el orden configurado. `active` filtra las desactivadas. */
export async function getInsoleOptions({ active }: { active?: boolean } = {}) {
  const all = await prisma.catalogOption.findMany({
    where: active ? { active: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  const of = (kind: OptionKind) => all.filter((o) => o.kind === kind);
  return { types: of("TYPE"), materials: of("MATERIAL"), statuses: of("STATUS") };
}

export async function nextInsoleOrderCode() {
  const prefix = `PL-${new Date().getFullYear()}-`;
  const last = await prisma.insoleOrder.findFirst({ where: { code: { startsWith: prefix } }, orderBy: { code: "desc" }, select: { code: true } });
  const n = last ? Number(last.code.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/**
 * Color de cada estado según su posición, para que funcione con estados creados en Ajustes:
 * en curso → ámbar (el primero), azul (intermedios), verde azulado (el último antes de terminar);
 * terminados → verde (el primero, p. ej. «Entregada») y gris (el resto, p. ej. «Anulada»).
 */
export function statusTones(statuses: { id: string; isFinal: boolean }[]): Record<string, Tone> {
  const open = statuses.filter((s) => !s.isFinal);
  const closed = statuses.filter((s) => s.isFinal);
  return Object.fromEntries([
    ...open.map((s, i) => [s.id, i === 0 ? "amber" : i === open.length - 1 ? "teal" : "sky"] as const),
    ...closed.map((s, i) => [s.id, i === 0 ? "emerald" : "slate"] as const),
  ]);
}

export async function getInsoleOrderFormOptions(): Promise<InsoleOrderFormOptions> {
  const [patients, opts] = await Promise.all([
    prisma.patient.findMany({ where: { archivedAt: null }, select: { id: true, firstName: true, lastName: true, dni: true, phone: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    getInsoleOptions(),
  ]);
  return { patients, ...opts };
}
