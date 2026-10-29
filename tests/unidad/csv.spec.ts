import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { applyMapping, decodeText, guessMapping, parseCsv } from "@/lib/csv";

test.describe("CSV", () => {
  test("detecta el separador y respeta comillas", () => {
    expect(parseCsv("a;b;c\n1;2;3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
    expect(parseCsv('a,b\n"Pérez, Ana","dijo ""hola"""')).toEqual([["a", "b"], ["Pérez, Ana", 'dijo "hola"']]);
    expect(parseCsv("a\tb\r\n1\t2\r\n\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });

  test("lee los CSV de Excel en Windows (ñ y tildes)", () => {
    const buf = fs.readFileSync(path.join(__dirname, "..", "fixtures", "excel-windows.csv"));
    const text = decodeText(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    expect(text).toContain("Muñoz");
    expect(text).toContain("Avilés");
  });

  test("reconoce las columnas por su título", () => {
    const m = guessMapping(["Nombre", "Apellido 1", "Apellido 2", "NIF", "Móvil", "Población", "F. Nacimiento"]);
    expect(m).toMatchObject({ firstName: 0, lastName: 1, lastName2: 2, dni: 3, phone: 4, city: 5, birthDate: 6 });
    expect(applyMapping([["Ana", "Gil", "", "", "600", "", ""]], m)).toEqual([{ firstName: "Ana", lastName: "Gil", phone: "600" }]);
  });
});
