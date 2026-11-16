// Validator: reglas de validación compartidas por cliente y servidor (sección "Validator" de design.md).
// Todas las funciones son puras y acumulan todos los errores en lugar de detenerse en el primero
// (Req 2.4). Las comprobaciones que requieren acceso a datos (CATEGORY_NOT_FOUND, CATEGORY_DUPLICATE,
// BUDGET_DUPLICATE) se realizan en los servicios del servidor, no aquí.

import { ErrorCode, domainError, fail, ok, type DomainError, type Result } from './errors.js';
import { parseAmount } from './money.js';
import { isValidCalendarDate, type Clock } from './period.js';
import type { BudgetInput, ExpenseFilter, ExpenseInput, Money, PeriodType } from './types.js';

/** Longitud máxima de la descripción de un gasto, en puntos de código Unicode (Req 1.8). */
export const MAX_DESCRIPTION_LENGTH = 500;
/** Longitud mínima y máxima del nombre de una categoría tras recortar espacios (Req 4.2). */
export const MIN_CATEGORY_NAME_LENGTH = 1;
export const MAX_CATEGORY_NAME_LENGTH = 50;
/** Longitud máxima del texto de búsqueda (Req 5.5). El texto vacío equivale a sin filtro. */
export const MAX_SEARCH_LENGTH = 100;

/** Gasto validado y normalizado: monto en céntimos y descripción por defecto "". */
export interface ValidatedExpenseInput {
  amount: Money;
  categoryId: string;
  date: string;
  description: string;
}

/** Presupuesto validado y normalizado: límite en céntimos. */
export interface ValidatedBudgetInput {
  limit: Money;
  categoryId: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
}

/** Longitud en puntos de código Unicode (no en unidades UTF-16). */
export function codePointLength(s: string): number {
  return [...s].length;
}

/**
 * Valida una fecha de gasto: INVALID_DATE si no es un día real del calendario,
 * DATE_IN_FUTURE si es posterior a la fecha actual del Clock.
 */
function validateExpenseDate(date: string, clock: Clock, field: string): DomainError | null {
  if (!isValidCalendarDate(date)) return domainError(ErrorCode.INVALID_DATE, field);
  // El orden lexicográfico de YYYY-MM-DD coincide con el cronológico.
  if (date > clock.today()) return domainError(ErrorCode.DATE_IN_FUTURE, field);
  return null;
}

/**
 * Valida la entrada de creación/edición de un gasto (Req 1.4, 1.5, 1.6, 1.8, 1.9, 2.1, 2.4).
 * Devuelve el gasto normalizado o todos los errores de monto, fecha y descripción.
 */
export function validateExpenseInput(
  input: ExpenseInput,
  clock: Clock,
): Result<ValidatedExpenseInput> {
  const errors: DomainError[] = [];

  const amount = parseAmount(input.amount, 'amount');
  if (!amount.ok) errors.push(...amount.errors);

  const dateError = validateExpenseDate(input.date, clock, 'date');
  if (dateError) errors.push(dateError);

  const description = input.description ?? '';
  if (codePointLength(description) > MAX_DESCRIPTION_LENGTH) {
    errors.push(domainError(ErrorCode.DESCRIPTION_TOO_LONG, 'description'));
  }

  if (errors.length > 0 || !amount.ok) return fail(...errors);
  return ok({ amount: amount.value, categoryId: input.categoryId, date: input.date, description });
}

/**
 * Valida el nombre de una categoría (Req 4.2): tras recortar espacios debe tener
 * entre 1 y 50 puntos de código. Devuelve el nombre recortado.
 */
export function validateCategoryName(name: string): Result<string> {
  const trimmed = name.trim();
  const length = codePointLength(trimmed);
  if (length < MIN_CATEGORY_NAME_LENGTH || length > MAX_CATEGORY_NAME_LENGTH) {
    return fail(domainError(ErrorCode.CATEGORY_NAME_INVALID, 'name'));
  }
  return ok(trimmed);
}

/**
 * Valida la entrada de un presupuesto (Req 7.1, 7.5).
 * - Límite: reglas de parseAmount; un valor <= 0 devuelve BUDGET_LIMIT_NOT_POSITIVE.
 * - Periodo: fechas de calendario válidas y periodStart < periodEnd estricto (INVALID_DATE_RANGE).
 */
export function validateBudgetInput(input: BudgetInput): Result<ValidatedBudgetInput> {
  const errors: DomainError[] = [];

  const limit = parseAmount(input.limit, 'limit');
  if (!limit.ok) {
    for (const error of limit.errors) {
      errors.push(
        error.code === ErrorCode.AMOUNT_NOT_POSITIVE
          ? domainError(ErrorCode.BUDGET_LIMIT_NOT_POSITIVE, 'limit')
          : error,
      );
    }
  }

  const startValid = isValidCalendarDate(input.periodStart);
  const endValid = isValidCalendarDate(input.periodEnd);
  if (!startValid) errors.push(domainError(ErrorCode.INVALID_DATE, 'periodStart'));
  if (!endValid) errors.push(domainError(ErrorCode.INVALID_DATE, 'periodEnd'));
  if (startValid && endValid && input.periodStart >= input.periodEnd) {
    errors.push(domainError(ErrorCode.INVALID_DATE_RANGE, 'periodStart'));
  }

  if (errors.length > 0 || !limit.ok) return fail(...errors);
  return ok({
    limit: limit.value,
    categoryId: input.categoryId,
    periodType: input.periodType,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
  });
}

/**
 * Valida los criterios del listado (Req 5.4, 5.5).
 * - dateFrom/dateTo: fechas de calendario válidas y dateFrom <= dateTo (INVALID_DATE_RANGE).
 * - search: vacío equivale a sin filtro (se omite del resultado); más de 100 caracteres
 *   devuelve SEARCH_TEXT_INVALID.
 * Devuelve el filtro normalizado (sin criterios vacíos).
 */
export function validateExpenseFilter(filter: ExpenseFilter): Result<ExpenseFilter> {
  const errors: DomainError[] = [];
  const normalized: ExpenseFilter = {};

  if (filter.categoryId !== undefined) normalized.categoryId = filter.categoryId;

  const { dateFrom, dateTo } = filter;
  const fromValid = dateFrom === undefined || isValidCalendarDate(dateFrom);
  const toValid = dateTo === undefined || isValidCalendarDate(dateTo);
  if (!fromValid) errors.push(domainError(ErrorCode.INVALID_DATE, 'dateFrom'));
  if (!toValid) errors.push(domainError(ErrorCode.INVALID_DATE, 'dateTo'));
  if (fromValid && toValid && dateFrom !== undefined && dateTo !== undefined && dateFrom > dateTo) {
    errors.push(domainError(ErrorCode.INVALID_DATE_RANGE, 'dateFrom'));
  }
  if (dateFrom !== undefined) normalized.dateFrom = dateFrom;
  if (dateTo !== undefined) normalized.dateTo = dateTo;

  if (filter.search !== undefined && filter.search !== '') {
    if (codePointLength(filter.search) > MAX_SEARCH_LENGTH) {
      errors.push(domainError(ErrorCode.SEARCH_TEXT_INVALID, 'search'));
    } else {
      normalized.search = filter.search;
    }
  }

  if (errors.length > 0) return fail(...errors);
  return ok(normalized);
}
