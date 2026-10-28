import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCheck, PackageCheck, Pencil, RotateCcw, Save, Truck, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { toDateInput } from "@/lib/forms";
import { ORDER_VIAS, orderItemStatus } from "@/lib/labels";
import { orderText, purchaseOrderState, qty, recipient, recipientInclude } from "@/lib/orders";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubmitButton } from "@/components/ui/Form";
import { InlineForm } from "@/components/ui/InlineForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { CopyButton } from "@/components/ui/CopyButton";
import { receiveAll, setItemStatus, updatePurchaseOrder } from "../actions";

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [o, settings] = await Promise.all([
    prisma.purchaseOrder.findUnique({ where: { id }, include: { supplier: true, items: { include: recipientInclude, orderBy: { createdAt: "asc" } } } }),
    prisma.settings.findUnique({ where: { id: 1 }, select: { businessName: true } }),
  ]);
  if (!o) notFound();
  const st = purchaseOrderState(o.items);
  const late = st.open && o.expectedAt && o.expectedAt < new Date(new Date().setHours(0, 0, 0, 0));
  const small = "min-h-10 px-3 text-sm lg:min-h-9";
  const btn = (itemId: string, to: "RECEIVED" | "DELIVERED" | "ORDERED" | "CANCELLED" | "PENDING", label: string, icon: React.ReactNode, variant: "primary" | "secondary" = "secondary") => (
    <form action={setItemStatus.bind(null, itemId, to)}>
      <SubmitButton icon={icon} variant={variant} className={small}>{label}</SubmitButton>
    </form>
  );

  return (
    <>
      <Link href="/pedidos?vista=encamino" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="size-4" /> Pedidos en camino
      </Link>
      <PageHeader
        eyebrow={<span className="font-mono normal-case tracking-normal">{o.number}</span>}
        title={`Pedido a ${o.supplier.name}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={st.tone}>{st.label}</Badge>
            {late && <Badge tone="rose">Retrasado</Badge>}
            Pedido el {formatDate(o.orderedAt)}{o.via && ` por ${o.via.toLowerCase()}`}{o.supplierRef && ` · nº ${o.supplierRef}`}
          </span>
        }
        actions={<CopyButton label="Copiar texto del pedido" text={orderText(o, o.items, settings?.businessName ?? "Ortopedia")} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Artículos"
            icon={Truck}
            action={
              st.open ? (
                <form action={receiveAll.bind(null, o.id)}>
                  <SubmitButton icon={<PackageCheck className="size-5" />}>Todo recibido</SubmitButton>
                </form>
              ) : undefined
            }
          />
          <ul className="divide-y divide-slate-100">
            {o.items.map((i) => {
              const r = recipient(i);
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">
                      <span className="text-slate-500">{qty(i.quantity)} ×</span> {i.description}
                      {i.reference && <span className="ml-1.5 font-mono text-xs text-slate-500">ref. {i.reference}</span>}
                    </p>
                    <p className="text-sm text-slate-500">
                      Para {r.href ? <Link href={r.href} className="font-medium text-teal-700 hover:underline">{r.who}</Link> : r.who}
                      {r.ref && <> · <Link href={r.ref.href} className="font-mono text-xs hover:underline">{r.ref.label}</Link></>}
                      {i.receivedAt && ` · recibido el ${formatDate(i.receivedAt)}`}
                    </p>
                  </div>
                  <Badge tone={orderItemStatus[i.status].tone}>{orderItemStatus[i.status].label}</Badge>
                  <div className="flex flex-wrap gap-1.5">
                    {i.status === "ORDERED" && btn(i.id, "RECEIVED", "Recibido", <PackageCheck className="size-4" />, "primary")}
                    {i.status === "RECEIVED" && !r.isStock && btn(i.id, "DELIVERED", "Entregado", <CheckCheck className="size-4" />, "primary")}
                    {(i.status === "RECEIVED" || i.status === "DELIVERED") && btn(i.id, "ORDERED", "Deshacer", <RotateCcw className="size-4" />)}
                    {i.status === "ORDERED" && (
                      <form action={setItemStatus.bind(null, i.id, "CANCELLED")}>
                        <ConfirmButton message={`¿Anular «${i.description}» en este pedido?`} ariaLabel="Anular" icon={<X className="size-4" />} className="size-10 text-slate-400 hover:bg-rose-50 hover:text-rose-600 lg:size-9" />
                      </form>
                    )}
                    {i.status === "CANCELLED" && btn(i.id, "PENDING", "Volver a «por pedir»", <RotateCcw className="size-4" />)}
                    <Link href={`/pedidos/articulo/${i.id}`} aria-label="Editar" className="grid size-10 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:size-9"><Pencil className="size-4" /></Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="h-fit">
          <CardHeader title="Datos del pedido" icon={CalendarClock} />
          <InlineForm action={updatePurchaseOrder.bind(null, o.id)} className="space-y-3 p-5">
            <div>
              <label className="field-label" htmlFor="expectedAt">Llegada prevista</label>
              <input id="expectedAt" name="expectedAt" type="date" defaultValue={toDateInput(o.expectedAt)} className="field" />
            </div>
            <div>
              <label className="field-label" htmlFor="supplierRef">Nº de pedido de la marca</label>
              <input id="supplierRef" name="supplierRef" defaultValue={o.supplierRef ?? ""} className="field" />
            </div>
            <div>
              <label className="field-label" htmlFor="via">Pedido por</label>
              <select id="via" name="via" defaultValue={o.via ?? ""} className="field appearance-auto">
                <option value="">—</option>
                {[...new Set([...ORDER_VIAS, ...(o.via ? [o.via] : [])])].map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="notes">Notas</label>
              <textarea id="notes" name="notes" rows={2} defaultValue={o.notes ?? ""} className="field min-h-20 py-3" />
            </div>
            <SubmitButton icon={<Save className="size-5" />} variant="secondary" className="w-full">Guardar</SubmitButton>
          </InlineForm>
          {(o.supplier.phone || o.supplier.email) && (
            <p className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
              {o.supplier.contactName && `${o.supplier.contactName} · `}
              {o.supplier.phone && <a href={`tel:${o.supplier.phone.replace(/\s/g, "")}`} className="hover:underline">{o.supplier.phone}</a>}
              {o.supplier.email && <> · <a href={`mailto:${o.supplier.email}`} className="hover:underline">{o.supplier.email}</a></>}
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
