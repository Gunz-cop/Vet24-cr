# Entrega de la ejecutora B2 — pendiente de verificación independiente

Fecha: 2026-09-07. Rama: `codex/blog-b2`.
BASE remota inmutable: `b9d7db74d85f99ab580c7bc0d03dd51c13744f71`.
Candidato de producto/tests: `34ef2035a44c5ba2d5116106a7143dc133d86228`.
Los commits posteriores de esta entrega sólo incorporan evidencia. No se fusionó a main ni se desplegó este candidato.

## Precondiciones

Antes de editar producto se ejecutó el script AR existente con los 22 identificadores explícitos: `base-agent-scan.json`, `base-agent-scan-command.log`, `base-agent-scan.stderr.log`. JSON íntegro, 22 checks, nivel 4, fecha de servicio 2026-09-07T10:32:10.412Z. El proceso Node terminó con aserción Windows UV_HANDLE_CLOSING y código -1073740791 después de escribir el JSON; se conserva, no se presenta como salida 0 ni como 22 pass. `base-scan-coverage.json` enumera cada estado real.

Se creó `base.json`, se construyó BASE sin acortador (salida 0), y se archivaron 134 artefactos en `base-artifacts.json`. La referencia visual contractual previa al código es `base-loaded-geometry.json` y los diez PNG `base-loaded-*`; las capturas iniciales `base-*` sin fuentes y `base-fonts-*` son intentos conservados, no la referencia final. El suplemento sobre checkout BASE intacto registra Tab real en `base-supplement-visual` y su E2E, 10/10.

## §5/B2, criterio por criterio

| Criterio | Resultado de ejecución y evidencia |
|---|---|
| Positivos y negativos por familia/identidad/URL | 75 unitarios, 0 fallos, 0 skips: `test-reviewed.log`. `negative-process-results.json`: once procesos inválidos salen 1 por el error esperado, incluidos entry.id, alias, pilar, borrador y familia equivocada. `artifact-mutations-final.json`: destino eliminado, inverso ausente y fragmento inexistente hacen fallar blog.mjs con salida 1. |
| Fuente única e inversas | Catálogo único en `src/data/internal-links.ts`; `relatedGuides` deriva inversas; `PILAR_NAMES` reexporta B1 sin duplicar nombres ni tocar su archivo propietario. Relaciones preparadas inactivas para borrador. |
| Ubicación de guías | Diff de clínica: sólo imports y bloque después del cierre completo de las dos columnas. Zona: después de la sección completa de filtros/mapa/listado. E2E de fixture exige esa posición con DOM/rectángulos. |
| Cinco controles en dos tamaños | `fixture-reviewed-e2e.*`: 10 pasan, salida 0. `fixture-reviewed-visual/` contiene diez PNG y diez JSON; `candidate-reviewed-visual/` contiene los equivalentes borrador. `geometry-reviewed-comparison.json`: 20 comparaciones con BASE, diferencia geométrica máxima **0 CSS px**, sin cambios de texto/href/visibilidad sobre el pliegue. |
| Emergencia y teclado | Mismo Chromium, locale, timezone, reloj fijo, fuentes cargadas, publicidad externa aislada, medición y captura a scroll 0. Tab real conserva orden de los contactos frente a BASE; Enter intercepta tel/WhatsApp sin navegación externa. HEMS conserva las ausencias de ambos controles WhatsApp. Search y filtro 24/7 de zona se ejercitan por teclado. Los bloques nuevos quedan debajo del contenedor/listado previo, sin cubrir los elementos medidos. |
| Documentación | `docs/seo/enlazado-interno.md` describe las cuatro familias, catálogo, filtrado, inversas y algoritmo que ejecutan helper/tests/verificador. |
| Borrador y fixture en ambos sentidos | Fixture en checkout aislado, diff en `published-fixture.diff`. `fixture-article-links.json` y capturas muestran artículo→directorio; PNG/JSON de las fichas y `fixture-final-blog.*` prueban inversas. Fixture retirada (`fixture-final-removed.diff`, vacío). Build candidato excluye rutas/enlaces/sitemap del borrador en **dist/client**. **dist/server** contiene el marcador B1, reportado expresamente conforme a §4, sin afirmar ausencia del bundle. |

