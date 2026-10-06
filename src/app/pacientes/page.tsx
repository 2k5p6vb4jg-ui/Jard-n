import Link from "next/link";
import { ChevronRight, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata = { title: "Pacientes" };

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string; eliminado?: string }> }) {
  const { q = "", eliminado } = await searchParams;
  const term = q.trim();
  const patients = await prisma.patient.findMany({
    where: {
      archivedAt: null,
      ...(term && {
        OR: [
          { firstName: { contains: term } },
          { lastName: { contains: term } },
          { dni: { contains: term.toUpperCase() } },
          { phone: { contains: term } },
        ],
      }),
    },
    include: { _count: { select: { insoles: true, stockings: true, documents: true, workOrders: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return (
    <>
      <PageHeader
        title="Pacientes"
        description={`${patients.length} fichas`}
        actions={<LinkButton href="/pacientes/nuevo" icon={UserPlus}>Nuevo paciente</LinkButton>}
      />
      {eliminado && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-emerald-800">
          <ShieldCheck className="size-5 shrink-0" />
          Datos del paciente suprimidos. Las órdenes de taller se han conservado anonimizadas.
        </p>
      )}
      <form className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <input name="q" defaultValue={q} placeholder="Buscar por nombre, DNI o teléfono…" className="field pl-12" />
      </form>
      <Card>
        {patients.length === 0 ? (
          <EmptyState icon={Users} title="Sin resultados" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {patients.map((p) => (
              <li key={p.id}>
                <Link href={`/pacientes/${p.id}`} className="flex min-h-16 items-center gap-4 px-5 py-3 hover:bg-slate-50">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-indigo-50 font-semibold text-indigo-600">
                    {p.firstName[0]}
                    {p.lastName[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">
                      {p.lastName}, {p.firstName}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {p.dni ?? "Sin DNI"} · {p.phone ?? "Sin teléfono"}
                    </p>
                  </div>
                  <div className="hidden flex-wrap justify-end gap-1.5 sm:flex">
                    {p._count.insoles > 0 && <Badge tone="indigo">Plantillas · {p._count.insoles}</Badge>}
                    {p._count.stockings > 0 && <Badge tone="teal">Medias · {p._count.stockings}</Badge>}
                    {p._count.workOrders > 0 && <Badge tone="amber">Taller · {p._count.workOrders}</Badge>}
                  </div>
                  <ChevronRight className="size-5 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
