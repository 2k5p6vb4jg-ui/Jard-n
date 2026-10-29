import { ShieldX } from "lucide-react";
import { ROLES } from "@/lib/permissions";
import { currentSession } from "@/lib/session";
import { LinkButton } from "@/components/ui/Button";

export const metadata = { title: "Sin permiso" };

export default async function NoPermissionPage() {
  const { user } = await currentSession();
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-slate-200/80 bg-white p-8 text-center shadow-card">
      <span className="mx-auto grid size-12 place-items-center rounded-xl bg-gold-50 text-gold-700"><ShieldX className="size-6" /></span>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Esta sección no está disponible</h1>
      <p className="mt-2 text-slate-600">
        {user ? `El perfil «${ROLES[user.role].label}» de ${user.name} no tiene acceso a esta parte de la app.` : "Su usuario no tiene acceso a esta parte de la app."} Si lo necesita, pídalo a Administración.
      </p>
      <LinkButton href="/" className="mt-6">Ir al Panel</LinkButton>
    </div>
  );
}
