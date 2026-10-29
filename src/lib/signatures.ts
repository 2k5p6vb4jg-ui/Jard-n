import "server-only";
import type { Settings, SignatureKind } from "@prisma/client";
import { formatDate } from "./dates";
import { FormError } from "./forms";

export const SIGNATURE_KINDS: Record<SignatureKind, { label: string; param: string }> = {
  RECEIPT: { label: "Resguardo de entrada", param: "resguardo" },
  QUOTE: { label: "Presupuesto", param: "presupuesto" },
  PROPOSAL: { label: "Propuesta", param: "propuesta" },
  CONSENT: { label: "Consentimiento RGPD", param: "consentimiento" },
};

export const kindFromParam = (p: string | undefined) =>
  (Object.keys(SIGNATURE_KINDS) as SignatureKind[]).find((k) => SIGNATURE_KINDS[k].param === p);

/** Texto del consentimiento para el tratamiento de datos de salud (se congela al firmar). */
export function consentText(s: Pick<Settings, "businessName" | "legalName" | "taxId" | "address" | "postalCode" | "city" | "email" | "phone"> | null) {
  const who = [s?.legalName || s?.businessName || "La ortopedia", s?.taxId && `(CIF/NIF ${s.taxId})`].filter(Boolean).join(" ");
  const where = [s?.address, [s?.postalCode, s?.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const contact = [where, s?.email, s?.phone].filter(Boolean).join(" · ");
  return [
    `Responsable del tratamiento: ${who}${contact ? `. ${contact}` : ""}.`,
    "Finalidad: prestar los servicios de ortopedia solicitados (toma de medidas, estudio de la pisada, fabricación, adaptación, " +
      "reparación y seguimiento de productos), gestionar citas, presupuestos y facturación, y cumplir las obligaciones legales " +
      "sanitarias y fiscales, incluida la trazabilidad de los productos sanitarios.",
    "Datos tratados: identificativos y de contacto, y datos de salud necesarios para el servicio (medidas, diagnósticos, " +
      "prescripciones, fotografías e informes).",
    "Legitimación: su consentimiento expreso para los datos de salud (art. 9.2.a RGPD), la ejecución del servicio solicitado y " +
      "el cumplimiento de obligaciones legales.",
    "Conservación: mientras dure la relación y, después, durante los plazos legales aplicables.",
    "Destinatarios: no se ceden datos a terceros salvo obligación legal o a los fabricantes cuando sea imprescindible para " +
      "fabricar o reparar su producto. Los datos se guardan en los equipos del propio establecimiento.",
    "Derechos: puede acceder, rectificar, suprimir, oponerse, limitar el tratamiento y pedir la portabilidad de sus datos " +
      "dirigiéndose al establecimiento, y reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).",
    "Con mi firma, consiento el tratamiento de mis datos, incluidos los de salud, para las finalidades indicadas.",
  ].join("\n\n");
}

/** Convierte el PNG que envía el navegador (data URL) en bytes, con comprobaciones básicas. */
export function readSignatureImage(fd: FormData): Uint8Array<ArrayBuffer> {
  const v = String(fd.get("signature") ?? "");
  const prefix = "data:image/png;base64,";
  if (!v.startsWith(prefix)) throw new FormError("Falta la firma: firme en el recuadro con el dedo.");
  const bytes = Buffer.from(v.slice(prefix.length), "base64");
  if (bytes.length > 1_000_000) throw new FormError("La firma es demasiado grande.");
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new FormError("La firma no es una imagen válida.");
  return new Uint8Array(bytes);
}

/** Firma lista para incrustar en un PDF */
export interface PdfSignature {
  png: Uint8Array;
  caption: string;
}

export const pdfSignature = (s: { image: Uint8Array; signerName: string; signerDni: string | null; signedAt: Date } | null | undefined): PdfSignature | null =>
  s ? { png: s.image, caption: `${s.signerName}${s.signerDni ? ` · ${s.signerDni}` : ""} · ${formatDate(s.signedAt)}` } : null;
