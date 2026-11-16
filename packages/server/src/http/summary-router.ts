// Router de resúmenes (design.md, "Diseño de la API REST > Resúmenes", Req 6).
//
//   GET /api/summary/total        → 200 { total: "0.00" }          (Req 6.1, 6.4, 6.5)
//   GET /api/summary/by-category  → 200 CategorySummaryDto[]       (Req 6.2, 6.3, 6.4, 6.5)
//
// Query: `periodType` (day|week|month|custom), `referenceDate` opcional para day/week/month y
// `dateFrom`/`dateTo` obligatorios para custom. Un rango invertido devuelve 400
// INVALID_DATE_RANGE sin calcular nada (Req 6.6). Las excepciones no previstas llegan al
// ErrorMapper (Express 5 propaga las excepciones síncronas de los handlers).

import { Router } from 'express';

import type { RouterRegistration } from './app.js';
import { categorySummaryToDto, parsePeriodQuery, totalToDto } from './dto.js';
import { sendDomainErrors } from './error-mapper.js';

export const summaryRouter: RouterRegistration = {
  path: '/api/summary',
  create: (deps) => {
    const router = Router();

    router.get('/total', (req, res) => {
      const request = parsePeriodQuery(req.query);
      if (!request.ok) {
        sendDomainErrors(res, request.errors);
        return;
      }
      const result = deps.summary.totalForPeriod(request.value);
      if (!result.ok) {
        sendDomainErrors(res, result.errors);
        return;
      }
      res.status(200).json(totalToDto(result.value));
    });

    router.get('/by-category', (req, res) => {
      const request = parsePeriodQuery(req.query);
      if (!request.ok) {
        sendDomainErrors(res, request.errors);
        return;
      }
      const result = deps.summary.summaryByCategory(request.value);
      if (!result.ok) {
        sendDomainErrors(res, result.errors);
        return;
      }
      res.status(200).json(result.value.map(categorySummaryToDto));
    });

    return router;
  },
};
