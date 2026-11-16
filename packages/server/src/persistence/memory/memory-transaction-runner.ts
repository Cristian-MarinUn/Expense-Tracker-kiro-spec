// TransactionRunner en memoria: toma una instantánea del MemoryStore antes de ejecutar
// `fn` y la restaura si `fn` lanza. Las llamadas anidadas toman su propia instantánea,
// con el mismo efecto que los SAVEPOINT que usa better-sqlite3.

import type { TransactionRunner } from '../../domain/ports.js';
import type { MemoryStore } from './memory-store.js';

export class MemoryTransactionRunner implements TransactionRunner {
  constructor(private readonly store: MemoryStore) {}

  /** Ejecuta `fn` atómicamente. Si lanza, restaura el estado previo y propaga la excepción. */
  run<T>(fn: () => T): T {
    const snapshot = this.store.snapshot();
    try {
      const result = fn();
      if (isThenable(result)) {
        // better-sqlite3 rechaza las funciones de transacción asíncronas.
        throw new TypeError('Transaction function cannot return a promise');
      }
      return result;
    } catch (error) {
      this.store.restore(snapshot);
      throw error;
    }
  }
}

function isThenable(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}
