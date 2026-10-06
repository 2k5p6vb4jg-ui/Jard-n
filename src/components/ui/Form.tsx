"use client";

import { createContext, startTransition, useActionState, useContext, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import type { ActionState } from "@/lib/forms";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

/** Formulario con estado de error y botón de guardar que se bloquea mientras envía. */
export function ActionForm({
  action,
  children,
  submitLabel = "Guardar",
  submitIcon = <Save className="size-5" />,
  cancelHref,
  className = "",
  successMessage = "Cambios guardados.",
}: {
  action: Action;
  children: ReactNode;
  submitLabel?: string;
  submitIcon?: ReactNode;
  cancelHref?: string;
  className?: string;
  /** Se muestra cuando la acción termina sin redirigir */
  successMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} onSubmit={(e) => submitKeepingValues(e, formAction)} className={`space-y-6 ${className}`}>
      {state?.error && <ErrorBanner message={state.error} />}
      {children}
      {state?.error && <ErrorBanner message={state.error} />}
      <div className="sticky bottom-[4.5rem] z-30 flex gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur sm:justify-end sm:p-3 lg:bottom-4">
        {state?.ok && (
          <p role="status" className="mr-auto flex items-center gap-2 px-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="size-5" />
            {successMessage}
          </p>
        )}
        {cancelHref && (
          <a href={cancelHref} className="inline-flex min-h-12 items-center justify-center rounded-xl px-5 font-medium text-slate-600 hover:bg-slate-100">
            Cancelar
          </a>
        )}
        <SubmitButton icon={submitIcon} pending={pending} className="flex-1 sm:flex-none">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

/** Estado de envío compartido con los botones de formularios enviados a mano. */
export const FormPending = createContext(false);

/**
 * React 19 vacía los campos del formulario tras ejecutar una acción, también cuando
 * devuelve un error de validación. Enviamos a mano para conservar lo escrito.
 */
export function submitKeepingValues(e: FormEvent<HTMLFormElement>, formAction: (fd: FormData) => void) {
  e.preventDefault();
  const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
  startTransition(() => formAction(fd));
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
      <AlertCircle className="mt-0.5 size-5 shrink-0" />
      {message}
    </div>
  );
}

export function SubmitButton({
  children,
  icon = <Save className="size-5" />,
  variant = "primary",
  className = "",
  name,
  value,
  pending: pendingProp,
}: {
  children: ReactNode;
  /** Icono ya renderizado, p. ej. <Play className="size-5" /> (serializable desde el servidor) */
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  name?: string;
  value?: string;
  /** Estado de envío explícito (formularios enviados con submitKeepingValues) */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const ctxPending = useContext(FormPending);
  const pending = pendingProp ?? (ctxPending || status.pending);
  const styles = {
    primary: "bg-teal-600 text-white hover:bg-teal-700",
    secondary: "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  }[variant];
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-medium shadow-sm transition active:scale-[0.98] disabled:opacity-60 ${styles} ${className}`}
    >
      {pending ? <Loader2 className="size-5 animate-spin" /> : icon}
      {children}
    </button>
  );
}
