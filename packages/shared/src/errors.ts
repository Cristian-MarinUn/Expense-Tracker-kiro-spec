// Catálogo de errores de dominio: códigos estables, mensajes en español y código HTTP asociado.
// Fuente: sección "Validator > Catálogo de códigos de error" de design.md.

export enum ErrorCode {
  AMOUNT_NOT_POSITIVE = 'AMOUNT_NOT_POSITIVE',
  AMOUNT_OUT_OF_RANGE = 'AMOUNT_OUT_OF_RANGE',
  INVALID_DATE = 'INVALID_DATE',
  DATE_IN_FUTURE = 'DATE_IN_FUTURE',
  CATEGORY_NOT_FOUND = 'CATEGORY_NOT_FOUND',
  DESCRIPTION_TOO_LONG = 'DESCRIPTION_TOO_LONG',
  EXPENSE_NOT_FOUND = 'EXPENSE_NOT_FOUND',
  CATEGORY_NAME_INVALID = 'CATEGORY_NAME_INVALID',
  CATEGORY_DUPLICATE = 'CATEGORY_DUPLICATE',
  CATEGORY_HAS_EXPENSES = 'CATEGORY_HAS_EXPENSES',
  CATEGORY_HAS_BUDGETS = 'CATEGORY_HAS_BUDGETS',
  CATEGORY_ID_NOT_FOUND = 'CATEGORY_ID_NOT_FOUND',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  SEARCH_TEXT_INVALID = 'SEARCH_TEXT_INVALID',
  BUDGET_LIMIT_NOT_POSITIVE = 'BUDGET_LIMIT_NOT_POSITIVE',
  BUDGET_DUPLICATE = 'BUDGET_DUPLICATE',
  BUDGET_NOT_FOUND = 'BUDGET_NOT_FOUND',
  BUDGETS_DISABLED = 'BUDGETS_DISABLED',
  EXPENSE_SAVE_FAILED = 'EXPENSE_SAVE_FAILED',
  EXPENSE_DELETE_FAILED = 'EXPENSE_DELETE_FAILED',
  PERSISTENCE_FAILED = 'PERSISTENCE_FAILED',
  DATA_READ_FAILED = 'DATA_READ_FAILED',
  TOTAL_OUT_OF_RANGE = 'TOTAL_OUT_OF_RANGE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATA_LOAD_FAILED = 'DATA_LOAD_FAILED',
  // Errores de tipo en el límite HTTP (cuerpo y query).
  AMOUNT_NOT_TEXT = 'AMOUNT_NOT_TEXT',
  BUDGET_LIMIT_NOT_TEXT = 'BUDGET_LIMIT_NOT_TEXT',
  CATEGORY_ID_NOT_TEXT = 'CATEGORY_ID_NOT_TEXT',
  DATE_NOT_TEXT = 'DATE_NOT_TEXT',
  DATE_REQUIRED = 'DATE_REQUIRED',
  DESCRIPTION_NOT_TEXT = 'DESCRIPTION_NOT_TEXT',
  CATEGORY_NAME_NOT_TEXT = 'CATEGORY_NAME_NOT_TEXT',
  SEARCH_TEXT_NOT_TEXT = 'SEARCH_TEXT_NOT_TEXT',
  PERIOD_TYPE_INVALID = 'PERIOD_TYPE_INVALID',
}

export interface DomainError {
  /** Código estable, mapeable a HTTP y a mensajes. */
  code: ErrorCode;
  /** Mensaje en español exigido por los requisitos. */
  message: string;
  /** Campo asociado (amount, date, categoryId, description...). */
  field?: string;
}

/** Resultado uniforme: éxito con valor o fallo con errores de dominio tipados. */
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; errors: DomainError[] };

export type HttpStatus = 200 | 400 | 404 | 409 | 500;

export interface ErrorDefinition {
  message: string;
  httpStatus: HttpStatus;
}

