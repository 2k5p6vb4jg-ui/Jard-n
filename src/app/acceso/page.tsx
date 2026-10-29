import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { prisma } from "@/lib/prisma";
import { PinPad } from "@/components/auth/PinPad";
import { login } from "./actions";

export const metadata = { title: "Acceso" };
export const dynamic = "force-dynamic";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ volver?: string }> }) {
  const { volver = "/" } = await searchParams;
  const s = await prisma.settings.findUnique({ where: { id: 1 }, select: { businessName: true, logoPath: true, updatedAt: true } });
  if (!s || (await prisma.user.count({ where: { active: true } })) === 0) redirect("/");

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink-900">
      <div className="mx-auto flex min-h-full max-w-xs flex-col justify-center gap-8 px-4 py-10">
        <div className="text-center">
          <span className="inline-block"><BrandMark name={s.businessName} logoUrl={s.logoPath ? `/api/logo?v=${s.updatedAt.getTime()}` : null} size="lg" /></span>
          <h1 className="mt-4 text-xl font-semibold text-white">{s.businessName}</h1>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-white/60">
            <Lock className="size-4" /> Introduzca su PIN
          </p>
        </div>
        <PinPad action={login} back={volver} />
      </div>
    </div>
  );
}
