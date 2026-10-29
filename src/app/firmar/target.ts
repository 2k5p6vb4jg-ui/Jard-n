import "server-only";
import type { SignatureKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import { proposalKind } from "@/lib/labels";
import { consentText } from "@/lib/signatures";
import type { Section } from "@/lib/permissions";

/** Qué se firma: resumen para la pantalla de firma y adónde volver. */
export interface SignTarget {
  title: string;
  rows: [string, string][];
  text?: string;
  signer: string;
  signerDni?: string | null;
  back: string;
  section?: Section;
  /** Presupuesto o propuesta aún sin aceptar: casilla «aceptado» */
  canAccept?: boolean;
  marketingOptIn?: boolean;
  previous?: { signerName: string; signedAt: Date } | null;
  ids: { workOrderId?: string; quoteId?: string; proposalId?: string; patientId?: string };
}

const RECEIPT_TEXT =
  "Entrego el equipo descrito para su revisión o reparación. Se me comunicará el presupuesto antes de realizar cualquier " +
  "reparación con coste. Los equipos no retirados en 3 meses desde el aviso de finalización podrán generar gastos de almacenaje.";

export async function loadSignTarget(kind: SignatureKind, id: string): Promise<SignTarget | null> {
  switch (kind) {
    case "RECEIPT": {
      const o = await prisma.workOrder.findUnique({
        where: { id },
        include: { patient: true, equipmentCategory: { select: { label: true } }, signatures: { orderBy: { signedAt: "desc" }, take: 1 } },
      });
      if (!o) return null;
      return {
        title: `Resguardo de entrada ${o.code}`,
        rows: [
          ["Equipo", [o.equipmentCategory.label, o.equipmentBrand, o.equipmentModel].filter(Boolean).join(" · ")],
          ["Nº de serie", o.serialNumber ?? "—"],
          ["Accesorios", o.accessories ?? "Ninguno"],
          ["Avería indicada", o.reportedIssue],
          ["Entrada", formatDate(o.receivedAt)],
        ],
        text: RECEIPT_TEXT,
        signer: o.patient ? `${o.patient.firstName} ${o.patient.lastName}` : (o.customerName ?? ""),
        signerDni: o.patient?.dni,
        back: `/taller/${o.id}`,
        previous: o.signatures[0] ?? null,
        ids: { workOrderId: o.id, patientId: o.patientId ?? undefined },
      };
    }
    case "QUOTE": {
      const q = await prisma.quote.findUnique({ where: { id }, include: { signature: true, workOrder: { include: { patient: true } } } });
      if (!q) return null;
      const p = q.workOrder.patient;
      return {
        title: `Presupuesto ${q.number}`,
        rows: [
          ["Orden de taller", q.workOrder.code],
          ["Total (IVA incluido)", formatEUR(q.totalCents)],
          ["Válido hasta", formatDate(q.validUntil)],
        ],
        text: "Doy mi conformidad al presupuesto indicado y autorizo la reparación.",
        signer: p ? `${p.firstName} ${p.lastName}` : (q.workOrder.customerName ?? ""),
        signerDni: p?.dni,
        back: `/taller/${q.workOrderId}`,
        canAccept: q.status !== "ACCEPTED" && q.status !== "REJECTED",
        previous: q.signature,
        ids: { quoteId: q.id, workOrderId: q.workOrderId, patientId: q.workOrder.patientId ?? undefined },
      };
    }
    case "PROPOSAL": {
      const p = await prisma.centerProposal.findUnique({ where: { id }, include: { signature: true, center: { include: { contacts: { take: 1 } } } } });
      if (!p) return null;
      return {
        title: `Propuesta ${p.number}`,
        rows: [
          ["Centro", p.center.name],
          ["Tipo", proposalKind[p.kind].label],
          ["Propuesta", p.title],
          ["Total (IVA incluido)", formatEUR(p.totalCents)],
        ],
        text: "En nombre del centro, acepto la propuesta en las condiciones indicadas.",
        signer: p.center.contacts[0]?.name ?? "",
        back: `/centros/${p.centerId}/propuestas/${p.id}`,
        section: "centros",
        canAccept: p.status !== "ACCEPTED" && p.status !== "REJECTED",
        previous: p.signature,
        ids: { proposalId: p.id },
      };
    }
    case "CONSENT": {
      const [p, settings] = await Promise.all([
        prisma.patient.findUnique({ where: { id }, include: { signatures: { where: { kind: "CONSENT" }, orderBy: { signedAt: "desc" }, take: 1 } } }),
        prisma.settings.findUnique({ where: { id: 1 } }),
      ]);
      if (!p) return null;
      return {
        title: "Consentimiento para el tratamiento de datos",
        rows: [
          ["Cliente", `${p.firstName} ${p.lastName}`],
          ...(p.dni ? [["DNI / NIE", p.dni] as [string, string]] : []),
        ],
        text: consentText(settings),
        signer: `${p.firstName} ${p.lastName}`,
        signerDni: p.dni,
        back: `/pacientes/${p.id}`,
        section: "clientes",
        marketingOptIn: p.marketingOptIn,
        previous: p.signatures[0] ?? null,
        ids: { patientId: p.id },
      };
    }
  }
}
