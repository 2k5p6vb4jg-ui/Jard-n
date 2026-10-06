import { redirect } from "next/navigation";
import { Footprints, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PinPad } from "@/components/auth/PinPad";
import { login } from "./actions";

export const metadata = { title: "Acceso" };
export const dynamic = "force-dynamic";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ volver?: string }> }) {
  const { volver = "/" } = await searchParams;
  const s = await prisma.settings.findUnique({ where: { id: 1 }, select: { businessName: true, logoPath: true, updatedAt: true, pinHash: true } });
  if (!s?.pinHash) redirect("/");

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-50 bg-gradient-to-br from-slate-50 via-teal-50/50 to-indigo-50/60">
      <div className="mx-auto flex min-h-full max-w-xs flex-col justify-center gap-8 px-4 py-10">
        <div className="text-center">
          {s.logoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/logo?v=${s.updatedAt.getTime()}`} alt="" className="mx-auto size-16 rounded-2xl object-contain" />
          ) : (
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-500 text-white shadow-sm">
              <Footprints className="size-8" />
            </span>
          )}
          <h1 className="mt-4 text-xl font-semibold text-slate-900">{s.businessName}</h1>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-slate-500">
            <Lock className="size-4" /> Introduzca el PIN de acceso
          </p>
        </div>
        <PinPad action={login} back={volver} />
      </div>
    </div>
  );
}
