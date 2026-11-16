// Conversión monetaria entre string decimal y céntimos enteros (sección "Conversión monetaria" de design.md).
// Se usa aritmética entera sobre los dígitos; nunca parseFloat.

import { ErrorCode, domainError, fail, ok, type Result } from './errors.js';
import type { Money } from './types.js';

/** Monto máximo permitido en céntimos (999,999,999.99). */
export const MAX_CENTS: Money = 99_999_999_999;

/** Monto mínimo permitido en céntimos (0.01). */
export const MIN_CENTS: Money = 1;

const AMOUNT_PATTERN = /^(-?)(\d+)(?:\.(\d+))?$/;

/** Número máximo de dígitos significativos de la parte entera (999,999,999). */
const MAX_INTEGER_DIGITS = 9;

/**
 * Convierte un string decimal a céntimos.
 * Orden de comprobación: formato → AMOUNT_NOT_POSITIVE → más de dos decimales → máximo.
 * @param field Campo asociado a los errores devueltos (por defecto "amount").
 */
export function parseAmount(raw: string, field = 'amount'): Result<Money> {
  const match = AMOUNT_PATTERN.exec(raw.trim());
  if (match === null) return fail(domainError(ErrorCode.AMOUNT_OUT_OF_RANGE, field));

  const negative = match[1] === '-';
  const integerDigits = (match[2] ?? '').replace(/^0+/, '');
  const decimalDigits = match[3] ?? '';

  const isZero = integerDigits === '' && /^0*$/.test(decimalDigits);
  if (negative || isZero) return fail(domainError(ErrorCode.AMOUNT_NOT_POSITIVE, field));

  if (decimalDigits.length > 2) return fail(domainError(ErrorCode.AMOUNT_OUT_OF_RANGE, field));

  // Con más de 9 dígitos enteros el valor supera el máximo; se descarta antes de operar
  // para que la aritmética siga dentro de Number.MAX_SAFE_INTEGER.
  if (integerDigits.length > MAX_INTEGER_DIGITS) {
    return fail(domainError(ErrorCode.AMOUNT_OUT_OF_RANGE, field));
  }

  const integerPart = integerDigits === '' ? 0 : Number(integerDigits);
  const decimalPart = Number(decimalDigits.padEnd(2, '0'));
  const cents = integerPart * 100 + decimalPart;

  if (cents > MAX_CENTS) return fail(domainError(ErrorCode.AMOUNT_OUT_OF_RANGE, field));
  return ok(cents);
}

/** Formatea céntimos (entero >= 0) como string con exactamente dos decimales: 12345 → "123.45". */
export function formatCents(cents: Money): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError(`formatCents espera un entero seguro >= 0, recibió ${String(cents)}`);
  }
  const integerPart = Math.trunc(cents / 100);
  const decimalPart = cents % 100;
  return `${String(integerPart)}.${String(decimalPart).padStart(2, '0')}`;
}
