// Cálculo de periodos y validación de fechas de calendario (sección "Summary_Engine > Cálculo del Period"
// de design.md). Todas las funciones son puras; la aritmética de fechas se hace en UTC sobre fechas sin
// hora para evitar saltos por horario de verano.

import { ErrorCode, domainError, fail, ok, type Result } from './errors.js';
import type { Period } from './types.js';

/** Fuente de la fecha actual, inyectable para que las pruebas sean deterministas. */
export interface Clock {
  /** Fecha actual en formato YYYY-MM-DD (zona horaria local del servidor). */
  today(): string;
}

export type PeriodRequest =
  | { type: 'day' | 'week' | 'month'; referenceDate: string }
  | { type: 'custom'; dateFrom: string; dateTo: string };

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Número de días del mes (1–12) del año dado, considerando años bisiestos. */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** true si `s` cumple `YYYY-MM-DD` y corresponde a un día real del calendario. */
export function isValidCalendarDate(s: string): boolean {
  const match = DATE_PATTERN.exec(s);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= daysInMonth(year, month);
}

/** Convierte una fecha válida YYYY-MM-DD a milisegundos UTC a medianoche. */
function toUtcMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  // Date.UTC interpreta los años 0–99 como 1900–1999; setUTCFullYear evita ese ajuste.
  const dt = new Date(Date.UTC(2000, m - 1, d));
  dt.setUTCFullYear(y, m - 1, d);
  return dt.getTime();
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

/** Convierte milisegundos UTC a YYYY-MM-DD. */
function fromUtcMs(ms: number): string {
  const dt = new Date(ms);
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1, 2)}-${pad(dt.getUTCDate(), 2)}`;
}

/** Suma `days` días (puede ser negativo) a una fecha válida YYYY-MM-DD. */
export function addDays(date: string, days: number): string {
  return fromUtcMs(toUtcMs(date) + days * MS_PER_DAY);
}

/** Día de la semana ISO 8601: 1 = lunes … 7 = domingo. */
export function isoWeekday(date: string): number {
  const dow = new Date(toUtcMs(date)).getUTCDay(); // 0 = domingo
  return dow === 0 ? 7 : dow;
}

/**
 * Resuelve una solicitud de periodo a un Period con inicio y fin inclusivos.
 * - day: [ref, ref]
 * - week: lunes a domingo (ISO 8601) de la semana que contiene ref
 * - month: día 1 al último día del mes de ref
 * - custom: [dateFrom, dateTo]; INVALID_DATE_RANGE si dateFrom > dateTo
 * Las fechas que no sean de calendario válidas devuelven INVALID_DATE.
 */
export function resolvePeriod(req: PeriodRequest): Result<Period> {
  if (req.type === 'custom') {
    const errors = [];
    if (!isValidCalendarDate(req.dateFrom)) errors.push(domainError(ErrorCode.INVALID_DATE, 'dateFrom'));
    if (!isValidCalendarDate(req.dateTo)) errors.push(domainError(ErrorCode.INVALID_DATE, 'dateTo'));
    if (errors.length > 0) return fail(...errors);
    // El orden lexicográfico de YYYY-MM-DD coincide con el cronológico.
    if (req.dateFrom > req.dateTo) return fail(domainError(ErrorCode.INVALID_DATE_RANGE, 'dateFrom'));
    return ok({ type: 'custom', start: req.dateFrom, end: req.dateTo });
  }

  const ref = req.referenceDate;
  if (!isValidCalendarDate(ref)) return fail(domainError(ErrorCode.INVALID_DATE, 'referenceDate'));

  switch (req.type) {
    case 'day':
      return ok({ type: 'day', start: ref, end: ref });
    case 'week': {
      const start = addDays(ref, 1 - isoWeekday(ref));
      return ok({ type: 'week', start, end: addDays(start, 6) });
    }
    case 'month': {
      const [yearStr, monthStr] = ref.split('-') as [string, string, string];
      const lastDay = daysInMonth(Number(yearStr), Number(monthStr));
      return ok({
        type: 'month',
        start: `${yearStr}-${monthStr}-01`,
        end: `${yearStr}-${monthStr}-${pad(lastDay, 2)}`,
      });
    }
  }
}
