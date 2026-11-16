// GestiÃ³n de presupuestos y panel de alertas (Req 7.1, 7.3, 7.4, 7.5, 7.6).

import { useState, type FormEvent } from 'react';
import {
  formatCents,
  resolvePeriod,
  validateBudgetInput,
  type Budget,
  type BudgetAlert,
  type BudgetInput,
  type DomainError,
  type PeriodType,
} from '@expense-tracker/shared';

import {
  apiErrorMessages,
  useBudgetAlerts,
  useBudgets,
  useCategories,
  useCreateBudget,
  useDeleteBudget,
  useUpdateBudget,
} from '../api/index.js';
import {
  Button,
  EMPTY_CLASS,
  ERROR_BOX_CLASS,
  Input,
  LABEL_CLASS,
  PAGE_TITLE_CLASS,
  SECTION_TITLE_CLASS,
  Select,
} from './ui/index.js';

type BudgetPeriodType = Extract<PeriodType, 'week' | 'month' | 'custom'>;

const PERIOD_LABELS: Record<BudgetPeriodType, string> = {
  week: 'Semana',
  month: 'Mes',
  custom: 'Personalizado',
};

type AlertPeriodType = Extract<PeriodType, 'day' | 'week' | 'month'>;

const ALERT_PERIOD_LABELS: Record<AlertPeriodType, string> = {
  day: 'DÃ­a',
  week: 'Semana',
  month: 'Mes',
};

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface FormState {
  limit: string;
  categoryId: string;
  periodType: BudgetPeriodType;
  referenceDate: string;
  customStart: string;
  customEnd: string;
}

function emptyForm(categoryId = ''): FormState {
  const today = todayLocal();
  return {
    limit: '',
    categoryId,
    periodType: 'month',
    referenceDate: today,
    customStart: today,
    customEnd: today,
  };
}

function formFromBudget(budget: Budget): FormState {
  const periodType: BudgetPeriodType = budget.periodType === 'day' ? 'custom' : budget.periodType;
  return {
    limit: formatCents(budget.limit),
    categoryId: budget.categoryId,
    periodType,
    referenceDate: budget.periodStart,
    customStart: budget.periodStart,
    customEnd: budget.periodEnd,
  };
}

/** Construye la entrada del API; devuelve errores si el periodo no puede resolverse. */
function buildInput(form: FormState): { input?: BudgetInput; errors: DomainError[] } {
  let periodStart = form.customStart;
  let periodEnd = form.customEnd;
  if (form.periodType !== 'custom') {
    const period = resolvePeriod({ type: form.periodType, referenceDate: form.referenceDate });
    if (!period.ok) return { errors: period.errors };
    periodStart = period.value.start;
    periodEnd = period.value.end;
  }
  return {
    errors: [],
    input: {
      limit: form.limit.trim(),
      categoryId: form.categoryId,
      periodType: form.periodType,
      periodStart,
      periodEnd,
    },
  };
}