## Comandos y salidas

Cada log o pareja command/stdout/stderr identifica comando, SHA y código. El producto de `src` y `scripts` es idéntico entre el build de 43a09a5 y el candidato 34ef203: `build-product-equivalence.log`; los cambios posteriores fueron del test de captura.

| Comando | Salida real | Código | Evidencia vigente |
|---|---|---:|---|
| `npm run check` | 0 errores, 0 warnings, hints heredados | 0 | `check-reviewed.log` |
| `npm test` | 75 pass, 0 fail, 0 skipped | 0 | `test-reviewed.log` |
| `npm run build:no-shorten` | build candidato completado | 0 | `build-retry-command.log`, `build-retry.stdout.log`, `build-retry.stderr.log` |
| `node scripts/verification/blog.mjs` | 133 HTML; dist/client 0 publicados; informe separado de dist/server | 0 | `blog-ejecutora.log` |
| `node scripts/verification/agent-markdown.mjs` | 127 mirrors OK | 0 | `agent-markdown-reviewed.log` |
| `node scripts/verification/agent-catalog.mjs` | 112 clínicas, 112 rutas HTML válidas | 0 | `agent-catalog-reviewed.log` |
| `npm run test:e2e -- --workers=2 --reporter=line` | 96 pass, 11 skips heredados | 0 | `e2e-reviewed-command.log`, stdout y stderr correspondientes |
| `git diff --name-status BASE...HEAD` y diff completo | Se archivan contra un SHA explícito de la entrega; los siguientes cambios son sólo evidencia | 0 | `diff-name-status.log`, `diff-completo.log` |

`artifact-conservation.json`: 134/134 artefactos sin cambios ni pérdidas, incluidos sitemap, catálogo y mirrors. La inspección final del diff no incluye archivos de propiedad AR, esquema/fichas, configuración, dependencias ni workflow.

## Intentos descartados y límites

- `e2e.*`: primera ejecución con 127.0.0.1 produjo 7 fallos porque los tests existentes conceden geolocalización a localhost:4321. La repetición con el origen esperado pasa; no se cambió configuración ni tests ajenos.
- `build-final.log`: EPERM de Windows con preview abierto, salida 1. Se detuvo preview y `build-retry.*` terminó 0. Los verificadores posteriores se repitieron sobre ese build.
- `fixture-final-e2e.*`: dos capturas detectaron scroll distinto de 0 después del teclado. Se adelantó la captura al estado inicial, antes de las acciones; `fixture-reviewed-e2e.*` pasa. Las carpetas previas se conservan como intentos y no sustituyen `*-reviewed-visual`.
- El pedido menciona cinco artículos borrador. La BASE sólo contiene **uno**, el piloto. Los otros cuatro archivos pertenecen a B4 (§6); no se crearon ni se publicaron. La relación cruzada preparada no crea un destino inexistente.
- No se verifica aquí despliegue de B2, escaneo postdeploy contra BASE, negociación/cabeceras productivas del candidato ni aceptación independiente. No existe aún autorización de merge.
- Los 11 skips E2E históricos siguen **no verificados**. No se añadieron skips.
- No están disponibles `subscribe_pr_activity` ni `ScheduleWakeup`; no se simula seguimiento por eventos. El workflow sólo arranca con PR o push a main/stack/astro-7. Se prepara PR borrador para CI; el estado remoto se reporta separado y no sustituye auditoría independiente.
- Esta es evidencia de ejecución propia, no el informe ni `blog-verificadora.log` de una verificadora independiente. B2 no queda cerrada por este documento.
