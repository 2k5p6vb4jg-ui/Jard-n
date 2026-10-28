"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { SubmitButton } from "@/components/ui/Form";

/** «Comprobar la última copia»: la revisa sin restaurarla y dice qué contiene. */
export function VerifyBackup({ action }: { action: (s: { ok?: boolean; message?: string } | undefined, fd: FormData) => Promise<{ ok: boolean; message: string }> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-2">
      <SubmitButton icon={<ShieldCheck className="size-5" />} variant="secondary" pending={pending} className="w-full">Comprobar la última copia</SubmitButton>
      {state && (
        <p role="status" className={`flex items-start gap-2 rounded-lg p-3 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {state.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
          {state.message}
        </p>
      )}
    </form>
  );
}
