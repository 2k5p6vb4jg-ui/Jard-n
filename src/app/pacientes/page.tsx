import Link from "next/link";
import { ChevronRight, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { searchPatients } from "@/lib/search";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Cell, Row, RowLink, Table } from "@/components/ui/Table";

export const metadata = { title: "Clientes" };

function Avatar({ first, last }: { first: string; last: string }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-teal-50 text-sm font-semibold text-teal-700 ring-1 ring-inset ring-teal-100">
      {first[0]}
      {last[0]}
    </span>
  );
}

function Activity({ c }: { c: { workOrders: number; insoleOrders: number; stockings: number } }) {
  return (
    <span className="inline-flex flex-wrap justify-end gap-1.5">
      {c.workOrders > 0 && <Badge tone="slate">Reparaciones · {c.workOrders}</Badge>}
      {c.insoleOrders > 0 && <Badge tone="teal">Plantillas · {c.insoleOrders}</Badge>}
      {c.stockings > 0 && <Badge tone="gold">Medias · {c.stockings}</Badge>}
    </span>
  );
}

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string; eliminado?: string }> }) {
  const { q = "", eliminado } = await searchParams;
  const patients = await searchPatients(q);

  return (
    <>
      <PageHeader
        title="Clientes"
        description={`${patients.length} fichas`}
        actions={<LinkButton href="/pacientes/nuevo" icon={UserPlus}>Nuevo cliente</LinkButton>}
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
          <>
            <Table head={["Cliente", "DNI / NIE", "Teléfono", "Localidad", { label: "Historial", className: "text-right" }]}>
              {patients.map((p) => (
                <Row key={p.id}>
                  <Cell>
                    <RowLink href={`/pacientes/${p.id}`} className="flex items-center gap-3">
                      <Avatar first={p.firstName} last={p.lastName} />
                      <span className="font-medium text-slate-800">{p.lastName}, {p.firstName}</span>
                    </RowLink>
                  </Cell>
                  <Cell className="whitespace-nowrap font-mono text-xs text-slate-500">{p.dni ?? "—"}</Cell>
                  <Cell className="whitespace-nowrap text-slate-600">{p.phone ?? "—"}</Cell>
                  <Cell className="text-slate-500">{p.city ?? "—"}</Cell>
                  <Cell className="text-right"><Activity c={p._count} /></Cell>
                </Row>
              ))}
            </Table>
            <ul className="divide-y divide-slate-100 md:hidden">
              {patients.map((p) => (
                <li key={p.id}>
                  <Link href={`/pacientes/${p.id}`} className="flex min-h-16 items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <Avatar first={p.firstName} last={p.lastName} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-800">{p.lastName}, {p.firstName}</p>
                      <p className="truncate text-sm text-slate-500">{[p.phone, p.city].filter(Boolean).join(" · ") || "Sin teléfono"}</p>
                    </div>
                    <ChevronRight className="size-5 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
