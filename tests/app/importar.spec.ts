import path from "node:path";
import { test, expect } from "./helpers";

const fixture = (name: string) => path.join(__dirname, "..", "fixtures", name);

test.describe("Importar clientes desde CSV", () => {
  test("Excel en español: columnas, tildes, duplicados y errores", async ({ page }) => {
    await page.goto("/pacientes/importar");
    await page.setInputFiles("input[type=file]", fixture("excel-windows.csv"));
    await expect(page.locator("text=Vista previa")).toBeVisible();
    await expect(page.locator("#map-firstName option:checked")).toHaveText("Nombre");
    await expect(page.locator("#map-lastName2 option:checked")).toHaveText("Apellido 2");
    await expect(page.locator("#map-dni option:checked")).toHaveText("NIF");
    await expect(page.locator("#map-phone option:checked")).toHaveText("Móvil");
    const preview = await page.locator("table").innerText();
    expect(preview).toContain("José");
    expect(preview).toContain("Muñoz Peñalver");
    expect(preview).toContain("Avilés");

    await page.click("button:has-text('Importar 6 clientes')");
    await expect(page.locator("text=3 clientes importados")).toBeVisible();
    await expect(page.locator("text=2 ya existían")).toBeVisible();
    await expect(page.locator("text=1 filas sin importar")).toBeVisible();

    // Repetir no duplica
    await page.click("button:has-text('Importar otro archivo')");
    await page.setInputFiles("input[type=file]", fixture("excel-windows.csv"));
    await page.click("button:has-text('Importar 6 clientes')");
    await expect(page.locator("text=0 clientes importados")).toBeVisible();
  });

  test("nombre completo en una sola columna y datos dudosos a observaciones", async ({ page }) => {
    await page.goto("/pacientes/importar");
    await page.setInputFiles("input[type=file]", fixture("nombre-completo.csv"));
    await expect(page.locator("#map-fullName option:checked")).toHaveText("Cliente");
    await page.click("button:has-text('Importar 2 clientes')");
    await expect(page.locator("text=/clientes importados/")).toBeVisible();
    await page.goto("/pacientes?q=lucia rodriguez");
    await expect(page.locator("main table")).toContainText("Rodríguez Prieto, Lucía");

    await page.goto("/pacientes?q=suarez");
    await page.click("main table a[href^='/pacientes/c']");
    const ficha = page.locator("main");
    await expect(ficha).toContainText("DNI importado no válido: 99999999X");
    await expect(ficha).toContainText("Fecha de nacimiento importada: 31/02/1970");
    await expect(ficha).toContainText("Sin consentimiento RGPD");
  });
});
