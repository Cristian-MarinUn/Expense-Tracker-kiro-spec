// ErrorMapper (design.md, "Error Handling > Estrategia general").
//
// - Los DomainError se envían como `{ errors: [...] }` con el código HTTP de mayor prioridad
//   (500 > 404 > 409 > 400) según el catálogo de `@expense-tracker/shared`.
// - Cualquier otra excepción se registra con su traza y se responde con `500` y
//   INTERNAL_ERROR, sin exponer detalles internos al cliente.
//
// Los routers pueden responder con `sendDomainErrors(res, errors)` directamente o lanzar /
// pasar a `next()` un `HttpDomainError`; ambos caminos producen la misma respuesta.

import {
  ErrorCode,
  domainError,
  httpStatusForErrors,
  type DomainError,
} from '@expense-tracker/shared';
import type { ErrorRequestHandler, Response } from 'express';

/** Cuerpo uniforme de las respuestas de error. */
export interface ErrorResponseBody {
  errors: DomainError[];
}

/** Excepción que transporta errores de dominio hasta el ErrorMapper. */
export class HttpDomainError extends Error {
  readonly errors: readonly DomainError[];

  constructor(errors: readonly DomainError[]) {
    super(errors.map((e) => e.code).join(', ') || 'DomainError');
    this.name = 'HttpDomainError';
    this.errors = errors;
  }
}

/** Copia solo los campos públicos de cada error (code, message y field si existe). */
export function toErrorBody(errors: readonly DomainError[]): ErrorResponseBody {
  return {
    errors: errors.map((e) => {
      const out: DomainError = { code: e.code, message: e.message };
      if (e.field !== undefined) out.field = e.field;
      return out;
    }),
  };
}

/** Envía `{ errors }` con el código HTTP de mayor prioridad entre los errores. */
export function sendDomainErrors(res: Response, errors: readonly DomainError[]): void {
  res.status(httpStatusForErrors(errors)).json(toErrorBody(errors));
}

/** Cuerpo genérico para fallos no previstos. */
function internalErrorBody(): ErrorResponseBody {
  return { errors: [domainError(ErrorCode.INTERNAL_ERROR)] };
}

/**
 * Middleware de errores de Express. Debe registrarse el último, después de todos los routers.
 * `log` es inyectable para las pruebas; por defecto `console.error`.
 */
export function createErrorMapper(
  log: (message: string, error: unknown) => void = (message, error) => console.error(message, error),
): ErrorRequestHandler {
  return (err: unknown, req, res, next) => {
    // Si la respuesta ya empezó a enviarse, Express debe cerrar la conexión.
    if (res.headersSent) {
      next(err);
      return;
    }
    if (err instanceof HttpDomainError) {
      sendDomainErrors(res, err.errors);
      return;
    }
    log(`[http] Error no previsto en ${req.method} ${req.originalUrl}`, err);
    res.status(500).json(internalErrorBody());
  };
}
