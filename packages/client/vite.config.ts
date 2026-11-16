import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@expense-tracker/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
  // Fuera de `dist` para no pisar la salida de `tsc -b`.
  build: { outDir: 'dist-web' },
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
});
