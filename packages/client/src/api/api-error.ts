// Error normalizado del ApiClient: errores de dominio del servidor, fallos de red o respuestas inesperadas.

import type { DomainError } from '@expense-tracker/shared';

export type ApiErrorKind = 'domain' | 'network' | 'unexpected';

export const NETWORK_ERROR_MESSAGE =
  'No se pudo conectar con el servidor. Compruebe su conexión e inténtelo de nuevo.';
export const UNEXPECTED_ERROR_MESSAGE = 'Ocurrió un error inesperado. Inténtelo de nuevo.';

export class ApiError extends Error {
  /** 'domain': el servidor devolvió `{ errors }`; 'network': no hubo respuesta; 'unexpected': respuesta no interpretable. */
  readonly kind: ApiErrorKind;
  /** Errores de dominio (vacío en fallos de red o inesperados). */
  readonly errors: DomainError[];
  /** Código HTTP, si hubo respuesta. */
  readonly status?: number;

  constructor(kind: ApiErrorKind, errors: DomainError[], message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.errors = errors;
    if (status !== undefined) this.status = status;
  }

  get isNetworkError(): boolean {
    return this.kind === 'network';
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

/** Mensajes para mostrar al usuario: los de dominio o, en su defecto, el mensaje general. */
export function apiErrorMessages(error: unknown): string[] {
  if (isApiError(error)) {
    return error.errors.length > 0 ? error.errors.map((e) => e.message) : [error.message];
  }
  return [UNEXPECTED_ERROR_MESSAGE];
}

/** Errores asociados a un campo concreto (para formularios). */
export function apiErrorsForField(error: unknown, field: string): DomainError[] {
  return isApiError(error) ? error.errors.filter((e) => e.field === field) : [];
}

function isDomainErrorShape(value: unknown): value is DomainError {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.code === 'string' && typeof v.message === 'string';
}

/** Interpreta el cuerpo de una respuesta de error `{ errors: [...] }`. */
export function parseErrorBody(body: unknown, status: number): ApiError {
  if (typeof body === 'object' && body !== null) {
    const errors = (body as Record<string, unknown>).errors;
    if (Array.isArray(errors) && errors.length > 0 && errors.every(isDomainErrorShape)) {
      return new ApiError('domain', errors, errors[0]?.message ?? UNEXPECTED_ERROR_MESSAGE, status);
    }
  }
  return new ApiError('unexpected', [], UNEXPECTED_ERROR_MESSAGE, status);
}

export function networkError(): ApiError {
  return new ApiError('network', [], NETWORK_ERROR_MESSAGE);
}
