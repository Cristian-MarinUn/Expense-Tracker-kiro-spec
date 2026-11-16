// DTOs de la API REST (design.md, "Diseño de la API REST").
//
// - Salida: los importes (`amount`, `limit`, `subtotal`, `total`, `amountOver`) se serializan
//   como string con exactamente dos decimales mediante `formatCents` (Req 6.5).
// - Entrada: se comprueban los tipos del cuerpo y de la query en el límite HTTP. Los importes
//   se conservan como string y los servicios los convierten a céntimos con `parseAmount`
//   (a través de los validadores compartidos), de modo que las reglas de negocio y sus
//   mensajes se aplican en un único sitio. Los campos desconocidos se ignoran.
//
// Cada campo con un tipo incorrecto se reporta con su propio código *_NOT_TEXT (o
// PERIOD_TYPE_INVALID) y su `field` (ver FIELD_TYPE_ERROR).
// Un cuerpo ausente o con JSON malformado se trata como `{}` y produce los errores de todos
// los campos obligatorios.

import {
  ErrorCode,
  domainError,
  fail,
  formatCents,
  ok,
  parseAmount,
  type Budget,
  type BudgetAlert,
  type BudgetInput,
  type CategorySummary,
  type DomainError,
  type Expense,
  type ExpenseFilter,
  type ExpenseInput,
  type Money,
  type PeriodType,
  type Result,
} from '@expense-tracker/shared';

import type { SummaryPeriodRequest } from '../domain/summary-service.js';

// ---------------------------------------------------------------------------------------------
// Salida
// ---------------------------------------------------------------------------------------------

export interface ExpenseDto {
  id: string;
  amount: string;
  categoryId: string;
  date: string;
  description: string;
  createdAt: string;
}

export interface BudgetDto {
  id: string;
  limit: string;
  categoryId: string;
  periodType: PeriodType;
  periodStart: string;
  periodEnd: string;
}

export interface CategorySummaryDto {
  categoryId: string;
  categoryName: string;
  subtotal: string;
}

export interface BudgetAlertDto {
  budgetId: string;
  categoryId: string;
  level: BudgetAlert['level'];
  percentConsumed: number;
  amountOver?: string;
}

export interface TotalDto {
  total: string;
}

/** Céntimos → string con dos decimales ("123.45"). */
export function moneyToDto(cents: Money): string {
  return formatCents(cents);
}

export function expenseToDto(e: Expense): ExpenseDto {
  return {
    id: e.id,
    amount: formatCents(e.amount),
    categoryId: e.categoryId,
    date: e.date,
    description: e.description,
    createdAt: e.createdAt,
  };
}

export function budgetToDto(b: Budget): BudgetDto {
  return {
    id: b.id,
    limit: formatCents(b.limit),
    categoryId: b.categoryId,
    periodType: b.periodType,
    periodStart: b.periodStart,
    periodEnd: b.periodEnd,
  };
}

export function categorySummaryToDto(s: CategorySummary): CategorySummaryDto {
  return { categoryId: s.categoryId, categoryName: s.categoryName, subtotal: formatCents(s.subtotal) };
}

export function budgetAlertToDto(a: BudgetAlert): BudgetAlertDto {
  const dto: BudgetAlertDto = {
    budgetId: a.budgetId,
    categoryId: a.categoryId,
    level: a.level,
    percentConsumed: a.percentConsumed,
  };
  if (a.amountOver !== undefined) dto.amountOver = formatCents(a.amountOver);
  return dto;
}

export function totalToDto(cents: Money): TotalDto {
  return { total: formatCents(cents) };
}

// ---------------------------------------------------------------------------------------------
// Entrada: utilidades
// ---------------------------------------------------------------------------------------------

export const PERIOD_TYPES: readonly PeriodType[] = ['day', 'week', 'month', 'custom'];

export function isPeriodType(value: unknown): value is PeriodType {
  return typeof value === 'string' && (PERIOD_TYPES as readonly string[]).includes(value);
}

/**
 * Código usado cuando un campo llega con un tipo incorrecto (p. ej. un número en lugar de un
 * string, o un valor repetido en la query). Cada campo tiene un código específico con su mensaje.
 */
const FIELD_TYPE_ERROR = {
  amount: ErrorCode.AMOUNT_NOT_TEXT,
  limit: ErrorCode.BUDGET_LIMIT_NOT_TEXT,
  categoryId: ErrorCode.CATEGORY_ID_NOT_TEXT,
  date: ErrorCode.DATE_NOT_TEXT,
  description: ErrorCode.DESCRIPTION_NOT_TEXT,
  name: ErrorCode.CATEGORY_NAME_NOT_TEXT,
  periodType: ErrorCode.PERIOD_TYPE_INVALID,
  periodStart: ErrorCode.DATE_NOT_TEXT,
  periodEnd: ErrorCode.DATE_NOT_TEXT,
  referenceDate: ErrorCode.DATE_NOT_TEXT,
  dateFrom: ErrorCode.DATE_NOT_TEXT,
  dateTo: ErrorCode.DATE_NOT_TEXT,
  search: ErrorCode.SEARCH_TEXT_NOT_TEXT,
} as const satisfies Record<string, ErrorCode>;
type KnownField = keyof typeof FIELD_TYPE_ERROR;

