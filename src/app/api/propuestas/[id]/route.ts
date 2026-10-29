import { prisma } from "@/lib/prisma";
import { loadLogo } from "@/lib/branding";
import { formatDate } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import { billingPeriod, proposalKind } from "@/lib/labels";
import { contractValueCents, parseProposalLines, proposalTotals } from "@/lib/proposals";
import { renderCommercialPdf } from "@/lib/pdf/commercialPdf";
import { pdfSignature } from "@/lib/signatures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PDF de una propuesta a un centro (pack de venta o contrato). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await prisma.centerProposal.findUnique({
    where: { id },
    include: { signature: true, center: { include: { contacts: { orderBy: { createdAt: "asc" }, take: 1 } } }, products: { include: { category: { select: { label: true } } }, orderBy: { serialNumber: "asc" } } },
  });
  if (!p) return new Response("Propuesta no encontrada", { status: 404 });
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const businessName = settings?.businessName ?? "Ortopedia";
  const lines = parseProposalLines(p.linesJson);
  const t = proposalTotals(lines, p.discountPercent, p.taxRate);
  const bp = billingPeriod[p.billingPeriod];
  const contract = contractValueCents(p);
  const c = p.center;
  const contact = c.contacts[0];
  const validityDays = Math.round((p.validUntil.getTime() - p.issuedAt.getTime()) / 86_400_000);

  const bytes = await renderCommercialPdf({
    settings,
    logo: await loadLogo(settings?.logoPath),
    docType: "PROPUESTA",
    number: p.number,
    meta: [
      ["Número", p.number],
      ["Fecha", formatDate(p.issuedAt)],
      ["Válida hasta", formatDate(p.validUntil)],
      ["Tipo", proposalKind[p.kind].label],
    ],
    blocks: [
      {
        title: "Centro",
        rows: [
          c.name,
          c.taxId ? `CIF: ${c.taxId}` : "",
          [c.address, [c.postalCode, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
          contact ? `A la atención de: ${contact.name}${contact.role ? ` (${contact.role})` : ""}` : "",
        ],
      },
      {
        title: "Propuesta",
        rows: [
          p.title,
          `Facturación: ${bp.label.toLowerCase()}${p.durationMonths ? ` · duración ${p.durationMonths} meses` : ""}`,
          p.products.length ? `Equipos incluidos: ${p.products.length}${p.visitsPerYear ? ` · ${p.visitsPerYear} revisiones al año` : ""}` : "",
        ],
      },
    ],
    before: [
      ...(p.intro ? [{ title: "Presentación", body: p.intro }] : []),
      ...(p.products.length
        ? [{ title: "Equipos incluidos", body: p.products.map((pr) => `${pr.category.label} ${pr.brand} ${pr.model} (S/N ${pr.serialNumber})`).join("\n") }]
        : []),
    ],
    lines: lines.map((l) => ({ ...l, totalCents: Math.round(l.quantity * l.unitPriceCents) })),
    totals: [
      { label: "Suma de conceptos", value: formatEUR(t.grossCents) },
      ...(t.discountCents > 0 ? [{ label: `Descuento (${p.discountPercent.toLocaleString("es-ES")} %)`, value: `-${formatEUR(t.discountCents)}` }] : []),
      { label: "Base imponible", value: formatEUR(p.subtotalCents), strong: true },
      { label: `IVA (${p.taxRate.toLocaleString("es-ES")} %)`, value: formatEUR(p.taxCents) },
    ],
    grandTotal: { label: bp.per ? `TOTAL ${bp.per.toUpperCase()}` : "TOTAL", value: formatEUR(p.totalCents) },
    totalNote: contract != null ? `Importe total del contrato (${p.durationMonths} meses): ${formatEUR(contract)}` : undefined,
    after: [
      {
        title: "Validez y condiciones",
        body:
          `Esta propuesta tiene una validez de ${validityDays} días, hasta el ${formatDate(p.validUntil)}. Los precios incluyen el IVA indicado.` +
          (p.billingPeriod !== "ONE_OFF" ? ` El importe se factura ${bp.per}${p.durationMonths ? ` durante ${p.durationMonths} meses` : ""}.` : "") +
          (p.kind === "MAINTENANCE" ? " Las piezas o reparaciones no incluidas en las revisiones se presupuestarán aparte antes de realizarse." : ""),
      },
    ],
    signatures: ["Conforme del centro (firma, sello y fecha)", `Por ${businessName}`],
    signatureImages: [pdfSignature(p.signature)],
  });

  const download = new URL(req.url).searchParams.has("descargar");
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${p.number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
