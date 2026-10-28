import { CalendarClock, UserRound } from "lucide-react";
import type { Appointment } from "@prisma/client";
import { type ActionState, optionChoices, toDateInput } from "@/lib/forms";
import { ActionForm } from "@/components/ui/Form";
import { FormSection, SelectField, TextAreaField, TextField } from "@/components/ui/Fields";

export interface AppointmentFormOptions {
  types: { id: string; label: string; active: boolean }[];
  patients: { id: string; firstName: string; lastName: string; dni: string | null }[];
  centers: { id: string; label: string }[];
  technicians: { id: string; name: string }[];
}

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240].map((m) => ({ value: String(m), label: m < 60 ? `${m} min` : `${m / 60} h`.replace(".5", " y media") }));
const pad = (n: number) => String(n).padStart(2, "0");

export function AppointmentForm({
  action,
  appointment,
  options,
  defaults,
  context,
  back,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  appointment?: Appointment;
  options: AppointmentFormOptions;
  defaults?: { date?: string; time?: string; patientId?: string; centerId?: string; typeId?: string };
  context?: { workOrderId?: string; insoleOrderId?: string; label: string };
  back?: string;
}) {
  const start = appointment?.startsAt;
  return (
    <ActionForm action={action} cancelHref={back ?? "/agenda"} submitLabel={appointment ? "Guardar cambios" : "Dar cita"}>
      {back && <input type="hidden" name="back" value={back} />}
      {context?.workOrderId && <input type="hidden" name="workOrderId" value={context.workOrderId} />}
      {context?.insoleOrderId && <input type="hidden" name="insoleOrderId" value={context.insoleOrderId} />}
      <FormSection title="Cita" icon={CalendarClock} description={context ? `Para ${context.label}` : undefined}>
        <SelectField name="typeId" label="Tipo" required placeholder="Seleccione…" options={optionChoices(options.types, appointment?.typeId)} defaultValue={appointment?.typeId ?? defaults?.typeId} />
        <TextField name="date" label="Día" type="date" required defaultValue={start ? toDateInput(start) : (defaults?.date ?? toDateInput(new Date()))} />
        <div>
          <label htmlFor="time" className="field-label">Hora<span className="ml-0.5 text-rose-500">*</span></label>
          <input id="time" name="time" type="time" required step={300} defaultValue={start ? `${pad(start.getHours())}:${pad(start.getMinutes())}` : (defaults?.time ?? "10:00")} className="field" />
        </div>
        <SelectField name="durationMin" label="Duración" options={DURATIONS} defaultValue={String(appointment?.durationMin ?? 30)} />
        <SelectField name="technicianId" label="Atiende" placeholder="— Sin asignar —" options={options.technicians.map((t) => ({ value: t.id, label: t.name }))} defaultValue={appointment?.technicianId} />
        <TextField name="location" label="Dónde" defaultValue={appointment?.location} placeholder="En la tienda, en el centro, a domicilio…" />
      </FormSection>
      <FormSection title="Con quién" icon={UserRound}>
        {!context && (
          <>
            <SelectField
              name="patientId"
              label="Cliente"
              placeholder="— Ninguno —"
              options={options.patients.map((p) => ({ value: p.id, label: `${p.lastName}, ${p.firstName}${p.dni ? ` · ${p.dni}` : ""}` }))}
              defaultValue={appointment?.patientId ?? defaults?.patientId}
              className="sm:col-span-2"
            />
            {options.centers.length > 0 && (
              <SelectField name="centerId" label="Centro" placeholder="— Ninguno —" options={options.centers.map((c) => ({ value: c.id, label: c.label }))} defaultValue={appointment?.centerId ?? defaults?.centerId} />
            )}
          </>
        )}
        <TextAreaField name="notes" label="Notas" rows={2} defaultValue={appointment?.notes} placeholder="Traer el calzado habitual, informe del podólogo…" />
      </FormSection>
    </ActionForm>
  );
}
