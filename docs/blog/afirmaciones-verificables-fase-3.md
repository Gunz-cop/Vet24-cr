# Fase 3 — Afirmaciones verificables del plan

Última revisión: **2026-09-07**.
Estado: **aprobado por el usuario, condicionado a las correcciones documentales de los nueve hallazgos; implementación no iniciada**.
Rama: `claude/vet24-cr-phase-3-blog-wos6bp`.
Base documental: `3eed5bd598b8bb04eb9eb3923487449c08e2de70`.

El usuario aprobó el plan el **2026-09-07**, tras una auditoría independiente que rechazó `6ee7c8d`, aceptando sus nueve hallazgos y exigiendo corregirlos. Esta revisión incorpora las nueve correcciones de la tabla G; es un reporte de la correctora, no un veredicto independiente sobre su propia corrección. La coordinadora debe leer el diff y repetir comprobaciones.

La aprobación cubre el diseño del [plan](plan-fase-3.md), cinco artículos (piloto incluido), subfases B1–B4 y los defaults revocables de sitemap/emergencias. La tarea actual solo permite modificar estos dos documentos y commitear/push a la rama indicada. No permite implementar ni abrir PR. **Aprobar el plan no autoriza ningún merge a main**: el usuario autoriza cada candidato por separado porque main despliega automáticamente mediante Cloudflare Workers Builds.

Cada fila es una hipótesis que otra sesión debe comprobar. Distinguir código presente, observación histórica y obligación de implementación futura. Un método sugerido no constituye una ejecución y un exit code 0 no prueba por sí solo la afirmación.

## A. Estado del repo

| # | Afirmación acotada | Comprobación reproducible |
|---|---|---|
| A1 | La base documental y main remoto observado son 3eed5bd; la rama auditada terminaba en 6ee7c8d antes de esta corrección | `git merge-base main claude/vet24-cr-phase-3-blog-wos6bp`, `git ls-remote origin refs/heads/main refs/heads/claude/vet24-cr-phase-3-blog-wos6bp`; no usar un main local viejo |
| A2 | Solo existe la colección clinicas; blog sigue sin implementar | Leer src/content.config.ts en main y rama; export collections |
| A3 | Hay 112 archivos de fichas versionados | Contar `git ls-tree -r --name-only main src/content/clinicas`; no confundir archivos temporales con entradas |
| A4 | No existen src/data/internal-links.ts, docs/seo/, briefings/ ni src/pages/politica-editorial.astro | Buscar cada ruta en `git ls-tree -r --name-only main`; el fallo global de un ls no prueba ausencia de todas |
| A5 | EZOIC_PLACEHOLDERS tiene exactamente home-inline, zona-inline, clinica-inline, clinica-sidebar | Leer src/config/ads.ts; no inferir existencia de IDs en panel |
| A6 | Config usa trailingSlash always y output static | Leer astro.config.mjs |
| A7 | build ejecuta shorten-links antes de Astro; build:no-shorten solo Astro | Leer scripts de package.json |

## B. No-colisión y límites de conservación AR

| # | Afirmación acotada | Comprobación |
|---|---|---|
| B1 | md/[...path].ts solo carga clinicas; añadir blog no añade automáticamente mirrors | Leer endpoint y buildMarkdownMirrors/expectedMirrorRoutes; futura comparación de inventario y contenido contra BASE. No equivale a demostrar toda conservación AR |
| B2 | Las rutas ordinarias ensayadas pasan, pero hay falsos positivos heredados dentro del blog | Ejecutar en Node el literal real con el método de abajo. Default: no modificar config; futura defensa B1 hace fallar build para rutas excluidas y verifica sincronía con regex real |
| B3 | La allowlist explícita del plan §6 no autoriza archivos de propiedad AR1/AR2/AR3 | Cruzar cada fila, incluidos archivos nuevos, con las tres listas del README AR. astro.config.mjs se lee, nunca se modifica; su reparación requiere tarea AR separada. Diff contra SHA BASE inmutable y main vigente |
| B4 | agent-*.ts no carga otra colección; recibe datos derivados de clinicas | Buscar getCollection y leer imports/adaptadores de src/lib/agent-*.ts y sus consumidores. Conservar comportamiento se prueba adicionalmente por §7 del plan |

### B2: observación real y reproducción

Ubicación de deuda: `astro.config.mjs:16`, filter de sitemap. El patrón no tiene anclaje inicial; el separador inicial es opcional. Coincidencias internas como api/ al final de rapi/ excluyen la URL. mdcuidados no dispara la coincidencia, pero md/ sí.

Ejecutar desde la raíz del repo mediante `node -e` o stdin de Node, sin editar el config:

