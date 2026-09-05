# AR3 — Markdown y validación de agentes

Parte de la fase 2 global de Vet24-cr (LLM-alignment). **No ejecutar otra fase ni el blog editorial.**

Spec de producto: https://github.com/Gunz-cop/Vet24-cr/blob/docs/agent-readiness-spec/docs/agent-readiness/README.md
Spec de fase: https://github.com/Gunz-cop/Vet24-cr/blob/docs/agent-readiness-spec/docs/agent-readiness/fase-3-markdown-validacion.md

El README manda. Leer ambos completos, además de las referencias primarias y skill indicadas en ellos. No basta este resumen. Si hay contradicción, detener la implementación y corregir el contrato con el coordinador; no ampliar alcance para ganar puntuación.

## Dependencia y entrega

AR2 fusionada y verificada en producción. Crear rama de ejecución desde el SHA de main que cumpla esa entrada; registrar BASE. Una sesión implementa y otra verifica; el issue cierra después de las comprobaciones productivas, no al terminar el build. El flujo futuro de revisión/integración se rige por la spec. Esta creación del issue no implementa ni despliega.

## Alcance

Mirrors de portada/clínicas/provincias/zonas, negociación HTTP por envoltura del adaptador, regresiones de entrega y auditoría productiva. Reutilizar contrato AR2; no modificar datos ni añadir protocolos.

## Propiedad de archivos

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

Todo lo no listado está protegido. Restricciones parciales de archivos y traspaso serial: tabla del README. No paralelizar AR2 con AR3. El diff se compara contra BASE inmutable.

## Criterios de aceptación

- [ ] **AR3-01** [N3, N4, N5, N7, D2, D3] Después de build, `node scripts/verification/agent-markdown.mjs` sale 0, sin skips: hay espejo para portada, las siete provincias, las zonas de `priorityZones` y todas las fichas del catálogo. Comprueba la correspondencia de rutas del contrato, reutilización del catálogo de AR2, cuerpo editorial y advertencias sin pérdida, sin mirrors legales/404/blog ni afirmación de apertura en tiempo real.

- [ ] **AR3-02** [N7, D4] En producción, GET con `Accept: text/markdown` sobre cada URL HTML con espejo devuelve 200 y `Content-Type: text/markdown`; GET sin Accept, con Accept de navegador o con `text/markdown;q=0` conserva HTML. Ambas representaciones llevan `Vary: Accept` sin borrar otros valores, los empates favorecen HTML y HEAD aplica la misma selección sin cuerpo.

- [ ] **AR3-03** [N6, N7, N8] Cada URL directa `/md/**.md` devuelve 200, `text/markdown`, CORS público y `X-Robots-Tag: noindex`; la URL HTML negociada conserva su canonical y no hereda ese noindex. Ningún espejo aparece en los sitemaps. La prueba alterna peticiones HTML/Markdown en el mismo URL, exige `Cache-Control: private, no-store` en ambas representaciones negociables y ausencia de uso de Cache API, y verifica que ninguna caché mezcle representaciones.

- [ ] **AR3-04** [N7, N8, D4] `npm test` y `node scripts/verification/agent-markdown.mjs` verifican cobertura de `run_worker_first`, con `/` exacta y las tres familias HTML, y ausencia de captura general de `/api/`. Un espejo ausente o con fetch fallido conserva el HTML y su status por el adaptador; POST ajeno a esta capa conserva método y cuerpo sin consumirlos. `/api/report-incorrect/` mantiene su comportamiento previo en pruebas locales con efectos externos aislados.

- [ ] **AR3-05** [N2, N8, N9, N10, D6] Se archiva un escaneo completo antes de modificar la subfase. La verificación común y las pruebas nuevas tras build pasan en CI y por sesión distinta. El escaneo completo conserva los seis pass de AR2 y añade `markdownNegotiation=pass`; se guardan JSON, cabeceras, inventario completo de mirrors y comparativa antes/después, con diff limitado a propiedad AR3, en `docs/agent-readiness/evidencia/ar3/`.

- [ ] **AR3-06** [N1, N4, N5, N9, D7, D8] Tras desplegar, se archivan respuestas íntegras de al menos tres IAs con infraestructuras de búsqueda distintas, respondiendo cada una a las dos consultas del protocolo de auditoría. Cada hallazgo se contrasta por HTTP, distinguiendo fallo del sitio, limitación de herramienta y deuda de datos; no se declara cierre con fallos introducidos sin resolver ni se promete citación. El informe enumera todos los checks no pasados con su clasificación y conserva capas 4/5 y DNS-AID como decisiones no autorizadas, sin publicar sus endpoints.

## Fuera de alcance

Contenido/SEO existente, esquema clínico, páginas HTML/UI, dependencias, fase 3 editorial y reparación del issue #5. Sin OAuth, pagos, MCP, A2A, WebMCP, Agent Skills, ARD ni cambios DNS. No fabricar horarios, verificaciones ni endpoints. Ejecutar los comandos y protocolo completos de la spec, archivar evidencia de la subfase y declarar límites.