export function BudgetManagerView() {
  const categories = useCategories();
  const budgets = useBudgets();
  const [alertPeriod, setAlertPeriod] = useState<AlertPeriodType>('month');
  const alerts = useBudgetAlerts({ periodType: alertPeriod });
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();

  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<DomainError[]>([]);
  const [serverMessages, setServerMessages] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteMessages, setDeleteMessages] = useState<string[]>([]);

  const categoryList = categories.data ?? [];
  const categoryName = (id: string): string =>
    categoryList.find((c) => c.id === id)?.name ?? 'CategorÃ­a desconocida';

  const limitErrors = errors.filter((e) => e.field === 'limit');
  const otherMessages = [
    ...errors.filter((e) => e.field !== 'limit').map((e) => e.message),
    ...serverMessages,
  ];
  const saving = createBudget.isPending || updateBudget.isPending;

  const update = (patch: Partial<FormState>): void => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const resetForm = (): void => {
    setForm(emptyForm(categoryList[0]?.id ?? ''));
    setEditingId(null);
    setErrors([]);
    setServerMessages([]);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setSuccess(null);
    setServerMessages([]);
    const categoryId = form.categoryId || categoryList[0]?.id || '';
    const built = buildInput({ ...form, categoryId });
    if (built.input === undefined) {
      setErrors(built.errors);
      return;
    }
    const validation = validateBudgetInput(built.input);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }
    setErrors([]);
    const onError = (error: unknown): void => {
      setServerMessages(apiErrorMessages(error));
    };
    if (editingId === null) {
      createBudget.mutate(built.input, {
        onSuccess: () => {
          resetForm();
          setSuccess('Presupuesto creado.');
        },
        onError,
      });
    } else {
      updateBudget.mutate(
        { id: editingId, input: built.input },
        {
          onSuccess: () => {
            resetForm();
            setSuccess('Presupuesto actualizado.');
          },
          onError,
        },
      );
    }
  };

  const startEdit = (budget: Budget): void => {
    setEditingId(budget.id);
    setForm(formFromBudget(budget));
    setErrors([]);
    setServerMessages([]);
    setSuccess(null);
  };

  const handleDelete = (budget: Budget): void => {
    setDeleteMessages([]);
    setSuccess(null);
    deleteBudget.mutate(budget.id, {
      onSuccess: () => {
        if (editingId === budget.id) resetForm();
        setSuccess('Presupuesto eliminado.');
      },
      onError: (error) => {
        setDeleteMessages(apiErrorMessages(error));
      },
    });
  };

  const budgetById = (id: string): Budget | undefined => budgets.data?.find((b) => b.id === id);

  const describeAlert = (alert: BudgetAlert): string => {
    if (alert.level === 'exceeded') {
      return `LÃ­mite superado: se ha excedido en ${formatCents(alert.amountOver ?? 0)} (${String(alert.percentConsumed)}% consumido).`;
    }
    return `Advertencia: ${String(alert.percentConsumed)}% del presupuesto consumido.`;
  };

  const selectedCategory = form.categoryId || categoryList[0]?.id || '';

  const errorBox = `${ERROR_BOX_CLASS} rounded-md border border-red-200 bg-red-50 px-3 py-2`;

  return (
    <section aria-labelledby="budgets-heading">
      <h2 id="budgets-heading" className={PAGE_TITLE_CLASS}>Presupuestos</h2>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Formulario de presupuesto"
        className="mb-4 grid gap-4 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2"
      >
        <h3 className={`${SECTION_TITLE_CLASS} mb-0 sm:col-span-2`}>
          {editingId === null ? 'Nuevo presupuesto' : 'Editar presupuesto'}
        </h3>

        <div>
          <label htmlFor="budget-limit" className={LABEL_CLASS}>Límite</label>
          <Input
            id="budget-limit"
            type="text"
            inputMode="decimal"
            value={form.limit}
            onChange={(e) => {
              update({ limit: e.target.value });
            }}
            aria-invalid={limitErrors.length > 0}
            aria-describedby={limitErrors.length > 0 ? 'budget-limit-error' : undefined}
          />
          {limitErrors.length > 0 && (
            <div id="budget-limit-error" role="alert" className={ERROR_BOX_CLASS}>
              {limitErrors.map((e) => (
                <p key={e.code}>{e.message}</p>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="budget-category" className={LABEL_CLASS}>Categoría</label>
          <Select
            id="budget-category"
            value={selectedCategory}
            onChange={(e) => {
              update({ categoryId: e.target.value });
            }}
          >
            {categoryList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="budget-period-type" className={LABEL_CLASS}>Tipo de periodo</label>
          <Select
            id="budget-period-type"
            value={form.periodType}
            onChange={(e) => {
              update({ periodType: e.target.value as BudgetPeriodType });
            }}
          >
            {(Object.keys(PERIOD_LABELS) as BudgetPeriodType[]).map((type) => (
              <option key={type} value={type}>
                {PERIOD_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>

        {form.periodType === 'custom' ? (
          <>
            <div>
              <label htmlFor="budget-start" className={LABEL_CLASS}>Fecha de inicio</label>
              <Input
                id="budget-start"
                type="date"
                value={form.customStart}
                onChange={(e) => {
                  update({ customStart: e.target.value });
                }}
              />
            </div>
            <div>
              <label htmlFor="budget-end" className={LABEL_CLASS}>Fecha de fin</label>
              <Input
                id="budget-end"
                type="date"
                value={form.customEnd}
                onChange={(e) => {
                  update({ customEnd: e.target.value });
                }}
              />
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="budget-reference" className={LABEL_CLASS}>Fecha de referencia</label>
            <Input
              id="budget-reference"
              type="date"
              value={form.referenceDate}
              onChange={(e) => {
                update({ referenceDate: e.target.value });
              }}
            />
          </div>
        )}

        {otherMessages.length > 0 && (
          <div role="alert" className={`${errorBox} sm:col-span-2`}>
            {otherMessages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" variant="primary" disabled={saving || categoryList.length === 0}>
            {editingId === null ? 'Crear presupuesto' : 'Guardar cambios'}
          </Button>
          {editingId !== null && (
            <Button variant="secondary" onClick={resetForm}>
              Cancelar edición
            </Button>
          )}
        </div>
      </form>

      {success !== null && (
        <p role="status" className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          {success}
        </p>
      )}

      <h3 id="budget-list-heading" className={`${SECTION_TITLE_CLASS} mt-6`}>Presupuestos definidos</h3>
      {budgets.isPending && <p role="status" className="text-sm text-slate-500">Cargando presupuestos…</p>}
      {budgets.isError && (
        <p role="alert" className={errorBox}>{apiErrorMessages(budgets.error).join(' ')}</p>
      )}
      {deleteMessages.length > 0 && (
        <div role="alert" className={errorBox}>
          {deleteMessages.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}
      {budgets.data?.length === 0 && <p className={EMPTY_CLASS}>No hay presupuestos definidos.</p>}
      {budgets.data !== undefined && budgets.data.length > 0 && (
        <ul
          aria-labelledby="budget-list-heading"
          className="m-0 list-none divide-y divide-slate-100 rounded-lg p-0 ring-1 ring-slate-200"
        >
          {budgets.data.map((budget) => (
            <li
              key={budget.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <span>
                {categoryName(budget.categoryId)}: {formatCents(budget.limit)} (
                {PERIOD_LABELS[budget.periodType === 'day' ? 'custom' : budget.periodType]},{' '}
                {budget.periodStart} a {budget.periodEnd})
              </span>
              <span className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    startEdit(budget);
                  }}
                  aria-label={`Editar presupuesto de ${categoryName(budget.categoryId)} ${budget.periodStart} a ${budget.periodEnd}`}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-700 hover:bg-red-50"
                  disabled={deleteBudget.isPending}
                  onClick={() => {
                    handleDelete(budget);
                  }}
                  aria-label={`Eliminar presupuesto de ${categoryName(budget.categoryId)} ${budget.periodStart} a ${budget.periodEnd}`}
                >
                  Eliminar
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <section aria-labelledby="budget-alerts-heading" className="mt-8">
        <h3 id="budget-alerts-heading" className={SECTION_TITLE_CLASS}>Alertas de presupuesto</h3>
        <div className="mb-3 max-w-xs">
          <label htmlFor="budget-alert-period" className={LABEL_CLASS}>Periodo evaluado</label>
          <Select
            id="budget-alert-period"
            value={alertPeriod}
            onChange={(e) => {
              setAlertPeriod(e.target.value as AlertPeriodType);
            }}
          >
            {(Object.keys(ALERT_PERIOD_LABELS) as AlertPeriodType[]).map((type) => (
              <option key={type} value={type}>
                {ALERT_PERIOD_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>
        {alerts.isPending && <p role="status" className="text-sm text-slate-500">Cargando alertas…</p>}
        {alerts.isError && (
          <p role="alert" className={errorBox}>{apiErrorMessages(alerts.error).join(' ')}</p>
        )}
        {alerts.data?.length === 0 && <p className={EMPTY_CLASS}>No hay alertas de presupuesto.</p>}
        {alerts.data !== undefined && alerts.data.length > 0 && (
          <ul className="m-0 list-none space-y-3 p-0">
            {alerts.data.map((alert) => {
              const budget = budgetById(alert.budgetId);
              const exceeded = alert.level === 'exceeded';
              const percent = Math.min(Math.max(alert.percentConsumed, 0), 100);
              return (
                <li
                  key={alert.budgetId}
                  data-level={alert.level}
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    exceeded
                      ? 'border-red-200 bg-red-50 text-red-900'
                      : 'border-amber-300 bg-amber-50 text-amber-900'
                  }`}
                >
                  <strong>{categoryName(alert.categoryId)}</strong>
                  {budget !== undefined && ` (${budget.periodStart} a ${budget.periodEnd})`}:{' '}
                  {describeAlert(alert)}
                  <div
                    className={`mt-2 h-2 overflow-hidden rounded-full ${exceeded ? 'bg-red-100' : 'bg-amber-100'}`}
                    aria-hidden="true"
                  >
                    <div
                      className={`h-full rounded-full ${exceeded ? 'bg-red-600' : 'bg-amber-500'}`}
                      style={{ width: `${String(percent)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}
