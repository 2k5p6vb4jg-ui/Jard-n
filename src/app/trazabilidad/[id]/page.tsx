import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProductForm } from "@/components/products/ProductForm";
import { saveProduct } from "../actions";

export const metadata = { title: "Editar producto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, patients] = await Promise.all([
    prisma.trackedProduct.findUnique({ where: { id } }),
    prisma.patient.findMany({ where: { archivedAt: null }, select: { id: true, firstName: true, lastName: true, dni: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
  ]);
  if (!product) notFound();
  return (
    <>
      <PageHeader title={`Editar · ${product.serialNumber}`} description={`${product.brand} ${product.model}`} />
      <ProductForm action={saveProduct.bind(null, id)} product={product} patients={patients} cancelHref="/trazabilidad" />
    </>
  );
}
