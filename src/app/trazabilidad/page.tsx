import Link from "next/link";
import { ClipboardPlus, Pencil, Plus, ScanBarcode, Search, ShieldCheck, ShieldOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { equipmentCategory, interventionType } from "@/lib/labels";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";

export const metadata = { title: "Trazabilidad" };

export default async function TraceabilityPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim();
  const products = await prisma.trackedProduct.findMany({
    where: term
      ? { OR: [{ serialNumber: { contains: term } }, { lotNumber: { contains: term } }, { model: { contains: term } }, { brand: { contains: term } }] }
      : undefined,
    include: {
      patient: { select: { firstName: true, lastName: true } },
      interventions: { orderBy: { date: "desc" } },
    },
    orderBy: { deliveredAt: "desc" },
  });
  const now = new Date();

  return (
    <>
      <PageHeader title="Trazabilidad" description="Productos de alto valor por número de serie" actions={<LinkButton href="/trazabilidad/nuevo" icon={Plus}>Nuevo producto</LinkButton>} />
      <form className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <input name="q" defaultValue={q} placeholder="Nº de serie, lote, marca o modelo…" className="field pl-12" />
      </form>
      {products.length === 0 ? (
        <Card><EmptyState icon={ScanBarcode} title="Sin productos" /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {products.map((p) => {
            const inWarranty = p.warrantyUntil && p.warrantyUntil > now;
            return (
              <Card key={p.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-slate-500">{equipmentCategory[p.category]}</p>
                    <p className="text-lg font-semibold text-slate-900">{p.brand} {p.model}</p>
                  </div>
                  {inWarranty ? (
                    <Badge tone="emerald"><ShieldCheck className="size-3.5" />Garantía hasta {formatDate(p.warrantyUntil)}</Badge>
                  ) : (
                    <Badge tone="slate"><ShieldOff className="size-3.5" />Fuera de garantía</Badge>
                  )}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-50 px-3 py-2"><dt className="text-xs text-slate-500">Nº de serie</dt><dd className="font-mono font-medium">{p.serialNumber}</dd></div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2"><dt className="text-xs text-slate-500">Lote</dt><dd className="font-mono font-medium">{p.lotNumber ?? "—"}</dd></div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2"><dt className="text-xs text-slate-500">Entrega</dt><dd className="font-medium">{formatDate(p.deliveredAt)}</dd></div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2"><dt className="text-xs text-slate-500">Paciente</dt><dd className="truncate font-medium">{p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : "—"}</dd></div>
                </dl>
                <ol className="mt-4 space-y-2 border-l-2 border-teal-100 pl-4 text-sm">
                  {p.interventions.map((i) => (
                    <li key={i.id}>
                      <span className="font-medium text-slate-700">{interventionType[i.type]}</span>
                      <span className="text-slate-400"> · {formatDate(i.date)}</span>
                      <p className="text-slate-500">{i.description}</p>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  <Link href={`/trazabilidad/${p.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50">
                    <Pencil className="size-4" /> Editar
                  </Link>
                  <Link href={`/taller/nueva?producto=${p.id}${p.patientId ? `&paciente=${p.patientId}` : ""}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-medium text-teal-700 ring-1 ring-inset ring-teal-200 hover:bg-teal-50">
                    <ClipboardPlus className="size-4" /> Entrada al taller
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
