// Panel de resÃºmenes: selector de periodo, total y desglose por categorÃ­a (Req 6.1-6.6).

import { useId, useState, type ReactElement } from 'react';
import { formatCents, type PeriodType } from '@expense-tracker/shared';

import { apiErrorMessages } from '../api/api-error.js';
import type { PeriodQuery } from '../api/api-client.js';
import { useSummaryByCategory, useSummaryTotal } from '../api/hooks.js';
import {
  EMPTY_CLASS,
  ERROR_BOX_CLASS,
  Input,
  LABEL_CLASS,
  PAGE_TITLE_CLASS,
  SECTION_TITLE_CLASS,
  Select,
} from './ui/index.js';

const PERIOD_LABELS: Record<PeriodType, string> = {
  day: 'DÃ­a',
  week: 'Semana',
  month: 'Mes',
  custom: 'Personalizado',
};

const PERIOD_TYPES: PeriodType[] = ['day', 'week', 'month', 'custom'];

/** Fecha local de hoy en formato YYYY-MM-DD. */
function todayLocal(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${String(now.getFullYear())}-${mm}-${dd}`;
}

function SummaryResults({ period }: { period: PeriodQuery }): ReactElement {
  const total = useSummaryTotal(period);
  const byCategory = useSummaryByCategory(period);

  const error = total.error ?? byCategory.error;
  if (error) {
    // Req 6.6: ante un error (p. ej. rango inválido) no se muestran totales.
    return (
      <div
        role="alert"
        className={`${ERROR_BOX_CLASS} rounded-md border border-red-200 bg-red-50 px-3 py-2`}
      >
        {apiErrorMessages(error).map((message) => (
          <p key={message}>{message}</p>
        ))}
      </div>
    );
  }

  if (!total.isSuccess || !byCategory.isSuccess) {
    return (
      <p role="status" className={EMPTY_CLASS}>
        Cargando resumen…
      </p>
    );
  }

  const maxSubtotal = Math.max(...byCategory.data.map((item) => item.subtotal), 1);

  return (
    <div className="space-y-6">
      <p className="m-0 rounded-lg bg-indigo-600 p-5 text-sm text-indigo-100 shadow-sm">
        Total del periodo:{' '}
        <strong data-testid="summary-total" className="block text-3xl font-bold text-white tabular-nums">
          {formatCents(total.data)}
        </strong>
      </p>
      <div>
        <h3 className={SECTION_TITLE_CLASS}>Desglose por categoría</h3>
        {byCategory.data.length === 0 ? (
          <p className={EMPTY_CLASS}>No hay gastos en el periodo seleccionado.</p>
        ) : (
          <ul aria-label="Desglose por categoría" className="m-0 list-none space-y-3 p-0">
            {byCategory.data.map((item) => (
              <li key={item.categoryId}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-800">{item.categoryName}:</span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {formatCents(item.subtotal)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${String(Math.round((item.subtotal / maxSubtotal) * 100))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
export function SummaryPanel(): ReactElement {
  const id = useId();
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const referenceDate = todayLocal();

  let period: PeriodQuery | null;
  if (periodType === 'custom') {
    period = dateFrom !== '' && dateTo !== '' ? { periodType, dateFrom, dateTo } : null;
  } else {
    period = { periodType, referenceDate };
  }

  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className={PAGE_TITLE_CLASS}>Resumen de gastos</h2>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`${id}-period`} className={LABEL_CLASS}>Periodo</label>
          <Select
            id={`${id}-period`}
            value={periodType}
            onChange={(e) => {
              setPeriodType(e.target.value as PeriodType);
            }}
          >
            {PERIOD_TYPES.map((type) => (
              <option key={type} value={type}>
                {PERIOD_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>

        {periodType === 'custom' && (
          <>
            <div>
              <label htmlFor={`${id}-from`} className={LABEL_CLASS}>Desde</label>
              <Input
                id={`${id}-from`}
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                }}
              />
            </div>
            <div>
              <label htmlFor={`${id}-to`} className={LABEL_CLASS}>Hasta</label>
              <Input
                id={`${id}-to`}
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                }}
              />
            </div>
          </>
        )}
      </div>

      {period ? (
        <SummaryResults period={period} />
      ) : (
        <p className={EMPTY_CLASS}>Seleccione las fechas de inicio y fin para ver el resumen.</p>
      )}
    </section>
  );
}
