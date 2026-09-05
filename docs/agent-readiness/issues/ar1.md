# AR1 — Política de rastreo

Parte de la fase 2 global de Vet24-cr (LLM-alignment). **No ejecutar otra fase ni el blog editorial.**

Spec de producto: https://github.com/Gunz-cop/Vet24-cr/blob/docs/agent-readiness-spec/docs/agent-readiness/README.md
Spec de fase: https://github.com/Gunz-cop/Vet24-cr/blob/docs/agent-readiness-spec/docs/agent-readiness/fase-1-content-signal.md

El README manda. Leer ambos completos, además de las referencias primarias y skill indicadas en ellos. No basta este resumen. Si hay contradicción, detener la implementación y corregir el contrato con el coordinador; no ampliar alcance para ganar puntuación.

## Dependencia y entrega

PR #11 fusionado; decisión D1 confirmada por el propietario. Crear rama de ejecución desde el SHA de main que cumpla esa entrada; registrar BASE. Una sesión implementa y otra verifica; el issue cierra después de las comprobaciones productivas, no al terminar el build. El flujo futuro de revisión/integración se rige por la spec. Esta creación del issue no implementa ni despliega.

## Alcance

Solo política Content-Signal aprobada en robots y su prueba; conservar rastreo/sitemap.

## Propiedad de archivos

- `public/robots.txt`
- `tests/unit/agent-content-signal.test.ts`
- `docs/agent-readiness/evidencia/ar1/**`

Todo lo no listado está protegido. Restricciones parciales de archivos y traspaso serial: tabla del README. No paralelizar AR2 con AR3. El diff se compara contra BASE inmutable.

## Criterios de aceptación

- [ ] **AR1-01** [N1, D1] `curl.exe -fsS https://vet24cr.com/robots.txt` devuelve 200, conserva `User-agent: *`, `Allow: /` y `Sitemap: https://vet24cr.com/sitemap-index.xml`; contiene exactamente una directiva `Content-Signal` con los tres valores aprobados en D1, dentro del bloque comodín.

- [ ] **AR1-02** [N2, N9] Se archiva un escaneo completo antes de modificar la subfase. Después del despliegue, el escaneo completo definido en «Verificación común» devuelve `robotsTxt=pass`, `sitemap=pass`, `robotsTxtAiRules=pass` y `contentSignals=pass`; se archiva el JSON íntegro, fecha, commit desplegado y estados de todos los checks, sin convertir la salida 0 del script en una prueba de éxito.

- [ ] **AR1-03** [N8, N10, D6] La verificación común pasa; `git diff --name-only <BASE>...HEAD` solo contiene archivos de la lista de propiedad AR1. Una sesión distinta documenta la comprobación HTTP en `docs/agent-readiness/evidencia/ar1/`, sin cambios de producto fuera de robots.

## Fuera de alcance

Contenido/SEO existente, esquema clínico, páginas HTML/UI, dependencias, fase 3 editorial y reparación del issue #5. Sin OAuth, pagos, MCP, A2A, WebMCP, Agent Skills, ARD ni cambios DNS. No fabricar horarios, verificaciones ni endpoints. Ejecutar los comandos y protocolo completos de la spec, archivar evidencia de la subfase y declarar límites.
