// Normalización de texto para la búsqueda de gastos (Req 5.5).
// La búsqueda es insensible a mayúsculas y a acentos: "Café", "CAFE" y "cafe" son equivalentes.

/**
 * Devuelve la forma normalizada de `s` para comparar en búsquedas:
 * descompone en NFD, elimina todas las marcas combinantes (`\p{M}`) y pasa a minúsculas.
 * La `ñ` también se reduce a `n`.
 */
export function normalizeForSearch(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Indica si `query` aparece como subcadena de `description`,
 * sin distinguir mayúsculas ni acentos.
 */
export function matchesSearch(description: string, query: string): boolean {
  return normalizeForSearch(description).includes(normalizeForSearch(query));
}
