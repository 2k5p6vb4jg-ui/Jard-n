import "server-only";
import { cookies } from "next/headers";
import { getAuthConfig, SESSION_COOKIE, sessionUser, type SessionUser } from "./auth";
import { canSee, type Section } from "./permissions";
import { FormError } from "./forms";

/** Quién está usando la app en esta petición. `enabled` false = sin usuarios (app abierta). */
export async function currentSession(): Promise<{ enabled: boolean; user: SessionUser | null }> {
  const cfg = await getAuthConfig();
  if (!cfg.enabled) return { enabled: false, user: null };
  return { enabled: true, user: sessionUser((await cookies()).get(SESSION_COOKIE)?.value, cfg) };
}

/** Para acciones delicadas: comprueba el permiso aunque se llamen desde otra página. */
export async function requireSection(section: Section) {
  const { enabled, user } = await currentSession();
  if (!enabled) return null;
  if (!user || !canSee(user.role, section)) throw new FormError("Su usuario no tiene permiso para hacer esto.");
  return user;
}
