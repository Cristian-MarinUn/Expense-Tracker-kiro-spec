import { QueryClient } from '@tanstack/react-query';

import { isApiError } from './api-error.js';

/** Cliente de React Query: reintenta solo fallos de red; los errores de dominio no se reintentan. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => isApiError(error) && error.isNetworkError && failureCount < 2,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}