function typeError(field: KnownField): DomainError {
  return domainError(FIELD_TYPE_ERROR[field], field);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Cuerpo como objeto; cualquier otro valor (ausente, JSON malformado, array...) cuenta como `{}`. */
function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

/** Lee un string obligatorio del cuerpo; añade el error del campo si no es un string. */
function requiredString(
  body: Record<string, unknown>,
  field: KnownField,
  errors: DomainError[],
): string {
  const value = body[field];
  if (typeof value === 'string') return value;
  errors.push(typeError(field));
  return '';
}

/**
 * Lee un parámetro de query opcional. Un string vacío equivale a ausente. Valores repetidos
 * (`?a=1&a=2`) u objetos (`?a[b]=1`) se rechazan con el error del campo.
 */
function optionalQueryString(
  query: Record<string, unknown>,
  field: KnownField,
  errors: DomainError[],
): string | undefined {
  const value = query[field];
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'string') return value;
  errors.push(typeError(field));
  return undefined;
}

/**
 * Convierte un importe recibido como string a céntimos con `parseAmount`. Un valor que no es
 * string devuelve AMOUNT_NOT_TEXT / BUDGET_LIMIT_NOT_TEXT según el campo.
 */
export function parseMoneyField(value: unknown, field: 'amount' | 'limit' = 'amount'): Result<Money> {
  if (typeof value !== 'string') return fail(typeError(field));
  return parseAmount(value, field);
}

// ---------------------------------------------------------------------------------------------
// Entrada: cuerpos
// ---------------------------------------------------------------------------------------------

/** Cuerpo de POST/PUT /api/expenses. `description` ausente o `null` equivale a sin descripción. */
export function parseExpenseBody(body: unknown): Result<ExpenseInput> {
  const b = asRecord(body);
  const errors: DomainError[] = [];

  const amount = requiredString(b, 'amount', errors);
  const categoryId = requiredString(b, 'categoryId', errors);
  const date = requiredString(b, 'date', errors);

  let description: string | undefined;
  if (typeof b.description === 'string') description = b.description;
  else if (b.description !== undefined && b.description !== null) errors.push(typeError('description'));

  if (errors.length > 0) return fail(...errors);
  const input: ExpenseInput = { amount, categoryId, date };
  if (description !== undefined) input.description = description;
  return ok(input);
}

/** Cuerpo de POST/PUT /api/categories: `{ name }`. */
export function parseCategoryBody(body: unknown): Result<{ name: string }> {
  const errors: DomainError[] = [];
  const name = requiredString(asRecord(body), 'name', errors);
  return errors.length > 0 ? fail(...errors) : ok({ name });
}

/**
 * Cuerpo de POST/PUT /api/budgets. Además de los tipos, valida `periodType` contra los valores
 * permitidos, ya que `BudgetService` no lo comprueba.
 */
export function parseBudgetBody(body: unknown): Result<BudgetInput> {
  const b = asRecord(body);
  const errors: DomainError[] = [];

  const limit = requiredString(b, 'limit', errors);
  const categoryId = requiredString(b, 'categoryId', errors);
  const periodType = b.periodType;
  if (!isPeriodType(periodType)) errors.push(typeError('periodType'));
  const periodStart = requiredString(b, 'periodStart', errors);
  const periodEnd = requiredString(b, 'periodEnd', errors);

  if (errors.length > 0 || !isPeriodType(periodType)) return fail(...errors);
  return ok({ limit, categoryId, periodType, periodStart, periodEnd });
}

// ---------------------------------------------------------------------------------------------
// Entrada: query
// ---------------------------------------------------------------------------------------------

/**
 * Query de GET /api/expenses: `categoryId`, `dateFrom`, `dateTo`, `search` (todos opcionales).
 * Las reglas de rango y longitud las aplica `ExpenseService.list` (validateExpenseFilter).
 */
export function parseExpenseFilterQuery(query: unknown): Result<ExpenseFilter> {
  const q = asRecord(query);
  const errors: DomainError[] = [];
  const filter: ExpenseFilter = {};

  const categoryId = optionalQueryString(q, 'categoryId', errors);
  const dateFrom = optionalQueryString(q, 'dateFrom', errors);
  const dateTo = optionalQueryString(q, 'dateTo', errors);
  const search = optionalQueryString(q, 'search', errors);

  if (errors.length > 0) return fail(...errors);
  if (categoryId !== undefined) filter.categoryId = categoryId;
  if (dateFrom !== undefined) filter.dateFrom = dateFrom;
  if (dateTo !== undefined) filter.dateTo = dateTo;
  if (search !== undefined) filter.search = search;
  return ok(filter);
}

/**
 * Query de los resúmenes (y de las alertas de presupuestos): `periodType` obligatorio y uno de
 * `day|week|month|custom`. Para `custom` son obligatorios `dateFrom` y `dateTo`; para el resto
 * `referenceDate` es opcional (por defecto la fecha del Clock). La validez de las fechas y del
 * rango la comprueba `resolvePeriod` en el servicio.
 */
export function parsePeriodQuery(query: unknown): Result<SummaryPeriodRequest> {
  const q = asRecord(query);
  const errors: DomainError[] = [];

  const periodType = q.periodType;
  if (!isPeriodType(periodType)) {
    return fail(typeError('periodType'));
  }

  if (periodType === 'custom') {
    const dateFrom = optionalQueryString(q, 'dateFrom', errors);
    const dateTo = optionalQueryString(q, 'dateTo', errors);
    if (dateFrom === undefined && !errors.some((e) => e.field === 'dateFrom')) {
      errors.push(domainError(ErrorCode.DATE_REQUIRED, 'dateFrom'));
    }
    if (dateTo === undefined && !errors.some((e) => e.field === 'dateTo')) {
      errors.push(domainError(ErrorCode.DATE_REQUIRED, 'dateTo'));
    }
    if (errors.length > 0 || dateFrom === undefined || dateTo === undefined) return fail(...errors);
    return ok({ type: 'custom', dateFrom, dateTo });
  }

  const referenceDate = optionalQueryString(q, 'referenceDate', errors);
  if (errors.length > 0) return fail(...errors);
  return ok(referenceDate === undefined ? { type: periodType } : { type: periodType, referenceDate });
}
