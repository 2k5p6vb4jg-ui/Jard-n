import Link from "next/link";
import { UpcomingAppointments } from "@/components/agenda/UpcomingAppointments";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  FileSignature,
  Lightbulb,
  Building2,
  ClipboardPlus,
  Contact,
  Handshake,
  Link2,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import { billingPeriod, centerLink, centerStatusTone, proposalKind, proposalStatus } from "@/lib/labels";
import { effectiveQuoteStatus } from "@/lib/quotes";
import { contractEnd, visitState } from "@/lib/contracts";
import { type ActivityRow, centerOpportunities, findLegacyOrders, orderActivity, revenueSplit, twelveMonthsAgo } from "@/lib/centers";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubmitButton } from "@/components/ui/Form";
import { InlineForm } from "@/components/ui/InlineForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { LinkedItems } from "@/components/orders/LinkedItems";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { messages } from "@/lib/whatsapp";
import { businessName } from "@/lib/settings";
import { linkedItemsSelect } from "@/lib/orders";
import { addContact, deleteCenter, deleteContact, linkLegacyOrders } from "../actions";

function ActivityList({ rows, empty, showLink }: { rows: ActivityRow[]; empty: string; showLink?: boolean }) {
  if (rows.length === 0) return <p className="px-5 py-6 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((r) => (
        <li key={`${r.kind}-${r.id}`}>
          <Link href={r.href} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-800">{r.title}</p>
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className="font-mono">{r.code}</span> · {r.client} · {formatDate(r.date)}
                {showLink && r.link && <Badge tone={centerLink[r.link].tone}>{centerLink[r.link].short}</Badge>}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-medium text-slate-800">{r.totalCents ? formatEUR(r.totalCents) : "—"}</p>
              <Badge tone={r.status.tone}>{r.status.label}</Badge>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function CenterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [center, activity, products, legacy, proposals] = await Promise.all([
    prisma.center.findUnique({
      where: { id },
      include: {
        type: true,
        status: true,
        contacts: { orderBy: { createdAt: "asc" } },
        orderItems: linkedItemsSelect,
        patients: { include: { _count: { select: { workOrders: true, insoleOrders: true } } }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
      },
    }),
    orderActivity({ centerId: id }),
    prisma.trackedProduct.findMany({
      where: { OR: [{ centerId: id }, { patient: { centerId: id } }] },
      include: { category: { select: { label: true } }, patient: { select: { firstName: true, lastName: true } }, interventions: { orderBy: { date: "desc" }, take: 1 } },
      orderBy: { deliveredAt: "desc" },
    }),
    findLegacyOrders(id),
    prisma.centerProposal.findMany({
      where: { centerId: id },
      include: { visits: { include: { workOrder: { select: { status: true } } }, orderBy: { dueAt: "asc" } } },
      orderBy: { issuedAt: "desc" },
    }),
  ]);
  if (!center) notFound();
  const opportunities = await centerOpportunities(id, activity);
  const business = await businessName();

  const since = twelveMonthsAgo();
  const year = revenueSplit(activity.filter((r) => r.date >= since));
  const direct = activity.filter((r) => r.link === "ORDERED");
  const through = activity.filter((r) => r.link !== "ORDERED");
  const open = activity.filter((r) => r.open).length;
  const now = new Date();
  const kpi = (label: string, value: string, hint?: string) => (
    <div className="p-4 lg:px-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );

  return (
    <>
      <Link href="/centros" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="size-4" /> Centros
      </Link>
      <PageHeader
        eyebrow={center.type.label}
        title={center.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={centerStatusTone(center.status.key)}>{center.status.label}</Badge>
            {[center.city, center.places && `${center.places} plazas`].filter(Boolean).join(" · ")}
          </span>
        }
        actions={
          <>
            <LinkButton href={`/centros/${id}/editar`} variant="secondary" icon={Pencil}>Editar</LinkButton>
            <LinkButton href={`/centros/${id}/propuestas/nueva`} variant="secondary" icon={FileSignature}>Propuesta</LinkButton>
            <LinkButton href={`/plantillas/nueva?centro=${id}`} variant="secondary" icon={Plus}>Plantillas</LinkButton>
            <LinkButton href={`/taller/nueva?centro=${id}`} icon={ClipboardPlus}>Nueva reparación</LinkButton>
          </>
        }
      />

      <Card className="mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-slate-100">
        {kpi("Facturado 12 meses", formatEUR(year.totalCents))}
        {kpi("Pedidos directos", formatEUR(year.directCents), "Compras del propio centro")}
        {kpi("A través del centro", formatEUR(year.throughCents), "Derivados y usuarios")}
        {kpi("Clientes del centro", String(center.patients.length))}
        {kpi("Equipos", String(products.length), "Del centro y sus usuarios")}
        {kpi("En curso", String(open), "Reparaciones y plantillas")}
      </Card>

      {legacy.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gold-200 bg-gold-50 p-4 sm:flex-row sm:items-center">
          <Link2 className="size-5 shrink-0 text-gold-700" />
          <p className="flex-1 text-sm text-gold-800">
            Hay <strong>{legacy.length}</strong> {legacy.length === 1 ? "reparación antigua apuntada" : "reparaciones antiguas apuntadas"} a nombre de este centro sin vincular
            ({legacy.map((o) => o.code).join(", ")}).
          </p>
          <form action={linkLegacyOrders.bind(null, id)}>
            <SubmitButton icon={<Link2 className="size-5" />}>Vincular como pedidos del centro</SubmitButton>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Oportunidades" icon={Lightbulb} subtitle="Calculadas con su historial, sus equipos y sus usuarios" />
            {opportunities.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-500">Sin oportunidades detectadas ahora mismo.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {opportunities.map((o) => (
                  <li key={o.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                    <span className={`hidden size-2.5 shrink-0 rounded-full sm:block ${{ gold: "bg-gold-500", rose: "bg-rose-500", teal: "bg-teal-600" }[o.tone]}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800">{o.title}</p>
                      <p className="text-sm text-slate-500">{o.text}</p>
                      {o.links && (
                        <p className="mt-1 flex flex-wrap gap-x-3 text-sm">
                          {o.links.map((l) => <Link key={l.href} href={l.href} className="font-medium text-teal-700 hover:underline">{l.label}</Link>)}
                        </p>
                      )}
                    </div>
                    {o.cta && (
                      <Link href={o.cta.href} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-medium text-teal-700 ring-1 ring-inset ring-teal-200 hover:bg-teal-50">
                        {o.cta.label} <ArrowRight className="size-4" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Propuestas"
              icon={FileSignature}
              subtitle="Packs de venta y contratos, con PDF"
              action={<Link href={`/centros/${id}/propuestas/nueva`} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-teal-700 hover:bg-teal-50"><Plus className="size-4" />Nueva</Link>}
            />
            {proposals.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-500">Todavía no hay propuestas para este centro.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {proposals.map((p) => {
                  const st = effectiveQuoteStatus(p) as keyof typeof proposalStatus;
                  const nextVisit = p.visits.find((v) => visitState(v).key !== "done");
                  return (
                    <li key={p.id}>
                      <Link href={`/centros/${id}/propuestas/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-800">{p.title}</p>
                          <p className="text-xs text-slate-500"><span className="font-mono">{p.number}</span> · {proposalKind[p.kind].label} · {formatDate(p.issuedAt)}</p>
                          {p.visits.length > 0 && (
                            <p className={`text-xs font-medium ${nextVisit && visitState(nextVisit).key === "overdue" ? "text-rose-600" : "text-teal-700"}`}>
                              Contrato hasta {formatDate(contractEnd(p))}{nextVisit ? ` · próxima revisión ${formatDate(nextVisit.dueAt)}` : " · revisiones completadas"}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium text-slate-800">{formatEUR(p.totalCents)}{billingPeriod[p.billingPeriod].per && <span className="font-normal text-slate-500"> {billingPeriod[p.billingPeriod].per}</span>}</p>
                          <Badge tone={proposalStatus[st].tone}>{proposalStatus[st].label}</Badge>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="Pedidos del centro" icon={Building2} subtitle="Lo que el centro compra o repara para sí mismo" />
            <ActivityList rows={direct} empty="Todavía no hay pedidos directos del centro." />
          </Card>

          <Card>
            <CardHeader title="A través del centro" icon={Handshake} subtitle="Clientes derivados por el centro o que acuden a él" />
            <ActivityList rows={through} empty="Todavía no hay pedidos de clientes del centro." showLink />
          </Card>

          <LinkedItems items={center.orderItems} newHref={`/pedidos/apuntar?centro=${id}`} hideWhenEmpty />

          <Card>
            <CardHeader title="Equipos" icon={Package} subtitle="Del centro y de sus usuarios: base para ofrecer mantenimiento" />
            {products.length === 0 ? (
              <EmptyState icon={Package} title="Sin equipos registrados" text="Asigne en Trazabilidad los equipos que son propiedad del centro." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {products.map((p) => {
                  const inWarranty = p.warrantyUntil && p.warrantyUntil > now;
                  const last = p.interventions[0];
                  return (
                    <li key={p.id}>
                      <Link href={`/trazabilidad?q=${encodeURIComponent(p.serialNumber)}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-800">{p.category.label} · {p.brand} {p.model}</p>
                          <p className="truncate text-xs text-slate-500">
                            <span className="font-mono">{p.serialNumber}</span> · {p.patient ? `${p.patient.firstName} ${p.patient.lastName}` : "Del centro"} ·{" "}
                            {last ? `última intervención ${formatDate(last.date)}` : "sin intervenciones"}
                          </p>
                        </div>
                        {inWarranty ? (
                          <Badge tone="emerald"><ShieldCheck className="size-3.5" />Garantía</Badge>
                        ) : (
                          <Badge tone="slate"><ShieldOff className="size-3.5" />Sin garantía</Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Datos" icon={Building2} />
            <div className="space-y-3 px-5 py-4 text-slate-700">
              {center.phone && <p className="flex items-center gap-3"><Phone className="size-4 text-slate-400" /><a href={`tel:${center.phone.replace(/\s/g, "")}`}>{center.phone}</a></p>}
              {center.email && <p className="flex items-center gap-3 break-all"><Mail className="size-4 shrink-0 text-slate-400" /><a href={`mailto:${center.email}`}>{center.email}</a></p>}
              {(center.address || center.city) && <p className="flex items-center gap-3"><MapPin className="size-4 shrink-0 text-slate-400" />{[center.address, center.postalCode, center.city].filter(Boolean).join(", ")}</p>}
              {center.taxId && <p className="text-sm text-slate-500">CIF {center.taxId}</p>}
              {center.conditions && <p className="rounded-lg bg-gold-50 p-3 text-sm text-gold-800"><strong>Condiciones:</strong> {center.conditions}</p>}
              {center.notes && <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{center.notes}</p>}
              {!center.phone && !center.email && !center.address && !center.notes && <p className="text-sm text-slate-500">Sin datos de contacto.</p>}
            </div>
          </Card>

          <UpcomingAppointments where={{ centerId: id }} newHref={`/agenda/nueva?centro=${id}`} />

          <Card>
            <CardHeader title="Personas de contacto" icon={Contact} />
            <ul className="divide-y divide-slate-100">
              {center.contacts.map((c) => (
                <li key={c.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">{c.name}{c.role && <span className="font-normal text-slate-500"> · {c.role}</span>}</p>
                    <p className="text-sm text-slate-500">
                      {c.phone && <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="mr-3 hover:underline">{c.phone}</a>}
                      {c.email && <a href={`mailto:${c.email}`} className="break-all hover:underline">{c.email}</a>}
                    </p>
                  </div>
                  <WhatsAppButton phone={c.phone} compact text={messages.generic(c.name, business)} />
                  <form action={deleteContact.bind(null, id, c.id)}>
                    <ConfirmButton message={`¿Quitar a ${c.name}?`} ariaLabel={`Quitar a ${c.name}`} icon={<Trash2 className="size-4" />} className="size-10 text-slate-400 hover:bg-rose-50 hover:text-rose-600" />
                  </form>
                </li>
              ))}
              {center.contacts.length === 0 && <li className="px-5 py-3 text-sm text-slate-500">Sin contactos todavía.</li>}
            </ul>
            <InlineForm action={addContact.bind(null, id)} className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/60 p-4">
              <input name="name" required placeholder="Nombre" aria-label="Nombre" className="field col-span-2" />
              <input name="role" placeholder="Cargo (dirección, compras…)" aria-label="Cargo" className="field col-span-2" />
              <input name="phone" type="tel" inputMode="tel" placeholder="Teléfono" aria-label="Teléfono" className="field" />
              <input name="email" type="email" inputMode="email" placeholder="Email" aria-label="Email" className="field" />
              <SubmitButton icon={<UserPlus className="size-5" />} variant="secondary" className="col-span-2">Añadir contacto</SubmitButton>
            </InlineForm>
          </Card>

          <Card>
            <CardHeader
              title="Clientes del centro"
              icon={Users}
              action={<Link href={`/pacientes/nuevo?centro=${id}`} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-medium text-teal-700 hover:bg-teal-50"><Plus className="size-4" />Nuevo</Link>}
            />
            {center.patients.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-500">Ningún cliente vinculado. Indique el centro en la ficha de cada cliente.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {center.patients.map((p) => (
                  <li key={p.id}>
                    <Link href={`/pacientes/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-slate-50">
                      <span className="truncate font-medium text-slate-800">{p.lastName}, {p.firstName}</span>
                      <span className="shrink-0 text-xs text-slate-500">{p._count.workOrders + p._count.insoleOrders} pedidos</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <form action={deleteCenter.bind(null, id)}>
            <ConfirmButton
              message={`¿Borrar el centro «${center.name}»? Sus clientes, pedidos y equipos se conservan, pero dejan de estar vinculados.`}
              icon={<Trash2 className="size-4" />}
              className="w-full text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            >
              Borrar centro
            </ConfirmButton>
          </form>
        </div>
      </div>
    </>
  );
}
