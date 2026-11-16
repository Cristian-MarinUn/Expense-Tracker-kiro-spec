// Implementación SQLite de ExpenseRepository. Todas las consultas son parametrizadas.

import type { Expense, ExpenseFilter, Period } from '@expense-tracker/shared';
import type { ExpenseRepository } from '../../domain/ports.js';
import type { SqliteDatabase } from '../connection.js';
import { wrapSqlite } from './errors.js';

interface ExpenseRow {
  id: string;
  amount_cents: number;
  category_id: string;
  date: string;
  description: string;
  created_at: string;
}

const COLUMNS = 'id, amount_cents, category_id, date, description, created_at';

function toExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: row.amount_cents,
    categoryId: row.category_id,
    date: row.date,
    description: row.description,
    createdAt: row.created_at,
  };
}

function toParams(e: Expense) {
  return {
    id: e.id,
    amount_cents: e.amount,
    category_id: e.categoryId,
    date: e.date,
    description: e.description,
    created_at: e.createdAt,
  };
}

export class SqliteExpenseRepository implements ExpenseRepository {
  constructor(private readonly db: SqliteDatabase) {}

  insert(e: Expense): void {
    wrapSqlite('insert expense', () => {
      this.db
        .prepare(
          `INSERT INTO expenses (${COLUMNS})
           VALUES (@id, @amount_cents, @category_id, @date, @description, @created_at)`,
        )
        .run(toParams(e));
    });
  }

  updateById(id: string, e: Expense): boolean {
    return wrapSqlite('update expense', () => {
      const info = this.db
        .prepare(
          `UPDATE expenses
              SET id = @id, amount_cents = @amount_cents, category_id = @category_id,
                  date = @date, description = @description, created_at = @created_at
            WHERE id = @target_id`,
        )
        .run({ ...toParams(e), target_id: id });
      return info.changes > 0;
    });
  }

  deleteById(id: string): boolean {
    return wrapSqlite('delete expense', () => {
      const info = this.db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
      return info.changes > 0;
    });
  }

  findById(id: string): Expense | null {
    return wrapSqlite('find expense', () => {
      const row = this.db
        .prepare(`SELECT ${COLUMNS} FROM expenses WHERE id = ?`)
        .get(id) as ExpenseRow | undefined;
      return row ? toExpense(row) : null;
    });
  }

  /** Filtra por categoría y rango de fechas en SQL; la búsqueda de texto la aplica el dominio. */
  query(filter: ExpenseFilter): Expense[] {
    return wrapSqlite('query expenses', () => {
      const conditions: string[] = [];
      const params: Record<string, string> = {};
      if (filter.categoryId !== undefined) {
        conditions.push('category_id = @categoryId');
        params.categoryId = filter.categoryId;
      }
      if (filter.dateFrom !== undefined) {
        conditions.push('date >= @dateFrom');
        params.dateFrom = filter.dateFrom;
      }
      if (filter.dateTo !== undefined) {
        conditions.push('date <= @dateTo');
        params.dateTo = filter.dateTo;
      }
      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const rows = this.db
        .prepare(
          `SELECT ${COLUMNS} FROM expenses ${where}
           ORDER BY date DESC, created_at DESC, id ASC`,
        )
        .all(params) as ExpenseRow[];
      return rows.map(toExpense);
    });
  }

  sumByCategoryInPeriod(period: Period): Map<string, number> {
    return wrapSqlite('sum expenses by category', () => {
      const rows = this.db
        .prepare(
          `SELECT category_id, SUM(amount_cents) AS total
             FROM expenses
            WHERE date >= ? AND date <= ?
            GROUP BY category_id`,
        )
        .all(period.start, period.end) as { category_id: string; total: number }[];
      return new Map(rows.map((r) => [r.category_id, r.total]));
    });
  }

  countByCategory(categoryId: string): number {
    return wrapSqlite('count expenses by category', () => {
      const row = this.db
        .prepare('SELECT COUNT(*) AS n FROM expenses WHERE category_id = ?')
        .get(categoryId) as { n: number };
      return row.n;
    });
  }
}
