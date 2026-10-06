import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Descarga una copia consistente de la base de datos.
 * Se usa `VACUUM INTO` (instantánea atómica de SQLite) en lugar de copiar dev.db
 * en caliente, para no obtener un archivo corrupto si hay escrituras en curso.
 */
export async function GET(req: Request) {
  const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
  const fileName = `ortopedia-backup-${stamp}.db`;
  const tmp = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "orto-")), fileName);

  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
    const data = await fs.readFile(tmp);

    await prisma.backupRecord.create({ data: { fileName, sizeBytes: data.length } });
    await prisma.auditLog.create({
      data: {
        action: "BACKUP",
        entity: "Database",
        summary: fileName,
        ip: req.headers.get("x-forwarded-for") ?? undefined,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    });

    return new Response(data, {
      headers: {
        "Content-Type": "application/vnd.sqlite3",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await fs.rm(path.dirname(tmp), { recursive: true, force: true });
  }
}
