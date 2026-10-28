import { CalendarCheck, Euro, ScanBarcode, User } from "lucide-react";
import type { TrackedProduct } from "@prisma/client";
import { type ActionState, optionChoices, toDateInput, toEurosInput } from "@/lib/forms";
import { ActionForm } from "@/components/ui/Form";
import { CheckboxField, FormSection, MoneyField, NumberField, SelectField, TextAreaField, TextField } from "@/components/ui/Fields";

export function ProductForm({
  action,
  product,
  patients,
  categories,
  centers = [],
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  product?: TrackedProduct;
  patients: { id: string; firstName: string; lastName: string; dni: string | null }[];
  categories: { id: string; label: string; active: boolean }[];
  centers?: { id: string; label: string }[];
  cancelHref: string;
}) {
  return (
    <ActionForm action={action} cancelHref={cancelHref} submitLabel={product ? "Guardar cambios" : "Registrar producto"}>
      <FormSection title="Identificación" icon={ScanBarcode}>
        <TextField name="serialNumber" label="Número de serie" required defaultValue={product?.serialNumber} hint="Obligatorio y único" />
        <TextField name="lotNumber" label="Lote de fabricación" defaultValue={product?.lotNumber} />
        <TextField name="udi" label="UDI (identificador de dispositivo)" defaultValue={product?.udi} />
        <SelectField name="categoryId" label="Categoría" required options={optionChoices(categories, product?.categoryId)} placeholder="Seleccione…" defaultValue={product?.categoryId} />
        <TextField name="brand" label="Marca" required defaultValue={product?.brand} />
        <TextField name="model" label="Modelo" required defaultValue={product?.model} />
        <TextField name="supplier" label="Proveedor" defaultValue={product?.supplier} />
        <TextField name="manufacturedAt" label="Fecha de fabricación" type="date" defaultValue={toDateInput(product?.manufacturedAt)} />
        <TextAreaField name="description" label="Descripción / configuración" defaultValue={product?.description} rows={2} placeholder="Medidas de asiento, joystick, talla…" />
      </FormSection>

      <FormSection title="Propietario" icon={User} description="Un cliente, o un centro si el equipo es suyo (p. ej. sillas de una residencia)">
        <SelectField
          name="patientId"
          label="Cliente"
          className="sm:col-span-2"
          placeholder="— En stock / sin asignar —"
          defaultValue={product?.patientId}
          options={patients.map((p) => ({ value: p.id, label: `${p.lastName}, ${p.firstName}${p.dni ? ` · ${p.dni}` : ""}` }))}
        />
        {centers.length > 0 && (
          <SelectField name="centerId" label="Centro propietario" placeholder="— Ninguno —" defaultValue={product?.centerId} options={centers.map((c) => ({ value: c.id, label: c.label }))} />
        )}
        <CheckboxField name="isPublicHealth" label="Financiado por la Seguridad Social" defaultChecked={product?.isPublicHealth} />
      </FormSection>

      <FormSection title="Entrega y garantía" icon={CalendarCheck}>
        <TextField name="deliveredAt" label="Fecha de entrega" type="date" defaultValue={toDateInput(product?.deliveredAt)} />
        <NumberField name="warrantyMonths" label="Garantía" suffix="meses" defaultValue={product?.warrantyMonths ?? 24} hint="La fecha fin se calcula desde la entrega" />
        <TextField name="nextServiceAt" label="Próximo mantenimiento" type="date" defaultValue={toDateInput(product?.nextServiceAt)} />
      </FormSection>

      <FormSection title="Importes" icon={Euro}>
        <MoneyField name="purchasePrice" label="Precio de compra" defaultValue={toEurosInput(product?.purchasePriceCents)} />
        <MoneyField name="salePrice" label="Precio de venta" defaultValue={toEurosInput(product?.salePriceCents)} />
        <TextAreaField name="notes" label="Notas" defaultValue={product?.notes} rows={2} />
      </FormSection>
    </ActionForm>
  );
}
