// Deja la app vacía para empezar a usarla con datos reales (tras probarla con «npm run demo»).
// No borra nada: aparta la base de datos y los adjuntos actuales a la carpeta de copias.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { execSync } from "node:child_process";

const root = process.cwd();
const env = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
const fromEnv = (k, def) => process.env[k] ?? env.match(new RegExp(`^${k}="?([^"\\n]+)"?`, "m"))?.[1] ?? def;

const url = fromEnv("DATABASE_URL", "file:./dev.db").replace(/^file:/, "");
const dbFile = path.isAbsolute(url) ? url : path.resolve(root, "prisma", url);
const uploads = path.resolve(root, fromEnv("UPLOADS_DIR", "./uploads"));
const backups = path.resolve(root, fromEnv("BACKUP_DIR", "./backups"));

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log("\n  Se dejará la aplicación VACÍA (sin pacientes, órdenes ni documentos).");
console.log(`  Los datos actuales se moverán a: ${backups}\n`);
const answer = (await rl.question("  Escriba VACIAR para continuar: ")).trim().toUpperCase();
rl.close();
if (answer !== "VACIAR") {
  console.log("  Cancelado. No se ha cambiado nada.");
  process.exit(0);
}

const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
const dest = path.join(backups, `antes-de-vaciar-${stamp}`);
fs.mkdirSync(dest, { recursive: true });
for (const f of [dbFile, `${dbFile}-journal`, `${dbFile}-wal`, `${dbFile}-shm`]) {
  if (fs.existsSync(f)) fs.renameSync(f, path.join(dest, path.basename(f)));
}
if (fs.existsSync(uploads)) {
  fs.mkdirSync(path.join(dest, "uploads"), { recursive: true });
  for (const name of fs.readdirSync(uploads)) {
    if (name !== ".gitkeep") fs.renameSync(path.join(uploads, name), path.join(dest, "uploads", name));
  }
}
execSync("npx prisma migrate deploy", { stdio: "inherit" });
console.log(`\n  Listo: la aplicación está vacía. Los datos anteriores están en ${dest}`);
console.log("  Arranque con «npm start» y configure Ajustes (datos de la tienda, técnicos, PIN).\n");
