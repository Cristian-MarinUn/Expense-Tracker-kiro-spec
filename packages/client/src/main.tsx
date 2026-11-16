import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';
import { createQueryClient } from './api/index.js';
import './styles.css';

const queryClient = createQueryClient();
const container = document.getElementById('root');
if (container === null) throw new Error('No se encontró el elemento #root.');

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
