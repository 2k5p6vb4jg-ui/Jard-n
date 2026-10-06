"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import type { ActionState } from "@/lib/forms";

/** Supresión de todos los datos del paciente, con confirmación escrita. */
export function ErasePatientForm({ action, name }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; name: string }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 font-medium text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-50">
        <Trash2 className="size-5" />
        Suprimir todos los datos
      </button>
    );
  }
  return (
    <form action={formAction} className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <p className="flex gap-2 font-semibold"><AlertTriangle className="size-5 shrink-0" />Se borrará definitivamente a {name}</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Ficha, plantillas, medias, estudios de pisada, fotos y demás documentos (también los archivos).</li>
        <li>Las órdenes de taller y presupuestos se conservan <strong>anonimizados</strong>, y los productos con nº de serie quedan sin titular.</li>
        <li>Las copias de seguridad existentes aún contienen sus datos hasta que se renueven.</li>
      </ul>
      <p>Antes de borrar, compruebe con su asesoría si existe obligación legal de conservar parte de esta información.</p>
      <label className="block font-medium" htmlFor="erase-confirm">Escriba ELIMINAR para confirmar</label>
      <input id="erase-confirm" name="confirm" value={text} onChange={(e) => setText(e.target.value.toUpperCase())} autoComplete="off" className="field border-rose-300" />
      {state?.error && <p role="alert" className="font-medium">{state.error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="min-h-12 flex-1 rounded-xl bg-white font-medium text-slate-700 ring-1 ring-inset ring-slate-300">Cancelar</button>
        <button type="submit" disabled={text !== "ELIMINAR" || pending} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 font-medium text-white disabled:opacity-40">
          {pending ? <Loader2 className="size-5 animate-spin" /> : <Trash2 className="size-5" />}
          Suprimir
        </button>
      </div>
    </form>
  );
}
