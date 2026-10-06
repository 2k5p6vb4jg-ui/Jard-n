"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, FileText, Loader2, Upload, X } from "lucide-react";
import type { ActionState } from "@/lib/forms";
import { documentType } from "@/lib/labels";

type Picked = { key: number; file: File; camera: boolean; preview: string | null };

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/heic,.csv,.json,.zip";
const MAX_SIDE = 2400; // px: suficiente para ver detalle de una huella, ~5-10 veces menos peso

/**
 * Reduce fotos grandes del móvil antes de enviarlas por la Wi-Fi.
 * Si el navegador no puede decodificar la imagen (p. ej. HEIC fuera de Safari) se envía la original.
 */
async function shrinkImage(file: File, name: string): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1_500_000) return new File([file], name, { type: file.type });
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
    if (!blob || blob.size >= file.size) return new File([file], name, { type: file.type });
    return new File([blob], name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return new File([file], name, { type: file.type });
  }
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");

export function DocumentUploader({
  action,
  links,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  /** Prescripciones a las que se puede vincular el documento */
  links: { value: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [processing, setProcessing] = useState(false);
  const [type, setType] = useState("FOOTPRINT_PHOTO");
  const counter = useRef(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      picked.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
      setPicked([]);
      formRef.current?.reset();
      setType("FOOTPRINT_PHOTO");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  async function add(list: FileList | null, camera: boolean) {
    if (!list?.length) return;
    setProcessing(true);
    const files = await Promise.all(
      [...list].map(async (f) => {
        // Las fotos de cámara llegan todas como "image.jpg": se renombran para distinguirlas
        const name = camera ? `foto-${stamp()}-${++counter.current}.jpg` : f.name;
        const file = await shrinkImage(f, name);
        return { key: ++counter.current, file, camera, preview: file.type.startsWith("image/") && file.type !== "image/heic" ? URL.createObjectURL(file) : null };
      }),
    );
    setPicked((p) => [...p, ...files]);
    if (camera) setType((t) => (t === "GAIT_STUDY" ? "FOOTPRINT_PHOTO" : t));
    else if (files.some((f) => f.file.type === "application/pdf")) setType("GAIT_STUDY");
    setProcessing(false);
  }

  function remove(key: number) {
    setPicked((p) => {
      const item = p.find((x) => x.key === key);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return p.filter((x) => x.key !== key);
    });
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("camera");
    fd.delete("upload");
    for (const p of picked) {
      fd.append("files", p.file);
      if (p.camera) fd.append("cameraNames", p.file.name);
    }
    startTransition(() => formAction(fd));
  }

  const busy = pending || processing;
  const pickButton = "flex min-h-16 cursor-pointer items-center justify-center gap-3 rounded-xl px-5 text-base font-medium transition active:scale-[0.98]";

  return (
    <form ref={formRef} onSubmit={submit} className="space-y-4 border-b border-slate-100 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {/* capture="environment" abre directamente la cámara trasera en móvil/tablet (funciona sin HTTPS) */}
        <label className={`${pickButton} bg-teal-600 text-white shadow-sm hover:bg-teal-700`}>
          <Camera className="size-6" />
          Hacer foto
          <input type="file" name="camera" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { add(e.target.files, true); e.target.value = ""; }} />
        </label>
        <label className={`${pickButton} bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50`}>
          <Upload className="size-6" />
          Subir archivo
          <input type="file" name="upload" accept={ACCEPT} multiple className="sr-only" onChange={(e) => { add(e.target.files, false); e.target.value = ""; }} />
        </label>
      </div>
      <p className="text-center text-xs text-slate-500">PDF, JPG, PNG, WEBP, HEIC o datos exportados (CSV, JSON, ZIP) · máx. 25 MB por archivo</p>

      {processing && (
        <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />Preparando imágenes…</p>
      )}

      {picked.length > 0 && (
        <>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {picked.map((p) => (
              <li key={p.key} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {p.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.preview} alt="" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="grid aspect-square place-items-center p-2 text-center text-xs text-slate-500">
                    <FileText className="mx-auto mb-1 size-8 text-slate-400" />
                    <span className="line-clamp-2 break-all">{p.file.name}</span>
                  </div>
                )}
                <button type="button" onClick={() => remove(p.key)} aria-label="Quitar" className="absolute right-1 top-1 grid size-9 place-items-center rounded-full bg-white/90 text-slate-600 shadow hover:text-rose-600">
                  <X className="size-5" />
                </button>
                {p.camera && <Camera className="absolute bottom-1.5 left-1.5 size-4 text-white drop-shadow" />}
              </li>
            ))}
          </ul>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="doc-type" className="field-label">Tipo</label>
              <select id="doc-type" name="type" value={type} onChange={(e) => setType(e.target.value)} className="field">
                {Object.entries(documentType).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="doc-title" className="field-label">Título</label>
              <input id="doc-title" name="title" placeholder="Opcional" className="field" />
            </div>
            <div>
              <label htmlFor="doc-date" className="field-label">Fecha del estudio</label>
              <input id="doc-date" name="takenAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="field" />
            </div>
            <div>
              <label htmlFor="doc-link" className="field-label">Vincular a</label>
              <select id="doc-link" name="link" defaultValue="" className="field">
                <option value="">— Ficha general —</option>
                {links.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 font-medium text-white shadow-sm hover:bg-teal-700 disabled:opacity-60 sm:w-auto">
            {pending ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
            Guardar {picked.length} {picked.length === 1 ? "archivo" : "archivos"}
          </button>
        </>
      )}

      {state?.error && (
        <p role="alert" className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><AlertCircle className="size-4 shrink-0" />{state.error}</p>
      )}
      {state?.ok && picked.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" />Documentos guardados.</p>
      )}
    </form>
  );
}
