import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { equipmentCategory, serviceType } from "@/lib/labels";
import { parseQuoteLines } from "@/lib/quotes";
import { renderQuotePdf } from "@/lib/pdf/quotePdf";
import { loadLogo } from "@/lib/branding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PDF del presupuesto, regenerado desde su instantánea (idéntico en cada descarga). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await prisma.quote.findUnique({ where: { id }, include: { workOrder: { include: { patient: true } } } });
  if (!quote) return new Response("Presupuesto no encontrado", { status: 404 });
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const o = quote.workOrder;
  const p = o.patient;

  const logo = await loadLogo(settings?.logoPath);

  const bytes = await renderQuotePdf({
    settings,
    logo,
    quote: { ...quote, lines: parseQuoteLines(quote.linesJson) },
    order: {
      code: o.code,
      equipment: [equipmentCategory[o.equipmentCategory], o.equipmentBrand, o.equipmentModel].filter(Boolean).join(" · "),
      serialNumber: o.serialNumber,
      service: serviceType[o.serviceType],
      reportedIssue: o.reportedIssue,
      diagnosis: o.diagnosis,
      underWarranty: o.underWarranty,
    },
    customer: p
      ? { name: `${p.firstName} ${p.lastName}`, dni: p.dni, phone: p.phone, email: p.email, address: [p.address, [p.postalCode, p.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") }
      : { name: o.customerName ?? "Cliente", phone: o.customerPhone },
  });

  await audit("EXPORT", "Quote", quote.id, quote.number);
  const download = new URL(req.url).searchParams.has("descargar");
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${quote.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
