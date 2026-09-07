import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertTypedLink, assertInverse, directoryLinks, relatedGuides, crossPillarLinks, linkPath, type LinkInventory, type TypedLink } from '../../src/lib/blog-links.ts';

const article = { data: { pilar: 'guias-por-especie', slug: 'urgencias-en-perros', estado: 'publicado', title: 'Fixture' } };
const identity = 'guias-por-especie/urgencias-en-perros';
const source = `/blog/${identity}/`;
const inventory: LinkInventory = {
  clinics: [{ id: 'filename-different', data: { slug: 'hems-una-heredia' } }],
  canonicalZones: ['san-pablo-heredia'],
  generatedPaths: new Set([source, '/clinica/hems-una-heredia/', '/zona/san-pablo-heredia/', '/provincia/heredia/']),
  articles: [article],
};
const link = (family: TypedLink['family'], identity: string): TypedLink => ({ family, identity, href: linkPath(family, identity), label: identity });
test('positivos: identidad, familia y URL completa de las cuatro familias', () => {
  for (const target of [link('clinica','hems-una-heredia'),link('zona','san-pablo-heredia'),link('provincia','heredia'),link('articulo',identity)]) assert.doesNotThrow(()=>assertTypedLink(target,inventory));
});
const negatives: [string, TypedLink, LinkInventory][] = [
  ['clínica inexistente',link('clinica','inexistente'),inventory],
  ['entry.id no es data.slug',link('clinica','filename-different'),{...inventory,generatedPaths:new Set([...inventory.generatedPaths,'/clinica/filename-different/'])}],
  ['alias de zona aunque tenga artefacto',link('zona','san-pablo-de-heredia'),{...inventory,generatedPaths:new Set([...inventory.generatedPaths,'/zona/san-pablo-de-heredia/'])}],
  ['zona canónica no generada',link('zona','san-pablo-heredia'),{...inventory,generatedPaths:new Set([source])}],
  ['provincia inexistente',link('provincia','inexistente'),inventory],
  ['artículo inexistente',link('articulo','guias-por-especie/inexistente'),inventory],
  ['artículo borrador aunque exista HTML',link('articulo',identity),{...inventory,articles:[{data:{...article.data,estado:'borrador'}}]}],
  ['pilar incorrecto',link('articulo','costos-y-acceso/urgencias-en-perros'),inventory],
  ['slug válido en familia equivocada',link('clinica','heredia'),inventory],
  ['URL completa incorrecta',{...link('clinica','hems-una-heredia'),href:'/zona/hems-una-heredia/'},inventory],
  ['destino eliminado',link('clinica','hems-una-heredia'),{...inventory,generatedPaths:new Set([source])}],
];
for(const [name,target,context] of negatives) test(`mutación rechazada: ${name}`,()=>{
  assert.throws(()=>assertTypedLink(target,context),/Destino inválido/);
});
test('inverso ausente rompe; inverso derivado pasa',()=>{
  const target=link('clinica','hems-una-heredia');
  assert.throws(()=>assertInverse(source,target,[]),/Inverso ausente/);
  assert.doesNotThrow(()=>assertInverse(source,target,relatedGuides('clinica',target.identity,[article]).map(l=>l.href)));
});
test('catálogo poblado: borrador no activa ninguno de los sentidos',()=>{
  const draft={data:{...article.data,estado:'borrador'}};
  assert.deepEqual(directoryLinks(draft),[]);
  assert.deepEqual(relatedGuides('clinica','hems-una-heredia',[draft]),[]);
  assert.deepEqual(relatedGuides('zona','guapiles',[draft]),[]);
  assert.deepEqual(crossPillarLinks(draft,[article]),[]);
});
test('cada clínica y zona del piloto tiene inverso desde la misma fuente',()=>{
  for(const target of directoryLinks(article)) {
    if(target.family==='clinica'||target.family==='zona') assertInverse(source,target,relatedGuides(target.family,target.identity,[article]).map(l=>l.href));
  }
});
test('cross pillar sólo activa destinos existentes publicados del otro pilar',()=>{
  const other={data:{...article.data,pilar:'costos-y-acceso',slug:'atencion-veterinaria-24h-por-zona'}};
  assert.equal(crossPillarLinks(article,[other]).length,1);
  assert.deepEqual(crossPillarLinks(article,[{data:{...other.data,estado:'borrador'}}]),[]);
  assert.deepEqual(crossPillarLinks(article,[]),[]);
});
