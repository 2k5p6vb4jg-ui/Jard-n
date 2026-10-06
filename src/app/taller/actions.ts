"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  EquipmentCategory,
  type InterventionType,
  LaborMode,
  PartCategory,
  Priority,
  type ServiceType,
  ServiceType as ServiceTypes,
  WorkOrderStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { WORK_ORDER_FLOW } from "@/lib/labels";
import { type ActionState, bool, cents, date, FormError, handle, num, oneOf, required, str } from "@/lib/forms";

const refresh = (id: string) => {
  revalidatePath(`/taller/${id}`);
  revalidatePath("/taller");
  revalidatePath("/");
};

async function nextCode() {
  const prefix = `OT-${new Date().getFullYear()}-`;
  const last = await prisma.workOrder.findFirst({ where: { code: { startsWith: prefix } }, orderBy: { code: "desc" }, select: { code: true } });
  const n = last ? Number(last.code.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(n).padStart(4, "0")}`;
}

// ── Alta / edición ──────────────────────────────────────────────────────────

async function workOrderData(fd: FormData) {
  const productId = str(fd, "productId");
  const product = productId ? await prisma.trackedProduct.findUnique({ where: { id: productId } }) : null;
  if (productId && !product) throw new FormError("El producto seleccionado ya no existe.");

  const patientId = str(fd, "patientId") ?? product?.patientId ?? null;
  const customerName = str(fd, "customerName");
  if (!patientId && !customerName) throw new FormError("Seleccione un paciente o escriba el nombre del cliente.");

  // Si el equipo está en trazabilidad, se completan los datos que falten desde su ficha
  const equipmentCategory = oneOf(fd, "equipmentCategory", Object.values(EquipmentCategory)) ?? product?.category;
  if (!equipmentCategory) throw new FormError("Indique la categoría del equipo.");
  const serviceType = oneOf(fd, "serviceType", Object.values(ServiceTypes));
  if (!serviceType) throw new FormError("Indique el tipo de servicio.");

  const technicianId = str(fd, "technicianId");
  const laborMode = oneOf(fd, "laborMode", Object.values(LaborMode)) ?? "HOURLY";
  let laborRateCents = cents(fd, "laborRate");
  if (laborMode === "HOURLY" && laborRateCents === null) {
    const [tech, settings] = await Promise.all([
      technicianId ? prisma.technician.findUnique({ where: { id: technicianId } }) : null,
      prisma.settings.findUnique({ where: { id: 1 } }),
    ]);
    laborRateCents = tech?.hourlyRateCents ?? settings?.defaultHourlyRateCents ?? 0;
  }
  const laborFixedCents = cents(fd, "laborFixed");
  if (laborMode === "FIXED" && laborFixedCents === null) throw new FormError("Indique el importe de la mano de obra a precio cerrado.");

  const discountPercent = num(fd, "discountPercent") ?? 0;
  if (discountPercent < 0 || discountPercent > 100) throw new FormError("El descuento debe estar entre 0 y 100 %.");

  return {
    patientId,
    customerName: patientId ? null : customerName,
    customerPhone: patientId ? null : str(fd, "customerPhone"),
    productId,
    equipmentCategory,
    equipmentBrand: str(fd, "equipmentBrand") ?? product?.brand ?? null,
    equipmentModel: str(fd, "equipmentModel") ?? product?.model ?? null,
    serialNumber: str(fd, "serialNumber") ?? product?.serialNumber ?? null,
    accessories: str(fd, "accessories"),
    serviceType,
    priority: oneOf(fd, "priority", Object.values(Priority)) ?? "NORMAL",
    underWarranty: bool(fd, "underWarranty"),
    reportedIssue: required(fd, "reportedIssue", "Avería / motivo de entrada"),
    diagnosis: str(fd, "diagnosis"),
    workDone: str(fd, "workDone"),
    internalNotes: str(fd, "internalNotes"),
    technicianId,
    laborMode,
    laborRateCents,
    laborFixedCents,
    discountPercent,
    taxRate: num(fd, "taxRate") ?? 21,
    promisedAt: date(fd, "promisedAt"),
  };
}

export async function createWorkOrder(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const res = await handle(async () => {
    const data = await workOrderData(fd);
    const wo = await prisma.workOrder.create({
      data: {
        ...data,
        code: await nextCode(),
        receivedAt: date(fd, "receivedAt") ?? new Date(),
        statusHistory: { create: { toStatus: "RECEIVED" } },
      },
    });
    id = wo.id;
  });
  if (res?.error) return res;
  refresh(id);
  redirect(`/taller/${id}`);
}

export async function updateWorkOrder(id: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const data = await workOrderData(fd);
    await prisma.workOrder.update({ where: { id }, data: { ...data, receivedAt: date(fd, "receivedAt") ?? undefined } });
  });
  if (res?.error) return res;
  refresh(id);
  redirect(`/taller/${id}`);
}

// ── Flujo de estados ────────────────────────────────────────────────────────

const INTERVENTION_BY_SERVICE: Record<ServiceType, InterventionType> = {
  GENERAL_REPAIR: "REPAIR",
  PREVENTIVE_MAINTENANCE: "MAINTENANCE",
  BATTERY_REPLACEMENT: "REPAIR",
  CLEANING_DISINFECTION: "MAINTENANCE",
  CUSTOM_ADJUSTMENT: "ADJUSTMENT",
  WARRANTY: "WARRANTY_CLAIM",
};

/** Transiciones permitidas: avanzar o retroceder un paso, anular y reactivar. */
function canTransition(from: WorkOrderStatus, to: WorkOrderStatus) {
  if (from === to) return false;
  if (to === "CANCELLED") return from !== "DELIVERED";
  if (from === "CANCELLED") return to === "RECEIVED";
  if (from === "DELIVERED") return false;
  return Math.abs(WORK_ORDER_FLOW.indexOf(to) - WORK_ORDER_FLOW.indexOf(from)) === 1;
}

export async function changeStatus(id: string, to: WorkOrderStatus, fd: FormData) {
  if (!Object.values(WorkOrderStatus).includes(to)) return;
  const note = str(fd, "note");
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.findUniqueOrThrow({ where: { id } });
    if (!canTransition(wo.status, to)) return;

    await tx.workOrder.update({
      where: { id },
      data: {
        status: to,
        completedAt: to === "READY" ? (wo.completedAt ?? now) : WORK_ORDER_FLOW.indexOf(to) < WORK_ORDER_FLOW.indexOf("READY") ? null : undefined,
        deliveredAt: to === "DELIVERED" ? now : undefined,
      },
    });
    await tx.workOrderStatusChange.create({ data: { workOrderId: id, fromStatus: wo.status, toStatus: to, note } });

    if (to === "READY" || to === "DELIVERED" || to === "CANCELLED") {
      // Cierra cronómetros que se quedaran en marcha
      const running = await tx.timeEntry.findMany({ where: { workOrderId: id, endedAt: null } });
      for (const t of running) {
        await tx.timeEntry.update({ where: { id: t.id }, data: { endedAt: now, minutes: Math.max(1, Math.round((now.getTime() - t.startedAt.getTime()) / 60_000)) } });
      }
    }

    // Al entregar un equipo trazado, la intervención queda en el histórico de su nº de serie
    if (to === "DELIVERED" && wo.productId) {
      const exists = await tx.productIntervention.findFirst({ where: { workOrderId: id } });
      if (!exists) {
        await tx.productIntervention.create({
          data: {
            productId: wo.productId,
            workOrderId: id,
            type: wo.underWarranty ? "WARRANTY_CLAIM" : INTERVENTION_BY_SERVICE[wo.serviceType],
            date: now,
            description: `${wo.code} · ${wo.workDone ?? wo.diagnosis ?? wo.reportedIssue}`,
            underWarranty: wo.underWarranty,
            technicianId: wo.technicianId,
          },
        });
      }
    }
  });
  refresh(id);
}

// ── Piezas y materiales ─────────────────────────────────────────────────────

export async function addPart(workOrderId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const category = oneOf(fd, "category", Object.values(PartCategory));
    if (!category) throw new FormError("Seleccione la categoría de la pieza.");
    const quantity = num(fd, "quantity") ?? 1;
    if (quantity <= 0) throw new FormError("La cantidad debe ser mayor que cero.");
    const unitPriceCents = cents(fd, "unitPrice");
    if (unitPriceCents === null) throw new FormError("Indique el precio de venta por unidad.");
    await prisma.workOrderPart.create({
      data: {
        workOrderId,
        category,
        description: required(fd, "description", "Descripción"),
        reference: str(fd, "reference"),
        quantity,
        unit: str(fd, "unit") ?? "ud",
        unitPriceCents,
        unitCostCents: cents(fd, "unitCost") ?? 0,
      },
    });
  });
  if (!res?.error) refresh(workOrderId);
  return res;
}

export async function deletePart(workOrderId: string, partId: string) {
  await prisma.workOrderPart.delete({ where: { id: partId, workOrderId } });
  refresh(workOrderId);
}

// ── Tiempo del técnico ──────────────────────────────────────────────────────

export async function startTimer(workOrderId: string, fd: FormData) {
  const technicianId = str(fd, "technicianId");
  const running = await prisma.timeEntry.findFirst({ where: { workOrderId, endedAt: null, technicianId } });
  if (!running) await prisma.timeEntry.create({ data: { workOrderId, technicianId, startedAt: new Date() } });
  // Si la orden estaba en diagnóstico o presupuestada, empezar a trabajar no cambia el estado: se hace a mano.
  refresh(workOrderId);
}

export async function stopTimer(workOrderId: string, entryId: string) {
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId, workOrderId } });
  if (entry && !entry.endedAt) {
    const endedAt = new Date();
    await prisma.timeEntry.update({
      where: { id: entryId },
      data: { endedAt, minutes: Math.max(1, Math.round((endedAt.getTime() - entry.startedAt.getTime()) / 60_000)) },
    });
  }
  refresh(workOrderId);
}

export async function addManualTime(workOrderId: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const hours = num(fd, "hours") ?? 0;
    const mins = num(fd, "minutes") ?? 0;
    const total = Math.round(hours * 60 + mins);
    if (total <= 0) throw new FormError("Indique el tiempo trabajado.");
    if (total > 24 * 60) throw new FormError("Un registro no puede superar 24 horas.");
    const day = date(fd, "date") ?? new Date();
    const startedAt = new Date(day);
    await prisma.timeEntry.create({
      data: {
        workOrderId,
        technicianId: str(fd, "technicianId"),
        startedAt,
        endedAt: new Date(startedAt.getTime() + total * 60_000),
        minutes: total,
        description: str(fd, "description"),
      },
    });
  });
  if (!res?.error) refresh(workOrderId);
  return res;
}

export async function deleteTimeEntry(workOrderId: string, entryId: string) {
  await prisma.timeEntry.delete({ where: { id: entryId, workOrderId } });
  refresh(workOrderId);
}
