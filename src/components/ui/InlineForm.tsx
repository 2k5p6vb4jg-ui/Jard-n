"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import type { ActionState } from "@/lib/forms";
import { FormPending, submitKeepingValues } from "./Form";

/** Formulario compacto que se vacía tras guardar correctamente (añadir pieza, añadir tiempo…). */
export function InlineForm({
  action,
  children,
  className = "",
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={formAction} onSubmit={(e) => submitKeepingValues(e, formAction)} className={className}>
      {state?.error && (
        <p role="alert" className="mb-3 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </p>
      )}
      <FormPending.Provider value={pending}>{children}</FormPending.Provider>
    </form>
  );
}
