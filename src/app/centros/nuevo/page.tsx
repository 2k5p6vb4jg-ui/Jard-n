import { PageHeader } from "@/components/ui/PageHeader";
import { CenterForm } from "@/components/centers/CenterForm";
import { getCenterOptions } from "@/lib/centers";
import { createCenter } from "../actions";

export const metadata = { title: "Nuevo centro" };

export default async function NewCenterPage() {
  return (
    <>
      <PageHeader eyebrow="Centros" title="Nuevo centro" description="Residencia, centro de día u otro centro con el que trabajamos o queremos trabajar" />
      <CenterForm action={createCenter} options={await getCenterOptions()} cancelHref="/centros" />
    </>
  );
}
