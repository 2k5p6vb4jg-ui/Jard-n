"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileArchive, History, Loader2, Upload, X } from "lucide-react";

type Target = { kind: "file"; file: File } | { kind: "stored"; name: string };

const size = (b: number) => (b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/**
 * Restauración de una copia: desde un .zip del ordenador/pendrive o desde la carpeta de copias.
 * Exige escribir RESTAURAR; antes de sustituir nada, el servidor guarda una copia del estado actual.
 */
export function RestorePanel({ stored }: { stored: { name: string; size: number; createdAt: string; label: string }[] }) {
  const [target, setTarget] = useState<Target | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function run() {
    if (!target) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(target.kind === "stored" ? `/api/backup/restaurar?archivo=${encodeURIComponent(target.name)}` : "/api/backup/restaurar", {
        method: "POST",
        headers: { "x-confirmar": "RESTAURAR", "content-type": "application/zip" },
        body: target.kind === "file" ? target.file : undefined,
      });
      const data = await res.json().catch(() => ({ error: "Respuesta no válida del servidor." }));
      if (!res.ok) throw new Error(data.error ?? "No se pudo restaurar.");
      const c = data.manifest?.counts ?? {};
      setResult({
        ok: true,
        text: `Copia del ${new Date(data.manifest.createdAt).toLocaleString("es-ES")} restaurada: ${c.patients ?? 0} pacientes, ${c.documents ?? 0} documentos, ${c.workOrders ?? 0} órdenes.${data.migrated ? " Base de datos actualizada a la versión actual." : ""} El estado anterior se guardó como «${data.safetyCopy}». Recargando…`,
      });
      setTarget(null);
      setConfirm("");
      setTimeout(() => window.location.assign("/"), 4000);
    } catch (e) {
      setResult({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {stored.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><History className="size-4" />Copias guardadas en el equipo</p>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {stored.map((b) => (
              <li key={b.name} className="flex items-center gap-2 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-700">{new Date(b.createdAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</p>
                  <p className="truncate text-xs text-slate-500">{b.label} · {size(b.size)}</p>
                </div>
                <a href={`/api/backup/archivo/${encodeURIComponent(b.name)}`} className="rounded-lg px-2 py-2 font-medium text-teal-700 hover:bg-teal-50">Descargar</a>
                <button type="button" onClick={() => { setTarget({ kind: "stored", name: b.name }); setResult(null); }} className="rounded-lg px-2 py-2 font-medium text-slate-600 hover:bg-slate-100">
                  Restaurar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
        <Upload className="size-5" />
        Restaurar desde un archivo .zip
        <input
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setTarget({ kind: "file", file: f });
            setResult(null);
            e.target.value = "";
          }}
        />
      </label>

      {target && (
        <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-2 text-rose-900">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Se sustituirán TODOS los datos actuales</p>
              <p className="mt-1 flex items-center gap-1.5"><FileArchive className="size-4" />{target.kind === "file" ? `${target.file.name} (${size(target.file.size)})` : target.name}</p>
              <p className="mt-1">Antes se guardará automáticamente una copia del estado actual. Avise a los compañeros: deben dejar de usar la app unos segundos.</p>
            </div>
            <button type="button" onClick={() => setTarget(null)} aria-label="Cancelar" className="ml-auto grid size-9 shrink-0 place-items-center rounded-lg hover:bg-rose-100"><X className="size-5" /></button>
          </div>
          <label className="block text-sm font-medium text-rose-900" htmlFor="restore-confirm">Escriba RESTAURAR para confirmar</label>
          <input id="restore-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value.toUpperCase())} autoComplete="off" className="field border-rose-300" />
          <button
            type="button"
            disabled={confirm !== "RESTAURAR" || busy}
            onClick={run}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 font-medium text-white shadow-sm hover:bg-rose-700 disabled:opacity-40"
          >
            {busy && <Loader2 className="size-5 animate-spin" />}
            {busy ? "Restaurando…" : "Restaurar copia"}
          </button>
        </div>
      )}

      {result && (
        <p role={result.ok ? "status" : "alert"} className={`flex gap-2 rounded-lg p-3 text-sm ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {result.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}
          {result.text}
        </p>
      )}
    </div>
  );
}
