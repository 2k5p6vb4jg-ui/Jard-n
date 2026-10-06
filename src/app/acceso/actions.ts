"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { cookieOptions, createSessionToken, getAuthConfig, SESSION_COOKIE, verifyPin } from "@/lib/auth";
import type { ActionState } from "@/lib/forms";

// Intentos fallidos por dispositivo (IP): tras 5 fallos se bloquea 1 min, y el bloqueo se duplica
const failures = new Map<string, { count: number; until: number }>();

function safeBack(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "/";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/acceso") ? s : "/";
}

export async function login(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
  const f = failures.get(ip);
  if (f && f.until > Date.now()) {
    return { error: `Demasiados intentos. Espere ${Math.ceil((f.until - Date.now()) / 1000)} s.` };
  }

  const cfg = await getAuthConfig();
  if (!cfg.pinHash || !cfg.secret) redirect("/");

  const pin = String(fd.get("pin") ?? "");
  if (!verifyPin(pin, cfg.pinHash)) {
    const count = (f?.count ?? 0) + 1;
    const until = count >= 5 ? Date.now() + 60_000 * 2 ** Math.min(count - 5, 5) : 0;
    failures.set(ip, { count, until });
    await audit("VIEW", "Session", undefined, `PIN incorrecto (${count})`);
    return { error: until ? "PIN incorrecto. Acceso bloqueado temporalmente." : "PIN incorrecto." };
  }

  failures.delete(ip);
  const { token, maxAge } = createSessionToken({ secret: cfg.secret, version: cfg.version, hours: cfg.hours });
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(maxAge));
  await audit("VIEW", "Session", undefined, "Acceso correcto");
  redirect(safeBack(fd.get("volver")));
}

/** Cierra la sesión de este dispositivo (botón «Bloquear»). */
export async function lock() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/acceso");
}
