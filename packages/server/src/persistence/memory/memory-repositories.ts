// Implementaciones en memoria de los repositorios del Data_Store.
// Se usan en las pruebas de dominio y reproducen las semánticas de los repositorios SQLite:
// mismas restricciones (lanzan PersistenceError), mismo UPDATE de todas las columnas
// (incluido el id) y mismo orden de resultados. Los objetos devueltos son copias, de modo
// que el llamador no puede alterar el almacén sin pasar por el repositorio.

import type { Budget, Category, Expense, ExpenseFilter, Period } from '@expense-tracker/shared';
import type {
  BudgetRepository,
  CategoryRepository,
  ExpenseRepository,
} from '../../domain/ports.js';
import { MemoryStore } from './memory-store.js';

/**
 * Compara como el colado BINARY de SQLite (orden de bytes UTF-8, que coincide con el
 * orden por puntos de código). `<` de JS compara unidades UTF-16 y difiere con surrogates.
 */
function compareBinary(a: string, b: string): number {
  const ca = [...a];
  const cb = [...b];
  const n = Math.min(ca.length, cb.length);
  for (let i = 0; i < n; i++) {
    const d = (ca[i]!.codePointAt(0) ?? 0) - (cb[i]!.codePointAt(0) ?? 0);
    if (d !== 0) return d;
  }
  return ca.length - cb.length;
}

/** Reemplaza la fila `id` por `row` (con id posiblemente distinto), como `UPDATE ... SET id = ?`. */
function replaceRow<T>(
  store: MemoryStore,
  map: Map<string, T>,
  table: string,
  id: string,
  newId: string,
  row: T,
): void {
  if (newId !== id) {
    store.checkPrimaryKeyFree(map, newId, table);
    map.delete(id);
  }
  map.set(newId, row);
}

export class MemoryExpenseRepository implements ExpenseRepository {
  constructor(private readonly store: MemoryStore) {}

  insert(e: Expense): void {
    this.store.checkPrimaryKeyFree(this.store.expenses, e.id, 'expenses');
    this.store.checkExpense(e);
    this.store.expenses.set(e.id, { ...e });
  }

  updateById(id: string, e: Expense): boolean {
    if (!this.store.expenses.has(id)) return false;
    this.store.checkExpense(e);
    replaceRow(this.store, this.store.expenses, 'expenses', id, e.id, { ...e });
    return true;
  }

  deleteById(id: string): boolean {
    return this.store.expenses.delete(id);
  }

  findById(id: string): Expense | null {
    const e = this.store.expenses.get(id);
    return e ? { ...e } : null;
  }

  /** Filtra por categoría y rango de fechas; orden `date DESC, createdAt DESC, id ASC`. */
  query(filter: ExpenseFilter): Expense[] {
    const result: Expense[] = [];
    for (const e of this.store.expenses.values()) {
      if (filter.categoryId !== undefined && e.categoryId !== filter.categoryId) continue;
      if (filter.dateFrom !== undefined && compareBinary(e.date, filter.dateFrom) < 0) continue;
      if (filter.dateTo !== undefined && compareBinary(e.date, filter.dateTo) > 0) continue;
      result.push({ ...e });
    }
    return result.sort(
      (a, b) =>
        compareBinary(b.date, a.date) ||
        compareBinary(b.createdAt, a.createdAt) ||
        compareBinary(a.id, b.id),
    );
  }

  sumByCategoryInPeriod(period: Period): Map<string, number> {
    const sums = new Map<string, number>();
    for (const e of this.store.expenses.values()) {
      if (compareBinary(e.date, period.start) < 0 || compareBinary(e.date, period.end) > 0) {
        continue;
      }
      sums.set(e.categoryId, (sums.get(e.categoryId) ?? 0) + e.amount);
    }
    return sums;
  }

  countByCategory(categoryId: string): number {
    let n = 0;
    for (const e of this.store.expenses.values()) {
      if (e.categoryId === categoryId) n++;
    }
    return n;
  }
}

export class MemoryCategoryRepository implements CategoryRepository {
  constructor(private readonly store: MemoryStore) {}

  insert(c: Category): void {
    this.store.checkPrimaryKeyFree(this.store.categories, c.id, 'categories');
    const nameLower = c.name.toLowerCase();
    this.store.checkCategory(c, nameLower, null);
    this.store.categories.set(c.id, { category: { ...c }, nameLower });
  }

  updateById(id: string, c: Category): boolean {
    if (!this.store.categories.has(id)) return false;
    const nameLower = c.name.toLowerCase();
    this.store.checkCategory(c, nameLower, id);
    // Cambiar el id de una categoría referenciada viola la clave foránea.
    if (c.id !== id) this.store.checkCategoryNotReferenced(id);
    replaceRow(this.store, this.store.categories, 'categories', id, c.id, {
      category: { ...c },
      nameLower,
    });
    return true;
  }

  deleteById(id: string): boolean {
    if (!this.store.categories.has(id)) return false;
    this.store.checkCategoryNotReferenced(id);
    this.store.categories.delete(id);
    return true;
  }

  findById(id: string): Category | null {
    const row = this.store.categories.get(id);
    return row ? { ...row.category } : null;
  }

  findByNameInsensitive(name: string): Category | null {
    const target = name.toLowerCase();
    for (const row of this.store.categories.values()) {
      if (row.nameLower === target) return { ...row.category };
    }
    return null;
  }

  /** Orden `name_lower ASC, id ASC`. */
  list(): Category[] {
    return [...this.store.categories.values()]
      .sort((a, b) => compareBinary(a.nameLower, b.nameLower) || compareBinary(a.category.id, b.category.id))
      .map((row) => ({ ...row.category }));
  }
}

export class MemoryBudgetRepository implements BudgetRepository {
  constructor(private readonly store: MemoryStore) {}

  insert(b: Budget): void {
    this.store.checkPrimaryKeyFree(this.store.budgets, b.id, 'budgets');
    this.store.checkBudget(b, null);
    this.store.budgets.set(b.id, { ...b });
  }

  updateById(id: string, b: Budget): boolean {
    if (!this.store.budgets.has(id)) return false;
    this.store.checkBudget(b, id);
    replaceRow(this.store, this.store.budgets, 'budgets', id, b.id, { ...b });
    return true;
  }

  deleteById(id: string): boolean {
    return this.store.budgets.delete(id);
  }

  findById(id: string): Budget | null {
    const b = this.store.budgets.get(id);
    return b ? { ...b } : null;
  }

  findByCategoryAndPeriod(categoryId: string, period: Period): Budget | null {
    for (const b of this.store.budgets.values()) {
      if (
        b.categoryId === categoryId &&
        b.periodStart === period.start &&
        b.periodEnd === period.end
      ) {
        return { ...b };
      }
    }
    return null;
  }

  /** Orden `period_start ASC, id ASC`. */
  list(): Budget[] {
    return [...this.store.budgets.values()]
      .sort((a, b) => compareBinary(a.periodStart, b.periodStart) || compareBinary(a.id, b.id))
      .map((b) => ({ ...b }));
  }

  countByCategory(categoryId: string): number {
    let n = 0;
    for (const b of this.store.budgets.values()) {
      if (b.categoryId === categoryId) n++;
    }
    return n;
  }
}
