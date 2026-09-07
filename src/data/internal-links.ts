import type { BlogPillar } from '../lib/blog.ts';
// B1 conserva la propiedad de los nombres; reexportar evita una segunda copia.
export { PILAR_NAMES } from '../lib/blog.ts';

export type ArticleIdentity = `${BlogPillar}/${string}`;
export type Relations = Partial<Record<ArticleIdentity, readonly string[]>>;

export const ARTICULO_A_CLINICAS: Relations = {
  'guias-por-especie/urgencias-en-perros': [
    'hems-una-heredia', 'hospital-vet-medical-care-heredia', 'veterinaria-gocha-santo-domingo',
  ],
};
export const ARTICULO_A_ZONAS: Relations = {
  'guias-por-especie/urgencias-en-perros': ['san-pablo-heredia', 'guapiles'],
};
export const ARTICULO_A_PROVINCIAS: Relations = {
  'guias-por-especie/urgencias-en-perros': ['heredia', 'limon'],
};
// Se activan cuando ambos artículos estén publicados. No crean contenido seed.
export const CROSS_PILLAR_LINKS: Partial<Record<ArticleIdentity, readonly ArticleIdentity[]>> = {
  'guias-por-especie/urgencias-en-perros': ['costos-y-acceso/atencion-veterinaria-24h-por-zona'],
};
