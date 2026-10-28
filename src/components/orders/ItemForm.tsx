import { Package, UserRound } from "lucide-react";
import type { OrderItem } from "@prisma/client";
import { type ActionState, toDateInput } from "@/lib/forms";
import { ActionForm } from "@/components/ui/Form";
import { FormSection, NumberField, SelectField, TextAreaField, TextField } from "@/components/ui/Fields";

export interface ItemFormOptions {
  suppliers: { id: string; name: string; active: boolean }[];
  patients: { id: string; firstName: string; lastName: string; dni: string | null }[];
  centers: { id: string; label: string }[];
}

/** Apuntar (o editar) un artículo que hay que pedir. `context`: reparación o plantillas de la que viene. */
export function ItemForm({
  action,
  item,
  options,
  defaults,
  context,
  back,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  item?: OrderItem;
  options: ItemFormOptions;
  defaults?: { patientId?: string; centerId?: string; supplierId?: string };
  context?: { workOrderId?: string; insoleOrderId?: string; label: string };
  back: string;
}) {
  return (
    <ActionForm action={action} cancelHref={back} submitLabel={item ? "Guardar cambios" : "Apuntar"}>
      <input type="hidden" name="back" value={back} />
      {context?.workOrderId && <input type="hidden" name="workOrderId" value={context.workOrderId} />}
      {context?.insoleOrderId && <input type="hidden" name="insoleOrderId" value={context.insoleOrderId} />}

      <FormSection title="Qué hay que pedir" icon={Package}>
        <TextField name="description" label="Artículo" required defaultValue={item?.description} placeholder="Rodillera articulada talla M, cámara 24×1 3/8…" className="sm:col-span-2" />
        <NumberField name="quantity" label="Cantidad" defaultValue={item?.quantity ?? 1} />
        <SelectField
          name="supplierId"
          label="Marca"
          placeholder="— Decidir más tarde —"
          options={options.suppliers.filter((s) => s.active || s.id === item?.supplierId).map((s) => ({ value: s.id, label: s.name }))}
          defaultValue={item?.supplierId ?? defaults?.supplierId}
        />
        <TextField name="reference" label="Referencia" defaultValue={item?.reference} placeholder="Ref. del catálogo" />
        <TextField name="neededBy" label="Hace falta para" type="date" defaultValue={toDateInput(item?.neededBy)} />
      </FormSection>

      <FormSection title="Para quién" icon={UserRound} description={context ? `Para ${context.label}` : "Vacío: es para stock de la tienda"}>
        {!context && (
          <>
            <SelectField
              name="patientId"
              label="Cliente"
              placeholder="— Ninguno —"
              options={options.patients.map((p) => ({ value: p.id, label: `${p.lastName}, ${p.firstName}${p.dni ? ` · ${p.dni}` : ""}` }))}
              defaultValue={item?.patientId ?? defaults?.patientId}
              className="sm:col-span-2"
            />
            {options.centers.length > 0 && (
              <SelectField name="centerId" label="Centro" placeholder="— Ninguno —" options={options.centers.map((c) => ({ value: c.id, label: c.label }))} defaultValue={item?.centerId ?? defaults?.centerId} />
            )}
          </>
        )}
        <TextAreaField name="notes" label="Notas" rows={2} defaultValue={item?.notes} placeholder="Color, talla, lado, avisar al cliente al llegar…" />
      </FormSection>
    </ActionForm>
  );
}
