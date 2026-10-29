"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

/**
 * Recuadro para firmar con el dedo (o el ratón). Al enviar el formulario manda la firma como PNG
 * en el campo oculto `signature`. Funciona con Pointer Events: tablet, móvil y ordenador.
 */
export function SignaturePad({ name = "signature" }: { name?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  // Zona dibujada (en px de pantalla), para recortar la imagen y que la firma llene la casilla del PDF
  const box = useRef({ x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
  const grow = (p: { x: number; y: number }) => {
    const b = box.current;
    box.current = { x0: Math.min(b.x0, p.x), y0: Math.min(b.y0, p.y), x1: Math.max(b.x1, p.x), y1: Math.max(b.y1, p.y) };
  };
  const [empty, setEmpty] = useState(true);

  // Ajusta la resolución del lienzo a la pantalla (nítido en tablets) y lo limpia
  const setup = () => {
    const c = canvas.current!;
    const ratio = Math.max(window.devicePixelRatio || 1, 2);
    c.width = c.clientWidth * ratio;
    c.height = c.clientHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = "#111827";
    box.current = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    setEmpty(true);
    if (input.current) input.current.value = "";
  };

  /** PNG recortado a la firma (con un pequeño margen) */
  const exportPng = () => {
    const c = canvas.current!;
    const ratio = c.width / c.clientWidth;
    const pad = 8;
    const b = box.current;
    const x = Math.max(0, (b.x0 - pad) * ratio);
    const y = Math.max(0, (b.y0 - pad) * ratio);
    const w = Math.min(c.width - x, (b.x1 - b.x0 + 2 * pad) * ratio);
    const h = Math.min(c.height - y, (b.y1 - b.y0 + 2 * pad) * ratio);
    const out = document.createElement("canvas");
    out.width = Math.max(1, Math.round(w));
    out.height = Math.max(1, Math.round(h));
    out.getContext("2d")!.drawImage(c, x, y, w, h, 0, 0, out.width, out.height);
    return out.toDataURL("image/png");
  };

  useEffect(() => {
    setup();
    // Girar la tablet cambia el tamaño: se empieza de nuevo para no deformar la firma
    const onResize = () => setup();
    window.addEventListener("orientationchange", onResize);
    return () => window.removeEventListener("orientationchange", onResize);
  }, []);

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    canvas.current!.setPointerCapture(e.pointerId);
    last.current = point(e);
    grow(last.current);
    const ctx = canvas.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#111827";
    ctx.fill();
  };

  const move = (e: React.PointerEvent) => {
    if (!last.current) return;
    const ctx = canvas.current!.getContext("2d")!;
    const p = point(e);
    const mid = { x: (last.current.x + p.x) / 2, y: (last.current.y + p.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    grow(p);
  };

  const up = () => {
    if (!last.current) return;
    last.current = null;
    setEmpty(false);
    if (input.current) input.current.value = exportPng();
  };

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white">
        <canvas
          ref={canvas}
          aria-label="Recuadro para firmar"
          className="block h-56 w-full cursor-crosshair touch-none sm:h-64"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
        />
        <div className="pointer-events-none absolute inset-x-8 bottom-12 border-b border-slate-300" aria-hidden />
        {empty && <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-lg text-slate-300">Firme aquí con el dedo</p>}
      </div>
      <input ref={input} type="hidden" name={name} />
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={setup} disabled={empty} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40">
          <Eraser className="size-4" /> Borrar y repetir
        </button>
      </div>
    </div>
  );
}
