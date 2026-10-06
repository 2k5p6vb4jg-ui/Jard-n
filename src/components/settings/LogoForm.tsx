"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { AlertCircle, ImageUp, Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/forms";

/** Subida del logo con vista previa inmediata. */
export function LogoForm({ action, currentUrl }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; currentUrl: string | null }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [preview, setPreview] = useState<string | null>(null);
  // Tras guardar, se muestra el logo servido por la app (URL nueva con ?v=)
  useEffect(() => {
    if (state?.ok) setPreview(null);
  }, [state]);
  const shown = preview ?? currentUrl;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="space-y-3"
    >
      <div className="grid h-32 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="Logo" className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="text-sm text-slate-500">Sin logo</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
          <ImageUp className="size-5" />
          Elegir imagen
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </label>
        {preview && (
          <button type="submit" disabled={pending} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 font-medium text-white hover:bg-teal-700 disabled:opacity-60">
            {pending && <Loader2 className="size-5 animate-spin" />}
            Guardar logo
          </button>
        )}
      </div>
      {state?.error && <p role="alert" className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="size-4" />{state.error}</p>}
      <p className="text-xs text-slate-500">PNG o JPG, máx. 2 MB. Aparece en la barra lateral y en los presupuestos.</p>
    </form>
  );
}
