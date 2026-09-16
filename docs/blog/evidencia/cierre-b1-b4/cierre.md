# Cierre productivo de B1–B4 — Fase 3, blog editorial

Registro exigido por §7 del plan. Producido por la sesión coordinadora el 2026-09-09
sobre `main` = `d26e3e9a890b7c09031b6efcd1534d08b5c0d55a`, ya desplegado.

Este documento cierra **B2 y B4**, que no tenían registro, y completa la parte
productiva de **B3**. **B1** ya cerró en `docs/blog/evidencia/b1/cierre.md` bajo la
excepción de base inobtenible de §7.4, autorizada por el usuario; aquí sólo se
añade la comprobación de que su estado se conserva.

Autorización de los merges a `main`: del usuario, por subfase. Ninguno de estos
cierres autoriza un merge nuevo.

## SHAs

| Subfase | Merge a main | CI |
|---|---|---|
| B1 | `3edb6bc` (PR #25) | run 35, success |
| B2 | `078131d` (PR #26) + `6ec4497` evidencia | runs 40 y 41, success |
| B3 | `f9f2ecc` | run 43, success |
| B4 | `d26e3e9` | run 44, success |

## §7.1 — Correspondencia despliegue ↔ SHA: PENDIENTE

**No se obtuvo el registro de Workers Builds con ID de deployment y SHA de origen.**
Esta sesión no tiene acceso al panel de Cloudflare. §7 es explícito: un SHA local o
un CI verde no prueban qué commit sirve producción, y sin esa correspondencia el
cierre queda pendiente. Se deja pendiente, no se sustituye.

Lo que sí quedó demostrado, y es menos que lo exigido: producción sirve contenido
que **sólo existe a partir de `d26e3e9`** — los cinco artículos publicados, el
JSON-LD con `author.@type = Organization` y la entrada de navegación condicionada a
que exista al menos un artículo publicado. Eso prueba que el commit servido es
`d26e3e9` o un descendiente suyo; no sustituye al ID de deployment.

Para completar §7.1 hace falta que el usuario, o una sesión con acceso al panel,
archive el deployment ID, su resultado y el SHA de origen.

## §7.2 — Endpoints AR: conservados

Evidencia: `endpoints-ar.log`.

Los seis endpoints responden 200 con su MIME esperado y HEAD sin cuerpo:
`/api/catalog.json` y `/api/openapi.json` como `application/json`; `/llms.txt` como
`text/plain`; `/api/readme.md` y `/auth.md` como `text/markdown`;
`/.well-known/api-catalog` como `application/linkset+json`.
`/sitemap.xml` conserva el **301** hacia `/sitemap-index.xml`.

## §7.3 — Negociación de contenido: conservada

Evidencia: `negociacion-y-rutas.log`.

En una ruta del inventario BASE (`/clinica/hems-una-heredia/`): `Accept: text/markdown`
devuelve Markdown; `Accept` de navegador devuelve HTML; `text/markdown;q=0` devuelve
HTML; HEAD selecciona igual sin cuerpo. Se conservan `vary: Accept` y
`cache-control: private, no-store`.

El blog **permanece HTML y no anuncia espejo**: `Accept: text/markdown` sobre un
artículo devuelve `text/html`, como exige §7.

## §7.4 — Escaneo de los 22 identificadores: sin regresión

Evidencia: `production-agent-scan.json`, `production-agent-scan-command.log`,
`agent-scan-comparison.log`.

Escaneo productivo del 2026-09-09, 22 identificadores, **nivel 4 conservado**.
Comparación por identificador contra la base ejecutada de cada subfase:

| Base | Identificadores | Regresiones `pass → fail/neutral` |
|---|---|---|
| B2 | 22 | **0** |
| B3 | 22 | **0** |
| B4 | 22 | **0** |

Se cumple la regla de cierre de §7.4: ningún identificador que estuviera en `pass`
pasó a `fail` o `neutral`.

La base de **B1** no es comparable identificador por identificador: siete claves
figuran como ausentes en su JSON y aparecen como `pass` en el escaneo actual. No se
computa como mejora ni como regresión — es la misma limitación por la que B1 cerró
bajo la excepción de §7.4, y queda registrada aquí para que no se lea como un avance.

Estados heredados en producción hoy: 7 `pass`, 9 `fail`, 6 `neutral`. Son deuda AR
previa al blog, idéntica a la de las bases. **No se convierten en `pass`.**

## §7.5 — Rutas, canonical y borradores

Evidencia: `negociacion-y-rutas.log`.

Las nueve rutas nuevas responden 200 con canonical propio y correcto. `/blog/md/`,
una ruta de artículo inexistente y `/blog/borrador/` devuelven **404**. No queda
ningún borrador en la colección: los cinco artículos están publicados.

Sitemap: **140 URLs** — 112 clínicas, 7 provincias, 7 zonas, 8 de blog, 6 páginas
sueltas. Las 112 clínicas se conservan íntegras: el defecto latente del filtro de
`astro.config.mjs:15` no expulsó ninguna ruta previa. Ninguna ruta publicada quedó
fuera del sitemap.

## Lo que NO se verificó

1. **§7.1, correspondencia de deployment.** Detallado arriba. Es la única condición
   contractual que falta para que estos cierres sean completos.
2. **Geometría contra producción.** Chromium no alcanza el dominio desde este
   contenedor: el proxy corta los túneles del navegador (`vet24cr.com:443 tunnel
   closed, code 1006`) mientras `curl` pasa. Se intentó con tres configuraciones. No
   se simuló ninguna medida.
3. **Auditoría independiente de B4 sobre `cb2ec54`.** Se solicitó y no llegó antes
   del merge. Consta en el mensaje del commit `d26e3e9`.

## Defecto del dispositivo de verificación, detectado en este cierre

`src/pages/clinica/[slug].astro` y `src/pages/zona/[zona].astro` importan
`blog-links.ts`. **Publicar un artículo modifica fichas de clínica.** La línea base
de geometría de B4 cubre hems, medical-care, gocha, guápiles y san-pablo: las cinco
que ya estaban mapeadas y que menos cambiaron. Se comprobó en producción que
`pets-plus-san-antonio-belen` y `medical-pets-cartago` ganaron un bloque «Guías
relacionadas» que antes no tenían, y **ninguna de las dos estaba en línea base
alguna**.

Mitigación observada, estructural y no medida: «Guías relacionadas» es el último
`<h2>` del documento, por debajo del bloque de urgencia y del contacto, de modo que
lo que se añade no desplaza lo que tiene encima.

Cualquier subfase futura debe capturar base de geometría de **toda ficha o zona cuyo
mapeo cambie**, no de un conjunto fijo heredado.

## Deuda que queda abierta

- §7.1 pendiente en las cuatro subfases.
- Enmienda de geometría de bloques (`docs/blog-geometria-bloques`) sin fusionar.
- Corrección del dispositivo de línea base descrita arriba, sin enmendar en el plan.
- Los issues de B1–B4 se cierran a mano tras esta evidencia; no se usó `Closes`.
