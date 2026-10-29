import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { test as base, expect, type Page } from "@playwright/test";

/** Acceso directo a la base de datos de pruebas (.test/test.db), nunca a la real */
export const db = new PrismaClient({ datasourceUrl: `file:${path.resolve(".test/test.db").replaceAll("\\", "/")}` });

/** Cualquier error de JavaScript en la página hace fallar la prueba */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await use(errors);
      expect(errors, "errores de JavaScript en la página").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
export const TABLET = { viewport: { width: 1180, height: 820 }, hasTouch: true };

const pad = (n: number) => String(n).padStart(2, "0");
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Nada se sale por la derecha (sin desplazamiento horizontal) */
export async function expectNoHorizontalScroll(page: Page) {
  const width = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
}

/** Dibuja una firma en el recuadro de firma */
export async function scribble(page: Page) {
  const c = page.locator("canvas[aria-label='Recuadro para firmar']");
  await c.scrollIntoViewIfNeeded();
  const b = (await c.boundingBox())!;
  await page.mouse.move(b.x + 40, b.y + b.height * 0.6);
  await page.mouse.down();
  for (let i = 1; i <= 30; i++) await page.mouse.move(b.x + 40 + i * 12, b.y + b.height * (0.6 + 0.2 * Math.sin(i / 3)));
  await page.mouse.up();
}

/** Entra con un PIN en la pantalla de acceso */
export async function pinLogin(page: Page, pin: string) {
  await page.goto("/");
  await page.waitForURL(/\/acceso/);
  for (const d of pin) await page.click(`button:text-is('${d}')`);
  await page.click("button[aria-label=Entrar]");
  await page.waitForURL((u) => !u.pathname.startsWith("/acceso"));
}

/** Deja la app sin usuarios (abierta), esperando a que el servidor lo note (caché de 3 s) */
export async function removeUsers() {
  await db.user.deleteMany();
  await new Promise((r) => setTimeout(r, 3500));
}

export const pdfHasImage = (body: Buffer) => body.toString("latin1").includes("/Subtype /Image");

/** Primer enlace de un listado (p. ej. la primera reparación) */
export async function firstLink(page: Page, listUrl: string, prefix: string) {
  await page.goto(listUrl);
  const href = await page.locator(`main a[href^='${prefix}']`).first().getAttribute("href");
  expect(href, `hay algún enlace ${prefix} en ${listUrl}`).toBeTruthy();
  return href!;
}
