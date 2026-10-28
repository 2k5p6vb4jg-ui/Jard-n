import { notFound } from "next/navigation";
import type { ProposalKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { proposalKind } from "@/lib/labels";
import { centerProductsForSelect } from "@/lib/centers";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProposalForm } from "@/components/centers/ProposalForm";
import { saveProposal } from "../../../propuestas";

export const metadata = { title: "Nueva propuesta" };

export default async function NewProposalPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tipo?: string; equipos?: string; titulo?: string }> }) {
  const { id } = await params;
  const { tipo, equipos, titulo } = await searchParams;
  const [center, products, settings] = await Promise.all([
    prisma.center.findUnique({ where: { id }, select: { name: true } }),
    centerProductsForSelect(id),
    prisma.settings.findUnique({ where: { id: 1 }, select: { defaultTaxRate: true } }),
  ]);
  if (!center) notFound();
  const kind = tipo && tipo in proposalKind ? (tipo as ProposalKind) : undefined;
  return (
    <>
      <PageHeader eyebrow={center.name} title="Nueva propuesta" description="Pack de venta o contrato, con PDF para entregar al centro" />
      <ProposalForm
        action={saveProposal.bind(null, id, null)}
        products={products}
        defaults={{ kind, productIds: equipos?.split(",").filter(Boolean), title: titulo }}
        defaultTaxRate={settings?.defaultTaxRate ?? 21}
        cancelHref={`/centros/${id}`}
      />
    </>
  );
}
