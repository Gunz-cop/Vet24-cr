import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { clinicSchema } from './lib/clinic-schema';
import { BLOG_PILLARS, blogPillarPath, blogSchema } from './lib/blog';
import { assertBlogRouteAllowed, assertSitemapFilterIsSynchronized } from './lib/blog-sitemap';

assertSitemapFilterIsSynchronized();
for (const pilar of BLOG_PILLARS) assertBlogRouteAllowed(blogPillarPath(pilar));

const clinicas = defineCollection({
  // Load Markdown files from src/content/clinicas/
  loader: glob({ pattern: '**/[^_]*.{md,mdx}', base: "./src/content/clinicas" }),
  schema: clinicSchema
});

const blog = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/blog' }),
  schema: blogSchema,
});

export const collections = { clinicas, blog };
