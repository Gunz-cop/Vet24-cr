# AR3 — Markdown y validación de agentes

**Spec de producto:** [README.md](README.md), manda sobre este documento.
**Depende de:** AR2 fusionada y verificada en producción.
**Issue:** [índice de issues](issues/README.md).
**Base:** SHA de main con predecesora fusionada, registrado antes de empezar.
**Roles:** una sesión ejecuta; otra verifica. La sesión que escribió esta entrega no implementa.

## Objetivo y contratos

Añadir texto limpio negociable sobre los datos AR2, preservando entrega HTML y SSR. Entrada: AR2 fusionada, verificada, contrato de catálogo estable y artefactos disponibles. Salida: cuatro familias de mirrors completas, negociación segura y auditoría productiva.

No es la fase 3 editorial del plan global. No crea un blog ni nuevos datos.

## Trabajo, en orden

1. Crear `src/lib/agent-markdown.ts`: deriva desde `agent-content.ts` sin modificarlo, con una función única de mapeo URL→mirror compartida por generación y runtime. Mantener funciones puras de rutas separadas del import virtual astro:content para que el runtime no cargue el catálogo innecesariamente.
2. Crear `src/pages/md/[...path].ts` prerenderizado. Paths: index.md para /; clinica/<slug>.md; provincia/<provincia>.md; zona/<zona>.md. Solo siete provincias y priorityZones que tienen HTML real. Slugs de ficha desde catálogo AR2, no desde nombre/id. No espejar páginas legales ni 404.
3. Ficha Markdown: nombre, URL canónica, ubicación, contacto, horario registrado, estado de capacidades/evidencia y advertencias, copy y cuerpo íntegros. Lista Markdown: ámbito y enlaces a fichas con datos/limitaciones del catálogo, sin ordenar por supuesta apertura actual. La portada Markdown no replica personalización geográfica de SSR ni su contador; declara que es un listado estático de referencia sin disponibilidad en tiempo real.
4. Crear `src/lib/agent-http.ts` para selección Accept y entrega contenida; GET/HEAD solamente. Markdown se elige cuando text/markdown está explícitamente permitido, q>0 y tiene mayor preferencia que HTML; si solo se pide Markdown, elegirlo; wildcard por sí solo o empate da HTML. No usar includes('markdown') ignorando q=0.
5. Crear `src/worker.ts` como envoltura mínima del handler oficial exportado por `@astrojs/cloudflare/entrypoints/server`, verificado en el paquete 14.2.6 instalado. Antes de delegar, intentar la negociación solo en familias permitidas. Si no corresponde o el mirror falla, delegar al handler oficial con request/env/context intactos. No sustituir la portada dinámica por ASSETS.fetch del HTML de /. No copiar APIs nuevas de docs 14.3 a paquete 14.2.6.
6. Cambiar main en wrangler.toml a ese entrypoint y configurar run_worker_first para `/`, `/clinica/*`, `/provincia/*`, `/zona/*`. No agregar todo /api/, no not_found_handling 404-page ni tocar bindings/flags/fecha. Revisar configuración generada: debe preservar rutas SSR actuales además de la selección añadida. Probar rutas reales con/sin slash e index.html para conservar redirecciones canónicas, nunca servir mirror sobre host o URL no canónicos sin su normalización previa.
7. El wrapper añade/conserva Link desde agent-discovery.ts en HTML y Markdown negociado de las familias incluidas. Vary incorpora Accept sin borrar valores existentes. No confiar en _headers para respuestas generadas en runtime. Si copia cabeceras del mirror a la URL HTML, elimina exclusivamente el noindex del mirror; no pierde cabeceras válidas de la entrega canónica.
8. Directos /md/**.md: text/markdown, UTF-8, CORS público, noindex, fuera de sitemap. Negociados: misma URL HTML, sin ese noindex. Para impedir contaminación de caché sin asumir que Vary controla todas las cachés de Cloudflare, no almacenar respuestas negociadas en Cache API y emitir `Cache-Control: private, no-store` en las dos representaciones de las familias negociables durante esta fase. No almacenar una respuesta SSR personalizada como pública.
9. Añadir pruebas de negociación, mapeo total, cobertura de routing real, headers, mirrors faltantes/fetch fallido y conservación de request POST. Ningún handler nuevo consume cuerpos de POST ni redirige /api/report-incorrect/; probar este contrato localmente sin correos ni escrituras remotas. El status-override 404 preexistente no se repara.
10. Crear `scripts/verification/agent-markdown.mjs`: contra build inventaría todos los mirrors y compara contenido/rutas/sitemap. Acepta además `--base-url https://vet24cr.com` para repetir HTTP sobre **todo** el inventario en producción, con GET/HEAD, ambas representaciones y headers. Sin skips si faltan artefactos. CI lo ejecuta después del build; producción requiere la segunda modalidad.
11. Verificador independiente comprueba la entrega y CI; tras despliegue, escaneo completo, prueba HTTP completa y auditoría de tres IAs del README. No tocar contenido para aumentar citabilidad. Si una IA confunde dato reportado con verificado, reproducir rutas y evaluar si la proyección perdió advertencias; corregir únicamente pérdidas de esta capa.

## Evidencia y riesgos

En `docs/agent-readiness/evidencia/ar3/`: BASE/HEAD/despliegue, inventario, cabeceras de todas las familias, fallbacks, tests/CI, scan íntegro, prompts y respuestas de IAs. Distinguir idéntico, diferencia autorizada y no verificado; ninguna simulación equivale a acceso real de una IA.

run_worker_first cambia quién atiende assets. La regresión crítica es que el wrapper conserve la ruta del adaptador y los headers AR2; se prueba portada y ficha, no solo unidades de Accept. Retirar noindex de todas las respuestas sería un defecto: se retira solo al servir el espejo sobre URL canónica. Cache-Control no-store tiene coste de caché/latencia en las familias incluidas; queda acotado a esta entrega y cualquier optimización posterior requiere pruebas de separación equivalentes.

## Fuera de alcance y reversión

No modificar agent-content.ts, middleware AR2, páginas HTML, datos, SEO, dependencias o APIs existentes. No añadir scripts de WebMCP, servidores MCP/A2A ni ARD/skills. No un contador “abiertas” en build.

Revertir la subfase como unidad devuelve main del Worker al entrypoint previo y elimina negociación/mirrors/reglas AR3; conserva catálogo y Link de AR2. La comparación de reversión debe usar el commit pre-AR3, no reconstruir manualmente la configuración.

## Archivos que posee

- `src/lib/agent-markdown.ts`
- `src/lib/agent-http.ts`
- `src/worker.ts`
- `src/pages/md/[...path].ts`
- `public/_headers`
- `wrangler.toml`
- `worker-configuration.d.ts`
- `tests/unit/agent-markdown.test.ts`
- `tests/unit/agent-routing.test.ts`
- `tests/e2e/agent-markdown.spec.ts`
- `scripts/verification/agent-markdown.mjs`
- `.github/workflows/ci.yml`
- `astro.config.mjs`
- `docs/agent-readiness/evidencia/ar3/**`

Todos los demás archivos están protegidos. Aplican las restricciones por archivo compartido del README. `git diff --name-only <BASE>...HEAD` debe ser subconjunto de esta lista; AR2 y AR3 nunca modifican archivos compartidos en paralelo.

## Criterios de aceptación

- [ ] **AR3-01** [N3, N4, N5, N7, D2, D3] Después de build, `node scripts/verification/agent-markdown.mjs` sale 0, sin skips: hay espejo para portada, las siete provincias, las zonas de `priorityZones` y todas las fichas del catálogo. Comprueba la correspondencia de rutas del contrato, reutilización del catálogo de AR2, cuerpo editorial y advertencias sin pérdida, sin mirrors legales/404/blog ni afirmación de apertura en tiempo real.

- [ ] **AR3-02** [N7, D4] En producción, GET con `Accept: text/markdown` sobre cada URL HTML con espejo devuelve 200 y `Content-Type: text/markdown`; GET sin Accept, con Accept de navegador o con `text/markdown;q=0` conserva HTML. Ambas representaciones llevan `Vary: Accept` sin borrar otros valores, los empates favorecen HTML y HEAD aplica la misma selección sin cuerpo.

- [ ] **AR3-03** [N6, N7, N8] Cada URL directa `/md/**.md` devuelve 200, `text/markdown`, CORS público y `X-Robots-Tag: noindex`; la URL HTML negociada conserva su canonical y no hereda ese noindex. Ningún espejo aparece en los sitemaps. La prueba alterna peticiones HTML/Markdown en el mismo URL, exige `Cache-Control: private, no-store` en ambas representaciones negociables y ausencia de uso de Cache API, y verifica que ninguna caché mezcle representaciones.

- [ ] **AR3-04** [N7, N8, D4] `npm test` y `node scripts/verification/agent-markdown.mjs` verifican cobertura de `run_worker_first`, con `/` exacta y las tres familias HTML, y ausencia de captura general de `/api/`. Un espejo ausente o con fetch fallido conserva el HTML y su status por el adaptador; POST ajeno a esta capa conserva método y cuerpo sin consumirlos. `/api/report-incorrect/` mantiene su comportamiento previo en pruebas locales con efectos externos aislados.

- [ ] **AR3-05** [N2, N8, N9, N10, D6] Se archiva un escaneo completo antes de modificar la subfase. La verificación común y las pruebas nuevas tras build pasan en CI y por sesión distinta. El escaneo completo conserva los seis pass de AR2 y añade `markdownNegotiation=pass`; se guardan JSON, cabeceras, inventario completo de mirrors y comparativa antes/después, con diff limitado a propiedad AR3, en `docs/agent-readiness/evidencia/ar3/`.

- [ ] **AR3-06** [N1, N4, N5, N9, D7, D8] Tras desplegar, se archivan respuestas íntegras de al menos tres IAs con infraestructuras de búsqueda distintas, respondiendo cada una a las dos consultas del protocolo de auditoría. Cada hallazgo se contrasta por HTTP, distinguiendo fallo del sitio, limitación de herramienta y deuda de datos; no se declara cierre con fallos introducidos sin resolver ni se promete citación. El informe enumera todos los checks no pasados con su clasificación y conserva capas 4/5 y DNS-AID como decisiones no autorizadas, sin publicar sus endpoints.
