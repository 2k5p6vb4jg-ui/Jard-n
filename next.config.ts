import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Las pruebas automáticas compilan en otra carpeta para no tocar la versión instalada (.next)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Permite abrir el servidor de desarrollo desde tablets/móviles de la Wi-Fi local.
  // (En producción con `npm start` no hace falta.)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  // Sin telemetría ni imágenes remotas: todo se sirve desde el propio equipo.
  images: { unoptimized: true },
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  experimental: {
    // Subidas de estudios de pisada / fotos de huellas desde el móvil.
    serverActions: { bodySizeLimit: "25mb" },
  },
};

export default nextConfig;
