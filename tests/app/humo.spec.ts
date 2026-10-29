import { test, expect, expectNoHorizontalScroll, firstLink, MOBILE } from "./helpers";

/** Todas las pantallas abren, tienen título y no se salen de la pantalla, en PC y en móvil. */
const ROUTES = [
  "/",
  "/agenda",
  "/agenda/nueva",
  "/pacientes",
  "/pacientes/nuevo",
  "/pacientes/importar",
  "/taller",
  "/taller/nueva",
  "/plantillas",
  "/plantillas/nueva",
  "/pedidos",
  "/pedidos?vista=encamino",
  "/pedidos?vista=porentregar",
  "/pedidos/apuntar",
  "/pedidos/marcas",
  "/centros",
  "/centros/nuevo",
  "/trazabilidad",
  "/trazabilidad/nuevo",
  "/estadisticas",
  "/configuracion",
  "/configuracion/opciones",
  "/configuracion/registro",
  "/configuracion/usuarios",
  "/buscar?q=mar",
];

const DETAILS: [string, string][] = [
  ["/pacientes", "/pacientes/c"],
  ["/taller", "/taller/c"],
  ["/plantillas", "/plantillas/c"],
  ["/centros", "/centros/c"],
  ["/trazabilidad", "/trazabilidad/c"],
  ["/agenda", "/agenda/c"],
];

for (const [label, device] of [["PC", {}], ["móvil", MOBILE]] as const) {
  test.describe(`Pantallas en ${label}`, () => {
    test.use(device);

    for (const route of ROUTES) {
      test(`${route} abre bien`, async ({ page }) => {
        const res = await page.goto(route);
        expect(res?.status()).toBeLessThan(400);
        await expect(page.locator("h1").first()).toBeVisible();
        await expectNoHorizontalScroll(page);
      });
    }

    for (const [list, prefix] of DETAILS) {
      test(`ficha de ${list} abre bien`, async ({ page }) => {
        const href = await firstLink(page, list, prefix);
        const res = await page.goto(href);
        expect(res?.status()).toBeLessThan(400);
        await expect(page.locator("h1").first()).toBeVisible();
        await expectNoHorizontalScroll(page);
      });
    }
  });
}

test("menú del móvil: 4 secciones y «Más» con el resto", async ({ browser }) => {
  const page = await browser.newPage(MOBILE);
  await page.goto("/");
  const bar = (await page.locator("nav.fixed a, nav.fixed button").allInnerTexts()).map((t) => t.trim());
  expect(bar).toEqual(["Panel", "Clientes", "Reparaciones", "Plantillas", "Más"]);
  await page.click("nav.fixed button:has-text('Más')");
  const more = (await page.locator("[role=dialog] a").allInnerTexts()).map((t) => t.trim());
  for (const s of ["Agenda", "Pedidos", "Centros", "Trazabilidad", "Estadísticas", "Ajustes", "Buscar"]) expect(more).toContain(s);
  await page.click("[role=dialog] a:has-text('Pedidos')");
  await page.waitForURL(/\/pedidos/);
  await expect(page.locator("[role=dialog][aria-label='Más secciones']")).toHaveCount(0);
  await page.close();
});
