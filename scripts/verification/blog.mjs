#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const client = join(root, 'dist/client');
const pilotPath = 'blog/guias-por-especie/urgencias-en-perros/index.html';
const pilotUrl = 'https://vet24cr.com/blog/guias-por-especie/urgencias-en-perros/';
const errors = [];

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(client);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const sitemapFiles = files.filter((file) => /sitemap.*\.xml$/i.test(file));
const html = htmlFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
const sitemap = sitemapFiles.map((file) => readFileSync(file, 'utf8')).join('\n');

for (const path of ['blog/index.html', 'blog/guias-por-especie/index.html', 'blog/costos-y-acceso/index.html']) {
  if (!files.some((file) => relative(client, file).replaceAll('\\', '/') === path)) errors.push(`falta artefacto ${path}`);
  const expectedCanonical = `https://vet24cr.com/${path.replace(/index\.html$/, '')}`;
  const file = files.find((item) => relative(client, item).replaceAll('\\', '/') === path);
  if (file && !readFileSync(file, 'utf8').includes(`rel="canonical" href="${expectedCanonical}"`)) errors.push(`canonical incorrecto en ${path}`);
}

if (files.some((file) => relative(client, file).replaceAll('\\', '/') === pilotPath)) errors.push('el borrador generó HTML de artículo');
if (html.includes(pilotUrl)) errors.push('el borrador aparece como enlace o URL en HTML');
if (/"@type":"Article"/.test(html) && html.includes('urgencias-en-perros')) errors.push('el borrador aparece como JSON-LD Article');
if (sitemap.includes(pilotUrl)) errors.push('el borrador aparece en sitemap');
for (const expected of ['https://vet24cr.com/blog/', 'https://vet24cr.com/blog/guias-por-especie/', 'https://vet24cr.com/blog/costos-y-acceso/']) {
  if (!sitemap.includes(`<loc>${expected}</loc>`)) errors.push(`sitemap no contiene ${expected}`);
}

if (errors.length) {
  console.error(`blog: ${errors.length} fallo(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`blog: OK (${htmlFiles.length} HTML; borrador ausente de HTML, enlaces, Article y sitemap)`);
}
