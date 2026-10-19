import { ArrowDown, ArrowUp, Layers, ListChecks, Plus, Save, Shapes, Trash2 } from "lucide-react";
import type { InsoleOptionKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/Form";
import { InlineForm } from "@/components/ui/InlineForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { deleteInsoleOption, moveInsoleOption, saveInsoleOption } from "@/app/plantillas/actions";

export const metadata = { title: "Opciones de plantillas" };

const SECTIONS: { kind: InsoleOptionKind; title: string; icon: typeof Layers; subtitle: string }[] = [
  { kind: "STATUS", title: "Estados", icon: ListChecks, subtitle: "En el orden en que avanza el pedido. «Final» = terminado: sale de «En curso»." },
  { kind: "TYPE", title: "Tipos de plantilla", icon: Shapes, subtitle: "Diario, deportiva, vestir…" },
  { kind: "MATERIAL", title: "Materiales", icon: Layers, subtitle: "EVA, resina, corcho…" },
];

const iconBtn = "grid size-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30";

export default async function InsoleOptionsPage() {
  const options = await prisma.insoleOrderOption.findMany({
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    include: { _count: { select: { typeOrders: true, materialOrders: true, statusOrders: true } } },
  });

  return (
    <>
      <PageHeader
        title="Opciones de plantillas"
        description="Lo que aparece en los desplegables de la sección Plantillas. Las opciones en uso no se borran: se desactivan."
        actions={<LinkButton href="/configuracion" variant="secondary">Volver a Ajustes</LinkButton>}
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {SECTIONS.map(({ kind, title, icon, subtitle }) => {
          const list = options.filter((o) => o.kind === kind);
          return (
            <Card key={kind} className={kind === "STATUS" ? "xl:col-span-2" : ""}>
              <CardHeader title={title} icon={icon} subtitle={subtitle} />
              <ul className="divide-y divide-slate-100">
                {list.map((o, i) => {
                  const used = o._count.typeOrders + o._count.materialOrders + o._count.statusOrders;
                  return (
                    <li key={o.id} className="flex flex-wrap items-end gap-2 px-5 py-4">
                      <div className="flex flex-col">
                        <form action={moveInsoleOption.bind(null, o.id, "up")}>
                          <button type="submit" disabled={i === 0} aria-label={`Subir ${o.label}`} className={iconBtn}><ArrowUp className="size-4" /></button>
                        </form>
                        <form action={moveInsoleOption.bind(null, o.id, "down")}>
                          <button type="submit" disabled={i === list.length - 1} aria-label={`Bajar ${o.label}`} className={iconBtn}><ArrowDown className="size-4" /></button>
                        </form>
                      </div>
                      <InlineForm action={saveInsoleOption.bind(null, o.id, kind)} className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
                        <div className="min-w-40 flex-1">
                          <label className="field-label" htmlFor={`op-${o.id}`}>Nombre</label>
                          <input id={`op-${o.id}`} name="label" defaultValue={o.label} required maxLength={60} className={`field ${o.active ? "" : "text-slate-400 line-through"}`} />
                        </div>
                        {kind === "STATUS" && (
                          <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-3 ring-1 ring-inset ring-slate-200">
                            <input type="checkbox" name="isFinal" defaultChecked={o.isFinal} className="size-5 accent-teal-600" />
                            <span className="text-sm font-medium text-slate-700">Final</span>
                          </label>
                        )}
                        <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-3 ring-1 ring-inset ring-slate-200">
                          <input type="checkbox" name="active" defaultChecked={o.active} className="size-5 accent-teal-600" />
                          <span className="text-sm font-medium text-slate-700">Activa</span>
                        </label>
                        <SubmitButton icon={<Save className="size-5" />} variant="secondary">Guardar</SubmitButton>
                      </InlineForm>
                      {used === 0 ? (
                        <form action={deleteInsoleOption.bind(null, o.id)}>
                          <ConfirmButton message={`¿Borrar «${o.label}»?`} ariaLabel={`Borrar ${o.label}`} icon={<Trash2 className="size-5" />} className="size-12 text-slate-400 hover:bg-rose-50 hover:text-rose-600" />
                        </form>
                      ) : (
                        <p className="basis-full pl-[3.25rem] text-xs text-slate-500">En uso en {used} {used === 1 ? "registro" : "registros"}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
              <InlineForm action={saveInsoleOption.bind(null, null, kind)} className="flex flex-wrap items-end gap-2 border-t border-slate-100 bg-slate-50/60 p-5">
                <div className="min-w-40 flex-1">
                  <label className="field-label" htmlFor={`new-${kind}`}>Añadir</label>
                  <input id={`new-${kind}`} name="label" required maxLength={60} placeholder="Nombre" className="field" />
                </div>
                {kind === "STATUS" && (
                  <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-inset ring-slate-200">
                    <input type="checkbox" name="isFinal" className="size-5 accent-teal-600" />
                    <span className="text-sm font-medium text-slate-700">Final</span>
                  </label>
                )}
                <SubmitButton icon={<Plus className="size-5" />}>Añadir</SubmitButton>
              </InlineForm>
            </Card>
          );
        })}
      </div>
    </>
  );
}
