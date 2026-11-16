import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineProject } from 'vitest/config';

export default defineProject({
  plugins: [react()],
  resolve: {
    // En pruebas se usa el código fuente de shared, sin necesidad de compilarlo antes.
    alias: {
      '@expense-tracker/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
  test: {
    name: 'client',
    environment: 'jsdom',
    include: ['test/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
  },
});
