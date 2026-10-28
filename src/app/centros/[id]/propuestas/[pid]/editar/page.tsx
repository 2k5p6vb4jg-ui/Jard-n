import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { centerProductsForSelect } from "@/lib/centers";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProposalForm } from "@/components/centers/ProposalForm";
import { saveProposal } from "../../../../propuestas";

export const metadata = { title: "Editar propuesta" };

export default async function EditProposalPage({ params }: { params: Promise<{ id: string; pid: string }> }) {
  const { id, pid } = await params;
  const [proposal, products] = await Promise.all([
    prisma.centerProposal.findFirst({ where: { id: pid, centerId: id }, include: { products: { select: { id: true } }, center: { select: { name: true } } } }),
    centerProductsForSelect(id),
  ]);
  if (!proposal) notFound();
  return (
    <>
      <PageHeader eyebrow={proposal.center.name} title={`Editar ${proposal.number}`} />
      <ProposalForm action={saveProposal.bind(null, id, pid)} proposal={proposal} products={products} defaultTaxRate={proposal.taxRate} cancelHref={`/centros/${id}/propuestas/${pid}`} />
    </>
  );
}
