// ExpenseService (Expense_Manager, Req 1, 2, 3) y consulta del listado (Expense_List_View, Req 5).
// Ver design.md, secciones "Interfaces de dominio", "Validator", "Listado, filtros y búsqueda"
// y "Persistencia y arranque".
//
// Los errores de negocio se devuelven como Result; los PersistenceError de los repositorios
// se traducen al error de persistencia de la operación tras el rollback de la transacción.

import {
  ErrorCode,
  domainError,
  fail,
  ok,
  validateExpenseFilter,
  validateExpenseInput,
  type Clock,
  type DomainError,
  type Expense,
  type ExpenseFilter,
  type ExpenseInput,
  type Result,
} from '@expense-tracker/shared';
import { randomUUID } from 'node:crypto';
import {
  PersistenceError,
  type CategoryRepository,
  type ExpenseRepository,
  type TransactionRunner,
} from './ports.js';
import { applyFilter } from './pure/applyFilter.js';

export interface ExpenseServiceDeps {
  expenses: ExpenseRepository;
  categories: CategoryRepository;
  transactions: TransactionRunner;
  clock: Clock;
  /** Generador de identificadores; por defecto `crypto.randomUUID`. */
  generateId?: () => string;
  /** Instante actual en ISO 8601 para `createdAt`; por defecto `new Date().toISOString()`. */
  now?: () => string;
}

export class ExpenseService {
  private readonly expenses: ExpenseRepository;
  private readonly categories: CategoryRepository;
  private readonly transactions: TransactionRunner;
  private readonly clock: Clock;
  private readonly generateId: () => string;
  private readonly now: () => string;

  constructor(deps: ExpenseServiceDeps) {
    this.expenses = deps.expenses;
    this.categories = deps.categories;
    this.transactions = deps.transactions;
    this.clock = deps.clock;
    this.generateId = deps.generateId ?? (() => randomUUID());
    this.now = deps.now ?? (() => new Date().toISOString());
  }

  /**
   * Crea un gasto (Req 1.1, 1.2, 1.9). Acumula los errores de validación y CATEGORY_NOT_FOUND
   * (Req 1.4–1.8). Un fallo de persistencia devuelve EXPENSE_SAVE_FAILED sin cambios (Req 1.3).
   */
  create(input: ExpenseInput): Result<Expense> {
    const validated = validateExpenseInput(input, this.clock);
    try {
      return this.transactions.run((): Result<Expense> => {
        const errors: DomainError[] = validated.ok ? [] : [...validated.errors];
        const categoryError = this.checkCategory(input.categoryId);
        if (categoryError) errors.push(categoryError);
        if (errors.length > 0 || !validated.ok) return fail(...errors);

        const expense: Expense = {
          id: this.generateId(),
          amount: validated.value.amount,
          categoryId: validated.value.categoryId,
          date: validated.value.date,
          description: validated.value.description,
          createdAt: this.now(),
        };
        this.expenses.insert(expense);
        return ok(expense);
      });
    } catch (error) {
      return persistenceFailure(error, ErrorCode.EXPENSE_SAVE_FAILED);
    }
  }

  /**
   * Edita un gasto conservando `id` y `createdAt` (Req 2.1, 2.2). EXPENSE_NOT_FOUND si no
   * existe (Req 2.3); si la validación falla devuelve todos los errores y no modifica nada
   * (Req 2.4, 2.5). Un fallo de persistencia devuelve EXPENSE_SAVE_FAILED.
   */
  update(id: string, input: ExpenseInput): Result<Expense> {
    const validated = validateExpenseInput(input, this.clock);
    try {
      return this.transactions.run((): Result<Expense> => {
        const existing = this.expenses.findById(id);
        if (!existing) return fail(domainError(ErrorCode.EXPENSE_NOT_FOUND, 'id'));

        const errors: DomainError[] = validated.ok ? [] : [...validated.errors];
        const categoryError = this.checkCategory(input.categoryId);
        if (categoryError) errors.push(categoryError);
        if (errors.length > 0 || !validated.ok) return fail(...errors);

        const updated: Expense = {
          id: existing.id,
          amount: validated.value.amount,
          categoryId: validated.value.categoryId,
          date: validated.value.date,
          description: validated.value.description,
          createdAt: existing.createdAt,
        };
        if (!this.expenses.updateById(id, updated)) {
          return fail(domainError(ErrorCode.EXPENSE_NOT_FOUND, 'id'));
        }
        return ok(updated);
      });
    } catch (error) {
      return persistenceFailure(error, ErrorCode.EXPENSE_SAVE_FAILED);
    }
  }

  /**
   * Elimina un gasto (Req 3.2, 3.4). EXPENSE_NOT_FOUND si no existe (Req 3.5). Un fallo de
   * persistencia devuelve EXPENSE_DELETE_FAILED y conserva el gasto (Req 3.6).
   */
  delete(id: string): Result<void> {
    try {
      return this.transactions.run((): Result<void> => {
        if (!this.expenses.deleteById(id)) {
          return fail(domainError(ErrorCode.EXPENSE_NOT_FOUND, 'id'));
        }
        return ok(undefined);
      });
    } catch (error) {
      return persistenceFailure(error, ErrorCode.EXPENSE_DELETE_FAILED);
    }
  }

  /** Obtiene un gasto por identificador; EXPENSE_NOT_FOUND si no existe. */
  get(id: string): Result<Expense> {
    try {
      const expense = this.expenses.findById(id);
      return expense ? ok(expense) : fail(domainError(ErrorCode.EXPENSE_NOT_FOUND, 'id'));
    } catch (error) {
      return readFailure(error);
    }
  }

  /**
   * Listado filtrado y ordenado (Req 5.1–5.6). Valida el filtro antes de consultar
   * (INVALID_DATE_RANGE, SEARCH_TEXT_INVALID). El repositorio filtra por Category y fechas;
   * la búsqueda insensible a mayúsculas/acentos y el orden total se aplican con `applyFilter`.
   */
  list(filter: ExpenseFilter = {}): Result<Expense[]> {
    const validated = validateExpenseFilter(filter);
    if (!validated.ok) return validated;

    const { categoryId, dateFrom, dateTo } = validated.value;
    const repoFilter: ExpenseFilter = {};
    if (categoryId !== undefined) repoFilter.categoryId = categoryId;
    if (dateFrom !== undefined) repoFilter.dateFrom = dateFrom;
    if (dateTo !== undefined) repoFilter.dateTo = dateTo;

    try {
      const candidates = this.expenses.query(repoFilter);
      return ok(applyFilter(candidates, validated.value));
    } catch (error) {
      return readFailure(error);
    }
  }

  /** CATEGORY_NOT_FOUND si la Category no existe (Req 1.7). Se llama dentro de la transacción. */
  private checkCategory(categoryId: string): DomainError | null {
    return this.categories.findById(categoryId)
      ? null
      : domainError(ErrorCode.CATEGORY_NOT_FOUND, 'categoryId');
  }
}

/** Traduce un PersistenceError al error de la operación; cualquier otra excepción se propaga. */
function persistenceFailure<T>(error: unknown, code: ErrorCode): Result<T> {
  if (error instanceof PersistenceError) return fail(domainError(code));
  throw error;
}

/** Traduce un PersistenceError de lectura a DATA_READ_FAILED; cualquier otra excepción se propaga. */
function readFailure<T>(error: unknown): Result<T> {
  if (error instanceof PersistenceError) return fail(domainError(ErrorCode.DATA_READ_FAILED));
  throw error;
}
