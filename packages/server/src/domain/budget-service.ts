// BudgetService (Budget_Manager, Req 7). Ver design.md, secciones "Interfaces de dominio",
// "Budget_Manager" y "Persistencia y arranque".
//
// Los errores de negocio se devuelven como Result; los PersistenceError de los repositorios
// se traducen a PERSISTENCE_FAILED en escrituras (tras el rollback de la transacción, Req 8.4)
// y a DATA_READ_FAILED en lecturas.

import {
  ErrorCode,
  domainError,
  fail,
  ok,
  validateBudgetInput,
  type Budget,
  type BudgetAlert,
  type BudgetInput,
  type DomainError,
  type Period,
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
import { classifyBudget } from './pure/budget.js';

export interface BudgetServiceDeps {
  budgets: BudgetRepository;
  categories: CategoryRepository;
  expenses: ExpenseRepository;
  transactions: TransactionRunner;
  /** Generador de identificadores; por defecto `crypto.randomUUID`. */
  generateId?: () => string;
}

export class BudgetService {
  private readonly budgets: BudgetRepository;
  private readonly categories: CategoryRepository;
  private readonly expenses: ExpenseRepository;
  private readonly transactions: TransactionRunner;
  private readonly generateId: () => string;

  constructor(deps: BudgetServiceDeps) {
    this.budgets = deps.budgets;
    this.categories = deps.categories;
    this.expenses = deps.expenses;
    this.transactions = deps.transactions;
    this.generateId = deps.generateId ?? (() => randomUUID());
  }

  /**
   * Crea un presupuesto (Req 7.1). Acumula los errores de validación (BUDGET_LIMIT_NOT_POSITIVE,
   * AMOUNT_OUT_OF_RANGE, INVALID_DATE, INVALID_DATE_RANGE) y CATEGORY_NOT_FOUND (Req 7.5);
   * BUDGET_DUPLICATE si ya existe uno para la misma Category y Period (Req 7.6).
   */
  create(input: BudgetInput): Result<Budget> {
    const validated = validateBudgetInput(input);
    try {
      return this.transactions.run((): Result<Budget> => {
        const errors: DomainError[] = validated.ok ? [] : [...validated.errors];
        const categoryError = this.checkCategory(input.categoryId);
        if (categoryError) errors.push(categoryError);
        if (errors.length > 0 || !validated.ok) return fail(...errors);

        const budget: Budget = { id: this.generateId(), ...validated.value };
        if (this.findDuplicate(budget, null)) {
          return fail(domainError(ErrorCode.BUDGET_DUPLICATE, 'categoryId'));
        }
        this.budgets.insert(budget);
        return ok(budget);
      });
    } catch (error) {
      return persistenceFailure(error);
    }
  }

  /**
   * Modifica un presupuesto conservando su `id` (Req 7.2). BUDGET_NOT_FOUND si no existe;
   * si la validación falla o hay un duplicado (excluyendo el propio Budget), el Budget previo
   * se conserva sin cambios (Req 7.5, 7.6).
   */
  update(id: string, input: BudgetInput): Result<Budget> {
    const validated = validateBudgetInput(input);
    try {
      return this.transactions.run((): Result<Budget> => {
        const existing = this.budgets.findById(id);
        if (!existing) return fail(domainError(ErrorCode.BUDGET_NOT_FOUND, 'id'));

        const errors: DomainError[] = validated.ok ? [] : [...validated.errors];
        const categoryError = this.checkCategory(input.categoryId);
        if (categoryError) errors.push(categoryError);
        if (errors.length > 0 || !validated.ok) return fail(...errors);

        const updated: Budget = { id: existing.id, ...validated.value };
        if (this.findDuplicate(updated, existing.id)) {
          return fail(domainError(ErrorCode.BUDGET_DUPLICATE, 'categoryId'));
        }
        if (!this.budgets.updateById(id, updated)) {
          return fail(domainError(ErrorCode.BUDGET_NOT_FOUND, 'id'));
        }
        return ok(updated);
      });
    } catch (error) {
      return persistenceFailure(error);
    }
  }

  /** Elimina un presupuesto. BUDGET_NOT_FOUND si no existe. */
  delete(id: string): Result<void> {
    try {
      return this.transactions.run((): Result<void> => {
        if (!this.budgets.deleteById(id)) {
          return fail(domainError(ErrorCode.BUDGET_NOT_FOUND, 'id'));
        }
        return ok(undefined);
      });
    } catch (error) {
      return persistenceFailure(error);
    }
  }

  /** Obtiene un presupuesto por identificador; BUDGET_NOT_FOUND si no existe. */
  get(id: string): Result<Budget> {
    try {
      const budget = this.budgets.findById(id);
      return budget ? ok(budget) : fail(domainError(ErrorCode.BUDGET_NOT_FOUND, 'id'));
    } catch (error) {
      return readFailure(error);
    }
  }

  /** Lista los presupuestos; DATA_READ_FAILED si falla la lectura. */
  list(): Result<Budget[]> {
    try {
      return ok(this.budgets.list());
    } catch (error) {
      return readFailure(error);
    }
  }

  /**
   * Evalúa las alertas de los Budgets cuyo Period se solapa con `period` (Req 7.3, 7.4).
   * `spent` es la suma de los Expenses de la Category del Budget dentro del Period del
   * propio Budget. Solo se devuelven las alertas no nulas de `classifyBudget`.
   */
  evaluateAlerts(period: Period): Result<BudgetAlert[]> {
    try {
      return ok(this.computeAlerts(period));
    } catch (error) {
      return readFailure(error);
    }
  }

  private computeAlerts(period: Period): BudgetAlert[] {
    const sumsByPeriod = new Map<string, Map<string, number>>();
    const alerts: BudgetAlert[] = [];

    for (const budget of this.budgets.list()) {
      if (!overlaps(budget, period)) continue;

      const key = `${budget.periodStart}|${budget.periodEnd}`;
      let sums = sumsByPeriod.get(key);
      if (!sums) {
        sums = this.expenses.sumByCategoryInPeriod({
          type: budget.periodType,
          start: budget.periodStart,
          end: budget.periodEnd,
        });
        sumsByPeriod.set(key, sums);
      }

      const spent = sums.get(budget.categoryId) ?? 0;
      const classification = classifyBudget(spent, budget.limit);
      if (classification) {
        alerts.push({ budgetId: budget.id, categoryId: budget.categoryId, ...classification });
      }
    }
    return alerts;
  }

  /** CATEGORY_NOT_FOUND si la Category no existe. Se llama dentro de la transacción. */
  private checkCategory(categoryId: string): DomainError | null {
    return this.categories.findById(categoryId)
      ? null
      : domainError(ErrorCode.CATEGORY_NOT_FOUND, 'categoryId');
  }

  /** Budget con la misma Category, periodStart y periodEnd, excluyendo `excludeId`. */
  private findDuplicate(budget: Budget, excludeId: string | null): Budget | null {
    const found = this.budgets.findByCategoryAndPeriod(budget.categoryId, {
      type: budget.periodType,
      start: budget.periodStart,
      end: budget.periodEnd,
    });
    return found && found.id !== excludeId ? found : null;
  }
}

/** Ambos Periods son inclusivos; se solapan si comparten al menos un día. */
function overlaps(budget: Budget, period: Period): boolean {
  return budget.periodStart <= period.end && budget.periodEnd >= period.start;
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
