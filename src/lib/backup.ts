import "server-only";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ZipArchive, type ZipEntryData } from "archiver";
import yauzl from "yauzl";
import { prisma } from "./prisma";
import { invalidateAuthCache } from "./auth";
import { UPLOADS_ROOT } from "./storage";

/**
 * Copia de seguridad completa en un único .zip:
 *   manifest.json   versión del formato, fecha, migraciones aplicadas y recuentos
 *   database.db     instantánea consistente de SQLite (VACUUM INTO)
 *   uploads/...     estudios de pisada, fotos, recetas y logo
 */
const APP_ID = "jardon-ortopedia";
const FORMAT = 1;
const ROOT = /*turbopackIgnore: true*/ process.cwd();

export const BACKUP_DIR = path.resolve(/*turbopackIgnore: true*/ ROOT, process.env.BACKUP_DIR ?? "./backups");
const WORK_DIR = path.join(ROOT, ".backup-tmp"); // mismo disco que la app: los renombrados son atómicos

export interface BackupManifest {
  app: string;
  format: number;
  createdAt: string;
  migrations: string[];
  counts: Record<string, number>;
}

/** Ruta real del archivo SQLite a partir de DATABASE_URL (relativa a prisma/). */
export function databaseFile(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const p = url.replace(/^file:/, "").split("?")[0];
  return path.isAbsolute(p) ? p : path.resolve(ROOT, "prisma", p);
}

async function appliedMigrations(): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ migration_name: string }[]>(
    `SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`,
  );
  return rows.map((r) => r.migration_name);
}

/** Migraciones que conoce esta versión de la app (carpeta prisma/migrations). */
async function knownMigrations(): Promise<string[]> {
  const dir = path.join(ROOT, "prisma", "migrations");
  const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(full);
    else if (e.isFile() && e.name !== ".gitkeep") yield full;
  }
}

const stamp = () => new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");

/** Escribe el .zip en `output`. Devuelve el manifiesto. */
export async function writeBackupZip(output: Writable): Promise<BackupManifest> {
  await fsp.mkdir(WORK_DIR, { recursive: true });
  const snapshot = path.join(WORK_DIR, `snapshot-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  try {
    await prisma.$executeRawUnsafe(`VACUUM INTO '${snapshot.replace(/'/g, "''")}'`);
    const [migrations, patients, documents, workOrders, products] = await Promise.all([
      appliedMigrations(),
      prisma.patient.count(),
      prisma.clinicalDocument.count(),
      prisma.workOrder.count(),
      prisma.trackedProduct.count(),
    ]);
    const manifest: BackupManifest = {
      app: APP_ID,
      format: FORMAT,
      createdAt: new Date().toISOString(),
      migrations,
      counts: { patients, documents, workOrders, products },
    };

    // Los adjuntos ya vienen comprimidos (JPG, PDF): se guardan sin recomprimir
    const archive = new ZipArchive({ zlib: { level: 1 } });
    const done = pipeline(archive, output);
    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" });
    archive.file(snapshot, { name: "database.db" });
    for await (const file of walk(UPLOADS_ROOT)) {
      archive.file(file, { name: path.posix.join("uploads", path.relative(UPLOADS_ROOT, file).split(path.sep).join("/")), store: true } as ZipEntryData);
    }
    await archive.finalize();
    await done;
    return manifest;
  } finally {
    await fsp.rm(snapshot, { force: true });
  }
}

/** Crea una copia en la carpeta de copias (BACKUP_DIR). */
export async function createBackupFile(prefix: "auto" | "manual" | "antes-de-restaurar"): Promise<{ file: string; size: number }> {
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  const file = path.join(/*turbopackIgnore: true*/ BACKUP_DIR, `jardon-${prefix}-${stamp()}.zip`);
  const tmp = `${file}.parcial`;
  await writeBackupZip(fs.createWriteStream(tmp));
  await fsp.rename(tmp, file);
  const { size } = await fsp.stat(file);
  return { file, size };
}

export interface StoredBackup {
  name: string;
  size: number;
  createdAt: Date;
  kind: "auto" | "manual" | "antes-de-restaurar" | "otra";
}

