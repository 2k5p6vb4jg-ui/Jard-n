import { Building2, Handshake, MapPin } from "lucide-react";
import type { Center } from "@prisma/client";
import { type ActionState, optionChoices } from "@/lib/forms";
import { ActionForm } from "@/components/ui/Form";
import { FormSection, NumberField, SelectField, TextAreaField, TextField } from "@/components/ui/Fields";

type Opt = { id: string; label: string; active: boolean; key: string | null };

export function CenterForm({
  action,
  center,
  options,
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  center?: Center;
  options: { types: Opt[]; statuses: Opt[] };
  cancelHref: string;
}) {
  const defaultStatus = options.statuses.find((s) => s.key === "PROSPECT" && s.active)?.id ?? options.statuses.find((s) => s.active)?.id;
  return (
    <ActionForm action={action} cancelHref={cancelHref} submitLabel={center ? "Guardar cambios" : "Crear centro"}>
      <FormSection title="Centro" icon={Building2}>
        <TextField name="name" label="Nombre" required defaultValue={center?.name} className="sm:col-span-2" placeholder="Residencia Los Naranjos" />
        <TextField name="taxId" label="CIF" defaultValue={center?.taxId} />
        <SelectField name="typeId" label="Tipo de centro" required placeholder="Seleccione…" options={optionChoices(options.types, center?.typeId)} defaultValue={center?.typeId} />
        <SelectField name="statusId" label="Situación" required options={optionChoices(options.statuses, center?.statusId)} defaultValue={center?.statusId ?? defaultStatus} />
        <NumberField name="places" label="Nº de plazas" defaultValue={center?.places} hint="Ayuda a dimensionar packs y contratos" />
        <TextField name="phone" label="Teléfono" type="tel" inputMode="tel" defaultValue={center?.phone} />
        <TextField name="email" label="Email" type="email" inputMode="email" defaultValue={center?.email} className="lg:col-span-2" />
      </FormSection>

      <FormSection title="Dirección" icon={MapPin}>
        <TextField name="address" label="Dirección" defaultValue={center?.address} className="sm:col-span-2 lg:col-span-3" />
        <TextField name="postalCode" label="Código postal" inputMode="numeric" defaultValue={center?.postalCode} />
        <TextField name="city" label="Localidad" defaultValue={center?.city} className="lg:col-span-2" />
      </FormSection>

      <FormSection title="Relación comercial" icon={Handshake}>
        <TextAreaField name="conditions" label="Condiciones pactadas" rows={2} defaultValue={center?.conditions} placeholder="Descuento, forma de pago, plazo de entrega…" />
        <TextAreaField name="notes" label="Notas" rows={3} defaultValue={center?.notes} placeholder="Quién decide las compras, necesidades detectadas, próximos pasos…" />
      </FormSection>
    </ActionForm>
  );
}
