import { BarChart3, LayoutDashboard, Users, Wrench, ScanBarcode, Settings, type LucideIcon } from "lucide-react";

export const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/taller", label: "Taller", icon: Wrench },
  { href: "/trazabilidad", label: "Trazabilidad", icon: ScanBarcode },
  { href: "/configuracion", label: "Ajustes", icon: Settings },
];

/** Solo en la barra lateral (la barra inferior del móvil tiene sitio para 5) */
export const NAV_EXTRA: { href: string; label: string; icon: LucideIcon }[] = [{ href: "/estadisticas", label: "Estadísticas", icon: BarChart3 }];
