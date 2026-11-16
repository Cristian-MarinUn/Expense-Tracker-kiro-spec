// Hooks de React Query sobre el ApiClient. Cada mutación invalida las consultas afectadas.

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
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
} from '@expense-tracker/shared';

import {
  apiClient,
  type ConfigResponse,
  type PeriodQuery,
  type StatusResponse,
} from './api-client.js';
import type { ApiError } from './api-error.js';

export const queryKeys = {
  expenses: ['expenses'] as const,
  expenseList: (filter: ExpenseFilter) => ['expenses', 'list', filter] as const,
  categories: ['categories'] as const,
  summary: ['summary'] as const,
  summaryTotal: (period: PeriodQuery) => ['summary', 'total', period] as const,
  summaryByCategory: (period: PeriodQuery) => ['summary', 'by-category', period] as const,
  budgets: ['budgets'] as const,
  budgetList: ['budgets', 'list'] as const,
  budgetAlerts: (period: PeriodQuery) => ['budgets', 'alerts', period] as const,
  status: ['status'] as const,
  config: ['config'] as const,
};

// ---------------------------------------------------------------------------------------------
// Invalidación
// ---------------------------------------------------------------------------------------------

/** Cambios en gastos afectan a listados, resúmenes y alertas de presupuestos. */
function invalidateExpenseData(qc: QueryClient): Promise<unknown> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.expenses }),
    qc.invalidateQueries({ queryKey: queryKeys.summary }),
    qc.invalidateQueries({ queryKey: queryKeys.budgets }),
  ]);
}

/** Cambios en categorías afectan además a nombres en resúmenes y gastos. */
function invalidateCategoryData(qc: QueryClient): Promise<unknown> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: queryKeys.categories }),
    invalidateExpenseData(qc),
  ]);
}

function invalidateBudgetData(qc: QueryClient): Promise<unknown> {
  return qc.invalidateQueries({ queryKey: queryKeys.budgets });
}

// ---------------------------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------------------------

export function useExpenses(filter: ExpenseFilter = {}): UseQueryResult<Expense[], ApiError> {
  return useQuery({
    queryKey: queryKeys.expenseList(filter),
    queryFn: () => apiClient.listExpenses(filter),
    placeholderData: keepPreviousData,
  });
}

export function useCategories(): UseQueryResult<Category[], ApiError> {
  return useQuery({ queryKey: queryKeys.categories, queryFn: () => apiClient.listCategories() });
}

export function useSummaryTotal(period: PeriodQuery): UseQueryResult<Money, ApiError> {
  return useQuery({ queryKey: queryKeys.summaryTotal(period), queryFn: () => apiClient.getTotal(period) });
}

export function useSummaryByCategory(
  period: PeriodQuery,
): UseQueryResult<CategorySummary[], ApiError> {
  return useQuery({
    queryKey: queryKeys.summaryByCategory(period),
    queryFn: () => apiClient.getSummaryByCategory(period),
  });
}

export function useBudgets(options: { enabled?: boolean } = {}): UseQueryResult<Budget[], ApiError> {
  return useQuery({
    queryKey: queryKeys.budgetList,
    queryFn: () => apiClient.listBudgets(),
    enabled: options.enabled ?? true,
  });
}

export function useBudgetAlerts(
  period: PeriodQuery,
  options: { enabled?: boolean } = {},
): UseQueryResult<BudgetAlert[], ApiError> {
  return useQuery({
    queryKey: queryKeys.budgetAlerts(period),
    queryFn: () => apiClient.getBudgetAlerts(period),
    enabled: options.enabled ?? true,
  });
}

export function useStatus(): UseQueryResult<StatusResponse, ApiError> {
  return useQuery({ queryKey: queryKeys.status, queryFn: () => apiClient.getStatus() });
}

export function useConfig(): UseQueryResult<ConfigResponse, ApiError> {
  return useQuery({ queryKey: queryKeys.config, queryFn: () => apiClient.getConfig() });
}

// ---------------------------------------------------------------------------------------------
// Mutaciones
// ---------------------------------------------------------------------------------------------

export function useCreateExpense(): UseMutationResult<Expense, ApiError, ExpenseInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => apiClient.createExpense(input),
    onSuccess: () => invalidateExpenseData(qc),
  });
}

export function useUpdateExpense(): UseMutationResult<
  Expense,
  ApiError,
  { id: string; input: ExpenseInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExpenseInput }) =>
      apiClient.updateExpense(id, input),
    onSuccess: () => invalidateExpenseData(qc),
  });
}

export function useDeleteExpense(): UseMutationResult<void, ApiError, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteExpense(id),
    onSuccess: () => invalidateExpenseData(qc),
  });
}

export function useCreateCategory(): UseMutationResult<Category, ApiError, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiClient.createCategory(name),
    onSuccess: () => invalidateCategoryData(qc),
  });
}

export function useRenameCategory(): UseMutationResult<
  Category,
  ApiError,
  { id: string; name: string }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => apiClient.renameCategory(id, name),
    onSuccess: () => invalidateCategoryData(qc),
  });
}

export function useDeleteCategory(): UseMutationResult<void, ApiError, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteCategory(id),
    onSuccess: () => invalidateCategoryData(qc),
  });
}

export function useCreateBudget(): UseMutationResult<Budget, ApiError, BudgetInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BudgetInput) => apiClient.createBudget(input),
    onSuccess: () => invalidateBudgetData(qc),
  });
}

export function useUpdateBudget(): UseMutationResult<
  Budget,
  ApiError,
  { id: string; input: BudgetInput }
> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BudgetInput }) =>
      apiClient.updateBudget(id, input),
    onSuccess: () => invalidateBudgetData(qc),
  });
}

export function useDeleteBudget(): UseMutationResult<void, ApiError, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteBudget(id),
    onSuccess: () => invalidateBudgetData(qc),
  });
}
