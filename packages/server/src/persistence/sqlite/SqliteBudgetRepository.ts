// Implementación SQLite de BudgetRepository. Todas las consultas son parametrizadas.

import type { Budget, Period, PeriodType } from '@expense-tracker/shared';
import type { BudgetRepository } from '../../domain/ports.js';
import type { SqliteDatabase } from '../connection.js';
import { wrapSqlite } from './errors.js';

interface BudgetRow {
  id: string;
  limit_cents: number;
  category_id: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
}

const COLUMNS = 'id, limit_cents, category_id, period_type, period_start, period_end';

function toBudget(row: BudgetRow): Budget {
  return {
    id: row.id,
    limit: row.limit_cents,
    categoryId: row.category_id,
    periodType: row.period_type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
  };
}

function toParams(b: Budget) {
  return {
    id: b.id,
    limit_cents: b.limit,
    category_id: b.categoryId,
    period_type: b.periodType,
    period_start: b.periodStart,
    period_end: b.periodEnd,
  };
}

export class SqliteBudgetRepository implements BudgetRepository {
  constructor(private readonly db: SqliteDatabase) {}

  insert(b: Budget): void {
    wrapSqlite('insert budget', () => {
      this.db
        .prepare(
          `INSERT INTO budgets (${COLUMNS})
           VALUES (@id, @limit_cents, @category_id, @period_type, @period_start, @period_end)`,
        )
        .run(toParams(b));
    });
  }

  updateById(id: string, b: Budget): boolean {
    return wrapSqlite('update budget', () => {
      const info = this.db
        .prepare(
          `UPDATE budgets
              SET id = @id, limit_cents = @limit_cents, category_id = @category_id,
                  period_type = @period_type, period_start = @period_start,
                  period_end = @period_end
            WHERE id = @target_id`,
        )
        .run({ ...toParams(b), target_id: id });
      return info.changes > 0;
    });
  }

  deleteById(id: string): boolean {
    return wrapSqlite('delete budget', () => {
      const info = this.db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
      return info.changes > 0;
    });
  }

  findById(id: string): Budget | null {
    return wrapSqlite('find budget', () => {
      const row = this.db
        .prepare(`SELECT ${COLUMNS} FROM budgets WHERE id = ?`)
        .get(id) as BudgetRow | undefined;
      return row ? toBudget(row) : null;
    });
  }

  findByCategoryAndPeriod(categoryId: string, period: Period): Budget | null {
    return wrapSqlite('find budget by category and period', () => {
      const row = this.db
        .prepare(
          `SELECT ${COLUMNS} FROM budgets
            WHERE category_id = ? AND period_start = ? AND period_end = ?`,
        )
        .get(categoryId, period.start, period.end) as BudgetRow | undefined;
      return row ? toBudget(row) : null;
    });
  }

  list(): Budget[] {
    return wrapSqlite('list budgets', () => {
      const rows = this.db
        .prepare(`SELECT ${COLUMNS} FROM budgets ORDER BY period_start ASC, id ASC`)
        .all() as BudgetRow[];
      return rows.map(toBudget);
    });
  }

  countByCategory(categoryId: string): number {
    return wrapSqlite('count budgets by category', () => {
      const row = this.db
        .prepare('SELECT COUNT(*) AS n FROM budgets WHERE category_id = ?')
        .get(categoryId) as { n: number };
      return row.n;
    });
  }
}
