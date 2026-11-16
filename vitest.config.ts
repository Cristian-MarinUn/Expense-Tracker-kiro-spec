import { defineConfig } from 'vitest/config';

// Ejecuta las pruebas de todos los paquetes; cada uno define su propio entorno.
export default defineConfig({
  test: {
    projects: ['packages/shared', 'packages/server', 'packages/client'],
  },
});
