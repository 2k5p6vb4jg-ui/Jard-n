import crypto from "node:crypto";
import type { UserRole } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Acceso con PIN por usuario (opcional: sin usuarios la app queda abierta a la red local).
 * - Cada PIN se guarda con scrypt + sal; nunca en claro. El PIN identifica a la persona.
 * - La sesión es una cookie firmada con HMAC: {u: usuario, v: versión global, uv: versión del usuario, exp}.
 *   «Cerrar todas las sesiones» sube la versión global; cambiar el PIN de alguien, la suya.
 */
export const SESSION_COOKIE = "jo_sesion";

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pin, salt, 32);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = crypto.scryptSync(pin, Buffer.from(salt, "base64url"), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

export const isValidPin = (pin: string) => /^\d{4,8}$/.test(pin);
export const isPredictablePin = (pin: string) => /^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin);

export interface SessionUser {
  id: string;
  name: string;
  role: UserRole;
}

interface AuthUser extends SessionUser {
  pinHash: string;
  version: number;
}

export interface AuthConfig {
  /** Hay al menos un usuario activo: se pide PIN */
  enabled: boolean;
  secret: string | null;
  version: number;
  hours: number;
  users: AuthUser[];
}

// La configuración se consulta en cada petición: caché corta para no leer la BD constantemente.
// Vive en globalThis para que el proxy y las acciones (empaquetados por separado) compartan la misma y
// un cambio de PIN o de usuario se note al instante.
const store = globalThis as typeof globalThis & { __joAuth?: { at: number; cfg: AuthConfig } | null };

export async function getAuthConfig(): Promise<AuthConfig> {
  const cache = store.__joAuth;
  if (cache && Date.now() - cache.at < 3000) return cache.cfg;
  const [s, users] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 }, select: { sessionSecret: true, sessionVersion: true, sessionHours: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true, pinHash: true, sessionVersion: true } }),
  ]);
  const cfg: AuthConfig = {
    enabled: users.length > 0,
    secret: s?.sessionSecret ?? null,
    version: s?.sessionVersion ?? 0,
    hours: s?.sessionHours ?? 12,
    users: users.map(({ sessionVersion, ...u }) => ({ ...u, version: sessionVersion })),
  };
  store.__joAuth = { at: Date.now(), cfg };
  return cfg;
}

export function invalidateAuthCache() {
  store.__joAuth = null;
}

/** Usuario activo con ese PIN (los PIN no se repiten entre usuarios) */
export function findUserByPin(pin: string, cfg: AuthConfig): AuthUser | null {
  return cfg.users.find((u) => verifyPin(pin, u.pinHash)) ?? null;
}

const sign = (payload: string, secret: string) => crypto.createHmac("sha256", secret).update(payload).digest("base64url");

export function createSessionToken(cfg: { secret: string; version: number; hours: number }, user: { id: string; version: number }): { token: string; maxAge: number } {
  const maxAge = cfg.hours * 3600;
  const payload = Buffer.from(JSON.stringify({ u: user.id, v: cfg.version, uv: user.version, exp: Date.now() + maxAge * 1000 })).toString("base64url");
  return { token: `${payload}.${sign(payload, cfg.secret)}`, maxAge };
}

/** Usuario de la sesión, o null si la cookie no vale (caducada, firma mala, usuario desactivado o PIN cambiado). */
export function sessionUser(token: string | undefined, cfg: AuthConfig): SessionUser | null {
  if (!token || !cfg.secret) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload, cfg.secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const { u, v, uv, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (v !== cfg.version || typeof exp !== "number" || exp <= Date.now()) return null;
    const user = cfg.users.find((x) => x.id === u);
    if (!user || user.version !== uv) return null;
    return { id: user.id, name: user.name, role: user.role };
  } catch {
    return null;
  }
}

export const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  // La app se sirve por HTTP dentro de la red local: una cookie "secure" no se enviaría
  secure: false,
  path: "/",
  maxAge,
});
