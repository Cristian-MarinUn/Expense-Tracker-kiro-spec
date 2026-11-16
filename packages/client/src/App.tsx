import { useState, type KeyboardEvent } from 'react';

import { useConfig, useStatus } from './api/index.js';
import { BudgetManagerView } from './components/BudgetManagerView.js';
import { CategoryManagerView } from './components/CategoryManagerView.js';
import { ExpenseListView } from './components/ExpenseListView.js';
import { Button, EMPTY_CLASS } from './components/ui/index.js';
import { SummaryPanel } from './components/SummaryPanel.js';

type TabId = 'expenses' | 'summary' | 'categories' | 'budgets';

const TABS: { id: TabId; label: string }[] = [
  { id: 'expenses', label: 'Gastos' },
  { id: 'summary', label: 'Resumen' },
  { id: 'categories', label: 'Categorías' },
  { id: 'budgets', label: 'Presupuestos' },
];

type MainSection = 'expenses' | 'income';

const MAIN_SECTIONS: { id: MainSection; label: string }[] = [
  { id: 'expenses', label: 'Gastos' },
  { id: 'income', label: 'Ingresos' },
];

function PanelContent({ tab }: { tab: TabId }) {
  switch (tab) {
    case 'expenses':
      return <ExpenseListView />;
    case 'summary':
      return <SummaryPanel />;
    case 'categories':
      return <CategoryManagerView />;
    case 'budgets':
      return <BudgetManagerView />;
  }
}

export function App() {
  const status = useStatus();
  const config = useConfig();
  const [selected, setSelected] = useState<TabId>('expenses');
  const [mainSection, setMainSection] = useState<MainSection>('expenses');

  // Los presupuestos y sus alertas solo se muestran si el servidor los habilita (Req 7).
  // Mientras la configuración no se conoce, se ocultan para evitar un parpadeo.
  const budgetsEnabled = config.data?.budgetsEnabled === true;
  const visibleTabs = TABS.filter((t) => t.id !== 'budgets' || budgetsEnabled);
  const current: TabId = visibleTabs.some((t) => t.id === selected) ? selected : 'expenses';

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % visibleTabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + visibleTabs.length) % visibleTabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = visibleTabs.length - 1;
    else return;
    event.preventDefault();
    const tab = visibleTabs[next];
    if (tab === undefined) return;
    setSelected(tab.id);
    document.getElementById(`tab-${tab.id}`)?.focus();
  };

  const noticeBase = 'rounded-md border px-4 py-3 text-sm font-medium';
  const noticeError = `${noticeBase} border-red-200 bg-red-50 text-red-800`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Seguidor de Gastos</h1>
          <div role="group" aria-label="Sección principal" className="flex gap-2">
            {MAIN_SECTIONS.map((section) => (
              <Button
                key={section.id}
                variant={mainSection === section.id ? 'primary' : 'secondary'}
                size="sm"
                aria-pressed={mainSection === section.id}
                onClick={() => {
                  setMainSection(section.id);
                }}
              >
                {section.label}
              </Button>
            ))}
          </div>
        </div>
        {mainSection === 'expenses' && (
        <nav aria-label="Secciones">
          <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-300">
            {visibleTabs.map((tab, index) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={current === tab.id}
                aria-controls={`panel-${tab.id}`}
                tabIndex={current === tab.id ? 0 : -1}
                className={`-mb-px rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                  current === tab.id
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-600 hover:border-slate-400 hover:text-slate-900'
                }`}
                onClick={() => {
                  setSelected(tab.id);
                }}
                onKeyDown={(e) => {
                  onKeyDown(e, index);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
        )}
      </header>

      <div className="space-y-3 empty:hidden">
        {status.isPending && (
          <p className={`${noticeBase} border-slate-200 bg-white text-slate-600`}>Cargando�</p>
        )}
        {status.isError && (
          <p role="alert" className={noticeError}>
            {status.error.message}
          </p>
        )}
        {status.data?.dataLoadError && (
          <p
            role="alert"
            className={`${noticeBase} border-amber-300 bg-amber-50 text-amber-900 shadow-sm`}
          >
            {status.data.dataLoadError.message}
          </p>
        )}
        {config.isError && (
          <p role="alert" className={noticeError}>
            {config.error.message}
          </p>
        )}
      </div>

      <main className="mt-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-6">
        {mainSection === 'expenses' ? (
          <section
            id={`panel-${current}`}
            role="tabpanel"
            aria-labelledby={`tab-${current}`}
            tabIndex={0}
            className="rounded-md"
          >
            <PanelContent tab={current} />
          </section>
        ) : (
          <section aria-label="Ingresos">
            <p className={EMPTY_CLASS}>La sección de ingresos estará disponible próximamente.</p>
          </section>
        )}
      </main>
    </div>
  );
}
