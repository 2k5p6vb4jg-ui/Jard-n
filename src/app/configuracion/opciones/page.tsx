import Link from "next/link";
import { ArrowDown, ArrowUp, Building2, Flag, Layers, ListChecks, Package, Plus, Save, Shapes, Trash2, Wrench } from "lucide-react";
import type { OptionKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/Form";
import { InlineForm } from "@/components/ui/InlineForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { deleteOption, moveOption, saveOption } from "./actions";

export const metadata = { title: "Opciones" };

type Section = { kind: OptionKind; title: string; icon: typeof Layers; subtitle: string; wide?: boolean };

const TABS: Record<"reparaciones" | "plantillas" | "centros" | "agenda", { label: string; sections: Section[] }> = {
  reparaciones: {
    label: "Reparaciones",
    sections: [
      { kind: "WORK_STATUS", title: "Estados", icon: ListChecks, subtitle: "Solo se pueden renombrar: cada paso mueve presupuestos, entregas y trazabilidad.", wide: true },
      { kind: "EQUIPMENT_CATEGORY", title: "Categorías de equipo", icon: Wrench, subtitle: "También se usan en Trazabilidad" },
      { kind: "SERVICE_TYPE", title: "Tipos de servicio", icon: Shapes, subtitle: "Reparación, mantenimiento…" },
      { kind: "PART_CATEGORY", title: "Categorías de pieza", icon: Package, subtitle: "Al añadir piezas y materiales" },
      { kind: "PRIORITY", title: "Prioridades", icon: Flag, subtitle: "«Normal» no muestra etiqueta en los listados" },
    ],
  },
  plantillas: {
    label: "Plantillas",
    sections: [
      { kind: "STATUS", title: "Estados", icon: ListChecks, subtitle: "En el orden en que avanza el pedido. «Final» = terminado: sale de «En curso».", wide: true },
      { kind: "TYPE", title: "Tipos de plantilla", icon: Shapes, subtitle: "Diario, deportiva, vestir…" },
      { kind: "MATERIAL", title: "Materiales", icon: Layers, subtitle: "EVA, resina, corcho…" },
    ],
  },
  centros: {
    label: "Centros",
    sections: [
      { kind: "CENTER_TYPE", title: "Tipos de centro", icon: Building2, subtitle: "Residencia privada, centro de día…" },
      { kind: "CENTER_STATUS", title: "Situación comercial", icon: Flag, subtitle: "Posible cliente, activo, inactivo…" },
    ],
  },
  agenda: {
    label: "Agenda",
    sections: [{ kind: "APPOINTMENT_TYPE", title: "Tipos de cita", icon: Shapes, subtitle: "Toma de medidas, estudio de la pisada, entrega…" }],
  },
};

const iconBtn = "grid size-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30";

export default async function OptionsPage({ searchParams }: { searchParams: Promise<{ pestana?: string }> }) {
  const { pestana } = await searchParams;
  const tab = pestana === "plantillas" || pestana === "centros" || pestana === "agenda" ? pestana : "reparaciones";
  const { sections } = TABS[tab];
  const options = await prisma.catalogOption.findMany({
    where: { kind: { in: sections.map((x) => x.kind) } },
    orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    include: {
      _count: { select: { typeOrders: true, materialOrders: true, statusOrders: true, equipmentOrders: true, serviceOrders: true, priorityOrders: true, parts: true, products: true, centerTypes: true, centerStatuses: true, appointments: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Opciones"
        description="Lo que aparece en los desplegables. Las opciones en uso no se borran: se desactivan (siguen viéndose en los registros antiguos)."
        actions={<LinkButton href="/configuracion" variant="secondary">Volver a Ajustes</LinkButton>}
      />
      <nav className="mb-6 inline-flex rounded-xl bg-slate-100 p-1" aria-label="Listas">
        {(Object.keys(TABS) as (keyof typeof TABS)[]).map((k) => (
          <Link
            key={k}
            href={`/configuracion/opciones?pestana=${k}`}
            aria-current={k === tab ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-lg px-5 font-medium transition ${k === tab ? "bg-white text-teal-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            {TABS[k].label}
          </Link>
        ))}
      </nav>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {sections.map(({ kind, title, icon, subtitle, wide }) => {
          const renameOnly = kind === "WORK_STATUS";
          const list = options.filter((o) => o.kind === kind);
          return (
            <Card key={kind} className={wide ? "xl:col-span-2" : ""}>
              <CardHeader title={title} icon={icon} subtitle={subtitle} />
              <ul className="divide-y divide-slate-100">
                {list.map((o, i) => {
                  const used = Object.values(o._count).reduce((a, b) => a + b, 0);
                  return (
                    <li key={o.id} className="flex flex-wrap items-end gap-2 px-5 py-4">
                      {!renameOnly && <div className="flex flex-col">
                        <form action={moveOption.bind(null, o.id, "up")}>
                          <button type="submit" disabled={i === 0} aria-label={`Subir ${o.label}`} className={iconBtn}><ArrowUp className="size-4" /></button>
                        </form>
                        <form action={moveOption.bind(null, o.id, "down")}>
                          <button type="submit" disabled={i === list.length - 1} aria-label={`Bajar ${o.label}`} className={iconBtn}><ArrowDown className="size-4" /></button>
                        </form>
                      </div>}
                      <InlineForm action={saveOption.bind(null, o.id, kind)} className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
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
                        {!renameOnly && (
                          <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-3 ring-1 ring-inset ring-slate-200">
                            <input type="checkbox" name="active" defaultChecked={o.active} className="size-5 accent-teal-600" />
                            <span className="text-sm font-medium text-slate-700">Activa</span>
                          </label>
                        )}
                        <SubmitButton icon={<Save className="size-5" />} variant="secondary">Guardar</SubmitButton>
                      </InlineForm>
                      {renameOnly ? null : used === 0 ? (
                        <form action={deleteOption.bind(null, o.id)}>
                          <ConfirmButton message={`¿Borrar «${o.label}»?`} ariaLabel={`Borrar ${o.label}`} icon={<Trash2 className="size-5" />} className="size-12 text-slate-400 hover:bg-rose-50 hover:text-rose-600" />
                        </form>
                      ) : (
                        <p className="basis-full pl-[3.25rem] text-xs text-slate-500">En uso en {used} {used === 1 ? "registro" : "registros"}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
              {!renameOnly && <InlineForm action={saveOption.bind(null, null, kind)} className="flex flex-wrap items-end gap-2 border-t border-slate-100 bg-slate-50/60 p-5">
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
              </InlineForm>}
            </Card>
          );
        })}
      </div>
    </>
  );
}
