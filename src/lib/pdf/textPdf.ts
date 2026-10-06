import "server-only";
import { PDFDocument, type PDFFont, type PDFPage, StandardFonts, rgb } from "pdf-lib";

export interface TextSection {
  heading: string;
  /** Pares etiqueta/valor o párrafos sueltos */
  rows: ([string, string] | string)[];
}

const W = 595.28;
const H = 841.89;
const M = 48;
const TEAL = rgb(0.05, 0.58, 0.53);
const DARK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.4, 0.45, 0.53);

/** Informe sencillo A4 (título, secciones con etiqueta/valor, pie y numeración). */
export async function renderTextPdf(opts: { title: string; subtitle?: string; sections: TextSection[]; footer?: string }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(opts.title);

  const supported = new Set(font.getCharacterSet());
  const safe = (t: string) => [...t.replace(/\r/g, "")].map((c) => (c === "\n" || supported.has(c.codePointAt(0)!) ? c : "?")).join("");
  const wrap = (text: string, f: PDFFont, size: number, width: number) => {
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
    return out;
  };

  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;
  const ensure = (h: number) => {
    if (y - h < M + 30) {
      page = pdf.addPage([W, H]);
      y = H - M;
    }
  };
  const draw = (t: string, x: number, size: number, f: PDFFont, color = DARK) => page.drawText(t, { x, y, size, font: f, color });

  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: TEAL });
  for (const l of wrap(opts.title, bold, 18, W - 2 * M)) {
    draw(l, M, 18, bold, TEAL);
    y -= 24;
  }
  if (opts.subtitle) {
    for (const l of wrap(opts.subtitle, font, 10, W - 2 * M)) {
      draw(l, M, 10, font, MUTED);
      y -= 14;
    }
  }
  y -= 10;

  const labelW = 150;
  for (const s of opts.sections) {
    ensure(40);
    y -= 6;
    draw(safe(s.heading.toUpperCase()), M, 9, bold, TEAL);
    y -= 6;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: rgb(0.85, 0.87, 0.9) });
    y -= 14;
    if (s.rows.length === 0) {
      draw("Sin datos.", M, 10, font, MUTED);
      y -= 16;
    }
    for (const r of s.rows) {
      if (typeof r === "string") {
        const lines = wrap(r, font, 10, W - 2 * M);
        for (const l of lines) {
          ensure(14);
          draw(l, M, 10, font);
          y -= 13;
        }
        y -= 3;
        continue;
      }
      const [label, value] = r;
      const lines = wrap(value || "—", font, 10, W - 2 * M - labelW);
      ensure(lines.length * 13 + 3);
      draw(safe(label), M, 9, font, MUTED);
      for (const l of lines) {
        page.drawText(l, { x: M + labelW, y, size: 10, font, color: DARK });
        y -= 13;
      }
      y -= 3;
    }
    y -= 8;
  }

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    if (opts.footer) {
      const lines = wrap(opts.footer, font, 7, W - 2 * M);
      lines.forEach((l, j) => p.drawText(l, { x: M, y: M + 6 + (lines.length - 1 - j) * 9, size: 7, font, color: MUTED }));
    }
    const label = `Página ${i + 1} de ${pages.length}`;
    p.drawText(label, { x: W - M - font.widthOfTextAtSize(label, 8), y: M - 12, size: 8, font, color: MUTED });
  });
  return pdf.save();
}
