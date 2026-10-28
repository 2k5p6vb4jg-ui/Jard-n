import Link from "next/link";
import { ChevronDown, Plus, Save, Tags, Trash2 } from "lucide-react";
import type { Supplier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubmitButton } from "@/components/ui/Form";
import { InlineForm } from "@/components/ui/InlineForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { deleteSupplier, saveSupplier } from "../actions";

export const metadata = { title: "Marcas" };

function Fields({ s, idp }: { s?: Supplier; idp: string }) {
  const f = (name: keyof Supplier, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="field-label" htmlFor={`${idp}-${name}`}>{label}</label>
      <input id={`${idp}-${name}`} name={name} defaultValue={(s?.[name] as string | number | null) ?? ""} className="field" {...props} />
    </div>
  );
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {f("name", "Marca", { required: true, placeholder: "Orliman" })}
      {f("contactName", "Comercial")}
      {f("phone", "Teléfono", { type: "tel", inputMode: "tel" })}
      {f("email", "Email de pedidos", { type: "email", inputMode: "email" })}
      {f("website", "Web o portal de pedidos", { placeholder: "https://…" })}
      {f("customerNo", "Nuestro nº de cliente")}
      {f("leadTimeDays", "Suele tardar (días)", { inputMode: "numeric" })}
      <div className="sm:col-span-2">
        <label className="field-label" htmlFor={`${idp}-notes`}>Notas</label>
        <input id={`${idp}-notes`} name="notes" defaultValue={s?.notes ?? ""} placeholder="Pedido mínimo, portes, días de pedido…" className="field" />
      </div>
    </div>
  );
}

export default async function SuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    include: { _count: { select: { items: true, orders: true } }, items: { where: { status: { in: ["PENDING", "ORDERED"] } }, select: { status: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <>
      <PageHeader
        eyebrow="Pedidos"
        title="Marcas"
        description="Marcas y fabricantes a los que se hacen los pedidos"
        actions={<LinkButton href="/pedidos" variant="secondary">Volver a Pedidos</LinkButton>}
      />
      <Card className="mb-6">
        <CardHeader title="Nueva marca" icon={Plus} />
        <InlineForm action={saveSupplier.bind(null, null)} className="space-y-4 p-5">
          <Fields idp="new" />
          <SubmitButton icon={<Plus className="size-5" />}>Añadir marca</SubmitButton>
        </InlineForm>
      </Card>

      <Card>
        <CardHeader title={`${suppliers.length} marcas`} icon={Tags} subtitle="Las marcas con pedidos no se borran: se desactivan" />
        <ul className="divide-y divide-slate-100">
          {suppliers.map((s) => {
            const pending = s.items.filter((i) => i.status === "PENDING").length;
            const ordered = s.items.filter((i) => i.status === "ORDERED").length;
            return (
              <li key={s.id}>
                <details className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-3 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                    <span className={`font-medium ${s.active ? "text-slate-800" : "text-slate-400 line-through"}`}>{s.name}</span>
                    <span className="text-sm text-slate-500">{[s.phone, s.leadTimeDays != null && `${s.leadTimeDays} días`].filter(Boolean).join(" · ")}</span>
                    <span className="ml-auto flex items-center gap-1.5">
                      {pending > 0 && <Link href="/pedidos" className="relative z-10"><Badge tone="gold">{pending} por pedir</Badge></Link>}
                      {ordered > 0 && <Badge tone="sky">{ordered} en camino</Badge>}
                      <ChevronDown className="size-5 text-slate-400 transition group-open:rotate-180" />
                    </span>
                  </summary>
                  <InlineForm action={saveSupplier.bind(null, s.id)} className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-5">
                    <Fields s={s} idp={s.id} />
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-inset ring-slate-200">
                        <input type="checkbox" name="active" defaultChecked={s.active} className="size-5 accent-teal-600" />
                        <span className="text-sm font-medium text-slate-700">Activa</span>
                      </label>
                      <SubmitButton icon={<Save className="size-5" />} variant="secondary">Guardar</SubmitButton>
                      <Link href={`/pedidos/apuntar?marca=${s.id}`} className="text-sm font-medium text-teal-700 hover:underline">Apuntar artículo de {s.name}</Link>
                    </div>
                  </InlineForm>
                  {s._count.items + s._count.orders === 0 && (
                    <form action={deleteSupplier.bind(null, s.id)} className="border-t border-slate-100 bg-slate-50/60 px-5 pb-4">
                      <ConfirmButton message={`¿Borrar la marca «${s.name}»?`} icon={<Trash2 className="size-4" />} className="text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600">Borrar marca</ConfirmButton>
                    </form>
                  )}
                </details>
              </li>
            );
          })}
          {suppliers.length === 0 && <li className="px-5 py-6 text-center text-sm text-slate-500">Añada las marcas a las que hace pedidos (Orliman, DJO, Prim, Sunrise…).</li>}
        </ul>
      </Card>
    </>
  );
}
