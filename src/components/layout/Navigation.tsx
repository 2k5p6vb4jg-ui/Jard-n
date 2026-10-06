"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Footprints, ShieldCheck } from "lucide-react";
import { NAV } from "./nav";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Barra lateral (escritorio/tablet horizontal) */
export function Sidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-teal-500 to-indigo-500 text-white shadow-sm">
          <Footprints className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="font-semibold text-slate-900">{businessName}</p>
          <p className="text-xs text-slate-500">Gestión clínica y taller</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
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
