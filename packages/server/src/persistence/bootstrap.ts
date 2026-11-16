// Secuencia de arranque del Data_Store (design.md, "Persistencia y arranque").
//
// - Archivo inexistente (o vacío) → crear esquema + sembrar la Category `General`
//   en una única transacción (Req 4.7, 8.2).
// - Archivo existente → `PRAGMA quick_check`, `user_version` reconocido y tablas
//   esperadas; aplicar migraciones pendientes en orden (Req 8.1).
// - Archivo corrupto o cualquier excepción → cerrar la conexión, renombrar el archivo
//   (y sus ficheros `-wal`) a `<archivo>.corrupt-TIMESTAMP`, crear una BD nueva con la
//   semilla y devolver `dataLoadError = DATA_LOAD_FAILED` (Req 8.5).

import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ErrorCode, domainError, type DomainError } from '@expense-tracker/shared';
import { openDatabase, type SqliteDatabase } from './connection.js';
import { EXPECTED_TABLES, SCHEMA_VERSION, applySchema, readSchemaVersion } from './schema.js';
import { SqliteCategoryRepository } from './sqlite/SqliteCategoryRepository.js';

/** Nombre de la Category predefinida sembrada en el primer arranque. */
export const SEED_CATEGORY_NAME = 'General';

/**
 * Migración que lleva el esquema de la versión `target - 1` a `target`.
 * Se ejecuta dentro de una transacción junto con la actualización de `user_version`.
 */
export type Migration = (db: SqliteDatabase) => void;

/**
 * Migraciones indexadas por la versión de destino (2..SCHEMA_VERSION).
 * La versión 1 es el esquema base creado por `applySchema`, así que no hay ninguna aún.
 */
export const MIGRATIONS: Readonly<Record<number, Migration>> = Object.freeze({});

export interface BootstrapOptions {
  /** Instante usado para el sufijo del archivo corrupto. Por defecto `new Date()`. */
  now?: () => Date;
  /** Migraciones a aplicar. Por defecto `MIGRATIONS`. */
  migrations?: Readonly<Record<number, Migration>>;
  /** Versión de esquema objetivo. Por defecto `SCHEMA_VERSION`. */
  targetVersion?: number;
}

export interface BootstrapResult {
  /** Conexión abierta y lista para usar. */
  db: SqliteDatabase;
  /** Presente solo si los datos existentes no pudieron cargarse (Req 8.5). */
  dataLoadError?: DomainError;
  /** Ruta a la que se movió el archivo corrupto, si lo hubo. */
  corruptBackupPath?: string;
}

const MEMORY = ':memory:';
/** Ficheros auxiliares de SQLite en modo WAL. */
const SIDECAR_SUFFIXES = ['-wal', '-shm', '-journal'] as const;

/** Abre la BD en `filename` siguiendo la secuencia de arranque del diseño. */
export function bootstrapDatabase(
  filename: string,
  options: BootstrapOptions = {},
): BootstrapResult {
  const now = options.now ?? (() => new Date());
  const migrations = options.migrations ?? MIGRATIONS;
  const targetVersion = options.targetVersion ?? SCHEMA_VERSION;

  if (filename === MEMORY || !fileHasContent(filename)) {
    return { db: createFreshDatabase(filename) };
  }

  let db: SqliteDatabase | undefined;
  try {
    db = openDatabase(filename);
    verifyIntegrity(db, targetVersion);
    runMigrations(db, migrations, targetVersion);
    return { db };
  } catch (err) {
    // Windows no permite renombrar un archivo abierto: cerrar antes de moverlo.
    closeQuietly(db);
    const corruptBackupPath = moveCorruptFiles(filename, now());
    console.error(
      `[bootstrap] No se pudo cargar la BD "${filename}"; movida a "${corruptBackupPath}".`,
      err,
    );
    return {
      db: createFreshDatabase(filename),
      dataLoadError: domainError(ErrorCode.DATA_LOAD_FAILED),
      corruptBackupPath,
    };
  }
}

/** true si el archivo existe y no está vacío (SQLite trata un archivo vacío como BD nueva). */
function fileHasContent(filename: string): boolean {
  try {
    return fs.statSync(filename).size > 0;
  } catch {
    return false;
  }
}

/** Crea el esquema y siembra la Category predefinida en la misma transacción. */
function createFreshDatabase(filename: string): SqliteDatabase {
  if (filename !== MEMORY) {
    fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
    // Ficheros auxiliares huérfanos de una BD anterior no deben aplicarse a la nueva.
    for (const suffix of SIDECAR_SUFFIXES) fs.rmSync(filename + suffix, { force: true });
  }
  const db = openDatabase(filename);
  try {
    // applySchema abre su propia transacción; anidada en esta, better-sqlite3 la
    // convierte en un savepoint, de modo que esquema y semilla se confirman juntos.
    db.transaction(() => {
      applySchema(db);
      new SqliteCategoryRepository(db).insert({
        id: randomUUID(),
        name: SEED_CATEGORY_NAME,
        isSeed: true,
      });
    })();
  } catch (err) {
    db.close();
    throw err;
  }
  return db;
}

/** Lanza si la BD no supera quick_check, tiene una versión desconocida o le faltan tablas. */
function verifyIntegrity(db: SqliteDatabase, targetVersion: number): void {
  const check = db.pragma('quick_check', { simple: true });
  if (check !== 'ok') throw new Error(`quick_check falló: ${String(check)}`);

  const version = readSchemaVersion(db);
  if (!Number.isInteger(version) || version < 1 || version > targetVersion) {
    throw new Error(`user_version no reconocido: ${version}`);
  }

  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all() as { name: string }[];
  const present = new Set(rows.map((r) => r.name));
  const missing = EXPECTED_TABLES.filter((t) => !present.has(t));
  if (missing.length > 0) throw new Error(`Faltan tablas: ${missing.join(', ')}`);
}

/** Aplica en orden las migraciones de `user_version + 1` hasta `targetVersion`. */
function runMigrations(
  db: SqliteDatabase,
  migrations: Readonly<Record<number, Migration>>,
  targetVersion: number,
): void {
  for (let v = readSchemaVersion(db) + 1; v <= targetVersion; v++) {
    const migrate = migrations[v];
    if (!migrate) throw new Error(`No existe migración a la versión ${v}`);
    db.transaction(() => {
      migrate(db);
      db.pragma(`user_version = ${v}`);
    })();
  }
}

/**
 * Renombra el archivo principal a `<archivo>.corrupt-TIMESTAMP` y mueve su `-wal`
 * y `-journal` con el mismo prefijo (útil para una recuperación manual). `-shm` se
 * elimina porque es un índice regenerable.
 */
function moveCorruptFiles(filename: string, at: Date): string {
  // ':' y '.' no son válidos o son ambiguos en nombres de archivo de Windows.
  const stamp = at.toISOString().replace(/[:.]/g, '-');
  const backup = `${filename}.corrupt-${stamp}`;
  fs.renameSync(filename, backup);
  for (const suffix of ['-wal', '-journal']) {
    if (fs.existsSync(filename + suffix)) fs.renameSync(filename + suffix, backup + suffix);
  }
  fs.rmSync(filename + '-shm', { force: true });
  return backup;
}

function closeQuietly(db: SqliteDatabase | undefined): void {
  try {
    db?.close();
  } catch {
    // La conexión ya estaba cerrada o inutilizable; no impide el renombrado.
  }
}
