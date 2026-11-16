// Apertura de la conexión SQLite con la configuración del diseño
// (design.md, "Acceso a SQLite").

import Database from 'better-sqlite3';

export type SqliteDatabase = Database.Database;

/**
 * Abre (o crea) la BD en `filename` (`':memory:'` para una BD en memoria) y aplica:
 * - `foreign_keys = ON`: impide gastos y presupuestos huérfanos.
 * - `journal_mode = WAL`: en `:memory:` SQLite lo ignora y mantiene `memory`.
 * - `synchronous = FULL`: durabilidad tras confirmar cada transacción.
 */
export function openDatabase(filename: string): SqliteDatabase {
  const db = new Database(filename);
  try {
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = FULL');
  } catch (err) {
    db.close();
    throw err;
  }
  return db;
}
