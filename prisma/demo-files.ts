/**
 * Genera archivos de ejemplo para los datos de prueba (sin imágenes reales de pacientes):
 * una pedigrafía dibujada en PNG y PDFs sencillos.
 */
import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function png(width: number, height: number, pixel: (x: number, y: number) => [number, number, number]): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // filtro "none"
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (width * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bits
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Huella plantar estilizada (pie plano si `flat`) sobre papel, como una pedigrafía. */
export function footprintPng(flat: boolean): Buffer {
  const W = 640, H = 800;
  const inside = (x: number, y: number, cx: number, cy: number, rx: number, ry: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  const foot = (x: number, y: number, cx: number, mirror: number) => {
    const lx = (x - cx) * mirror; // coordenada local (positivo = lado externo)
    if (inside(lx, y, 0, 640, 62, 80)) return true; // talón
    if (inside(lx, y, -8, 300, 105, 85)) return true; // antepié
    // istmo: estrecho en pie cavo/normal, ancho en pie plano
    const half = flat ? 70 : 34;
    if (y > 330 && y < 600 && lx > 70 - 2 * half && lx < 72) return true;
    const toes: [number, number, number][] = [[-70, 175, 30], [-18, 168, 20], [20, 176, 17], [52, 190, 15], [78, 210, 13]];
    return toes.some(([tx, ty, r]) => inside(lx, y, tx, ty, r, r * 1.2));
  };
  return png(W, H, (x, y) => {
    const ink = foot(x, y, 170, 1) || foot(x, y, 470, -1);
    const noise = ((x * 7919 + y * 104729) % 23) - 11; // textura de tinta
    return ink ? [40 + noise, 60 + noise, 140 + noise] : [250, 248, 240];
  });
}

export async function demoPdf(title: string, lines: string[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText("DOCUMENTO DE EJEMPLO · DATOS FICTICIOS", { x: 50, y: 800, size: 9, font, color: rgb(0.8, 0.2, 0.2) });
  page.drawText(title, { x: 50, y: 760, size: 20, font: bold, color: rgb(0.06, 0.46, 0.43) });
  lines.forEach((l, i) => page.drawText(l, { x: 50, y: 720 - i * 20, size: 12, font }));
  return Buffer.from(await pdf.save());
}

export async function writeDemoFile(storagePath: string, data: Buffer) {
  const root = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "./uploads");
  const full = path.join(root, storagePath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
  return data.length;
}

export async function removeFiles(storagePaths: string[]) {
  const root = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "./uploads");
  const dirs = new Set<string>();
  for (const p of storagePaths) {
    const full = path.resolve(root, p);
    if (!full.startsWith(root + path.sep)) continue;
    await fs.rm(full, { force: true });
    dirs.add(path.dirname(full));
  }
  for (const d of dirs) await fs.rmdir(d).catch(() => {}); // solo si quedó vacía
}
