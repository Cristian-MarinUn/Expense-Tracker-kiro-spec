// Formulario de alta/ediciÃ³n de gasto con validaciÃ³n en vivo (Req 1, 2).
import { useMemo, useState, type FormEvent } from 'react';
import {
  ErrorCode,
  formatCents,
  validateExpenseInput,
  domainError,
  type Clock,
  type DomainError,
  type Expense,
  type ExpenseInput,
} from '@expense-tracker/shared';

import {
  apiErrorMessages,
  isApiError,
  useCategories,
  useCreateExpense,
  useUpdateExpense,
} from '../api/index.js';
import {
  Button,
  ERROR_BOX_CLASS,
  Input,
  LABEL_CLASS,
  Select,
  Textarea,
} from './ui/index.js';

export interface ExpenseFormProps {
  /** Si se indica, el formulario edita ese gasto; si no, crea uno nuevo. */
  expense?: Expense;
  onSaved?: (expense: Expense) => void;
  onCancel?: () => void;
}

type FieldName = 'amount' | 'date' | 'categoryId' | 'description';
const FIELDS: FieldName[] = ['amount', 'date', 'categoryId', 'description'];

/** Clock del cliente: fecha local del navegador en formato YYYY-MM-DD. */
export const browserClock: Clock = {
  today(): string {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${String(d.getFullYear()).padStart(4, '0')}-${mm}-${dd}`;
  },
};

/** Normaliza el campo de un error de servidor al nombre del campo del formulario. */
function fieldOf(error: DomainError): FieldName | undefined {
  if (error.field === 'category') return 'categoryId';
  return FIELDS.find((f) => f === error.field);
}

export function ExpenseForm({ expense, onSaved, onCancel }: ExpenseFormProps) {
  const categories = useCategories();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const [amount, setAmount] = useState(expense ? formatCents(expense.amount) : '');
  const [date, setDate] = useState(expense?.date ?? browserClock.today());
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? '');
  const [description, setDescription] = useState(expense?.description ?? '');
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<DomainError[]>([]);
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);

  const isEdit = expense !== undefined;
  const saving = createExpense.isPending || updateExpense.isPending;
  const categoryList = categories.data ?? [];

  const localErrors = useMemo<DomainError[]>(() => {
    const input: ExpenseInput = { amount, categoryId, date, description };
    const result = validateExpenseInput(input, browserClock);
    const errors = result.ok ? [] : [...result.errors];
    if (!categoryList.some((c) => c.id === categoryId)) {
      errors.push(domainError(ErrorCode.CATEGORY_NOT_FOUND, 'categoryId'));
    }
    return errors;
  }, [amount, categoryId, date, description, categoryList]);

  /** Errores visibles de un campo: locales (si tocado o enviado) y los del servidor. */
  function errorsFor(field: FieldName): string[] {
    const local = touched[field] || submitted ? localErrors.filter((e) => e.field === field) : [];
    const remote = serverErrors.filter((e) => fieldOf(e) === field);
    const seen = new Set<string>();
    return [...local, ...remote].map((e) => e.message).filter((m) => !seen.has(m) && seen.add(m));
  }

  function edit(field: FieldName, set: (v: string) => void, value: string): void {
    set(value);
    setTouched((t) => ({ ...t, [field]: true }));
    setServerErrors((errs) => errs.filter((e) => fieldOf(e) !== field));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    setSubmitted(true);
    setServerErrors([]);
    setGeneralErrors([]);
    if (localErrors.length > 0 || saving) return;

    const input: ExpenseInput = { amount: amount.trim(), categoryId, date, description };
    const options = {
      onSuccess: (saved: Expense) => onSaved?.(saved),
      onError: (error: unknown) => {
        const domain = isApiError(error) ? error.errors : [];
        setServerErrors(domain.filter((e) => fieldOf(e) !== undefined));
        const unassigned = domain.filter((e) => fieldOf(e) === undefined).map((e) => e.message);
        setGeneralErrors(
          domain.length === 0 ? apiErrorMessages(error) : unassigned,
        );
      },
    };
    if (expense) updateExpense.mutate({ id: expense.id, input }, options);
    else createExpense.mutate(input, options);
  }

  function renderErrors(field: FieldName) {
    const messages = errorsFor(field);
    return messages.length > 0 ? (
      <div id={`expense-${field}-error`} role="alert" className={ERROR_BOX_CLASS}>
        {messages.map((m) => (
          <p key={m}>{m}</p>
        ))}
      </div>
    ) : null;
  }

  function ariaProps(field: FieldName) {
    const invalid = errorsFor(field).length > 0;
    return {
      'aria-invalid': invalid,
      'aria-describedby': invalid ? `expense-${field}-error` : undefined,
    };
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={isEdit ? 'Editar gasto' : 'Nuevo gasto'}
      className="mb-6 grid gap-4 rounded-lg border border-indigo-100 bg-indigo-50/50 p-4 sm:grid-cols-2"
    >
      <div>
        <label htmlFor="expense-amount" className={LABEL_CLASS}>Monto</label>
        <Input
          id="expense-amount"
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => edit('amount', setAmount, e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, amount: true }))}
          {...ariaProps('amount')}
        />
        {renderErrors('amount')}
      </div>

      <div>
        <label htmlFor="expense-date" className={LABEL_CLASS}>Fecha</label>
        <Input
          id="expense-date"
          type="date"
          value={date}
          max={browserClock.today()}
          onChange={(e) => edit('date', setDate, e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, date: true }))}
          {...ariaProps('date')}
        />
        {renderErrors('date')}
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="expense-categoryId" className={LABEL_CLASS}>Categoría</label>
        <Select
          id="expense-categoryId"
          value={categoryId}
          onChange={(e) => edit('categoryId', setCategoryId, e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, categoryId: true }))}
          {...ariaProps('categoryId')}
        >
          <option value="">Seleccione una categoría</option>
          {categoryList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {renderErrors('categoryId')}
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="expense-description" className={LABEL_CLASS}>Descripción (opcional)</label>
        <Textarea
          id="expense-description"
          value={description}
          onChange={(e) => edit('description', setDescription, e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, description: true }))}
          {...ariaProps('description')}
        />
        {renderErrors('description')}
      </div>

      {generalErrors.length > 0 && (
        <div role="alert" className={`${ERROR_BOX_CLASS} sm:col-span-2`}>
          {generalErrors.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Agregar gasto'}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
