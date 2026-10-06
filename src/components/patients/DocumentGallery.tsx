"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, Download, ExternalLink, FileSpreadsheet, FileText, Trash2, X } from "lucide-react";
import { documentType } from "@/lib/labels";
import { formatDate } from "@/lib/dates";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

export interface GalleryDoc {
  id: string;
  type: keyof typeof documentType;
  source: "UPLOAD" | "CAMERA";
  title: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  takenAt: Date | null;
  createdAt: Date;
  linkLabel: string | null;
}

const url = (d: GalleryDoc) => `/api/uploads/${d.storagePath}`;
const isImage = (d: GalleryDoc) => d.mimeType.startsWith("image/") && d.mimeType !== "image/heic";
const size = (b: number) => (b > 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Galería de documentos de la ficha, con filtros por tipo y visor a pantalla completa para las fotos. */
export function DocumentGallery({ docs, deleteAction }: { docs: GalleryDoc[]; deleteAction: (documentId: string) => Promise<void> }) {
  const [filter, setFilter] = useState<string>("ALL");
  const [open, setOpen] = useState<number | null>(null);

  const types = useMemo(() => [...new Set(docs.map((d) => d.type))], [docs]);
  const visible = filter === "ALL" ? docs : docs.filter((d) => d.type === filter);
  const images = visible.filter(isImage);
  const current = open !== null ? images[open] : null;

  const step = useCallback((dir: 1 | -1) => setOpen((i) => (i === null ? null : (i + dir + images.length) % images.length)), [images.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  if (docs.length === 0) return <p className="px-5 py-6 text-center text-slate-500">Todavía no hay documentos.</p>;

  const chip = (value: string, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setFilter(value)}
      className={`min-h-10 whitespace-nowrap rounded-full px-4 text-sm font-medium ring-1 ring-inset ${filter === value ? "bg-teal-600 text-white ring-teal-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="p-5">
      {types.length > 1 && (
        <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1">
          {chip("ALL", `Todos · ${docs.length}`)}
          {types.map((t) => chip(t, documentType[t]))}
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {visible.map((d) => (
          <li key={d.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white">
            {isImage(d) ? (
              <button type="button" onClick={() => setOpen(images.indexOf(d))} className="block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url(d)} alt={d.title} loading="lazy" className="aspect-[4/3] w-full bg-slate-100 object-cover transition group-hover:opacity-90" />
              </button>
            ) : (
              <a href={url(d)} target="_blank" rel="noreferrer" className="grid aspect-[4/3] place-items-center bg-slate-50 text-slate-400 hover:text-teal-600">
                {d.mimeType === "application/pdf" ? <FileText className="size-12" /> : <FileSpreadsheet className="size-12" />}
              </a>
            )}
            <div className="space-y-1 p-3">
              <p className="truncate font-medium text-slate-800" title={d.title}>{d.title}</p>
              <p className="flex items-center gap-1 truncate text-xs text-slate-500">
                {d.source === "CAMERA" && <Camera className="size-3.5 shrink-0" />}
                {documentType[d.type]} · {formatDate(d.takenAt ?? d.createdAt)} · {size(d.sizeBytes)}
              </p>
              {d.linkLabel && <p className="truncate text-xs text-indigo-600">{d.linkLabel}</p>}
              <div className="flex items-center gap-1 pt-1">
                <a href={url(d)} target="_blank" rel="noreferrer" aria-label="Abrir" className="grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><ExternalLink className="size-4" /></a>
                <a href={`${url(d)}?descargar=1`} aria-label="Descargar" className="grid size-10 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"><Download className="size-4" /></a>
                <form action={deleteAction.bind(null, d.id)} className="ml-auto">
                  <ConfirmButton message={`¿Eliminar «${d.title}»? El archivo se borrará del equipo.`} icon={<Trash2 className="size-4" />} ariaLabel="Eliminar" className="min-h-10 w-10 text-slate-400 hover:bg-rose-50 hover:text-rose-600" />
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {current && (
        <div role="dialog" aria-modal="true" aria-label={current.title} className="fixed inset-0 z-50 flex flex-col bg-slate-950/95" onClick={() => setOpen(null)}>
          <div className="flex items-center gap-3 p-3 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0 flex-1 pl-2">
              <p className="truncate font-medium">{current.title}</p>
              <p className="text-sm text-slate-400">{documentType[current.type]} · {formatDate(current.takenAt ?? current.createdAt)} · {open! + 1}/{images.length}</p>
            </div>
            <a href={`${url(current)}?descargar=1`} aria-label="Descargar" className="grid size-12 place-items-center rounded-xl hover:bg-white/10"><Download className="size-6" /></a>
            <button type="button" onClick={() => setOpen(null)} aria-label="Cerrar" className="grid size-12 place-items-center rounded-xl hover:bg-white/10"><X className="size-7" /></button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url(current)} alt={current.title} className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
            {images.length > 1 && (
              <>
                <button type="button" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Anterior" className="absolute left-2 grid size-14 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronLeft className="size-8" /></button>
                <button type="button" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Siguiente" className="absolute right-2 grid size-14 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"><ChevronRight className="size-8" /></button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
