// Envoltorio de inyección de fallos para repositorios (Property 20, Req 1.3, 3.6, 8.4).
// Cuenta las llamadas a los métodos de los repositorios envueltos y lanza PersistenceError
// en la llamada número N, antes de delegar, de modo que esa llamada no tiene efecto.
// Un mismo FailingRepository puede envolver varios repositorios: el contador es compartido,
// lo que permite elegir al azar el paso que falla dentro de una operación de servicio.

import { PersistenceError } from '../../domain/ports.js';

export interface FailingRepositoryOptions {
  /**
   * Número (1-based) de la llamada que falla. `null` o ausente: no falla ninguna.
   * Solo falla esa llamada; las posteriores se delegan con normalidad.
   */
  failOnCall?: number | null;
  /**
   * Métodos que cuentan para el contador. Ausente: todos los métodos.
   * Las llamadas a métodos no incluidos se delegan sin contar y nunca fallan.
   */
  methods?: readonly string[];
}

/** Métodos de escritura comunes a los tres repositorios. */
export const WRITE_METHODS: readonly string[] = ['insert', 'updateById', 'deleteById'];

export class FailingRepository {
  private failOnCall: number | null;
  private readonly methods: ReadonlySet<string> | null;
  private calls = 0;
  private failures = 0;

  constructor(options: FailingRepositoryOptions = {}) {
    FailingRepository.assertCallNumber(options.failOnCall ?? null);
    this.failOnCall = options.failOnCall ?? null;
    this.methods = options.methods ? new Set(options.methods) : null;
  }

  /** Número de llamadas contadas hasta ahora (incluida la que falló). */
  get callCount(): number {
    return this.calls;
  }

  /** Número de veces que se ha lanzado el fallo inyectado. */
  get failureCount(): number {
    return this.failures;
  }

  /** Reinicia los contadores y, opcionalmente, cambia la llamada que falla. */
  reset(failOnCall: number | null = this.failOnCall): void {
    FailingRepository.assertCallNumber(failOnCall);
    this.failOnCall = failOnCall;
    this.calls = 0;
    this.failures = 0;
  }

  /**
   * Devuelve un repositorio con la misma interfaz que `repo` cuyas llamadas pasan por
   * este contador. El repositorio original no se modifica.
   */
  wrap<R extends object>(repo: R): R {
    return new Proxy(repo, {
      get: (target, prop, receiver) => {
        const value: unknown = Reflect.get(target, prop, receiver);
        if (typeof value !== 'function' || typeof prop !== 'string') return value;
        if (this.methods && !this.methods.has(prop)) {
          return (...args: unknown[]) => (value as (...a: unknown[]) => unknown).apply(target, args);
        }
        return (...args: unknown[]) => {
          this.beforeCall(prop);
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      },
    });
  }

  private beforeCall(method: string): void {
    this.calls++;
    if (this.failOnCall !== null && this.calls === this.failOnCall) {
      this.failures++;
      throw new PersistenceError(`Fallo inyectado en la llamada ${this.calls} (${method})`);
    }
  }

  private static assertCallNumber(n: number | null): void {
    if (n !== null && (!Number.isInteger(n) || n < 1)) {
      throw new RangeError(`failOnCall debe ser un entero >= 1 o null; recibido ${n}`);
    }
  }
}
