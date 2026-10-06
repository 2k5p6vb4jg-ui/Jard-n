import { PassThrough, Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { writePatientExport } from "@/lib/gdpr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Exportación RGPD de un paciente (acceso y portabilidad): .zip con PDF, JSON y documentos. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.patient.findUnique({ where: { id }, select: { lastName: true, firstName: true } });
  if (!p) return new Response("Paciente no encontrado", { status: 404 });

  const pass = new PassThrough();
  writePatientExport(id, pass).catch((e) => {
    console.error("[exportar paciente]", e);
    pass.destroy(e);
  });
  await audit("EXPORT", "Patient", id, "Exportación RGPD");

  const name = `datos-${`${p.lastName}-${p.firstName}`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "-").toLowerCase()}.zip`;
  return new Response(Readable.toWeb(pass) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
