import { PassThrough, Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { writeBackupZip } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Descarga directa de la copia completa (.zip): base de datos + fotos y documentos. */
export async function GET() {
  const fileName = `jardon-copia-${new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-")}.zip`;
  const pass = new PassThrough();
  let size = 0;
  pass.on("data", (c: Buffer) => (size += c.length));

  writeBackupZip(pass)
    .then(async () => {
      await prisma.backupRecord.create({ data: { fileName, sizeBytes: size } });
      await audit("BACKUP", "Database", undefined, fileName);
    })
    .catch((e) => {
      console.error("[copia]", e);
      pass.destroy(e);
    });

  return new Response(Readable.toWeb(pass) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
