import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const articles = [
  ['guias-por-especie', 'urgencias-en-perros'],
  ['guias-por-especie', 'urgencias-en-gatos'],
  ['guias-por-especie', 'atencion-veterinaria-para-exoticos'],
  ['costos-y-acceso', 'costo-emergencia-veterinaria-nocturna'],
  ['costos-y-acceso', 'atencion-veterinaria-24h-por-zona'],
];
const root = new URL('../../../..', import.meta.url).pathname.replace(/^\/(.:)/, '$1');
const sitemap = await readFile(join(root, 'dist/client/sitemap-0.xml'), 'utf8');
const results = [];

for (const [pillar, slug] of articles) {
  const route = `/blog/${pillar}/${slug}/`;
  const response = await fetch(`http://localhost:4321${route}`);
  const html = await response.text();
  const jsonLd = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)]
    .map((match) => JSON.parse(match[1]));
  const article = jsonLd.find((entry) => entry['@type'] === 'Article');
  const checks = {
    htmlExists: html.length > 0,
    httpStatus: response.status,
    sitemap: sitemap.includes(`<loc>https://vet24cr.com${route}</loc>`),
    canonical: html.includes(`<link rel="canonical" href="https://vet24cr.com${route}">`),
    articleJsonLd: Boolean(article),
    author: article?.author?.name === 'Equipo de Vet24cr',
    datePublished: article?.datePublished === '2026-09-08',
    noDraftMarker: !/en preparaci[oó]n editorial|"estado":"borrador"/i.test(html),
  };
  results.push({ slug, route, checks, pass: Object.values(checks).every((value) => value === true || value === 200) });
}

const markdown = (await readdir(join(root, 'src/content/blog'))).filter((name) => name.endsWith('.md'));
const report = {
  checkedAt: new Date().toISOString(),
  articleCount: articles.length,
  serializedMarkdownCount: markdown.length,
  results,
  pass: results.every((result) => result.pass) && markdown.length === 5,
};
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
