import fs from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { resolveUploadPath } from "@/lib/storage";

export const runtime = "nodejs";

/** Sirve adjuntos clínicos SOLO si están registrados en la BD (nunca listado de carpeta). */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const storagePath = (await params).path.join("/");
  const doc = await prisma.clinicalDocument.findUnique({ where: { storagePath } });
  if (!doc) return new Response("No encontrado", { status: 404 });

  try {
    const data = await fs.readFile(resolveUploadPath(storagePath));
    return new Response(data, {
      headers: {
        "Content-Type": doc.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalName)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Archivo no disponible en disco", { status: 404 });
  }
}
