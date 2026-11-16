// Ejecutable: `node dist/main.js`. Arranca el servidor y cierra ordenadamente en SIGINT/SIGTERM.

import { startServer } from './server.js';

try {
  const running = await startServer();
  console.log(`Servidor escuchando en http://localhost:${running.port}`);

  const shutdown = (signal: string): void => {
    console.log(`${signal} recibido; cerrando...`);
    running.close().then(
      () => process.exit(0),
      (err: unknown) => {
        console.error('Error al cerrar el servidor:', err);
        process.exit(1);
      },
    );
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
} catch (err) {
  console.error('No se pudo iniciar el servidor:', err);
  process.exit(1);
}
