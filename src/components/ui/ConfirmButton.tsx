"use client";

import { useFormStatus } from "react-dom";
import { useContext, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { FormPending } from "./Form";

/** Botón de envío que pide confirmación (borrados, entregas, anulaciones). */
export function ConfirmButton({
  message,
  icon,
  children,
  className = "",
  ariaLabel,
}: {
  message: string;
  /** Icono ya renderizado (serializable desde el servidor) */
  icon: ReactNode;
  children?: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const { pending } = useFormStatus();
  const ctxPending = useContext(FormPending);
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={ariaLabel}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.98] disabled:opacity-60 ${className}`}
    >
      {pending || ctxPending ? <Loader2 className="size-5 animate-spin" /> : icon}
      {children}
    </button>
  );
}
