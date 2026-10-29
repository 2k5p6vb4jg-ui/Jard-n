import type { UserRole } from "@prisma/client";
import { canSee, type Section } from "@/lib/permissions";
import { BarChart3, Building2, CalendarDays, Footprints, Truck, LayoutDashboard, Users, Wrench, ScanBarcode, Settings, type LucideIcon } from "lucide-react";

/** `mobile`: también en la barra inferior del móvil, que solo tiene sitio para 5; el resto se abre desde «Más». */
type NavItem = { href: string; label: string; icon: LucideIcon; mobile?: boolean; section?: Section };

export const NAV: NavItem[] = [
  { href: "/", label: "Panel", icon: LayoutDashboard, mobile: true },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/pacientes", label: "Clientes", icon: Users, mobile: true, section: "clientes" },
  { href: "/taller", label: "Reparaciones", icon: Wrench, mobile: true },
  { href: "/plantillas", label: "Plantillas", icon: Footprints, mobile: true },
  { href: "/pedidos", label: "Pedidos", icon: Truck },
  { href: "/centros", label: "Centros", icon: Building2, section: "centros" },
  { href: "/trazabilidad", label: "Trazabilidad", icon: ScanBarcode },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3, section: "estadisticas" },
  { href: "/configuracion", label: "Ajustes", icon: Settings, section: "ajustes" },
];

/** Menú según el perfil: la barra del móvil siempre lleva 4 secciones (se completa con las siguientes permitidas). */
export function navFor(role: UserRole | null | undefined) {
  const allowed = NAV.filter((n) => canSee(role, n.section));
  const bar = allowed.filter((n) => n.mobile);
  for (const n of allowed) if (bar.length < 4 && !bar.includes(n)) bar.push(n);
  bar.sort((a, b) => allowed.indexOf(a) - allowed.indexOf(b));
  return { all: allowed, bar, more: allowed.filter((n) => !bar.includes(n)) };
}
