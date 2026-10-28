"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Wrench } from "lucide-react";
import type { BillingPeriod, ProposalKind } from "@prisma/client";
import { billingPeriod, proposalKind } from "@/lib/labels";
import { formatEUR } from "@/lib/money";
import { proposalTotals } from "@/lib/proposals";

type Line = { key: number; description: string; quantity: string; unit: string; unitPrice: string };
type Product = { id: string; label: string; detail: string };

const toNum = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));

/**
 * Parte interactiva del formulario de propuestas: tipo, periodicidad, equipos incluidos y conceptos,
 * con el total calculado al momento. Los conceptos viajan como JSON en el campo oculto «lines».
 */
export function ProposalEditor({
  initial,
  products,
}: {
  initial: {
    kind: ProposalKind;
    billingPeriod: BillingPeriod;
    durationMonths: number | null;
    visitsPerYear: number | null;
    discountPercent: number;
    taxRate: number;
    productIds: string[];
    lines: { description: string; quantity: number; unit: string; unitPriceCents: number }[];
  };
  products: Product[];
}) {
  const [kind, setKind] = useState<ProposalKind>(initial.kind);
  const [billing, setBilling] = useState<BillingPeriod>(initial.billingPeriod);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial.productIds));
  const [discount, setDiscount] = useState(String(initial.discountPercent).replace(".", ","));
  const [tax, setTax] = useState(String(initial.taxRate).replace(".", ","));
  const [counter, setCounter] = useState(initial.lines.length + 1);
  const [lines, setLines] = useState<Line[]>(
    initial.lines.length
      ? initial.lines.map((l, i) => ({ key: i, description: l.description, quantity: String(l.quantity).replace(".", ","), unit: l.unit, unitPrice: (l.unitPriceCents / 100).toFixed(2).replace(".", ",") }))
      : [{ key: 0, description: "", quantity: "1", unit: "ud", unitPrice: "" }],
  );

  const totals = useMemo(() => {
    const parsed = lines.map((l) => ({ description: l.description, quantity: toNum(l.quantity) || 0, unit: l.unit, unitPriceCents: Math.round((toNum(l.unitPrice) || 0) * 100) }));
    return proposalTotals(parsed, toNum(discount) || 0, toNum(tax) || 0);
  }, [lines, discount, tax]);

  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const add = (line?: Partial<Line>) => {
    setLines((ls) => [...ls.filter((l) => l.description || l.unitPrice), { key: counter, description: "", quantity: "1", unit: "ud", unitPrice: "", ...line }]);
    setCounter((c) => c + 1);
  };
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const per = billingPeriod[billing].per;
  const cell = "field min-h-11 px-3 lg:min-h-10";

  return (
    <div className="space-y-6">
      <input type="hidden" name="lines" value={JSON.stringify(lines.map(({ key: _k, ...l }) => l))} />
      {[...selected].map((id) => <input key={id} type="hidden" name="productIds" value={id} />)}

      <fieldset className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
        <legend className="sr-only">Tipo de propuesta</legend>
        <p className="mb-3 font-semibold text-slate-900">Tipo de propuesta</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(proposalKind) as ProposalKind[]).map((k) => (
            <label key={k} className={`cursor-pointer rounded-xl border p-3 transition ${kind === k ? "border-teal-600 bg-teal-50 ring-2 ring-teal-600/15" : "border-slate-200 hover:bg-slate-50"}`}>
              <input
                type="radio"
                name="kind"
                value={k}
                checked={kind === k}
                onChange={() => {
                  setKind(k);
                  if (k === "MAINTENANCE" && billing === "ONE_OFF") setBilling("YEARLY");
                  if (k === "SALE_PACK") setBilling("ONE_OFF");
                }}
                className="sr-only"
              />
              <span className="block font-medium text-slate-800">{proposalKind[k].label}</span>
              <span className="block text-xs text-slate-500">{proposalKind[k].hint}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="billingPeriod" className="field-label">Facturación</label>
            <select id="billingPeriod" name="billingPeriod" value={billing} onChange={(e) => setBilling(e.target.value as BillingPeriod)} className="field appearance-auto">
              {(Object.keys(billingPeriod) as BillingPeriod[]).map((b) => <option key={b} value={b}>{billingPeriod[b].label}</option>)}
            </select>
          </div>
          {billing !== "ONE_OFF" && (
            <div>
              <label htmlFor="durationMonths" className="field-label">Duración del contrato (meses)</label>
              <input id="durationMonths" name="durationMonths" inputMode="numeric" defaultValue={initial.durationMonths ?? 12} className="field" />
            </div>
          )}
          {kind === "MAINTENANCE" && (
            <div>
              <label htmlFor="visitsPerYear" className="field-label">Revisiones al año</label>
              <input id="visitsPerYear" name="visitsPerYear" inputMode="numeric" defaultValue={initial.visitsPerYear ?? 4} className="field" />
            </div>
          )}
        </div>
      </fieldset>

      {products.length > 0 && (kind === "MAINTENANCE" || kind === "REPAIR_PLAN" || selected.size > 0) && (
        <fieldset className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <legend className="sr-only">Equipos incluidos</legend>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">Equipos incluidos <span className="font-normal text-slate-500">· {selected.size} de {products.length}</span></p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelected(new Set(products.map((p) => p.id)))} className="min-h-10 rounded-lg px-3 text-sm font-medium text-teal-700 hover:bg-teal-50">Todos</button>
              <button type="button" onClick={() => setSelected(new Set())} className="min-h-10 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100">Ninguno</button>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {products.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="mt-0.5 size-5 shrink-0 accent-teal-600" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800">{p.label}</span>
                    <span className="block truncate text-xs text-slate-500">{p.detail}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {kind === "MAINTENANCE" && selected.size > 0 && (
            <button
              type="button"
              onClick={() => add({ description: `Revisión preventiva de equipos (${selected.size} equipos)`, quantity: String(selected.size), unit: "equipo" })}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium text-teal-700 ring-1 ring-inset ring-teal-200 hover:bg-teal-50"
            >
              <Wrench className="size-4" /> Añadir concepto de revisión para los {selected.size} equipos
            </button>
          )}
        </fieldset>
      )}

      <fieldset className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
        <legend className="sr-only">Conceptos</legend>
        <p className="mb-1 font-semibold text-slate-900">Conceptos</p>
        <p className="mb-3 text-sm text-slate-500">{billing === "ONE_OFF" ? "Precios con IVA aparte." : `Importe ${per} (IVA aparte).`}</p>
        <ul className="space-y-3">
          {lines.map((l) => (
            <li key={l.key} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_5rem_5rem_7rem_auto] sm:bg-transparent sm:p-0">
              <input value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} placeholder="Descripción (p. ej. Silla de ruedas Breezy Premier)" aria-label="Descripción" className={`${cell} col-span-2 sm:col-span-1`} />
              <div className="col-span-2 grid grid-cols-3 gap-2 sm:contents">
                <input value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} inputMode="decimal" aria-label="Cantidad" placeholder="Cant." className={cell} />
                <input value={l.unit} onChange={(e) => update(l.key, { unit: e.target.value })} aria-label="Unidad" placeholder="ud" className={cell} />
                <input value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: e.target.value })} inputMode="decimal" aria-label="Precio unidad (€)" placeholder="Precio €" className={cell} />
              </div>
              <button type="button" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : ls))} aria-label="Quitar concepto" className="col-start-2 row-start-1 grid size-11 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 sm:col-start-auto sm:row-start-auto lg:size-10">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => add()} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
          <Plus className="size-4" /> Añadir concepto
        </button>

        <div className="mt-5 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="discountPercent" className="field-label">Descuento (%)</label>
              <input id="discountPercent" name="discountPercent" value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" className="field" />
            </div>
            <div>
              <label htmlFor="taxRate" className="field-label">IVA (%)</label>
              <input id="taxRate" name="taxRate" value={tax} onChange={(e) => setTax(e.target.value)} inputMode="decimal" className="field" />
            </div>
          </div>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between text-slate-600"><dt>Suma de conceptos</dt><dd>{formatEUR(totals.grossCents)}</dd></div>
            {totals.discountCents > 0 && <div className="flex justify-between text-slate-600"><dt>Descuento</dt><dd>−{formatEUR(totals.discountCents)}</dd></div>}
            <div className="flex justify-between text-slate-600"><dt>IVA</dt><dd>{formatEUR(totals.taxCents)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-semibold text-slate-900"><dt>Total {per}</dt><dd>{formatEUR(totals.totalCents)}</dd></div>
          </dl>
        </div>
      </fieldset>
    </div>
  );
}
