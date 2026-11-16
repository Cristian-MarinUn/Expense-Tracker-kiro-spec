// Tipos de dominio compartidos entre cliente y servidor (sección "Data Models" de design.md).

/** Importe en céntimos (entero), 1..99_999_999_999 para montos y límites. */
export type Money = number;

export type PeriodType = 'day' | 'week' | 'month' | 'custom';

export interface Expense {
  /** UUID asignado por el sistema. */
  id: string;
  /** Céntimos. */
  amount: Money;
  /** FK a Category. */
  categoryId: string;
  /** YYYY-MM-DD, no posterior a hoy. */
  date: string;
  /** 0..500 caracteres; "" si no se proporcionó. */
  description: string;
  /** ISO 8601, instante de creación. */
  createdAt: string;
}

export interface Category {
  /** UUID. */
  id: string;
  /** 1..50 caracteres, único sin distinguir mayúsculas. */
  name: string;
  /** true para la categoría predefinida inicial. */
  isSeed: boolean;
}

export interface Budget {
  /** UUID. */
  id: string;
  /** Céntimos, 1..99_999_999_999. */
  limit: Money;
  /** FK a Category. */
  categoryId: string;
  periodType: PeriodType;
  /** YYYY-MM-DD. */
  periodStart: string;
  /** YYYY-MM-DD, periodStart < periodEnd. */
  periodEnd: string;
}

export interface Period {
  type: PeriodType;
  /** YYYY-MM-DD, inclusivo. */
  start: string;
  /** YYYY-MM-DD, inclusivo. */
  end: string;
}

export interface CategorySummary {
  categoryId: string;
  categoryName: string;
  subtotal: Money;
}

export interface BudgetAlert {
  budgetId: string;
  categoryId: string;
  /** 'warning': 80%..<100%; 'exceeded': >=100%. */
  level: 'warning' | 'exceeded';
  /** floor(spent * 100 / limit). */
  percentConsumed: number;
  /** Monto excedido en céntimos, solo en 'exceeded'. */
  amountOver?: Money;
}

/** Entrada sin validar para crear o editar un gasto. El monto llega como string decimal. */
export interface ExpenseInput {
  /** String decimal, p. ej. "123.45"; se convierte a céntimos con parseAmount. */
  amount: string;
  categoryId: string;
  /** YYYY-MM-DD. */
  date: string;
  /** Opcional; si falta se usa "". */
  description?: string;
}

/** Entrada sin validar para crear o modificar un presupuesto. */
export interface BudgetInput {
  /** String decimal, p. ej. "500.00"; se convierte a céntimos con parseAmount. */
  limit: string;
  categoryId: string;
  periodType: PeriodType;
  /** YYYY-MM-DD. */
  periodStart: string;
  /** YYYY-MM-DD. */
  periodEnd: string;
}

/** Criterios del listado; un criterio ausente no filtra. Se combinan en conjunción lógica. */
export interface ExpenseFilter {
  categoryId?: string;
  /** YYYY-MM-DD, inclusivo. */
  dateFrom?: string;
  /** YYYY-MM-DD, inclusivo. */
  dateTo?: string;
  /** 1..100 caracteres; vacío equivale a sin filtro. */
  search?: string;
}
