import { prisma } from "@/lib/prisma";
import { readUpload } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 }, select: { logoPath: true } });
  if (!settings?.logoPath) return new Response("Sin logo", { status: 404 });
  try {
    const data = await readUpload(settings.logoPath);
    return new Response(data, {
      headers: {
        "Content-Type": settings.logoPath.endsWith(".png") ? "image/png" : "image/jpeg",
        // La URL lleva ?v=<fecha de cambio>, así que se puede cachear sin miedo
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Logo no disponible", { status: 404 });
  }
}
