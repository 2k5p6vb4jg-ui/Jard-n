import "server-only";
import { PDFDocument, type PDFFont, type PDFPage, StandardFonts, rgb } from "pdf-lib";
import type { Settings } from "@prisma/client";
import { formatDate } from "../dates";

export interface ReceiptData {
  settings: Settings | null;
  logo?: { bytes: Uint8Array; type: "png" | "jpg" } | null;
  order: {
    code: string;
    receivedAt: Date;
    promisedAt: Date | null;
    equipment: string;
    serialNumber: string | null;
    accessories: string | null;
    service: string;
    reportedIssue: string;
    underWarranty: boolean;
  };
  customer: { name: string; phone?: string | null; dni?: string | null };
}

const W = 595.28;
const H = 841.89;
const M = 40;
const TEAL = rgb(0.05, 0.58, 0.53);
const DARK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.4, 0.45, 0.53);
const LINE = rgb(0.8, 0.83, 0.87);

/**
 * Resguardo de entrada de un equipo al taller: A4 con dos copias idénticas
 * (cliente y taller) separadas por una línea de corte.
 */
export async function renderReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const s = data.settings;
  const business = s?.businessName ?? "Ortopedia";
  pdf.setTitle(`Resguardo ${data.order.code} · ${business}`);

  const supported = new Set(font.getCharacterSet());
  const safe = (t: string) => [...t.replace(/\r/g, "")].map((c) => (c === "\n" || supported.has(c.codePointAt(0)!) ? c : "?")).join("");
  const wrap = (text: string, f: PDFFont, size: number, width: number, maxLines = 99) => {
    const out: string[] = [];
    for (const para of safe(text).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/)) {
        const next = line ? `${line} ${word}` : word;
        if (f.widthOfTextAtSize(next, size) <= width) line = next;
        else {
          if (line) out.push(line);
          line = word;
        }
      }
      out.push(line);
    }
    if (out.length > maxLines) {
      const cut = out.slice(0, maxLines);
      cut[maxLines - 1] = cut[maxLines - 1].replace(/\s*\S*$/, "") + "…";
      return cut;
    }
    return out;
  };

  const logo = data.logo
    ? await (data.logo.type === "png" ? pdf.embedPng(data.logo.bytes) : pdf.embedJpg(data.logo.bytes)).catch(() => null)
    : null;

  const page: PDFPage = pdf.addPage([W, H]);
  const half = H / 2;

  const copy = (top: number, label: string) => {
    let y = top - M + 6;
    const text = (t: string, x: number, size: number, f: PDFFont = font, color = DARK) => page.drawText(safe(t), { x, y, size, font: f, color });
    const right = (t: string, xr: number, size: number, f: PDFFont = font, color = DARK) =>
      page.drawText(safe(t), { x: xr - f.widthOfTextAtSize(safe(t), size), y, size, font: f, color });

    // Cabecera
    let hx = M;
    if (logo) {
      const sc = Math.min(40 / logo.width, 40 / logo.height);
      page.drawImage(logo, { x: M, y: y - 30, width: logo.width * sc, height: logo.height * sc });
      hx = M + logo.width * sc + 10;
    }
    text(business, hx, 15, bold, TEAL);
    right(label.toUpperCase(), W - M, 8, bold, MUTED);
    y -= 13;
    const contact = [s?.phone && `Tel. ${s.phone}`, s?.address, s?.city].filter(Boolean).join(" · ");
    text(contact, hx, 8, font, MUTED);
    y -= 26;

    text("RESGUARDO DE ENTRADA AL TALLER", M, 11, bold);
    right(data.order.code, W - M, 18, bold, TEAL);
    y -= 16;
    text(`Fecha de entrada: ${formatDate(data.order.receivedAt)}${data.order.promisedAt ? `   ·   Fecha prevista: ${formatDate(data.order.promisedAt)}` : ""}`, M, 9, font, MUTED);
    y -= 16;
    page.drawLine({ start: { x: M, y: y + 6 }, end: { x: W - M, y: y + 6 }, thickness: 0.6, color: LINE });
    y -= 8;

    // Datos en dos columnas
    const colW = (W - 2 * M - 20) / 2;
    const field = (x: number, yy: number, label: string, value: string, width: number, maxLines = 2) => {
      page.drawText(safe(label.toUpperCase()), { x, y: yy, size: 7, font: bold, color: TEAL });
      const lines = wrap(value || "—", font, 10, width, maxLines);
      lines.forEach((l, i) => page.drawText(l, { x, y: yy - 12 - i * 12, size: 10, font, color: DARK }));
      return 12 + lines.length * 12 + 6;
    };
    const c = data.customer;
    const left = field(M, y, "Cliente", [c.name, c.phone && `Tel. ${c.phone}`].filter(Boolean).join(" · "), colW);
    const rightH = field(M + colW + 20, y, "Equipo", data.order.equipment, colW);
    y -= Math.max(left, rightH);
    const l2 = field(M, y, "Nº de serie", data.order.serialNumber ?? "", colW, 1);
    const r2 = field(M + colW + 20, y, "Servicio", `${data.order.service}${data.order.underWarranty ? " (garantía)" : ""}`, colW, 1);
    y -= Math.max(l2, r2);
    y -= field(M, y, "Accesorios entregados", data.order.accessories ?? "Ninguno", W - 2 * M, 1);
    y -= field(M, y, "Avería / motivo indicado por el cliente", data.order.reportedIssue, W - 2 * M, 3);

    // Condiciones y firmas
    const cond =
      "Conserve este resguardo para recoger el equipo. Se le comunicará el presupuesto antes de realizar cualquier reparación con coste. " +
      "Los equipos no retirados en 3 meses desde el aviso de finalización podrán generar gastos de almacenaje.";
    const condLines = wrap(cond, font, 7, W - 2 * M);
    const sigTop = top - half + M + 58;
    condLines.forEach((l, i) => page.drawText(l, { x: M, y: sigTop + 14 + (condLines.length - 1 - i) * 9, size: 7, font, color: MUTED }));
    const sigW = (W - 2 * M - 30) / 2;
    ["Firma del cliente", `Recibido por ${business}`].forEach((lbl, i) => {
      const x = M + i * (sigW + 30);
      page.drawRectangle({ x, y: sigTop - 44, width: sigW, height: 50, borderColor: LINE, borderWidth: 0.6, borderDashArray: [3, 3] });
      page.drawText(safe(lbl), { x: x + 6, y: sigTop - 6, size: 7, font, color: MUTED });
    });
  };

  copy(H, "Copia para el cliente");
  // Línea de corte
  page.drawLine({ start: { x: 16, y: half }, end: { x: W - 16, y: half }, thickness: 0.6, color: LINE, dashArray: [4, 4] });
  page.drawText("- - corte aquí - -", { x: W / 2 - 30, y: half + 3, size: 6, font, color: LINE });
  copy(half, "Copia para el taller");

  return pdf.save();
}
