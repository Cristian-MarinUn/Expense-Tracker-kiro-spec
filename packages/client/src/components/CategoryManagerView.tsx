// GestiÃ³n de categorÃ­as: listado, alta, renombrado y borrado (Req 4.1, 4.2, 4.4, 4.5, 4.6, 4.7, 4.8).
// Si el servidor rechaza el borrado (CATEGORY_HAS_EXPENSES o CATEGORY_HAS_BUDGETS), su mensaje se
// muestra en la fila de la categorÃ­a.

import { useState, type FormEvent } from 'react';
import { validateCategoryName } from '@expense-tracker/shared';

import { apiErrorMessages } from '../api/api-error.js';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useRenameCategory,
} from '../api/hooks.js';
import { Button, ERROR_BOX_CLASS, Input, LABEL_CLASS, PAGE_TITLE_CLASS } from './ui/index.js';

/** Valida en cliente; devuelve mensajes de error (vacÃ­o si es vÃ¡lido). */
function clientErrors(name: string): string[] {
  const result = validateCategoryName(name);
  return result.ok ? [] : result.errors.map((e) => e.message);
}

function ErrorList({ id, messages }: { id: string; messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <div id={id} role="alert" className={ERROR_BOX_CLASS}>
      {messages.map((m) => (
        <p key={m}>{m}</p>
      ))}
    </div>
  );
}

const SR_ONLY = 'sr-only';
export function CategoryManagerView() {
  const categories = useCategories();
  const createCategory = useCreateCategory();
  const renameCategory = useRenameCategory();
  const deleteCategory = useDeleteCategory();

  const [newName, setNewName] = useState('');
  const [createErrors, setCreateErrors] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editErrors, setEditErrors] = useState<string[]>([]);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; messages: string[] } | null>(null);

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    const errors = clientErrors(newName);
    setCreateErrors(errors);
    if (errors.length > 0) return;
    createCategory.mutate(newName.trim(), {
      onSuccess: () => {
        setNewName('');
        setCreateErrors([]);
      },
      onError: (err) => setCreateErrors(apiErrorMessages(err)),
    });
  }

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setEditName(name);
    setEditErrors([]);
    setConfirmingId(null);
    setRowError(null);
  }

  function handleRename(e: FormEvent) {
    e.preventDefault();
    if (editingId === null) return;
    const errors = clientErrors(editName);
    setEditErrors(errors);
    if (errors.length > 0) return;
    renameCategory.mutate(
      { id: editingId, name: editName.trim() },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditErrors([]);
        },
        onError: (err) => setEditErrors(apiErrorMessages(err)),
      },
    );
  }

  function handleDelete(id: string) {
    setRowError(null);
    deleteCategory.mutate(id, {
      onSuccess: () => setConfirmingId(null),
      onError: (err) => {
        setConfirmingId(null);
        setRowError({ id, messages: apiErrorMessages(err) });
      },
    });
  }

  return (
    <section aria-labelledby="category-manager-title">
      <h2 id="category-manager-title" className={PAGE_TITLE_CLASS}>Categorías</h2>

      <form onSubmit={handleCreate} noValidate className="mb-6">
        <label htmlFor="new-category-name" className={LABEL_CLASS}>Nueva categoría</label>
        <div className="flex gap-2">
          <Input
            id="new-category-name"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-invalid={createErrors.length > 0}
            aria-describedby={createErrors.length > 0 ? 'new-category-errors' : undefined}
            className="flex-1"
          />
          <Button type="submit" variant="primary" disabled={createCategory.isPending}>
            Agregar
          </Button>
        </div>
        <ErrorList id="new-category-errors" messages={createErrors} />
      </form>

      {categories.isPending && <p className="text-sm text-slate-500">Cargando categorías…</p>}
      {categories.isError && (
        <div role="alert" className={ERROR_BOX_CLASS}>
          {apiErrorMessages(categories.error).map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}

      {categories.data && (
        <ul
          aria-label="Lista de categorías"
          className="m-0 list-none divide-y divide-slate-100 rounded-lg p-0 ring-1 ring-slate-200"
        >
          {categories.data.map((category) => {
            const isEditing = editingId === category.id;
            const isConfirming = confirmingId === category.id;
            return (
              <li key={category.id} className="px-4 py-3">
                {isEditing ? (
                  <form onSubmit={handleRename} noValidate>
                    <label htmlFor={`rename-${category.id}`} className={LABEL_CLASS}>
                      Nuevo nombre de «{category.name}»
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        id={`rename-${category.id}`}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        aria-invalid={editErrors.length > 0}
                        aria-describedby={editErrors.length > 0 ? `rename-errors-${category.id}` : undefined}
                        className="min-w-0 flex-1"
                      />
                      <Button type="submit" variant="primary" disabled={renameCategory.isPending}>
                        Guardar
                      </Button>
                      <Button variant="secondary" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                    <ErrorList id={`rename-errors-${category.id}`} messages={editErrors} />
                  </form>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-slate-900">{category.name}</span>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(category.id, category.name)}
                        >
                          Renombrar
                          <span className={SR_ONLY}> {category.name}</span>
                        </Button>
                        {isConfirming ? (
                          <span
                            role="group"
                            aria-label={`Confirmar eliminación de ${category.name}`}
                            className="inline-flex flex-wrap items-center gap-2 rounded-md bg-red-50 px-3 py-1 text-sm text-red-800 ring-1 ring-red-200"
                          >
                            ¿Eliminar «{category.name}»?
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(category.id)}
                              disabled={deleteCategory.isPending}
                            >
                              Confirmar
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => setConfirmingId(null)}>
                              Cancelar
                            </Button>
                          </span>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setConfirmingId(category.id);
                              setRowError(null);
                              setEditingId(null);
                            }}
                          >
                            Eliminar
                            <span className={SR_ONLY}> {category.name}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                    {rowError?.id === category.id && (
                      <ErrorList id={`delete-errors-${category.id}`} messages={rowError.messages} />
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
