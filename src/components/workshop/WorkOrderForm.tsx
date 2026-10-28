import { ClipboardList, Euro, PackageSearch, User, Wrench } from "lucide-react";
import type { WorkOrder } from "@prisma/client";
import { type ActionState, optionChoices, toDateInput, toEurosInput } from "@/lib/forms";
import { laborMode } from "@/lib/labels";
import { ActionForm } from "@/components/ui/Form";
import { CenterFields } from "@/components/centers/CenterFields";
import { CheckboxField, FormSection, MoneyField, NumberField, SelectField, TextAreaField, TextField } from "@/components/ui/Fields";

export interface WorkOrderFormOptions {
  patients: { id: string; firstName: string; lastName: string; dni: string | null }[];
  products: { id: string; serialNumber: string; brand: string; model: string; patient: { firstName: string; lastName: string } | null }[];
  technicians: { id: string; name: string }[];
  defaultTaxRate: number;
  categories: Opt[];
  services: Opt[];
  priorities: (Opt & { key: string | null })[];
  centers: { id: string; label: string }[];
}

type Opt = { id: string; label: string; active: boolean };

export function WorkOrderForm({
  action,
  order,
  options,
  defaults,
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  order?: WorkOrder;
  options: WorkOrderFormOptions;
  defaults?: { patientId?: string; productId?: string; centerId?: string };
  cancelHref: string;
}) {
  return (
    <ActionForm action={action} cancelHref={cancelHref} submitLabel={order ? "Guardar cambios" : "Registrar entrada"}>
      <FormSection title="Cliente" icon={User} description="Paciente con ficha, o cliente puntual (residencia, particular…)">
        <SelectField
          name="patientId"
          label="Paciente"
          className="sm:col-span-2 lg:col-span-3"
          placeholder="— Cliente sin ficha de paciente —"
          defaultValue={order?.patientId ?? defaults?.patientId}
          options={options.patients.map((p) => ({ value: p.id, label: `${p.lastName}, ${p.firstName}${p.dni ? ` · ${p.dni}` : ""}` }))}
        />
        <TextField name="customerName" label="Nombre del cliente (si no tiene ficha)" defaultValue={order?.customerName} className="sm:col-span-1 lg:col-span-2" />
        <TextField name="customerPhone" label="Teléfono del cliente" type="tel" inputMode="tel" defaultValue={order?.customerPhone} />
        <CenterFields centers={options.centers} centerId={order?.centerId ?? defaults?.centerId} link={order?.centerLink ?? (defaults?.centerId ? "ORDERED" : undefined)} />
      </FormSection>

      <FormSection title="Equipo" icon={PackageSearch} description="Si está en Trazabilidad, selecciónelo y se completan marca, modelo y nº de serie">
        <SelectField
          name="productId"
          label="Producto con nº de serie"
          className="sm:col-span-2 lg:col-span-3"
          placeholder="— No registrado en trazabilidad —"
          defaultValue={order?.productId ?? defaults?.productId}
          options={options.products.map((p) => ({
            value: p.id,
            label: `${p.serialNumber} · ${p.brand} ${p.model}${p.patient ? ` (${p.patient.firstName} ${p.patient.lastName})` : ""}`,
          }))}
        />
        <SelectField name="equipmentCategoryId" label="Categoría" options={optionChoices(options.categories, order?.equipmentCategoryId)} placeholder="Seleccione…" defaultValue={order?.equipmentCategoryId} />
        <TextField name="equipmentBrand" label="Marca" defaultValue={order?.equipmentBrand} />
        <TextField name="equipmentModel" label="Modelo" defaultValue={order?.equipmentModel} />
        <TextField name="serialNumber" label="Nº de serie" defaultValue={order?.serialNumber} />
        <TextField name="accessories" label="Accesorios entregados" defaultValue={order?.accessories} placeholder="Cargador, cojín, reposapiés…" className="lg:col-span-2" />
      </FormSection>

      <FormSection title="Servicio" icon={Wrench}>
        <SelectField name="serviceTypeId" label="Tipo de servicio" required options={optionChoices(options.services, order?.serviceTypeId)} placeholder="Seleccione…" defaultValue={order?.serviceTypeId} />
        <SelectField
          name="priorityId"
          label="Prioridad"
          options={optionChoices(options.priorities, order?.priorityId)}
          defaultValue={order?.priorityId ?? (options.priorities.find((p) => p.key === "NORMAL" && p.active) ?? options.priorities.find((p) => p.active))?.id}
        />
        <SelectField name="technicianId" label="Técnico asignado" placeholder="— Sin asignar —" options={options.technicians.map((t) => ({ value: t.id, label: t.name }))} defaultValue={order?.technicianId} />
        <TextField name="receivedAt" label="Fecha de entrada" type="date" defaultValue={toDateInput(order?.receivedAt ?? new Date())} />
        <TextField name="promisedAt" label="Fecha comprometida" type="date" defaultValue={toDateInput(order?.promisedAt)} />
        <CheckboxField name="underWarranty" label="En garantía" defaultChecked={order?.underWarranty} />
        <TextAreaField name="reportedIssue" label="Avería / motivo de entrada" required defaultValue={order?.reportedIssue} placeholder="Lo que indica el cliente" />
        <TextAreaField name="diagnosis" label="Diagnóstico técnico" defaultValue={order?.diagnosis} />
        <TextAreaField name="workDone" label="Trabajo realizado" defaultValue={order?.workDone} />
        <TextAreaField name="internalNotes" label="Notas internas" defaultValue={order?.internalNotes} rows={2} hint="No aparecen en el presupuesto" />
      </FormSection>

      <FormSection title="Mano de obra e importes" icon={Euro}>
        <SelectField name="laborMode" label="Modo de mano de obra" options={laborMode} defaultValue={order?.laborMode ?? "HOURLY"} />
        <MoneyField name="laborRate" label="Tarifa por hora" defaultValue={toEurosInput(order?.laborRateCents)} hint="Vacío = tarifa del técnico o la general" />
        <MoneyField name="laborFixed" label="Importe precio cerrado" defaultValue={toEurosInput(order?.laborFixedCents)} hint="Solo si el modo es precio cerrado" />
        <NumberField name="discountPercent" label="Descuento" suffix="%" defaultValue={order?.discountPercent ?? 0} />
        <NumberField name="taxRate" label="IVA" suffix="%" defaultValue={order?.taxRate ?? options.defaultTaxRate} hint="Según producto: 21 %, 10 % o 4 % (consulte a su gestoría)" />
      </FormSection>

      <p className="flex items-center gap-2 text-sm text-slate-500">
        <ClipboardList className="size-4" />
        Las piezas y el tiempo de trabajo se añaden desde la ficha de la orden.
      </p>
    </ActionForm>
  );
}
