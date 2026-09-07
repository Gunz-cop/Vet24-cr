# Informe de verificación independiente B1

Fecha: 2026-09-07  
Repositorio: Gunz-cop/Vet24-cr  
BASE: 89a365b8c374cdbf9912a07425ed68e34a496464  
Candidato de producto: dc2581ab444ffbeebbc0bcd2ccc373da23ac2f28  
HEAD de evidencia ejecutora: b3de9ed945176ef78df733962d952844fddfdd0e  
Merge desplegado auditado: 3edb6bcca050b110a491723846ec6f3a1ebed65b  
Dominio: https://vet24cr.com

## Veredicto

# NO ACEPTADA

La subfase no se cierra. La medición visual anterior fue errónea y queda corregida: Chromium confirma que `display:none` excluye `#nav-directory` del orden de Tab en móvil. Persisten la falta de evidencia versionada en la rama/repositorio, el piloto serializado en un artefacto de `dist/server` bajo la lectura estricta de “ningún artefacto”, y la ausencia de una base ejecutada comparable para el escaneo productivo obligatorio de 22 identificadores.

## Criterios de §5/B1

| Criterio | Resultado | Evidencia independiente |
|---|---|---|
| `npm run check`, `npm run test:unit`, `npm run build:no-shorten` | PASS | [verification-independent.log](verification-independent.log): códigos 0. El build registró la advertencia TLS de `Request.cf`, pero terminó 0. |
| Filtro real y mutaciones | PASS | [filter-mutation.log](filter-mutation.log): al cambiar temporalmente `md` por `mdx`, el test falló con código 1; al restaurar, `astro.config.mjs` quedó sin diff. |
| Índices, canonical, ausencia pública del borrador y 404 | PASS para las condiciones escritas / HALLAZGO DE ARTEFACTO | El build candidato produce 133 HTML; `blog.mjs` termina 0. En producción `/blog/`, ambos pilares responden 200 y la URL del piloto 404. La búsqueda completa encuentra `urgencias-en-perros` en `dist/server/chunks/_astro_data-layer-content_B8HoNDU5.mjs`; no aparece en `dist/client`. El chunk forma parte del worker generado (`dist/server/wrangler.json` apunta a `entry.mjs`), por lo que no acepto sin resolver la afirmación más amplia de que el borrador está ausente de todo artefacto. [local-artifact-audit.log](local-artifact-audit.log) |
| Fixture publicada: ruta, autor, Article, BreadcrumbList, URL/fecha/meta | PASS | [fixture-structure-audit.log](fixture-structure-audit.log) y [visual-verification.json](visual-verification.json). La fixture fue retirada y el build candidato posterior volvió a excluirla. |
| Geometría visual | PASS | En las cuatro combinaciones medidas: `scrollWidth` igual al viewport, cero scroll horizontal, cajas dentro del viewport y cero solapamientos con navegación. Se inspeccionaron los cuatro PNG exigidos. |
| Teclado y foco visible | PASS | La reproducción corregida con Chromium confirma que en artículo a 390×844 el octavo Tab es “Directorio” del footer; `#nav-directory` tiene `display:none` y no entra al orden de foco. A 1440×900 sí es visible y enfocable. [visual-verification.json](visual-verification.json) |
| Sitemap, conservación AR y allowlist | PASS local / PASS productivo para conteos | BASE y candidato conservan catálogo y mirrors por los hashes agregados; el candidato tiene 112 clínicas, 7 provincias, 7 zonas y 3 URLs de blog. Producción: 134 URLs, 112 clínicas, 7 provincias, 7 zonas, 3 URLs de blog, cero piloto. [preservation-audit.log](preservation-audit.log), [production-sitemap.log](production-sitemap.log), [allowlist-audit.log](allowlist-audit.log) |

Las salidas completas solicitadas de `git diff --name-status BASE...CANDIDATE` y `git diff BASE...CANDIDATE` están en [diff-name-status.log](diff-name-status.log) y [diff-full.patch](diff-full.patch). El diff candidato contiene 39 rutas y ninguna fuera de la allowlist. El HEAD de evidencia posterior al candidato solo agrega `blog-ejecutora.log`; la copia de trabajo no tiene diff de producto.

## Verificación común y cierre productivo de §7

- Verificador manual independiente: `node scripts/verification/blog.mjs` → `blog: OK (133 HTML; borrador ausente de HTML, enlaces, Article y sitemap)`, código 0. Registro completo: [blog-verificadora.log](blog-verificadora.log).
- Correspondencia deployment↔SHA: el check de Workers Builds de GitHub muestra `head_sha=3edb6bc`, `status=completed`, `conclusion=success`, build `587418b3-31df-49dc-827b-3aadee59b6ca`, version `900fffbb-5ae2-437c-9aa6-809d7bf871a2`, y enlace al build de producción. `/blog/` respondió 200. Registro: [deployment-sha.log](deployment-sha.log). GitHub no tiene objeto deployment para ese SHA (`[]`); no se simuló uno.
- Controles HTTP/HEAD: los seis endpoints AR responden 200 con MIME esperado y HEAD de 0 bytes; `/sitemap.xml` responde 301 a `/sitemap-index.xml`; ambos índices XML responden correctamente. Registro: [production-http.log](production-http.log).
- Negociación Markdown productiva: `node scripts/verification/agent-markdown.mjs --base-url https://vet24cr.com` → `agent-markdown: OK (127 mirrors + HTTP https://vet24cr.com)`, código 0. El warning de TLS local quedó registrado y se usó `curl.exe` para los controles HTTP.
- Escaneo completo productivo: se ejecutaron los 22 identificadores y se archivó el JSON íntegro en [production-agent-scan.json](production-agent-scan.json). La comparación por identificador está en [agent-scan-comparison.json](agent-scan-comparison.json). No se observa regresión frente al escaneo histórico disponible, pero no es una comparación exacta contra BASE B1: [base-agent-scan.json](base-agent-scan.json) dice explícitamente `not_verified` y no contiene resultados base.

