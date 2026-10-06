import { BellRing, Building2, DatabaseBackup, FolderDown, HardDriveDownload, ImageIcon, Info, KeyRound, Lock, Plus, Receipt, Save, ScrollText, ShieldAlert, Trash2, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { toEurosInput } from "@/lib/forms";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import { ActionForm, SubmitButton } from "@/components/ui/Form";
import { FormSection, MoneyField, NumberField, TextAreaField, TextField } from "@/components/ui/Fields";
import { InlineForm } from "@/components/ui/InlineForm";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { LogoForm } from "@/components/settings/LogoForm";
import { RestorePanel } from "@/components/settings/RestorePanel";
import { BACKUP_DIR, listBackups } from "@/lib/backup";
import { lock } from "../acceso/actions";
import { backupNow, removeLogo, removePin, saveBackupOptions, saveSettings, setPin, saveTechnician, uploadLogo } from "./actions";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const [settings, stored, technicians] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    listBackups(),
    prisma.technician.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], include: { _count: { select: { workOrders: true } } } }),
  ]);
  const hasPin = !!settings?.pinHash;
  const logoUrl = settings?.logoPath ? `/api/logo?v=${settings.updatedAt.getTime()}` : null;

  return (
    <>
      <PageHeader
        title="Ajustes"
        description="Datos de la ortopedia, técnicos y copias de seguridad"
        actions={<LinkButton href="/configuracion/registro" variant="secondary" icon={ScrollText}>Registro de actividad</LinkButton>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ActionForm action={saveSettings} submitLabel="Guardar ajustes" successMessage="Ajustes guardados.">
            <FormSection title="Datos del establecimiento" icon={Building2} description="Aparecen en la cabecera de los presupuestos">
              <TextField name="businessName" label="Nombre comercial" required defaultValue={settings?.businessName} />
              <TextField name="legalName" label="Razón social" defaultValue={settings?.legalName} />
              <TextField name="taxId" label="CIF / NIF" defaultValue={settings?.taxId} />
              <TextField name="address" label="Dirección" defaultValue={settings?.address} className="sm:col-span-2" />
              <TextField name="postalCode" label="Código postal" inputMode="numeric" defaultValue={settings?.postalCode} />
              <TextField name="city" label="Localidad" defaultValue={settings?.city} />
              <TextField name="province" label="Provincia" defaultValue={settings?.province} />
              <TextField name="healthLicense" label="Licencia sanitaria" defaultValue={settings?.healthLicense} />
              <TextField name="phone" label="Teléfono" type="tel" inputMode="tel" defaultValue={settings?.phone} />
              <TextField name="email" label="Email" type="email" inputMode="email" defaultValue={settings?.email} />
              <TextField name="website" label="Web" defaultValue={settings?.website} />
            </FormSection>

            <FormSection title="Taller y presupuestos" icon={Receipt}>
              <MoneyField name="defaultHourlyRate" label="Tarifa por hora general" defaultValue={toEurosInput(settings?.defaultHourlyRateCents)} hint="Si el técnico no tiene tarifa propia" />
              <NumberField name="defaultTaxRate" label="IVA por defecto" suffix="%" defaultValue={settings?.defaultTaxRate} />
              <NumberField name="quoteValidityDays" label="Validez de presupuestos" suffix="días" defaultValue={settings?.quoteValidityDays} />
              <TextAreaField
                name="quoteLegalFooter"
                label="Pie legal de los presupuestos"
                rows={4}
                defaultValue={settings?.quoteLegalFooter}
                hint="Protección de datos, garantía de reparación, condiciones… Revíselo con su asesoría."
              />
            </FormSection>

            <FormSection title="Avisos de renovación" icon={BellRing} description="Los cambios se aplican a las próximas entregas">
              <NumberField name="insoleRenewalMonths" label="Plantillas: revisar a los" suffix="meses" defaultValue={settings?.insoleRenewalMonths} />
              <NumberField name="stockingRenewalMonths" label="Medias: revisar a los" suffix="meses" defaultValue={settings?.stockingRenewalMonths} />
              <NumberField name="renewalWarningDays" label="Avisar con antelación de" suffix="días" defaultValue={settings?.renewalWarningDays} />
            </FormSection>
          </ActionForm>

          <Card>
            <CardHeader title="Copias de seguridad" icon={DatabaseBackup} subtitle="Base de datos + fotos y documentos en un solo .zip" />
            <div className="space-y-5 px-5 py-5">
              <div className="grid gap-4 md:grid-cols-2 md:items-start">
              <a
                href="/api/backup"
                className="flex min-h-14 items-center justify-center gap-3 rounded-xl bg-teal-600 px-5 text-lg font-medium text-white shadow-sm transition hover:bg-teal-700 active:scale-[0.98]"
              >
                <HardDriveDownload className="size-6" />
                Descargar copia completa
              </a>
              <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                <Info className="mt-0.5 size-4 shrink-0" />
                <span>Guárdela en un pendrive o disco externo cifrado y custodiado: contiene datos de salud (RGPD art. 9).</span>
              </p>

              <InlineForm action={backupNow}>
                <SubmitButton icon={<FolderDown className="size-5" />} variant="secondary" className="w-full">Guardar copia ahora en el equipo</SubmitButton>
              </InlineForm>

              <InlineForm action={saveBackupOptions} className="space-y-3 rounded-xl border border-slate-200 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" name="autoBackup" defaultChecked={settings?.autoBackup ?? true} className="mt-0.5 size-6 shrink-0 accent-teal-600" />
                  <span>
                    <span className="font-medium text-slate-700">Copia automática diaria</span>
                    <span className="block text-sm text-slate-500">Última: {settings?.lastAutoBackupAt ? settings.lastAutoBackupAt.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "nunca"}</span>
                  </span>
                </label>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="field-label" htmlFor="autoBackupKeep">Conservar las últimas</label>
                    <input id="autoBackupKeep" name="autoBackupKeep" inputMode="numeric" defaultValue={settings?.autoBackupKeep ?? 14} className="field" />
                  </div>
                  <SubmitButton icon={<Save className="size-5" />} variant="secondary">Guardar</SubmitButton>
                </div>
                <p className="break-all text-xs text-slate-500">Carpeta: <code>{BACKUP_DIR}</code> (variable BACKUP_DIR para usar un disco externo o NAS)</p>
              </InlineForm>

              </div>
              <RestorePanel
                stored={stored.map((b) => ({
                  name: b.name,
                  size: b.size,
                  createdAt: b.createdAt.toISOString(),
                  label: { auto: "Automática", manual: "Manual", "antes-de-restaurar": "Antes de restaurar", otra: "Copia" }[b.kind],
                }))}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Técnicos" icon={Users} subtitle="Los técnicos con órdenes no se borran: se desactivan" />
            <ul className="divide-y divide-slate-100">
              {technicians.map((t) => (
                <li key={t.id} className="p-5">
                  <InlineForm action={saveTechnician.bind(null, t.id)} className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[2fr_1fr_auto_auto]">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="field-label" htmlFor={`tn-${t.id}`}>Nombre</label>
                      <input id={`tn-${t.id}`} name="name" defaultValue={t.name} required className={`field ${t.active ? "" : "text-slate-400"}`} />
                    </div>
                    <div>
                      <label className="field-label" htmlFor={`tr-${t.id}`}>Tarifa/hora (€)</label>
                      <input id={`tr-${t.id}`} name="hourlyRate" inputMode="decimal" defaultValue={toEurosInput(t.hourlyRateCents)} placeholder="General" className="field" />
                    </div>
                    <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl px-3 ring-1 ring-inset ring-slate-200">
                      <input type="checkbox" name="active" defaultChecked={t.active} className="size-5 accent-teal-600" />
                      <span className="text-sm font-medium text-slate-700">Activo</span>
                    </label>
                    <SubmitButton icon={<Save className="size-5" />} variant="secondary" className="col-span-2 sm:col-span-1">Guardar</SubmitButton>
                  </InlineForm>
                  <p className="mt-2 text-xs text-slate-500">{t._count.workOrders} órdenes asignadas</p>
                </li>
              ))}
            </ul>
            <InlineForm action={saveTechnician.bind(null, null)} className="grid grid-cols-2 items-end gap-3 border-t border-slate-100 bg-slate-50/60 p-5 sm:grid-cols-[2fr_1fr_auto]">
              <div className="col-span-2 sm:col-span-1">
                <label className="field-label" htmlFor="tn-new">Nuevo técnico</label>
                <input id="tn-new" name="name" required placeholder="Nombre y apellidos" className="field" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="field-label" htmlFor="tr-new">Tarifa/hora (€)</label>
                <input id="tr-new" name="hourlyRate" inputMode="decimal" placeholder="General" className="field" />
              </div>
              <SubmitButton icon={<Plus className="size-5" />} className="col-span-2 sm:col-span-1">Añadir</SubmitButton>
            </InlineForm>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Acceso con PIN" icon={KeyRound} subtitle={hasPin ? `Activado · se pide cada ${settings?.sessionHours} h` : undefined} />
            <div className="space-y-4 p-5">
              {!hasPin && (
                <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                  Sin PIN, cualquier dispositivo conectado a la Wi-Fi de la tienda puede abrir las fichas de los pacientes. Se recomienda activarlo.
                </p>
              )}
              <InlineForm action={setPin} className="space-y-3">
                {hasPin && (
                  <div>
                    <label className="field-label" htmlFor="currentPin">PIN actual</label>
                    <input id="currentPin" name="currentPin" type="password" inputMode="numeric" autoComplete="off" required className="field" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label" htmlFor="newPin">{hasPin ? "PIN nuevo" : "PIN (4-8 cifras)"}</label>
                    <input id="newPin" name="newPin" type="password" inputMode="numeric" autoComplete="new-password" required minLength={4} maxLength={8} pattern="\d{4,8}" className="field" />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="confirmPin">Repetir PIN</label>
                    <input id="confirmPin" name="confirmPin" type="password" inputMode="numeric" autoComplete="new-password" required minLength={4} maxLength={8} pattern="\d{4,8}" className="field" />
                  </div>
                </div>
                <div>
                  <label className="field-label" htmlFor="sessionHours">Volver a pedir el PIN tras (horas)</label>
                  <input id="sessionHours" name="sessionHours" inputMode="numeric" defaultValue={settings?.sessionHours ?? 12} className="field" />
                </div>
                <SubmitButton icon={<KeyRound className="size-5" />} className="w-full">{hasPin ? "Cambiar PIN" : "Activar PIN"}</SubmitButton>
                {hasPin && <p className="text-xs text-slate-500">Al cambiarlo se cierra la sesión en los demás dispositivos.</p>}
              </InlineForm>
              {hasPin && (
                <>
                  <form action={lock}>
                    <SubmitButton icon={<Lock className="size-5" />} variant="secondary" className="w-full">Bloquear este dispositivo</SubmitButton>
                  </form>
                  <details className="rounded-xl border border-slate-200 p-3 text-sm">
                    <summary className="cursor-pointer font-medium text-slate-600">Desactivar el PIN</summary>
                    <InlineForm action={removePin} className="mt-3 space-y-3">
                      <input name="currentPin" type="password" inputMode="numeric" placeholder="PIN actual" aria-label="PIN actual" required className="field" />
                      <SubmitButton icon={<ShieldAlert className="size-5" />} variant="danger" className="w-full">Desactivar PIN</SubmitButton>
                    </InlineForm>
                  </details>
                </>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Logo" icon={ImageIcon} />
            <div className="space-y-3 p-5">
              <LogoForm action={uploadLogo} currentUrl={logoUrl} />
              {logoUrl && (
                <form action={removeLogo}>
                  <ConfirmButton message="¿Quitar el logo?" icon={<Trash2 className="size-4" />} className="w-full text-sm text-slate-500 hover:bg-rose-50 hover:text-rose-600">
                    Quitar logo
                  </ConfirmButton>
                </form>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
