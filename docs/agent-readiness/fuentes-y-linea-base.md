# Fuentes leídas y línea base

Fecha de consulta: 2026-09-05. Lectura realizada antes de redactar la spec. Las huellas SHA-256 de los nueve archivos requeridos están en [fuentes-sha256.json](evidencia/fuentes-sha256.json); identifican la copia local consultada, no una supuesta versión remota actual.

## Fuentes locales primarias

- Vet24: `.claude/skills/agent-readiness/SKILL.md`, `references/comprobaciones.md`, `references/implementacion.md` y `references/auditoria-cruzada.md`, leídas completas; además el script scan.mjs para comprobar la lista exacta de checks.
- DescargasIA: `docs/agent-readiness.md`, `docs/hito-agent-readiness.md`, `docs/BRIEF-IMPLEMENTACION.md`, en el repositorio hermano bajo Proyectos/DescargasIA. El brief es de producto/diseño, no un plan de partición de agent-readiness: no se atribuye a él el reparto de este trabajo.
- CuidaTuPerroViejo: `docs/migracion-stack/README.md` y `fase-2-astro-5.md`, en el repositorio hermano. Se copia la jerarquía, contratos, propiedad y verificación de archivos, no las decisiones de migración ni su paralelismo.
- Vet24 main `c5e9a68`: content.config.ts, capabilityStatus.ts, seo.ts, zones.ts, middleware, configuración Astro/Wrangler/CI, manifiesto de enlaces, portada y rutas de clínica/provincia/zona, endpoint report-incorrect; fichas HEMS y Medical Care, informe final de migración.
- GitHub: PR #11 confirmado MERGED con merge `c5e9a6886aae23a6ddaf16774b5916111dca3e91`; issue #5 leído para delimitar deuda, sin modificarlo. La consulta de issues previa a crear estos devolvió únicamente #5 abierto.

## Lecciones reales utilizadas (y contradicciones de las fuentes)

| Evidencia en DescargasIA | Consecuencia en Vet24 |
|---|---|
| El hito registra tres rondas de revisión y fallos que aparecieron al ejecutar | Ejecutor y verificador distintos, build/HTTP real y regresión por fallo; no validar solo leyendo |
| Worker/Assets no invocaba rutas necesarias; portadas exactas faltaban | AR3 prueba routing efectivo y / exacta; no copia lista multilingüe ni 404-page |
| Catch general reusó un POST consumido y falló | AR3 no consume POST; delega íntegro al adaptador, contiene solo lectura de mirrors |
| Política Origin excluía clientes MCP sin Origin | Requisito de eventual AR5A si se aprueba, sin código MCP ahora |
| Dos bloques globales _headers perdieron Link silenciosamente | AR2/AR3 verifican bloque único y HTTP de portada SSR + assets |
| Digests de skills cambiaban entre Windows y Linux | Requisito de propuesta AR4, no .gitattributes/índice prematuros |
| Validador de build corría antes del build y saltaba | Nuevos validadores corren después y falta de artefacto falla |
| API /api/ amplia capturaba catálogo estático | Nunca capturar /api/ completo; no tocar API report-incorrect |
| Tres de cinco IAs confundieron limitación del extractor con ausencia de datos | Archivar respuestas y verificar cada hallazgo por HTTP; no prometer citas |
| Sitemap.xml 404 real, no problema del sitemap-index | Vet24 confirmó el mismo 404; AR2 añade solo alias 301 |
| Documento operativo aún dice DNS-AID pendiente; hito registra éxito con SVCB y DNSSEC | No tratar estados históricos como simultáneos ni inventar bloqueo por keyNNNNN |
| Intro del documento operativo describe fallback general a ASSETS, pero hito detalla que falló con cuerpos consumidos | Adoptar la corrección posterior y preservar además SSR de Vet24 |
| Hito llama al examen “21” pero sus recuentos suman 22 | Recontar JSON propio; nunca trasladar la puntuación 81/100 a Vet24 |

El coste “al menos una hora” de trampas y las tres revisiones son relatos del repositorio fuente, no medición del trabajo Vet24. Las estimaciones de días de nuestra tabla son estimaciones nuevas.

## Fuentes primarias online comprobadas

Las cuatro guías se leyeron completas por HTTP; la herramienta web no admitió text/markdown en una de ellas, por lo que se usó Invoke-WebRequest:

