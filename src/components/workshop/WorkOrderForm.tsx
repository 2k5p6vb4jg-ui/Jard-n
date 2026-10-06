import { ClipboardList, Euro, PackageSearch, User, Wrench } from "lucide-react";
import type { WorkOrder } from "@prisma/client";
import { type ActionState, toDateInput, toEurosInput } from "@/lib/forms";
import { equipmentCategory, laborMode, priority, serviceType } from "@/lib/labels";
import { ActionForm } from "@/components/ui/Form";
import { CheckboxField, FormSection, MoneyField, NumberField, SelectField, TextAreaField, TextField } from "@/components/ui/Fields";

export interface WorkOrderFormOptions {
  patients: { id: string; firstName: string; lastName: string; dni: string | null }[];
  products: { id: string; serialNumber: string; brand: string; model: string; patient: { firstName: string; lastName: string } | null }[];
  technicians: { id: string; name: string }[];
  defaultTaxRate: number;
}

const priorityOptions = Object.fromEntries(Object.entries(priority).map(([k, v]) => [k, v.label]));

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
  defaults?: { patientId?: string; productId?: string };
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
        <SelectField name="equipmentCategory" label="Categoría" options={equipmentCategory} placeholder="Seleccione…" defaultValue={order?.equipmentCategory} />
        <TextField name="equipmentBrand" label="Marca" defaultValue={order?.equipmentBrand} />
        <TextField name="equipmentModel" label="Modelo" defaultValue={order?.equipmentModel} />
        <TextField name="serialNumber" label="Nº de serie" defaultValue={order?.serialNumber} />
        <TextField name="accessories" label="Accesorios entregados" defaultValue={order?.accessories} placeholder="Cargador, cojín, reposapiés…" className="lg:col-span-2" />
      </FormSection>

      <FormSection title="Servicio" icon={Wrench}>
        <SelectField name="serviceType" label="Tipo de servicio" required options={serviceType} placeholder="Seleccione…" defaultValue={order?.serviceType} />
        <SelectField name="priority" label="Prioridad" options={priorityOptions} defaultValue={order?.priority ?? "NORMAL"} />
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
