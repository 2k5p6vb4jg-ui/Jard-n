"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronLeft, ChevronRight, ImageIcon, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { shrinkImage } from "@/lib/images";
import { deletePhoto } from "@/app/photos";
import { ConfirmButton } from "./ConfirmButton";

const MAX_SIDE = 1600; // px
type Upload = { key: number; name: string; pct: number; error?: string };

/** Sube un archivo con XMLHttpRequest para poder informar del progreso. */
function send(url: string, file: File, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = `Error ${xhr.status}`;
      try {
        msg = JSON.parse(xhr.responseText).error ?? msg;
      } catch {}
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Sin conexión con el ordenador de la tienda."));
    const fd = new FormData();
    fd.append("foto", file);
    xhr.send(fd);
  });
}

/**
 * Fotos de un registro: botón «Añadir foto» (en el móvil ofrece cámara o galería), reducción a 1600 px en el
 * propio dispositivo, progreso de subida, miniaturas y visor a pantalla completa con borrado.
 */
export function PhotoGallery({ photos, uploadUrl }: { photos: { id: string; url: string }[]; uploadUrl: string }) {
  const router = useRouter();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const counter = useRef(0);
  const busy = uploads.some((u) => !u.error && u.pct < 100);

  useEffect(() => {
    if (open !== null && open >= photos.length) setOpen(photos.length ? photos.length - 1 : null);
  }, [open, photos.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);

  async function add(list: FileList | null) {
    if (!list?.length) return;
    const items = [...list].map((f) => ({ key: ++counter.current, file: f }));
    setUploads((u) => [...u.filter((x) => x.error), ...items.map(({ key, file }) => ({ key, name: file.name, pct: 0 }))]);
    const update = (key: number, patch: Partial<Upload>) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, ...patch } : x)));
    let anyOk = false;
    for (const { key, file } of items) {
      try {
        const small = await shrinkImage(file, `foto-${key}.jpg`, MAX_SIDE);
        await send(uploadUrl, small, (pct) => update(key, { pct: Math.min(pct, 99) }));
        update(key, { pct: 100 });
        anyOk = true;
      } catch (e) {
        update(key, { error: (e as Error).message });
      }
    }
    setUploads((u) => u.filter((x) => x.error));
    if (anyOk) router.refresh();
  }

  const current = open !== null ? photos[open] : null;

  return (
    <div className="space-y-4 p-5">
      <label className={`flex min-h-14 cursor-pointer items-center justify-center gap-3 rounded-xl bg-teal-600 px-5 font-medium text-white shadow-sm transition hover:bg-teal-700 active:scale-[0.98] ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
        {busy ? "Subiendo…" : "Añadir foto"}
        <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </label>

      {uploads.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {uploads.map((u) =>
            u.error ? (
              <li key={u.key} role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span className="min-w-0 flex-1">No se pudo subir «{u.name}»: {u.error}</span>
                <button type="button" onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))} aria-label="Cerrar aviso" className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-rose-100"><X className="size-4" /></button>
              </li>
            ) : (
              <li key={u.key} className="text-sm text-slate-600">
                <div className="mb-1 flex justify-between gap-2"><span className="truncate">{u.name}</span><span>{u.pct} %</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${u.pct}%` }} /></div>
              </li>
            ),
          )}
        </ul>
      )}

      {photos.length === 0 ? (
        <p className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500"><ImageIcon className="size-4" />Sin fotos</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p, i) => (
            <li key={p.id}>
              <button type="button" onClick={() => setOpen(i)} aria-label={`Ver foto ${i + 1}`} className="block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 focus-visible:ring-4 focus-visible:ring-teal-500/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {current && open !== null && createPortal(
        <div role="dialog" aria-modal="true" aria-label={`Foto ${open + 1} de ${photos.length}`} className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center gap-2 p-3 text-white">
            <span className="flex-1 pl-2 text-sm">{open + 1} / {photos.length}</span>
            <form action={deletePhoto.bind(null, current.id)}>
              <ConfirmButton message="¿Borrar esta foto? No se puede deshacer." icon={<Trash2 className="size-5" />} className="px-4 text-rose-300 hover:bg-white/10">
                Borrar
              </ConfirmButton>
            </form>
            <button type="button" onClick={() => setOpen(null)} aria-label="Cerrar" className="grid size-12 place-items-center rounded-xl hover:bg-white/10"><X className="size-6" /></button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-2" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt="" className="max-h-full max-w-full object-contain" />
            {photos.length > 1 && (
              <>
                <button type="button" onClick={() => setOpen((open - 1 + photos.length) % photos.length)} aria-label="Anterior" className="absolute left-2 grid size-12 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60"><ChevronLeft className="size-7" /></button>
                <button type="button" onClick={() => setOpen((open + 1) % photos.length)} aria-label="Siguiente" className="absolute right-2 grid size-12 place-items-center rounded-full bg-black/40 text-white hover:bg-black/60"><ChevronRight className="size-7" /></button>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
