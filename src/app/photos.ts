"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { deleteUpload } from "@/lib/storage";

export async function deletePhoto(id: string) {
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) return;
  await prisma.photo.delete({ where: { id } });
  await deleteUpload(photo.storagePath);
  await audit("DELETE", "Photo", id);
  revalidatePath(photo.workOrderId ? `/taller/${photo.workOrderId}` : `/plantillas/${photo.insoleOrderId}`);
}
