"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { AppointmentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { readOption } from "@/lib/options";
import { toDateInput, type ActionState, FormError, handle, int, required, str } from "@/lib/forms";

async function appointmentData(fd: FormData) {
  const day = required(fd, "date", "Día");
  const time = required(fd, "time", "Hora");
  const startsAt = new Date(`${day}T${time}:00`);
  if (Number.isNaN(startsAt.getTime())) throw new FormError("Fecha u hora no válidas.");
  const durationMin = int(fd, "durationMin") ?? 30;
  if (durationMin < 5 || durationMin > 600) throw new FormError("La duración no es válida.");
  const workOrderId = str(fd, "workOrderId");
  const insoleOrderId = str(fd, "insoleOrderId");
  let patientId = str(fd, "patientId");
  let centerId = str(fd, "centerId");
  // Desde una reparación o unas plantillas, el cliente y el centro se toman de ellas si no se indican
  if (workOrderId) {
    const wo = await prisma.workOrder.findUnique({ where: { id: workOrderId }, select: { patientId: true, centerId: true } });
    patientId ??= wo?.patientId ?? null;
    centerId ??= wo?.centerId ?? null;
  }
  if (insoleOrderId) {
    const io = await prisma.insoleOrder.findUnique({ where: { id: insoleOrderId }, select: { patientId: true, centerId: true } });
    patientId ??= io?.patientId ?? null;
    centerId ??= io?.centerId ?? null;
  }
  return {
    startsAt,
    durationMin,
    typeId: await readOption(fd, "typeId", "APPOINTMENT_TYPE", "Tipo de cita", true),
    location: str(fd, "location"),
    notes: str(fd, "notes"),
    patientId,
    centerId,
    workOrderId,
    insoleOrderId,
    technicianId: str(fd, "technicianId"),
  };
}

export async function saveAppointment(id: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  let day = "";
  const res = await handle(async () => {
    const data = await appointmentData(fd);
    day = toDateInput(data.startsAt);
    if (id) await prisma.appointment.update({ where: { id }, data });
    else {
      const a = await prisma.appointment.create({ data });
      await audit("CREATE", "Appointment", a.id);
    }
  });
  if (res?.error) return res;
  revalidatePath("/", "layout");
  const back = str(fd, "back");
  redirect(back && back.startsWith("/") && !back.startsWith("//") ? back : `/agenda?semana=${day}`);
}

export async function setAppointmentStatus(id: string, to: AppointmentStatus) {
  await prisma.appointment.update({ where: { id }, data: { status: to } });
  revalidatePath("/", "layout");
}

export async function deleteAppointment(id: string) {
  const a = await prisma.appointment.delete({ where: { id } });
  await audit("DELETE", "Appointment", id);
  revalidatePath("/", "layout");
  redirect(`/agenda?semana=${toDateInput(a.startsAt)}`);
}
