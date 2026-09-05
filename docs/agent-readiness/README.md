# Vet24-cr: fase 2 del plan — preparación para agentes

**Spec de producto, versión 1, 2026-09-05.** Este README manda sobre las specs AR1–AR3 y sus issues. Una contradicción se corrige aquí, en la fase y en el issue antes de ejecutar; ninguna sesión amplía el alcance para superar un check. AR1–AR3 son subfases de la **fase 2 del plan global**; AR3 no es la fase 3 editorial.

Base confirmada: PR [#11](https://github.com/Gunz-cop/Vet24-cr/pull/11), merge `c5e9a6886aae23a6ddaf16774b5916111dca3e91`, en `origin/main`. Astro 7.2.10, adaptador Cloudflare 14.2.6 y Tailwind 4.3.3 según lock/config revisados. Esta entrega contiene documentación e issues; ninguna capa está implementada por esta sesión.

## Por qué y línea base real

El usuario de un agente necesita localizar clínicas por provincia/zona, leer teléfonos, distinguir emergencias reportadas de verificadas y confirmar el horario antes de viajar. Un catálogo de APIs de terceros no resuelve ese trabajo. Sí lo hace exponer las mismas fichas públicas en JSON y texto limpio, con sus limitaciones.

Se ejecutó el script solicitado sobre **https://vet24cr.com**, sin perfil reducido. La copia selecciona 21 checks, pero la respuesta actual incluye un check adicional, `ap2`, marcado como excluido. Por eso se repitió seleccionando explícitamente los 22 identificadores; [scan-completo-22.json](evidencia/scan-completo-22.json) es la línea base normativa. Se conserva [scan-script-21.json](evidencia/scan-script-21.json) para auditar la diferencia.

**2026-09-05T19:29:43.890Z**: nivel **1 — Basic Web Presence**, **3 pass, 13 fail y 6 neutral**, 22 resultados, ninguno excluido. El timestamp exacto que manda es `scannedAt` del JSON. La API no devuelve puntuación numérica: no se inventa un “/100”. `nextLevel` pide `contentSignals` para nivel 2 — Bot-Aware.

La primera ejecución estuvo bloqueada por red; la siguiente necesitó el almacén de certificados del sistema (`--use-system-ca`, sin desactivar TLS). Node 24 en Windows emitió un assertion al cerrar después de escribir JSON íntegro: código de proceso 1. La evidencia solo se acepta porque ambos archivos se parsearon completos, tienen target y fecha reales y los checks esperados. No se presenta ese proceso como salida 0. Detalles y fuentes: [fuentes-y-linea-base.md](fuentes-y-linea-base.md).

## Destino y matriz de aplicabilidad

Objetivo contractual: conservar los tres checks verdes y ganar `contentSignals`, `linkHeaders`, `apiCatalog` y `markdownNegotiation`: **siete checks funcionales**. Se busca al menos el nivel 2 cuyo requisito sí confirma la línea base; el nivel final superior se medirá, sin prometer nivel 5 ni inferir umbrales no observados. `/llms.txt` aporta orientación, aunque no tiene check propio. `/auth.md` se publica honestamente aunque no alcance pass.

La matriz de la skill recomienda evaluar API, skills y protocolos para directorios; no obliga a adoptarlos. Esta selección usa las capacidades y el coste de Vet24, no la puntuación de FuenteAI.

| Check | Base | Decisión y responsable |
|---|---|---|
| `robotsTxt` | pass | Conservar; AR1–AR3 |
| `sitemap` | pass | Conservar; alias 301 confirmado útil en AR2 |
| `robotsTxtAiRules` | pass | El comodín ya permite bots; no duplicar bloques; AR1 |
| `contentSignals` | fail | Aplicable; política de negocio D1; AR1 |
| `linkHeaders` | fail | Aplicable; recursos reales propios; AR2 |
| `markdownNegotiation` | fail | Aplicable; texto de fichas y listados; AR3 |
| `apiCatalog` | fail | Aplicable; catálogo JSON propio, público y de lectura; AR2 |
| `authMd` | fail | Publicar acceso anónimo en AR2; posible fail aceptado por techo del criterio |
| `oauthDiscovery` | fail | No aplica a este catálogo sin cuentas/OAuth; no crear servidor ni metadata |
| `oauthProtectedResource` | fail | No aplica: recurso público no protegido por OAuth |
| `webBotAuth` | neutral | No aplica a lectura entrante; integraciones salientes existentes no equivalen a un bot firmante registrado |
| `agentSkills` | fail | Capa 4, decisión de negocio abierta; sin issue ejecutable |
| `ard` | fail | Capa 4, decisión de negocio abierta; sin issue ejecutable |
| `mcpServerCard` | fail | Capa 5, decisión de negocio abierta; sin servidor no hay tarjeta |
| `a2aAgentCard` | fail | Capa 5, decisión de negocio abierta; no se presupone un agente que ejecute tareas |
| `webMcp` | fail | Capa 5, candidato por el buscador existente; beneficio/adopción por aprobar |
| `dnsAid` | fail | Decisión externa ligada a servicios aprobados; no tocar DNS/DNSSEC en este plan |
| `x402` | neutral | No aplica: no se cobran consultas del catálogo |
| `mpp` | neutral | No aplica: sin flujo de pagos |
| `ucp` | neutral | No aplica: no hay tienda |
| `acp` | neutral | No aplica: no hay checkout |
| `ap2` | neutral | No aplica: sin pagos A2A; incluido en escaneo completo actual |

“Decisión abierta” no significa “descartado por el asistente”. El propietario podrá aprobar capas adicionales con nueva spec e issues. Tampoco se marcan como no aplicables solo por costar más.

## No negociables

| ID | Obligación |
|---|---|
| N1 | No anunciar capacidades ni enlaces que no respondan. No fabricar autenticación, fechas, fuentes, registros, claves o endpoints. |
| N2 | Escaneo completo antes y después de cada subfase desplegada, archivando todos los checks y comparando estados, no solo exit code/nivel. |
| N3 | Una fuente: `getCollection('clinicas')` y el contenido Markdown que hoy genera HTML. Un adaptador de datos común para JSON, llms y mirrors; sin catálogo manual paralelo. |
| N4 | `false` no prueba ausencia del servicio; `true` solo indica afirmación registrada. Conservar evidencia y limitaciones por especie/horario; no deducir verificación de `record_status`, tiers o nombres de helpers. |
| N5 | No vender “abierta ahora” como dato observado: `openNow: null`, zona `America/Costa_Rica`, horario textual y confirmación telefónica. Sin cálculo dinámico, geocodificación ni nueva investigación de fichas. |
| N6 | Rutas, MIME y relaciones exactamente como la tabla normativa; recursos nuevos fuera del sitemap; canonical y contenido/SEO existentes intactos, salvo alias de sitemap expresamente autorizado. |
| N7 | Negociación solo GET/HEAD de rutas con espejo. HTML por defecto; `Vary: Accept` en ambas ramas, noindex solo en URL directa del espejo, contención del fallo sin tumbar HTML ni consumir POST ajenos. Para aislar cachés, ambas representaciones de las familias negociables llevan `Cache-Control: private, no-store`, sin Cache API; se acepta el coste de caché de esta opción conservadora. |
| N8 | Conservar Astro/adaptador/SSR, bindings, formularios, anuncios, rutas y HTML actuales. No actualización de dependencias, no arreglos de datos/SEO ni fase editorial. |
| N9 | Verificador diferente del ejecutor. Evidencia productiva y auditoría de al menos tres IAs al finalizar; resultados verificables, límites explícitos y ninguna promesa de citación. Un fallo nuevo exige regresión automatizada. |
| N10 | Cada subfase cambia solo su allowlist; base inmutable documentada, traspaso serial de archivos compartidos. CI ejecuta validación de artefactos después de construir y no acepta skips nuevos. |

## Decisiones cerradas y decisiones reservadas

| ID | Decisión | Motivo / cobertura |
|---|---|---|
| D1 | **Pendiente de respuesta del propietario**: valores de entrenamiento para Content-Signal. AR1 no es ejecutable hasta registrar aquí su elección. | La skill exige confirmación del negocio; no se hereda la elección de FuenteAI. AR1-01 |
| D2 | AR2 publica catálogo estático completo y OpenAPI de lectura; llms es índice breve generado. AR3 consume el mismo adaptador. Sin `/llms-full.txt`. | Un catálogo de este tamaño puede filtrarse en el cliente; no necesita motor de búsqueda, estado ni otro documento completo duplicado. AR2-01/03, AR3-01 |
| D3 | Contrato conservador de datos descrito abajo, sin parser de “abierta ahora”. | Horarios libres y evidencia desigual; la proyección no repara el modelo clínico ni el issue #5. AR2-02, AR3-01/06 |
| D4 | Mantener adaptador 14.2.6; integración mínima para cabeceras SSR en AR2 y envoltura del handler oficial en AR3. No copiar el Worker independiente de FuenteAI ni activar Markdown externo en el panel. | Necesitamos mirrors reproducibles y conservar portada dinámica; `_headers` no cubre respuestas SSR. AR2-03/04, AR3-02/04 |
| D5 | Añadir únicamente alias `/sitemap.xml` → `/sitemap-index.xml`, 301. | 404 real confirmado; preserva índice y URLs. AR2-05 |
| D6 | AR1 → AR2 → AR3, sesiones ejecutora/verificadora distintas; ramas de ejecución desde main con predecesora fusionada y validada. | Evita dos propietarios simultáneos y contratos a medio definir. AR1-03, AR2-06, AR3-05 |
| D7 | Acceso público anónimo; sin OAuth, comercio ni Web Bot Auth ficticios. `/auth.md` no describe el endpoint de reportes como API de agentes. | No existen esos servicios para el catálogo. AR2-06, AR3-06 |
| D8 | Capas 4/5 y DNS-AID quedan a decisión del propietario; no se aprueban ni descartan definitivamente. | Falta evidencia de demanda y presupuesto; alternativas en sección de negocio. AR3-06 documenta esta disposición, no implementa protocolos. |

## Datos para agentes (contrato normativo de AR2 y AR3)

`src/lib/agent-content.ts` recibe entradas de la colección, aplica orden estable por `data.slug` y produce exactamente el mismo conjunto de fichas que `src/pages/clinica/[slug].astro`. Hoy HTML publica **toda** la colección, sin filtro `estado`: no introducir un filtro nuevo ni ocultar datos ya publicados en nombre de esta fase. No copiar `clinics-links-manifest.json.js`: es un manifiesto de enlaces, no contiene la evidencia clínica necesaria.

Raíz de `/api/catalog.json`: `schemaVersion: "1"`, `timeZone: "America/Costa_Rica"`, `clinics: []`. Sin marca temporal de build que parezca una revisión. Cada elemento contiene:

| Campo | Fuente / regla |
|---|---|
| `slug`, `url` | `data.slug`; URL absoluta `https://vet24cr.com/clinica/<slug>/`; nunca derivar slug de entry.id |
| `nombre`, `provincia`, `zona`, `direccion` | Valores de la ficha, sin inventar localidades |
| `provinciaSlug`, `zonaSlug` | Helpers existentes `normalizeSlug` y `getClinicZoneSlug`; leerlos sin modificarlos |
| `telefono1`, `telefono2`, `whatsapp`, `web`, `facebook`, `instagram`, `waze_url`, `maps_url` | Valor registrado o null si vacío; no tratar todos como URLs validadas ni enviar enlaces a servicios de acortamiento |
| `horarioTexto`, `categoriaHorario` | Texto/categoría registrados; sin reinterpretar franjas |
| `openNow` | Siempre null: no hay verificación en tiempo real |
| `latitude`, `longitude` | Números válidos y no pareja 0/0; si falta alguno/es inválido, ambos null; no rellenar ni calcular proximidad sin coordenadas |
| `copyDiferenciador`, `bodyMarkdown` | Texto íntegro y cuerpo de la entrada, incluido alcance por especie/reserva; no traducir ni resumir advertencias |
| `estado`, `confidence_score`, `record_status`, `emergency_tier` | Valores internos registrados; documentar que no certifican atención |
| `last_verified`, `verification_source`, `hotelFuente` | Texto registrado o null; nunca fecha de generación ni método inferido |
| `verification_notes` | Array original, incluso vacío |
| `phone_verified`, `address_verified`, `schedule_verified`, `emergency_verified`, `hotelVerificacion` | Valores del esquema, con advertencia de que son marcas registradas y no prueba nueva |
| `capacidades` | Objeto con las claves listadas abajo, cada una `{valorRegistrado: boolean, estado: "afirmado" \| "no-confirmado"}`; true→afirmado, false/default→no-confirmado, nunca “no ofrece” |
| `advertencias` | Array con las tres advertencias de política siguientes, en cada ficha, además de preservar las notas originales |

Claves exactas de `capacidades`: `emergencias24h`, `atiendeExoticos`, `cirugiaEmergencia`, `atiendeGranja`, `atiendePeces`, `hotelMascotas`, `has_surgery`, `has_hospitalization`, `overnight_doctor_present`, `accepts_emergency_walkins`. No usar `CapabilityStatus.confirmed` como verificación: su nombre no aporta evidencia.

Advertencias de política (no son hechos clínicos inventados):
1. “Confirma por teléfono el horario y la atención antes de trasladarte; este catálogo no informa disponibilidad en tiempo real.”
2. “Una capacidad afirmada refleja lo registrado en la ficha; no confirmado no significa que el servicio no exista.”
3. “Lee las notas y el texto de la ficha: los servicios pueden tener restricciones de especie, horario o reserva.”

Las notas pueden contener una negación **documentada** (p. ej., no atiende peces); conservarla no autoriza a convertir todos los false en negaciones. El caso Medical Care exige conservar hotel exclusivo para gatos y reserva previa, aunque el booleano actual sea true. No extraer automáticamente una taxonomía de especies desde prosa.

Consulta “emergencias en Heredia”: cliente descarga el catálogo y filtra `provinciaSlug === "heredia"` y `capacidades.emergencias24h.estado === "afirmado"`; responde **opciones registradas como 24/7**, con teléfono, fuente, fecha o ausencia y advertencias. No certifica apertura. Consulta “abierta ahora cerca de [zona]”: filtra `zonaSlug`, aporta horario y contacto y declara que debe confirmarse. No promete lista de abiertas ni distancias. Cero coincidencias significa que el catálogo no encontró opciones, no ausencia de servicios en el lugar.

## Rutas y terminología normativa

Los nombres AR1, AR2 y AR3 significan exactamente los de la tabla de fases. Las rutas técnicas no reciben barra final. No usar `absoluteUrl()`/`canonicalUrl()` actuales para archivos técnicos: esos helpers fuerzan slash; usarlos solo para HTML, construir las técnicas contra `SITE_ORIGIN`.

| URL | Archivo propietario | HTTP / tipo / condiciones |
|---|---|---|
| `/robots.txt` | `public/robots.txt` (AR1) | 200 text/plain; Content-Signal aprobado |
| `/llms.txt` | `src/pages/llms.txt.ts` (AR2) | 200 text/plain; UTF-8, H1 Vet24-cr, resumen y listas de enlaces a catálogo, docs y páginas HTML reales; sin enlaces futuros |
| `/api/catalog.json` | `src/pages/api/catalog.json.ts` (AR2) | 200 application/json; GET estático completo; sin filtros HTTP, paginación ni POST |
| `/api/openapi.json` | `src/pages/api/openapi.json.ts` (AR2) | 200 application/json; OpenAPI 3.1, esquema completo del catálogo, security vacío/ausente |
| `/api/readme.md` | `public/api/readme.md` (AR2) | 200 text/markdown; contrato, campos, límites y dos ejemplos de filtrado local |
| `/auth.md` | `public/auth.md` (AR2) | 200 text/markdown; H1 contiene auth.md; acceso anónimo al catálogo, sin registro ni credenciales |
| `/.well-known/api-catalog` | `public/.well-known/api-catalog` (AR2) | 200 application/linkset+json; RFC 9727, anchor absoluto del catálogo, service-desc OpenAPI y service-doc docs |
| `/sitemap.xml` | `public/_redirects` (AR2) | 301 a /sitemap-index.xml, sin sustituir el sitemap generado |
| `/md/index.md` | `src/pages/md/[...path].ts` (AR3) | Mirror de /; 200 text/markdown |
| `/md/clinica/<slug>.md` | mismo endpoint (AR3) | Mirror de /clinica/<slug>/ |
| `/md/provincia/<provincia>.md` | mismo endpoint (AR3) | Mirror de /provincia/<provincia>/, siete provincias |
| `/md/zona/<zona>.md` | mismo endpoint (AR3) | Mirror de /zona/<zona>/, solo priorityZones con página real |

Charset UTF-8 permitido en todos los MIME textuales/JSON. HEAD conserva status/cabeceras de GET, sin cuerpo. CORS `Access-Control-Allow-Origin: *` únicamente en las seis rutas públicas nuevas de AR2 y los mirrors directos; sin credenciales ni nuevo CORS global en HTML/formularios. Todas son lecturas públicas; no se publica una API de escritura.

Cabecera `Link` desde AR2 en portada y HTML de clínicas/provincias/zonas: `</.well-known/api-catalog>; rel="api-catalog", </api/openapi.json>; rel="service-desc", </api/readme.md>; rel="service-doc", </llms.txt>; rel="describedby"`. No apuntar service-desc a una API de terceros ni añadir tarjetas futuras. AR3 conserva exactamente esos cuatro destinos.

## Fases, dependencias y propiedad

| ID | Fase | Spec | Issue | Depende de | Estimación de trabajo, no compromiso |
|---|---|---|---|---|---|
| AR1 | Política de rastreo | [fase-1-content-signal.md](fase-1-content-signal.md) | [#12](https://github.com/Gunz-cop/Vet24-cr/issues/12) | PR #11 y D1 | 1–2 h, incluida verificación |
| AR2 | Catálogo público y descubrimiento | [fase-2-catalogo-descubrimiento.md](fase-2-catalogo-descubrimiento.md) | [#13](https://github.com/Gunz-cop/Vet24-cr/issues/13) | AR1 | 1–2 días |
| AR3 | Markdown y validación de agentes | [fase-3-markdown-validacion.md](fase-3-markdown-validacion.md) | [#15](https://github.com/Gunz-cop/Vet24-cr/issues/15) | AR2 | 1–2 días + disponibilidad de auditorías |

AR1 separa una política corta y desplegable. No juntar capas 1+2 por rutina: aquí llms necesita antes un adaptador de datos conservador y Markdown requiere integrar SSR/Assets. AR2 reúne base de capa 3 y descubrimiento de capa 1; AR3 añade capa 2 sobre esa base.

**No hay paralelismo de implementación autorizado.** AR1 podría escribirse sin AR2, pero se cierra primero por tamaño y política pendiente. AR2 y AR3 comparten contratos y archivos: iniciarlas a la vez crea retrabajo aunque algunos archivos sean distintos.

| Par | Resolución verificable |
|---|---|
| AR1 / AR2 | Serial por D6; sin archivos compartidos |
| AR1 / AR3 | Serial por D6; sin archivos compartidos |
| AR2 / AR3 | Serial; AR2 posee primero `public/_headers`, `astro.config.mjs` y `.github/workflows/ci.yml`; AR3 los recibe solo tras merge y verificación de AR2 |
| Nuevas fases / issue #5 | #5 no es dependencia: la proyección preserva límites sin reparar modelo/FAQ. Sus archivos de contenido/esquema/UI están protegidos. Si cambia main durante una verificación, integrar después y reverificar la nueva base |

Listas exhaustivas (un glob solo autoriza el subdirectorio indicado):

### Propiedad AR1

- `public/robots.txt`
- `tests/unit/agent-content-signal.test.ts`
- `docs/agent-readiness/evidencia/ar1/**`

### Propiedad AR2

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

### Propiedad AR3

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

`astro.config.mjs` solo admite exclusión de recursos técnicos nuevos del sitemap si el generador los incluye; no tocar site, trailingSlash, adapter, output ni integraciones ajenas. CI solo añade validadores de agentes después de build, sin eliminar controles existentes. AR3 puede cambiar `wrangler.toml` únicamente para main y cobertura run_worker_first de esta capa, conservando bindings, flags y fecha. El resto de archivos no listados está protegido.

La revisión se ejecuta con `git diff --name-only <BASE>...HEAD`, donde BASE es el SHA inmutable del inicio (main con predecesora). No usar el main móvil para ocultar cambios. Comparar cada línea contra la allowlist, no solo buscar unos archivos prohibidos. Un archivo nuevo también necesita propietario. README/specs/issues son del coordinador documental, no de los implementadores.

## Qué no se toca

`src/content/**`, `src/content.config.ts`, páginas HTML existentes, layouts, componentes, estilos, `src/lib/seo.ts`, `src/lib/zones.ts`, `src/lib/capabilityStatus.ts` y `src/lib/metaDescription.ts`: preservan contenido/SEO/UI y modelo actual. Se leen para derivar datos. `src/middleware.ts` es la única excepción a código existente de entrega, en AR2, acotada a cabeceras SSR y manejo exacto de la ruta técnica sin extensión.

También protegidos: `package.json`, `package-lock.json`, bindings DB/SESSION/EMAIL, secretos, D1/KV, scripts de acortamiento/indexación, `src/linkzip-cache.json`, APIs existentes, tests existentes salvo el workflow expresamente listado, `docs/migracion-stack/**`, skills copiadas y todo el blog/fase 3 editorial. No resolver #5 ni `/api/status-override` (404 preexistente) en estos issues. No API en tiempo real, LLM, embeddings, MCP, A2A, WebMCP, Agent Skills, ARD ni DNS.

## Verificación común

Estos comandos son para **las futuras sesiones**, no se ejecutan como implementación en esta entrega documental. Desde la raíz real `veterinarias-cr`:

```powershell
npm ci
npm run build:no-shorten
npm run types:worker
git diff --exit-code -- worker-configuration.d.ts
npm run check
npm test
npm run deploy:dry-run
npm run test:e2e
git diff --name-only <BASE>...HEAD
node --use-system-ca .claude/skills/agent-readiness/scripts/scan.mjs https://vet24cr.com --json --check robotsTxt,sitemap,linkHeaders,dnsAid,markdownNegotiation,robotsTxtAiRules,contentSignals,webBotAuth,apiCatalog,oauthDiscovery,oauthProtectedResource,authMd,mcpServerCard,a2aAgentCard,agentSkills,webMcp,ard,x402,mpp,ucp,acp,ap2
```

Usar cada comando por separado y registrar exit code. `--use-system-ca` es adaptación del entorno, no reducción del escaneo. Verificar que todos los checks actuales estén incluidos; si cambia el servicio, registrar lista y explicar comparabilidad, nunca desactivar categorías. Leer las guías primarias de los checks antes de implementar.

En AR3, si cambian tipos al cambiar Wrangler, regenerarlos y commitearlos antes de la comprobación reproducible. No usar `npm run build`: el acortador puede escribir datos y hacer llamadas externas. Para HTTP local usar preview del build de Astro/Cloudflare, no servidor de archivos plano; seguir la skill wrangler si se usan comandos Wrangler adicionales. Todas las nuevas pruebas y validadores deben salir 0 sin skips. Los 11 skips históricos de E2E se registran como no verificados, no como pass ni como permiso para nuevos skips. Un fallo existente requiere comparación contra BASE; ningún fallo nuevo se acepta como deuda heredada.

Una sesión distinta verifica el commit candidato con CI y HTTP antes de integrar; después del despliegue del flujo del repo verifica dominio, commit desplegado y escáner. Un build verde no cierra el issue. El coordinador fusiona/despliega según el flujo autorizado de esa sesión; esta tarea documental no abre PR ni despliega. Reversión futura: revertir commits de la subfase; si tiene dependientes, revertir primero las dependientes. No dejar Link apuntando a recursos retirados.

## Aceptación normativa y trazabilidad

Los bloques siguientes son la fuente exacta de las casillas de fases e issues. Cada casilla cita N/D de este README; no se admite agregar un criterio solo en GitHub.

### AR1

- [ ] **AR1-01** [N1, D1] `curl.exe -fsS https://vet24cr.com/robots.txt` devuelve 200, conserva `User-agent: *`, `Allow: /` y `Sitemap: https://vet24cr.com/sitemap-index.xml`; contiene exactamente una directiva `Content-Signal` con los tres valores aprobados en D1, dentro del bloque comodín.

- [ ] **AR1-02** [N2, N9] Se archiva un escaneo completo antes de modificar la subfase. Después del despliegue, el escaneo completo definido en «Verificación común» devuelve `robotsTxt=pass`, `sitemap=pass`, `robotsTxtAiRules=pass` y `contentSignals=pass`; se archiva el JSON íntegro, fecha, commit desplegado y estados de todos los checks, sin convertir la salida 0 del script en una prueba de éxito.

- [ ] **AR1-03** [N8, N10, D6] La verificación común pasa; `git diff --name-only <BASE>...HEAD` solo contiene archivos de la lista de propiedad AR1. Una sesión distinta documenta la comprobación HTTP en `docs/agent-readiness/evidencia/ar1/`, sin cambios de producto fuera de robots.

### AR2

- [ ] **AR2-01** [N3, N4, N5, D2, D3] Después de `npm run build:no-shorten`, `node scripts/verification/agent-catalog.mjs` sale 0 y falla si falta un artefacto: verifica el contrato «Datos para agentes», unicidad de slug, igualdad del conjunto de fichas con las rutas HTML de clínicas del mismo build y URLs canónicas existentes; no usa un conteo fijo ni excluye fichas por `estado` que el HTML sí publica.

- [ ] **AR2-02** [N4, N5, D3] `npm test` cubre datos de prueba con booleano falso, booleano verdadero sin evidencia, fecha/fuente vacías, coordenadas 0/0 y servicio limitado por especie. Confirma `openNow: null`, zona horaria `America/Costa_Rica`, ausencia de fecha editorial inventada, estados conservadores de capacidades y conservación de `copyDiferenciador`, `bodyMarkdown` y `verification_notes`; el caso real de Medical Care conserva «hotel exclusivamente para gatos» sin inferir hotel general.

- [ ] **AR2-03** [N1, N6, D2, D4] GET y HEAD a `/api/catalog.json`, `/api/openapi.json`, `/llms.txt`, `/api/readme.md`, `/auth.md` y `/.well-known/api-catalog` cumplen los códigos y MIME de la tabla de rutas, sin barra final añadida; HEAD no lleva cuerpo. El OpenAPI 3.1 describe exclusivamente GET del catálogo público, sin autenticación ni filtros de servidor; el catálogo RFC 9727 enlaza únicamente ese servicio y documentación que responde 200.

- [ ] **AR2-04** [N1, N6, N8, D4] `curl.exe -sS -D - -o NUL https://vet24cr.com/` y la misma comprobación sobre `/clinica/hems-una-heredia/` muestran las cuatro relaciones `Link` del contrato; todos sus destinos responden 200. Hay un solo bloque global `/*` en `public/_headers`, CORS comodín solo en los recursos públicos nuevos indicados, y el SSR de portada recibe las cabeceras mediante la integración runtime.

- [ ] **AR2-05** [N6, N8, D5] `curl.exe -sS -D - -o NUL https://vet24cr.com/sitemap.xml` devuelve 301 con destino `https://vet24cr.com/sitemap-index.xml` o su ruta relativa equivalente; el destino devuelve XML 200. Las URLs canónicas HTML, contenido/SEO y miembros de los sitemaps existentes permanecen iguales; los recursos de agentes no se añaden al sitemap.

- [ ] **AR2-06** [N2, N9, N10, D6, D7] Se archiva un escaneo completo antes de modificar la subfase. La verificación común y el verificador de artefactos tras build pasan en CI y en sesión independiente; el escaneo completo conserva los cuatro pass de AR1 y añade `linkHeaders=pass` y `apiCatalog=pass`. Se comprueba `/auth.md` anónimo, sin OAuth ficticio, y se archiva el resultado real de `authMd` aunque falle; el diff cumple propiedad AR2 y la evidencia queda en `docs/agent-readiness/evidencia/ar2/`.

### AR3

- [ ] **AR3-01** [N3, N4, N5, N7, D2, D3] Después de build, `node scripts/verification/agent-markdown.mjs` sale 0, sin skips: hay espejo para portada, las siete provincias, las zonas de `priorityZones` y todas las fichas del catálogo. Comprueba la correspondencia de rutas del contrato, reutilización del catálogo de AR2, cuerpo editorial y advertencias sin pérdida, sin mirrors legales/404/blog ni afirmación de apertura en tiempo real.

- [ ] **AR3-02** [N7, D4] En producción, GET con `Accept: text/markdown` sobre cada URL HTML con espejo devuelve 200 y `Content-Type: text/markdown`; GET sin Accept, con Accept de navegador o con `text/markdown;q=0` conserva HTML. Ambas representaciones llevan `Vary: Accept` sin borrar otros valores, los empates favorecen HTML y HEAD aplica la misma selección sin cuerpo.

- [ ] **AR3-03** [N6, N7, N8] Cada URL directa `/md/**.md` devuelve 200, `text/markdown`, CORS público y `X-Robots-Tag: noindex`; la URL HTML negociada conserva su canonical y no hereda ese noindex. Ningún espejo aparece en los sitemaps. La prueba alterna peticiones HTML/Markdown en el mismo URL, exige `Cache-Control: private, no-store` en ambas representaciones negociables y ausencia de uso de Cache API, y verifica que ninguna caché mezcle representaciones.

- [ ] **AR3-04** [N7, N8, D4] `npm test` y `node scripts/verification/agent-markdown.mjs` verifican cobertura de `run_worker_first`, con `/` exacta y las tres familias HTML, y ausencia de captura general de `/api/`. Un espejo ausente o con fetch fallido conserva el HTML y su status por el adaptador; POST ajeno a esta capa conserva método y cuerpo sin consumirlos. `/api/report-incorrect/` mantiene su comportamiento previo en pruebas locales con efectos externos aislados.

- [ ] **AR3-05** [N2, N8, N9, N10, D6] Se archiva un escaneo completo antes de modificar la subfase. La verificación común y las pruebas nuevas tras build pasan en CI y por sesión distinta. El escaneo completo conserva los seis pass de AR2 y añade `markdownNegotiation=pass`; se guardan JSON, cabeceras, inventario completo de mirrors y comparativa antes/después, con diff limitado a propiedad AR3, en `docs/agent-readiness/evidencia/ar3/`.

- [ ] **AR3-06** [N1, N4, N5, N9, D7, D8] Tras desplegar, se archivan respuestas íntegras de al menos tres IAs con infraestructuras de búsqueda distintas, respondiendo cada una a las dos consultas del protocolo de auditoría. Cada hallazgo se contrasta por HTTP, distinguiendo fallo del sitio, limitación de herramienta y deuda de datos; no se declara cierre con fallos introducidos sin resolver ni se promete citación. El informe enumera todos los checks no pasados con su clasificación y conserva capas 4/5 y DNS-AID como decisiones no autorizadas, sin publicar sus endpoints.

## Auditoría de agentes al cerrar AR3

En conversaciones nuevas, sin contexto previo, usar al menos tres IAs con infraestructura de búsqueda distinta. No basta ejecutar tres veces el mismo modelo ni afirmar independencia sin documentar proveedor/herramienta.

1. “Usando https://vet24cr.com, ¿qué clínica está abierta ahora cerca de San Pablo de Heredia? Indica qué puedes confirmar, horario registrado, teléfono, URL de ficha y límites de actualidad.”
2. “Usando https://vet24cr.com, ¿qué opciones de emergencias hay en Heredia? Distingue lo reportado como 24/7 de disponibilidad confirmada y conserva restricciones relevantes.”

Guardar prompts y respuestas íntegras, modelo/herramienta, fecha, rutas recuperadas y comprobaciones HTTP. HEMS (sin fecha/fuente registradas) y Medical Care (hotel limitado a gatos) son controles semánticos, no recomendaciones médicas en esta spec. Si la IA no puede abrir una ruta, verificar con curl antes de atribuirlo al sitio. El ejecutor corrige únicamente defectos introducidos en su allowlist y añade una regresión por cada uno; deuda editorial previa se clasifica aparte. Si no hay acceso a tres infraestructuras, AR3 queda pendiente de auditoría, no se inventan respuestas.

## Decisión de negocio a 12 meses: capas 4/5 y DNS-AID

El propietario aún no ha aprobado estas inversiones. Estimaciones de ingeniería para planificación, no costes medidos de FuenteAI ni promesas de adopción:

| Alternativa | Coste inicial / recurrente estimado | Beneficio posible y condición | Issue que se abriría si se aprueba (no creado) |
|---|---|---|---|
| Capa 4: Agent Skills + ARD | 0,5–1 día; revisión de schemas/digests en cada cambio y controles periódicos | Instrucciones fiables de filtrado y descubrimiento de API; justificar con un cliente/registro que realmente las consuma | “AR4 — Agent Skills y ARD del catálogo público”; depende AR2/AR3, digest en build con LF, índice y CORS reales |
| Capa 5: MCP | 2–4 días; mantenimiento del protocolo, abuso, errores, registros y soporte | Consultas tipadas por provincia/zona para clientes MCP identificados; exige plan de distribución y responsable de mantenimiento | “AR5A — MCP de lectura del catálogo”; servicio probado primero y luego tarjeta, origin/body/error tests; no prometer openNow |
| Capa 5: A2A | 2–4 días adicionales; versiones y ciclo de tareas | Solo si hay un flujo entre agentes que la API/MCP no resuelva; hoy no se ha identificado | “AR5B — A2A para un caso de uso aprobado”; decidir protocolo real y probarlo antes de la tarjeta |
| Capa 5: WebMCP | 0,5–2 días; compatibilidad y pruebas de navegador | Operar el buscador existente si usuarios/clientes reales lo soportan | “AR5C — WebMCP sobre búsqueda”; registro al cargar, feature detection, no cambios de UX sin nueva autorización |
| DNS-AID | 0,5–1 día + coordinación DNS; vigilancia de DNSSEC/registros | Descubrimiento de endpoints reales ya aprobados; no aporta contenido por sí solo | “AR6 — DNS-AID de servicios existentes”; dueño DNS, SVCB/HTTPS y DNSSEC, no inventar claves ni publicar host sin servicio |

Antes de aprobar: identificar consumidor, responsable, presupuesto máximo y métrica (consultas útiles atribuibles, con límites de privacidad), y fijar revisión posterior a lanzamiento. No hay datos de uso ni retorno económico para elegir ahora. Comparar con mantener solo AR1–AR3, que ya permite leer/filtrar fichas. Aprobar una alternativa exige actualizar esta spec, propiedad/dependencias y consistencia antes de crear su issue ejecutable. No hay autorización implícita para publicar `/.well-known/ai-catalog.json`, `/.well-known/agent-skills/index.json`, `/.well-known/mcp/server-card.json`, `/.well-known/agent-card.json`, `/mcp` o `/a2a`.

## Verificación de consistencia de esta entrega

El registro de lectura adversarial, defectos corregidos, cobertura N/D→casillas y comprobaciones de términos/propiedad está en [verificacion-consistencia.md](verificacion-consistencia.md). Los cuerpos a publicar se conservan en [issues/](issues/README.md) y se comparan con GitHub después de crearlos. Esta sección no equivale a pruebas de las implementaciones futuras.
