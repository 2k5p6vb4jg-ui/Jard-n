import { CalendarCheck, FileSignature, Ruler, Shirt } from "lucide-react";
import type { CompressionStocking } from "@prisma/client";
import { type ActionState, toDateInput, toEurosInput } from "@/lib/forms";
import { compressionClass, garmentType, knitType, prescriptionStatus } from "@/lib/labels";
import { ActionForm } from "@/components/ui/Form";
import { CheckboxField, FormSection, MoneyField, NumberField, SelectField, TextAreaField, TextField } from "@/components/ui/Fields";

const statusOptions = Object.fromEntries(Object.entries(prescriptionStatus).map(([k, v]) => [k, v.label]));

/** Puntos de medida estándar (RAL-GZ 387) */
const CIRCUMFERENCES = [
  ["cB", "cB · Tobillo"],
  ["cB1", "cB1 · Transición"],
  ["cC", "cC · Gemelo"],
  ["cD", "cD · Bajo rodilla"],
  ["cE", "cE · Rodilla"],
  ["cF", "cF · Mitad muslo"],
  ["cG", "cG · Raíz muslo"],
  ["cH", "cH · Cadera"],
  ["cT", "cT · Cintura"],
  ["cY", "cY · Talón diagonal"],
] as const;

const LENGTHS = [
  ["lAB1", "lA-B1"],
  ["lAC", "lA-C"],
  ["lAD", "lA-D"],
  ["lAE", "lA-E"],
  ["lAF", "lA-F"],
  ["lAG", "lA-G"],
  ["lAT", "lA-T"],
  ["footLengthCm", "Longitud del pie"],
] as const;

export function StockingForm({
  action,
  stocking,
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  stocking?: CompressionStocking;
  cancelHref: string;
}) {
  return (
    <ActionForm action={action} cancelHref={cancelHref} submitLabel={stocking ? "Guardar cambios" : "Crear medias"}>
      <FormSection title="Prenda" icon={Shirt}>
        <SelectField name="compressionClass" label="Clase de compresión" required options={compressionClass} placeholder="Seleccione…" defaultValue={stocking?.compressionClass} />
        <SelectField name="garmentType" label="Tipo de prenda" required options={garmentType} placeholder="Seleccione…" defaultValue={stocking?.garmentType} />
        <SelectField name="side" label="Pierna" options={{ BOTH: "Ambas", LEFT: "Izquierda", RIGHT: "Derecha" }} defaultValue={stocking?.side ?? "BOTH"} />
        <SelectField name="knitType" label="Tejido" options={knitType} defaultValue={stocking?.knitType ?? "CIRCULAR"} />
        <TextField name="brand" label="Marca" defaultValue={stocking?.brand} placeholder="Medi, Juzo, Sigvaris…" />
        <TextField name="model" label="Modelo" defaultValue={stocking?.model} />
        <TextField name="color" label="Color" defaultValue={stocking?.color} />
        <CheckboxField name="madeToMeasure" label="Confección a medida" defaultChecked={stocking?.madeToMeasure} />
        <CheckboxField name="openToe" label="Puntera abierta" defaultChecked={stocking?.openToe} />
        <TextField name="diagnosis" label="Diagnóstico" defaultValue={stocking?.diagnosis} className="sm:col-span-2 lg:col-span-3" placeholder="Insuficiencia venosa, linfedema, post-quirúrgico…" />
      </FormSection>

      <FormSection title="Perímetros" icon={Ruler} description="En centímetros">
        {CIRCUMFERENCES.map(([k, label]) => (
          <NumberField key={k} name={k} label={label} suffix="cm" defaultValue={stocking?.[k]} />
        ))}
      </FormSection>

      <FormSection title="Longitudes desde el suelo" icon={Ruler} description="En centímetros">
        {LENGTHS.map(([k, label]) => (
          <NumberField key={k} name={k} label={label} suffix="cm" defaultValue={stocking?.[k]} />
        ))}
        <TextAreaField name="measurementNotes" label="Notas de la toma de medidas" defaultValue={stocking?.measurementNotes} rows={2} />
      </FormSection>

      <FormSection title="Prescripción médica" icon={FileSignature}>
        <TextField name="prescribingDoctor" label="Médico prescriptor" defaultValue={stocking?.prescribingDoctor} />
        <TextField name="doctorLicenseNo" label="Nº de colegiado" defaultValue={stocking?.doctorLicenseNo} />
        <TextField name="prescriptionDate" label="Fecha de la receta" type="date" defaultValue={toDateInput(stocking?.prescriptionDate)} />
        <TextField name="prescriptionNumber" label="Nº de receta / orden" defaultValue={stocking?.prescriptionNumber} />
        <CheckboxField name="isPublicHealth" label="Financiada por la Seguridad Social" defaultChecked={stocking?.isPublicHealth} />
        <TextField name="publicHealthCode" label="Código catálogo ortoprotésico" defaultValue={stocking?.publicHealthCode} />
        <MoneyField name="patientContrib" label="Aportación del usuario" defaultValue={toEurosInput(stocking?.patientContribCents)} />
      </FormSection>

      <FormSection title="Estado y entrega" icon={CalendarCheck} description="Al marcar «Entregada» se programa la revisión a los 6 meses">
        <SelectField name="status" label="Estado" options={statusOptions} defaultValue={stocking?.status ?? "PENDING"} />
        <TextField name="measuredAt" label="Fecha de toma de medidas" type="date" defaultValue={toDateInput(stocking?.measuredAt ?? new Date())} />
        <TextField name="deliveredAt" label="Fecha de entrega" type="date" defaultValue={toDateInput(stocking?.deliveredAt)} hint="Si se deja vacía al entregar, se usa hoy" />
        <MoneyField name="price" label="Precio" defaultValue={toEurosInput(stocking?.priceCents)} />
      </FormSection>
    </ActionForm>
  );
}
