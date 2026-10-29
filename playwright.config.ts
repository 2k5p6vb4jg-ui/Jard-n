import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas automáticas: `npm test`.
 * - tests/unidad: funciones sueltas (CSV, WhatsApp, PIN, permisos, importes), sin navegador.
 * - tests/app: la aplicación de verdad en el navegador (PC, tablet y móvil) con datos de ejemplo
 *   propios en .test/ (ver scripts/test-server.mjs). Informe en .test/informe/index.html.
 */
const PORT = process.env.TEST_PORT ?? "3100";
// `npm run test:unidad` no necesita arrancar la app
const onlyUnit = process.argv.includes("--project=unidad");

export default defineConfig({
  // Las pruebas de la app cambian datos (usuarios, citas…): de una en una y en orden
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: ".test/informe" }]],
  outputDir: ".test/resultados",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "es-ES",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "unidad", testDir: "tests/unidad" },
    { name: "app", testDir: "tests/app", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: onlyUnit
    ? undefined
    : {
        command: "node scripts/test-server.mjs",
        url: `http://127.0.0.1:${PORT}/api/icono?t=64`,
        timeout: 600_000,
        reuseExistingServer: !!process.env.PRUEBAS_REUTILIZAR,
        stdout: "pipe",
      },
});
