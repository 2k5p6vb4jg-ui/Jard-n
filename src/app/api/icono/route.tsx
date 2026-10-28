import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { loadLogo } from "@/lib/branding";
import { DEFAULT_COLORS, isHexColor } from "@/lib/branding.colors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Icono de la app (escritorio, barra de tareas, pantalla de inicio del móvil): el logo sobre blanco
 * o, mientras no haya, las iniciales en dorado sobre el color principal. ?t=<tamaño en px>
 */
export async function GET(req: Request) {
  const size = Math.min(1024, Math.max(32, Number(new URL(req.url).searchParams.get("t")) || 512));
  const s = await prisma.settings.findUnique({ where: { id: 1 }, select: { businessName: true, logoPath: true, brandColor: true, accentColor: true } });
  const logo = await loadLogo(s?.logoPath);
  const brand = isHexColor(s?.brandColor) ? s.brandColor : DEFAULT_COLORS.brandColor;
  const accent = isHexColor(s?.accentColor) ? s.accentColor : DEFAULT_COLORS.accentColor;
  const initials = (s?.businessName ?? "JO")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

  const body = logo ? (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/${logo.type === "png" ? "png" : "jpeg"};base64,${Buffer.from(logo.bytes).toString("base64")}`} alt="" style={{ width: "80%", height: "80%", objectFit: "contain" }} />
    </div>
  ) : (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: brand, color: accent, fontSize: size * 0.4, fontWeight: 700, letterSpacing: size * 0.01 }}>
      {initials || "JO"}
    </div>
  );
  return new ImageResponse(body, { width: size, height: size, headers: { "Cache-Control": "no-cache" } });
}
