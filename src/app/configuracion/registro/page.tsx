import Link from "next/link";
import { ArrowLeft, ScrollText } from "lucide-react";
import type { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Tone } from "@/lib/labels";

export const metadata = { title: "Registro de actividad" };

const ACTIONS: Record<AuditAction, { label: string; tone: Tone }> = {
  CREATE: { label: "Alta", tone: "emerald" },
  UPDATE: { label: "Cambio", tone: "sky" },
  DELETE: { label: "Borrado", tone: "rose" },
  VIEW: { label: "Acceso", tone: "slate" },
  EXPORT: { label: "Exportación", tone: "violet" },
  BACKUP: { label: "Copia", tone: "teal" },
};

const ENTITIES: Record<string, string> = {
  Patient: "Paciente",
  InsolePrescription: "Plantillas",
  CompressionStocking: "Medias",
  ClinicalDocument: "Documento",
  Settings: "Ajustes",
  Session: "Sesión",
  Database: "Base de datos",
  Backup: "Copia",
  Quote: "Presupuesto",
};

/** Registro de accesos y cambios sobre datos personales (responsabilidad proactiva, art. 5.2 RGPD). */
export default async function AuditPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const action = tipo && tipo in ACTIONS ? (tipo as AuditAction) : undefined;
  const rows = await prisma.auditLog.findMany({ where: action ? { action } : undefined, orderBy: { createdAt: "desc" }, take: 300 });

  const chip = (href: string, label: string, active: boolean) => (
    <Link key={href} href={href} className={`flex min-h-10 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium ring-1 ring-inset ${active ? "bg-teal-600 text-white ring-teal-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>
      {label}
    </Link>
  );

  return (
    <>
      <Link href="/configuracion" className="mb-3 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="size-4" /> Ajustes
      </Link>
      <PageHeader title="Registro de actividad" description="Últimos 300 movimientos sobre datos personales, accesos y copias" />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {chip("/configuracion/registro", "Todo", !action)}
        {(Object.keys(ACTIONS) as AuditAction[]).map((a) => chip(`/configuracion/registro?tipo=${a}`, ACTIONS[a].label, action === a))}
      </div>
      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={ScrollText} title="Sin movimientos" />
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {rows.map((r) => (
              <li key={r.id} className="grid gap-1 px-5 py-3 sm:grid-cols-[9rem_7rem_8rem_1fr_8rem] sm:items-center sm:gap-3">
                <span className="text-slate-500">{r.createdAt.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "medium" })}</span>
                <span><Badge tone={ACTIONS[r.action].tone}>{ACTIONS[r.action].label}</Badge></span>
                <span className="font-medium text-slate-700">{ENTITIES[r.entity] ?? r.entity}</span>
                <span className="min-w-0 truncate text-slate-600" title={r.summary ?? undefined}>{r.summary ?? "—"}</span>
                <span className="truncate font-mono text-xs text-slate-400">{r.ip ?? ""}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
