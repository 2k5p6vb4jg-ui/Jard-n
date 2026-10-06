/**
 * Lectura tolerante de FormData: admite comas decimales ("12,5"),
 * convierte campos vacíos en null y valida enumerados.
 */
export class FormError extends Error {}

export type ActionState = { error?: string; ok?: boolean } | undefined;

export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function required(fd: FormData, key: string, label: string): string {
  const v = str(fd, key);
  if (!v) throw new FormError(`El campo «${label}» es obligatorio.`);
  return v;
}

export function num(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === null) return null;
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n)) throw new FormError(`Valor numérico no válido: «${v}».`);
  return n;
}

export function int(fd: FormData, key: string): number | null {
  const n = num(fd, key);
  return n === null ? null : Math.round(n);
}

/** Euros escritos por el usuario → céntimos */
export function cents(fd: FormData, key: string): number | null {
  const n = num(fd, key);
  return n === null ? null : Math.round(n * 100);
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

export function date(fd: FormData, key: string): Date | null {
  const v = str(fd, key);
  if (!v) return null;
  // <input type="date"> → mediodía local para evitar saltos de día por zona horaria
  const d = new Date(`${v}T12:00:00`);
  if (Number.isNaN(d.getTime())) throw new FormError(`Fecha no válida: «${v}».`);
  return d;
}

export function oneOf<T extends string>(fd: FormData, key: string, values: readonly T[]): T | null {
  const v = str(fd, key);
  if (v === null) return null;
  if (!values.includes(v as T)) throw new FormError(`Opción no válida: «${v}».`);
  return v as T;
}

/** Date → "yyyy-mm-dd" para el atributo value de <input type="date"> */
export function toDateInput(d: Date | null | undefined): string {
  if (!d) return "";
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

/** Céntimos → "12,50" para inputs de importe */
export function toEurosInput(c: number | null | undefined): string {
  return c == null ? "" : (c / 100).toFixed(2).replace(".", ",");
}

/** Valida DNI/NIE español (letra de control). */
export function normalizeDni(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.toUpperCase().replace(/[\s-]/g, "");
  const m = /^([XYZ]?)(\d{7,8})([A-Z])$/.exec(v);
  if (!m) throw new FormError("DNI/NIE con formato no válido (ej. 12345678Z o X1234567L).");
  const prefix = { X: "0", Y: "1", Z: "2", "": "" }[m[1] as "X" | "Y" | "Z" | ""];
  const n = Number(prefix + m[2]);
  if ("TRWAGMYFPDXBNJZSQVHLCKE"[n % 23] !== m[3]) throw new FormError("La letra del DNI/NIE no es correcta.");
  return v;
}

/** Ejecuta la lógica de una acción y traduce errores conocidos a mensajes legibles. */
export async function handle(fn: () => Promise<void>): Promise<ActionState> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    if (e instanceof FormError) return { error: e.message };
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      const target = String((e as { meta?: { target?: unknown } }).meta?.target ?? "");
      if (target.includes("dni")) return { error: "Ya existe un paciente con ese DNI/NIE." };
      if (target.includes("serialNumber")) return { error: "Ya existe un producto con ese número de serie." };
      return { error: "Ya existe un registro con esos datos." };
    }
    throw e; // incluye redirect() de Next, que debe propagarse
  }
}
