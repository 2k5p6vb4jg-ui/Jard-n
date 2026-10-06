"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Delete, Loader2, LogIn } from "lucide-react";
import type { ActionState } from "@/lib/forms";

/** Teclado numérico grande para introducir el PIN con el dedo (también admite el teclado físico). */
export function PinPad({ action, back }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; back: string }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const submit = () => {
    if (pin.length < 4 || pending) return;
    const fd = new FormData();
    fd.set("pin", pin);
    fd.set("volver", back);
    startTransition(() => formAction(fd));
  };

  useEffect(() => {
    if (state?.error) {
      setPin("");
      setShake(true);
      const t = setTimeout(() => setShake(false), 400);
      return () => clearTimeout(t);
    }
  }, [state]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) setPin((p) => (p.length < 8 ? p + e.key : p));
      else if (e.key === "Backspace") setPin((p) => p.slice(0, -1));
      else if (e.key === "Enter") formRef.current?.requestSubmit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const key = "grid h-16 place-items-center rounded-2xl bg-white text-2xl font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 transition active:scale-95 active:bg-slate-100 disabled:opacity-50";

  return (
    <form ref={formRef} onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-6">
      <div className={`flex h-6 justify-center gap-3 ${shake ? "animate-[shake_0.4s]" : ""}`} aria-live="polite" aria-label={`${pin.length} dígitos introducidos`}>
        {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
          <span key={i} className={`size-4 rounded-full transition ${i < pin.length ? "bg-teal-600" : "bg-slate-200"}`} />
        ))}
      </div>
      <p className="h-5 text-center text-sm font-medium text-rose-600" role="alert">{state?.error}</p>
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" className={key} disabled={pending} onClick={() => setPin((p) => (p.length < 8 ? p + d : p))}>{d}</button>
        ))}
        <button type="button" className={`${key} text-slate-500`} aria-label="Borrar" disabled={pending} onClick={() => setPin((p) => p.slice(0, -1))}>
          <Delete className="size-7" />
        </button>
        <button type="button" className={key} disabled={pending} onClick={() => setPin((p) => (p.length < 8 ? p + "0" : p))}>0</button>
        <button type="submit" aria-label="Entrar" disabled={pin.length < 4 || pending} className="grid h-16 place-items-center rounded-2xl bg-teal-600 text-white shadow-sm transition hover:bg-teal-700 active:scale-95 disabled:opacity-40">
          {pending ? <Loader2 className="size-7 animate-spin" /> : <LogIn className="size-7" />}
        </button>
      </div>
    </form>
  );
}
