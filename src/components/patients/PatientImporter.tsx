"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { applyMapping, decodeText, guessMapping, IMPORT_FIELDS, type ImportField, parseCsv } from "@/lib/csv";
import { importPatients, type ImportResult } from "@/app/pacientes/importar";

const BATCH = 300;

/** Importación de clientes desde un CSV: columnas reconocidas solas, vista previa y envío por tandas. */
export function PatientImporter() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<Partial<Record<ImportField, number>>>({});
  const [consent, setConsent] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");

  const headers = rows[0] ?? [];
  const body = hasHeader ? rows.slice(1) : rows;
  const mapped = useMemo(() => applyMapping(body, mapping), [body, mapping]);
  const hasName = mapping.firstName !== undefined || mapping.lastName !== undefined || mapping.fullName !== undefined;

  async function load(file: File | undefined) {
    if (!file) return;
    setResult(null);
    setError("");
    const parsed = parseCsv(decodeText(await file.arrayBuffer()));
    if (parsed.length < 2) return setError("El archivo está vacío o no es un CSV.");
    setFileName(file.name);
    setRows(parsed);
    const guess = guessMapping(parsed[0]);
    setHasHeader(Object.keys(guess).length > 0);
    setMapping(guess);
  }

  async function run() {
    setError("");
    const total: ImportResult = { created: 0, duplicates: [], errors: [] };
    const offset = hasHeader ? 2 : 1; // nº de fila tal y como se ve en Excel
    try {
      for (let i = 0; i < mapped.length; i += BATCH) {
        setProgress(Math.round((i / mapped.length) * 100));
        const r = await importPatients(mapped.slice(i, i + BATCH), i + offset, consent);
        total.created += r.created;
        total.duplicates.push(...r.duplicates);
        total.errors.push(...r.errors);
      }
      setResult(total);
      setRows([]);
    } catch (e) {
      setError(`Se ha cortado la importación: ${(e as Error).message}. Se importaron ${total.created} clientes; puede volver a cargar el archivo: los ya importados se saltan solos.`);
      setResult(total);
    } finally {
      setProgress(null);
    }
  }

  if (result && rows.length === 0) {
    return (
      <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
        <p className="flex items-center gap-2 text-lg font-semibold text-emerald-700"><CheckCircle2 className="size-6" />{result.created} clientes importados</p>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        {result.duplicates.length > 0 && (
          <details className="rounded-xl bg-slate-50 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-slate-700">{result.duplicates.length} ya existían y se han saltado</summary>
            <ul className="mt-2 max-h-60 list-disc overflow-y-auto pl-5 text-slate-600">{result.duplicates.map((d) => <li key={d}>{d}</li>)}</ul>
          </details>
        )}
        {result.errors.length > 0 && (
          <details className="rounded-xl bg-rose-50 p-3 text-sm" open>
            <summary className="cursor-pointer font-medium text-rose-800">{result.errors.length} filas sin importar</summary>
            <ul className="mt-2 max-h-60 list-disc overflow-y-auto pl-5 text-rose-700">{result.errors.map((d) => <li key={d}>{d}</li>)}</ul>
          </details>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href="/pacientes" className="inline-flex min-h-12 items-center rounded-xl bg-teal-600 px-5 font-medium text-white hover:bg-teal-700 lg:min-h-11">Ver clientes</Link>
          <button type="button" onClick={() => setResult(null)} className="inline-flex min-h-12 items-center rounded-xl px-5 font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 lg:min-h-11">Importar otro archivo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center hover:border-teal-500 hover:bg-teal-50/40">
        <FileSpreadsheet className="size-8 text-teal-600" />
        <span className="font-medium text-slate-800">{fileName || "Elegir archivo CSV"}</span>
        <span className="text-sm text-slate-500">Desde Excel: Archivo → Guardar como → «CSV (delimitado por punto y coma)». La primera fila con los títulos de las columnas.</span>
        <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => load(e.target.files?.[0])} />
      </label>
      {error && <p role="alert" className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="size-4" />{error}</p>}

      {rows.length > 0 && (
        <>
          <fieldset className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <legend className="sr-only">Columnas</legend>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">¿Qué hay en cada columna? <span className="font-normal text-slate-500">· {body.length} filas</span></p>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="size-5 accent-teal-600" />
                La primera fila son los títulos
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(IMPORT_FIELDS) as ImportField[]).map((f) => (
                <div key={f}>
                  <label className="field-label" htmlFor={`map-${f}`}>{IMPORT_FIELDS[f]}</label>
                  <select
                    id={`map-${f}`}
                    value={mapping[f] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [f]: e.target.value === "" ? undefined : Number(e.target.value) }))}
                    className="field appearance-auto"
                  >
                    <option value="">— No importar —</option>
                    {headers.map((h, i) => <option key={i} value={i}>{hasHeader ? h || `Columna ${i + 1}` : `Columna ${i + 1} (${h})`}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </fieldset>

          <div className="min-w-0 overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-card">
            <p className="px-5 pt-4 font-semibold text-slate-900">Vista previa</p>
            <table className="mt-2 w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>{["Nombre", "Apellidos", "DNI", "Teléfono", "Localidad"].map((h) => <th key={h} className="px-5 py-2 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mapped.slice(0, 6).map((r, i) => (
                  <tr key={i}>
                    <td className="px-5 py-2">{r.firstName ?? (r.fullName ? `(${r.fullName})` : "—")}</td>
                    <td className="px-5 py-2">{[r.lastName, r.lastName2].filter(Boolean).join(" ") || "—"}</td>
                    <td className="px-5 py-2 font-mono text-xs">{r.dni ?? "—"}</td>
                    <td className="px-5 py-2">{r.phone ?? "—"}</td>
                    <td className="px-5 py-2">{r.city ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-6 shrink-0 accent-teal-600" />
              <span>
                <span className="font-medium text-slate-700">Estos clientes ya firmaron el consentimiento RGPD</span>
                <span className="block text-sm text-slate-500">Si no está seguro, déjelo sin marcar: se podrá marcar en cada ficha cuando firmen.</span>
              </span>
            </label>
            <p className="text-sm text-slate-500">Los clientes que ya existen (mismo DNI, o mismo teléfono y apellido) se saltan, así que se puede repetir sin duplicar.</p>
            {progress !== null && (
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-teal-600 transition-all" style={{ width: `${progress}%` }} /></div>
            )}
            <button
              type="button"
              disabled={!hasName || progress !== null}
              onClick={run}
              className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-teal-600 px-6 font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-50 lg:min-h-11"
            >
              {progress !== null ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
              {progress !== null ? `Importando… ${progress} %` : `Importar ${body.length} clientes`}
            </button>
            {!hasName && <p className="text-sm text-rose-600">Indique al menos en qué columna está el nombre.</p>}
          </div>
        </>
      )}
    </div>
  );
}
