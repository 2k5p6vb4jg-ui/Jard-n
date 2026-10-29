/**
 * Arranca la app para las pruebas automáticas (npm test) con sus propios datos de ejemplo:
 * base de datos, adjuntos y copias en la carpeta .test/ y compilación en .next-test/.
 * Nunca toca la base de datos, los documentos ni las copias reales de la tienda.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEST = path.join(ROOT, ".test");
const PORT = process.env.TEST_PORT ?? "3100";
const win = process.platform === "win32";

export const testEnv = {
  ...process.env,
  DATABASE_URL: `file:${path.join(TEST, "test.db").replaceAll("\\", "/")}`,
  UPLOADS_DIR: path.join(TEST, "uploads"),
  BACKUP_DIR: path.join(TEST, "backups"),
  NEXT_DIST_DIR: ".next-test",
  NEXT_TELEMETRY_DISABLED: "1",
};

function run(cmd, args) {
  console.log(`[pruebas] ${cmd} ${args.join(" ")}`);
  const r = spawnSync(win ? `${cmd}.cmd` : cmd, args, { cwd: ROOT, env: testEnv, stdio: "inherit", shell: win });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// Datos de ejemplo nuevos en cada ejecución (se conservan los informes de pruebas anteriores)
for (const dir of ["test.db", "test.db-journal", "uploads", "backups", "espejo"]) fs.rmSync(path.join(TEST, dir), { recursive: true, force: true });
fs.mkdirSync(path.join(TEST, "uploads"), { recursive: true });
fs.mkdirSync(path.join(TEST, "backups"), { recursive: true });

run("npx", ["prisma", "migrate", "deploy"]);
run("npx", ["prisma", "db", "seed"]);
if (!process.env.PRUEBAS_SIN_COMPILAR) run("npx", ["next", "build"]);

const server = spawn(win ? "npx.cmd" : "npx", ["next", "start", "-H", "127.0.0.1", "-p", PORT], { cwd: ROOT, env: testEnv, stdio: "inherit", shell: win });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => server.kill(sig));
server.on("exit", (code) => process.exit(code ?? 0));
