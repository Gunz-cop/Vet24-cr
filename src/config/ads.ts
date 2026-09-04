/**
 * Configuración de publicidad (Ezoic).
 *
 * Los placeholders de Ezoic se identifican por un ID numérico que asigna su
 * panel (Ads > Placeholders). Mientras un placement tenga `null`, el hueco
 * no renderiza nada y no se carga script alguno.
 *
 * Para activar:
 *   1. Crear los placeholders en el panel de Ezoic.
 *   2. Copiar aquí el ID numérico de cada uno.
 *   3. Poner EZOIC_ENABLED en true.
 */
export const EZOIC_ENABLED = false;

/** Cada clave es una posición concreta del sitio, no un tamaño. */
export const EZOIC_PLACEHOLDERS = {
  'home-inline': null,
  'zona-inline': null,
  'clinica-inline': null,
  'clinica-sidebar': null,
} as const satisfies Record<string, number | null>;

export type AdSlot = keyof typeof EZOIC_PLACEHOLDERS;
