import "server-only";
import type { Settings } from "@prisma/client";
import { formatEUR } from "../money";
import { formatDate } from "../dates";
import type { QuoteLine } from "../quotes";
import { renderCommercialPdf } from "./commercialPdf";
import type { PdfSignature } from "../signatures";

export interface QuotePdfData {
  settings: Settings | null;
  /** Logo PNG/JPG ya leído del disco */
  logo?: { bytes: Uint8Array; type: "png" | "jpg" } | null;
  quote: {
    number: string;
    issuedAt: Date;
    validUntil: Date;
    partsCents: number;
    laborCents: number;
    discountCents: number;
    subtotalCents: number;
    taxRate: number;
    taxCents: number;
    totalCents: number;
    notes: string | null;
    lines: QuoteLine[];
  };
  order: {
    code: string;
    equipment: string;
    serialNumber: string | null;
    service: string;
    reportedIssue: string;
    diagnosis: string | null;
    underWarranty: boolean;
  };
  customer: { name: string; dni?: string | null; phone?: string | null; address?: string | null; email?: string | null };
  signature?: PdfSignature | null;
}

/** Presupuesto de una orden de taller. */
export async function renderQuotePdf(data: QuotePdfData): Promise<Uint8Array> {
  const businessName = data.settings?.businessName ?? "Ortopedia";
  const q = data.quote;
  const c = data.customer;
  const validityDays = Math.round((q.validUntil.getTime() - q.issuedAt.getTime()) / 86_400_000);
  return renderCommercialPdf({
    settings: data.settings,
    logo: data.logo,
    docType: "PRESUPUESTO",
    number: q.number,
    meta: [
      ["Número", q.number],
      ["Fecha", formatDate(q.issuedAt)],
      ["Válido hasta", formatDate(q.validUntil)],
      ["Orden de taller", data.order.code],
    ],
    blocks: [
      { title: "Cliente", rows: [c.name, c.dni ? `DNI/NIE: ${c.dni}` : "", c.phone ? `Tel. ${c.phone}` : "", c.email ?? "", c.address ?? ""] },
      {
        title: "Equipo",
        rows: [
          data.order.equipment,
          data.order.serialNumber ? `Nº de serie: ${data.order.serialNumber}` : "",
          `Servicio: ${data.order.service}${data.order.underWarranty && !/garant/i.test(data.order.service) ? " (en garantía)" : ""}`,
        ],
      },
    ],
    before: [{ title: "Motivo de entrada", body: data.order.reportedIssue }, ...(data.order.diagnosis ? [{ title: "Diagnóstico técnico", body: data.order.diagnosis }] : [])],
    lines: q.lines.map((l) => ({ ...l, strong: l.kind === "labor" })),
    totals: [
      { label: "Piezas y materiales", value: formatEUR(q.partsCents) },
      { label: "Mano de obra", value: formatEUR(q.laborCents) },
      ...(q.discountCents > 0 ? [{ label: "Descuento", value: `-${formatEUR(q.discountCents)}` }] : []),
      { label: "Base imponible", value: formatEUR(q.subtotalCents), strong: true },
      { label: `IVA (${q.taxRate.toLocaleString("es-ES")} %)`, value: formatEUR(q.taxCents) },
    ],
    grandTotal: { label: "TOTAL", value: formatEUR(q.totalCents) },
    after: [
      ...(q.notes ? [{ title: "Observaciones", body: q.notes }] : []),
      {
        title: "Validez",
        body:
          `Este presupuesto tiene una validez de ${validityDays} días, hasta el ${formatDate(q.validUntil)}. ` +
          "Los precios incluyen el IVA indicado. Cualquier trabajo adicional no previsto se comunicará antes de realizarse.",
      },
    ],
    signatures: ["Conforme del cliente (firma y fecha)", `Por ${businessName}`],
    signatureImages: [data.signature ?? null],
  });
}
