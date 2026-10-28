/** Colores de marca por defecto (mismos valores que en globals.css y schema.prisma). */
export const DEFAULT_COLORS = { brandColor: "#1E5A46", accentColor: "#C5A059", darkColor: "#25282B" };

const HEX = /^#[0-9a-f]{6}$/i;
export const isHexColor = (v: string | null | undefined): v is string => !!v && HEX.test(v);

/** Bloque CSS que sustituye los colores por defecto por los de Ajustes (solo admite #rrggbb). */
export function brandCss(s: { brandColor?: string | null; accentColor?: string | null; darkColor?: string | null } | null) {
  const c = (v: string | null | undefined, d: string) => (isHexColor(v) ? v : d);
  return `:root{--brand:${c(s?.brandColor, DEFAULT_COLORS.brandColor)};--accent:${c(s?.accentColor, DEFAULT_COLORS.accentColor)};--dark:${c(s?.darkColor, DEFAULT_COLORS.darkColor)}}`;
}
