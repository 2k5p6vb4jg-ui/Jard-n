import { prisma } from "./prisma";
import { addDays, daysBetween } from "./dates";
import { insoleMaterial } from "./labels";

export type RenewalKind = "INSOLE" | "STOCKING";

export interface RenewalAlert {
  id: string;
  kind: RenewalKind;
  patientId: string;
  patientName: string;
  phone: string | null;
  detail: string;
  deliveredAt: Date | null;
  nextReviewAt: Date;
  /** Negativo = vencido hace N días */
  daysLeft: number;
  severity: "overdue" | "soon";
}

/**
 * Avisos de renovación para el panel principal:
 *  - Medias de compresión: 6 meses desde la entrega.
 *  - Plantillas a medida: 12 meses desde la entrega.
 * Se incluyen las vencidas y las que vencen en los próximos `renewalWarningDays`.
 */
export async function getRenewalAlerts(now = new Date()): Promise<RenewalAlert[]> {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const horizon = addDays(now, settings?.renewalWarningDays ?? 30);
  const where = {
    status: "DELIVERED" as const,
    renewalStatus: { in: ["PENDING" as const, "CONTACTED" as const] },
    nextReviewAt: { lte: horizon },
    patient: { archivedAt: null },
  };
  const patientSelect = { select: { id: true, firstName: true, lastName: true, phone: true } };

  const [insoles, stockings] = await Promise.all([
    prisma.insolePrescription.findMany({ where, include: { patient: patientSelect } }),
    prisma.compressionStocking.findMany({ where, include: { patient: patientSelect } }),
  ]);

  const toAlert = (
    kind: RenewalKind,
    r: { id: string; deliveredAt: Date | null; nextReviewAt: Date | null; patient: { id: string; firstName: string; lastName: string; phone: string | null } },
    detail: string,
  ): RenewalAlert => {
    const daysLeft = daysBetween(now, r.nextReviewAt!);
    return {
      id: r.id,
      kind,
      patientId: r.patient.id,
      patientName: `${r.patient.firstName} ${r.patient.lastName}`,
      phone: r.patient.phone,
      detail,
      deliveredAt: r.deliveredAt,
      nextReviewAt: r.nextReviewAt!,
      daysLeft,
      severity: daysLeft < 0 ? "overdue" : "soon",
    };
  };

  return [
    ...insoles.map((r) => toAlert("INSOLE", r, `Plantillas ${insoleMaterial[r.material]}${r.shoreDensity ? ` ${r.shoreDensity}º` : ""}`)),
    ...stockings.map((r) => toAlert("STOCKING", r, `Medias ${r.compressionClass}`)),
  ].sort((a, b) => a.daysLeft - b.daysLeft);
}
