# Informe de verificación independiente B2

Fecha: 2026-09-07  
Rama de evidencia: `codex/blog-b2-verificacion-independiente`  
SHA de evidencia: `66645e1` (se actualizará tras el amend final si cambia)  
Candidato auditado: `d1ce4c1cbfb18dbdfd5b327b06b11c3c821118c1`  
BASE: `b9d7db74d85f99ab580c7bc0d03dd51c13744f71`

## Veredicto

**NO ACEPTADA.**

La implementación B2 pasa los controles específicos de enlaces tipados, ubicación y emergencia cuando se aísla el spec correspondiente. También pasa la verificación manual de `blog.mjs` con preview y demuestra correctamente el fallo sin preview. Sin embargo, la ejecución independiente del E2E completo terminó con **89 pass, 7 fail y 11 skips**, código 1. Además, el candidato no está desplegado ni existe un escaneo AR post-cambio asociado a su SHA; por §7 no se puede cerrar la subfase con evidencia productiva.

## Identidad del objeto

Se verificó antes de auditar:

- `git ls-remote origin refs/heads/main` → `b9d7db74d85f99ab580c7bc0d03dd51c13744f71`.
- `git ls-remote origin refs/heads/codex/blog-b2` → `d1ce4c1cbfb18dbdfd5b327b06b11c3c821118c1`.
- `git merge-base d1ce4c1cbfb18dbdfd5b327b06b11c3c821118c1 b9d7db74d85f99ab580c7bc0d03dd51c13744f71` → `b9d7db74d85f99ab580c7bc0d03dd51c13744f71`.

El remoto no avanzó durante la sesión. Los comandos y contexto están en `verificadora/context.txt`.

## §5/B2, criterio por criterio

| Criterio | Resultado independiente | Evidencia |
|---|---|---|
| Positivos por familia, identidad y URL completa | **Pasa** | `npm test`: 77/77; `negative-independent.log`: 12 mutaciones rechazadas, cada una con código 1. |
| Negativos obligatorios | **Pasa** | Clínica inexistente, `entry.id`, alias no canónico, zona no generada, provincia inexistente, artículo inexistente/borrador/pilar incorrecto, familia equivocada, URL incorrecta, destino eliminado e inverso ausente. |
| Etiquetas contra fuente real | **Pasa** | `labels-source-vs-rendered.json`: HEMS, Hospital Veterinario Medical Care, Veterinaria Gocha, San Pablo de Heredia, Guápiles, Heredia y Limón coinciden, con tildes y mayúsculas. |
| Aserción de ancla | **Pasa** | La mutación `HEMS` → `HEMS MUTADO` hizo fallar `blog.mjs` con `Ancla incorrecta`; ver `blog-verificadora.log` y `label-mutation.diff`. |
| Ubicación de guías | **Pasa** | Spec B2 aislado: 10/10 en las cinco rutas de control y dos viewports; la fixture publicada también pasó 10/10. |
| Geometría, texto, href, foco y teclado | **Pasa para el alcance B2 aislado** | `emergency-candidate.stdout.log` y `fixture-e2e.stdout.log`, ambos código 0; las activaciones fueron interceptadas, sin llamadas ni mensajes. HEMS conserva la ausencia de WhatsApp. |
| Fixture publicada y retirada | **Pasa** | Build/preview de fixture: 10/10; `blog.mjs`: 134 HTML, `published=1`. Build limpio posterior: `dist/client` 0 ocurrencias; `dist/server` sólo conserva el marcador B1 permitido. |
| `blog.mjs` con y sin preview | **Pasa** | Sin preview: código 1 y `PREVIEW_UNAVAILABLE`, con comando exacto. Con preview: código 0 y `blog: OK (133 HTML...)`. |
| Documentación de enlazado | **Pasa** | `docs/seo/enlazado-interno.md` coincide con las familias, catálogo, inversas y algoritmo observados en código/tests. |
| Suite E2E contractual completa | **Falla — bloqueante** | `e2e-retry.stdout.log`: 89 pass, 7 fail, 11 skips, código 1. |

## Hallazgos bloqueantes

### B2-01 — E2E completo falla

La repetición independiente con preview explícito y `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4321` falló en siete pruebas heredadas de geolocalización/priorización, incluida la expectativa de que la primera tarjeta fuera Hospital Veterinario Medical Care. El resultado real fue 89 pass, 7 fail y 11 skips. Esto contradice el reporte de la ejecutora de 96 pass y 11 skips; esa contradicción queda archivada, no resuelta por la pasada específica B2.

Instrucción exacta de corrección: ejecutar desde el candidato `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4321 npm run test:e2e -- --workers=2 --reporter=line`, aislar la causa de las siete fallas de geolocalización y del caso 56, y repetir hasta obtener código 0 sin introducir skips. No cambiar el producto ni eliminar expectativas para silenciar el resultado.

### B2-02 — No hay cierre productivo del candidato

`git ls-remote` confirma que el candidato sigue sólo en `codex/blog-b2` y que `main` permanece en la BASE. El intento HTTP real devolvió 404 para `/blog/guias-por-especie/urgencias-en-perros/` y 200 para `/blog/`; no demuestra que el candidato sea el estado servido. No existe un registro de Workers Build/deployment que vincule el SHA candidato ni un escaneo AR de 22 checks ejecutado sobre ese estado.

Instrucción exacta de corrección: después de una autorización explícita de merge/deploy, archivar el registro de Workers Build con SHA de origen igual al candidato fusionado, ejecutar los mismos 22 checks de nivel 4 y comparar por identificador contra la base. La regla es que ningún `pass` de la base pase a `fail` o `neutral`; las mejoras se documentan. No usar el escaneo de la BASE ni el preview local como escaneo del candidato.

## Conservación, alcance y base AR

La comparación independiente `conservation-independent.json` confirma 112 clínicas, 7 provincias, 7 zonas y las tres rutas de blog intactas entre BASE y candidato. Los siete archivos fuente de catálogo/mirrors/LLMs comparados tienen blobs idénticos. El diff del candidato contra BASE contiene 11 rutas de producto, todas dentro de la allowlist B2; el diff completo está en `diff-completo-base.log`.

`base.json` y `base-agent-scan-command.log` muestran que el escaneo de 22 identificadores, nivel 4, fue capturado el 2026-09-07T10:32:10Z antes del primer commit de producto (`dbadf5a`). El proceso terminó con `-1073740791` después de escribir un JSON íntegro; no se presenta como código 0 ni como 22 pass. La cronología de la base sí queda confirmada. Lo que falta es el escaneo comparable del candidato desplegado.

## Límites no verificados

- No se pudo demostrar un deployment productivo del SHA candidato porque no está fusionado/desplegado.
- No se pudo ejecutar una comparación AR contractual post-cambio del candidato.
- Los 11 skips E2E existentes permanecen no verificados; no se convirtieron en pass ni se agregaron skips nuevos.
- La referencia geométrica BASE utilizada por el spec aislado es `base-loaded-geometry.json`, archivada antes por la sesión ejecutora; mis capturas y mediciones del candidato y de la fixture están separadas bajo `verificadora/`.

La evidencia manual completa, incluidos stdout, stderr y códigos de salida de `blog.mjs`, está en `docs/blog/evidencia/b2/blog-verificadora.log`.
