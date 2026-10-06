"use server";

import { revalidatePath } from "next/cache";
import { DocumentType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { deletePatientFile, savePatientFile } from "@/lib/storage";
import { type ActionState, date, FormError, handle, oneOf, str } from "@/lib/forms";

/**
 * Sube uno o varios archivos (estudios de pisada, fotos de huellas, recetas…)
 * a uploads/<patientId>/ y los registra en la ficha.
 */
export async function uploadDocuments(patientId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) throw new FormError("Seleccione un archivo o haga una foto.");
    if (files.length > 20) throw new FormError("Máximo 20 archivos por envío.");

    const type = oneOf(fd, "type", Object.values(DocumentType)) ?? "OTHER";
    const title = str(fd, "title");
    const takenAt = date(fd, "takenAt") ?? new Date();
    const cameraNames = new Set(fd.getAll("cameraNames").map(String));

    // Vínculo opcional con una prescripción del propio paciente
    const link = str(fd, "link");
    let insoleId: string | null = null;
    let stockingId: string | null = null;
    if (link?.startsWith("insole:")) {
      insoleId = (await prisma.insolePrescription.findFirst({ where: { id: link.slice(7), patientId }, select: { id: true } }))?.id ?? null;
    } else if (link?.startsWith("stocking:")) {
      stockingId = (await prisma.compressionStocking.findFirst({ where: { id: link.slice(9), patientId }, select: { id: true } }))?.id ?? null;
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
    if (!patient) throw new FormError("El paciente no existe.");

    for (const [i, file] of files.entries()) {
      let saved;
      try {
        saved = await savePatientFile(patientId, file);
      } catch (e) {
        throw new FormError((e as Error).message);
      }
      const doc = await prisma.clinicalDocument.create({
        data: {
          patientId,
          insoleId,
          stockingId,
          type,
          source: cameraNames.has(file.name) ? "CAMERA" : "UPLOAD",
          title: title ? (files.length > 1 ? `${title} (${i + 1})` : title) : file.name.replace(/\.[^.]+$/, ""),
          description: str(fd, "description"),
          takenAt,
          ...saved,
        },
      });
      await audit("CREATE", "ClinicalDocument", doc.id, doc.title);
    }
  });
  // Siempre: si falla el 3.º archivo, los dos primeros ya están guardados y deben verse
  revalidatePath(`/pacientes/${patientId}`);
  return res;
}

export async function deleteDocument(patientId: string, documentId: string) {
  const doc = await prisma.clinicalDocument.findFirst({ where: { id: documentId, patientId } });
  if (!doc) return;
  await prisma.clinicalDocument.delete({ where: { id: doc.id } });
  await deletePatientFile(doc.storagePath);
  await audit("DELETE", "ClinicalDocument", doc.id, doc.title);
  revalidatePath(`/pacientes/${patientId}`);
}
