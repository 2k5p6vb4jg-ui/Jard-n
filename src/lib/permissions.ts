import type { UserRole } from "@prisma/client";

/**
 * Qué ve cada perfil. Se comprueba en el proxy (páginas y API), en el menú y en las acciones delicadas.
 * Sin usuarios creados la app está abierta y todo se permite.
 */
export const ROLES: Record<UserRole, { label: string; description: string }> = {
  ADMIN: { label: "Administración", description: "Todo, incluidos Ajustes, usuarios, copias y estadísticas" },
  FRONT_DESK: { label: "Mostrador", description: "Clientes, agenda, reparaciones, plantillas, pedidos y centros" },
  WORKSHOP: { label: "Taller", description: "Reparaciones, plantillas, pedidos, agenda y trazabilidad, sin fichas clínicas" },
};

export type Section = "clientes" | "centros" | "estadisticas" | "ajustes";

const SECTION_PATHS: Record<Section, string[]> = {
  clientes: ["/pacientes", "/api/pacientes"],
  centros: ["/centros", "/api/propuestas"],
  estadisticas: ["/estadisticas"],
  ajustes: ["/configuracion", "/api/backup"],
};

const DENIED: Record<UserRole, Section[]> = {
  ADMIN: [],
  FRONT_DESK: ["estadisticas", "ajustes"],
  WORKSHOP: ["clientes", "centros", "estadisticas", "ajustes"],
};

/** `role` null = acceso sin usuarios (app abierta) */
export const canSee = (role: UserRole | null | undefined, section: Section | undefined) =>
  !role || !section || !DENIED[role].includes(section);

export function sectionOf(pathname: string): Section | undefined {
  return (Object.keys(SECTION_PATHS) as Section[]).find((s) => SECTION_PATHS[s].some((p) => pathname === p || pathname.startsWith(p + "/")));
}

export const canAccessPath = (role: UserRole | null | undefined, pathname: string) => canSee(role, sectionOf(pathname));
