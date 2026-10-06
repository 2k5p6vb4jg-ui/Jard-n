import { LayoutDashboard, Users, Wrench, ScanBarcode, Settings, type LucideIcon } from "lucide-react";

export const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/taller", label: "Taller", icon: Wrench },
  { href: "/trazabilidad", label: "Trazabilidad", icon: ScanBarcode },
  { href: "/configuracion", label: "Ajustes", icon: Settings },
];
