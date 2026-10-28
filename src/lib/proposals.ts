import type { BillingPeriod } from "@prisma/client";
import { billingPeriod } from "./labels";

/** Línea de una propuesta: importe por periodo de facturación (o total si es pago único). */
export interface ProposalLine {
  description: string;
  quantity: number;
  unit: string;
  unitPriceCents: number;
}

export function parseProposalLines(json: string): ProposalLine[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function proposalTotals(lines: ProposalLine[], discountPercent: number, taxRate: number) {
  const grossCents = lines.reduce((s, l) => s + Math.round(l.quantity * l.unitPriceCents), 0);
  const discountCents = Math.round(grossCents * (discountPercent / 100));
  const subtotalCents = grossCents - discountCents;
  const taxCents = Math.round(subtotalCents * (taxRate / 100));
  return { grossCents, discountCents, subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

/** Importe total del contrato en toda su duración (null si es pago único o no tiene duración). */
export function contractValueCents(p: { totalCents: number; billingPeriod: BillingPeriod; durationMonths: number | null }) {
  const months = billingPeriod[p.billingPeriod].months;
  if (!months || !p.durationMonths) return null;
  return Math.round((p.durationMonths / months) * p.totalCents);
}
