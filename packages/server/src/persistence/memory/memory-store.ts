// Almacén en memoria compartido por los tres repositorios en memoria.
// Un único almacén permite que MemoryTransactionRunner tome una instantánea coherente
// de todas las colecciones y la restaure si la transacción falla.

import type { Budget, Category, Expense } from '@expense-tracker/shared';
import { PersistenceError } from '../../domain/ports.js';

/** Fila de categoría con el nombre normalizado, equivalente a la columna `name_lower`. */
export interface CategoryRow {
  category: Category;
  nameLower: string;
}

/** Contenido de una instantánea. Las filas guardadas nunca se mutan, solo se reemplazan. */
export interface MemoryStoreSnapshot {
  readonly categories: ReadonlyMap<string, CategoryRow>;
  readonly expenses: ReadonlyMap<string, Expense>;
  readonly budgets: ReadonlyMap<string, Budget>;
}

const MAX_CENTS = 99_999_999_999;
const PERIOD_TYPES: readonly string[] = ['day', 'week', 'month', 'custom'];

/** Longitud en puntos de código, como `length()` de SQLite sobre TEXT. */
function codePointLength(s: string): number {
  return [...s].length;
}

function isValidCents(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= MAX_CENTS;
}

/**
 * Colecciones en memoria con las mismas restricciones que el esquema SQLite:
 * PRIMARY KEY, CHECK, UNIQUE (name_lower), UNIQUE (category_id, period_start, period_end)
 * y claves foráneas hacia `categories`. Una violación lanza PersistenceError.
 */
export class MemoryStore {
  categories = new Map<string, CategoryRow>();
  expenses = new Map<string, Expense>();
  budgets = new Map<string, Budget>();

  /** Copia de las colecciones. Basta una copia superficial porque las filas son inmutables. */
  snapshot(): MemoryStoreSnapshot {
    return {
      categories: new Map(this.categories),
      expenses: new Map(this.expenses),
      budgets: new Map(this.budgets),
    };
  }

  /** Restaura las colecciones al estado de una instantánea. */
  restore(s: MemoryStoreSnapshot): void {
    this.categories = new Map(s.categories);
    this.expenses = new Map(s.expenses);
    this.budgets = new Map(s.budgets);
  }

  // --- Restricciones -------------------------------------------------------------

  checkCategory(c: Category, nameLower: string, selfId: string | null): void {
    const len = codePointLength(c.name);
    if (len < 1 || len > 50) {
      throw new PersistenceError('CHECK constraint failed: categories.name length');
    }
    for (const [id, row] of this.categories) {
      if (id !== selfId && row.nameLower === nameLower) {
        throw new PersistenceError('UNIQUE constraint failed: categories.name_lower');
      }
    }
  }

  checkExpense(e: Expense): void {
    if (!isValidCents(e.amount)) {
      throw new PersistenceError('CHECK constraint failed: expenses.amount_cents');
    }
    if (codePointLength(e.description) > 500) {
      throw new PersistenceError('CHECK constraint failed: expenses.description length');
    }
    this.checkCategoryReference(e.categoryId);
  }

  checkBudget(b: Budget, selfId: string | null): void {
    if (!isValidCents(b.limit)) {
      throw new PersistenceError('CHECK constraint failed: budgets.limit_cents');
    }
    if (!PERIOD_TYPES.includes(b.periodType)) {
      throw new PersistenceError('CHECK constraint failed: budgets.period_type');
    }
    this.checkCategoryReference(b.categoryId);
    for (const [id, other] of this.budgets) {
      if (
        id !== selfId &&
        other.categoryId === b.categoryId &&
        other.periodStart === b.periodStart &&
        other.periodEnd === b.periodEnd
      ) {
        throw new PersistenceError(
          'UNIQUE constraint failed: budgets.category_id, budgets.period_start, budgets.period_end',
        );
      }
    }
  }

  /** Equivalente a `REFERENCES categories(id)` con PRAGMA foreign_keys = ON. */
  checkCategoryReference(categoryId: string): void {
    if (!this.categories.has(categoryId)) {
      throw new PersistenceError('FOREIGN KEY constraint failed');
    }
  }

  /** Una categoría referenciada por gastos o presupuestos no puede eliminarse. */
  checkCategoryNotReferenced(categoryId: string): void {
    for (const e of this.expenses.values()) {
      if (e.categoryId === categoryId) throw new PersistenceError('FOREIGN KEY constraint failed');
    }
    for (const b of this.budgets.values()) {
      if (b.categoryId === categoryId) throw new PersistenceError('FOREIGN KEY constraint failed');
    }
  }

  checkPrimaryKeyFree(map: ReadonlyMap<string, unknown>, id: string, table: string): void {
    if (map.has(id)) {
      throw new PersistenceError(`UNIQUE constraint failed: ${table}.id`);
    }
  }
}
