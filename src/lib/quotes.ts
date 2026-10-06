import { computeWorkOrderTotals } from "./money";

/** Línea congelada en Quote.linesJson: el PDF se puede reimprimir idéntico aunque cambie la orden. */
export interface QuoteLine {
  kind: "part" | "labor";
  description: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
  totalCents: number;
}

export interface QuoteSnapshot {
  lines: QuoteLine[];
  partsCents: number;
  laborCents: number;
  discountCents: number;
  discountPercent: number;
  subtotalCents: number;
  taxRate: number;
  taxCents: number;
  totalCents: number;
}

export function buildQuoteSnapshot(input: {
  parts: { description: string; quantity: number; unit: string; unitPriceCents: number }[];
  laborMode: "HOURLY" | "FIXED";
  laborRateCents: number;
  laborFixedCents: number | null;
  laborMinutes: number;
  discountPercent: number;
  taxRate: number;
}): QuoteSnapshot {
  const totals = computeWorkOrderTotals({
    parts: input.parts,
    laborMode: input.laborMode,
    laborRateCents: input.laborRateCents,
    laborFixedCents: input.laborFixedCents,
    minutesWorked: input.laborMinutes,
    discountPercent: input.discountPercent,
    taxRate: input.taxRate,
  });

  const lines: QuoteLine[] = input.parts.map((p) => ({
    kind: "part",
    description: p.description,
    quantity: p.quantity,
    unit: p.unit,
    unitPriceCents: p.unitPriceCents,
    totalCents: Math.round(p.quantity * p.unitPriceCents),
  }));

  if (totals.laborCents > 0) {
    const hours = Math.round((input.laborMinutes / 60) * 100) / 100;
    lines.push(
      input.laborMode === "FIXED"
        ? { kind: "labor", description: "Mano de obra (precio cerrado)", quantity: 1, unit: "ud", unitPriceCents: totals.laborCents, totalCents: totals.laborCents }
        : { kind: "labor", description: "Mano de obra del técnico", quantity: hours, unit: "h", unitPriceCents: input.laborRateCents, totalCents: totals.laborCents },
    );
  }

  return { lines, ...totals, discountPercent: input.discountPercent, taxRate: input.taxRate };
}

export function parseQuoteLines(json: string): QuoteLine[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed?.lines) ? parsed.lines : [];
  } catch {
    return [];
  }
}

/** Un presupuesto enviado o en borrador cuya validez ya pasó se muestra como caducado. */
export function effectiveQuoteStatus<T extends { status: string; validUntil: Date }>(q: T, now = new Date()) {
  return (q.status === "DRAFT" || q.status === "SENT") && q.validUntil < now ? "EXPIRED" : q.status;
}
