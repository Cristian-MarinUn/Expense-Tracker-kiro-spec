import { MemoryStore } from './memory-store.js';
import {
  MemoryBudgetRepository,
  MemoryCategoryRepository,
  MemoryExpenseRepository,
} from './memory-repositories.js';
import { MemoryTransactionRunner } from './memory-transaction-runner.js';

export { MemoryStore } from './memory-store.js';
export type { CategoryRow, MemoryStoreSnapshot } from './memory-store.js';
export {
  MemoryBudgetRepository,
  MemoryCategoryRepository,
  MemoryExpenseRepository,
} from './memory-repositories.js';
export { MemoryTransactionRunner } from './memory-transaction-runner.js';
export { FailingRepository, WRITE_METHODS } from './failing-repository.js';
export type { FailingRepositoryOptions } from './failing-repository.js';

/** Data_Store en memoria completo: los tres repositorios y el runner sobre un único almacén. */
export function createMemoryDataStore(store: MemoryStore = new MemoryStore()) {
  return {
    store,
    expenses: new MemoryExpenseRepository(store),
    categories: new MemoryCategoryRepository(store),
    budgets: new MemoryBudgetRepository(store),
    transactions: new MemoryTransactionRunner(store),
  };
}
