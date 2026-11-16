// Traducción de fallos de SQLite a PersistenceError (design.md, "Error Handling").

import { PersistenceError } from '../../domain/ports.js';

/**
 * Ejecuta `fn` y envuelve cualquier excepción que no sea ya un PersistenceError
 * en un PersistenceError, conservando la original como `cause`.
 */
export function wrapSqlite<T>(operation: string, fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    throw toPersistenceError(operation, err);
  }
}

export function toPersistenceError(operation: string, err: unknown): PersistenceError {
  if (err instanceof PersistenceError) return err;
  const detail = err instanceof Error ? err.message : String(err);
  return new PersistenceError(`${operation}: ${detail}`, { cause: err });
}
