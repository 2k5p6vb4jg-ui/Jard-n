import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { backupPath, restoreBackup, RestoreError } from "@/lib/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let restoring = false;

/**
 * Restaura una copia. Dos formas:
 *  - POST con el .zip como cuerpo (subido desde el ordenador / pendrive)
 *  - POST ?archivo=<nombre> para una copia de la carpeta de copias
 * Exige la cabecera x-confirmar: RESTAURAR (confirmación escrita en la pantalla).
 */
export async function POST(req: Request) {
  if (req.headers.get("x-confirmar") !== "RESTAURAR") return Response.json({ error: "Falta la confirmación." }, { status: 400 });
  if (restoring) return Response.json({ error: "Ya hay una restauración en curso." }, { status: 409 });
  restoring = true;

  const name = new URL(req.url).searchParams.get("archivo");
  const tmpDir = path.join(/*turbopackIgnore: true*/ process.cwd(), ".backup-tmp");
  let uploaded: string | null = null;
  try {
    let zipFile: string;
    if (name) {
      const p = backupPath(name);
      if (!p || !fs.existsSync(p)) return Response.json({ error: "Copia no encontrada." }, { status: 404 });
      zipFile = p;
    } else {
      if (!req.body) return Response.json({ error: "No se ha recibido ningún archivo." }, { status: 400 });
      await fsp.mkdir(tmpDir, { recursive: true });
      uploaded = path.join(tmpDir, `subida-${Date.now()}.zip`);
      await pipeline(Readable.fromWeb(req.body as import("node:stream/web").ReadableStream), fs.createWriteStream(uploaded));
      zipFile = uploaded;
    }

    const result = await restoreBackup(zipFile);
    await audit("UPDATE", "Database", undefined, `Copia restaurada (${result.manifest.createdAt}); copia previa: ${result.safetyCopy}`);
    revalidatePath("/", "layout");
    return Response.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof RestoreError) return Response.json({ error: e.message }, { status: 400 });
    console.error("[restaurar]", e);
    return Response.json({ error: "No se pudo restaurar la copia. Los datos anteriores se han guardado en la carpeta de copias." }, { status: 500 });
  } finally {
    restoring = false;
    if (uploaded) await fsp.rm(uploaded, { force: true });
  }
}
