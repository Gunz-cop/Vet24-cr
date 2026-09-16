import type { CollectionEntry } from 'astro:content';
import { z } from 'astro/zod';
import { assertBlogRouteAllowedByPattern } from './blog-sitemap.ts';

export const BLOG_PILLARS = ['guias-por-especie', 'costos-y-acceso'] as const;
export type BlogPillar = (typeof BLOG_PILLARS)[number];
export type BlogEntry = CollectionEntry<'blog'>;

export const PILAR_NAMES: Record<BlogPillar, string> = {
  'guias-por-especie': 'Guías por especie',
  'costos-y-acceso': 'Costos y acceso',
};

const isoDate = z.iso.date('Debe ser una fecha ISO YYYY-MM-DD válida');

export const blogSchema = z.strictObject({
  title: z.string().trim().min(1),
  seoTitle: z.string().trim().min(1),
  metaDescription: z.string().trim().min(1).max(160),
  pilar: z.enum(BLOG_PILLARS),
  slug: z.string().trim().min(1).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug no canónico'),
  estado: z.enum(['borrador', 'publicado']).default('borrador'),
  autor: z.string().trim().min(1),
  datePublished: isoDate.optional(),
  dateModified: isoDate.optional(),
  revisadoPor: z.string().trim().min(1).optional(),
  heroImage: z.object({
    src: z.string().trim().regex(
      /^\/images\/blog\/[a-z0-9-]+\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp)$/,
      'La imagen debe ser un asset local del blog',
    ),
    srcset: z.array(z.object({
      src: z.string().trim().regex(
        /^\/images\/blog\/[a-z0-9-]+\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp)$/,
        'La variante debe ser un asset local del blog',
      ),
      width: z.number().int().positive(),
    })).min(1),
    alt: z.string().trim().min(1).max(180),
    caption: z.string().trim().min(1).max(240),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.estado === 'publicado' && !data.datePublished) {
    ctx.addIssue({ code: 'custom', path: ['datePublished'], message: 'datePublished es obligatorio para contenido publicado' });
  }
  try {
    assertBlogRouteAllowedByPattern(blogArticlePath(data.pilar, data.slug));
  } catch (error) {
    ctx.addIssue({ code: 'custom', path: ['slug'], message: error instanceof Error ? error.message : String(error) });
  }
});

export function blogPillarPath(pilar: BlogPillar): string {
  return `/blog/${pilar}/`;
}

export function blogArticlePath(pilar: BlogPillar, slug: string): string {
  return `${blogPillarPath(pilar)}${slug}/`;
}

export function isPublished(entry: BlogEntry): boolean {
  return entry.data.estado === 'publicado';
}

export async function getBlogEntries(): Promise<BlogEntry[]> {
  const { getCollection } = await import('astro:content');
  const entries = await getCollection('blog');
  const identities = new Set<string>();
  for (const entry of entries) {
    const identity = blogArticlePath(entry.data.pilar, entry.data.slug);
    if (identities.has(identity)) throw new Error(`URL de blog duplicada: ${identity}`);
    identities.add(identity);
  }
  return entries;
}

export async function getPublishedBlogEntries(pilar?: BlogPillar): Promise<BlogEntry[]> {
  return (await getBlogEntries())
    .filter((entry) => isPublished(entry) && (!pilar || entry.data.pilar === pilar))
    .sort((a, b) => (b.data.datePublished ?? '').localeCompare(a.data.datePublished ?? ''));
}
