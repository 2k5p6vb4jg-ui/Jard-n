import fs from "node:fs";
import { Readable } from "node:stream";
import { audit } from "@/lib/audit";
import { backupPath } from "@/lib/backup";

export const runtime = "nodejs";

/** Descarga una de las copias guardadas en la carpeta de copias. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const file = backupPath(name);
  if (!file || !fs.existsSync(file)) return new Response("Copia no encontrada", { status: 404 });
  await audit("EXPORT", "Backup", undefined, name);
  return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(fs.statSync(file).size),
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
