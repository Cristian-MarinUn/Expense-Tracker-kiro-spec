import { fileURLToPath } from 'node:url';
import { defineProject } from 'vitest/config';

export default defineProject({
  resolve: {
    // En pruebas se usa el código fuente de shared, sin necesidad de compilarlo antes.
    alias: {
      '@expense-tracker/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
  test: {
    name: 'server',
    environment: 'node',
    include: ['test/**/*.test.ts'],
    passWithNoTests: true,
  },
});
