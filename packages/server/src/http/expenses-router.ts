// Router de gastos (design.md, "Diseño de la API REST > Gastos").
//
//   POST   /api/expenses       → 201 + ExpenseDto            (Req 1.1, 1.2)
//   PUT    /api/expenses/:id   → 200 + ExpenseDto            (Req 2.1, 2.2, 2.3)
//   DELETE /api/expenses/:id   → 204                         (Req 3.2, 3.4, 3.5)
//   GET    /api/expenses       → 200 + ExpenseDto[] ordenado (Req 5.1–5.7)
//   GET    /api/expenses/:id   → 200 + ExpenseDto
//
// La validación de tipos se hace con los parsers de `dto.ts`; las reglas de negocio y los
// errores de persistencia los devuelve `ExpenseService`. Los errores se envían con
// `sendDomainErrors` (código HTTP de mayor prioridad del catálogo). Las excepciones no
// previstas llegan al ErrorMapper (Express 5 propaga las excepciones de los handlers).

import { Router } from 'express';

import type { RouterRegistration } from './app.js';
import { expenseToDto, parseExpenseBody, parseExpenseFilterQuery } from './dto.js';
import { sendDomainErrors } from './error-mapper.js';

export const expensesRouter: RouterRegistration = {
  path: '/api/expenses',
  create: (deps) => {
    const router = Router();
    const service = deps.expenses;

    router.get('/', (req, res) => {
      const filter = parseExpenseFilterQuery(req.query);
      if (!filter.ok) {
        sendDomainErrors(res, filter.errors);
        return;
      }
      const result = service.list(filter.value);
      if (!result.ok) {
        sendDomainErrors(res, result.errors);
        return;
      }
      // Lista vacía → 200 con [] (la UI muestra el mensaje de "sin coincidencias", Req 5.7).
      res.status(200).json(result.value.map(expenseToDto));
    });

    router.get('/:id', (req, res) => {
      const result = service.get(req.params.id);
      if (!result.ok) {
        sendDomainErrors(res, result.errors);
        return;
      }
      res.status(200).json(expenseToDto(result.value));
    });

    router.post('/', (req, res) => {
      const input = parseExpenseBody(req.body);
      if (!input.ok) {
        sendDomainErrors(res, input.errors);
        return;
      }
      const result = service.create(input.value);
      if (!result.ok) {
        sendDomainErrors(res, result.errors);
        return;
      }
      res.status(201).json(expenseToDto(result.value));
    });

    router.put('/:id', (req, res) => {
      const id = req.params.id;
      const input = parseExpenseBody(req.body);
      if (!input.ok) {
        // Un gasto inexistente tiene prioridad (404) sobre los errores de tipos (400) (Req 2.3).
        const existing = service.get(id);
        sendDomainErrors(res, existing.ok ? input.errors : existing.errors);
        return;
      }
      const result = service.update(id, input.value);
      if (!result.ok) {
        sendDomainErrors(res, result.errors);
        return;
      }
      res.status(200).json(expenseToDto(result.value));
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
