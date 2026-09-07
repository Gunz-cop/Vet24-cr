import {
  ARTICULO_A_CLINICAS, ARTICULO_A_ZONAS, ARTICULO_A_PROVINCIAS, CROSS_PILLAR_LINKS,
  type ArticleIdentity,
} from '../data/internal-links.ts';

export type LinkFamily = 'clinica' | 'zona' | 'provincia' | 'articulo';
export interface ArticleRecord { data: { pilar: string; slug: string; estado: string; title: string } }
export interface TypedLink { family: LinkFamily; identity: string; href: string; label: string }
export interface LinkInventory {
  clinics: readonly { id: string; data: { slug: string } }[];
  canonicalZones: readonly string[];
  generatedPaths: ReadonlySet<string>;
  articles: readonly ArticleRecord[];
}

export const articleIdentity = (entry: ArticleRecord): ArticleIdentity => `${entry.data.pilar}/${entry.data.slug}` as ArticleIdentity;
export const linkPath = (family: LinkFamily, identity: string): string => `/${family === 'articulo' ? 'blog' : family}/${identity}/`;
export function assertTypedLink(link: TypedLink, inventory: LinkInventory): void {
  const { family, identity, href } = link;
  let valid = false;
  switch (family) {
    case 'clinica': valid = inventory.clinics.some(c => c.data.slug === identity); break;
    case 'zona': valid = inventory.canonicalZones.includes(identity); break;
    case 'provincia': valid = inventory.generatedPaths.has(`/provincia/${identity}/`); break;
    case 'articulo': valid = inventory.articles.some(a => a.data.estado === 'publicado' && articleIdentity(a) === identity); break;
    default: throw new Error(`Familia inválida: ${family}`);
  }
  if (!valid || href !== linkPath(family, identity) || !inventory.generatedPaths.has(href)) {
    throw new Error(`Destino inválido ${family}:${identity} (${href})`);
  }
}

const catalogs = { clinica: ARTICULO_A_CLINICAS, zona: ARTICULO_A_ZONAS, provincia: ARTICULO_A_PROVINCIAS };
export function directoryLinks(entry: ArticleRecord): TypedLink[] {
  if (entry.data.estado !== 'publicado') return [];
  return (Object.keys(catalogs) as (keyof typeof catalogs)[]).flatMap(family =>
    (catalogs[family][articleIdentity(entry)] ?? []).map(identity => ({
      family, identity, href: linkPath(family, identity), label: identity.replaceAll('-', ' '),
    })));
}
export function relatedGuides(family: 'clinica' | 'zona', identity: string, articles: readonly ArticleRecord[]): TypedLink[] {
  return articles.filter(a => a.data.estado === 'publicado' && catalogs[family][articleIdentity(a)]?.includes(identity))
    .map(a => ({ family: 'articulo', identity: articleIdentity(a), href: linkPath('articulo', articleIdentity(a)), label: a.data.title }));
}
export function crossPillarLinks(entry: ArticleRecord, articles: readonly ArticleRecord[]): TypedLink[] {
  if (entry.data.estado !== 'publicado') return [];
  const targets = CROSS_PILLAR_LINKS[articleIdentity(entry)] ?? [];
  return articles.filter(a => a.data.estado === 'publicado' && a.data.pilar !== entry.data.pilar && targets.includes(articleIdentity(a)))
    .map(a => ({ family: 'articulo', identity: articleIdentity(a), href: linkPath('articulo', articleIdentity(a)), label: a.data.title }));
}

export function assertInverse(source: string, target: TypedLink, inverseHrefs: readonly string[]): void {
  if ((target.family === 'clinica' || target.family === 'zona') && !inverseHrefs.includes(source)) {
    throw new Error(`Inverso ausente: ${target.href} → ${source}`);
  }
}
