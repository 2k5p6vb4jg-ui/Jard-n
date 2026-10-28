"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copia un texto al portapapeles (si el navegador no lo permite, lo muestra para copiarlo a mano). */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "done" | "manual">("idle");
  return (
    <div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setState("done");
            setTimeout(() => setState("idle"), 2000);
          } catch {
            setState("manual"); // http en la red local: el portapapeles puede estar bloqueado
          }
        }}
        className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 lg:min-h-11 lg:px-4 lg:text-[15px]"
      >
        {state === "done" ? <Check className="size-5 text-emerald-600" /> : <Copy className="size-5" />}
        {state === "done" ? "Copiado" : label}
      </button>
      {state === "manual" && <textarea readOnly value={text} rows={6} onFocus={(e) => e.currentTarget.select()} className="field mt-2 py-3 text-sm" />}
    </div>
  );
}
