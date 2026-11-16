// Implementación SQLite de CategoryRepository. Mantiene `name_lower` para la unicidad
// e igualdad de nombres sin distinguir mayúsculas.

import type { Category } from '@expense-tracker/shared';
import type { CategoryRepository } from '../../domain/ports.js';
import type { SqliteDatabase } from '../connection.js';
import { wrapSqlite } from './errors.js';

interface CategoryRow {
  id: string;
  name: string;
  is_seed: number;
}

const COLUMNS = 'id, name, is_seed';

function toCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, isSeed: row.is_seed === 1 };
}

function toParams(c: Category) {
  return {
    id: c.id,
    name: c.name,
    name_lower: c.name.toLowerCase(),
    is_seed: c.isSeed ? 1 : 0,
  };
}

export class SqliteCategoryRepository implements CategoryRepository {
  constructor(private readonly db: SqliteDatabase) {}

  insert(c: Category): void {
    wrapSqlite('insert category', () => {
      this.db
        .prepare(
          `INSERT INTO categories (id, name, name_lower, is_seed)
           VALUES (@id, @name, @name_lower, @is_seed)`,
        )
        .run(toParams(c));
    });
  }

  updateById(id: string, c: Category): boolean {
    return wrapSqlite('update category', () => {
      const info = this.db
        .prepare(
          `UPDATE categories
              SET id = @id, name = @name, name_lower = @name_lower, is_seed = @is_seed
            WHERE id = @target_id`,
        )
        .run({ ...toParams(c), target_id: id });
      return info.changes > 0;
    });
  }

  deleteById(id: string): boolean {
    return wrapSqlite('delete category', () => {
      const info = this.db.prepare('DELETE FROM categories WHERE id = ?').run(id);
      return info.changes > 0;
    });
  }

  findById(id: string): Category | null {
    return wrapSqlite('find category', () => {
      const row = this.db
        .prepare(`SELECT ${COLUMNS} FROM categories WHERE id = ?`)
        .get(id) as CategoryRow | undefined;
      return row ? toCategory(row) : null;
    });
  }

  findByNameInsensitive(name: string): Category | null {
    return wrapSqlite('find category by name', () => {
      const row = this.db
        .prepare(`SELECT ${COLUMNS} FROM categories WHERE name_lower = ?`)
        .get(name.toLowerCase()) as CategoryRow | undefined;
      return row ? toCategory(row) : null;
    });
  }

  list(): Category[] {
    return wrapSqlite('list categories', () => {
      const rows = this.db
        .prepare(`SELECT ${COLUMNS} FROM categories ORDER BY name_lower ASC, id ASC`)
        .all() as CategoryRow[];
      return rows.map(toCategory);
    });
  }
}
