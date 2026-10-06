import "server-only";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

/** Raíz de adjuntos clínicos. Estructura: uploads/<patientId>/<fecha>_<nombre-saneado>.<ext> */
export const UPLOADS_ROOT = path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.UPLOADS_DIR ?? "./uploads");

export const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "text/csv",
  "application/json",
  "application/zip",
]);

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Resuelve una ruta relativa impidiendo salir de UPLOADS_ROOT (path traversal). */
export function resolveUploadPath(relative: string): string {
  const full = path.resolve(/*turbopackIgnore: true*/ UPLOADS_ROOT, relative);
  if (!full.startsWith(UPLOADS_ROOT + path.sep)) throw new Error("Ruta de archivo no válida");
  return full;
}

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  csv: "text/csv",
  json: "application/json",
  zip: "application/zip",
};

/** Algunos navegadores no informan el tipo (p. ej. CSV exportado del software de pisada): se deduce por extensión. */
export function detectMime(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mime = file.type || MIME_BY_EXT[ext] || "";
  return ALLOWED_MIME.has(mime) ? mime : null;
}

export async function savePatientFile(patientId: string, file: File) {
  const mime = detectMime(file);
  if (!mime) throw new Error(`Tipo de archivo no permitido: ${file.name}`);
  if (file.size > MAX_FILE_BYTES) throw new Error(`«${file.name}» supera el máximo de 25 MB.`);
  if (!/^[a-z0-9]+$/i.test(patientId)) throw new Error("Paciente no válido");

  const buffer = Buffer.from(await file.arrayBuffer());
  const stamp = `${new Date().toISOString().replace(/[:.]/g, "-")}_${crypto.randomBytes(3).toString("hex")}`;
  const storagePath = path.posix.join(patientId, `${stamp}_${slugify(file.name) || "archivo"}`);
  const full = resolveUploadPath(storagePath);

  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer, { flag: "wx" });

  return {
    storagePath,
    originalName: file.name,
    mimeType: mime,
    sizeBytes: buffer.length,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}

export async function deletePatientFile(storagePath: string) {
  await fs.rm(resolveUploadPath(storagePath), { force: true });
}
