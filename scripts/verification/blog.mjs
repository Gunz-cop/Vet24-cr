#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { assertTypedLink, assertInverse, directoryLinks, directoryNames, relatedGuides, crossPillarLinks } from '../../src/lib/blog-links.ts';

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

const fixturePublished = /^estado: ["']?publicado/m.test(readFileSync(join(root, 'src/content/blog/urgencias-en-perros.md'), 'utf8'));
if (!fixturePublished && files.some((file) => relative(client, file).replaceAll('\\', '/') === pilotPath)) errors.push('el borrador generó HTML de artículo');
if (!fixturePublished && html.includes(pilotUrl)) errors.push('el borrador aparece como enlace o URL en HTML');
if (!fixturePublished && /"@type":"Article"/.test(html) && html.includes('urgencias-en-perros')) errors.push('el borrador aparece como JSON-LD Article');
if (!fixturePublished && sitemap.includes(pilotUrl)) errors.push('el borrador aparece en sitemap');
for (const expected of ['https://vet24cr.com/blog/', 'https://vet24cr.com/blog/guias-por-especie/', 'https://vet24cr.com/blog/costos-y-acceso/']) {
  if (!sitemap.includes(`<loc>${expected}</loc>`)) errors.push(`sitemap no contiene ${expected}`);
}

// Inspect the public assets and Worker bundle separately (plan §4).
const serverFiles = walk(join(root, 'dist/server'));
if (!serverFiles.length) errors.push('dist/server ausente');
const serverOccurrences = serverFiles.filter(f => /\.(?:mjs|js|json)$/.test(f) && readFileSync(f,'utf8').includes('urgencias-en-perros')).map(f => relative(root,f).replaceAll('\\', '/')).sort();
console.log(JSON.stringify({directory:'dist/server',files:serverFiles.length,pilotOccurrences:serverOccurrences,policy:'Marcador B1 permitido en bundle; contenido editorial borrador prohibido desde B4'}));
console.log(JSON.stringify({directory:'dist/client',files:files.length,fixturePublished}));

const field = (source, name) => source.match(new RegExp('^'+name+':\\s*["\']?([^"\'\\r\\n]+)', 'm'))?.[1]?.trim();
const articles = walk(join(root,'src/content/blog')).filter(f=>f.endsWith('.md')).map(f=>{
 const content=readFileSync(f,'utf8');return {body:content.split(/^---\s*$/m).slice(2).join('---').trim(),data:{pilar:field(content,'pilar'),slug:field(content,'slug'),estado:field(content,'estado')??'borrador',title:field(content,'title')}};
});
const clinics=walk(join(root,'src/content/clinicas')).filter(f=>f.endsWith('.md')).map(f=>({id:relative(join(root,'src/content/clinicas'),f).replace(/\.md$/,''),data:{slug:field(readFileSync(f,'utf8'),'slug'),nombre:field(readFileSync(f,'utf8'),'nombre'),provincia:field(readFileSync(f,'utf8'),'provincia')}}));
const canonicalZones=[...readFileSync(join(root,'src/lib/zones.ts'),'utf8').split('] as const')[0].matchAll(/slug: "([^"]+)"/g)].map(m=>m[1]);
const provinces=[...readFileSync(join(root,'src/pages/provincia/[provincia].astro'),'utf8').split('return provincesMap')[0].matchAll(/slug: "([^"]+)"/g)].map(m=>m[1]);
const generatedPaths=new Set(htmlFiles.map(f=>'/'+relative(client,f).replaceAll('\\','/').replace(/index\.html$/,'')));
const inventory={clinics,canonicalZones,generatedPaths,articles};
const zones = [...readFileSync(join(root,'src/lib/zones.ts'),'utf8').split('] as const')[0].matchAll(/nombre: "([^"]+)", slug: "([^"]+)"/g)].map(m => ({ nombre: m[1], slug: m[2] }));
const names = directoryNames(clinics, zones);
const readPage=path=>readFileSync(join(client,path,'index.html'),'utf8');
const anchorPattern=/<a\b([^>]*)>([\s\S]*?)<\/a>/g;
const attr=(attrs,name)=>attrs.match(new RegExp('(?:^|\\s)'+name+'="([^"]*)"'))?.[1];
const blocks=content=>[...content.matchAll(/<section\b[^>]*data-blog-links[^>]*>[\s\S]*?<\/section>/g)].map(m=>m[0]).join('');
const hrefs=content=>[...content.matchAll(anchorPattern)].map(m=>attr(m[1],'href')).filter(Boolean);
const classifications={internal:0,external:0,protocol:0};
// The home page is SSR. Verify its generated manifest and its local preview response.
let homeHtml = null;
const previewUrl = new URL('/', process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4321').href;
const previewAddress = new URL(previewUrl);
const previewCommand = `npm run preview -- --host ${previewAddress.hostname} --port ${previewAddress.port || (previewAddress.protocol === 'https:' ? '443' : '80')}`;
console.log(JSON.stringify({ check: 'SSR preview prerequisite', url: previewUrl, command: previewCommand, override: 'PLAYWRIGHT_BASE_URL' }));
const manifestSource = serverFiles.filter(f=>f.endsWith('.mjs')).map(f=>readFileSync(f,'utf8')).find(s=>s.includes('deserializeManifest({'));
const manifestJson = manifestSource?.match(/deserializeManifest\((\{.*\})\);/);
const homeRoute = manifestJson && JSON.parse(manifestJson[1]).routes.some(r=>r.routeData.route==='/' && !r.routeData.prerender);
if (homeRoute) {
  try {
    const response = await fetch(previewUrl, { signal: AbortSignal.timeout(10000) });
    const body = await response.text();
    if (response.status !== 200 || !body.includes('rel="canonical" href="https://vet24cr.com/"')) {
      errors.push('SSR /: HTTP/canonical inválido en preview ' + previewUrl);
    } else homeHtml = body;
  } catch (error) {
    errors.push('PREVIEW_UNAVAILABLE: no se pudo verificar SSR / en ' + previewUrl
      + '. Ejecutá "' + previewCommand + '" desde este checkout después del build, y repetí "node scripts/verification/blog.mjs".'
      + ' Para otro puerto, configurá PLAYWRIGHT_BASE_URL. Causa: ' + error.message);
  }
} else errors.push('SSR / ausente del manifest generado en dist/server');
function inspectLinks(content,source){
 for(const match of content.matchAll(anchorPattern)) {
  const href=attr(match[1],'href');if(!href)continue;
  if(/^(tel:|mailto:)/.test(href)){classifications.protocol++;continue;}
  const url=new URL(href,'https://vet24cr.com'+source);
  if(url.origin!=='https://vet24cr.com'){classifications.external++;continue;}
  classifications.internal++;
  const destination=join(client,url.pathname,url.pathname.endsWith('/')?'index.html':'');
  if(url.pathname!=='/'&&!existsSync(destination)){errors.push('Destino no generado: '+source+' → '+href);continue;}
  // A missing SSR prerequisite already blocks the run; do not invent missing-fragment errors.
  if (url.pathname === '/' && homeHtml === null) continue;
  const targetHtml=url.pathname==='/'?homeHtml:readFileSync(destination,'utf8');
  if (destination.endsWith('.html') || url.pathname === '/') {
    const canonicalTag = targetHtml.match(/<link\b[^>]*rel="canonical"[^>]*>/)?.[0];
    if (canonicalTag && attr(canonicalTag, 'href') !== url.origin + url.pathname) errors.push('Destino no canónico: ' + href);
  }
  if(url.hash && ![...targetHtml.matchAll(/id="([^"]+)"/g)].some(m=>m[1]===decodeURIComponent(url.hash.slice(1)))) errors.push('Fragmento ausente: '+href);
  const route = url.pathname.match(/^\/(clinica|zona|provincia)\/([^/]+)\/$/)
    ?? url.pathname.match(/^\/(blog)\/([^/]+\/[^/]+)\/$/);
  const family=attr(match[1],'data-link-family') ?? (route?.[1] === 'blog' ? 'articulo' : route?.[1]);
  if(family)try{
   const identity=attr(match[1],'data-link-identity') ?? route?.[2];
   if(family==='provincia'&&!provinces.includes(identity))throw new Error('Provincia no generada por página actual: '+identity);
   const target={family,identity,href:url.pathname,label:''};
   assertTypedLink(target,inventory);
   if (attr(match[1],'data-link-family') && href !== url.pathname) throw new Error('URL tipada no canónica: '+href);
   if (/^\/blog\/[^/]+\/[^/]+\/$/.test(source)) assertInverse(source,target,hrefs(blocks(targetHtml)));
  }catch(e){errors.push(e.message);}
 }
}
for(const f of htmlFiles){
 const path='/'+relative(client,f).replaceAll('\\','/').replace(/index\.html$/,'');
 const content=readFileSync(f,'utf8');
 if(path.startsWith('/blog/'))inspectLinks(content,path);else if(blocks(content))inspectLinks(blocks(content),path);
}
for(const article of articles){
 const source='/blog/'+article.data.pilar+'/'+article.data.slug+'/';
 if(article.data.estado!=='publicado'){
  const marker='Este artículo está en preparación editorial y no debe publicarse hasta completar investigación, auditoría independiente, política editorial y aprobación humana.';
  if(article.body!==marker && serverFiles.some(f=>/\.(mjs|js|json)$/.test(f)&&readFileSync(f,'utf8').includes(article.data.slug)))errors.push('dist/server: borrador editorial serializado: '+source);
  if(generatedPaths.has(source)||hrefs(html).some(h=>new URL(h,'https://vet24cr.com').pathname===source)||sitemap.includes(source))errors.push('Borrador público en dist/client: '+source);
  continue;
 }
 if(!generatedPaths.has(source)){errors.push('Artículo publicado ausente: '+source);continue;}
 const outgoing=hrefs(blocks(readPage(source)));
 for(const target of [...directoryLinks(article, names),...crossPillarLinks(article,articles)])try{
  assertTypedLink(target,inventory);
  if(target.family==='provincia'&&!provinces.includes(target.identity))throw new Error('Provincia inválida');
  if(!outgoing.includes(target.href))throw new Error('Arista ausente: '+source+' → '+target.href);
  const anchor = [...blocks(readPage(source)).matchAll(anchorPattern)].find(m => attr(m[1], 'href') === target.href);
  const label = anchor?.[2].replace(/<[^>]*>/g, '').replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").trim();
  if (label !== target.label) throw new Error('Ancla incorrecta: ' + target.href + '; esperado: ' + target.label + '; recibido: ' + label);
  assertInverse(source,target,hrefs(blocks(readPage(target.href))));
 }catch(e){errors.push(e.message);}
}
// Every inverse block must equal the relationships derived from the catalog.
for(const f of htmlFiles){
 const path='/'+relative(client,f).replaceAll('\\','/').replace(/index\.html$/,'');
 const match=path.match(/^\/(clinica|zona)\/([^/]+)\/$/);if(!match)continue;
 const actual=hrefs(blocks(readFileSync(f,'utf8'))).sort();
 const expected=relatedGuides(match[1],match[2],articles).map(l=>l.href).sort();
 if(JSON.stringify(actual)!==JSON.stringify(expected))errors.push('Bloque inverso divergente: '+path);
}
console.log(JSON.stringify({directory:'dist/client',classifications,articles:articles.length,published:articles.filter(a=>a.data.estado==='publicado').length}));
if (errors.length) {
  console.error(`blog: ${errors.length} fallo(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`blog: OK (${htmlFiles.length} HTML; dist/client: política de publicación y enlaces verificada)`);
}
