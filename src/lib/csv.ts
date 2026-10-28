/**
 * Lectura de CSV exportados de otros programas o de Excel («Guardar como → CSV»). Se usa en el navegador.
 * Detecta el separador (; , o tabulador) y la codificación (UTF-8 o Windows-1252, la de Excel en español).
 */

export function decodeText(buf: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buf);
  // Si hay caracteres no válidos en UTF-8, el archivo viene de Excel en Windows (ñ, tildes en Windows-1252)
  const text = utf8.includes("�") ? new TextDecoder("windows-1252").decode(buf) : utf8;
  return text.replace(/^﻿/, "");
}

export function parseCsv(text: string): string[][] {
  const nl = text.indexOf("\n");
  const firstLine = nl < 0 ? text : text.slice(0, nl);
  const sep = [";", "\t", ","].map((s) => [s, firstLine.split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.map((r) => r.map((v) => v.trim())).filter((r) => r.some((v) => v !== ""));
}

/** Campos de la ficha de cliente que se pueden importar */
export const IMPORT_FIELDS = {
  firstName: "Nombre",
  lastName: "Apellidos (o primer apellido)",
  lastName2: "Segundo apellido",
  fullName: "Nombre completo (si va en una sola columna)",
  dni: "DNI / NIE",
  phone: "Teléfono",
  phoneAlt: "Teléfono 2",
  email: "Email",
  address: "Dirección",
  postalCode: "Código postal",
  city: "Localidad",
  birthDate: "Fecha de nacimiento",
  healthCardNo: "Tarjeta sanitaria",
  notes: "Observaciones",
} as const;
export type ImportField = keyof typeof IMPORT_FIELDS;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const SYNONYMS: Record<ImportField, string[]> = {
  firstName: ["nombre", "name", "first name", "nombre cliente", "nombre paciente"],
  lastName: ["apellidos", "apellido", "apellido 1", "apellido1", "primer apellido", "last name"],
  lastName2: ["apellido 2", "apellido2", "segundo apellido"],
  fullName: ["nombre completo", "nombre y apellidos", "cliente", "paciente", "razon social"],
  dni: ["dni", "nif", "nie", "dni nie", "dni nif", "documento", "cif nif"],
  phone: ["telefono", "tel", "movil", "telefono movil", "telefono 1", "celular", "tlf", "tfno"],
  phoneAlt: ["telefono 2", "otro telefono", "telefono fijo", "fijo", "tlf 2", "tfno 2"],
  email: ["email", "e mail", "correo", "correo electronico", "mail"],
  address: ["direccion", "domicilio", "calle"],
  postalCode: ["cp", "c p", "codigo postal", "cod postal"],
  city: ["localidad", "poblacion", "ciudad", "municipio"],
  birthDate: ["fecha nacimiento", "fecha de nacimiento", "nacimiento", "f nacimiento", "fecha nac"],
  healthCardNo: ["tarjeta sanitaria", "sip", "tis", "n tarjeta", "tarjeta"],
  notes: ["observaciones", "notas", "comentarios", "obs"],
};

/** Propone a qué columna corresponde cada campo según el título de las columnas. */
export function guessMapping(headers: string[]): Partial<Record<ImportField, number>> {
  const map: Partial<Record<ImportField, number>> = {};
  const used = new Set<number>();
  for (const field of Object.keys(SYNONYMS) as ImportField[]) {
    const idx = headers.findIndex((h, i) => !used.has(i) && SYNONYMS[field].includes(norm(h)));
    if (idx >= 0) {
      map[field] = idx;
      used.add(idx);
    }
  }
  return map;
}

export type ImportRow = Partial<Record<ImportField, string>>;

export function applyMapping(rows: string[][], mapping: Partial<Record<ImportField, number>>): ImportRow[] {
  return rows.map((r) => Object.fromEntries(Object.entries(mapping).map(([f, i]) => [f, (r[i as number] ?? "").trim()]).filter(([, v]) => v)));
}
