// Aplicación Express base (design.md, "Diseño de la API REST" y "Persistencia y arranque").
//
// Orden de registro:
//   1. `express.json()` con tolerancia a JSON malformado (ver `jsonBody`).
//   2. Rutas propias: GET /api/status y GET /api/config.
//   3. Routers de dominio (`RouterRegistration`), montados en el orden recibido.
//   4. ErrorMapper, siempre el último.

import type { Clock, DomainError } from '@expense-tracker/shared';
import express, { type Express, type RequestHandler, type Router } from 'express';

import type { ServerConfig } from '../config.js';
import type { BudgetService } from '../domain/budget-service.js';
import type { CategoryService } from '../domain/category-service.js';
import type { ExpenseService } from '../domain/expense-service.js';
import type { SummaryService } from '../domain/summary-service.js';
import { budgetsRouter } from './budgets-router.js';
import { categoriesRouter } from './categories-router.js';
import { createErrorMapper } from './error-mapper.js';
import { expensesRouter } from './expenses-router.js';
import { summaryRouter } from './summary-router.js';

/** Dependencias compartidas por todos los routers. */
export interface AppDeps {
  expenses: ExpenseService;
  categories: CategoryService;
  summary: SummaryService;
  budgets: BudgetService;
  /** Fecha actual, p. ej. para el periodo por defecto de las alertas. */
  clock: Clock;
  /** Presente si el arranque no pudo cargar los datos existentes (Req 8.5). */
  dataLoadError?: DomainError;
}

/** Parte de la configuración que afecta a la API. */
export type AppConfig = Pick<ServerConfig, 'budgetsEnabled'>;

/**
 * Router de dominio a montar bajo `path` (p. ej. `/api/expenses`). `create` recibe las
 * dependencias y la configuración y devuelve un `express.Router`.
 */
export interface RouterRegistration {
  path: string;
  create: (deps: AppDeps, config: AppConfig) => Router;
}

export interface CreateAppOptions {
  /** Routers de dominio. Por defecto `API_ROUTERS`. */
  routers?: readonly RouterRegistration[];
  /** Registro de errores no previstos. Por defecto `console.error`. */
  logError?: (message: string, error: unknown) => void;
}

/** Routers de dominio montados por defecto. */
export const API_ROUTERS: readonly RouterRegistration[] = [
  expensesRouter,
  categoriesRouter,
  summaryRouter,
  budgetsRouter,
];

/** Respuesta de GET /api/status. */
export interface StatusResponse {
  dataLoadError: { code: DomainError['code']; message: string } | null;
}

/** Respuesta de GET /api/config. */
export interface ConfigResponse {
  budgetsEnabled: boolean;
}

export function createApp(deps: AppDeps, config: AppConfig, options: CreateAppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(jsonBody());

  app.get('/api/status', (_req, res) => {
    const error = deps.dataLoadError;
    const body: StatusResponse = {
      dataLoadError: error ? { code: error.code, message: error.message } : null,
    };
    res.json(body);
  });

  app.get('/api/config', (_req, res) => {
    const body: ConfigResponse = { budgetsEnabled: config.budgetsEnabled };
    res.json(body);
  });

  for (const registration of options.routers ?? API_ROUTERS) {
    app.use(registration.path, registration.create(deps, config));
  }

  // Debe ir después de todos los routers.
  app.use(createErrorMapper(options.logError));
  return app;
}

/**
 * `express.json()` que no corta la petición si el cuerpo no se puede leer (JSON malformado,
 * demasiado grande o codificación no soportada). En ese caso el cuerpo queda `undefined` y los
 * parsers de `dto.ts` responden 400 con los errores del catálogo de cada campo obligatorio.
 */
function jsonBody(): RequestHandler {
  const parse = express.json();
  return (req, res, next) => {
    parse(req, res, (err?: unknown) => {
      if (err !== undefined && err !== null) {
        req.body = undefined;
        res.locals.bodyParseFailed = true;
      }
      next();
    });
  };
}
