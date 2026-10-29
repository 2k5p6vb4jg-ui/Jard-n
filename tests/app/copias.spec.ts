import fs from "node:fs";
import path from "node:path";
import { test, expect } from "./helpers";
import pkg from "../../package.json";

const MIRROR = path.resolve(".test/espejo");

test.describe("Copias de seguridad", () => {
  test("copia manual, comprobación y segunda copia en otra carpeta", async ({ page }) => {
    await page.goto("/configuracion");
    await expect(page.locator("main")).toContainText(`Versión instalada ${pkg.version}`);
    await page.click("button:has-text('Guardar copia ahora')");
    await expect.poll(() => fs.readdirSync(path.resolve(".test/backups")).filter((f) => f.endsWith(".zip")).length).toBeGreaterThan(0);
    await page.click("button:has-text('Comprobar la última copia')");
    await expect(page.locator("[role=status]:has-text('Copia correcta')")).toBeVisible();

    await page.fill("#backupMirrorDir", "relativa/no");
    await page.click("form:has(#backupMirrorDir) button:has-text('Guardar')");
    await expect(page.locator("text=Escriba la ruta completa")).toBeVisible();

    await page.fill("#backupMirrorDir", MIRROR);
    await page.click("form:has(#backupMirrorDir) button:has-text('Guardar')");
    await expect.poll(() => fs.existsSync(MIRROR) && fs.readdirSync(MIRROR).some((f) => f.endsWith(".zip"))).toBe(true);
    await page.reload();
    await expect(page.locator("main")).toContainText("Última segunda copia");
  });
});
