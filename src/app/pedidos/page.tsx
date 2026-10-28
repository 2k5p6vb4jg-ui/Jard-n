import Link from "next/link";
import { CheckCheck, ClipboardList, PackageCheck, Pencil, Plus, Send, Tags, Trash2, Truck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { addDays, formatDate } from "@/lib/dates";
import { toDateInput } from "@/lib/forms";
import { ORDER_VIAS, orderItemStatus } from "@/lib/labels";
import { type ItemWithRecipient, purchaseOrderState, qty, recipient, recipientInclude } from "@/lib/orders";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubmitButton } from "@/components/ui/Form";
import { InlineForm } from "@/components/ui/InlineForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { chipClass } from "@/components/ui/Table";
import { createPurchaseOrder, deleteItem, setItemStatus } from "./actions";

export const metadata = { title: "Pedidos" };

const VIEWS = { porpedir: "Por pedir", encamino: "En camino", porentregar: "Por entregar", historial: "Historial" } as const;
type View = keyof typeof VIEWS;

function ForWhom({ i }: { i: ItemWithRecipient }) {
  const r = recipient(i);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      {r.href ? <Link href={r.href} className="relative z-10 font-medium text-teal-700 hover:underline">{r.who}</Link> : <span className={r.isStock ? "text-slate-400" : ""}>{r.who}</span>}
      {r.ref && <Link href={r.ref.href} className="relative z-10 font-mono text-xs text-slate-500 hover:underline">{r.ref.label}</Link>}
    </span>
  );
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const { vista } = await searchParams;
  const view: View = vista && vista in VIEWS ? (vista as View) : "porpedir";
  const today = new Date(new Date().setHours(0, 0, 0, 0));

  const [pending, openOrders, toDeliver, history, counts] = await Promise.all([
    view === "porpedir" ? prisma.orderItem.findMany({ where: { status: "PENDING" }, include: recipientInclude, orderBy: [{ neededBy: "asc" }, { createdAt: "asc" }] }) : [],
    view === "encamino"
      ? prisma.purchaseOrder.findMany({ where: { items: { some: { status: "ORDERED" } } }, include: { supplier: true, items: { select: { status: true } } }, orderBy: [{ expectedAt: "asc" }, { orderedAt: "asc" }] })
      : [],
    view === "porentregar"
      ? prisma.orderItem.findMany({
          where: { status: "RECEIVED", OR: [{ patientId: { not: null } }, { centerId: { not: null } }, { workOrderId: { not: null } }, { insoleOrderId: { not: null } }] },
          include: recipientInclude,
          orderBy: { receivedAt: "asc" },
        })
      : [],
    view === "historial" ? prisma.orderItem.findMany({ include: recipientInclude, orderBy: { updatedAt: "desc" }, take: 150 }) : [],
    prisma.orderItem.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const badgeCount: Partial<Record<View, number>> = { porpedir: count("PENDING"), encamino: count("ORDERED") };

  // «Por pedir» agrupado por marca (los que aún no tienen marca, al final)
  const groups = new Map<string, { supplier: ItemWithRecipient["supplier"]; items: ItemWithRecipient[] }>();
  for (const i of pending) {
    const key = i.supplier?.id ?? "";
    if (!groups.has(key)) groups.set(key, { supplier: i.supplier, items: [] });
    groups.get(key)!.items.push(i);
  }
  const supplierInfo = new Map(
    (await prisma.supplier.findMany({ where: { id: { in: [...groups.keys()].filter(Boolean) } }, select: { id: true, leadTimeDays: true, website: true, phone: true } })).map((s) => [s.id, s]),
  );
  const sortedGroups = [...groups.entries()].sort(([a, ga], [b, gb]) => (a === "" ? 1 : b === "" ? -1 : ga.supplier!.name.localeCompare(gb.supplier!.name)));

  const itemLine = (i: ItemWithRecipient) => {
    const late = i.neededBy && i.neededBy < today && (i.status === "PENDING" || i.status === "ORDERED");
    return (
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-800">
          <span className="text-slate-500">{qty(i.quantity)} ×</span> {i.description}
          {i.reference && <span className="ml-1.5 font-mono text-xs text-slate-500">ref. {i.reference}</span>}
        </p>
        <p className="text-sm text-slate-500">
          Para <ForWhom i={i} />
          {i.neededBy && <span className={late ? "font-medium text-rose-600" : ""}> · hace falta el {formatDate(i.neededBy)}</span>}
        </p>
        {i.notes && <p className="text-xs text-slate-500">{i.notes}</p>}
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Qué hay que pedir a cada marca, cuándo y para quién"
        actions={
          <>
            <LinkButton href="/pedidos/marcas" variant="secondary" icon={Tags}>Marcas</LinkButton>
            <LinkButton href="/pedidos/apuntar" icon={Plus}>Apuntar para pedir</LinkButton>
          </>
        }
      />
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <Link key={v} href={v === "porpedir" ? "/pedidos" : `/pedidos?vista=${v}`} className={chipClass(view === v)}>
            {VIEWS[v]}
            {!!badgeCount[v] && <span className={`ml-2 rounded-md px-1.5 text-xs ${view === v ? "bg-white/15" : "bg-slate-100"}`}>{badgeCount[v]}</span>}
          </Link>
        ))}
      </div>

      {view === "porpedir" &&
        (sortedGroups.length === 0 ? (
          <Card><EmptyState icon={ClipboardList} title="No hay nada por pedir" text="Apunte aquí lo que haga falta pedir; también desde una reparación con «Pedir pieza»." /></Card>
        ) : (
          <div className="space-y-6">
            {sortedGroups.map(([key, g]) => {
              const info = supplierInfo.get(key);
              return (
                <Card key={key || "sin-marca"}>
                  <CardHeader
                    title={g.supplier?.name ?? "Sin marca asignada"}
                    icon={Tags}
                    subtitle={
                      g.supplier
                        ? [`${g.items.length} ${g.items.length === 1 ? "artículo" : "artículos"}`, info?.leadTimeDays != null && `suele tardar ${info.leadTimeDays} días`, info?.phone].filter(Boolean).join(" · ")
                        : "Asigne una marca a cada artículo para poder pedirlo"
                    }
                    action={info?.website ? <a href={info.website.startsWith("http") ? info.website : `https://${info.website}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-teal-700 hover:underline">Web de pedidos</a> : undefined}
                  />
                  {g.supplier ? (
                    <InlineForm action={createPurchaseOrder.bind(null, g.supplier.id)}>
                      <ul className="divide-y divide-slate-100">
                        {g.items.map((i) => (
                          <li key={i.id} className="flex items-start gap-3 px-5 py-3">
                            <input type="checkbox" name="itemIds" value={i.id} defaultChecked aria-label={`Incluir ${i.description}`} className="mt-1 size-5 shrink-0 accent-teal-600" />
                            {itemLine(i)}
                            <Link href={`/pedidos/articulo/${i.id}`} aria-label="Editar" className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="size-4" /></Link>
                          </li>
                        ))}
                      </ul>
                      <div className="grid grid-cols-1 items-end gap-3 border-t border-slate-100 bg-slate-50/60 p-5 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label className="field-label" htmlFor={`via-${key}`}>Pedido por</label>
                          <select id={`via-${key}`} name="via" defaultValue={ORDER_VIAS[0]} className="field appearance-auto">
                            {ORDER_VIAS.map((v) => <option key={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="field-label" htmlFor={`ref-${key}`}>Nº de pedido de la marca</label>
                          <input id={`ref-${key}`} name="supplierRef" placeholder="Opcional" className="field" />
                        </div>
                        <div>
                          <label className="field-label" htmlFor={`exp-${key}`}>Llegada prevista</label>
                          <input id={`exp-${key}`} name="expectedAt" type="date" defaultValue={info?.leadTimeDays != null ? toDateInput(addDays(new Date(), info.leadTimeDays)) : ""} className="field" />
                        </div>
                        <SubmitButton icon={<Send className="size-5" />}>Marcar como pedido</SubmitButton>
                      </div>
                    </InlineForm>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {g.items.map((i) => (
                        <li key={i.id} className="flex items-start gap-3 px-5 py-3">
                          {itemLine(i)}
                          <Link href={`/pedidos/articulo/${i.id}`} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-teal-700 ring-1 ring-inset ring-teal-200 hover:bg-teal-50"><Pencil className="size-4" />Asignar marca</Link>
                          <form action={deleteItem.bind(null, i.id)}>
                            <ConfirmButton message={`¿Quitar «${i.description}» de la lista?`} ariaLabel="Quitar" icon={<Trash2 className="size-4" />} className="size-10 text-slate-400 hover:bg-rose-50 hover:text-rose-600" />
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              );
            })}
          </div>
        ))}

      {view === "encamino" && (
        <Card>
          {openOrders.length === 0 ? (
            <EmptyState icon={Truck} title="No hay pedidos en camino" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {openOrders.map((o) => {
                const st = purchaseOrderState(o.items);
                const late = o.expectedAt && o.expectedAt < today;
                return (
                  <li key={o.id}>
                    <Link href={`/pedidos/${o.id}`} className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800">{o.supplier.name} <span className="font-mono text-xs font-normal text-slate-500">{o.number}</span></p>
                        <p className="text-sm text-slate-500">
                          Pedido el {formatDate(o.orderedAt)}{o.via && ` por ${o.via.toLowerCase()}`} ·{" "}
                          <span className={late ? "font-medium text-rose-600" : ""}>{o.expectedAt ? `${late ? "debía llegar" : "llega"} el ${formatDate(o.expectedAt)}` : "sin fecha prevista"}</span>
                        </p>
                      </div>
                      {late && <Badge tone="rose">Retrasado</Badge>}
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {view === "porentregar" && (
        <Card>
          <CardHeader title="Recibido, pendiente de entregar" icon={PackageCheck} subtitle="Avise al cliente o colóquelo en su reparación o plantillas" />
          {toDeliver.length === 0 ? (
            <EmptyState icon={PackageCheck} title="Nada pendiente de entregar" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {toDeliver.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  {itemLine(i)}
                  <span className="text-xs text-slate-500">Recibido el {formatDate(i.receivedAt)}</span>
                  <form action={setItemStatus.bind(null, i.id, "DELIVERED")}>
                    <SubmitButton icon={<CheckCheck className="size-4" />} className="min-h-11 px-3 text-sm lg:min-h-10">Entregado</SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {view === "historial" && (
        <Card>
          {history.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Todavía no hay artículos" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  {itemLine(i)}
                  <span className="text-xs text-slate-500">
                    {i.supplier?.name ?? "Sin marca"}
                    {i.purchaseOrder && <> · <Link href={`/pedidos/${i.purchaseOrder.id}`} className="font-mono hover:underline">{i.purchaseOrder.number}</Link></>}
                  </span>
                  <Badge tone={orderItemStatus[i.status].tone}>{orderItemStatus[i.status].label}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
