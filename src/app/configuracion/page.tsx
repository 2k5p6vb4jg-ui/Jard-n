import { Building2, DatabaseBackup, HardDriveDownload, Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const [settings, backups] = await Promise.all([
    prisma.settings.findUnique({ where: { id: 1 } }),
    prisma.backupRecord.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return (
    <>
      <PageHeader title="Ajustes" description="Datos de la ortopedia y copias de seguridad" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Copia de seguridad" icon={DatabaseBackup} subtitle="Base de datos completa (pacientes, taller, trazabilidad)" />
          <div className="space-y-4 px-5 py-5">
            <a
              href="/api/backup"
              className="flex min-h-14 items-center justify-center gap-3 rounded-xl bg-teal-600 px-5 text-lg font-medium text-white shadow-sm transition hover:bg-teal-700 active:scale-[0.98]"
            >
              <HardDriveDownload className="size-6" />
              Descargar copia (.db)
            </a>
            <p className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              <Info className="mt-0.5 size-4 shrink-0" />
              Guarde el archivo en un pendrive o disco externo cifrado y custódielo bajo llave: contiene datos de salud (RGPD art. 9).
              Los adjuntos de la carpeta <code className="mx-1">uploads/</code> se copian aparte.
            </p>
            {backups.length > 0 && (
              <ul className="text-sm text-slate-500">
                {backups.map((b) => (
                  <li key={b.id}>{formatDate(b.createdAt)} · {b.fileName} · {(b.sizeBytes / 1024).toFixed(0)} KB</li>
                ))}
              </ul>
            )}
          </div>
        </Card>
        {settings && (
          <Card>
            <CardHeader title="Datos del establecimiento" icon={Building2} />
            <dl className="grid grid-cols-2 gap-3 px-5 py-5 text-sm">
              {[
                ["Nombre", settings.businessName],
                ["CIF", settings.taxId],
                ["Licencia sanitaria", settings.healthLicense],
                ["Teléfono", settings.phone],
                ["Dirección", [settings.address, settings.postalCode, settings.city].filter(Boolean).join(", ")],
                ["Tarifa/hora", formatEUR(settings.defaultHourlyRateCents)],
                ["IVA por defecto", `${settings.defaultTaxRate} %`],
                ["Validez presupuestos", `${settings.quoteValidityDays} días`],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-50 px-3 py-2">
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="font-medium text-slate-800">{v || "—"}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}
      </div>
    </>
  );
}
