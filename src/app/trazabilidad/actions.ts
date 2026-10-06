"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { EquipmentCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addMonths } from "@/lib/dates";
import { type ActionState, bool, cents, date, FormError, handle, int, oneOf, required, str } from "@/lib/forms";

function productData(fd: FormData) {
  const category = oneOf(fd, "category", Object.values(EquipmentCategory));
  if (!category) throw new FormError("Indique la categoría del producto.");
  const warrantyMonths = int(fd, "warrantyMonths") ?? 24;
  if (warrantyMonths < 0 || warrantyMonths > 120) throw new FormError("La garantía debe estar entre 0 y 120 meses.");
  const deliveredAt = date(fd, "deliveredAt");
  return {
    serialNumber: required(fd, "serialNumber", "Número de serie").toUpperCase(),
    lotNumber: str(fd, "lotNumber"),
    udi: str(fd, "udi"),
    category,
    brand: required(fd, "brand", "Marca"),
    model: required(fd, "model", "Modelo"),
    description: str(fd, "description"),
    supplier: str(fd, "supplier"),
    manufacturedAt: date(fd, "manufacturedAt"),
    patientId: str(fd, "patientId"),
    purchasePriceCents: cents(fd, "purchasePrice"),
    salePriceCents: cents(fd, "salePrice"),
    isPublicHealth: bool(fd, "isPublicHealth"),
    deliveredAt,
    warrantyMonths,
    warrantyUntil: deliveredAt ? addMonths(deliveredAt, warrantyMonths) : null,
    nextServiceAt: date(fd, "nextServiceAt"),
    notes: str(fd, "notes"),
  };
}

export async function saveProduct(productId: string | null, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const res = await handle(async () => {
    const data = productData(fd);
    if (productId) {
      await prisma.trackedProduct.update({ where: { id: productId }, data });
      return;
    }
    await prisma.trackedProduct.create({
      data: {
        ...data,
        // La entrega inicial abre el histórico del nº de serie
        interventions: data.deliveredAt
          ? { create: { type: "DELIVERY", date: data.deliveredAt, description: "Entrega al paciente." } }
          : undefined,
      },
    });
  });
  if (res?.error) return res;
  revalidatePath("/trazabilidad");
  redirect(`/trazabilidad?q=${encodeURIComponent(required(fd, "serialNumber", "Número de serie").toUpperCase())}`);
}
