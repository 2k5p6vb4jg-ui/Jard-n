"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { correctionType } from "@/lib/labels";

type Row = { key: number; type: string; side: string; valueMm: string; notes: string };

/** Lista editable de correcciones de la plantilla (cuñas, olivas, alzas…). */
export function CorrectionsEditor({ initial }: { initial: { type: string; side: string; valueMm: number | null; notes: string | null }[] }) {
  const [rows, setRows] = useState<Row[]>(
    initial.map((c, i) => ({ key: i, type: c.type, side: c.side, valueMm: c.valueMm?.toString().replace(".", ",") ?? "", notes: c.notes ?? "" })),
  );
  const [next, setNext] = useState(initial.length);

  const add = () => {
    setRows((r) => [...r, { key: next, type: "ARCH_SUPPORT", side: "BOTH", valueMm: "", notes: "" }]);
    setNext((n) => n + 1);
  };

  return (
    <div className="space-y-3 sm:col-span-2 lg:col-span-3">
      {rows.length === 0 && <p className="text-sm text-slate-500">Sin correcciones añadidas.</p>}
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[2fr_1fr_1fr_2fr_auto]">
          <select name="corr_type" defaultValue={r.type} className="field col-span-2 sm:col-span-1" aria-label="Tipo de corrección">
            {Object.entries(correctionType).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select name="corr_side" defaultValue={r.side} className="field" aria-label="Lado">
            <option value="BOTH">Ambos</option>
            <option value="LEFT">Izquierdo</option>
            <option value="RIGHT">Derecho</option>
          </select>
          <input name="corr_mm" defaultValue={r.valueMm} inputMode="decimal" placeholder="mm" className="field" aria-label="Milímetros" />
          <input name="corr_notes" defaultValue={r.notes} placeholder="Notas" className="field col-span-2 sm:col-span-1" aria-label="Notas" />
          <button
            type="button"
            onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
            className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl text-rose-600 hover:bg-rose-50 sm:col-span-1 sm:w-12"
            aria-label="Quitar corrección"
          >
            <Trash2 className="size-5" />
            <span className="sm:hidden">Quitar</span>
          </button>
        </div>
      ))}
      <button type="button" onClick={add} className="inline-flex min-h-12 items-center gap-2 rounded-xl px-4 font-medium text-teal-700 ring-1 ring-inset ring-teal-200 hover:bg-teal-50">
        <Plus className="size-5" />
        Añadir corrección
      </button>
    </div>
  );
}
