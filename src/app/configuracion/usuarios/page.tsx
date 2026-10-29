import Link from "next/link";
import { ArrowLeft, ChevronDown, KeyRound, LogOut, Plus, Save, ShieldAlert, ShieldCheck, Trash2, UserCog, Users } from "lucide-react";
import type { User, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/permissions";
import { currentSession } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubmitButton } from "@/components/ui/Form";
import { InlineForm } from "@/components/ui/InlineForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import type { Tone } from "@/lib/labels";
import { closeAllSessions, deleteUser, disableAccess, saveSessionHours, saveUser } from "./actions";

export const metadata = { title: "Usuarios" };

const ROLE_TONE: Record<UserRole, Tone> = { ADMIN: "gold", FRONT_DESK: "teal", WORKSHOP: "sky" };
const lastLogin = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" });

function PinFields({ idp, optional = false }: { idp: string; optional?: boolean }) {
  const props = { type: "password", inputMode: "numeric" as const, autoComplete: "new-password", minLength: 4, maxLength: 8, pattern: "\\d{4,8}", required: !optional, className: "field" };
  return (
    <>
      <div>
        <label className="field-label" htmlFor={`${idp}-pin`}>{optional ? "PIN nuevo (si hay que cambiarlo)" : "PIN (4-8 cifras)"}</label>
        <input id={`${idp}-pin`} name="pin" {...props} />
      </div>
      <div>
        <label className="field-label" htmlFor={`${idp}-confirmPin`}>Repetir PIN</label>
        <input id={`${idp}-confirmPin`} name="confirmPin" {...props} />
      </div>
    </>
  );
}