```js
const fs = require('node:fs');
const src = fs.readFileSync('astro.config.mjs', 'utf8');
const match = src.match(/!\/(.+)\/\.test/);
if (!match) throw new Error('No se pudo extraer el regex real');
const re = new RegExp(match[1]);
console.log(re.toString());
for (const path of [
  '/blog/', '/blog/guias-por-especie/', '/blog/guias-por-especie/x/',
  '/blog/mdcuidados/', '/blog/md/', '/blog/costos-y-acceso/mdguia/',
  '/blog/costos-y-acceso/rapi/', '/md/index.md', '/api/catalog.json',
  '/auth.md', '/llms.txt', '/.well-known/api-catalog',
]) console.log(JSON.stringify({path, excluded: re.test(new URL(path, 'https://vet24cr.com').pathname)}));
```

Salida real obtenida durante la corrección, 2026-09-07:

```text
/[\\/]?(api|auth\.md|llms\.txt|\.well-known|md)([/.]|$)/
{"path":"/blog/","excluded":false}
{"path":"/blog/guias-por-especie/","excluded":false}
{"path":"/blog/guias-por-especie/x/","excluded":false}
{"path":"/blog/mdcuidados/","excluded":false}
{"path":"/blog/md/","excluded":true}
{"path":"/blog/costos-y-acceso/mdguia/","excluded":false}
{"path":"/blog/costos-y-acceso/rapi/","excluded":true}
{"path":"/md/index.md","excluded":true}
{"path":"/api/catalog.json","excluded":true}
{"path":"/auth.md","excluded":true}
{"path":"/llms.txt","excluded":true}
{"path":"/.well-known/api-catalog","excluded":true}
```

No se afirma que todo /blog/ quede excluido ni que cualquier prefijo md falle. La defensa de B1 es trabajo futuro: todavía no existe test ni bloqueo de build. La reparación del regex queda como deuda AR con issue y verificación propios, no creados/ejecutados en esta entrega.

## C. Precedente CuidaTuPerroViejo

Repo público: https://github.com/Gunz-cop/CuidaTuPerroViejo. Durante la auditoría anterior se ejecutó realmente `git clone --depth 1` en un directorio temporal; HEAD observado `58b7bc3f121dbbca8116f1fa73d9e3c26593f067`. No pertenece a este repo. Estas observaciones se conservan como evidencia de esa auditoría, no como un nuevo clon realizado por la corrección.

| # | Observación en ese commit | Cómo repetirla |
|---|---|---|
| C1 | Existen generar-briefing-contenido, redactar-articulo-blog, auditar-articulo-blog, auditar-briefing-contenido y enlazado-interno-sitio | Listar .agents/skills en clon real |
| C2 | Blog usa strictObject, metaDescription max 160, siete pilares y dateModified opcional con comentario de revisión real | Leer src/content.config.ts |
| C3 | CROSS_PILLAR_LINKS y TOOL_LINKS conectan blog/herramientas; no hay directorio de clínicas en colecciones/rutas inspeccionadas | Leer src/data/internal-links.ts y consumidor SiloNavigation.astro, inventariar páginas y colecciones |
| C4 | La skill documenta tres reportes con afirmaciones falsas entre los tres primeros auditados | Leer auditar-articulo-blog/SKILL.md; verifica que el relato existe, no reconstruye los tres incidentes |
| C5 | Las skills separan auditoría/corrección; la de artículos explicita quien redacta no audita | Leer secciones de separación y regla de sesión aparte |

Si el clon falla por red, marcar las filas no verificadas en esa nueva auditoría; no sustituirlo por supuestos ni simular comandos. Un HEAD futuro distinto debe quedar identificado.

## D. Juicios deliberados, no hechos

| # | Decisión | Justificación y objeción pendiente de evaluación |
|---|---|---|
| D1 | Silo blog/directorio con puentes entre artículos | Reutiliza destinos existentes, pero no garantiza tráfico. Acoplamiento mitigado por fuente única internal-links.ts, familias/URLs y enlaces inversos verificables; no duplicar relaciones en frontmatter |
| D2 | Enum cerrado en guias-por-especie y costos-y-acceso | Default aprobado y revocable: emergencias se distribuye deliberadamente en ambos, según cinco temas del plan §3. No hay research de demanda. Revisión documentada y aprobada es requisito antes del artículo 6, no promesa |
| D3 | dateModified sin autorrelleno | Evitar declarar una revisión que no ocurrió. No se atribuye una penalización específica a AdSense |
| D4 | Nuevas claves Ezoic null | No inventar IDs. AdBanner no renderiza null y BaseLayout no llama showAds sin IDs; esto no afirma ausencia de todos los scripts globales ni verifica panel |
| D5 | Plan liviano sin SDD | Solo aceptable con condiciones y evidencia de §5–§7: veredicto favorable del candidato, cero bloqueantes y cierre productivo. Capturas solas no demuestran aceptación |
| D6 | strictObject | Rechaza campos desconocidos, a cambio de fricción. No prueba semántica de fuentes, identidad o relaciones: tienen controles adicionales |

## E. Límites de la verificación de esta entrega

