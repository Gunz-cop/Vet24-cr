# Entrega de la ejecutora B3 — política editorial y atribución

Fecha: 2026-09-07  
Rama: `codex/blog-b3-politica-atribucion`  
BASE remota comprobada: `6ec4497ec926aece6da9fc8070adc8a3136c20e7`  
Candidato de producto y evidencia inicial: `d91333d6d4f42ff8503004e2e2548b4d20df4c68`

No se fusionó a `main` ni se desplegó producción. El push de esta rama no equivale a autorización de merge.

## Precondiciones y conservación

- El escaneo productivo de los 22 identificadores se ejecutó antes de tocar el producto y quedó en `base-agent-scan.json`. El JSON es válido, nivel 4 y contiene 22 checks. El proceso terminó con la aserción de Windows `UV_HANDLE_CLOSING`, código `-1073740791`, después de escribir el JSON; no se presenta como salida 0.
- `base.json` registra el SHA inmutable, los dos padres relevantes de la entrega B2, responsables, allowlist y fecha.
- `base-sitemap.json`, `base-catalog-mirrors.json` y `base-geometry.json` conservan la línea base. El sitemap contiene 134 URLs; catálogo y mirrors se validaron con 112 clínicas y 127 mirrors.
- `geometry-comparison.json` compara 8 combinaciones de ruta/viewport con delta máximo de 0 CSS px, mismo ancho de documento y mismos enlaces de navegación. `candidate-focus.json` registra foco visible en las 8 combinaciones. Las capturas de la política están en `politica-editorial-390.png` y `politica-editorial-1440.png`.

## Criterios §5/B3

| Criterio | Resultado | Evidencia |
|---|---|---|
| Política y footer | Pasa en build/preview local: `/politica-editorial/` genera HTML, canonical con barra final y enlace desde el footer. | `blog-ejecutora-final.log`, `blog-e2e.stdout.log`, capturas de política |
| Proceso editorial real | Pasa: la política distingue proceso previsto y trabajo realizado; describe brief, redacción asistida, auditoría independiente y aprobación humana. Declara que la auditoría IA no es revisión veterinaria y no inventa un comité. | `src/pages/politica-editorial.astro` y `blog-e2e.stdout.log` |
| Registro de autoría | **Pendiente/bloqueante por falta de respuesta del usuario.** `docs/blog/autoria.md` deja la pendiente explícita y no inventa una persona, perfil ni aprobación. El piloto permanece borrador; no hay artículo publicado ni JSON-LD Article en el candidato. | `docs/blog/autoria.md`, `blog-final-preview.stdout.log` |
| `revisadoPor` | Pasa por omisión: no se añade sin credencial verificable y constancia de revisión del texto concreto. | `docs/blog/autoria.md` |
| Navegación sin publicados | Pasa: el enlace `#nav-blog` no aparece en las páginas comprobadas cuando `published=0`; la prueba específica B3 pasó. | `blog-e2e.stdout.log`, `blog-final-preview.stdout.log` |
| Navegación con publicados | Implementada y cubierta condicionalmente en `tests/e2e/blog.spec.ts`, pero **no ejecutada**: hacerlo ahora exigiría publicar una fixture con una atribución inventada. Queda pendiente de la persona real que debe indicar el usuario. | `tests/e2e/blog.spec.ts` |
| Geometría y teclado | Pasa para el estado sin artículos: delta máximo 0 CSS px, enlaces de header idénticos y foco con outline `solid`. | `geometry-comparison.json`, `candidate-focus.json` |

## Comandos separados

| Comando | Resultado | Registro |
|---|---:|---|
| `npm run check` | 0 errores, 75 hints heredados | `check-final.*` |
| `npm test` | 77 pass, 0 fail, 0 skipped | `test-final.*` |
| `npm run build:no-shorten` | 0 | `build-final.*` |
| `node scripts/verification/blog.mjs` sin preview | 1, `PREVIEW_UNAVAILABLE` real | `blog-final-no-preview.*` |
| `node scripts/verification/blog.mjs` con preview | 0, 134 HTML, 0 publicados | `blog-final-preview.*`, `blog-ejecutora-final.log` |
| `node scripts/verification/agent-catalog.mjs` | 0, 112 clínicas y 112 rutas | `agent-catalog-final.*` |
| `node scripts/verification/agent-markdown.mjs` | 0, 127 mirrors | `agent-markdown-final.*` |
| `npm run test:e2e -- tests/e2e/blog.spec.ts` | 0, 8 pass | `blog-e2e.*` |
| `npm run test:e2e` candidato | 1, 96 pass, 2 fail, 11 skips | `e2e-final.*` |
| `npm run test:e2e` BASE | 1, 94 pass, 2 fail, 11 skips | `base-comparison-e2e.*` |

La comparación BASE/candidato conserva el fallo común de ordenamiento/geolocalización del caso 51. El candidato además falla el caso 56 y la BASE falla una prueba de negociación Markdown distinta; no se modificaron expectativas ni se añadieron skips.

Los diffs contra BASE y contra `origin/main` están archivados en `diff-*.log`; el inventario de rutas queda dentro de la allowlist B3.

## Límite de cierre

La verificación productiva del candidato no puede declararse hecha: esta rama no está fusionada ni desplegada, y no existe un registro de Workers Build que vincule producción con el SHA candidato. La autoría humana también queda pendiente. Se requiere que el usuario indique la persona real, su perfil/evidencia confirmada, rol y aprobación explícita antes de publicar el piloto o cerrar B3.
