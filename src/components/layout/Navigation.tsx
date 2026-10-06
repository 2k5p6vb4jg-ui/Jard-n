"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Footprints, Lock, Search, ShieldCheck } from "lucide-react";
import { lock } from "@/app/acceso/actions";
import { NAV, NAV_EXTRA } from "./nav";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Barra lateral (escritorio/tablet horizontal) */
export function Sidebar({ businessName, logoUrl, hasPin }: { businessName: string; logoUrl: string | null; hasPin: boolean }) {
  const pathname = usePathname();
  if (pathname === "/acceso") return null;
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="size-10 shrink-0 rounded-xl object-contain" />
        ) : (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500 text-white shadow-sm">
            <Footprints className="size-5" />
          </span>
        )}
        <div className="leading-tight">
          <p className="font-semibold text-slate-900">{businessName}</p>
          <p className="text-xs text-slate-500">Gestión clínica y taller</p>
        </div>
      </div>
      <form action="/buscar" className="relative mx-3 mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input name="q" placeholder="Buscar…" aria-label="Buscar" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/15" />
      </form>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {[...NAV, ...NAV_EXTRA].map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-12 items-center gap-3 rounded-xl px-4 font-medium transition ${
                active ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
      {hasPin && (
        <form action={lock} className="mx-3">
          <button type="submit" className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900">
            <Lock className="size-5" />
            Bloquear
          </button>
        </form>
      )}
      <div className="m-3 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <ShieldCheck className="size-4 text-teal-600" />
        Datos almacenados solo en este equipo
      </div>
    </aside>
  );
}

/** Barra inferior (móvil / tablet vertical) */
export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/acceso") return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${
              active ? "text-teal-600" : "text-slate-500"
            }`}
          >
            <Icon className="size-6" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Cabecera del móvil / tablet vertical: nombre, búsqueda y estadísticas */
export function MobileHeader({ businessName, logoUrl }: { businessName: string; logoUrl: string | null }) {
  const pathname = usePathname();
  if (pathname === "/acceso") return null;
  const iconBtn = "grid size-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100";
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur lg:hidden">
      <Link href="/" className="flex min-w-0 flex-1 items-center gap-2">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="size-8 shrink-0 rounded-lg object-contain" />
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-teal-500 to-indigo-500 text-white">
            <Footprints className="size-4" />
          </span>
        )}
        <span className="truncate font-semibold text-slate-900">{businessName}</span>
      </Link>
      <Link href="/buscar" aria-label="Buscar" className={`${iconBtn} ${pathname === "/buscar" ? "bg-teal-50 text-teal-700" : ""}`}><Search className="size-5" /></Link>
      <Link href="/estadisticas" aria-label="Estadísticas" className={`${iconBtn} ${pathname === "/estadisticas" ? "bg-teal-50 text-teal-700" : ""}`}><BarChart3 className="size-5" /></Link>
    </header>
  );
}
