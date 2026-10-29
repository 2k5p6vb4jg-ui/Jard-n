import { test, expect, expectNoHorizontalScroll, ymd, MOBILE } from "./helpers";

test.describe("Agenda", () => {
  test("el Panel y la semana muestran las citas de hoy con recordatorio por WhatsApp", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("section:has(h2:text-is('Citas de hoy'))");
    await expect(card.locator("a[href^='/agenda/c']")).toHaveCount(3);
    await page.goto("/agenda");
    const today = page.locator(`section[aria-label='${ymd(new Date())}']`);
    await expect(today.locator("a[href^='/agenda/c']")).toHaveCount(3);
    const wa = await today.locator("a[href*='wa.me']").first().getAttribute("href");
    expect(decodeURIComponent(wa!)).toContain("Le recordamos su cita");
  });

  test("dar, cambiar de estado, editar y borrar una cita", async ({ page }) => {
    const day = ymd(new Date(Date.now() + 86_400_000));
    await page.goto(`/agenda/nueva?fecha=${day}`);
    await page.selectOption("select[name=typeId]", { label: "Prueba" });
    await page.fill("input[name=time]", "13:15");
    const patientId = (await page.locator("select[name=patientId] option").nth(1).getAttribute("value"))!;
    await page.selectOption("select[name=patientId]", patientId);
    await page.click("button:has-text('Dar cita')");
    await page.waitForURL(/\/agenda\?semana=/);
    const col = page.locator(`section[aria-label='${day}']`);
    await expect(col.locator(":text('13:15')")).toHaveCount(1);

    await col.locator("a[aria-label^='Cita: Prueba']").click();
    await page.waitForURL(/\/agenda\/c/);
    const url = page.url();
    await page.click("button:has-text('No vino')");
    await expect(page.locator("button:has-text('Volver a pendiente')")).toBeVisible();
    await page.click("button:has-text('Volver a pendiente')");
    await expect(page.locator("button:has-text('Hecha')")).toBeVisible();
    await page.fill("input[name=time]", "13:45");
    await page.click("button:has-text('Guardar cambios')");
    await expect(page.locator("text=13:45").first()).toBeVisible();

    await page.goto(`/pacientes/${patientId}`);
    await expect(page.locator("section:has(h2:text-is('Próximas citas')) a[href^='/agenda/c']")).not.toHaveCount(0);

    page.on("dialog", (d) => d.accept());
    await page.goto(url);
    await page.click("button:has-text('Borrar cita')");
    await page.waitForURL(/\/agenda\?semana=/);
    await expect(page.locator(`section[aria-label='${day}'] :text('13:45')`)).toHaveCount(0);
  });

  test("desde unas plantillas: cita enlazada con el tipo «Prueba» propuesto", async ({ page }) => {
    await page.goto("/plantillas");
    const pl = (await page.locator("main a[href^='/plantillas/c']").first().getAttribute("href"))!;
    await page.goto(pl);
    const card = page.locator("section:has(h2:text-is('Próximas citas'))");
    const before = await card.locator("a[href^='/agenda/c']").count();
    await card.locator("a:has-text('Dar cita')").click();
    await page.waitForURL(/plantilla=/);
    await expect(page.locator("text=/Para las plantillas PL-/")).toBeVisible();
    await expect(page.locator("select[name=typeId] option:checked")).toHaveText("Prueba");
    await page.fill("input[name=date]", ymd(new Date(Date.now() + 2 * 86_400_000)));
    await page.click("button:has-text('Dar cita')");
    await page.waitForURL((u) => u.pathname === pl);
    await expect(page.locator("section:has(h2:text-is('Próximas citas')) a[href^='/agenda/c']")).toHaveCount(before + 1);
  });

  test.describe("en el móvil", () => {
    test.use(MOBILE);
    test("la semana empieza por hoy y no se sale de la pantalla", async ({ page }) => {
      await page.goto("/agenda");
      await expectNoHorizontalScroll(page);
      const first = page.locator("section[aria-label]").filter({ visible: true });
      const order = await first.evaluateAll((els) => els.map((e) => ({ label: e.getAttribute("aria-label"), top: e.getBoundingClientRect().top })).sort((a, b) => a.top - b.top)[0].label);
      expect(order).toBe(ymd(new Date()));
    });
  });
});
