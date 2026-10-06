"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { type ActionState, bool, date, FormError, handle, normalizeDni, required, str } from "@/lib/forms";

function patientData(fd: FormData) {
  const email = str(fd, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new FormError("El email no es válido.");
  const gdprConsent = bool(fd, "gdprConsent");
  return {
    firstName: required(fd, "firstName", "Nombre"),
    lastName: required(fd, "lastName", "Apellidos"),
    dni: normalizeDni(str(fd, "dni")),
    birthDate: date(fd, "birthDate"),
    phone: str(fd, "phone"),
    phoneAlt: str(fd, "phoneAlt"),
    email,
    address: str(fd, "address"),
    city: str(fd, "city"),
    postalCode: str(fd, "postalCode"),
    healthCardNo: str(fd, "healthCardNo"),
    notes: str(fd, "notes"),
    gdprConsent,
    marketingOptIn: bool(fd, "marketingOptIn"),
  } satisfies Prisma.PatientUncheckedCreateInput;
}

export async function createPatient(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await handle(async () => {
    const data = patientData(fd);
    const p = await prisma.patient.create({ data: { ...data, gdprConsentAt: data.gdprConsent ? new Date() : null } });
    id = p.id;
    await audit("CREATE", "Patient", p.id, `${p.firstName} ${p.lastName}`);
  });
  if (res?.error) return res;
  revalidatePath("/pacientes");
  redirect(`/pacientes/${id}`);
}

export async function updatePatient(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const data = patientData(fd);
    const before = await prisma.patient.findUniqueOrThrow({ where: { id }, select: { gdprConsent: true, gdprConsentAt: true } });
    await prisma.patient.update({
      where: { id },
      data: {
        ...data,
        // Conserva la fecha original del consentimiento; la fija si se otorga ahora y la borra si se revoca
        gdprConsentAt: data.gdprConsent ? (before.gdprConsentAt ?? new Date()) : null,
      },
    });
    await audit("UPDATE", "Patient", id, before.gdprConsent !== data.gdprConsent ? `Consentimiento RGPD: ${data.gdprConsent ? "otorgado" : "revocado"}` : undefined);
  });
  if (res?.error) return res;
  revalidatePath(`/pacientes/${id}`);
  redirect(`/pacientes/${id}`);
}
