// TransactionRunner sobre db.transaction(fn) de better-sqlite3: si `fn` lanza, se hace
// ROLLBACK automáticamente. Las llamadas anidadas usan SAVEPOINT.

import type { TransactionRunner } from '../../domain/ports.js';
import type { SqliteDatabase } from '../connection.js';
import { toPersistenceError } from './errors.js';

export class SqliteTransactionRunner implements TransactionRunner {
  constructor(private readonly db: SqliteDatabase) {}

  /**
   * Ejecuta `fn` en una transacción y devuelve su valor.
   * - Si `fn` lanza, se revierte y la excepción se propaga sin cambios (los repositorios
   *   ya envuelven sus fallos de SQLite en PersistenceError).
   * - Si falla el propio BEGIN/COMMIT/ROLLBACK de SQLite, se lanza PersistenceError.
   */
  run<T>(fn: () => T): T {
    let fnThrew = false;
    const tx = this.db.transaction((): T => {
      try {
        return fn();
      } catch (error) {
        fnThrew = true;
        throw error;
      }
    });
    try {
      return tx();
    } catch (err) {
      if (fnThrew) throw err;
      throw toPersistenceError('transaction', err);
    }
  }
}
