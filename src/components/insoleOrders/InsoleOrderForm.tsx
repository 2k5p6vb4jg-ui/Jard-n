import { Euro, Footprints, User } from "lucide-react";
import type { InsoleOrder } from "@prisma/client";
import { type ActionState, optionChoices, toDateInput, toEurosInput } from "@/lib/forms";
import { side } from "@/lib/labels";
import { ActionForm } from "@/components/ui/Form";
import { CenterFields } from "@/components/centers/CenterFields";
import { CheckboxField, FormSection, MoneyField, NumberField, SelectField, TextAreaField, TextField } from "@/components/ui/Fields";

type Opt = { id: string; label: string; active: boolean; isFinal?: boolean };

export interface InsoleOrderFormOptions {
  patients: { id: string; firstName: string; lastName: string; dni: string | null; phone: string | null }[];
  types: Opt[];
  materials: Opt[];
  statuses: Opt[];
  centers: { id: string; label: string }[];
}

const choices = optionChoices;

export function InsoleOrderForm({
  action,
  order,
  options,
  defaults,
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  order?: InsoleOrder;
  options: InsoleOrderFormOptions;
  defaults?: { patientId?: string; centerId?: string };
  cancelHref: string;
}) {
  const firstOpen = options.statuses.find((s) => s.active && !s.isFinal)?.id;
  return (
    <ActionForm action={action} cancelHref={cancelHref} submitLabel={order ? "Guardar cambios" : "Registrar plantillas"}>
      <FormSection title="Cliente" icon={User}>
        <SelectField
          name="patientId"
          label="Cliente"
          required
          className="sm:col-span-2 lg:col-span-3"
          placeholder="Seleccione…"
          defaultValue={order?.patientId ?? defaults?.patientId}
          options={options.patients.map((p) => ({ value: p.id, label: `${p.lastName}, ${p.firstName}${p.dni ? ` · ${p.dni}` : p.phone ? ` · ${p.phone}` : ""}` }))}
          hint="¿No está en la lista? Dé de alta la ficha en Clientes → Nuevo."
        />
        <CenterFields centers={options.centers} centerId={order?.centerId ?? defaults?.centerId} link={order?.centerLink ?? (defaults?.centerId ? "ORDERED" : undefined)} />
      </FormSection>

      <FormSection title="Plantillas" icon={Footprints}>
        <SelectField name="typeId" label="Tipo de plantilla" required placeholder="Seleccione…" options={choices(options.types, order?.typeId)} defaultValue={order?.typeId} />
        <SelectField name="side" label="Pie" options={side} defaultValue={order?.side ?? "BOTH"} />
        <NumberField name="shoeSize" label="Número de pie" defaultValue={order?.shoeSize} placeholder="Ej. 39 o 39,5" />
        <SelectField name="materialId" label="Material" placeholder="— Sin indicar —" options={choices(options.materials, order?.materialId)} defaultValue={order?.materialId} />
        <TextField name="measuredAt" label="Toma de medidas" type="date" defaultValue={toDateInput(order ? order.measuredAt : new Date())} />
        <TextField name="dueAt" label="Entrega prevista" type="date" defaultValue={toDateInput(order?.dueAt)} />
        <SelectField name="statusId" label="Estado" required options={choices(options.statuses, order?.statusId)} defaultValue={order?.statusId ?? firstOpen} />
        <TextAreaField name="notes" label="Observaciones" defaultValue={order?.notes} />
      </FormSection>

      <FormSection title="Cobro" icon={Euro}>
        <MoneyField name="price" label="Precio" defaultValue={toEurosInput(order?.priceCents)} />
        <CheckboxField name="paid" label="Pagado" defaultChecked={order?.paid} />
      </FormSection>
    </ActionForm>
  );
}
