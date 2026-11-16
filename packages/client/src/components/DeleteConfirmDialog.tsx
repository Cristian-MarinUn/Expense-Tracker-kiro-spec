// DiÃ¡logo de confirmaciÃ³n de borrado de un gasto (Req 3.1, 3.2, 3.3, 3.5, 3.6).

import { useEffect, useId, useRef, type KeyboardEvent } from 'react';
import { formatCents, type Expense } from '@expense-tracker/shared';

import { apiErrorMessages } from '../api/api-error.js';
import { useDeleteExpense } from '../api/hooks.js';
import { Button, ERROR_BOX_CLASS } from './ui/index.js';

export interface DeleteConfirmDialogProps {
  expense: Expense;
  categoryName: string;
  /** Se llama al cancelar (sin llamar a la API). */
  onClose: () => void;
  /** Se llama cuando el usuario cierra el diÃ¡logo tras un borrado correcto. */
  onDeleted: () => void;
}

export const DELETE_SUCCESS_MESSAGE = 'El gasto se eliminÃ³ correctamente.';

export function DeleteConfirmDialog({
  expense,
  categoryName,
  onClose,
  onDeleted,
}: DeleteConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<Element | null>(null);
  const mutation = useDeleteExpense();

  const done = mutation.isSuccess;
  const pending = mutation.isPending;

  // Foco inicial en "Cancelar" (acciÃ³n segura) y restauraciÃ³n al desmontar.
  useEffect(() => {
    previousFocus.current = document.activeElement;
    cancelRef.current?.focus();
    return () => {
      if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus();
    };
  }, []);

  useEffect(() => {
    if (done) closeRef.current?.focus();
  }, [done]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (pending) return;
      if (done) onDeleted();
      else onClose();
      return;
    }
    if (event.key === 'Tab' && dialogRef.current) {
      const focusables = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'),
      );
      if (focusables.length === 0) return;
      const first = focusables[0] as HTMLElement;
      const last = focusables[focusables.length - 1] as HTMLElement;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  const errorMessages = mutation.isError ? apiErrorMessages(mutation.error) : [];

  return (
    <div className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onKeyDown={handleKeyDown}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl ring-1 ring-slate-200"
      >
        <h2 id={titleId} className="mb-2 text-lg font-semibold text-slate-900">Eliminar gasto</h2>

        {done ? (
          <p role="status" className="mb-4 text-sm text-green-700">{DELETE_SUCCESS_MESSAGE}</p>
        ) : (
          <>
            <p id={descId} className="mb-4 text-sm text-slate-600">
              ¿Desea eliminar este gasto? Esta acción no se puede deshacer.
            </p>
            <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md bg-slate-50 p-3 text-sm">
              <dt className="font-medium text-slate-600">Monto</dt>
              <dd className="m-0 font-semibold tabular-nums">{formatCents(expense.amount)}</dd>
              <dt className="font-medium text-slate-600">Categoría</dt>
              <dd className="m-0">{categoryName}</dd>
              <dt className="font-medium text-slate-600">Fecha</dt>
              <dd className="m-0">{expense.date}</dd>
              <dt className="font-medium text-slate-600">Descripción</dt>
              <dd className="m-0">{expense.description === '' ? '—' : expense.description}</dd>
            </dl>
          </>
        )}

        {errorMessages.length > 0 && (
          <div role="alert" className={`${ERROR_BOX_CLASS} mb-4`}>
            {errorMessages.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          {done ? (
            <Button ref={closeRef} variant="primary" onClick={onDeleted}>
              Cerrar
            </Button>
          ) : (
            <>
              <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={pending}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={() => mutation.mutate(expense.id)} disabled={pending}>
                {pending ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
