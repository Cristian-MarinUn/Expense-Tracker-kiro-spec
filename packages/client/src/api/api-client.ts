// ApiClient: capa única de acceso HTTP. Convierte amount/limit entre string decimal (API) y céntimos
// (modelo de dominio) y normaliza los errores en ApiError.

import type {
  Budget,
  BudgetAlert,
  BudgetInput,
  Category,
  CategorySummary,
  Expense,
  ExpenseFilter,
  ExpenseInput,
  Money,
  PeriodType,
} from '@expense-tracker/shared';

import { ApiError, UNEXPECTED_ERROR_MESSAGE, networkError, parseErrorBody } from './api-error.js';

// ---------------------------------------------------------------------------------------------
// Tipos de la API
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
  level: 'warning' | 'exceeded';
  percentConsumed: number;
  amountOver?: string;
}

export interface StatusResponse {
  dataLoadError: { code: string; message: string } | null;
}

export interface ConfigResponse {
  budgetsEnabled: boolean;
}

/** Solicitud de periodo para resúmenes y alertas. */
export type PeriodQuery =
  | { periodType: 'day' | 'week' | 'month'; referenceDate?: string }
  | { periodType: 'custom'; dateFrom: string; dateTo: string };

// ---------------------------------------------------------------------------------------------
// Conversión string decimal ↔ céntimos
// ---------------------------------------------------------------------------------------------

/**
 * Convierte un string decimal del servidor ("123.45", "0.00") a céntimos con aritmética entera.
 * No usa parseAmount porque este rechaza el cero, que sí es válido en totales y excedentes.
 */
export function centsFromDto(value: string): Money {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value);
  if (match === null) {
    throw new ApiError('unexpected', [], UNEXPECTED_ERROR_MESSAGE);
  }
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) {
    throw new ApiError('unexpected', [], UNEXPECTED_ERROR_MESSAGE);
  }
  return cents;
}

export function expenseFromDto(dto: ExpenseDto): Expense {
  return {
    id: dto.id,
    amount: centsFromDto(dto.amount),
    categoryId: dto.categoryId,
    date: dto.date,
    description: dto.description,
    createdAt: dto.createdAt,
  };
}

export function budgetFromDto(dto: BudgetDto): Budget {
  return {
    id: dto.id,
    limit: centsFromDto(dto.limit),
    categoryId: dto.categoryId,
    periodType: dto.periodType,
    periodStart: dto.periodStart,
    periodEnd: dto.periodEnd,
  };
}

export function categorySummaryFromDto(dto: CategorySummaryDto): CategorySummary {
  return {
    categoryId: dto.categoryId,
    categoryName: dto.categoryName,
    subtotal: centsFromDto(dto.subtotal),
  };
}

export function budgetAlertFromDto(dto: BudgetAlertDto): BudgetAlert {
  const alert: BudgetAlert = {
    budgetId: dto.budgetId,
    categoryId: dto.categoryId,
    level: dto.level,
    percentConsumed: dto.percentConsumed,
  };
  if (dto.amountOver !== undefined) alert.amountOver = centsFromDto(dto.amountOver);
  return alert;
}

// ---------------------------------------------------------------------------------------------
// Transporte
// ---------------------------------------------------------------------------------------------

type QueryValue = string | undefined;

function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, value);
  }
  const text = search.toString();
  return text === '' ? '' : `?${text}`;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
}

/** Ejecuta la petición y devuelve el JSON (o `undefined` en 204). Lanza ApiError ante cualquier fallo. */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const init: RequestInit = { method: options.method ?? 'GET' };
  if (options.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw networkError();
  }

  if (response.status === 204) return undefined as T;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (response.ok) throw new ApiError('unexpected', [], UNEXPECTED_ERROR_MESSAGE, response.status);
    throw parseErrorBody(undefined, response.status);
  }

  if (!response.ok) throw parseErrorBody(body, response.status);
  return body as T;
}

