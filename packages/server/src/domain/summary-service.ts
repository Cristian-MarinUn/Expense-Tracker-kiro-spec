// Summary_Engine (Req 6): totales y subtotales por categoría de un periodo.
// Ver design.md, sección "Summary_Engine". La selección y la suma se delegan al repositorio
// (`sumByCategoryInPeriod`, SUM ... GROUP BY en SQLite); las funciones puras de
// `domain/pure/summary.ts` son la especificación de referencia de este comportamiento.

import {
  ErrorCode,
  domainError,
  fail,
  ok,
  resolvePeriod,
  type CategorySummary,
  type Clock,
  type Money,
  type Period,
  type PeriodRequest,
  type Result,
} from '@expense-tracker/shared';

import { PersistenceError, type CategoryRepository, type ExpenseRepository } from './ports.js';

/**
 * Solicitud de periodo aceptada por el servicio. Para `day`, `week` y `month` la fecha de
 * referencia es opcional y, si falta, se usa `Clock.today()`.
 */
export type SummaryPeriodRequest =
  | { type: 'day' | 'week' | 'month'; referenceDate?: string }
  | { type: 'custom'; dateFrom: string; dateTo: string };

export interface SummaryServiceDeps {
  expenses: ExpenseRepository;
  categories: CategoryRepository;
  clock: Clock;
}

export class SummaryService {
  private readonly expenses: ExpenseRepository;
  private readonly categories: CategoryRepository;
  private readonly clock: Clock;

  constructor(deps: SummaryServiceDeps) {
    this.expenses = deps.expenses;
    this.categories = deps.categories;
    this.clock = deps.clock;
  }

  /** Total en céntimos del periodo; 0 si no hay gastos (Req 6.1, 6.4, 6.6). */
  totalForPeriod(request: SummaryPeriodRequest): Result<Money> {
    const subtotals = this.loadSubtotals(request);
    if (!subtotals.ok) return subtotals;

    let total = 0;
    for (const cents of subtotals.value.values()) total += cents;
    if (!Number.isSafeInteger(total)) return fail(domainError(ErrorCode.TOTAL_OUT_OF_RANGE));
    return ok(total);
  }

  /**
   * Subtotales por Category con al menos un gasto en el periodo (Req 6.2, 6.3); `[]` si no
   * hay gastos (Req 6.4). Orden: `subtotal` desc, `categoryName` asc y `categoryId` asc.
   */
  summaryByCategory(request: SummaryPeriodRequest): Result<CategorySummary[]> {
    const subtotals = this.loadSubtotals(request);
    if (!subtotals.ok) return subtotals;

    let names: Map<string, string>;
    try {
      names = new Map(this.categories.list().map((c) => [c.id, c.name]));
    } catch (error) {
      return readFailure(error);
    }

    const result: CategorySummary[] = [];
    for (const [categoryId, subtotal] of subtotals.value) {
      if (subtotal <= 0) continue; // solo categorías con gastos en el periodo (Req 6.3)
      result.push({ categoryId, categoryName: names.get(categoryId) ?? categoryId, subtotal });
    }

    return ok(
      result.sort((a, b) => {
        if (a.subtotal !== b.subtotal) return b.subtotal - a.subtotal;
        if (a.categoryName !== b.categoryName) return a.categoryName < b.categoryName ? -1 : 1;
        if (a.categoryId !== b.categoryId) return a.categoryId < b.categoryId ? -1 : 1;
        return 0;
      }),
    );
  }

  /** Resuelve el periodo y obtiene las sumas por categoría, comprobando que sean enteros seguros. */
  private loadSubtotals(request: SummaryPeriodRequest): Result<Map<string, number>> {
    const period = this.resolve(request);
    if (!period.ok) return period; // INVALID_DATE / INVALID_DATE_RANGE: no se calcula nada (Req 6.6)

    let sums: Map<string, number>;
    try {
      sums = this.expenses.sumByCategoryInPeriod(period.value);
    } catch (error) {
      return readFailure(error);
    }

    for (const cents of sums.values()) {
      if (!Number.isSafeInteger(cents)) return fail(domainError(ErrorCode.TOTAL_OUT_OF_RANGE));
    }
    return ok(sums);
  }

  private resolve(request: SummaryPeriodRequest): Result<Period> {
    const full: PeriodRequest =
      request.type === 'custom'
        ? { type: 'custom', dateFrom: request.dateFrom, dateTo: request.dateTo }
        : { type: request.type, referenceDate: request.referenceDate ?? this.clock.today() };
    return resolvePeriod(full);
  }
}

/** Traduce un PersistenceError de lectura a DATA_READ_FAILED; cualquier otra excepción se propaga. */
function readFailure<T>(error: unknown): Result<T> {
  if (error instanceof PersistenceError) return fail(domainError(ErrorCode.DATA_READ_FAILED));
  throw error;
}
