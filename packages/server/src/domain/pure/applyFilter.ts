// Especificación de referencia del listado (Expense_List_View, Req 5).
// Ver design.md, sección "Listado, filtros y búsqueda".

import { matchesSearch } from '@expense-tracker/shared';
import type { Expense, ExpenseFilter } from '@expense-tracker/shared';

/**
 * Orden total del listado: `date` desc, `createdAt` desc y, como último desempate,
 * `id` asc (Req 5.1). Las fechas `YYYY-MM-DD` y los instantes ISO 8601 se comparan
 * como strings porque su orden lexicográfico coincide con el cronológico.
 */
export function compareExpensesForList(a: Expense, b: Expense): number {
  if (a.date !== b.date) return a.date > b.date ? -1 : 1;
  if (a.createdAt !== b.createdAt) return a.createdAt > b.createdAt ? -1 : 1;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return 0;
}

/**
 * Aplica los criterios presentes en conjunción lógica (Req 5.6): Category exacta (5.2),
 * rango de fechas inclusivo (5.3) y búsqueda insensible a mayúsculas y acentos (5.5).
 * Un criterio ausente (o una búsqueda vacía) no filtra. No valida el filtro: la
 * validación (rango invertido, longitud de búsqueda) ocurre antes, en el servicio.
 * Devuelve un arreglo nuevo; no modifica la entrada.
 */
export function applyFilter(expenses: readonly Expense[], filter: ExpenseFilter): Expense[] {
  const { categoryId, dateFrom, dateTo, search } = filter;
  const hasSearch = search !== undefined && search !== '';

  return expenses
    .filter(
      (e) =>
        (categoryId === undefined || e.categoryId === categoryId) &&
        (dateFrom === undefined || e.date >= dateFrom) &&
        (dateTo === undefined || e.date <= dateTo) &&
        (!hasSearch || matchesSearch(e.description, search)),
    )
    .sort(compareExpensesForList);
}
