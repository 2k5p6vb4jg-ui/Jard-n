import { BarChart3, Building2, Footprints, Truck, LayoutDashboard, Users, Wrench, ScanBarcode, Settings, type LucideIcon } from "lucide-react";

/** `mobile`: también en la barra inferior del móvil, que solo tiene sitio para 5; el resto se abre desde «Más». */
export const NAV: { href: string; label: string; icon: LucideIcon; mobile?: boolean }[] = [
  { href: "/", label: "Panel", icon: LayoutDashboard, mobile: true },
  { href: "/pacientes", label: "Clientes", icon: Users, mobile: true },
  { href: "/taller", label: "Reparaciones", icon: Wrench, mobile: true },
  { href: "/plantillas", label: "Plantillas", icon: Footprints, mobile: true },
  { href: "/pedidos", label: "Pedidos", icon: Truck },
  { href: "/centros", label: "Centros", icon: Building2 },
  { href: "/trazabilidad", label: "Trazabilidad", icon: ScanBarcode },
  { href: "/estadisticas", label: "Estadísticas", icon: BarChart3 },
  { href: "/configuracion", label: "Ajustes", icon: Settings },
];
