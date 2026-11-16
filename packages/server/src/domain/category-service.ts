// CategoryService (Category_Manager, Req 4). Ver design.md, secciones "Interfaces de dominio",
// "Validator" y "Persistencia y arranque".
//
// Los errores de negocio se devuelven como Result; los PersistenceError de los repositorios se
// traducen a PERSISTENCE_FAILED en escrituras (Req 8.4) tras el rollback de la transacción.
//
// Decisión sobre Budgets al eliminar una Category: Categories y Budgets se gestionan por separado.
// Una Category con Budgets asociados no se elimina (CATEGORY_HAS_BUDGETS) y los Budgets nunca se
// borran en cascada; el usuario debe eliminarlos explícitamente antes (Req 4.8).
//
// Las lecturas que fallan devuelven DATA_READ_FAILED.

import {
  ErrorCode,
  domainError,
  fail,
  ok,
  validateCategoryName,
  type Category,
  type Result,
} from '@expense-tracker/shared';
import { randomUUID } from 'node:crypto';
import {
  PersistenceError,
  type BudgetRepository,
  type CategoryRepository,
  type ExpenseRepository,
  type TransactionRunner,
} from './ports.js';

export interface CategoryServiceDeps {
  categories: CategoryRepository;
  expenses: ExpenseRepository;
  budgets: BudgetRepository;
  transactions: TransactionRunner;
  /** Generador de identificadores; por defecto `crypto.randomUUID`. */
  generateId?: () => string;
}

export class CategoryService {
  private readonly categories: CategoryRepository;
  private readonly expenses: ExpenseRepository;
  private readonly budgets: BudgetRepository;
  private readonly transactions: TransactionRunner;
  private readonly generateId: () => string;

  constructor(deps: CategoryServiceDeps) {
    this.categories = deps.categories;
    this.expenses = deps.expenses;
    this.budgets = deps.budgets;
    this.transactions = deps.transactions;
    this.generateId = deps.generateId ?? (() => randomUUID());
  }

  /**
   * Crea una Category (Req 4.1, 4.3). CATEGORY_NAME_INVALID si el nombre recortado no tiene
   * 1–50 caracteres (Req 4.2); CATEGORY_DUPLICATE si coincide sin distinguir mayúsculas con
   * otra (Req 4.4). En ambos casos el conjunto de Categories no cambia.
   */
  create(name: string): Result<Category> {
    const validated = validateCategoryName(name);
    if (!validated.ok) return validated;
    const trimmed = validated.value;
    try {
      return this.transactions.run((): Result<Category> => {
        if (this.categories.findByNameInsensitive(trimmed)) {
          return fail(domainError(ErrorCode.CATEGORY_DUPLICATE, 'name'));
        }
        const category: Category = { id: this.generateId(), name: trimmed, isSeed: false };
        this.categories.insert(category);
        return ok(category);
      });
    } catch (error) {
      return persistenceFailure(error);
    }
  }

  /**
   * Renombra una Category conservando `id` e `isSeed` (Req 4.3). CATEGORY_ID_NOT_FOUND si no
   * existe; CATEGORY_NAME_INVALID o CATEGORY_DUPLICATE (excluyendo la propia Category, de modo
   * que se puede cambiar solo el uso de mayúsculas) sin modificar nada.
   */
  rename(id: string, name: string): Result<Category> {
    const validated = validateCategoryName(name);
    try {
      return this.transactions.run((): Result<Category> => {
        const existing = this.categories.findById(id);
        if (!existing) return fail(domainError(ErrorCode.CATEGORY_ID_NOT_FOUND, 'id'));
        if (!validated.ok) return validated;

        const trimmed = validated.value;
        const sameName = this.categories.findByNameInsensitive(trimmed);
        if (sameName && sameName.id !== id) {
          return fail(domainError(ErrorCode.CATEGORY_DUPLICATE, 'name'));
        }
        const updated: Category = { id: existing.id, name: trimmed, isSeed: existing.isSeed };
        if (!this.categories.updateById(id, updated)) {
          return fail(domainError(ErrorCode.CATEGORY_ID_NOT_FOUND, 'id'));
        }
        return ok(updated);
      });
    } catch (error) {
      return persistenceFailure(error);
    }
  }

  /**
   * Elimina una Category sin Expenses ni Budgets (Req 4.5). Orden de comprobación:
   * CATEGORY_ID_NOT_FOUND si no existe; CATEGORY_HAS_EXPENSES si tiene gastos (Req 4.6);
   * CATEGORY_HAS_BUDGETS si tiene presupuestos (Req 4.8). Un rechazo no modifica nada.
   */
  delete(id: string): Result<void> {
    try {
      return this.transactions.run((): Result<void> => {
        if (!this.categories.findById(id)) {
          return fail(domainError(ErrorCode.CATEGORY_ID_NOT_FOUND, 'id'));
        }
        if (this.expenses.countByCategory(id) > 0) {
          return fail(domainError(ErrorCode.CATEGORY_HAS_EXPENSES, 'id'));
        }
        if (this.budgets.countByCategory(id) > 0) {
          return fail(domainError(ErrorCode.CATEGORY_HAS_BUDGETS, 'id'));
        }
        if (!this.categories.deleteById(id)) {
          return fail(domainError(ErrorCode.CATEGORY_ID_NOT_FOUND, 'id'));
        }
        return ok(undefined);
      });
    } catch (error) {
      return persistenceFailure(error);
    }
  }

  /** Lista todas las Categories, incluida la sembrada (Req 4.7). DATA_READ_FAILED si falla la lectura. */
  list(): Result<Category[]> {
    try {
      return ok(this.categories.list());
    } catch (error) {
      return readFailure(error);
    }
  }
}
/** Traduce un PersistenceError a PERSISTENCE_FAILED; cualquier otra excepción se propaga. */
function persistenceFailure<T>(error: unknown): Result<T> {
  if (error instanceof PersistenceError) return fail(domainError(ErrorCode.PERSISTENCE_FAILED));
  throw error;
}

/** Traduce un PersistenceError de lectura a DATA_READ_FAILED; cualquier otra excepción se propaga. */
function readFailure<T>(error: unknown): Result<T> {
  if (error instanceof PersistenceError) return fail(domainError(ErrorCode.DATA_READ_FAILED));
  throw error;
}
