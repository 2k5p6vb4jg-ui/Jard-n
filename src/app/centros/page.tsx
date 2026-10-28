import Link from "next/link";
import { Building2, ChevronRight, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEUR } from "@/lib/money";
import { centerStatusTone } from "@/lib/labels";
import { matcher } from "@/lib/search";
import { getCenterOptions, orderActivity, revenueSplit, twelveMonthsAgo } from "@/lib/centers";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Cell, chipClass, Row, RowLink, Table } from "@/components/ui/Table";

export const metadata = { title: "Centros" };

export default async function CentersPage({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string }> }) {
  const { q = "", tipo = "" } = await searchParams;
  const [centers, options, activity] = await Promise.all([
    prisma.center.findMany({
      include: { type: true, status: true, _count: { select: { patients: true, products: true } } },
      orderBy: { name: "asc" },
    }),
    getCenterOptions(),
    orderActivity({ onlyCenters: true }),
  ]);
  const since = twelveMonthsAgo();
  const m = matcher(q);
  const list = centers.filter((c) => (!tipo || c.typeId === tipo) && (!q.trim() || m(c.name, c.city, c.taxId, c.phone)));
  const stats = (id: string) => {
    const rows = activity.filter((r) => r.centerId === id);
    return { ...revenueSplit(rows.filter((r) => r.date >= since)), open: rows.filter((r) => r.open).length };
  };
  const usedTypes = options.types.filter((t) => centers.some((c) => c.typeId === t.id));

  return (
    <>
      <PageHeader
        title="Centros"
        description="Residencias, centros de día y otros centros: lo que nos piden y lo que nos llega a través de ellos"
        actions={<LinkButton href="/centros/nuevo" icon={Plus}>Nuevo centro</LinkButton>}
      />
      <form className="relative mb-4">
        {tipo && <input type="hidden" name="tipo" value={tipo} />}
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
        <input name="q" type="search" defaultValue={q} placeholder="Buscar por nombre, localidad, CIF o teléfono" aria-label="Buscar centros" className="field pl-12" />
      </form>
      {usedTypes.length > 1 && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          <Link href={{ pathname: "/centros", query: q ? { q } : {} }} className={chipClass(!tipo)}>Todos</Link>
          {usedTypes.map((t) => (
            <Link key={t.id} href={{ pathname: "/centros", query: { tipo: t.id, ...(q && { q }) } }} className={chipClass(tipo === t.id)}>{t.label}</Link>
          ))}
        </div>
      )}
      <Card>
        {list.length === 0 ? (
          <EmptyState icon={Building2} title={centers.length ? "Sin resultados" : "Aún no hay centros"} text={centers.length ? undefined : "Dé de alta las residencias y centros de día con los que trabaja o quiere trabajar."} />
        ) : (
          <>
            <Table head={["Centro", "Tipo", "Situación", { label: "Clientes", className: "text-right" }, { label: "Facturado 12 meses", className: "text-right" }, { label: "En curso", className: "text-right" }]}>
              {list.map((c) => {
                const s = stats(c.id);
                return (
                  <Row key={c.id}>
                    <Cell>
                      <RowLink href={`/centros/${c.id}`} className="block font-medium text-slate-800">{c.name}</RowLink>
                      <p className="text-xs text-slate-500">{[c.city, c.places && `${c.places} plazas`].filter(Boolean).join(" · ") || "—"}</p>
                    </Cell>
                    <Cell className="text-slate-600">{c.type.label}</Cell>
                    <Cell><Badge tone={centerStatusTone(c.status.key)}>{c.status.label}</Badge></Cell>
                    <Cell className="text-right text-slate-700">{c._count.patients}</Cell>
                    <Cell className="whitespace-nowrap text-right">
                      <p className="font-medium text-slate-800">{formatEUR(s.totalCents)}</p>
                      {s.totalCents > 0 && <p className="text-xs text-slate-500">{formatEUR(s.directCents)} directo</p>}
                    </Cell>
                    <Cell className="text-right text-slate-700">{s.open || "—"}</Cell>
                  </Row>
                );
              })}
            </Table>
            <ul className="divide-y divide-slate-100 md:hidden">
              {list.map((c) => {
                const s = stats(c.id);
                return (
                  <li key={c.id}>
                    <Link href={`/centros/${c.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-slate-800">{c.name}</p>
                          <Badge tone={centerStatusTone(c.status.key)}>{c.status.label}</Badge>
                        </div>
                        <p className="truncate text-sm text-slate-500">{[c.type.label, c.city].filter(Boolean).join(" · ")}</p>
                        <p className="mt-1 text-xs text-slate-500">{c._count.patients} clientes · {formatEUR(s.totalCents)} en 12 meses{s.open ? ` · ${s.open} en curso` : ""}</p>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-slate-300" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
