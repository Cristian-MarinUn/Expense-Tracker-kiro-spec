// Router de presupuestos (design.md, "Diseño de la API REST > Presupuestos" y
// "Budget_Manager > Flag budgetsEnabled").
//
//   GET    /api/budgets         → 200 + BudgetDto[]
//   POST   /api/budgets         → 201 + BudgetDto              (Req 7.1, 7.5, 7.6)
//   PUT    /api/budgets/:id     → 200 + BudgetDto              (Req 7.2, 7.5, 7.6)
//   DELETE /api/budgets/:id     → 204
//   GET    /api/budgets/alerts  → 200 + BudgetAlertDto[]       (Req 7.3, 7.4)
//
// Si `budgetsEnabled` es `false`, todas las rutas responden 404 BUDGETS_DISABLED.
//
// Query de `/alerts`: la misma que los resúmenes (`periodType`, `referenceDate`, `dateFrom`,
// `dateTo`). Si no se indica `periodType`, se usa el mes actual según `deps.clock`. Para
// `day|week|month` sin `referenceDate` se usa `deps.clock.today()`.

import {
  ErrorCode,
  domainError,
  resolvePeriod,
  type PeriodRequest,
} from '@expense-tracker/shared';
import { Router } from 'express';

import type { RouterRegistration } from './app.js';
import { budgetAlertToDto, budgetToDto, parseBudgetBody, parsePeriodQuery } from './dto.js';
import { sendDomainErrors } from './error-mapper.js';

export const budgetsRouter: RouterRegistration = {
  path: '/api/budgets',
  create: (deps, config) => {
    const router = Router();
    const service = deps.budgets;

    // Debe ir antes que cualquier ruta: corta todas las peticiones a /api/budgets*.
    router.use((_req, res, next) => {
      if (!config.budgetsEnabled) {
        sendDomainErrors(res, [domainError(ErrorCode.BUDGETS_DISABLED)]);
        return;
      }
      next();
    });

    router.get('/', (_req, res) => {
      const result = service.list();
      if (!result.ok) {
        sendDomainErrors(res, result.errors);
        return;
      }
      res.status(200).json(result.value.map(budgetToDto));
    });

    // Registrada antes de `/:id` para que "alerts" no se interprete como identificador.
    router.get('/alerts', (req, res) => {
      const query = req.query as Record<string, unknown>;
      let request: PeriodRequest;
      if (query.periodType === undefined || query.periodType === '') {
        request = { type: 'month', referenceDate: deps.clock.today() };
      } else {
        const parsed = parsePeriodQuery(query);
        if (!parsed.ok) {
          sendDomainErrors(res, parsed.errors);
          return;
        }
        const p = parsed.value;
        request =
          p.type === 'custom'
            ? p
            : { type: p.type, referenceDate: p.referenceDate ?? deps.clock.today() };
      }

      const period = resolvePeriod(request);
      if (!period.ok) {
        sendDomainErrors(res, period.errors);
        return;
      }
      const alerts = service.evaluateAlerts(period.value);
      if (!alerts.ok) {
        sendDomainErrors(res, alerts.errors);
        return;
      }
      res.status(200).json(alerts.value.map(budgetAlertToDto));
    });

    router.get('/:id', (req, res) => {
      const result = service.get(req.params.id);
      if (!result.ok) {
        sendDomainErrors(res, result.errors);
        return;
      }
      res.status(200).json(budgetToDto(result.value));
    });

    router.post('/', (req, res) => {
      const input = parseBudgetBody(req.body);
      if (!input.ok) {
        sendDomainErrors(res, input.errors);
        return;
      }
      const result = service.create(input.value);
      if (!result.ok) {
        sendDomainErrors(res, result.errors);
        return;
      }
      res.status(201).json(budgetToDto(result.value));
    });

    router.put('/:id', (req, res) => {
      const id = req.params.id;
      const input = parseBudgetBody(req.body);
      if (!input.ok) {
        // Un presupuesto inexistente tiene prioridad (404) sobre los errores de tipos (400).
        const existing = service.get(id);
        sendDomainErrors(res, existing.ok ? input.errors : existing.errors);
        return;
      }
      const result = service.update(id, input.value);
      if (!result.ok) {
        sendDomainErrors(res, result.errors);
        return;
      }
      res.status(200).json(budgetToDto(result.value));
    });

    router.delete('/:id', (req, res) => {
      const result = service.delete(req.params.id);
      if (!result.ok) {
        sendDomainErrors(res, result.errors);
        return;
      }
      res.status(204).end();
    });

    return router;
  },
};
