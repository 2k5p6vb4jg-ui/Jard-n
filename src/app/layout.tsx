import type { Metadata, Viewport } from "next";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import { ensureDailyBackup } from "@/lib/backup";
import { BottomNav, Sidebar } from "@/components/layout/Navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Jardón Ortopedia", template: "%s · Jardón Ortopedia" },
  description: "Jardón Ortopedia · Gestión clínica y de taller (uso local).",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d9488",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 }, select: { businessName: true, logoPath: true, updatedAt: true, pinHash: true } });
  // Copia diaria en segundo plano (no bloquea la carga de la página)
  ensureDailyBackup();

  return (
    <html lang="es">
      <body>
        <div className="flex min-h-dvh">
          <Sidebar businessName={settings?.businessName ?? "Jardón Ortopedia"} logoUrl={settings?.logoPath ? `/api/logo?v=${settings.updatedAt.getTime()}` : null} hasPin={!!settings?.pinHash} />
          <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-10 lg:pt-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
