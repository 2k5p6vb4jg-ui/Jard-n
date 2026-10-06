import { Contact, MapPin, ShieldCheck, StickyNote } from "lucide-react";
import type { Patient } from "@prisma/client";
import { type ActionState, toDateInput } from "@/lib/forms";
import { ActionForm } from "@/components/ui/Form";
import { CheckboxField, FormSection, TextAreaField, TextField } from "@/components/ui/Fields";

export function PatientForm({
  action,
  patient,
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  patient?: Patient;
  cancelHref: string;
}) {
  return (
    <ActionForm action={action} cancelHref={cancelHref} submitLabel={patient ? "Guardar cambios" : "Crear paciente"}>
      <FormSection title="Datos personales" icon={Contact}>
        <TextField name="firstName" label="Nombre" required defaultValue={patient?.firstName} />
        <TextField name="lastName" label="Apellidos" required defaultValue={patient?.lastName} className="lg:col-span-2" />
        <TextField name="dni" label="DNI / NIE" defaultValue={patient?.dni} placeholder="12345678Z" hint="Se comprueba la letra" />
        <TextField name="birthDate" label="Fecha de nacimiento" type="date" defaultValue={toDateInput(patient?.birthDate)} />
        <TextField name="healthCardNo" label="Tarjeta sanitaria (SIP)" defaultValue={patient?.healthCardNo} />
        <TextField name="phone" label="Teléfono" type="tel" inputMode="tel" defaultValue={patient?.phone} />
        <TextField name="phoneAlt" label="Teléfono alternativo" type="tel" inputMode="tel" defaultValue={patient?.phoneAlt} hint="Familiar / cuidador" />
        <TextField name="email" label="Email" type="email" inputMode="email" defaultValue={patient?.email} />
      </FormSection>

      <FormSection title="Dirección" icon={MapPin}>
        <TextField name="address" label="Dirección" defaultValue={patient?.address} className="sm:col-span-2 lg:col-span-3" />
        <TextField name="city" label="Localidad" defaultValue={patient?.city} />
        <TextField name="postalCode" label="Código postal" inputMode="numeric" defaultValue={patient?.postalCode} />
      </FormSection>

      <FormSection title="Observaciones" icon={StickyNote}>
        <TextAreaField name="notes" label="Observaciones generales" defaultValue={patient?.notes} placeholder="Alergias, movilidad, persona de contacto…" />
      </FormSection>

      <FormSection title="Protección de datos (RGPD)" icon={ShieldCheck}>
        <CheckboxField
          name="gdprConsent"
          label="Consentimiento para el tratamiento de datos de salud"
          hint="Firmado por el paciente o su representante legal"
          defaultChecked={patient?.gdprConsent ?? false}
          className="sm:col-span-2 lg:col-span-2"
        />
        <CheckboxField name="marketingOptIn" label="Acepta recibir avisos" hint="Recordatorios de renovación" defaultChecked={patient?.marketingOptIn ?? false} />
      </FormSection>
    </ActionForm>
  );
}
