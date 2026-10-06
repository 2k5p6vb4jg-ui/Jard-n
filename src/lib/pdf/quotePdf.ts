import "server-only";
import { PDFDocument, type PDFFont, type PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { Settings } from "@prisma/client";
import { formatEUR } from "../money";
import { formatDate } from "../dates";
import type { QuoteLine } from "../quotes";

export interface QuotePdfData {
  settings: Settings | null;
  /** Logo PNG/JPG ya leído del disco */
  logo?: { bytes: Uint8Array; type: "png" | "jpg" } | null;
  quote: {
    number: string;
    issuedAt: Date;
    validUntil: Date;
    partsCents: number;
    laborCents: number;
    discountCents: number;
    subtotalCents: number;
    taxRate: number;
    taxCents: number;
    totalCents: number;
    notes: string | null;
    lines: QuoteLine[];
  };
  order: {
    code: string;
    equipment: string;
    serialNumber: string | null;
    service: string;
    reportedIssue: string;
    diagnosis: string | null;
    underWarranty: boolean;
  };
  customer: { name: string; dni?: string | null; phone?: string | null; address?: string | null; email?: string | null };
}

// A4 en puntos
const W = 595.28;
const H = 841.89;
const M = 48; // margen
const TEAL = rgb(0.05, 0.58, 0.53);
const SLATE_900 = rgb(0.06, 0.09, 0.16);
const SLATE_600 = rgb(0.28, 0.33, 0.41);
const SLATE_400 = rgb(0.58, 0.64, 0.72);
const SLATE_100 = rgb(0.95, 0.96, 0.98);
const TEAL_50 = rgb(0.94, 0.99, 0.98);

/**
 * Presupuesto formal en PDF (A4), generado en el propio equipo con fuentes estándar
 * (Helvetica, codificación WinAnsi: admite tildes, ñ y €).
 */
export async function renderQuotePdf(data: QuotePdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const s = data.settings;
  const businessName = s?.businessName ?? "Ortopedia";

  pdf.setTitle(`Presupuesto ${data.quote.number} · ${businessName}`);
  pdf.setAuthor(businessName);
  pdf.setCreator("Jardón Ortopedia · gestión local");

  // Sustituye caracteres que Helvetica/WinAnsi no puede dibujar (emojis, etc.)
  const supported = new Set(font.getCharacterSet());
  const safe = (t: string) => [...t.replace(/\r/g, "")].map((c) => (c === "\n" || supported.has(c.codePointAt(0)!) ? c : "?")).join("");

  const wrap = (text: string, f: PDFFont, size: number, maxWidth: number): string[] => {
    const out: string[] = [];
    for (const para of safe(text).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(next, size) <= maxWidth) line = next;
        else {
          if (line) out.push(line);
          line = word;
        }
      }
      out.push(line);
    }
    return out;
  };

  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;

  const text = (t: string, x: number, yy: number, size = 10, f: PDFFont = font, color = SLATE_900) =>
    page.drawText(safe(t), { x, y: yy, size, font: f, color });
  const textRight = (t: string, xRight: number, yy: number, size = 10, f: PDFFont = font, color = SLATE_900) =>
    text(t, xRight - f.widthOfTextAtSize(safe(t), size), yy, size, f, color);

  // Reserva para el pie legal de cada página
  const footerLines = s?.quoteLegalFooter ? wrap(s.quoteLegalFooter, font, 7, W - 2 * M) : [];
  const bottomLimit = M + 24 + footerLines.length * 9;

  const newPage = () => {
    page = pdf.addPage([W, H]);
    y = H - M;
    text(`${businessName} · Presupuesto ${data.quote.number} (continuación)`, M, y, 9, bold, SLATE_600);
    y -= 24;
  };
  const ensure = (needed: number) => {
    if (y - needed < bottomLimit) newPage();
  };

  // ── Cabecera ──────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: TEAL });
  // Logo opcional a la izquierda (máx. 64×64 pt, manteniendo proporción); el texto se desplaza a su derecha
  let hx = M;
  if (data.logo) {
    try {
      const img = data.logo.type === "png" ? await pdf.embedPng(data.logo.bytes) : await pdf.embedJpg(data.logo.bytes);
      const scale = Math.min(64 / img.width, 64 / img.height);
      page.drawImage(img, { x: M, y: y - 64 + (64 - img.height * scale) / 2 + 8, width: img.width * scale, height: img.height * scale });
      hx = M + img.width * scale + 14;
    } catch {
      // Imagen dañada: el presupuesto se genera igualmente sin logo
    }
  }
  text(businessName, hx, y - 6, 20, bold, TEAL);
  const issuer = [
    s?.legalName && s.legalName !== businessName ? s.legalName : null,
    s?.taxId ? `CIF/NIF: ${s.taxId}` : null,
    [s?.address, [s?.postalCode, s?.city].filter(Boolean).join(" "), s?.province].filter(Boolean).join(", ") || null,
    [s?.phone && `Tel. ${s.phone}`, s?.email].filter(Boolean).join(" · ") || null,
    s?.healthLicense ? `Licencia sanitaria: ${s.healthLicense}` : null,
  ].filter((l): l is string => !!l);
  issuer.forEach((l, i) => text(l, hx, y - 26 - i * 13, 9, font, SLATE_600));

  const boxW = 190;
  const boxX = W - M - boxW;
  page.drawRectangle({ x: boxX, y: y - 92, width: boxW, height: 96, color: TEAL_50, borderColor: TEAL, borderWidth: 0.8 });
  text("PRESUPUESTO", boxX + 14, y - 16, 15, bold, TEAL);
  const meta: [string, string][] = [
    ["Número", data.quote.number],
    ["Fecha", formatDate(data.quote.issuedAt)],
    ["Válido hasta", formatDate(data.quote.validUntil)],
    ["Orden de taller", data.order.code],
  ];
  meta.forEach(([k, v], i) => {
    text(k, boxX + 14, y - 38 - i * 14, 9, font, SLATE_600);
    textRight(v, boxX + boxW - 14, y - 38 - i * 14, 9, bold);
  });
  y -= Math.max(26 + issuer.length * 13, 100) + 18;

  // ── Cliente y equipo ──────────────────────────────────────────────────────
  const colW = (W - 2 * M - 16) / 2;
  const block = (x: number, title: string, rows: string[]) => {
    text(title.toUpperCase(), x, y, 8, bold, TEAL);
    let yy = y - 15;
    for (const r of rows) {
      for (const l of wrap(r, font, 10, colW)) {
        text(l, x, yy, 10);
        yy -= 13;
      }
    }
    return y - yy;
  };
  const c = data.customer;
  const hCustomer = block(M, "Cliente", [c.name, c.dni ? `DNI/NIE: ${c.dni}` : "", c.phone ? `Tel. ${c.phone}` : "", c.email ?? "", c.address ?? ""].filter(Boolean));
  const hEquip = block(M + colW + 16, "Equipo", [
    data.order.equipment,
    data.order.serialNumber ? `Nº de serie: ${data.order.serialNumber}` : "",
    `Servicio: ${data.order.service}${data.order.underWarranty && !/garant/i.test(data.order.service) ? " (en garantía)" : ""}`,
  ].filter(Boolean));
  y -= Math.max(hCustomer, hEquip) + 12;

  // ── Descripción ───────────────────────────────────────────────────────────
  const paragraph = (title: string, body: string) => {
    const lines = wrap(body, font, 10, W - 2 * M);
    ensure(18 + lines.length * 13);
    text(title.toUpperCase(), M, y, 8, bold, TEAL);
    y -= 15;
    for (const l of lines) {
      ensure(13);
      text(l, M, y, 10, font, SLATE_600);
      y -= 13;
    }
    y -= 8;
  };
  paragraph("Motivo de entrada", data.order.reportedIssue);
  if (data.order.diagnosis) paragraph("Diagnóstico técnico", data.order.diagnosis);

  // ── Tabla de conceptos ────────────────────────────────────────────────────
  const cols = { desc: M + 8, qty: W - M - 190, unit: W - M - 90, total: W - M - 8 };
  const tableHeader = () => {
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 22, color: TEAL });
    const white = rgb(1, 1, 1);
    text("Concepto", cols.desc, y + 1, 9, bold, white);
    textRight("Cantidad", cols.qty + 30, y + 1, 9, bold, white);
    textRight("Precio ud.", cols.unit, y + 1, 9, bold, white);
    textRight("Importe", cols.total, y + 1, 9, bold, white);
    y -= 26;
  };
  ensure(60);
  y -= 6;
  tableHeader();

  const qtyFmt = (q: number) => q.toLocaleString("es-ES", { maximumFractionDigits: 2 });
  data.quote.lines.forEach((l, i) => {
    const descLines = wrap(l.description, font, 10, cols.qty - cols.desc - 20);
    const rowH = descLines.length * 13 + 8;
    if (y - rowH < bottomLimit + 20) {
      newPage();
      tableHeader();
    }
    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - rowH + 10, width: W - 2 * M, height: rowH, color: SLATE_100 });
    descLines.forEach((dl, j) => text(dl, cols.desc, y - j * 13, 10, l.kind === "labor" ? bold : font));
    textRight(`${qtyFmt(l.quantity)} ${l.unit}`, cols.qty + 30, y, 10, font, SLATE_600);
    textRight(formatEUR(l.unitPriceCents), cols.unit, y, 10, font, SLATE_600);
    textRight(formatEUR(l.totalCents), cols.total, y, 10, bold);
    y -= rowH;
  });
  if (data.quote.lines.length === 0) {
    text("Sin conceptos.", cols.desc, y, 10, font, SLATE_400);
    y -= 20;
  }

  // ── Totales ───────────────────────────────────────────────────────────────
  ensure(150);
  page.drawLine({ start: { x: M, y: y + 6 }, end: { x: W - M, y: y + 6 }, thickness: 0.6, color: SLATE_400 });
  y -= 14;
  const tx = W - M - 220;
  const totalRow = (label: string, value: string, strong = false) => {
    text(label, tx, y, 10, strong ? bold : font, strong ? SLATE_900 : SLATE_600);
    textRight(value, cols.total, y, 10, strong ? bold : font);
    y -= 16;
  };
  totalRow("Piezas y materiales", formatEUR(data.quote.partsCents));
  totalRow("Mano de obra", formatEUR(data.quote.laborCents));
  if (data.quote.discountCents > 0) totalRow("Descuento", `-${formatEUR(data.quote.discountCents)}`);
  totalRow("Base imponible", formatEUR(data.quote.subtotalCents), true);
  totalRow(`IVA (${data.quote.taxRate.toLocaleString("es-ES")} %)`, formatEUR(data.quote.taxCents));
  y -= 10;
  page.drawRectangle({ x: tx - 10, y: y - 9, width: cols.total - tx + 18, height: 26, color: TEAL });
  text("TOTAL", tx, y, 12, bold, rgb(1, 1, 1));
  textRight(formatEUR(data.quote.totalCents), cols.total, y, 13, bold, rgb(1, 1, 1));
  y -= 36;

  // ── Observaciones, validez y conformidad ──────────────────────────────────
  if (data.quote.notes) paragraph("Observaciones", data.quote.notes);
  const validityDays = Math.round((data.quote.validUntil.getTime() - data.quote.issuedAt.getTime()) / 86_400_000);
  paragraph(
    "Validez",
    `Este presupuesto tiene una validez de ${validityDays} días, hasta el ${formatDate(data.quote.validUntil)}. ` +
      "Los precios incluyen el IVA indicado. Cualquier trabajo adicional no previsto se comunicará antes de realizarse.",
  );

  ensure(80);
  y -= 10;
  const sigW = (W - 2 * M - 40) / 2;
  for (const [i, label] of ["Conforme del cliente (firma y fecha)", `Por ${businessName}`].entries()) {
    const x = M + i * (sigW + 40);
    page.drawRectangle({ x, y: y - 56, width: sigW, height: 62, borderColor: SLATE_400, borderWidth: 0.6, borderDashArray: [3, 3] });
    text(label, x + 8, y - 8, 8, font, SLATE_600);
  }

  // ── Pie legal y numeración en todas las páginas ───────────────────────────
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    footerLines.forEach((l, j) => p.drawText(l, { x: M, y: M + 12 + (footerLines.length - 1 - j) * 9, size: 7, font, color: SLATE_400 }));
    const label = `Página ${i + 1} de ${pages.length}`;
    p.drawText(label, { x: W - M - font.widthOfTextAtSize(label, 8), y: M - 6, size: 8, font, color: SLATE_400 });
    p.drawText(safe(`${businessName} · ${data.quote.number}`), { x: M, y: M - 6, size: 8, font, color: SLATE_400 });
  });

  return pdf.save();
}
