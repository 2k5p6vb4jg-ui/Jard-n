import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductForm } from "@/components/products/ProductForm";
import { saveProduct } from "../actions";

export const metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  const patients = await prisma.patient.findMany({ where: { archivedAt: null }, select: { id: true, firstName: true, lastName: true, dni: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] });
  return (
    <>
      <PageHeader title="Nuevo producto de alto valor" description="Sillas, scooters, grúas, motores, prótesis…" />
      <ProductForm action={saveProduct.bind(null, null)} patients={patients} cancelHref="/trazabilidad" />
    </>
  );
}
