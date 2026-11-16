// Especificación de referencia del Summary_Engine (Req 6).
// Ver design.md, sección "Summary_Engine > Total y resumen por categoría".

import type { Category, CategorySummary, Expense, Money, Period } from '@expense-tracker/shared';

/** true si la fecha del gasto está dentro del Period, ambos extremos incluidos (Req 6.1). */
export function isInPeriod(expense: Expense, period: Period): boolean {
  return period.start <= expense.date && expense.date <= period.end;
}

/** Suma en céntimos de los gastos del Period; 0 si no hay ninguno (Req 6.1, 6.4). */
export function totalForPeriod(expenses: readonly Expense[], period: Period): Money {
  let total = 0;
  for (const e of expenses) {
    if (isInPeriod(e, period)) total += e.amount;
  }
  return total;
}

/**
 * Subtotales por Category dentro del Period (Req 6.2). Solo incluye categorías con al
 * menos un gasto en el periodo (Req 6.3) y devuelve `[]` si no hay gastos (Req 6.4).
 * Orden: `subtotal` desc y, en empate, `categoryName` asc (luego `categoryId` asc para
 * que el resultado sea determinista). Si un gasto referencia una Category que no está en
 * `categories`, se usa su `categoryId` como nombre.
 */
export function summaryByCategory(
  expenses: readonly Expense[],
  categories: readonly Category[],
  period: Period,
): CategorySummary[] {
  const subtotals = new Map<string, Money>();
  for (const e of expenses) {
    if (!isInPeriod(e, period)) continue;
    subtotals.set(e.categoryId, (subtotals.get(e.categoryId) ?? 0) + e.amount);
  }

  const names = new Map(categories.map((c) => [c.id, c.name]));
  const result: CategorySummary[] = [];
  for (const [categoryId, subtotal] of subtotals) {
    result.push({ categoryId, categoryName: names.get(categoryId) ?? categoryId, subtotal });
  }

  return result.sort((a, b) => {
    if (a.subtotal !== b.subtotal) return b.subtotal - a.subtotal;
    if (a.categoryName !== b.categoryName) return a.categoryName < b.categoryName ? -1 : 1;
    if (a.categoryId !== b.categoryId) return a.categoryId < b.categoryId ? -1 : 1;
    return 0;
  });
}
