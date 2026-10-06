const eur = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

/** Importes guardados en céntimos → "1.234,56 €" */
export function formatEUR(cents: number | null | undefined): string {
  return eur.format((cents ?? 0) / 100);
}

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

export interface WorkOrderTotalsInput {
  parts: { quantity: number; unitPriceCents: number }[];
  laborMode: "HOURLY" | "FIXED";
  laborRateCents: number;
  laborFixedCents?: number | null;
  minutesWorked: number;
  discountPercent: number;
  taxRate: number;
}

/** Desglose de costes de una orden de taller (lo usa la ficha y el PDF de presupuesto). */
export function computeWorkOrderTotals(i: WorkOrderTotalsInput) {
  const partsCents = Math.round(i.parts.reduce((s, p) => s + p.quantity * p.unitPriceCents, 0));
  const laborCents =
    i.laborMode === "FIXED"
      ? (i.laborFixedCents ?? 0)
      : Math.round((i.minutesWorked / 60) * i.laborRateCents);
  const gross = partsCents + laborCents;
  const discountCents = Math.round(gross * (i.discountPercent / 100));
  const subtotalCents = gross - discountCents;
  const taxCents = Math.round(subtotalCents * (i.taxRate / 100));
  return { partsCents, laborCents, discountCents, subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}
