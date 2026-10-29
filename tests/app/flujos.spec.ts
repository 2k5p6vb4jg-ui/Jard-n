import { test, expect, db } from "./helpers";

test.describe("Flujos del día a día", () => {
  test("cliente nuevo → plantillas → estado y cobro → pedir material a una marca", async ({ page }) => {
    test.setTimeout(120_000);
    // Cliente
    await page.goto("/pacientes/nuevo");
    await page.fill("input[name=firstName]", "Prueba");
    await page.fill("input[name=lastName]", "Automática Flujo");
    await page.fill("input[name=phone]", "611 999 888");
    await page.click("button:has-text('Crear paciente')");
    await page.waitForURL(/\/pacientes\/c[^/]+$/);
    const patientId = page.url().split("/").pop()!;
    await expect(page.locator("h1")).toContainText("Prueba");

    // Plantillas para ese cliente
    await page.goto(`/plantillas/nueva?paciente=${patientId}`);
    const type = (await page.locator("select[name=typeId] option").nth(1).getAttribute("value"))!;
    await page.selectOption("select[name=typeId]", type);
    await page.click("button:has-text('Registrar plantillas')");
    await page.waitForURL(/\/plantillas\/c[^/]+$/);
    const insoleUrl = new URL(page.url()).pathname;
    await expect(page.locator("main")).toContainText(/PL-\d{4}-\d{4}/);

    // Cambiar estado y cobrar
    const statuses = page.locator("section:has(h2:text-is('Cambiar estado')) form button");
    const next = (await statuses.allInnerTexts()).map((t) => t.trim()).find(Boolean)!;
    await statuses.filter({ hasText: next }).first().click();
    await expect(page.locator("main")).toContainText(next);
    await page.click("button:has-text('Marcar como pagado')");
    await expect(page.locator("button:has-text('Marcar como no pagado')")).toBeVisible();

    // Apuntar material para estas plantillas y pedirlo a la marca
    const supplier = await db.supplier.findFirstOrThrow({ where: { name: "Prim" } });
    await page.goto(`/pedidos/apuntar?plantilla=${insoleUrl.split("/").pop()}&marca=${supplier.id}`);
    await page.fill("input[name=description]", "Plancha EVA prueba automática");
    await page.click("button:has-text('Apuntar')");
    await page.waitForURL((u) => u.pathname === insoleUrl);
    await expect(page.locator("main")).toContainText("Plancha EVA prueba automática");

    await page.goto("/pedidos");
    const group = page.locator("section", { has: page.locator("h2:text-is('Prim')") });
    await expect(group).toContainText("Plancha EVA prueba automática");
    await group.locator("button:has-text('Marcar como pedido')").click();
    await page.waitForURL(/\/pedidos\/c[^/]+$/);
    await expect(page.locator("main")).toContainText(/PED-\d{4}-\d{4}/);
    await page.click("button:has-text('Todo recibido')");
    await page.goto("/pedidos?vista=porentregar");
    await expect(page.locator("main")).toContainText("Plancha EVA prueba automática");
  });

  test("buscador global encuentra clientes, reparaciones y centros", async ({ page }) => {
    await page.goto("/buscar?q=naranjos");
    await expect(page.locator("h2:text-is('Centros')")).toBeVisible();
    await page.goto("/buscar?q=OT-");
    await expect(page.locator("main a[href^='/taller/c']").first()).toBeVisible();
  });
});
