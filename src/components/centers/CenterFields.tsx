import type { CenterLink } from "@prisma/client";
import { SelectField } from "@/components/ui/Fields";
import { Segmented } from "@/components/ui/Segmented";
import { centerLink } from "@/lib/labels";

/**
 * «Centro» y «Relación con el centro» en los formularios de reparación y plantillas.
 * Si se deja vacío y el cliente acude a un centro, se enlaza solo como usuario de ese centro.
 */
export function CenterFields({ centers, centerId, link }: { centers: { id: string; label: string }[]; centerId?: string | null; link?: CenterLink | null }) {
  if (centers.length === 0) return null;
  return (
    <>
      <SelectField
        name="centerId"
        label="Centro (residencia, centro de día…)"
        placeholder="— Ninguno —"
        options={centers.map((c) => ({ value: c.id, label: c.label }))}
        defaultValue={centerId}
        className="sm:col-span-2 lg:col-span-1"
        hint="Vacío: se usa el centro del cliente, si tiene"
      />
      <div className="sm:col-span-2">
        <span className="field-label">Relación con el centro</span>
        <Segmented
          name="centerLink"
          defaultValue={link ?? "RESIDENT"}
          options={(Object.keys(centerLink) as CenterLink[]).map((k) => ({ value: k, label: centerLink[k].label }))}
        />
      </div>
    </>
  );
}
