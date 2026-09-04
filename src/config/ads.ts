/**
 * Configuración de publicidad (Ezoic).
 *
 * Los placeholders de Ezoic se identifican por un ID numérico que asigna su
 * panel (Ads > Placeholders). Mientras un placement tenga `null`, el hueco
 * no renderiza nada y no se carga script alguno.
 *
 * Los IDs de abajo corresponden a los placeholders creados a mano para este
 * sitio. Ezoic autogenera además otros (101-115) que no usamos: la integración
 * es standalone y sólo se muestran los IDs que pasamos a showAds().
 */
export const EZOIC_ENABLED = true;

/**
 * Cada clave es una posición concreta del sitio, no un tamaño.
 *
 *   116  home-inline      incontent_6  Horizontal (320x50 / 320x100)
 *   117  zona-inline      incontent_7  Horizontal (320x50 / 320x100)
 *   118  clinica-inline   incontent_8  Horizontal (320x50 / 320x100)
 *   119  clinica-sidebar  sidebar      Box (300x250 / 336x280)
 */
export const EZOIC_PLACEHOLDERS = {
  'home-inline': 116,
  'zona-inline': 117,
  'clinica-inline': 118,
  'clinica-sidebar': 119,
} as const satisfies Record<string, number | null>;

export type AdSlot = keyof typeof EZOIC_PLACEHOLDERS;
