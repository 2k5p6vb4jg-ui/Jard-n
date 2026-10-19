import "server-only";
import type { OptionKind, WorkOrderStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { workOrderStatus } from "./labels";
import type { WorkOrderFormOptions } from "@/components/workshop/WorkOrderForm";

/** Listas de Reparaciones (Ajustes → Opciones), en el orden configurado. */
export async function getWorkshopOptions() {
  const all = await prisma.catalogOption.findMany({
    where: { kind: { in: ["EQUIPMENT_CATEGORY", "SERVICE_TYPE", "PART_CATEGORY", "PRIORITY"] } },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
  });
  const of = (kind: OptionKind) => all.filter((o) => o.kind === kind);
  return { categories: of("EQUIPMENT_CATEGORY"), services: of("SERVICE_TYPE"), partCategories: of("PART_CATEGORY"), priorities: of("PRIORITY") };
}

/** Nombre de cada estado de reparación (renombrable en Ajustes; la lógica usa la clave fija). */
export async function getStatusLabels(): Promise<Record<WorkOrderStatus, string>> {
  const rows = await prisma.catalogOption.findMany({ where: { kind: "WORK_STATUS" }, select: { key: true, label: true } });
  const labels = Object.fromEntries(Object.entries(workOrderStatus).map(([k, v]) => [k, v.label])) as Record<WorkOrderStatus, string>;
  for (const r of rows) if (r.key && r.key in labels) labels[r.key as WorkOrderStatus] = r.label;
  return labels;
}

export async function getWorkOrderFormOptions(): Promise<WorkOrderFormOptions> {
  const [patients, products, technicians, settings, lists] = await Promise.all([
    prisma.patient.findMany({ where: { archivedAt: null }, select: { id: true, firstName: true, lastName: true, dni: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    prisma.trackedProduct.findMany({ select: { id: true, serialNumber: true, brand: true, model: true, patient: { select: { firstName: true, lastName: true } } }, orderBy: { serialNumber: "asc" } }),
    prisma.technician.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.settings.findUnique({ where: { id: 1 }, select: { defaultTaxRate: true } }),
    getWorkshopOptions(),
  ]);
  return { patients, products, technicians, defaultTaxRate: settings?.defaultTaxRate ?? 21, categories: lists.categories, services: lists.services, priorities: lists.priorities };
}
