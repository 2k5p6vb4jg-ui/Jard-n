"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, KeyRound, LayoutGrid, LogOut, Search, ShieldCheck, X } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { lock } from "@/app/acceso/actions";
import { navFor } from "./nav";
import { canSee, ROLES } from "@/lib/permissions";

export type NavUser = { name: string; role: UserRole } | null;
import { BrandMark } from "./BrandMark";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Barra lateral (escritorio/tablet horizontal), en el tono oscuro de la marca */
export function Sidebar({ businessName, logoUrl, user }: { businessName: string; logoUrl: string | null; user: NavUser }) {
  const pathname = usePathname();
  const nav = navFor(user?.role);
  if (pathname === "/acceso") return null;
  // El fondo oscuro ocupa toda la altura de la página; el contenido de la barra se queda fijo al desplazarse
  return (
    <div className="hidden w-64 shrink-0 bg-ink-900 lg:block">
      <aside className="sticky top-0 flex h-dvh flex-col text-white/70">
        <Link href="/" className="flex items-center gap-3 px-5 pb-6 pt-7">
          <BrandMark name={businessName} logoUrl={logoUrl} />
          <div className="min-w-0 leading-tight">
            <p className="truncate font-semibold text-white">{businessName}</p>
            <p className="text-xs text-gold-400/90">Gestión clínica y taller</p>
          </div>
        </Link>
        <form action="/buscar" className="relative mx-4 mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
          <input
            name="q"
            placeholder="Buscar…"
            aria-label="Buscar"
            className="min-h-10 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-white/40 focus:border-gold-500/60 focus:bg-white/10"
          />
        </form>
        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {nav.all.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] font-medium transition ${
                  active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"
                }`}
              >
                {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-gold-500" aria-hidden />}
                <Icon className={`size-5 ${active ? "text-gold-400" : "text-white/50"}`} />
                {label}
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="mx-3 flex items-center gap-1 rounded-lg bg-white/5 py-1 pl-3 pr-1">
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="text-xs text-white/50">{ROLES[user.role].label}</p>
            </div>
            <Link href="/mi-pin" aria-label="Mi PIN" title="Mi PIN" className="grid size-10 place-items-center rounded-lg hover:bg-white/10 hover:text-white">
              <KeyRound className="size-[18px]" />
            </Link>
            <form action={lock}>
              <button type="submit" aria-label="Salir" title="Salir (cambiar de usuario)" className="grid size-10 place-items-center rounded-lg hover:bg-white/10 hover:text-white">
                <LogOut className="size-[18px]" />
              </button>
            </form>
          </div>
        )}
        <div className="m-3 flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-white/50">
          <ShieldCheck className="size-4 shrink-0 text-gold-500" />
          Datos guardados solo en este equipo
        </div>
      </aside>
    </div>
  );
}

/** Barra inferior (móvil / tablet vertical) */
export function BottomNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Al cambiar de página se cierra el panel
  useEffect(() => setOpen(false), [pathname]);
  if (pathname === "/acceso") return null;
  const { bar, more } = navFor(user?.role);
  const moreActive = more.some((n) => isActive(pathname, n.href)) || pathname === "/buscar";
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Más secciones">
          <button type="button" aria-label="Cerrar" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink-950/50" />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 shadow-lift">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200" aria-hidden />
            <div className="grid grid-cols-3 gap-2">
              {[...more, { href: "/buscar", label: "Buscar", icon: Search }].map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl text-sm font-medium transition ${active ? "bg-teal-50 text-teal-700" : "bg-slate-50 text-slate-700 active:bg-slate-100"}`}
                  >
                    <Icon className={`size-6 ${active ? "" : "text-teal-700"}`} />
                    {label}
                  </Link>
                );
              })}
            </div>
            {user && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 p-2 pl-4">
                <p className="min-w-0 flex-1 truncate text-sm text-slate-600"><span className="font-medium text-slate-800">{user.name}</span> · {ROLES[user.role].label}</p>
                <Link href="/mi-pin" className="flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 bg-white"><KeyRound className="size-4" />Mi PIN</Link>
                <form action={lock}>
                  <button type="submit" className="flex min-h-11 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200"><LogOut className="size-4" />Salir</button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {bar.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? "text-teal-700" : "text-slate-500"}`}
            >
              {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-gold-500" aria-hidden />}
              <Icon className="size-6" />
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${open || moreActive ? "text-teal-700" : "text-slate-500"}`}
        >
          {moreActive && !open && <span className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-gold-500" aria-hidden />}
          {open ? <X className="size-6" /> : <LayoutGrid className="size-6" />}
          Más
        </button>
      </nav>
    </>
  );
}

/** Cabecera del móvil / tablet vertical: marca, búsqueda y estadísticas */
export function MobileHeader({ businessName, logoUrl, user }: { businessName: string; logoUrl: string | null; user: NavUser }) {
  const pathname = usePathname();
  if (pathname === "/acceso") return null;
  const iconBtn = "grid size-11 place-items-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white";
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-ink-900 px-4 py-2 lg:hidden">
      <Link href="/" className="flex min-w-0 flex-1 items-center gap-2.5">
        <BrandMark name={businessName} logoUrl={logoUrl} size="sm" />
        <span className="truncate font-semibold text-white">{businessName}</span>
      </Link>
      <Link href="/buscar" aria-label="Buscar" className={`${iconBtn} ${pathname === "/buscar" ? "bg-white/10 text-gold-400" : ""}`}><Search className="size-5" /></Link>
      {canSee(user?.role, "estadisticas") && <Link href="/estadisticas" aria-label="Estadísticas" className={`${iconBtn} ${pathname === "/estadisticas" ? "bg-white/10 text-gold-400" : ""}`}><BarChart3 className="size-5" /></Link>}
    </header>
  );
}
