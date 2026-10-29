import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { formatDate } from "@/lib/dates";
import { pdfSignature } from "@/lib/signatures";
import { renderTextPdf } from "@/lib/pdf/textPdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Consentimiento RGPD firmado en la tablet (el más reciente), con el texto exacto que se aceptó. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, settings] = await Promise.all([
    prisma.patient.findUnique({ where: { id }, include: { signatures: { where: { kind: "CONSENT" }, orderBy: { signedAt: "desc" }, take: 1 } } }),
    prisma.settings.findUnique({ where: { id: 1 }, select: { businessName: true } }),
  ]);
  const sig = p?.signatures[0];
  if (!p || !sig) return new Response("No hay consentimiento firmado", { status: 404 });

  const bytes = await renderTextPdf({
    title: "Consentimiento para el tratamiento de datos personales y de salud",
    subtitle: `${settings?.businessName ?? ""} · Firmado el ${sig.signedAt.toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" })}`,
    sections: [
      { heading: "Persona interesada", rows: [["Nombre", `${p.firstName} ${p.lastName}`], ["DNI / NIE", p.dni ?? ""], ["Firmado por", `${sig.signerName}${sig.signerDni ? ` (${sig.signerDni})` : ""}`]] },
      { heading: "Información y consentimiento", rows: (sig.text ?? "").split("\n\n") },
      { heading: "Comunicaciones", rows: [p.marketingOptIn ? "Acepta recibir avisos de renovación y citas." : "No desea recibir avisos."] },
    ],
    signature: { ...pdfSignature(sig)!, label: "Firma de la persona interesada" },
    footer: `Firma recogida en la tablet del establecimiento${sig.collectedBy ? ` por ${sig.collectedBy}` : ""} el ${formatDate(sig.signedAt)}. Documento generado por la aplicación de gestión.`,
  });
  await audit("EXPORT", "Patient", id, "PDF del consentimiento firmado");
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="consentimiento-${p.lastName.replace(/[^\w-]+/g, "-")}.pdf"`, "Cache-Control": "no-store" },
  });
}