## Rectificación de la auditoría anterior y contradicciones

1. Mi conclusión anterior sobre `#nav-directory` era incorrecta. La nueva reproducción de `/blog/` y de la fixture publicada, con 12 Tab por viewport, coincide con [teclado.json](teclado.json): `display:none` lo excluye en móvil.
2. [candidate-agent-scan.json](candidate-agent-scan.json) declara `not_verified`; ahora existe un escaneo productivo independiente, pero la ausencia de escaneo BASE impide la comparación contractual exacta.
3. El claim de ausencia del piloto en “todo artefacto” no se sostiene literalmente: no está en `dist/client` ni en respuestas productivas auditadas, pero sí en un chunk de `dist/server` cargado por el worker generado. `blog.mjs` inspecciona la salida pública cliente y no detecta ese archivo.
4. El hallazgo de navegación que figuraba en el informe anterior quedó obsoleto respecto del plan vigente en `main` (`52ed4db`): la revisión del 2026-09-07 asigna a B3 la “entrada de navegación al blog” condicionada a artículos publicados. No lo cuento como incumplimiento de B1; sí dejo constancia de que el checkout local auditado tenía la versión anterior del plan.

## Hallazgos y correcciones exactas

### 1. Evidencia no versionada — bloqueante formal

Instrucción para el cierre: incorporar mediante un commit de evidencia únicamente los registros de `docs/blog/evidencia/b1/`, incluyendo `blog-verificadora.log`, `diff-name-status.log`, `diff-full.patch` y este informe. No modificar producto, tests ni plan. Repetir la comprobación de que el commit de evidencia contiene solo archivos permitidos de evidencia y enlazar ese SHA en el cierre. No se abrió PR ni se hizo merge en esta sesión.

### 2. Piloto en `dist/server` — bloqueante hasta resolver alcance

Instrucción para la sesión correctora: determinar si el chunk de `dist/server` forma parte del artefacto desplegado por el adaptador Cloudflare. Si forma parte del despliegue, impedir que el contenido borrador se serialice allí o ajustar la política de publicación para que ningún artefacto de distribución contenga el piloto. Si no forma parte del artefacto servido, documentar esa frontera de forma verificable y ampliar el control para inspeccionar explícitamente `dist/client` y `dist/server`. Repetir build, búsqueda completa y prueba de 404; no modificar la configuración del filtro para ocultarlo.

### 3. Navegación entrante al blog — corrección ya asignada en plan vigente

El único `href="/blog/"` del checkout local B1 está en `src/components/BlogBreadcrumbs.astro`, pero el plan vigente en `main` (`52ed4db`) ya asigna a B3 la entrada de navegación condicionada a artículos publicados. Por tanto no lo mantengo como bloqueo de B1. La instrucción exacta para B3 sigue siendo: implementar y demostrar ambos lados de la condición, con enlace visible `href="/blog/"` en navegación compartida cuando exista al menos un artículo publicado, sin renderizarlo con cero artículos; verificar alcance, canonical y foco visible.

## No pude verificar

- No pude obtener una comparación exacta “antes/después” del escaneo de 22 identificadores contra BASE B1: el archivo BASE requerido declara `not_verified`. Presento el escaneo productivo íntegro y la comparación contra el escaneo histórico disponible, sin convertirlos en equivalencia.
- No existe un objeto deployment de GitHub ni una cabecera HTTP pública con el SHA servido. La asociación disponible y verificable es el check de Workers Builds que vincula el SHA de merge con el build de producción; no afirmo una prueba adicional inexistente.
- No pude concluir solo a partir del chunk de `dist/server` si ese archivo interno es públicamente servible. Sí pude demostrar que existe y que el control `blog.mjs` no lo inspecciona; por eso queda como hallazgo, no como “ausente de todo artefacto”.
- La rama remota `main` ya avanzó a `52ed4db` después del merge B1 auditado y contiene la corrección de propiedad de navegación para B3. El objeto auditado aquí sigue siendo el merge explícito `3edb6bc`, no el estado posterior de main.

No se modificaron archivos de producto, tests ni el plan; las únicas escrituras persistentes de esta sesión están bajo `docs/blog/evidencia/b1/`. La evidencia sigue sin estar versionada en una rama remota, por lo que no es todavía un registro durable para terceros.
