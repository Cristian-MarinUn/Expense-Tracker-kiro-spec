// Configuración del servidor leída de variables de entorno (design.md, "Budget_Manager > Flag
// budgetsEnabled" y "Lógica de dominio > Clock").
//
// - BUDGETS_ENABLED: habilita la funcionalidad opcional de presupuestos. Por defecto `true`.
// - DB_PATH: ruta del archivo SQLite. Por defecto `data/expenses.db` (relativa al cwd).
// - TZ: zona horaria IANA usada por el Clock del sistema. Node la aplica de forma nativa;
//   aquí solo se valida y se expone. Si falta, se usa la zona local del sistema.
// - PORT: puerto HTTP. Por defecto 3000.

export interface ServerConfig {
  budgetsEnabled: boolean;
  dbPath: string;
  /** Zona horaria IANA (p. ej. "Europe/Madrid"); `undefined` = zona local del sistema. */
  timeZone: string | undefined;
  port: number;
}

export const DEFAULT_DB_PATH = 'data/expenses.db';
export const DEFAULT_PORT = 3000;

const TRUE_VALUES = new Set(['true', '1', 'yes', 'on']);
const FALSE_VALUES = new Set(['false', '0', 'no', 'off']);

/**
 * Lee la configuración de `env`. Lanza un Error con un mensaje descriptivo si algún valor
 * está presente pero no es válido, para que el servidor falle al arrancar en lugar de
 * funcionar con una configuración inesperada.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    budgetsEnabled: parseBoolean(env.BUDGETS_ENABLED, 'BUDGETS_ENABLED', true),
    dbPath: nonEmpty(env.DB_PATH) ?? DEFAULT_DB_PATH,
    timeZone: parseTimeZone(env.TZ),
    port: parsePort(env.PORT),
  };
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseBoolean(raw: string | undefined, name: string, fallback: boolean): boolean {
  const value = nonEmpty(raw)?.toLowerCase();
  if (value === undefined) return fallback;
  if (TRUE_VALUES.has(value)) return true;
  if (FALSE_VALUES.has(value)) return false;
  throw new Error(`${name} no válido: "${raw ?? ''}". Usa true/false.`);
}

function parseTimeZone(raw: string | undefined): string | undefined {
  const value = nonEmpty(raw);
  if (value === undefined) return undefined;
  try {
    // Intl lanza RangeError para identificadores de zona horaria desconocidos.
    new Intl.DateTimeFormat('en-US', { timeZone: value });
  } catch {
    throw new Error(`TZ no válida: "${value}". Usa un identificador IANA, p. ej. "Europe/Madrid".`);
  }
  return value;
}

function parsePort(raw: string | undefined): number {
  const value = nonEmpty(raw);
  if (value === undefined) return DEFAULT_PORT;
  const port = /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(`PORT no válido: "${value}". Debe ser un entero entre 0 y 65535.`);
  }
  return port;
}
