// Clasificación de alertas del Budget_Manager (Req 7.3, 7.4).
// Ver design.md, sección "Budget_Manager > Clasificación de alertas con aritmética entera".

import type { BudgetAlert } from '@expense-tracker/shared';

/** Resultado de clasificar un Budget, sin los identificadores (los añade el servicio). */
export type BudgetClassification = Pick<BudgetAlert, 'level' | 'percentConsumed' | 'amountOver'>;

/**
 * Clasifica el consumo de un Budget con aritmética entera en BigInt (sin división en
 * coma flotante ni riesgo de desbordar Number.MAX_SAFE_INTEGER al multiplicar por 100):
 *
 * - `exceeded` si `spent >= limit`, con `amountOver = spent - limit` (0 si son iguales) (Req 7.4).
 * - `warning` si `spent * 100 >= limit * 80` y `spent < limit` (Req 7.3).
 * - `null` por debajo del 80 %.
 *
 * `percentConsumed = floor(spent * 100 / limit)`, truncado hacia abajo.
 *
 * @param spent céntimos gastados (>= 0).
 * @param limit límite en céntimos (>= 1).
 * @throws RangeError si `spent < 0` o `limit < 1`.
 */
export function classifyBudget(spent: bigint | number, limit: bigint | number): BudgetClassification | null {
  const s = BigInt(spent);
  const l = BigInt(limit);
  if (s < 0n) throw new RangeError('spent debe ser >= 0');
  if (l < 1n) throw new RangeError('limit debe ser >= 1');

  const percentConsumed = Number((s * 100n) / l);

  if (s >= l) {
    return { level: 'exceeded', percentConsumed, amountOver: Number(s - l) };
  }
  if (s * 100n >= l * 80n) {
    return { level: 'warning', percentConsumed };
  }
  return null;
}