function RoleSelect({ idp, value }: { idp: string; value?: UserRole }) {
  return (
    <div>
      <label className="field-label" htmlFor={`${idp}-role`}>Perfil</label>
      <select id={`${idp}-role`} name="role" defaultValue={value ?? "FRONT_DESK"} className="field appearance-auto">
        {(Object.keys(ROLES) as UserRole[]).map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
      </select>
    </div>
  );
}

export default async function UsersPage() {
  const [users, settings, { user: me }] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.settings.findUnique({ where: { id: 1 }, select: { sessionHours: true } }),
    currentSession(),
  ]);
  const activeAdmins = users.filter((u) => u.role === "ADMIN" && u.active).length;
  const canDelete = (u: User) => u.id !== me?.id && !(u.role === "ADMIN" && u.active && activeAdmins === 1);

  return (
    <>
      <Link href="/configuracion" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="size-4" /> Ajustes
      </Link>
      <PageHeader title="Usuarios y acceso" description="Cada persona entra con su propio PIN; el registro de actividad guarda quién hizo cada cambio" />

      {users.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Activar el acceso con PIN" icon={KeyRound} />
            <div className="space-y-4 p-5">
              <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                <ShieldAlert className="size-5 shrink-0" />
                Ahora mismo no se pide PIN: cualquier dispositivo conectado a la Wi-Fi de la tienda puede abrir las fichas de los clientes. Se recomienda activarlo.
              </p>
              <p className="text-sm text-slate-600">Cree primero su usuario (con perfil de Administración). Después podrá añadir al resto del equipo.</p>
              <InlineForm action={saveUser.bind(null, null)} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="field-label" htmlFor="first-name">Nombre</label>
                    <input id="first-name" name="name" required defaultValue="Administración" className="field" />
                  </div>
                  <PinFields idp="first" />
                </div>
                <SubmitButton icon={<KeyRound className="size-5" />}>Crear usuario y activar el PIN</SubmitButton>
              </InlineForm>
            </div>
          </Card>
          <RolesCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader title={users.length === 1 ? "1 usuario" : `${users.length} usuarios`} icon={Users} subtitle="Pulse en una persona para cambiar su nombre, perfil o PIN" />
              <ul className="divide-y divide-slate-100">
                {users.map((u) => (
                  <li key={u.id}>
                    <details className="group">
                      <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                        <span className={`font-medium ${u.active ? "text-slate-800" : "text-slate-400 line-through"}`}>{u.name}</span>
                        {u.id === me?.id && <span className="text-sm text-slate-500">(usted)</span>}
                        <Badge tone={ROLE_TONE[u.role]}>{ROLES[u.role].label}</Badge>
                        <span className="ml-auto flex items-center gap-2 text-sm text-slate-500">
                          {u.lastLoginAt ? `Último acceso ${lastLogin.format(u.lastLoginAt)}` : "Aún no ha entrado"}
                          <ChevronDown className="size-5 text-slate-400 transition group-open:rotate-180" />
                        </span>
                      </summary>
                      <InlineForm action={saveUser.bind(null, u.id)} className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-5">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="field-label" htmlFor={`${u.id}-name`}>Nombre</label>
                            <input id={`${u.id}-name`} name="name" required defaultValue={u.name} className="field" />
                          </div>
                          <RoleSelect idp={u.id} value={u.role} />
                          <PinFields idp={u.id} optional />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 ring-1 ring-inset ring-slate-200">
                            <input type="checkbox" name="active" defaultChecked={u.active} disabled={u.id === me?.id} className="size-5 accent-teal-600" />
                            {u.id === me?.id && <input type="hidden" name="active" value="on" />}
                            <span className="text-sm font-medium text-slate-700">Activo</span>
                          </label>
                          <SubmitButton icon={<Save className="size-5" />} variant="secondary">Guardar</SubmitButton>
                        </div>
                      </InlineForm>
                      {canDelete(u) && (
                        <form action={deleteUser.bind(null, u.id)} className="border-t border-slate-100 bg-slate-50/60 px-5 pb-4">
                          <ConfirmButton message={`¿Borrar el usuario «${u.name}»? Lo que hizo seguirá en el registro de actividad.`} icon={<Trash2 className="size-4" />} className="text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600">
                            Borrar usuario
                          </ConfirmButton>
                        </form>
                      )}
                    </details>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader title="Nuevo usuario" icon={Plus} />
              <InlineForm action={saveUser.bind(null, null)} className="space-y-4 p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="field-label" htmlFor="new-name">Nombre</label>
                    <input id="new-name" name="name" required placeholder="Lucía" className="field" />
                  </div>
                  <RoleSelect idp="new" />
                  <PinFields idp="new" />
                </div>
                <p className="text-sm text-slate-500">Cada persona puede cambiar después su PIN desde «Mi PIN», en el menú.</p>
                <SubmitButton icon={<Plus className="size-5" />}>Añadir usuario</SubmitButton>
              </InlineForm>
            </Card>
          </div>

          <div className="space-y-6">
            <RolesCard />
            <Card>
              <CardHeader title="Sesiones" icon={UserCog} />
              <div className="space-y-4 p-5">
                <InlineForm action={saveSessionHours} className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="field-label" htmlFor="sessionHours">Volver a pedir el PIN tras (horas)</label>
                    <input id="sessionHours" name="sessionHours" inputMode="numeric" defaultValue={settings?.sessionHours ?? 12} className="field" />
                  </div>
                  <SubmitButton icon={<Save className="size-5" />} variant="secondary">Guardar</SubmitButton>
                </InlineForm>
                <form action={closeAllSessions}>
                  <ConfirmButton message="¿Cerrar la sesión en todos los demás dispositivos? Tendrán que volver a poner su PIN." icon={<LogOut className="size-5" />} className="min-h-12 w-full justify-center px-4 text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                    Cerrar todas las sesiones
                  </ConfirmButton>
                </form>
                <details className="rounded-xl border border-slate-200 p-3 text-sm">
                  <summary className="cursor-pointer font-medium text-slate-600">Quitar el acceso con PIN</summary>
                  <p className="mt-2 text-slate-500">Borra todos los usuarios y la app vuelve a abrirse sin PIN en la red de la tienda. No recomendado.</p>
                  <InlineForm action={disableAccess} className="mt-3 space-y-3">
                    <input name="currentPin" type="password" inputMode="numeric" placeholder="Su PIN" aria-label="Su PIN" required className="field" />
                    <SubmitButton icon={<ShieldAlert className="size-5" />} variant="danger" className="w-full">Quitar el PIN</SubmitButton>
                  </InlineForm>
                </details>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function RolesCard() {
  return (
    <Card>
      <CardHeader title="Perfiles" icon={ShieldCheck} />
      <dl className="space-y-3 p-5 text-sm">
        {(Object.keys(ROLES) as UserRole[]).map((r) => (
          <div key={r}>
            <dt><Badge tone={ROLE_TONE[r]}>{ROLES[r].label}</Badge></dt>
            <dd className="mt-1 text-slate-600">{ROLES[r].description}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
