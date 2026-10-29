"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { hashPin, verifyPin } from "@/lib/auth";
import { currentSession } from "@/lib/session";
import { checkNewPin, issueSession } from "@/lib/users";
import { type ActionState, FormError, handle } from "@/lib/forms";

/** Cada persona cambia su propio PIN. Cierra su sesión en los demás dispositivos. */
export async function changeOwnPin(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const { user } = await currentSession();
    if (!user) throw new FormError("Vuelva a entrar con su PIN.");
    const u = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!verifyPin(String(fd.get("currentPin") ?? ""), u.pinHash)) throw new FormError("El PIN actual no es correcto.");
    const pin = await checkNewPin(fd, u.id);
    await prisma.user.update({ where: { id: u.id }, data: { pinHash: hashPin(pin), sessionVersion: { increment: 1 } } });
    await audit("UPDATE", "User", u.id, "Cambió su PIN");
    await issueSession(u.id);
  });
  if (res?.error) return res;
  revalidatePath("/", "layout");
  return { ok: true };
}