1. No se implementó blog, borrador/publicación, schema, rutas, componentes ni tests. Sus criterios son obligaciones futuras, no resultados ya verdes.
2. No se corrieron build/check/tests de aplicación para una corrección solo documental. Sí se ejecutó el regex real en Node y las comprobaciones Git; sus salidas se entregan con el commit.
3. No se verificó producción, deployment actual ni escaneo de agentes en esta corrección. Nivel 4 y despliegue automático son contexto proporcionado por el usuario; §7 exige evidencia futura del SHA realmente servido.
4. No se verificó el panel de Ezoic ni IDs disponibles.
5. No hay validación de volumen de búsqueda, competencia, exactitud de los futuros artículos, tarifas o identidad/revisión de autores. Los temas seed son encargos de investigación, no recomendaciones clínicas verificadas.
6. No hay evidencia visual de implementación. Las fichas de control se eligieron leyendo el código/datos presentes; no se atribuye una medición de geometría ya realizada.
7. La identidad de la autorización documental es la instrucción explícita del usuario de fecha 2026-09-07 que pide corregir los nueve hallazgos. La tabla G permite verificar qué se cambió; no reemplaza una auditoría independiente de las correcciones ni una autorización de merge.

## F. Respuestas y condiciones de aceptación

1. **Sitemap:** no pasa el blog en todas sus formas. Ver tabla B2 real. Default sin cambio AR; build defensivo futuro bloquea slugs afectados. Deuda del config se atiende por tarea AR separada.
2. **Falsabilidad B1–B4:** cada criterio debe aportar evidencia indicada en §5 del plan. B1: exit codes, ausencia de borrador en artefactos/HTTP, fixture publicada y medidas visuales. B2: negativos tipados/inversos, geometría ≤1 CSS px, contenido/href/foco y navegación interceptada. B3: registro de identidad y rol, correspondencia visible/JSON-LD y ausencia de revisión profesional sin evidencia. B4: seis fuentes elegibles, matriz afirmación/pasaje/H2, veredicto APROBADO del candidato, cero bloqueantes y autorización humana. La evaluación semántica requiere auditor, pero un desacuerdo sin evidencia/resolución bloquea; no se aprueba por impresión general.
3. **Descubrimiento IA:** HTML/enlaces/sitemap en esta fase, sin ampliar catálogo clínico, llms ni mirrors. Si se quiere llms editorial, tarea AR2 aparte; no hay modificación implícita. B1–B4 conservan HTTP/escaneo del contrato existente según §7, con evidencia en docs/blog/evidencia/bN/ y verificador independiente.
4. **Emergencia/pliegue:** no puede afirmarse un resultado sin implementar. Bloque después del contenedor completo de detalle/contacto y después del listado en zona. HEMS, Medical Care y Gocha, más San Pablo de Heredia y Guápiles; viewports 390×844 y 1440×900. Controles y tolerancias de §5/B2 son condición de aprobación, no solo capturas.
5. **Política honesta:** sí, describe el proceso y distingue IA/auditoría editorial/aprobación humana de revisión veterinaria. Debe concordar con registros por artículo, mostrar roles reales y omitir revisadoPor sin credencial/constancia. Piloto permanece borrador hasta B3 verificada y contrato B4 satisfecho.

## G. Trazabilidad de los nueve hallazgos corregidos

Esta tabla registra cambios documentales, no implementación ni una autoaprobación independiente.

| Hallazgo aceptado | Corrección en plan | Corrección en esta hoja / evidencia exigible |
|---|---|---|
| 1 Alta: sitemap | §2 tabla real, deuda config:16, default defensivo; §5/B1 fallo de build | B2 código/salida real; E distingue prueba presente de test futuro |
| 2 Alta: allowlist | §6 matriz exhaustiva, C/M, responsables, traspasos y BASE por subfase | B3 exige cruce completo, incluidos nuevos; A1 diferencia main remoto/local |
| 3 Alta: piloto | §3 cinco incluidos; §4 borrador, fixture aislada; §5/B4 gate | F2/F5 recogen bloqueo y publicación solo tras controles completos |
| 4 Alta: subjetividad/veredicto | §5 umbrales visuales, autoría, fuentes y APROBADO del SHA con cero bloqueantes | D5 y F2 enumeran evidencia/condiciones |
| 5 Alta: enlaces | §4 familias/URLs, negativos, inversos y fuente única | D1 y F2; no validación genérica clinicas-o-zones |
| 6 Media: emergencia | §5/B2 ubicación, fichas/viewports, geometría y funcionamiento | F4 aclara ausencia de medición actual |
| 7 Media: postdeploy | §7 SHA servido, HTTP/escaneo completo, bloqueos y propiedad evidencia §6 | B1/B4 limitadas; E3/F3 |
| 8 Media: pilares | §3 default deliberado, cinco temas y gate previo al sexto | D2 elimina hipótesis de tráfico; E5 |
| 9 Alta: aprobación | Encabezado y §1 fecha/condición/alcance, merge solo caso por caso | Encabezado y E7 con misma trazabilidad |

También retirada la atribución no sustentada a AdSense sobre dateModified: plan §4 y D3 de esta hoja fundamentan la decisión únicamente en veracidad editorial.
