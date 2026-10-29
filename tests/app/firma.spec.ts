import { test, expect, expectNoHorizontalScroll, pdfHasImage, scribble, MOBILE, TABLET } from "./helpers";

test.describe("Firma en la tablet", () => {
  test.use(TABLET);

  test("resguardo: obliga a firmar y la firma sale en el PDF", async ({ page, request }) => {
    await page.goto("/taller");
    const wo = (await page.locator("main a[href^='/taller/c']").first().getAttribute("href"))!;
    const id = wo.split("/").pop();
    expect(pdfHasImage(await (await request.get(`/api/taller/${id}/resguardo`)).body())).toBe(false);
    await page.goto(wo);
    await page.click("a:has-text('Firmar resguardo')");
    await page.waitForURL(/tipo=resguardo/);
    await expectNoHorizontalScroll(page);
    await page.click("button:has-text('Guardar firma')");
    await expect(page.locator("text=Falta la firma").first()).toBeVisible();
    await scribble(page);
    await page.click("button:has-text('Guardar firma')");
    await page.waitForURL((u) => u.pathname === wo);
    await expect(page.locator("a:has-text('Resguardo firmado')")).toBeVisible();
    expect(pdfHasImage(await (await request.get(`/api/taller/${id}/resguardo`)).body())).toBe(true);
  });

  test("presupuesto: firmar lo marca como aceptado y sale en el PDF", async ({ page, request }) => {
    await page.goto("/taller");
    let found: string | null = null;
    for (const h of await page.locator("main a[href^='/taller/c']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!))) {
      await page.goto(h);
      if (await page.locator("a:has-text('Firmar en la tablet')").count()) {
        found = h;
        break;
      }
    }
    expect(found, "hay algún presupuesto sin firmar").toBeTruthy();
    const signHref = (await page.locator("a:has-text('Firmar en la tablet')").first().getAttribute("href"))!;
    const qId = new URLSearchParams(signHref.split("?")[1]).get("id");
    await page.click("a:has-text('Firmar en la tablet')");
    await expect(page.locator("input[name=accept]")).toBeChecked();
    await scribble(page);
    await page.click("button:has-text('Guardar firma')");
    await page.waitForURL((u) => u.pathname === found);
    await expect(page.locator("text=/Firmado por .* el/").first()).toBeVisible();
    await expect(page.locator("li:has-text('Aceptado')").first()).toBeVisible();
    expect(pdfHasImage(await (await request.get(`/api/presupuestos/${qId}`)).body())).toBe(true);
  });

  test("consentimiento RGPD: texto completo, PDF firmado y exportación", async ({ page, request }) => {
    await page.goto("/pacientes?q=Lucía");
    const pat = (await page.locator("main table a[href^='/pacientes/c']").first().getAttribute("href"))!;
    await page.goto(pat);
    await page.click("a:has-text('Firmar consentimiento en la tablet')");
    await expect(page.locator("text=Responsable del tratamiento")).toBeVisible();
    await page.check("input[name=marketingOptIn]");
    await scribble(page);
    await page.click("button:has-text('Guardar firma')");
    await page.waitForURL((u) => u.pathname === pat);
    await expect(page.locator("text=Consentimiento firmado el")).toBeVisible();
    const api = pat.replace("/pacientes/", "/api/pacientes/");
    const pdf = await request.get(`${api}/consentimiento`);
    expect(pdf.status()).toBe(200);
    expect(pdfHasImage(await pdf.body())).toBe(true);
    expect((await (await request.get(`${api}/exportar`)).body()).toString("latin1")).toContain("firmas/");
  });

  test("propuesta a un centro", async ({ page, request }) => {
    await page.goto("/centros");
    const center = (await page.locator("main a[href^='/centros/c']").first().getAttribute("href"))!;
    await page.goto(center);
    const proposals = await page.locator("a[href*='/propuestas/c']").evaluateAll((as) => as.map((a) => a.getAttribute("href")!));
    let signed = false;
    for (const h of proposals) {
      await page.goto(h);
      if (!(await page.locator("a:text-is('Firmar')").count())) continue;
      await page.click("a:text-is('Firmar')");
      await page.fill("input[name=signerName]", "Dirección de la residencia");
      await scribble(page);
      await page.click("button:has-text('Guardar firma')");
      await page.waitForURL((u) => u.pathname === h);
      await expect(page.locator("a:has-text('Firmada')")).toBeVisible();
      expect(pdfHasImage(await (await request.get(`/api/propuestas/${h.split("/").pop()}`)).body())).toBe(true);
      signed = true;
      break;
    }
    expect(signed, "había una propuesta para firmar").toBe(true);
  });

  test.describe("en el móvil", () => {
    test.use(MOBILE);
    test("la pantalla de firma cabe", async ({ page }) => {
      await page.goto("/pacientes");
      const pat = (await page.locator("main a[href^='/pacientes/c']").first().getAttribute("href"))!;
      await page.goto(`/firmar?tipo=consentimiento&id=${pat.split("/").pop()}`);
      await expect(page.locator("canvas[aria-label='Recuadro para firmar']")).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  });
});
