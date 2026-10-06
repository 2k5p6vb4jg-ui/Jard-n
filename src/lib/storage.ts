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

export async function savePatientFile(patientId: string, file: File) {
  if (!ALLOWED_MIME.has(file.type)) throw new Error(`Tipo de archivo no permitido: ${file.type}`);
  if (!/^[a-z0-9]+$/i.test(patientId)) throw new Error("Paciente no válido");

  const buffer = Buffer.from(await file.arrayBuffer());
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const storagePath = path.posix.join(patientId, `${stamp}_${slugify(file.name) || "archivo"}`);
  const full = resolveUploadPath(storagePath);

  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer, { flag: "wx" });

  return {
    storagePath,
    originalName: file.name,
    mimeType: file.type,
    sizeBytes: buffer.length,
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}

export async function deletePatientFile(storagePath: string) {
  await fs.rm(resolveUploadPath(storagePath), { force: true });
}
