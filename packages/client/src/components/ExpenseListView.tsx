// Listado de gastos con filtros, bÃºsqueda y acciones de alta/ediciÃ³n/borrado (Req 5.1â€“5.7).

import { useId, useMemo, useState } from 'react';
import {
  formatCents,
  validateExpenseFilter,
  type Expense,
  type ExpenseFilter,
} from '@expense-tracker/shared';

import { apiErrorMessages, useCategories, useExpenses } from '../api/index.js';
import { DeleteConfirmDialog } from './DeleteConfirmDialog.js';
import { ExpenseForm } from './ExpenseForm.js';
import {
  Button,
  EMPTY_CLASS,
  ERROR_BOX_CLASS,
  Input,
  LABEL_CLASS,
  PAGE_TITLE_CLASS,
  Select,
} from './ui/index.js';

export const NO_MATCHES_MESSAGE = 'No hay gastos que coincidan con los criterios aplicados.';

type Editing = { kind: 'new' } | { kind: 'edit'; expense: Expense } | null;

export function ExpenseListView() {
  const ids = { cat: useId(), from: useId(), to: useId(), search: useId() };
  const categories = useCategories();

  const [categoryId, setCategoryId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const draft: ExpenseFilter = useMemo(() => {
    const f: ExpenseFilter = {};
    if (categoryId) f.categoryId = categoryId;
    if (dateFrom) f.dateFrom = dateFrom;
    if (dateTo) f.dateTo = dateTo;
    if (search) f.search = search;
    return f;
  }, [categoryId, dateFrom, dateTo, search]);

  const validation = useMemo(() => validateExpenseFilter(draft), [draft]);
  const filterErrors = validation.ok ? [] : validation.errors.map((e) => e.message);

  // Ãšltimo filtro vÃ¡lido: si el borrador es invÃ¡lido, se sigue consultando con este (Req 5.4, 5.5).
  const [lastValid, setLastValid] = useState<ExpenseFilter>({});
  if (validation.ok && JSON.stringify(validation.value) !== JSON.stringify(lastValid)) {
    setLastValid(validation.value);
  }
  const appliedFilter = validation.ok ? validation.value : lastValid;

  const query = useExpenses(appliedFilter);

  // Ãšltimo listado recibido, para conservarlo si una consulta falla.
  const [lastList, setLastList] = useState<Expense[]>([]);
  if (query.data && !query.isPlaceholderData && query.data !== lastList) {
    setLastList(query.data);
  }
  const list = query.data ?? lastList;

  const categoryNames = useMemo(
    () => new Map((categories.data ?? []).map((c) => [c.id, c.name])),
    [categories.data],
  );
  const nameOf = (id: string) => categoryNames.get(id) ?? 'â€”';

  const serverErrors = query.isError ? apiErrorMessages(query.error) : [];
  const errors = [...filterErrors, ...serverErrors];
  const hasCriteria = Object.keys(appliedFilter).length > 0;

  return (
    <section aria-labelledby={ids.cat + '-title'}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={ids.cat + '-title'} className={`${PAGE_TITLE_CLASS} mb-0`}>Gastos</h2>
        <Button variant="primary" onClick={() => setEditing({ kind: 'new' })}>
          Nuevo gasto
        </Button>
      </div>

      {editing && (
        <ExpenseForm
          {...(editing.kind === 'edit' ? { expense: editing.expense } : {})}
          onSaved={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      )}

      <form
        role="search"
        aria-label="Filtros de gastos"
        onSubmit={(e) => e.preventDefault()}
        className="mb-4 grid gap-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <label htmlFor={ids.cat} className={LABEL_CLASS}>Categoría</label>
          <Select id={ids.cat} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Todas</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor={ids.from} className={LABEL_CLASS}>Desde</label>
          <Input
            id={ids.from}
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={ids.to} className={LABEL_CLASS}>Hasta</label>
          <Input
            id={ids.to}
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={ids.search} className={LABEL_CLASS}>Buscar en la descripción</label>
          <Input
            id={ids.search}
            type="search"
            value={search}
            aria-invalid={filterErrors.length > 0 && !validation.ok}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </form>

      {errors.length > 0 && (
        <div role="alert" className={`${ERROR_BOX_CLASS} mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2`}>
          {errors.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}

      <div aria-busy={query.isFetching} className="aria-busy:opacity-70">
        {query.isPending && !query.data && lastList.length === 0 ? (
          <p role="status" className={EMPTY_CLASS}>Cargando gastos…</p>
        ) : list.length === 0 ? (
          <p role="status" className={EMPTY_CLASS}>
            {hasCriteria ? NO_MATCHES_MESSAGE : 'Aún no hay gastos registrados.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg ring-1 ring-slate-200">
            <table className="w-full min-w-[40rem] border-collapse text-sm">
              <caption className="sr-only">Listado de gastos</caption>
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3">Fecha</th>
                  <th scope="col" className="px-4 py-3">Categoría</th>
                  <th scope="col" className="px-4 py-3">Descripción</th>
                  <th scope="col" className="px-4 py-3 text-right">Monto</th>
                  <th scope="col" className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3">{expense.date}</td>
                    <td className="px-4 py-3">{nameOf(expense.categoryId)}</td>
                    <td className="px-4 py-3 text-slate-600">{expense.description}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                      {formatCents(expense.amount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Editar gasto del ${expense.date} por ${formatCents(expense.amount)}`}
                        onClick={() => setEditing({ kind: 'edit', expense })}
                      >
                        Editar
                      </Button>{' '}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-700 hover:bg-red-50"
                        aria-label={`Eliminar gasto del ${expense.date} por ${formatCents(expense.amount)}`}
                        onClick={() => setDeleting(expense)}
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleting && (
        <DeleteConfirmDialog
          expense={deleting}
          categoryName={nameOf(deleting.categoryId)}
          onClose={() => setDeleting(null)}
          onDeleted={() => setDeleting(null)}
        />
      )}
    </section>
  );
}
