# AR2 — Catálogo público y descubrimiento

Parte de la fase 2 global de Vet24-cr (LLM-alignment). **No ejecutar otra fase ni el blog editorial.**

Spec de producto: https://github.com/Gunz-cop/Vet24-cr/blob/docs/agent-readiness-spec/docs/agent-readiness/README.md
Spec de fase: https://github.com/Gunz-cop/Vet24-cr/blob/docs/agent-readiness-spec/docs/agent-readiness/fase-2-catalogo-descubrimiento.md

El README manda. Leer ambos completos, además de las referencias primarias y skill indicadas en ellos. No basta este resumen. Si hay contradicción, detener la implementación y corregir el contrato con el coordinador; no ampliar alcance para ganar puntuación.

## Dependencia y entrega

Dependencia GitHub: https://github.com/Gunz-cop/Vet24-cr/issues/12

AR1 fusionada y verificada en producción. Crear rama de ejecución desde el SHA de main que cumpla esa entrada; registrar BASE. Una sesión implementa y otra verifica; el issue cierra después de las comprobaciones productivas, no al terminar el build. El flujo futuro de revisión/integración se rige por la spec. Esta creación del issue no implementa ni despliega.

## Alcance

Adaptador conservador de datos, catálogo JSON estático, OpenAPI, llms, documentación anónima, API Catalog y Link reales; alias sitemap. El esquema exacto y las seis rutas están en README; sin filtros HTTP ni disponibilidad en tiempo real.

## Propiedad de archivos

- `src/lib/agent-content.ts`
- `src/lib/agent-discovery.ts`
- `src/pages/api/catalog.json.ts`
- `src/pages/api/openapi.json.ts`
- `src/pages/llms.txt.ts`
- `public/api/readme.md`
- `public/auth.md`
- `public/.well-known/api-catalog`
- `public/_headers`
- `public/_redirects`
- `src/middleware.ts`
- `tests/unit/agent-catalog.test.ts`
- `tests/unit/agent-discovery.test.ts`
- `tests/e2e/agent-discovery.spec.ts`
- `scripts/verification/agent-catalog.mjs`
- `.github/workflows/ci.yml`
- `astro.config.mjs`
- `docs/agent-readiness/evidencia/ar2/**`

Todo lo no listado está protegido. Restricciones parciales de archivos y traspaso serial: tabla del README. No paralelizar AR2 con AR3. El diff se compara contra BASE inmutable.

## Criterios de aceptación

- [ ] **AR2-01** [N3, N4, N5, D2, D3] Después de `npm run build:no-shorten`, `node scripts/verification/agent-catalog.mjs` sale 0 y falla si falta un artefacto: verifica el contrato «Datos para agentes», unicidad de slug, igualdad del conjunto de fichas con las rutas HTML de clínicas del mismo build y URLs canónicas existentes; no usa un conteo fijo ni excluye fichas por `estado` que el HTML sí publica.

- [ ] **AR2-02** [N4, N5, D3] `npm test` cubre datos de prueba con booleano falso, booleano verdadero sin evidencia, fecha/fuente vacías, coordenadas 0/0 y servicio limitado por especie. Confirma `openNow: null`, zona horaria `America/Costa_Rica`, ausencia de fecha editorial inventada, estados conservadores de capacidades y conservación de `copyDiferenciador`, `bodyMarkdown` y `verification_notes`; el caso real de Medical Care conserva «hotel exclusivamente para gatos» sin inferir hotel general.

- [ ] **AR2-03** [N1, N6, D2, D4] GET y HEAD a `/api/catalog.json`, `/api/openapi.json`, `/llms.txt`, `/api/readme.md`, `/auth.md` y `/.well-known/api-catalog` cumplen los códigos y MIME de la tabla de rutas, sin barra final añadida; HEAD no lleva cuerpo. El OpenAPI 3.1 describe exclusivamente GET del catálogo público, sin autenticación ni filtros de servidor; el catálogo RFC 9727 enlaza únicamente ese servicio y documentación que responde 200.

- [ ] **AR2-04** [N1, N6, N8, D4] `curl.exe -sS -D - -o NUL https://vet24cr.com/` y la misma comprobación sobre `/clinica/hems-una-heredia/` muestran las cuatro relaciones `Link` del contrato; todos sus destinos responden 200. Hay un solo bloque global `/*` en `public/_headers`, CORS comodín solo en los recursos públicos nuevos indicados, y el SSR de portada recibe las cabeceras mediante la integración runtime.

- [ ] **AR2-05** [N6, N8, D5] `curl.exe -sS -D - -o NUL https://vet24cr.com/sitemap.xml` devuelve 301 con destino `https://vet24cr.com/sitemap-index.xml` o su ruta relativa equivalente; el destino devuelve XML 200. Las URLs canónicas HTML, contenido/SEO y miembros de los sitemaps existentes permanecen iguales; los recursos de agentes no se añaden al sitemap.

- [ ] **AR2-06** [N2, N9, N10, D6, D7] Se archiva un escaneo completo antes de modificar la subfase. La verificación común y el verificador de artefactos tras build pasan en CI y en sesión independiente; el escaneo completo conserva los cuatro pass de AR1 y añade `linkHeaders=pass` y `apiCatalog=pass`. Se comprueba `/auth.md` anónimo, sin OAuth ficticio, y se archiva el resultado real de `authMd` aunque falle; el diff cumple propiedad AR2 y la evidencia queda en `docs/agent-readiness/evidencia/ar2/`.

## Fuera de alcance

Contenido/SEO existente, esquema clínico, páginas HTML/UI, dependencias, fase 3 editorial y reparación del issue #5. Sin OAuth, pagos, MCP, A2A, WebMCP, Agent Skills, ARD ni cambios DNS. No fabricar horarios, verificaciones ni endpoints. Ejecutar los comandos y protocolo completos de la spec, archivar evidencia de la subfase y declarar límites.
