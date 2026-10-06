import crypto from "node:crypto";
import { prisma } from "./prisma";

/**
 * Acceso con PIN (opcional).
 * - El PIN se guarda con scrypt + sal; nunca en claro.
 * - La sesión es una cookie firmada con HMAC: {v: versión, exp: caducidad}.
 *   Cambiar o quitar el PIN incrementa la versión y cierra todas las sesiones.
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

interface AuthConfig {
  pinHash: string | null;
  secret: string | null;
  version: number;
  hours: number;
}

// La configuración se consulta en cada petición: caché corta para no leer la BD constantemente
let cache: { at: number; cfg: AuthConfig } | null = null;

export async function getAuthConfig(): Promise<AuthConfig> {
  if (cache && Date.now() - cache.at < 3000) return cache.cfg;
  const s = await prisma.settings.findUnique({
    where: { id: 1 },
    select: { pinHash: true, sessionSecret: true, sessionVersion: true, sessionHours: true },
  });
  const cfg = { pinHash: s?.pinHash ?? null, secret: s?.sessionSecret ?? null, version: s?.sessionVersion ?? 0, hours: s?.sessionHours ?? 12 };
  cache = { at: Date.now(), cfg };
  return cfg;
}

export function invalidateAuthCache() {
  cache = null;
}

const sign = (payload: string, secret: string) => crypto.createHmac("sha256", secret).update(payload).digest("base64url");

export function createSessionToken(cfg: { secret: string; version: number; hours: number }): { token: string; maxAge: number } {
  const maxAge = cfg.hours * 3600;
  const payload = Buffer.from(JSON.stringify({ v: cfg.version, exp: Date.now() + maxAge * 1000 })).toString("base64url");
  return { token: `${payload}.${sign(payload, cfg.secret)}`, maxAge };
}

export function isValidSession(token: string | undefined, cfg: AuthConfig): boolean {
  if (!token || !cfg.secret) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = Buffer.from(sign(payload, cfg.secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return false;
  try {
    const { v, exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return v === cfg.version && typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
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
