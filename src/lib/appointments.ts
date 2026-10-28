import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { addDays } from "./dates";

export const appointmentInclude = {
  type: { select: { label: true } },
  patient: { select: { id: true, firstName: true, lastName: true, phone: true } },
  center: { select: { id: true, name: true } },
  workOrder: { select: { id: true, code: true } },
  insoleOrder: { select: { id: true, code: true } },
  technician: { select: { name: true } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentFull = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

/** Lunes de la semana de `d` (a las 00:00) */
export function weekStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export const timeFmt = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" });
export const dayFmt = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });

/** Citas y revisiones de contratos entre dos fechas. */
export async function agendaBetween(from: Date, to: Date) {
  const [appointments, visits] = await Promise.all([
    prisma.appointment.findMany({ where: { startsAt: { gte: from, lt: to } }, include: appointmentInclude, orderBy: { startsAt: "asc" } }),
    prisma.maintenanceVisit.findMany({
      where: { dueAt: { gte: from, lt: to }, proposal: { status: "ACCEPTED" } },
      include: { workOrder: { select: { id: true, code: true, status: true } }, proposal: { select: { id: true, number: true, centerId: true, center: { select: { name: true } }, _count: { select: { products: true } } } } },
      orderBy: { dueAt: "asc" },
    }),
  ]);
  return { appointments, visits };
}

export async function todaysAppointments() {
  const from = new Date(new Date().setHours(0, 0, 0, 0));
  return prisma.appointment.findMany({ where: { startsAt: { gte: from, lt: addDays(from, 1) }, status: { not: "CANCELLED" } }, include: appointmentInclude, orderBy: { startsAt: "asc" } });
}

/** Citas pendientes de un cliente o centro (desde hoy) */
export async function upcomingFor(where: Prisma.AppointmentWhereInput) {
  return prisma.appointment.findMany({
    where: { ...where, status: "SCHEDULED", startsAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    include: appointmentInclude,
    orderBy: { startsAt: "asc" },
    take: 5,
  });
}

export async function getAppointmentFormOptions() {
  const { getCentersForSelect } = await import("./centers");
  const [types, patients, centers, technicians] = await Promise.all([
    prisma.catalogOption.findMany({ where: { kind: "APPOINTMENT_TYPE" }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    prisma.patient.findMany({ where: { archivedAt: null }, select: { id: true, firstName: true, lastName: true, dni: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    getCentersForSelect(),
    prisma.technician.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { types, patients, centers, technicians };
}

export type { AppointmentFormOptions } from "@/components/agenda/AppointmentForm";
