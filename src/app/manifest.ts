import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { DEFAULT_COLORS } from "@/lib/branding.colors";

export const dynamic = "force-dynamic";

/** Permite instalar la app (Edge/Chrome: «Instalar Jardón Ortopedia») y abrirla en su propia ventana. */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await prisma.settings.findUnique({ where: { id: 1 }, select: { businessName: true, darkColor: true, updatedAt: true } });
  const name = s?.businessName ?? "Jardón Ortopedia";
  const v = s?.updatedAt.getTime() ?? 0;
  return {
    id: "/",
    name,
    short_name: name.length > 14 ? name.split(" ")[0] : name,
    description: "Gestión clínica y de taller",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f4f1",
    theme_color: s?.darkColor ?? DEFAULT_COLORS.darkColor,
    lang: "es",
    icons: [
      { src: `/api/icono?t=192&v=${v}`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/api/icono?t=512&v=${v}`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/api/icono?t=512&v=${v}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nueva reparación", url: "/taller/nueva" },
      { name: "Nuevas plantillas", url: "/plantillas/nueva" },
      { name: "Buscar", url: "/buscar" },
    ],
  };
}
