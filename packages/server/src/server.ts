// Punto de entrada ejecutable del servidor (design.md, "Persistencia y arranque").
// `startServer()` es reutilizable; `main.ts` lo invoca y gestiona las señales.

import type { Server } from 'node:http';
import type { Clock } from '@expense-tracker/shared';

import { loadConfig, type ServerConfig } from './config.js';
import { BudgetService } from './domain/budget-service.js';
import { CategoryService } from './domain/category-service.js';
import { ExpenseService } from './domain/expense-service.js';
import { SummaryService } from './domain/summary-service.js';
import { createApp } from './http/app.js';
import { bootstrapDatabase } from './persistence/bootstrap.js';
import { SqliteBudgetRepository } from './persistence/sqlite/SqliteBudgetRepository.js';
import { SqliteCategoryRepository } from './persistence/sqlite/SqliteCategoryRepository.js';
import { SqliteExpenseRepository } from './persistence/sqlite/SqliteExpenseRepository.js';
import { SqliteTransactionRunner } from './persistence/sqlite/SqliteTransactionRunner.js';

/** Clock del sistema: fecha YYYY-MM-DD en la zona `timeZone` (o la local si es undefined). */
export function createSystemClock(timeZone?: string): Clock {
  // El locale en-CA formatea como YYYY-MM-DD.
  const format = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return { today: () => format.format(new Date()) };
}

export interface RunningServer {
  server: Server;
  /** Puerto real en el que escucha (útil con port 0). */
  port: number;
  /** Cierra el servidor HTTP y la conexión a la BD. Idempotente. */
  close: () => Promise<void>;
}

/** Arranca el servidor. `overrides` permite sustituir partes de la configuración del entorno. */
export async function startServer(overrides: Partial<ServerConfig> = {}): Promise<RunningServer> {
  const config: ServerConfig = { ...loadConfig(), ...overrides };

  const { db, dataLoadError } = bootstrapDatabase(config.dbPath);

  const expenseRepo = new SqliteExpenseRepository(db);
  const categoryRepo = new SqliteCategoryRepository(db);
  const budgetRepo = new SqliteBudgetRepository(db);
  const transactions = new SqliteTransactionRunner(db);
  const clock = createSystemClock(config.timeZone);

  const app = createApp(
    {
      expenses: new ExpenseService({
        expenses: expenseRepo,
        categories: categoryRepo,
        transactions,
        clock,
      }),
      categories: new CategoryService({
        categories: categoryRepo,
        expenses: expenseRepo,
        budgets: budgetRepo,
        transactions,
      }),
      summary: new SummaryService({ expenses: expenseRepo, categories: categoryRepo, clock }),
      budgets: new BudgetService({
        budgets: budgetRepo,
        categories: categoryRepo,
        expenses: expenseRepo,
        transactions,
      }),
      clock,
      ...(dataLoadError ? { dataLoadError } : {}),
    },
    { budgetsEnabled: config.budgetsEnabled },
  );

  let server: Server;
  try {
    server = await new Promise<Server>((resolve, reject) => {
      const s = app.listen(config.port, () => resolve(s));
      s.once('error', reject);
    });
  } catch (err) {
    db.close();
    throw err;
  }

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : config.port;

  let closing: Promise<void> | undefined;
  const close = (): Promise<void> => {
    closing ??= new Promise<void>((resolve, reject) => {
      server.close((err) => {
        try {
          db.close();
        } catch (dbErr) {
          reject(dbErr instanceof Error ? dbErr : new Error(String(dbErr)));
          return;
        }
        if (err) reject(err);
        else resolve();
      });
      server.closeAllConnections();
    });
    return closing;
  };

  return { server, port, close };
}
