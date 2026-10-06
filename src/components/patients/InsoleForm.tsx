import { CalendarCheck, Footprints, Layers, Ruler, Stethoscope, Wand2 } from "lucide-react";
import type { InsoleCorrection, InsolePathology, InsolePrescription } from "@prisma/client";
import { type ActionState, toDateInput, toEurosInput } from "@/lib/forms";
import { footPathology, insoleFinish, insoleMaterial, insoleType, prescriptionStatus } from "@/lib/labels";
import { ActionForm } from "@/components/ui/Form";
import { FormSection, MoneyField, NumberField, SelectField, TextAreaField, TextField } from "@/components/ui/Fields";
import { SIDE_OPTIONS, Segmented } from "@/components/ui/Segmented";
import { CorrectionsEditor } from "./CorrectionsEditor";

type Insole = InsolePrescription & { pathologies: InsolePathology[]; corrections: InsoleCorrection[] };

const statusOptions = Object.fromEntries(Object.entries(prescriptionStatus).map(([k, v]) => [k, v.label]));

export function InsoleForm({
  action,
  insole,
  cancelHref,
}: {
  action: (s: ActionState, fd: FormData) => Promise<ActionState>;
  insole?: Insole;
  cancelHref: string;
}) {
  const pathSide = (p: string) => insole?.pathologies.find((x) => x.pathology === p)?.side ?? "";

  return (
    <ActionForm action={action} cancelHref={cancelHref} submitLabel={insole ? "Guardar cambios" : "Crear plantillas"}>
      <FormSection title="Tipo de plantilla" icon={Footprints}>
        <SelectField name="insoleType" label="Uso" options={insoleType} defaultValue={insole?.insoleType ?? "DAILY"} />
        <SelectField name="side" label="Pie" options={{ BOTH: "Ambos pies", LEFT: "Solo izquierdo", RIGHT: "Solo derecho" }} defaultValue={insole?.side ?? "BOTH"} />
        <TextField name="prescribedBy" label="Derivado por" defaultValue={insole?.prescribedBy} placeholder="Podólogo / traumatólogo" />
      </FormSection>

      <FormSection title="Patologías" icon={Stethoscope} description="Marque el pie afectado en cada patología">
        <div className="grid gap-x-6 gap-y-3 sm:col-span-2 lg:col-span-3 lg:grid-cols-2">
          {Object.entries(footPathology).map(([value, label]) => (
            <div key={value} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <span className="font-medium text-slate-700">{label}</span>
              <Segmented name={`path_${value}`} defaultValue={pathSide(value)} options={[{ value: "", label: "No" }, ...SIDE_OPTIONS]} />
            </div>
          ))}
        </div>
        <TextAreaField name="diagnosisNotes" label="Notas del diagnóstico" defaultValue={insole?.diagnosisNotes} rows={2} />
      </FormSection>

      <FormSection title="Material" icon={Layers}>
        <SelectField name="material" label="Material principal" options={insoleMaterial} defaultValue={insole?.material ?? "EVA"} />
        <NumberField name="shoreDensity" label="Densidad" suffix="º Shore" defaultValue={insole?.shoreDensity} placeholder="35, 45, 55…" />
        <SelectField name="finish" label="Acabado / forro" options={insoleFinish} defaultValue={insole?.finish ?? "NONE"} />
        <SelectField name="baseMaterial" label="Material de base" options={insoleMaterial} placeholder="—" defaultValue={insole?.baseMaterial} />
        <NumberField name="baseDensity" label="Densidad de base" suffix="º Shore" defaultValue={insole?.baseDensity} />
        <NumberField name="thicknessMm" label="Grosor" suffix="mm" defaultValue={insole?.thicknessMm} />
      </FormSection>

      <FormSection title="Medidas" icon={Ruler}>
        <NumberField name="shoeSize" label="Talla (EU)" defaultValue={insole?.shoeSize} />
        <NumberField name="footLengthLeftMm" label="Longitud pie izq." suffix="mm" defaultValue={insole?.footLengthLeftMm} />
        <NumberField name="footLengthRightMm" label="Longitud pie dcho." suffix="mm" defaultValue={insole?.footLengthRightMm} />
        <NumberField name="heelLiftMm" label="Alza (dismetría)" suffix="mm" defaultValue={insole?.heelLiftMm} />
        <NumberField name="footWidthLeftMm" label="Anchura pie izq." suffix="mm" defaultValue={insole?.footWidthLeftMm} />
        <NumberField name="footWidthRightMm" label="Anchura pie dcho." suffix="mm" defaultValue={insole?.footWidthRightMm} />
        <NumberField name="archHeightLeftMm" label="Altura arco izq." suffix="mm" defaultValue={insole?.archHeightLeftMm} />
        <NumberField name="archHeightRightMm" label="Altura arco dcho." suffix="mm" defaultValue={insole?.archHeightRightMm} />
      </FormSection>

      <FormSection title="Correcciones" icon={Wand2}>
        <CorrectionsEditor initial={insole?.corrections ?? []} />
        <TextAreaField name="technicalNotes" label="Notas técnicas" defaultValue={insole?.technicalNotes} />
      </FormSection>

      <FormSection title="Estado y entrega" icon={CalendarCheck} description="Al marcar «Entregada» se programa la revisión a los 12 meses">
        <SelectField name="status" label="Estado" options={statusOptions} defaultValue={insole?.status ?? "PENDING"} />
        <TextField name="measuredAt" label="Fecha de toma de medidas" type="date" defaultValue={toDateInput(insole?.measuredAt ?? new Date())} />
        <TextField name="deliveredAt" label="Fecha de entrega" type="date" defaultValue={toDateInput(insole?.deliveredAt)} hint="Si se deja vacía al entregar, se usa hoy" />
        <MoneyField name="price" label="Precio" defaultValue={toEurosInput(insole?.priceCents)} />
      </FormSection>
    </ActionForm>
  );
}
