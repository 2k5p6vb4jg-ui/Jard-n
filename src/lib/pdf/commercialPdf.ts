import "server-only";
import { PDFDocument, type PDFFont, type PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { Settings } from "@prisma/client";
import { formatEUR } from "../money";
import { DEFAULT_COLORS, isHexColor } from "../branding.colors";

/** Documento comercial A4 (presupuesto de taller, propuesta a un centro…) con la imagen de la marca. */
export interface CommercialPdfData {
  settings: Settings | null;
  /** Logo PNG/JPG ya leído del disco */
  logo?: { bytes: Uint8Array; type: "png" | "jpg" } | null;
  /** «PRESUPUESTO», «PROPUESTA»… */
  docType: string;
  number: string;
  /** Filas del recuadro de la cabecera (número, fecha, validez…) */
  meta: [string, string][];
  /** Dos bloques en columnas bajo la cabecera (cliente, equipo / centro, propuesta) */
  blocks: { title: string; rows: string[] }[];
  before: { title: string; body: string }[];
  lines: { description: string; quantity: number; unit: string; unitPriceCents: number; totalCents: number; strong?: boolean }[];
  totals: { label: string; value: string; strong?: boolean }[];
  grandTotal: { label: string; value: string };
  /** Texto pequeño bajo el total (p. ej. importe total del contrato) */
  totalNote?: string;
  after: { title: string; body: string }[];
  signatures: [string, string];
}

const hexToRgb = (hex: string) => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
const mix = (hex: string, amount: number) => {
  // Mezcla con blanco (0 = color, 1 = blanco)
  const ch = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255;
  return rgb(ch(1) + (1 - ch(1)) * amount, ch(3) + (1 - ch(3)) * amount, ch(5) + (1 - ch(5)) * amount);
};

// A4 en puntos
const W = 595.28;
const H = 841.89;
const M = 48; // margen
const SLATE_900 = rgb(0.06, 0.09, 0.16);
const SLATE_600 = rgb(0.28, 0.33, 0.41);
const SLATE_400 = rgb(0.58, 0.64, 0.72);
const SLATE_100 = rgb(0.95, 0.96, 0.98);

/**
 * Documento formal en PDF (A4), generado en el propio equipo con fuentes estándar
 * (Helvetica, codificación WinAnsi: admite tildes, ñ y €). Colores de la marca (Ajustes).
 */
export async function renderCommercialPdf(data: CommercialPdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const s = data.settings;
  const businessName = s?.businessName ?? "Ortopedia";
  const brandHex = isHexColor(s?.brandColor) ? s.brandColor : DEFAULT_COLORS.brandColor;
  const accentHex = isHexColor(s?.accentColor) ? s.accentColor : DEFAULT_COLORS.accentColor;
  const TEAL = hexToRgb(brandHex);
  const TEAL_50 = mix(brandHex, 0.93);
  const GOLD = hexToRgb(accentHex);
  const docName = data.docType.charAt(0) + data.docType.slice(1).toLowerCase();

  pdf.setTitle(`${docName} ${data.number} · ${businessName}`);
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
    text(`${businessName} · ${docName} ${data.number} (continuación)`, M, y, 9, bold, SLATE_600);
    y -= 24;
  };
  const ensure = (needed: number) => {
    if (y - needed < bottomLimit) newPage();
  };

  // ── Cabecera ──────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: TEAL });
  page.drawRectangle({ x: 0, y: H - 10, width: W, height: 2, color: GOLD });
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
  text(data.docType, boxX + 14, y - 16, 15, bold, TEAL);
  data.meta.slice(0, 4).forEach(([k, v], i) => {
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
  const heights = data.blocks.slice(0, 2).map((bl, i) => block(M + i * (colW + 16), bl.title, bl.rows.filter(Boolean)));
  y -= Math.max(0, ...heights) + 12;

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
  for (const p of data.before) paragraph(p.title, p.body);

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
  data.lines.forEach((l, i) => {
    const descLines = wrap(l.description, font, 10, cols.qty - cols.desc - 20);
    const rowH = descLines.length * 13 + 8;
    if (y - rowH < bottomLimit + 20) {
      newPage();
      tableHeader();
    }
    if (i % 2 === 1) page.drawRectangle({ x: M, y: y - rowH + 10, width: W - 2 * M, height: rowH, color: SLATE_100 });
    descLines.forEach((dl, j) => text(dl, cols.desc, y - j * 13, 10, l.strong ? bold : font));
    textRight(`${qtyFmt(l.quantity)} ${l.unit}`, cols.qty + 30, y, 10, font, SLATE_600);
    textRight(formatEUR(l.unitPriceCents), cols.unit, y, 10, font, SLATE_600);
    textRight(formatEUR(l.totalCents), cols.total, y, 10, bold);
    y -= rowH;
  });
  if (data.lines.length === 0) {
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
  for (const t of data.totals) totalRow(t.label, t.value, t.strong);
  y -= 10;
  page.drawRectangle({ x: tx - 10, y: y - 9, width: cols.total - tx + 18, height: 26, color: TEAL });
  text(data.grandTotal.label, tx, y, 12, bold, rgb(1, 1, 1));
  textRight(data.grandTotal.value, cols.total, y, 13, bold, rgb(1, 1, 1));
  y -= 22;
  if (data.totalNote) {
    textRight(data.totalNote, cols.total, y, 9, bold, SLATE_600);
    y -= 14;
  }
  y -= 14;

  // ── Observaciones, validez y conformidad ──────────────────────────────────
  for (const p of data.after) paragraph(p.title, p.body);

  ensure(80);
  y -= 10;
  const sigW = (W - 2 * M - 40) / 2;
  for (const [i, label] of data.signatures.entries()) {
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
    p.drawText(safe(`${businessName} · ${data.number}`), { x: M, y: M - 6, size: 8, font, color: SLATE_400 });
  });

  return pdf.save();
}