- [Content Signals del escáner](https://isitagentready.com/.well-known/agent-skills/content-signals/SKILL.md): directiva bajo User-agent con search, ai-input y ai-train.
- [API Catalog del escáner](https://isitagentready.com/.well-known/agent-skills/api-catalog/SKILL.md): HTTP 200, MIME linkset+json y relaciones del servicio real.
- [Link headers del escáner](https://isitagentready.com/.well-known/agent-skills/link-headers/SKILL.md): relaciones registradas y descubrimiento desde portada.
- [Markdown del escáner](https://isitagentready.com/.well-known/agent-skills/markdown-negotiation/SKILL.md): negociación y HTML por defecto; no inventar contador de tokens opcional.
- [RFC 9727](https://www.rfc-editor.org/rfc/rfc9727), referenciado por la guía: base normativa de API Catalog; releerlo al implementar.
- [llms.txt](https://llmstxt.org/): índice Markdown con H1 y listas de enlaces; no equivale a servicio ni garantiza consumo.
- [Cabeceras de Workers Assets](https://developers.cloudflare.com/workers/static-assets/headers/): las respuestas del Worker necesitan adjuntar sus propias cabeceras; no basta _headers.
- [Routing avanzado de Assets](https://developers.cloudflare.com/workers/static-assets/routing/advanced/): referencia de revisión de run_worker_first para la sesión AR3.
- [Adaptador Astro/Cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/): la página actual ya presenta 14.3.0; **no confundir con 14.2.6 instalado**. Se inspeccionaron sus exports y entrypoint/handler locales; no se autoriza actualizar versiones ni copiar finalize() de una versión nueva.
- [Sitio del escáner](https://isitagentready.com/): los perfiles reducidos desactivan categorías; esta entrega no los usa.

## Medición propia

Archivos íntegros:
- [Selección por defecto de 21](evidencia/scan-script-21.json), 2026-09-05T19:29:37.065Z.
- [Selección completa actual de 22](evidencia/scan-completo-22.json), 2026-09-05T19:29:43.890Z.

Ambos nivel 1. Los tres pass son robotsTxt, sitemap y robotsTxtAiRules; trece fail, seis neutral. En el primero, ap2 dice excluded by scan configuration; en el segundo ya no. No hay campo score. Los avisos de terceros que aparecen dentro de evidence (por ejemplo discovery de comercio) no se convierten en fallos locales de Vet24.

Comandos originales, desde raíz del repo:

```powershell
node .claude/skills/agent-readiness/scripts/scan.mjs https://vet24cr.com --json
node --use-system-ca .claude/skills/agent-readiness/scripts/scan.mjs https://vet24cr.com --json
node --use-system-ca .claude/skills/agent-readiness/scripts/scan.mjs https://vet24cr.com --json --check robotsTxt,sitemap,linkHeaders,dnsAid,markdownNegotiation,robotsTxtAiRules,contentSignals,webBotAuth,apiCatalog,oauthDiscovery,oauthProtectedResource,authMd,mcpServerCard,a2aAgentCard,agentSkills,webMcp,ard,x402,mpp,ucp,acp,ap2
```

No se modificó scan.mjs. En Windows se guardó stdout en los JSON con redirección PowerShell. Los dos procesos con resultados archivados terminaron con assertion de Node al cerrar (exit 1), después de JSON íntegro validado; se registra como limitación del proceso local. El servicio respondió y sus comprobaciones contienen evidencia de HTTP real.

Comprobaciones HTTP adicionales, 2026-09-05:

| Petición GET | Status final | Content-Type |
|---|---|---|
| https://vet24cr.com/ | 200 | text/html |
| https://vet24cr.com/sitemap.xml | 404 | text/html |
| https://vet24cr.com/.well-known/api-catalog | 404 | text/html |
| https://vet24cr.com/api/status-override?slug=hems-una-heredia | 404 | text/html |

Se usó Invoke-WebRequest con SkipHttpErrorCheck para no ocultar los 404. status-override ya consta como 404 preexistente en la evidencia de fase 1; no prueba datos dinámicos disponibles.

## Lectura del caso veterinario

El esquema no modela franjas horarias estructuradas ni evidencia por cada capacidad. El helper capabilityStatus advierte que false mezcla ausencia y desconocimiento y que true no equivale a verificación. HEMS registra VERIFIED con last_verified y verification_source vacíos. Medical Care hoy tiene hotelMascotas true y texto de hotel exclusivo para gatos/reserva; #5 describe un estado anterior false. Se conserva el problema de alcance como control semántico, sin reescribir el issue previo ni inventar que su ejemplo sigue byte a byte actual.

La portada es SSR; clínicas/provincias/zonas tienen rutas estáticas y publican toda la colección. La preparación para agentes permitirá consultar el registro y sus límites; no convierte el directorio en central de guardias en vivo.
