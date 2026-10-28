import { FileText, StickyNote } from "lucide-react";
import type { CenterProposal } from "@prisma/client";
import type { ActionState } from "@/lib/forms";
import { parseProposalLines } from "@/lib/proposals";
import { ActionForm } from "@/components/ui/Form";
import { FormSection, NumberField, TextAreaField, TextField } from "@/components/ui/Fields";
import { ProposalEditor } from "./ProposalEditor";

export function ProposalForm({
  action,
  proposal,
  products,
  defaults,
  defaultTaxRate,
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  proposal?: CenterProposal & { products: { id: string }[] };
  products: { id: string; label: string; detail: string }[];
  defaults?: { kind?: CenterProposal["kind"]; productIds?: string[]; title?: string };
  defaultTaxRate: number;
  cancelHref: string;
}) {
  const kind = proposal?.kind ?? defaults?.kind ?? "SALE_PACK";
  const validityDays = proposal ? Math.round((proposal.validUntil.getTime() - proposal.issuedAt.getTime()) / 86_400_000) : 30;
  return (
    <ActionForm action={action} cancelHref={cancelHref} submitLabel={proposal ? "Guardar cambios" : "Crear propuesta"}>
      <FormSection title="Propuesta" icon={FileText}>
        <TextField name="title" label="Título" required defaultValue={proposal?.title ?? defaults?.title} placeholder="Renovación de sillas de ruedas 2027" className="sm:col-span-2" />
        <NumberField name="validityDays" label="Validez" suffix="días" defaultValue={validityDays} />
        <TextAreaField
          name="intro"
          label="Presentación para el centro"
          rows={3}
          defaultValue={proposal?.intro}
          placeholder="Qué incluye, ventajas para el centro, plazos de entrega, cómo se organizan las revisiones…"
          hint="Aparece al principio del PDF"
        />
      </FormSection>

      <ProposalEditor
        products={products}
        initial={{
          kind,
          billingPeriod: proposal?.billingPeriod ?? (kind === "MAINTENANCE" ? "YEARLY" : "ONE_OFF"),
          durationMonths: proposal?.durationMonths ?? null,
          visitsPerYear: proposal?.visitsPerYear ?? null,
          discountPercent: proposal?.discountPercent ?? 0,
          taxRate: proposal?.taxRate ?? defaultTaxRate,
          productIds: proposal?.products.map((p) => p.id) ?? defaults?.productIds ?? [],
          lines: proposal ? parseProposalLines(proposal.linesJson) : [],
        }}
      />

      <FormSection title="Notas internas" icon={StickyNote}>
        <TextAreaField name="internalNotes" label="Notas (no salen en el PDF)" rows={2} defaultValue={proposal?.internalNotes} placeholder="Margen, con quién se habló, próximos pasos…" />
      </FormSection>
    </ActionForm>
  );
}
