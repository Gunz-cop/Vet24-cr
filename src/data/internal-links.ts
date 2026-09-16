import type { BlogPillar } from '../lib/blog.ts';
// B1 conserva la propiedad de los nombres; reexportar evita una segunda copia.
export { PILAR_NAMES } from '../lib/blog.ts';

export type ArticleIdentity = `${BlogPillar}/${string}`;
export type Relations = Partial<Record<ArticleIdentity, readonly string[]>>;

export const ARTICULO_A_CLINICAS: Relations = {
  'guias-por-especie/urgencias-en-perros': [
    'hems-una-heredia', 'hospital-vet-medical-care-heredia', 'veterinaria-gocha-santo-domingo',
  ],
  'guias-por-especie/urgencias-en-gatos': ['petopia-tibas', 'medical-pets-curridabat'],
  'guias-por-especie/atencion-veterinaria-para-exoticos': [
    'hospital-vet-santamaria-alajuela', 'petopia-tibas', 'pets-plus-san-antonio-belen',
  ],
  'costos-y-acceso/costo-emergencia-veterinaria-nocturna': [
    'medical-pets-cartago', 'hospital-vet-santamaria-alajuela', 'pets-plus-san-antonio-belen',
  ],
  'costos-y-acceso/atencion-veterinaria-24h-por-zona': [
    'ivdsa-santa-ana', 'ivdsa-tres-rios', 'la-vete-curridabat', 'la-vete-escazu',
    'medical-pets-cartago', 'medical-pets-curridabat', 'petopia-tibas',
    'pets-plus-san-antonio-belen', 'hospital-vet-santamaria-alajuela', 'vitalvet-cartago',
  ],
};
export const ARTICULO_A_ZONAS: Relations = {
  'guias-por-especie/urgencias-en-perros': ['san-pablo-heredia', 'guapiles'],
  'guias-por-especie/urgencias-en-gatos': ['curridabat'],
  'costos-y-acceso/atencion-veterinaria-24h-por-zona': ['curridabat'],
};
export const ARTICULO_A_PROVINCIAS: Relations = {
  'guias-por-especie/urgencias-en-perros': ['heredia', 'limon'],
  'guias-por-especie/urgencias-en-gatos': ['san-jose'],
  'guias-por-especie/atencion-veterinaria-para-exoticos': ['alajuela', 'heredia', 'san-jose'],
  'costos-y-acceso/costo-emergencia-veterinaria-nocturna': ['cartago', 'alajuela', 'heredia'],
  'costos-y-acceso/atencion-veterinaria-24h-por-zona': ['san-jose', 'cartago', 'heredia', 'alajuela'],
};
// Se activan cuando ambos artículos estén publicados. No crean contenido seed.
export const CROSS_PILLAR_LINKS: Partial<Record<ArticleIdentity, readonly ArticleIdentity[]>> = {
  'guias-por-especie/urgencias-en-perros': ['costos-y-acceso/atencion-veterinaria-24h-por-zona'],
  'guias-por-especie/urgencias-en-gatos': ['costos-y-acceso/atencion-veterinaria-24h-por-zona'],
  'costos-y-acceso/costo-emergencia-veterinaria-nocturna': ['guias-por-especie/urgencias-en-perros'],
  'costos-y-acceso/atencion-veterinaria-24h-por-zona': [
    'guias-por-especie/urgencias-en-perros', 'guias-por-especie/urgencias-en-gatos',
  ],
};