export const ERROR_CATALOG: Readonly<Record<ErrorCode, ErrorDefinition>> = Object.freeze({
  [ErrorCode.AMOUNT_NOT_POSITIVE]: { message: 'El monto debe ser mayor que cero.', httpStatus: 400 },
  [ErrorCode.AMOUNT_OUT_OF_RANGE]: {
    message:
      'El monto está fuera del rango o formato permitido (0.01 a 999,999,999.99, con hasta dos decimales).',
    httpStatus: 400,
  },
  [ErrorCode.INVALID_DATE]: { message: 'La fecha es inválida.', httpStatus: 400 },
  [ErrorCode.DATE_IN_FUTURE]: {
    message: 'La fecha es inválida: no puede ser posterior a la fecha actual.',
    httpStatus: 400,
  },
  [ErrorCode.CATEGORY_NOT_FOUND]: { message: 'La categoría no existe.', httpStatus: 400 },
  [ErrorCode.DESCRIPTION_TOO_LONG]: {
    message: 'La descripción supera el límite de 500 caracteres permitido.',
    httpStatus: 400,
  },
  [ErrorCode.EXPENSE_NOT_FOUND]: { message: 'El gasto no existe.', httpStatus: 404 },
  [ErrorCode.CATEGORY_NAME_INVALID]: {
    message: 'El nombre de la categoría no es válido: debe tener entre 1 y 50 caracteres.',
    httpStatus: 400,
  },
  [ErrorCode.CATEGORY_DUPLICATE]: { message: 'La categoría ya existe.', httpStatus: 409 },
  [ErrorCode.CATEGORY_HAS_EXPENSES]: {
    message: 'La categoría tiene gastos asociados y no puede eliminarse.',
    httpStatus: 409,
  },
  [ErrorCode.CATEGORY_HAS_BUDGETS]: {
    message: 'La categoría tiene presupuestos asociados y no puede eliminarse.',
    httpStatus: 409,
  },
  [ErrorCode.CATEGORY_ID_NOT_FOUND]: { message: 'La categoría no existe.', httpStatus: 404 },
  [ErrorCode.INVALID_DATE_RANGE]: {
    message: 'El rango de fechas es inválido: la fecha de inicio es posterior a la fecha de fin.',
    httpStatus: 400,
  },
  [ErrorCode.SEARCH_TEXT_INVALID]: {
    message: 'El texto de búsqueda debe tener entre 1 y 100 caracteres.',
    httpStatus: 400,
  },
  [ErrorCode.BUDGET_LIMIT_NOT_POSITIVE]: { message: 'El límite debe ser mayor que cero.', httpStatus: 400 },
  [ErrorCode.BUDGET_DUPLICATE]: {
    message: 'Ya existe un presupuesto para esa categoría y periodo.',
    httpStatus: 409,
  },
  [ErrorCode.BUDGET_NOT_FOUND]: { message: 'El presupuesto no existe.', httpStatus: 404 },
  [ErrorCode.BUDGETS_DISABLED]: {
    message: 'La funcionalidad de presupuestos está deshabilitada.',
    httpStatus: 404,
  },
  [ErrorCode.EXPENSE_SAVE_FAILED]: { message: 'El gasto no pudo guardarse.', httpStatus: 500 },
  [ErrorCode.EXPENSE_DELETE_FAILED]: { message: 'La eliminación no pudo completarse.', httpStatus: 500 },
  [ErrorCode.PERSISTENCE_FAILED]: { message: 'Los datos no pudieron guardarse.', httpStatus: 500 },
  [ErrorCode.DATA_READ_FAILED]: { message: 'Los datos no pudieron leerse.', httpStatus: 500 },
  [ErrorCode.TOTAL_OUT_OF_RANGE]: {
    message: 'El total calculado excede el rango numérico soportado.',
    httpStatus: 500,
  },
  [ErrorCode.INTERNAL_ERROR]: { message: 'Ocurrió un error interno.', httpStatus: 500 },
  // Aviso expuesto en GET /api/status (no es una respuesta de error HTTP).
  [ErrorCode.DATA_LOAD_FAILED]: {
    message: 'Los datos no pudieron cargarse. Se ha iniciado con datos vacíos.',
    httpStatus: 200,
  },
  [ErrorCode.AMOUNT_NOT_TEXT]: {
    message: 'El monto es obligatorio y debe enviarse como texto (por ejemplo, "123.45").',
    httpStatus: 400,
  },
  [ErrorCode.BUDGET_LIMIT_NOT_TEXT]: {
    message: 'El límite es obligatorio y debe enviarse como texto (por ejemplo, "123.45").',
    httpStatus: 400,
  },
  [ErrorCode.CATEGORY_ID_NOT_TEXT]: {
    message: 'El identificador de la categoría es obligatorio y debe enviarse como texto.',
    httpStatus: 400,
  },
  [ErrorCode.DATE_NOT_TEXT]: {
    message: 'La fecha debe enviarse como un único texto con formato YYYY-MM-DD.',
    httpStatus: 400,
  },
  [ErrorCode.DATE_REQUIRED]: { message: 'La fecha es obligatoria.', httpStatus: 400 },
  [ErrorCode.DESCRIPTION_NOT_TEXT]: { message: 'La descripción debe enviarse como texto.', httpStatus: 400 },
  [ErrorCode.CATEGORY_NAME_NOT_TEXT]: {
    message: 'El nombre de la categoría es obligatorio y debe enviarse como texto.',
    httpStatus: 400,
  },
  [ErrorCode.SEARCH_TEXT_NOT_TEXT]: {
    message: 'El texto de búsqueda debe enviarse como un único texto.',
    httpStatus: 400,
  },
  [ErrorCode.PERIOD_TYPE_INVALID]: {
    message: 'El tipo de periodo debe ser day, week, month o custom.',
    httpStatus: 400,
  },
});

export function errorMessage(code: ErrorCode): string {
  return ERROR_CATALOG[code].message;
}

export function httpStatusFor(code: ErrorCode): HttpStatus {
  return ERROR_CATALOG[code].httpStatus;
}

/** Crea un DomainError con el mensaje del catálogo. */
export function domainError(code: ErrorCode, field?: string): DomainError {
  const error: DomainError = { code, message: errorMessage(code) };
  if (field !== undefined) error.field = field;
  return error;
}

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never>(...errors: DomainError[]): Result<T> {
  return { ok: false, errors };
}

/** Orden de prioridad para respuestas con varios errores: 500 > 404 > 409 > 400. */
const HTTP_PRIORITY: readonly HttpStatus[] = [500, 404, 409, 400];

/**
 * Devuelve el código HTTP de mayor prioridad entre los errores (500 > 404 > 409 > 400).
 * Si la lista está vacía o solo contiene avisos (200), devuelve 500 como respuesta de
 * error genérica, ya que esta función solo se usa para construir respuestas de fallo.
 */
export function httpStatusForErrors(errors: readonly DomainError[]): HttpStatus {
  const statuses = new Set(errors.map((e) => httpStatusFor(e.code)));
  for (const status of HTTP_PRIORITY) {
    if (statuses.has(status)) return status;
  }
  return 500;
}
