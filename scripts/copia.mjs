// Copia de seguridad completa sin necesidad de tener la app abierta (la usa ACTUALIZAR.bat).
// Mismo formato que las copias de Ajustes (manifest.json + database.db + uploads/), así que se
// puede restaurar desde Ajustes → Copias de seguridad.
//
//   node scripts/copia.mjs [prefijo]        → backups/jardon-<prefijo>-AAAA-MM-DD-HH-MM.zip
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { ZipArchive } from "archiver";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  (fs.existsSync(path.join(ROOT, ".env")) ? fs.readFileSync(path.join(ROOT, ".env"), "utf8") : "")
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
const get = (k, d) => process.env[k] ?? env[k] ?? d;
const dbUrl = get("DATABASE_URL", "file:./dev.db").replace(/^file:/, "").split("?")[0];
const DB = path.isAbsolute(dbUrl) ? dbUrl : path.resolve(ROOT, "prisma", dbUrl);
const UPLOADS = path.resolve(ROOT, get("UPLOADS_DIR", "./uploads"));
const BACKUPS = path.resolve(ROOT, get("BACKUP_DIR", "./backups"));
const prefix = (process.argv[2] ?? "manual").replace(/[^\w-]/g, "");

if (!fs.existsSync(DB)) {
  console.log("  No hay base de datos todavía: no hace falta copia.");
  process.exit(0);
}

async function* walk(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && e.name !== ".gitkeep") yield full;
  }
}

await fsp.mkdir(BACKUPS, { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
const file = path.join(BACKUPS, `jardon-${prefix}-${stamp}.zip`);
const snapshot = path.join(BACKUPS, `.snapshot-${Date.now()}.db`);

const db = new DatabaseSync(DB);
db.exec(`VACUUM INTO '${snapshot.replace(/'/g, "''")}'`);
const count = (t) => {
  try {
    return db.prepare(`SELECT COUNT(*) AS n FROM "${t}"`).get().n;
  } catch {
    return 0;
  }
};
const manifest = {
  app: "jardon-ortopedia",
  format: 1,
  createdAt: new Date().toISOString(),
  migrations: db.prepare("SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name").all().map((r) => r.migration_name),
  counts: { patients: count("Patient"), documents: count("ClinicalDocument"), workOrders: count("WorkOrder"), products: count("TrackedProduct") },
};
db.close();

try {
  const archive = new ZipArchive({ zlib: { level: 1 } });
  const done = pipeline(archive, fs.createWriteStream(`${file}.parcial`));
  archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
  archive.file(snapshot, { name: "database.db" });
  for await (const f of walk(UPLOADS)) archive.file(f, { name: path.posix.join("uploads", path.relative(UPLOADS, f).split(path.sep).join("/")), store: true });
  await archive.finalize();
  await done;
  await fsp.rename(`${file}.parcial`, file);
} finally {
  await fsp.rm(snapshot, { force: true });
}
console.log(`  [ok] Copia guardada: ${path.relative(ROOT, file)} (${manifest.counts.patients} clientes, ${manifest.counts.workOrders} reparaciones)`);