export async function listBackups(): Promise<StoredBackup[]> {
  const entries = await fsp.readdir(BACKUP_DIR).catch(() => [] as string[]);
  const out: StoredBackup[] = [];
  for (const name of entries.filter((n) => n.endsWith(".zip"))) {
    const st = await fsp.stat(path.join(/*turbopackIgnore: true*/ BACKUP_DIR, name));
    const kind = (["auto", "manual", "antes-de-restaurar"] as const).find((k) => name.startsWith(`jardon-${k}-`)) ?? "otra";
    out.push({ name, size: st.size, createdAt: st.mtime, kind });
  }
  return out.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/** Nombre de archivo seguro dentro de BACKUP_DIR (evita ../). */
export function backupPath(name: string): string | null {
  if (!/^[\w.-]+\.zip$/.test(name)) return null;
  const full = path.join(/*turbopackIgnore: true*/ BACKUP_DIR, name);
  return path.dirname(full) === BACKUP_DIR ? full : null;
}

// ── Copia automática diaria ─────────────────────────────────────────────────

let autoRunning = false;

/** Si toca, crea la copia diaria en segundo plano y borra las automáticas más antiguas. */
export function ensureDailyBackup() {
  if (autoRunning) return;
  autoRunning = true;
  (async () => {
    const s = await prisma.settings.findUnique({ where: { id: 1 }, select: { autoBackup: true, autoBackupKeep: true, lastAutoBackupAt: true } });
    if (!s?.autoBackup) return;
    if (s.lastAutoBackupAt && Date.now() - s.lastAutoBackupAt.getTime() < 23 * 3_600_000) return;
    const { file, size } = await createBackupFile("auto");
    await prisma.settings.update({ where: { id: 1 }, data: { lastAutoBackupAt: new Date() } });
    await prisma.backupRecord.create({ data: { fileName: path.basename(file), sizeBytes: size } });
    const autos = (await listBackups()).filter((b) => b.kind === "auto");
    for (const old of autos.slice(Math.max(1, s.autoBackupKeep))) await fsp.rm(path.join(/*turbopackIgnore: true*/ BACKUP_DIR, old.name), { force: true });
  })()
    .catch((e) => console.error("[copia automática]", e))
    .finally(() => {
      autoRunning = false;
    });
}

// ── Restauración ────────────────────────────────────────────────────────────

export class RestoreError extends Error {}

function openZip(file: string): Promise<yauzl.ZipFile> {
  return new Promise((resolve, reject) => yauzl.open(file, { lazyEntries: true, autoClose: false }, (err, zip) => (err || !zip ? reject(err) : resolve(zip))));
}

/** Extrae solo manifest.json, database.db y uploads/** a `dest`, impidiendo rutas fuera de él. */
async function extract(zipFile: string, dest: string): Promise<void> {
  const zip = await openZip(zipFile);
  try {
    await new Promise<void>((resolve, reject) => {
      zip.on("error", reject);
      zip.on("end", resolve);
      zip.on("entry", (entry: yauzl.Entry) => {
        const name = entry.fileName;
        const allowed = name === "manifest.json" || name === "database.db" || (name.startsWith("uploads/") && !name.endsWith("/"));
        const target = path.resolve(dest, name);
        if (!allowed || !target.startsWith(dest + path.sep)) return zip.readEntry();
        zip.openReadStream(entry, async (err, stream) => {
          if (err || !stream) return reject(err);
          try {
            await fsp.mkdir(path.dirname(target), { recursive: true });
            await pipeline(stream, fs.createWriteStream(target));
            zip.readEntry();
          } catch (e) {
            reject(e);
          }
        });
      });
      zip.readEntry();
    });
  } finally {
    zip.close();
  }
}

/**
 * Copia todas las tablas de `sourceFile` dentro de `targetFile` en una única transacción.
 *
 * No se sustituye el archivo: la app mantiene conexiones abiertas a él y seguirían usando el
 * archivo antiguo. Escribiendo a través de SQLite, todas las conexiones ven los datos nuevos,
 * y si algo falla se deshace todo (ROLLBACK) sin dejar la base de datos a medias.
 */
async function copyDatabaseInto(targetFile: string, sourceFile: string) {
  // Carga diferida: node:sqlite muestra un aviso de "experimental" al importarse
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(targetFile);
  const q = (id: string) => `"${id.replace(/"/g, '""')}"`;
  try {
    db.exec("PRAGMA busy_timeout = 15000; PRAGMA foreign_keys = OFF;");
    db.exec(`ATTACH DATABASE '${sourceFile.replace(/'/g, "''")}' AS r`);
    const tablesOf = (schema: string) =>
      (db.prepare(`SELECT name FROM ${schema}.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name <> '_prisma_migrations'`).all() as { name: string }[]).map((t) => t.name);
    const columnsOf = (schema: string, table: string) =>
      (db.prepare(`PRAGMA ${schema}.table_info(${q(table)})`).all() as { name: string }[]).map((c) => c.name);

    const mainTables = tablesOf("main");
    const sourceTables = new Set(tablesOf("r"));
    db.exec("BEGIN IMMEDIATE");
    try {
      for (const t of mainTables) {
        db.exec(`DELETE FROM main.${q(t)}`);
        if (!sourceTables.has(t)) continue;
        const sourceCols = new Set(columnsOf("r", t));
        const cols = columnsOf("main", t).filter((c) => sourceCols.has(c)).map(q).join(", ");
        db.exec(`INSERT INTO main.${q(t)} (${cols}) SELECT ${cols} FROM r.${q(t)}`);
      }
      const broken = db.prepare("PRAGMA main.foreign_key_check").all();
      if (broken.length) throw new RestoreError("La copia tiene datos inconsistentes (relaciones rotas). No se ha restaurado nada.");
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  } finally {
    try {
      db.exec("DETACH DATABASE r");
    } catch {}
    db.close();
  }
}

/**
 * Restaura una copia completa. Antes guarda el estado actual en
 * backups/jardon-antes-de-restaurar-*.zip, por si hay que deshacerlo.
 */
export async function restoreBackup(zipFile: string): Promise<{ manifest: BackupManifest; safetyCopy: string; migrated: boolean }> {
  const staging = path.join(WORK_DIR, `restaurar-${Date.now()}`);
  await fsp.mkdir(staging, { recursive: true });
  try {
    try {
      await extract(zipFile, staging);
    } catch {
      throw new RestoreError("El archivo no es un ZIP válido o está dañado.");
    }

    // 1. Validar contenido
    let manifest: BackupManifest;
    try {
      manifest = JSON.parse(await fsp.readFile(path.join(staging, "manifest.json"), "utf8"));
    } catch {
      throw new RestoreError("El archivo no es una copia de seguridad de esta aplicación (falta manifest.json).");
    }
    if (manifest.app !== APP_ID || manifest.format !== FORMAT) throw new RestoreError("La copia no corresponde a esta aplicación o a este formato.");
    const dbStaged = path.join(staging, "database.db");
    const header = await fsp.readFile(dbStaged).then((b) => b.subarray(0, 16).toString("latin1")).catch(() => "");
    if (header !== "SQLite format 3\0") throw new RestoreError("La base de datos de la copia está dañada.");
    const known = await knownMigrations();
    const unknown = manifest.migrations.filter((m) => !known.includes(m));
    if (unknown.length) throw new RestoreError("La copia se hizo con una versión más nueva de la aplicación. Actualice la aplicación antes de restaurarla.");

    // 2. Copia de una versión anterior: se actualiza primero la base de datos de la copia (sin tocar la actual)
    let migrated = false;
    if (manifest.migrations.length < known.length) {
      const bin = path.join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "prisma.cmd" : "prisma");
      try {
        await promisify(execFile)(bin, ["migrate", "deploy"], {
          cwd: ROOT,
          env: { ...process.env, DATABASE_URL: `file:${dbStaged}` },
          shell: process.platform === "win32",
        });
      } catch {
        throw new RestoreError("No se pudo adaptar la copia a esta versión de la aplicación.");
      }
      migrated = true;
    }

    // 3. Copia de seguridad del estado actual
    const safety = await createBackupFile("antes-de-restaurar");

    // 4. Volcar los datos dentro de la base de datos en uso (mismo archivo, una sola transacción)
    await copyDatabaseInto(databaseFile(), dbStaged);
    invalidateAuthCache(); // la copia puede traer otro PIN

    // 5. Sustituir los adjuntos
    const uploadsStaged = path.join(staging, "uploads");
    await fsp.mkdir(uploadsStaged, { recursive: true });
    await fsp.writeFile(path.join(uploadsStaged, ".gitkeep"), "");
    const old = `${UPLOADS_ROOT}.anterior-${Date.now()}`;
    await fsp.rename(UPLOADS_ROOT, old).catch(() => {});
    await fsp.rename(uploadsStaged, UPLOADS_ROOT);
    await fsp.rm(old, { recursive: true, force: true });

    return { manifest, safetyCopy: path.basename(safety.file), migrated };
  } finally {
    await fsp.rm(staging, { recursive: true, force: true });
  }
}
