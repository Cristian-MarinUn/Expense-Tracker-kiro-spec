// Puertos de persistencia (frontera entre el dominio y el Data_Store).
// La lógica de dominio depende solo de estas interfaces, de modo que las implementaciones
// (SQLite, en memoria, PostgreSQL en el futuro) son intercambiables. Ver design.md,
// secciones "Interfaces de dominio" y "Persistencia y arranque".

import type { Budget, Category, Expense, ExpenseFilter, Period } from '@expense-tracker/shared';

/**
 * Fallo de infraestructura del Data_Store (disco lleno, archivo bloqueado, restricción
 * violada inesperadamente...). Los repositorios lo lanzan; los servicios lo capturan,
 * dejan que la transacción se revierta y lo traducen al DomainError de persistencia
 * de la operación: en escrituras EXPENSE_SAVE_FAILED, EXPENSE_DELETE_FAILED o PERSISTENCE_FAILED;
 * en lecturas DATA_READ_FAILED.
 */
export class PersistenceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'PersistenceError';
  }
}

/** Repositorio de gastos. Montos en céntimos. */
export interface ExpenseRepository {
  /** Inserta un gasto. Lanza PersistenceError si falla. */
  insert(e: Expense): void;
  /** Reemplaza el gasto con ese id. Devuelve false si no existe. */
  updateById(id: string, e: Expense): boolean;
  /** Elimina el gasto con ese id. Devuelve false si no existe. */
  deleteById(id: string): boolean;
  findById(id: string): Expense | null;
  /**
   * Gastos que cumplen `categoryId` y el rango `dateFrom..dateTo` (inclusivo).
   * La búsqueda por texto y el orden final los aplica el dominio.
   */
  query(filter: ExpenseFilter): Expense[];
  /** Suma en céntimos por categoryId de los gastos con start <= date <= end. */
  sumByCategoryInPeriod(period: Period): Map<string, number>;
  /** Número de gastos asociados a la categoría. */
  countByCategory(categoryId: string): number;
}

/** Repositorio de categorías. La unicidad del nombre no distingue mayúsculas. */
export interface CategoryRepository {
  /** Inserta una categoría. Lanza PersistenceError si falla. */
  insert(c: Category): void;
  /** Reemplaza la categoría con ese id. Devuelve false si no existe. */
  updateById(id: string, c: Category): boolean;
  /** Elimina la categoría con ese id. Devuelve false si no existe. */
  deleteById(id: string): boolean;
  findById(id: string): Category | null;
  /** Busca por nombre comparando en minúsculas. */
  findByNameInsensitive(name: string): Category | null;
  list(): Category[];
}

/** Repositorio de presupuestos. Límites en céntimos. */
export interface BudgetRepository {
  /** Inserta un presupuesto. Lanza PersistenceError si falla. */
  insert(b: Budget): void;
  /** Reemplaza el presupuesto con ese id. Devuelve false si no existe. */
  updateById(id: string, b: Budget): boolean;
  /** Elimina el presupuesto con ese id. Devuelve false si no existe. */
  deleteById(id: string): boolean;
  findById(id: string): Budget | null;
  /** Presupuesto con la misma categoría, periodStart y periodEnd, si existe. */
  findByCategoryAndPeriod(categoryId: string, period: Period): Budget | null;
  list(): Budget[];
  /** Número de presupuestos asociados a la categoría. */
  countByCategory(categoryId: string): number;
}

/**
 * Ejecuta `fn` como una unidad atómica. Si `fn` lanza, todos los cambios hechos
 * dentro se revierten y la excepción se propaga. Devuelve el valor de `fn`.
 */
export interface TransactionRunner {
  run<T>(fn: () => T): T;
}