function periodParams(period: PeriodQuery): Record<string, QueryValue> {
  return period.periodType === 'custom'
    ? { periodType: 'custom', dateFrom: period.dateFrom, dateTo: period.dateTo }
    : { periodType: period.periodType, referenceDate: period.referenceDate };
}

const enc = encodeURIComponent;

// ---------------------------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------------------------

export const apiClient = {
  // Gastos (Req 1, 2, 3, 5)
  async listExpenses(filter: ExpenseFilter = {}): Promise<Expense[]> {
    const dtos = await request<ExpenseDto[]>(
      `/api/expenses${buildQuery({
        categoryId: filter.categoryId,
        dateFrom: filter.dateFrom,
        dateTo: filter.dateTo,
        search: filter.search,
      })}`,
    );
    return dtos.map(expenseFromDto);
  },
  async getExpense(id: string): Promise<Expense> {
    return expenseFromDto(await request<ExpenseDto>(`/api/expenses/${enc(id)}`));
  },
  async createExpense(input: ExpenseInput): Promise<Expense> {
    return expenseFromDto(await request<ExpenseDto>('/api/expenses', { method: 'POST', body: input }));
  },
  async updateExpense(id: string, input: ExpenseInput): Promise<Expense> {
    return expenseFromDto(
      await request<ExpenseDto>(`/api/expenses/${enc(id)}`, { method: 'PUT', body: input }),
    );
  },
  async deleteExpense(id: string): Promise<void> {
    await request<void>(`/api/expenses/${enc(id)}`, { method: 'DELETE' });
  },

  // Categorías (Req 4)
  listCategories(): Promise<Category[]> {
    return request<Category[]>('/api/categories');
  },
  createCategory(name: string): Promise<Category> {
    return request<Category>('/api/categories', { method: 'POST', body: { name } });
  },
  renameCategory(id: string, name: string): Promise<Category> {
    return request<Category>(`/api/categories/${enc(id)}`, { method: 'PUT', body: { name } });
  },
  async deleteCategory(id: string): Promise<void> {
    await request<void>(`/api/categories/${enc(id)}`, { method: 'DELETE' });
  },

  // Resúmenes (Req 6)
  async getTotal(period: PeriodQuery): Promise<Money> {
    const dto = await request<{ total: string }>(
      `/api/summary/total${buildQuery(periodParams(period))}`,
    );
    return centsFromDto(dto.total);
  },
  async getSummaryByCategory(period: PeriodQuery): Promise<CategorySummary[]> {
    const dtos = await request<CategorySummaryDto[]>(
      `/api/summary/by-category${buildQuery(periodParams(period))}`,
    );
    return dtos.map(categorySummaryFromDto);
  },

  // Presupuestos (Req 7)
  async listBudgets(): Promise<Budget[]> {
    return (await request<BudgetDto[]>('/api/budgets')).map(budgetFromDto);
  },
  async createBudget(input: BudgetInput): Promise<Budget> {
    return budgetFromDto(await request<BudgetDto>('/api/budgets', { method: 'POST', body: input }));
  },
  async updateBudget(id: string, input: BudgetInput): Promise<Budget> {
    return budgetFromDto(
      await request<BudgetDto>(`/api/budgets/${enc(id)}`, { method: 'PUT', body: input }),
    );
  },
  async deleteBudget(id: string): Promise<void> {
    await request<void>(`/api/budgets/${enc(id)}`, { method: 'DELETE' });
  },
  async getBudgetAlerts(period: PeriodQuery): Promise<BudgetAlert[]> {
    const dtos = await request<BudgetAlertDto[]>(
      `/api/budgets/alerts${buildQuery(periodParams(period))}`,
    );
    return dtos.map(budgetAlertFromDto);
  },

  // Estado y configuración (Req 8)
  getStatus(): Promise<StatusResponse> {
    return request<StatusResponse>('/api/status');
  },
  getConfig(): Promise<ConfigResponse> {
    return request<ConfigResponse>('/api/config');
  },
};

export type ApiClient = typeof apiClient;
