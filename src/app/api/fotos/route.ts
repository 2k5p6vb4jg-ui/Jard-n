import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { savePhoto } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * Sube una foto (ya reducida en el dispositivo) a una reparación (?reparacion=<id>) o a unas plantillas (?plantilla=<id>).
 * Se usa fetch/XHR en lugar de una acción de servidor para poder mostrar el progreso de la subida.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const workOrderId = url.searchParams.get("reparacion");
  const insoleOrderId = url.searchParams.get("plantilla");
  const exists = workOrderId
    ? await prisma.workOrder.findUnique({ where: { id: workOrderId }, select: { id: true } })
    : insoleOrderId
      ? await prisma.insoleOrder.findUnique({ where: { id: insoleOrderId }, select: { id: true } })
      : null;
  if (!exists) return Response.json({ error: "El registro ya no existe." }, { status: 404 });

  const file = (await req.formData().catch(() => null))?.get("foto");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "No se ha recibido la foto." }, { status: 400 });

  try {
    const saved = await savePhoto(workOrderId ? "reparaciones" : "plantillas", exists.id, file);
    const photo = await prisma.photo.create({ data: { ...saved, workOrderId, insoleOrderId } });
    await audit("CREATE", "Photo", photo.id, workOrderId ? "Foto de reparación" : "Foto de plantillas");
    revalidatePath(workOrderId ? `/taller/${workOrderId}` : `/plantillas/${insoleOrderId}`);
    return Response.json({ ok: true, id: photo.id });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
