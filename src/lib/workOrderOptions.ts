import "server-only";
import { prisma } from "./prisma";
import type { WorkOrderFormOptions } from "@/components/workshop/WorkOrderForm";

export async function getWorkOrderFormOptions(): Promise<WorkOrderFormOptions> {
  const [patients, products, technicians, settings] = await Promise.all([
    prisma.patient.findMany({ where: { archivedAt: null }, select: { id: true, firstName: true, lastName: true, dni: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    prisma.trackedProduct.findMany({ select: { id: true, serialNumber: true, brand: true, model: true, patient: { select: { firstName: true, lastName: true } } }, orderBy: { serialNumber: "asc" } }),
    prisma.technician.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.settings.findUnique({ where: { id: 1 }, select: { defaultTaxRate: true } }),
  ]);
  return { patients, products, technicians, defaultTaxRate: settings?.defaultTaxRate ?? 21 };
}
