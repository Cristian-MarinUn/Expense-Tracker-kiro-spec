// Router de categorías (Category_Manager, Req 4). Ver design.md, "Diseño de la API REST >
// Categorías".
//
//   GET    /api/categories      → 200 + Category[] (incluye la sembrada, Req 4.7)
//   POST   /api/categories      → 201 + Category (Req 4.1); 400 CATEGORY_NAME_INVALID (Req 4.2),
//                                  409 CATEGORY_DUPLICATE (Req 4.4)
//   PUT    /api/categories/:id  → 200 + Category (Req 4.3); 400, 404 CATEGORY_ID_NOT_FOUND, 409
//   DELETE /api/categories/:id  → 204 (Req 4.5); 404, 409 CATEGORY_HAS_EXPENSES (Req 4.6),
//                                  409 CATEGORY_HAS_BUDGETS (Req 4.8)
//
// Los códigos HTTP salen del catálogo compartido mediante `sendDomainErrors`. Las excepciones no
// previstas llegan al ErrorMapper (Express 5 propaga las excepciones síncronas a `next`).

import type { Category } from '@expense-tracker/shared';
import { Router } from 'express';

import type { AppDeps, RouterRegistration } from './app.js';
import { parseCategoryBody } from './dto.js';
import { sendDomainErrors } from './error-mapper.js';

/** Representación JSON de una Category. */
export interface CategoryDto {
  id: string;
  name: string;
  isSeed: boolean;
}

export function categoryToDto(c: Category): CategoryDto {
  return { id: c.id, name: c.name, isSeed: c.isSeed };
}

export function createCategoriesRouter(deps: Pick<AppDeps, 'categories'>): Router {
  const router = Router();
  const service = deps.categories;

  router.get('/', (_req, res) => {
    const result = service.list();
    if (!result.ok) {
      sendDomainErrors(res, result.errors);
      return;
    }
    res.status(200).json(result.value.map(categoryToDto));
  });

  router.post('/', (req, res) => {
    const body = parseCategoryBody(req.body);
    if (!body.ok) {
      sendDomainErrors(res, body.errors);
      return;
    }
    const result = service.create(body.value.name);
    if (!result.ok) {
      sendDomainErrors(res, result.errors);
      return;
    }
    res.status(201).json(categoryToDto(result.value));
  });

  router.put('/:id', (req, res) => {
    const body = parseCategoryBody(req.body);
    if (!body.ok) {
      sendDomainErrors(res, body.errors);
      return;
    }
    const result = service.rename(req.params.id, body.value.name);
    if (!result.ok) {
      sendDomainErrors(res, result.errors);
      return;
    }
    res.status(200).json(categoryToDto(result.value));
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
}

/** Registro para montar el router bajo `/api/categories`. */
export const categoriesRouter: RouterRegistration = {
  path: '/api/categories',
  create: (deps) => createCategoriesRouter(deps),
};
