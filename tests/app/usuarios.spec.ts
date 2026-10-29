import { test, expect, db, pinLogin, removeUsers, MOBILE } from "./helpers";
import type { Page } from "@playwright/test";

const navLabels = async (p: Page) => (await p.locator("aside nav a").allInnerTexts()).map((t) => t.trim());

async function addUser(p: Page, name: string, role: string, pin: string) {
  const f = p.locator("section:has(h2:text-is('Nuevo usuario')) form");
  await f.locator("input[name=name]").fill(name);
  await f.locator("select[name=role]").selectOption({ label: role });
  await f.locator("input[name=pin]").fill(pin);
  await f.locator("input[name=confirmPin]").fill(pin);
  await f.locator("button[type=submit]").click();
}

test.describe("Usuarios con PIN propio y permisos", () => {
  // Pase lo que pase, la app vuelve a quedar sin PIN para el resto de pruebas
  test.afterAll(removeUsers);

  test("alta, perfiles, permisos, cambio de PIN, desactivar y quitar el PIN", async ({ page: admin, browser }) => {
    test.setTimeout(180_000);
    await removeUsers();
    admin.on("dialog", (d) => d.accept());

    // Primer usuario: activa el PIN y deja este equipo dentro
    await admin.goto("/configuracion/usuarios");
    await admin.fill("#first-name", "Ana");
    await admin.fill("#first-pin", "2468");
    await admin.fill("#first-confirmPin", "2468");
    await admin.click("button:has-text('Crear usuario y activar el PIN')");
    await expect(admin.locator("aside :text('Ana')")).toBeVisible();

    await addUser(admin, "Marta", "Mostrador", "3579");
    await expect(admin.locator("li details summary:has-text('Marta')")).toBeVisible();
    await addUser(admin, "Pepe", "Taller", "1357");
    await expect(admin.locator("li details summary:has-text('Pepe')")).toBeVisible();
    await addUser(admin, "Repetido", "Taller", "2468");
    await expect(admin.locator("text=Ese PIN no está disponible")).toBeVisible();
    await admin.reload();
    await addUser(admin, "Obvio", "Taller", "1234");
    await expect(admin.locator("text=menos previsible")).toBeVisible();
    await admin.reload();
    await expect(admin.locator("li details summary")).toHaveCount(3);

    // Siempre queda alguien de Administración
    await admin.click("summary:has-text('Ana')");
    const anaForm = admin.locator("details[open] form").first();
    await anaForm.locator("select[name=role]").selectOption({ label: "Taller" });
    await anaForm.locator("button:has-text('Guardar')").click();
    await expect(admin.locator("text=al menos una persona de Administración")).toBeVisible();

    // Taller
    const taller = await (await browser.newContext()).newPage();
    await taller.goto("/");
    await taller.waitForURL(/\/acceso/);
    for (const d of "9999") await taller.click(`button:text-is('${d}')`);
    await taller.click("button[aria-label=Entrar]");
    await expect(taller.locator("text=PIN incorrecto")).toBeVisible();
    await pinLogin(taller, "1357");
    await expect(taller.locator("h1")).toContainText("Pepe");
    const tl = await navLabels(taller);
    expect(tl).toContain("Reparaciones");
    for (const hidden of ["Clientes", "Centros", "Estadísticas", "Ajustes"]) expect(tl).not.toContain(hidden);
    await expect(taller.locator("text=Avisos de renovación")).toHaveCount(0);
    await taller.goto("/pacientes");
    await expect(taller.locator("text=Esta sección no está disponible")).toBeVisible();
    expect((await taller.request.get("/api/pacientes/x/exportar")).status()).toBe(403);
    await taller.goto("/buscar?q=Javier");
    await expect(taller.locator("h2:text-is('Clientes')")).toHaveCount(0);

    const tm = await (await browser.newContext({ ...MOBILE, storageState: await taller.context().storageState() })).newPage();
    await tm.goto("/");
    expect((await tm.locator("nav.fixed a, nav.fixed button").allInnerTexts()).map((t) => t.trim())).toEqual(["Panel", "Agenda", "Reparaciones", "Plantillas", "Más"]);
    await tm.context().close();

    // Cada uno cambia su PIN y sigue dentro
    await taller.goto("/mi-pin");
    await taller.fill("#currentPin", "1357");
    await taller.fill("#pin", "8642");
    await taller.fill("#confirmPin", "8642");
    await taller.click("button:has-text('Cambiar mi PIN')");
    await expect(taller.locator("text=PIN cambiado")).toBeVisible();
    await taller.goto("/taller");
    expect(new URL(taller.url()).pathname).toBe("/taller");

    // Mostrador
    const mostrador = await (await browser.newContext()).newPage();
    await pinLogin(mostrador, "3579");
    const ml = await navLabels(mostrador);
    expect(ml).toEqual(expect.arrayContaining(["Clientes", "Centros"]));
    expect(ml).not.toContain("Ajustes");
    await mostrador.goto("/configuracion/usuarios");
    await expect(mostrador.locator("text=Esta sección no está disponible")).toBeVisible();

    // El registro guarda quién hizo cada cosa
    await admin.goto("/configuracion/registro");
    await expect(admin.locator("li:has-text('Acceso correcto'):has-text('Pepe')").first()).toBeVisible();
    await expect(admin.locator("li:has-text('Cambió su PIN'):has-text('Pepe')").first()).toBeVisible();

    // Desactivar a Pepe le cierra la sesión al momento
    await admin.goto("/configuracion/usuarios");
    await admin.click("summary:has-text('Pepe')");
    const pf = admin.locator("details[open] form").first();
    await pf.locator("input[name=active]").uncheck();
    await pf.locator("button:has-text('Guardar')").click();
    await expect.poll(async () => (await db.user.findFirst({ where: { name: "Pepe" } }))?.active).toBe(false);
    await taller.goto("/taller");
    await expect(taller).toHaveURL(/\/acceso/);

    await mostrador.click("aside button[aria-label=Salir]");
    await expect(mostrador).toHaveURL(/\/acceso/);

    // Quitar el PIN: la app vuelve a estar abierta
    await admin.goto("/configuracion/usuarios");
    await admin.click("summary:has-text('Quitar el acceso con PIN')");
    await admin.fill("input[name=currentPin]", "2468");
    await admin.click("button:has-text('Quitar el PIN')");
    await expect(admin.locator("text=Activar el acceso con PIN")).toBeVisible();
    await mostrador.goto("/pacientes");
    expect(new URL(mostrador.url()).pathname).toBe("/pacientes");
  });
});
