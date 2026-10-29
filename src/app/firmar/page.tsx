import { notFound, redirect } from "next/navigation";
import { PenLine, ScrollText } from "lucide-react";
import { canSee } from "@/lib/permissions";
import { currentSession } from "@/lib/session";
import { kindFromParam } from "@/lib/signatures";
import { formatDate } from "@/lib/dates";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActionForm } from "@/components/ui/Form";
import { CheckboxField, FormSection, TextField } from "@/components/ui/Fields";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { loadSignTarget } from "./target";
import { saveSignature } from "./actions";

export const metadata = { title: "Firmar" };

/** Pantalla de firma para la tablet: qué se firma, nombre y recuadro para firmar con el dedo. */
export default async function SignPage({ searchParams }: { searchParams: Promise<{ tipo?: string; id?: string }> }) {
  const { tipo, id } = await searchParams;
  const kind = kindFromParam(tipo);
  if (!kind || !id) notFound();
  const t = await loadSignTarget(kind, id);
  if (!t) notFound();
  const { user } = await currentSession();
  if (t.section && !canSee(user?.role, t.section)) redirect("/sin-permiso");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Firma" title={t.title} description="Entregue la tablet al cliente para que lea y firme" />
      <ActionForm action={saveSignature.bind(null, kind, id)} cancelHref={t.back} submitLabel="Guardar firma" submitIcon={<PenLine className="size-5" />}>
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr]">
            {t.rows.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-sm text-slate-500">{k}</dt>
                <dd className="font-medium text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
          {t.text && (
            <div className="mt-4 max-h-80 overflow-y-auto whitespace-pre-line rounded-xl bg-slate-50 p-4 text-[15px] leading-relaxed text-slate-700">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"><ScrollText className="size-4" />Lea antes de firmar</p>
              {t.text}
            </div>
          )}
          {t.previous && (
            <p className="mt-3 text-sm text-gold-800">
              Ya firmado por {t.previous.signerName} el {formatDate(t.previous.signedAt)}.{" "}
              {kind === "CONSENT" ? "La nueva firma se añade al historial." : "La nueva firma sustituirá a la anterior."}
            </p>
          )}
        </section>

        <FormSection title="Quién firma" icon={PenLine}>
          <TextField name="signerName" label="Nombre y apellidos" required defaultValue={t.signer} placeholder="Nombre de quien firma" />
          <TextField name="signerDni" label="DNI / NIE (opcional)" defaultValue={t.signerDni} />
          {t.marketingOptIn !== undefined && (
            <CheckboxField name="marketingOptIn" label="Acepto recibir avisos" hint="Recordatorios de renovación y citas por teléfono o WhatsApp" defaultChecked={t.marketingOptIn} className="col-span-full" />
          )}
          {t.canAccept && <CheckboxField name="accept" label="Marcar como aceptado al firmar" defaultChecked className="col-span-full" />}
          <div className="col-span-full">
            <SignaturePad />
          </div>
        </FormSection>
      </ActionForm>
    </div>
  );
}
