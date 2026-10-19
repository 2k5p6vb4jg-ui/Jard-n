import "server-only";
import type { OptionKind } from "@prisma/client";
import { prisma } from "./prisma";
import { FormError, required, str } from "./forms";

/** Lee un desplegable de Ajustes → Opciones y comprueba que la opción existe y es de la lista correcta. */
export async function readOption(fd: FormData, key: string, kind: OptionKind, label: string, isRequired: true): Promise<string>;
export async function readOption(fd: FormData, key: string, kind: OptionKind, label: string, isRequired: false): Promise<string | null>;
export async function readOption(fd: FormData, key: string, kind: OptionKind, label: string, isRequired: boolean) {
  const id = isRequired ? required(fd, key, label) : str(fd, key);
  if (!id) return null;
  const opt = await prisma.catalogOption.findUnique({ where: { id }, select: { kind: true } });
  if (!opt || opt.kind !== kind) throw new FormError(`Opción no válida en «${label}».`);
  return id;
}
