import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Tabla para listados en el ordenador (en el móvil se muestran tarjetas). Cada fila es un enlace
 * completo gracias a <RowLink>, que se estira sobre la fila.
 */
export function Table({ head, children }: { head: (string | { label: string; className?: string })[]; children: ReactNode }) {
  return (
    <table className="hidden w-full text-left text-sm md:table">
      <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
        <tr>
          {head.map((h, i) => {
            const { label, className = "" } = typeof h === "string" ? { label: h } : h;
            return (
              <th key={i} className={`py-2.5 font-medium first:pl-5 last:pr-5 ${i === 0 ? "" : "px-3"} ${className}`}>
                {label}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <tr className="relative transition hover:bg-slate-50">{children}</tr>;
}

export function Cell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-3 align-middle first:pl-5 last:pr-5 ${className}`}>{children}</td>;
}

/** Enlace que hace clicable toda la fila */
export function RowLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={`after:absolute after:inset-0 ${className}`}>
      {children}
    </Link>
  );
}

/** Estilo común de los filtros tipo «pastilla» de los listados */
export function chipClass(active: boolean) {
  return `flex min-h-10 items-center whitespace-nowrap rounded-lg px-3.5 text-sm font-medium ring-1 ring-inset transition ${
    active ? "bg-ink-900 text-white ring-ink-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"
  }`;
}
