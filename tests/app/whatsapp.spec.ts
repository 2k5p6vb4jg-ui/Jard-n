import { test, expect } from "./helpers";

test.describe("Avisos por WhatsApp", () => {
  test("reparación lista", async ({ page }) => {
    await page.goto("/taller?estado=READY");
    await page.click("main table a[href^='/taller/c']");
    const href = await page.locator("a:has-text('Avisar: está lista')").getAttribute("href");
    expect(href).toMatch(/^https:\/\/wa\.me\/34\d{9}\?text=/);
    expect(decodeURIComponent(href!)).toContain("ya está terminada");
  });

  test("plantillas listas para recoger", async ({ page }) => {
    await page.goto("/plantillas");
    await page.click("main table tr:has-text('Lista para recoger') a[href^='/plantillas/c']");
    const href = await page.locator("a:has-text('Avisar: están listas')").getAttribute("href");
    expect(decodeURIComponent(href!)).toContain("sus plantillas ya están listas");
  });

  test("pedido recibido y renovaciones solo para quien aceptó avisos", async ({ page }) => {
    await page.goto("/pedidos?vista=porentregar");
    await expect(page.locator("a:has-text('Avisar: ha llegado')").first()).toBeVisible();
    await page.goto("/");
    const renewals = page.locator("section:has(h2:text-is('Avisos de renovación'))");
    await expect(renewals.locator("a[href^='https://wa.me/']").first()).toBeVisible();
    await expect(renewals.locator("li:has-text('Antonio') a[href^='https://wa.me/']")).toHaveCount(0);
  });
});
