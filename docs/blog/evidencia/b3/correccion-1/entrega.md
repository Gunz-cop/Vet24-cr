# Corrección de revisión B3 — enlace móvil al blog

Fecha: 2026-09-07  
Rama: `codex/blog-b3-politica-atribucion`  
BASE: `6ec4497ec926aece6da9fc8070adc8a3136c20e7`  
HEAD anterior: `15d0c0d2ab8954f1516007b005ffa53c70167c07`  
Candidato de esta corrección: `c24493280627381913f0bc71b168e33b3b20e416`

## Cambio realizado

Se añadió en `src/layouts/BaseLayout.astro` un enlace `<a href="/blog/">Blog</a>` dentro del footer, bajo el mismo `hasPublishedBlog` que controla la entrada del header. No se duplicó la fuente de verdad.

Se amplió `tests/e2e/blog.spec.ts` para comprobar:

- con cero artículos publicados, ni el header ni el footer muestran `/blog/` en 390×844 y 1440×900;
- con una fixture publicada, ambos enlaces existen, tienen `/blog/`, y el enlace del footer recibe foco en ambos viewports.

La fixture publicada fue un checkout temporal: se cambió solo allí el piloto a `estado: "publicado"` y se añadió una fecha para construirlo. No se versionó ni se usó para publicar producción; `docs/blog/autoria.md` y el candidato permanecieron sin cambios.

## Resultados reales

| Comando | Resultado | Evidencia |
|---|---:|---|
| `npm run check` | 0 errores, 75 hints heredados | `check.*` |
| `npm test` | 77 pass, 0 fail, 0 skipped | `test.*` |
| `npm run build:no-shorten` | 0 | `build.*` |
| `node scripts/verification/blog.mjs` sin preview | 1, `PREVIEW_UNAVAILABLE` real | `blog-no-preview.*` |
| `node scripts/verification/blog.mjs` con preview | 0, 134 HTML, 0 publicados | `blog-preview.*`, `blog-ejecutora.log` |
| `node scripts/verification/agent-markdown.mjs` | 0, 127 mirrors | `agent-markdown.*` |
| `node scripts/verification/agent-catalog.mjs` | 0, 112 clínicas y 112 rutas | `agent-catalog.*` |
| `npm run test:e2e` candidato | 0, 98 pass, 11 skips, 0 fallos | `e2e.*` |
| fixture publicada: `npm run test:e2e -- tests/e2e/blog.spec.ts -g B3` | 0, 2 pass | `fixture-e2e.*` |

La prueba de fixture comprobó específicamente el footer en 390×844 y 1440×900. `fixture-footer-geometry.json` registra un enlace `/blog/` en cada viewport y foco visible; `candidate-footer-geometry.json` registra cero enlaces `/blog/` en el candidato sin artículos publicados.

No se repitió la comparación E2E contra BASE porque la suite completa de este candidato no tuvo fallos. La comparación anterior queda conservada en `../base-comparison-e2e.*`; esta ejecución no modifica expectativas ni agrega skips.

## Alcance y diff

`diff-name-status-previous.log` contiene exactamente estas dos rutas de producto:

```text
M       src/layouts/BaseLayout.astro
M       tests/e2e/blog.spec.ts
```

No se tocaron la política editorial, `docs/blog/autoria.md`, `BlogAuthor.astro`, el catálogo, el plan, el esquema, fichas, configuración, dependencias ni CI. Los diffs completos contra BASE y contra el HEAD anterior están archivados en esta carpeta.

La rama fue empujada después del commit de producto y de la evidencia. No se fusionó a `main` ni se abrió PR. La verificación productiva de esta corrección continúa pendiente porque no existe un deployment de este SHA.
