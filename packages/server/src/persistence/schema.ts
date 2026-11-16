// Esquema SQLite del Data_Store (design.md, sección "Esquema de base de datos").
// Las restricciones CHECK/UNIQUE/FK son una segunda línea de defensa; la validación
// autoritativa la hace el Validator del dominio.

import type Database from 'better-sqlite3';

/** Versión del esquema guardada en PRAGMA user_version. */
export const SCHEMA_VERSION = 1;

/** Tablas que deben existir en una BD válida. */
export const EXPECTED_TABLES = ['categories', 'expenses', 'budgets'] as const;

/** DDL de la versión 1 del esquema. */
export const SCHEMA_SQL = `
CREATE TABLE categories (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 50),
    name_lower  TEXT NOT NULL,
    is_seed     INTEGER NOT NULL DEFAULT 0 CHECK (is_seed IN (0, 1)),
    UNIQUE (name_lower)
);

CREATE TABLE expenses (
    id           TEXT PRIMARY KEY,
    amount_cents INTEGER NOT NULL
                 CHECK (amount_cents BETWEEN 1 AND 99999999999),
    category_id  TEXT NOT NULL REFERENCES categories(id),
    date         TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT ''
                 CHECK (length(description) BETWEEN 0 AND 500),
    created_at   TEXT NOT NULL
);
CREATE INDEX idx_expenses_date ON expenses(date DESC, created_at DESC);
CREATE INDEX idx_expenses_category ON expenses(category_id);

CREATE TABLE budgets (
    id           TEXT PRIMARY KEY,
    limit_cents  INTEGER NOT NULL
                 CHECK (limit_cents BETWEEN 1 AND 99999999999),
    category_id  TEXT NOT NULL REFERENCES categories(id),
    period_type  TEXT NOT NULL CHECK (period_type IN ('day', 'week', 'month', 'custom')),
    period_start TEXT NOT NULL,
    period_end   TEXT NOT NULL,
    UNIQUE (category_id, period_start, period_end)
);
`;

/**
 * Crea las tablas e índices y fija user_version = SCHEMA_VERSION en una sola transacción.
 * Debe llamarse sobre una BD vacía.
 */
export function applySchema(db: Database.Database): void {
  db.transaction(() => {
    db.exec(SCHEMA_SQL);
    db.pragma(`user_version = ${SCHEMA_VERSION}`);
  })();
}

/** Lee PRAGMA user_version. */
export function readSchemaVersion(db: Database.Database): number {
  return db.pragma('user_version', { simple: true }) as number;
}
