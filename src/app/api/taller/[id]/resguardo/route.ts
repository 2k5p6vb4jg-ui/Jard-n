import { prisma } from "@/lib/prisma";
import { loadLogo } from "@/lib/branding";
import { equipmentCategory, serviceType } from "@/lib/labels";
import { renderReceiptPdf } from "@/lib/pdf/receiptPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Resguardo de entrada (PDF para imprimir y firmar al recibir el equipo). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [o, settings] = await Promise.all([
    prisma.workOrder.findUnique({ where: { id }, include: { patient: true } }),
    prisma.settings.findUnique({ where: { id: 1 } }),
  ]);
  if (!o) return new Response("Orden no encontrada", { status: 404 });

  const bytes = await renderReceiptPdf({
    settings,
    logo: await loadLogo(settings?.logoPath),
    order: {
      code: o.code,
      receivedAt: o.receivedAt,
      promisedAt: o.promisedAt,
      equipment: [equipmentCategory[o.equipmentCategory], o.equipmentBrand, o.equipmentModel].filter(Boolean).join(" · "),
      serialNumber: o.serialNumber,
      accessories: o.accessories,
      service: serviceType[o.serviceType],
      reportedIssue: o.reportedIssue,
      underWarranty: o.underWarranty,
    },
    customer: o.patient
      ? { name: `${o.patient.firstName} ${o.patient.lastName}`, phone: o.patient.phone, dni: o.patient.dni }
      : { name: o.customerName ?? "Cliente", phone: o.customerPhone },
  });
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="resguardo-${o.code}.pdf"`, "Cache-Control": "no-store" },
  });
}
