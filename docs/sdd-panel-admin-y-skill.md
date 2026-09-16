# SDD: panel administrativo y skill de fichas de Vet24 Costa Rica

Versión: 1.2 candidata. Fecha: 2026-09-15 (Costa Rica). Estado: sujeto al veredicto del informe independiente cuyo SHA256 coincida con este archivo. Alcance de esta entrega: diseño e issues; no implementación, despliegue ni cambios de fichas.

## 1. Base verificada y decisiones

Repositorio `Gunz-cop/Vet24-cr`; rama local `codex/blog-b3-politica-atribucion`; HEAD `3d03ecc0da65f2127a66b7935baa39e1bdd2d6b5`; rama predeterminada GitHub `main`. El SDD describe HEAD **más el árbol local**, no una versión ya desplegada. Se leyeron `docs/analisis-creacion-fichas-y-horarios.md`, `docs/guia-implementacion-skill-horarios-y-ci.md`, `docs/plan-panel-administrativo.md`, `src/lib/schedule.ts` y `tests/unit/schedule.test.ts` íntegros. Los cinco están sin seguimiento al comenzar. Cambios preexistentes en ClinicaCard, FiltrosDashboard, detalle de clínica y global.css se conservan.

Inventario local: 112 fichas; `npm test` ejecutado: 86 pruebas aprobadas, 0 fallos. No prueba producción ni seguridad de los flujos futuros. Los números 24 horarios rotos y 21 emergencias del análisis son diagnósticos históricos, no constantes de aceptación. No se encontró AGENTS.md aplicable en el repositorio o directorios superiores inspeccionados.

| Hecho comprobado | Consecuencia para el diseño |
| --- | --- |
| package.json declara Astro ^7.2.10 y adapter Cloudflare ^14.2.6; output static; src/worker.ts delega al handler oficial | Usar Workers con rutas Astro dinámicas, no asumir despliegue Pages Functions |
| wrangler.toml declara DB, SESSION y EMAIL; scripts/schema.sql define reports y clinic_overrides | Binding y SQL locales no prueban provisión, esquema ni configuración remota; verificar en preflight |
| schedule.ts centraliza parseo, pero conserva heurísticas por nombre/rango y asigna L-V cuando faltan días | Corregir antes de alimentar el editor; no considerar terminado el motor |
| FiltrosDashboard y detalle aún tienen evaluadores de cliente propios | Consolidar evaluación y probar todos los consumidores |
| functions/api/status-override.js tiene secreto de respaldo literal; detalle inserta avisos mediante HTML y solo cambia texto del horario | Retirar escritura heredada, sanear render y aplicar estado coherente; no afirmar que esa ruta esté activa en Workers |
| src/pages/api/report-incorrect/index.ts ya es dinámico; captura errores D1 y puede informar db_saved incorrectamente | Asegurar persistencia real para que la bandeja sea verificable |
| Existe skill personal veterinarias-cr-content, aunque el documento previo decía que no había skill | Nueva skill de proyecto reutilizará sus principios y contrato, sin borrar ni editar la skill personal |

Decisiones de arquitectura de esta especificación:

- **D1:** conservar Markdown como fuente permanente; D1 solo para overrides operativos temporales, reportes y auditoría.
- **D2:** Cloudflare Access con validación JWT en servidor como autenticación de v1; no implementar contraseñas propias ni un segundo login KV. SESSION existente queda disponible al adaptador, sin convertirlo en autoridad administrativa. KV tiene consistencia eventual y no se usará para revocación inmediata ni contadores atómicos [F4].
- **D3:** edición permanente mediante GitHub App y PR a `main`, sin auto-merge. Descargar Markdown validado es recuperación, no publicación. La configuración remota es trabajo de implementación, no condición para redactar o crear issues.
- **D4:** extender esquema con horarios estructurados versionados; texto y regla compacta se derivan. Compatibilidad conservadora para fichas antiguas.
- **D5:** Maps/Places será primer paso de descubrimiento según el encargo; ninguna fuente prevalece automáticamente ante contradicción. Confirmar hechos con fuente oficial y registrar evidencia por campo. Esto resuelve la diferencia con la jerarquía de la skill personal.

Fuera de alcance: implementar ahora el producto; migrar todo el sitio a SSR/D1; realizar llamadas, envíos o altas masivas de fichas automáticamente; atribuir servicios médicos por inferencia; implementar login con contraseña; resolver el issue #5 de alcance por especie (se preservan sus contratos y no se duplica).

## 2. Requisitos e invariantes

| ID | Requisito verificable |
| --- | --- |
| R01 | Investigación sin login, evidencia por campo, contradicciones explícitas, sin inventar disponibilidad |
| R02 | Modelo semanal y excepciones, parser conservador, evaluación Costa Rica, serialización estable |
| R03 | Validación común antes de escritura, integridad de identidad, coordenadas y emergencias |
| R04 | Catálogo con búsqueda/filtros/bandeja, sin contadores fijos; reportes privados y persistidos |
| R05 | Editor accesible de horarios, descansos, día 24h, coordenadas y enlaces |
| R06 | Overrides D1 con versión, expiración, auditoría atómica y concurrencia |
| R07 | Estado público coherente entre tarjetas, detalle, mapa y filtros; degradación explícita |
| R08 | Markdown permanente mediante PR, control de conflictos y recuperación idempotente |
| R09 | Auth en UI y API, sin bypass por assets, host alternativo o endpoint heredado |
| R10 | CI offline reproducible, unitarias, contratos, D1 local y E2E de Workers |
| R11 | Migración/reversión seguras, observabilidad y operación documentada |
| R12 | Integración de contratos de catálogo, Markdown para agentes, SEO y sitemap existentes |

Una emergencia bajo llamada no equivale a puerta abierta. Un campo sin evidencia no equivale a falso conocido. Un override no altera la evidencia histórica. Ningún navegador decide autorización ni valida de forma exclusiva. Ninguna respuesta de éxito debe encubrir una escritura fallida.

## 3. Contrato de horarios y datos

### 3.1 Modelo canónico

Añadir `schedule_v1` opcional al frontmatter y extraer esquemas puros a `src/lib/clinic-schema.ts` para compartir entre Astro, servidor y scripts. Modelo JSON/YAML estricto:

```ts
type Day =
  | { kind: 'unknown' | 'closed' | 'appointment' }
  | { kind: 'open'; intervals: { start: number; end: number }[] };
type ScheduleV1 = {
  version: 1;
  timeZone: 'America/Costa_Rica';
  days: [Day, Day, Day, Day, Day, Day, Day]; // domingo = 0
  exceptions: { date: string; day: Day }[]; // YYYY-MM-DD local
};
```

Minutos enteros: inicio 0..1439, fin 1..1440, inicio < fin; extremos [inicio, fin). Máximo 8 intervalos por día; ordenar, rechazar superposiciones y fusionar contiguos. Máximo 60 excepciones, fechas reales y únicas; reemplazan completamente el día local. Día 24h = [0,1440); siete días 24h no implica capacidad de emergencias. El editor puede aceptar "termina al día siguiente" y divide el intervalo en dos días antes de validar (viernes 22-02 → viernes [1320,1440), sábado [0,120)). Detectar conflictos con intervalos del día siguiente. Si ese día tiene estado unknown/appointment, exigir confirmación del resto del día: no convertirlo silenciosamente en cerrado. Excepción de sábado cerrado anula el tramo del sábado, incluso si venía de viernes.

`horarioTexto` se deriva con nombres completos de días y horas HH:mm; `scheduleAttr` se deriva exclusivamente para compatibilidad de consumidores migrados, nunca se edita ni persiste como segunda verdad. El contrato de minutos es autoridad. La representación compacta antigua no expresa unknown por día ni excepciones: no usarla para decisiones cuando existe schedule_v1. Nuevo evaluador devuelve OPEN/CLOSED/UNCONFIRMED y reason (unknown, appointment, invalid, live_unavailable, temporary_closed). Horario inválido nunca produce CLOSED por defecto. Date inválida produce UNCONFIRMED. Evaluar instante UTC con getters UTC tras desplazar -6h, sin depender de TZ del host ni usar offset local.

Parser legado devuelve discriminante `parsed | unconfirmed | invalid` y diagnósticos por segmento. Acepta am/pm válidos (1..12, minutos 0..59), 12md/12mn, HH:mm, todos los días individuales en español y rangos completos, turnos partidos y cruces semanales. Sin día explícito no asigna L-V. Cualquier segmento relevante sin interpretar invalida el resultado completo para revisión, sin conservar una coincidencia parcial que invente el resto. "Consultar" y cita previa sin horas son unconfirmed. Texto con horas aproximadas/contradicciones no se vuelve horario confirmado. Quitar todos los nombres y atajos de rangos. Los días ausentes en texto legado quedan unknown; migrar a closed solo con evidencia explícita.

`emergencias24h` deja de ser entrada del motor de apertura física. Para nuevas altas/cambios que afirmen atención presencial 24/7 se requiere horario completo 24h, `emergency_verified`, `overnight_doctor_present`, `accepts_emergency_walkins`, evidencia de confirmación directa y `emergency_tier: Tier A`. La cirugía/hospitalización se verifica por separado: no se deriva de Tier A. Horario 24h sin esas capacidades puede ser OPEN pero no aparece en filtro de emergencias confirmadas 24/7. No reetiquetar todas las fichas existentes automáticamente; las incoherencias pasan a revisión y se excluyen de afirmaciones positivas mientras se investigan.

Schema.org usa el mismo modelo: intervalos regulares conocidos, 24h como 00:00–23:59 según convención documentada; no emitir horario desconocido/cita previa. Excepciones fechadas conocidas mediante `specialOpeningHoursSpecification`; probar representación de día cerrado y 24h con fixtures basados en documentación Schema.org durante implementación. No crear horarios por defecto. Metadata y FAQ no afirman disponibilidad en vivo. Los consumidores estructurados estáticos expresan horario base, fecha de revisión y ausencia de estado en vivo; el endpoint vivo se documenta por separado.

### 3.2 Validación y migración

`scripts/validate-clinics.mjs` y wrappers de skill usan el mismo schema/motor, con parser YAML real (dependencia fijada y lockfile), no regex sobre frontmatter. Rechazan BOM, claves duplicadas, campos desconocidos del contrato nuevo, tipos incorrectos, id/slug duplicados, slug distinto del nombre de archivo, URLs con protocolos peligrosos, fechas inválidas y coordenadas no finitas o 0,0. ID se compara como string normalizado; nuevas altas usan UUID para evitar max+1 concurrente; se mantienen IDs históricos.

Coordenadas: validar rangos geográficos globales y revisión territorial; caja continental de referencia 8..11.3, -86..-82.5 es alarma de revisión, no prueba de pertenencia ni exclusión de islas. Ubicaciones fuera requieren evidencia territorial explícita y revisión humana; no aumentar decimales para simular precisión. Nuevas fichas publicables necesitan coordenadas verificables; borradores sin ubicación usan null en el contrato nuevo y quedan excluidos de mapa/rutas GPS. Adaptar schema y consumidores antes de permitir null. No escribir cero como centinela.

Inventariar deuda con archivo `docs/admin/data-debt.json`: slug, regla incumplida, hash del registro, razón, responsable y vencimiento máximo de 30 días desde creación. CI estricto para nuevas fichas y cualquier ficha modificada; para legado sin tocar permite únicamente deuda exacta, no ampliable sin revisión. Duplicados, BOM nuevos y coordenadas 0,0 en nuevas/modificadas siempre bloquean. La deuda vencida bloquea; las fichas inciertas pueden corregirse a unknown/pendiente sin inventar hechos. Completar migración de las 112 fichas con investigación donde haga falta; el número se descubre dinámicamente. CI total sin excepciones es la condición de cierre de la tarea de saneamiento.

## 4. Skill investigar-veterinaria

Ubicación `.agents/skills/investigar-veterinaria/`: SKILL.md, templates/clinic-entry.md, scripts/normalize-hours.mjs y scripts/geocode-check.mjs. Wrappers llaman al contrato central, sin copiar parser. Antes de escribir, leer schema del repo y ficha existente, cotejar duplicados por slug, ID, teléfono, nombre normalizado y dirección; sucursales distintas requieren evidencia. Actualizar por slug estable, sin renombrar ni eliminar automáticamente.

Flujo: buscar nombre + cantón en Maps/Google Search público; identificar sucursal y place_id si existe; contrastar sitio oficial; consultar fragmentos públicos solo como pistas; registrar inaccesibilidad de redes sin login, sin evadir bloqueos. La API Places es opcional y requiere credenciales/revisión de uso; no se presupone gratuita ni sin autenticación. Evitar copiar payloads de Places a Markdown o a mapas Leaflet: sus condiciones limitan almacenamiento y presentación [F5]. Conservar place_id y URLs; hechos permanentes deben apoyarse en evidencia obtenida por vías autorizadas, preferentemente publicación oficial o confirmación directa. No hay dependencia de Google para ejecutar CI.

Evidencia por campo en `research/clinics/<slug>.json`: schemaVersion, slug, observedAt ISO UTC, fuentes (URL pública, tipo, fecha de consulta/publicación si consta), facts (campo, valor, referencias de fuente, confianza), conflicts y resolución razonada. No guardar contactos privados de informantes ni transcripciones de llamadas; una confirmación directa registra fecha, método y campos confirmados, sin fingir que el agente llamó. Snippets no bastan para VERIFIED. Datos operativos contradictorios ⇒ REVIEW_REQUIRED y horario unknown/appointment según evidencia; búsqueda fallida ⇒ PARTIAL/REVIEW_REQUIRED. Record_status y flags de verificación se derivan de evidencia, no del simple éxito del parser.

Separar explícitamente horario físico, guardia telefónica, presencia nocturna, walk-ins, cirugía y hospitalización. Maps que cierra 20h frente a marketing 24/7 dispara conflicto; no elegir el dato más amplio. La declaración de Tier A exige confirmación directa documentada; mientras falta, no afirmar presencial 24/7. Skill entrega diff y reporte de validación, nunca hace llamadas, envíos, commit o publicación por sí sola. Validar antes de escribir; escribir a temporal, validar colección candidata y sustituir atómicamente; fallo conserva archivo original. Casos fixture: pausa, cita, marketing contradictorio, dos sucursales, red cerrada, ubicación aproximada, servicio sin confirmar.

## 5. Runtime y autenticación

### 5.1 Enrutamiento real

Conservar `src/worker.ts` y negociación de `src/lib/agent-http.ts`. Nuevas páginas `src/pages/admin/index.astro`, `admin/editar/[slug].astro`, `admin/nueva.astro` y endpoints `src/pages/api/admin/**` con `prerender = false`. No crear nuevas APIs en functions/. Añadir protección anterior a canonicalización en `src/middleware.ts` mediante helper común server-only; worker aplica guardia de familias protegidas antes del handler para defensa ante assets o delegación inesperada. Una única función de auth reusable, sin lógica divergente. Extender run_worker_first para `/admin`, `/admin/*`, `/api/admin`, `/api/admin/*`; no generar HTML administrativo estático. Pruebas actualizan contrato que hoy exige las cuatro familias exactas.

No aplicar redirect 301 de trailingSlash a POST; API acepta forma canónica sin redirección o devuelve error explícito. Preservar Link, negociación Markdown, Vary y comportamiento de rutas públicas. Excluir admin del sitemap y poner `X-Robots-Tag: noindex, nofollow` y `Cache-Control: private, no-store`; no usar robots como seguridad. No exponer bundles con secretos ni datos embebidos.

### 5.2 Access

Provisionar aplicación Access para familias UI **y API**. Verificar JWT `Cf-Access-Jwt-Assertion` con biblioteca compatible Workers y JWKS del team domain configurado, algoritmo permitido, firma, iss, aud, exp, nbf y sub. Nunca confiar en un correo de header sin token validado ni en URLs JWKS contenidas en el token. Caché acotada JWKS y refresco único para kid desconocido, fallar cerrado si no se puede verificar. Configuración ausente ⇒ 503 sin filtrar detalles; JWT ausente/inválido ⇒ 401 en API; identidad válida fuera de allowlist ⇒ 403. UI bajo Access redirige al login del proveedor; servidor no genera redirects hacia un returnTo externo.

Todos los administradores v1 comparten rol editor autorizado; allowlist de subject en secreto/configuración server-only. Duración de sesión Access objetivo 1h, sin prometer revocación instantánea de JWT ya emitido; retirada inmediata operacional mediante deshabilitar acceso administrativo en configuración y rotar/desautorizar según runbook. Cierre de sesión usa logout de Access y borra estado UI. No persistir tokens en localStorage.

workers.dev/preview/hosts alternativos: no confiar en hostname como bypass; negar familias admin si host no autorizado y desactivar exposición alternativa en producción cuando sea posible. Tests de host canónico, alternativo, header forjado, JWT expirado/aud incorrecta y acceso directo a HTML. No bypass localhost dentro del artefacto desplegable; fixtures JWT/JWKS y configuración aislada solo en runner local.

Mutaciones: JSON, límite 64 KiB, Origin exactamente igual al origen configurado (ausente/rechazado ⇒ 403), header custom `X-Vet24-Admin: 1`, sin CORS permisivo y Fetch Metadata same-origin si presente. Requerir auth + allowlist; cookies de Access no sustituyen defensa CSRF. Métodos no admitidos 405 con Allow. Validación server-side 422; SQL preparado; no aceptar rutas de archivo ni nombres de tabla desde cliente. Rate limit de mutaciones por subject con operación atómica D1 (30/min), 429 y Retry-After. Errores genéricos con requestId, sin tokens, consultas SQL o datos privados. Avisos/reportes se renderizan con textContent, nunca interpolación innerHTML.

Retirar POST heredado de `/api/status-override`: 405; eliminar secreto literal y no mantener fallback ADMIN_SECRET. Revisar código functions legado y rutas del bundle para impedir una segunda vía de escritura. Esta corrección es requisito P0 antes de habilitar admin; no presupone exposición actual de producción.

## 6. Persistencia temporal, API y reportes

### 6.1 Migraciones D1

Crear migraciones versionadas en `migrations/` compatibles con DB vacía y DB existente. Preflight inspecciona tablas/columnas y ledger; importar baseline de `scripts/schema.sql` sin recrear ni borrar datos. Probar ambas rutas con datos fixture. Extender clinic_overrides con revision entero creciente, schedule_json nullable, expires_at UTC nullable durante migración, updated_by subject, request_id, active boolean. Conservar columnas actuales para lectura compatible. Filas heredadas sin expiración quedan inactivas y en bandeja, no se activan silenciosamente. Nuevas alertas requieren expiry > now y <= now+7d; renovación explícita con nueva revisión.

`override_audit`: event_id UUID PK, clinic_slug, revision, actor_sub, request_id único, before_json, after_json, created_at UTC; unique(clinic_slug, revision). Idempotency/request table para mutaciones: clave (subject,key), hash del payload, resultado, created_at, estado; reutilizar clave con otro payload ⇒409. Retener claves 7 días. Rate buckets por subject/minuto con incremento atómico, purga programada. `reports`: añadir status (new/reviewed/resolved), revision, reviewed_by, reviewed_at y resolution_note; preserva descripción y fecha originales. Índices por slug/expiry, report status/created_at e idempotency time.

Escritura override es compare-and-swap por revision, auditoría y respuesta idempotente en una transacción D1 batch [F3]. Implementación recomendada: update/insert condicionado a revisión esperada con event_id único; trigger SQL AFTER INSERT/UPDATE escribe audit desde OLD/NEW y requestId, de modo que conflicto de auditoría revierte escritura. Guardar resultado idempotente en el mismo batch condicionado al evento efectivamente creado. Verificar rows changed: revisión incorrecta devuelve 409 y no genera audit ni éxito. Para creación expectedRevision=0; para borrado usar tombstone active=false con nueva revisión y auditoría. No borrar fila y reiniciar contador. Fixtures concurrentes deben demostrar exactamente un ganador y ninguna auditoría huérfana. Nunca encadenar BEGIN/COMMIT manuales entre llamadas HTTP.

Lecturas en vivo usan D1 primaria o session first-primary; no habilitar replicación sin consistencia explícita [F7]. Lectura fallida no equivale a ausencia de override. Fechas siempre UTC, sin datetime localtime nuevo. Política propuesta: auditoría 365 días; reportes y contactos privados 90 días tras resolución; actor y logs restringidos, sin IP/token en logs de admin; purga operativa comprobable. Contrato de retención implementado en tarea de operación.

### 6.2 Endpoints

Todas las rutas siguientes son futuras salvo el GET legado. Respuestas JSON; listas {items,nextCursor}; cursores opacos validados; orden estable con desempate slug/id; limit 1..100, default 25. Auth antes de consultar GitHub/D1.

| Ruta | Entrada / respuesta / errores específicos |
| --- | --- |
| GET /api/admin/clinics | q máximo 100, provincia, issue, cursor; catálogo base del build + estado D1; baseCommit y sourceHash por ficha; conteos calculados |
| GET /api/admin/clinics/:slug | ficha editable completa y evidencia desde GitHub ref permitido, blobSha/baseCommit; overrideRevision; 404 si falta |
| PUT /api/admin/overrides/:slug | {expectedRevision,temporarilyClosed,message,schedule,expiresAt}; Idempotency-Key UUID; devuelve revision/expiresAt; 409 conflicto |
| DELETE /api/admin/overrides/:slug | {expectedRevision}; tombstone idempotente auditado |
| POST /api/admin/clinic-proposals | {slug,newClinic,baseCommit,blobSha,clinic,evidence}; clave idempotente; 202 {operationId,prUrl,status} o 409 |
| GET /api/admin/operations/:id | estado de propuesta y enlace PR; solo allowlist; no reportar deployed sin comprobación |
| GET /api/admin/reports | filtros status/slug/cursor; contactos solo aquí, nunca API pública |
| PATCH /api/admin/reports/:id | {expectedRevision,status,resolutionNote}; actor/fecha y auditoría, 409 si concurrente |
| GET /api/status-override?slug=... | compatibilidad: {success,override,checkedAt}; override=null solo en lectura exitosa sin activo; errores 503 |
| GET /api/clinic-overrides | lista completa de overrides públicos activos + checkedAt, acotada al catálogo conocido; sin contactos/actores/evidencia privada |

Para overrides: slug solo existente en catálogo publicado, mensaje texto máximo 500, cierre boolean estricto, schedule validado, expiresAt obligatorio. Reapertura nunca fuerza OPEN: quitar cierre deja que schedule determine estado. El cierre tiene precedencia sobre horario temporal y base; mensaje solo no cambia apertura. DELETE de inexistente revision=0 no crea estado nuevo; reintentos con misma key recuperan resultado.

Reportes públicos: asegurar inserción real antes de marcar db_saved; DB ausente/fallida ⇒503 y no éxito ficticio, aunque email pudiera estar disponible. No modificar el envío existente más allá de reflejar estado veraz y probar con stub, nunca enviar email en tests. Validar slug contra catálogo, tamaños y contenido; límite existente revisado atómicamente. E2E inserta reporte fixture y verifica bandeja privada y resolución. No automatizar contacto con quien reporta.

## 7. Proyección pública y editor

### 7.1 Estado público

Un solo módulo de cliente consume schedule_v1 y overrides para tarjetas, detalle, mapa y filtros de portada/provincia/zona. Snapshot batch al cargar y cada 30s mientras visible; refrescar al volver al foco; evaluar minuto y expiración localmente. HTTP no-store, sin caché CDN de respuestas vivas. Aplicar cierre > horario temporal > horario base; override expirado/inactivo no aplica. Versiones más antiguas nunca pisan una más nueva. El SDD reemplaza la promesa previa de 1s por objetivo medible: siguiente fetch exitoso refleja revisión; en E2E tras guardar, recarga obtiene revisión exacta; página visible converge en <=35s con API <5s. No prometer SLA global sin medir.

Antes de primer fetch, tras error o snapshot >60s: datos de contacto/horario base siguen disponibles, pero estado operativo vivo es UNCONFIRMED con "No se pudo confirmar la disponibilidad; llama antes de ir"; un cierre conocido no se presenta como abierto por fallo de red. JavaScript deshabilitado muestra horario base con advertencia estática, sin badge de apertura viva. Cancelar fetch tras 5s. Ningún fallo de D1 debe impedir acceder a dirección/teléfono.

Filtro Abierto ahora muestra OPEN primero y bloque secundario claramente separado de UNCONFIRMED que respeta búsqueda/zona/especies; CLOSED queda fuera. Emergencias 24/7 exige flags y evidencia coherentes, sin cierre activo ni estado vivo desconocido. Contadores/mapa usan la misma colección filtrada; unknown no cuenta como abierto. No duplicar tarjetas para simular dos estados. Tests de tiempo congelado cubren almuerzo, cambio de día, expiración y recuperación de red.

Catálogo/Markdown estáticos para agentes y JSON-LD permanecen horarios base, no snapshots D1; añadir campo/documentación inequívoca de que no son disponibilidad en vivo y URL del endpoint público. No incluir override volátil en metadescripción o FAQ. No alterar el alcance por especie existente, body de fichas ni relaciones de blog. Tests existentes y nuevos de proyección verifican preservación. Los bots y usuarios sin JS reciben la limitación claramente.

### 7.2 Panel

Catálogo busca nombre/slug/zona normalizados sin tildes; filtros provincia, estado editorial, problema de horario, verificación pendiente, alertas activas y reportes pendientes. Problemas calculados desde validador común, con explicación/campo/fuente; no etiqueta "roto" para unknown deliberado. Paginación mantiene filtros y foco. Estados loading/empty/error/retry sin perder cambios.

Editor: identidad y contacto; horario por siete días con estados abierto/cerrado/por confirmar/cita, múltiples intervalos, descanso de almuerzo, checkbox 24h por día y copiar a días elegidos con confirmación de reemplazo; excepciones fechadas. Sliders complementados por input hora y teclado, minutos exactos sin redondear a media hora. Preview de texto, estado a hora elegida Costa Rica y errores por campo; no regex visible. Evidencia requerida para afirmaciones verificadas. Separar botones "Guardar alerta temporal" y "Proponer cambio permanente"; mostrar expiración o PR pendiente con claridad. Conflicto 409 muestra diff y obliga a recargar/reaplicar, nunca overwrite silencioso.

Mapa con pin arrastrable y entradas lat/lng accesibles; geocodificación es sugerencia que requiere validación de sucursal; no inventa address_verified. Generar enlaces HTTPS Maps/Waze con coordenadas confirmadas y botones para abrirlos manualmente. Validar protocolo, host permitido exacto y coordenadas decodificadas; rechazar javascript:, host engañoso y redirección abierta. No fetch server-side de URLs arbitrarias (SSRF); enlaces abreviados existentes se marcan para revisión o resuelven con herramienta restringida a hosts públicos permitidos y máximo 3 saltos. Leaflet no recibe contenido restringido de Places. En CI mapas/tiles van con stubs locales, y una comprobación visual/manual de destino real queda en runbook de ficha.

Diseño móvil >=360px, navegación por teclado, labels, errores enlazados, foco al primer error, aria-live de guardado, contraste legible y estado expresado con texto además de color. Advertir cambios sin guardar. Botón nueva clínica crea borrador con UUID, slug único y ficha/evidencia completas antes de permitir propuesta publicable; no crea ruta pública antes del merge/build.

## 8. Edición permanente y sincronización

GitHub App instalada únicamente en este repo con Contents read/write y Pull requests read/write; secretos solo en Worker; sin permiso Workflows. Leer archivo y sidecar desde ref main permitida, no rutas/ref arbitrarias del navegador. Construir `src/content/clinicas/<slug>.md` desde slug validado [a-z0-9-], preservar body y campos ajenos reconocidos. Nuevo campo desconocido requiere actualizar schema, no descartarlo. Editor v1 no acepta HTML/Markdown libre nuevo: preserva body existente en servidor; previsualización escapada.

Guardar con baseCommit/blobSha que leyó el usuario; comparar con main actual; cambio concurrente del archivo/evidencia ⇒409. Serialización YAML segura; validar candidato **con colección completa de esa base**, evidencia y duplicados, no solo catálogo viejo del build. Generar rama `admin/clinic-<operationId>` desde main y commit atómico de ficha + evidencia usando Git Data API; actualizar referencia sin force; abrir PR con diff/resumen/validaciones. Dos nuevas altas con mismo slug en ramas separadas pueden pasar inicialmente: CI del merge debe reevaluar main actualizado; no auto-merge. No modificar workflows/scripts mediante este endpoint.

Persistir `clinic_proposals` en D1: operationId, subject, idempotencyKey único por subject, payloadHash, baseCommit, expectedBlobSha, branch, commitSha, prNumber, status, timestamps, lastErrorCode. Estados pending → branch_created → committed → pr_open; failed/retryable y merged/deployed observados por consulta autenticada a GitHub y manifest de build. Como D1/GitHub no comparten transacción, reanudar por operationId/rama fija y buscar PR existente antes de crear. Reintento de respuesta perdida devuelve misma propuesta; nunca doble PR/commit. Cada etapa persistida y auditable; cron/reconciliación detecta operaciones abandonadas >15min y no las publica. Timeout 10s por llamada externa, máximo 3 reintentos transitorios con backoff acotado fuera de una solicitud larga; respetar rate limit. No repetir mutación incierta sin reconciliar.

UI muestra "PR creado, pendiente de revisión"; solo merge aprobado por proceso del repo + CI + build cambia base pública. No afirmar despliegue solo por merge: generar `build-info.json` con SHA y comprobarlo. Overrides permanecen independientes y caducan; no se eliminan por ver un merge. Cuando el cambio permanente absorbe alerta, operador la retira explícitamente con revision correcta después de comprobar build. Rollback permanente mediante PR revert, temporal mediante nueva revisión o desactivación; historial intacto.

Si GitHub falla, formulario conserva datos y permite descargar candidato validado + evidencia para proceso manual. Sin credenciales/configuración mostrar funcionalidad no disponible, no éxito simulado. Fallo de D1 en propuestas impide iniciar mutación externa sin registro durable.

## 9. Verificación, despliegue y operación

CI actual usa Node 24, build:no-shorten, verificador Markdown, types:worker, check, npm test, deploy:dry-run y Playwright. Conservar todos; no correr acortador externo para verificar. Añadir validate:clinics a npm scripts y npm test de contratos; tests no dependen de contar exactamente 21 o 112. Separar checks paralelos solo después de identificar dependencias de artefactos de build. E2E consume build de la misma revisión, D1 local y el handler Workers real; mocks únicamente para proveedores externos, sin simular autorización o persistencia que se pretende verificar. No probar admin solo con astro dev.

| Suite | Casos de aceptación mínimos |
| --- | --- |
| Motor | todos los días, ausentes unknown, hora inválida, segmentos residuales, 12md, almuerzo, overnight viernes/sábado y domingo/lunes, 24h, excepciones, TZ UTC/Madrid/Los Angeles con mismo instante, cambio DST del host |
| Datos/skill | YAML duplicado/BOM, id/slug, geografía, unknown explícito, flags 24h contradictorios, evidencia inaccesible, no escritura en fallo, deuda exacta/vencida |
| Auth/routing | anónimo, JWT forjado/caducado/aud errónea, subject no autorizado, host alternativo, assets directos, API sin slash POST, CSRF, métodos/límite body, secreto heredado rechazado |
| D1 | esquema nuevo/existente, migración repetida por ledger, CAS concurrente, rollback audit, idempotency payload distinto, expiración/revocación, rate limit y fallos DB |
| GitHub | blob desactualizado, mismo slug concurrente, API caída y 429, fallo tras commit y tras PR con reintento sin duplicación, main cambiante, sin credenciales |
| UI/público | teclado/móvil, edición completa/nueva ficha, reportes, XSS como texto, filtros/mapa/detalle coherentes, no JS, D1 caído, reconexión, override expirado y reapertura |
| Regresión | SEO/base hours/FAQ sin disponibilidad inventada, mirrors Markdown y catálogo, relaciones blog y especies, headers y sitemap sin admin |

Gate previo a producción (parte de implementación futura): inventario de despliegue real/hosts; comprobar Access/AUD/allowlist; bindings reales y esquema; export/backup D1 y ensayo de restauración en staging; migrar aditivamente; desplegar compatibilidad con admin deshabilitado; smoke JWT/CSRF/POST legado sobre bundle y staging; habilitar admin; probar alerta fixture, retiro y propuesta PR sin merge automático. No hacer estas mutaciones remotas en la entrega SDD/issues.

Rollback: deshabilitar admin y retirar acceso; mantener lector compatible con columnas aditivas; revertir aplicación a versión segura que **no** restaure escritura por secreto literal; no down-migration destructiva ni restauración completa que pierda reportes sin revisión. Monitorizar 401/403/409/5xx por ruta, latencia, fallos de fetch público, antigüedad de propuestas y expiraciones, sin payloads privados. Alerta operativa si 5xx>5% durante 5min con >=20 peticiones o propuestas pending>15min; destino lo configura operador. Runbook de backups, purga/retención, renovación Access, revocación, GitHub App, recuperación de propuesta y reconciliación del build. Los objetivos son criterios de staging, no garantías actuales de coste o latencia.

## 10. Plan de issues y trazabilidad

No crear issues antes de veredicto APROBADO del SDD exacto. Cada issue incluye versión/hash del SDD, problema, archivos orientativos, tareas, criterios, tests, prioridad, dependencias y exclusiones. Usar etiquetas existentes o crear admin/data-integrity/security/skill/ci y prioridades sin borrar etiquetas. Las dependencias se convertirán en números/enlaces reales tras creación. Orden propuesto:

| Clave | Título semántico | Prioridad | Depende de | Requisitos |
| --- | --- | --- | --- | --- |
| I01 | fix(schedule): modelo semanal y evaluación conservadora | P0 | — | R02 |
| I02 | feat(skill): validar fichas y empaquetar investigar-veterinaria | P1 | I01 | R01,R03 |
| I03 | fix(schedule): sanear legado y cerrar deuda de fichas | P1 | I02 | R01,R02,R03 |
| I04 | feat(admin): proteger runtime Workers con Cloudflare Access | P0 | — | R09,R12 |
| I05 | feat(admin): migraciones D1, auditoría y overrides concurrentes | P0 | I01,I04 | R06,R09 |
| I06 | fix(schedule): unificar estado público y alertas temporales | P0 | I01,I05 | R07,R12 |
| I07 | feat(admin): persistir y gestionar reportes privados | P1 | I04,I05 | R04,R09 |
| I08 | feat(admin): propuestas Markdown mediante GitHub App y PR | P1 | I02,I04,I05 | R08,R09 |
| I09 | feat(admin): catálogo y editor visual de fichas | P1 | I02,I05,I07,I08 | R04,R05,R08 |
| I10 | ci: verificar contratos, Workers y flujos administrativos | P0 | I02,I04,I05,I06,I07,I08,I09 | R10,R12 |
| I11 | feat(admin): preflight, operación, rollout y reversión | P1 | I03,I10 | R11 |

Cada tarea implementa sus tests propios; I10 integra gates y E2E, no pospone toda validación al final. I03 puede avanzar durante desarrollo, pero I11 exige deuda cerrada. I04 incluye retirada del endpoint inseguro heredado; I05 no se habilita antes de I04. I06 integra todas las superficies públicas; I09 depende de APIs listas. I11 incluye instrumentación y purga de retención con pruebas.

Auditoría independiente del SDD: Luna medium, revisar base, decisiones, seguridad, completitud y viabilidad; guardar informe con SHA256 exacto y hallazgos cerrados. Tras APROBADO, otro Luna medium crea issues reales. Tercer Luna medium lee cada issue remoto, comprueba cobertura R01–R12, criterios y grafo acíclico; correcciones y nueva auditoría hasta APROBADO. Aprobación documental no significa producto implementado. Guardar informes en `docs/auditorias/admin/` y mapa de enlaces en `docs/issues-panel-admin-y-skill.md`. No cambiar el SDD aprobado sin volver a auditar.

## 11. Fuentes consultadas

Documentación oficial consultada durante esta elaboración (2026-09-15 local); decisiones específicas del producto se distinguen de capacidades de plataforma:

- F1: [Cloudflare Workers: worker-first y assets](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/). Fundamenta ejecución antes de assets protegidos.
- F2: [Cloudflare Access: validar JWT](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/). Fundamenta validar firma y claims en origen.
- F3: [D1 Database API: batch](https://developers.cloudflare.com/d1/worker-api/d1-database/). Fundamenta transacción/rollback de batch, no transacción distribuida con GitHub.
- F4: [Workers KV: consistencia](https://developers.cloudflare.com/kv/concepts/how-kv-works/). Fundamenta no usar KV para revocación inmediata ni CAS.
- F5: [Places API: políticas](https://developers.google.com/maps/documentation/places/web-service/policies) y [place IDs](https://developers.google.com/maps/documentation/places/web-service/place-id). Fundamentan restricciones y tratamiento separado de place_id.
- F6: [Astro: renderizado bajo demanda](https://docs.astro.build/en/guides/on-demand-rendering/). Fundamenta rutas dinámicas dentro de salida estática con adaptador.
- F7: [D1: read replication](https://developers.cloudflare.com/d1/best-practices/read-replication/). Fundamenta consistencia explícita al leer overrides.
- F8: [Workers: Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/) y [D1: migraciones](https://developers.cloudflare.com/d1/reference/migrations/). Fundamentan el consumidor programado y el ledger de migración.

Los tres documentos iniciales y la skill personal informan requisitos, pero sus promesas de coste cero, invulnerabilidad, tiempos de 1s y diagnóstico histórico no se trasladan como hechos comprobados. No se inspeccionó ni modificó D1, Access o despliegue remoto durante esta especificación.

## 12. Contratos precisados tras auditoría r1

Esta sección es normativa y concreta las secciones anteriores; corrige A-01–A-08 de `docs/auditorias/admin/sdd-r1.md`. Sus criterios se incorporan a los issues indicados, sin añadir un paso de implementación a esta entrega documental.

### 12.1 Ruta heredada y secuencia de auth (A-01, A-07; I04/I05/I10)

Única implementación del GET de compatibilidad: `src/pages/api/status-override.ts`, con prerender=false. I04 crea temporalmente GET→503 `{success:false,error:"LIVE_NOT_READY"}` y todos los métodos de escritura→405 Allow: GET, HEAD; I05 implementa lectura real. HEAD tiene mismo status/headers de GET y cuerpo vacío; OPTIONS→405 sin CORS. Error de parámetros→400; slug no perteneciente al catálogo→404. Eliminar `functions/api/status-override.js` al hacer I04, mantener únicamente una referencia histórica en documentación; no desplegar functions/ a Pages. El pipeline soportado es exclusivamente el Worker del adapter. Test del bundle busca el literal del secreto inseguro y falla si aparece; requests POST con/sin secreto devuelven 405 y no cambian DB. La prueba incluye `/api/status-override` y variante con slash, además de las rutas antiguas identificadas en preflight.

Secuencia: Access en el edge autentica según política UI/API → Worker comprueba host y familia protegida → helper valida JWT/allowlist → handler Astro/middleware reutiliza identidad validada por request sin volver a inferirla de headers → endpoint. Access puede interceptar antes de Worker; la siguiente matriz es el contrato **del origen**, ensayado con llamada directa local/staging; login redirect del edge se prueba separadamente en staging. El Worker nunca redirige a login ni confía en Accept como autorización.

| Familia/condición | GET/HEAD | Mutación | OPTIONS |
| --- | --- | --- | --- |
| admin o api/admin, host fuera de allowlist | 403 | 403 | 403 |
| host permitido, configuración incompleta | 503 | 503 | 503 |
| configuración válida, JWT ausente/inválido | 401 | 401 | 401 |
| JWT válido, subject no permitido | 403 | 403 | 403 |
| identidad autorizada, método admitido | respuesta del recurso | comprobar Origin/header/CSRF; luego recurso | 405 |
| identidad autorizada, método no admitido | 405 si no aplica | 405 | 405 |

Todas las respuestas protegidas llevan private,no-store y noindex,nofollow; HEAD nunca cuerpo. UI GET/HEAD 401 muestra texto estático de acceso denegado sin datos; API 401 JSON; cualquier escritura 401 JSON. Assets que por accidente queden bajo admin también pasan la misma frontera; autorizados reciben archivo o 404, nunca bypass. Rutas se normalizan una vez y se rechazan codificaciones ambiguas/separadores codificados; variantes admin, admin/, admin/index.html, API con slash y mayúsculas no deben revelar recurso protegido (ruta inexistente puede 404). Auth antes de canonicalización; rutas API no reciben 301/302. En el edge Access, navegación anónima al admin inicia login del proveedor; API frontend trata redirect/HTML inesperado como sesión vencida, no como JSON exitoso. La política cubre ambos prefijos y se prueba con fetch antes de habilitar.

### 12.2 Consumidor durable de propuestas (A-02; I08/I11)

Elegir **outbox D1 + Cron Trigger cada minuto**, sin Queue/Workflow adicional. Añadir `[triggers] crons = ["* * * * *"]` al wrangler de producción y `scheduled(controller,env,ctx)` en src/worker.ts que llama `src/lib/admin/proposal-runner.ts`; conservar fetch oficial. El endpoint POST valida/persiste payload canónico completo (ficha, evidencia, hashes de base, autor) en clinic_proposals y responde 202 de inmediato con prUrl:null; jamás depende de una promesa en background de la petición. El cron avanza la máquina y el GET operations devuelve el enlace cuando exista. DB fallida antes de outbox→503 y cero llamadas de escritura GitHub.

Añadir payload_json, next_attempt_at, attempts, lease_owner, lease_until, state_version y error_code a clinic_proposals. Claim atómico por CAS de state_version y lease vencida; lease 120s con propietario aleatorio. Procesar máximo 5 propuestas por tick y una sola etapa por propuesta, con máximo 3 llamadas GitHub por etapa, timeout 10s por llamada. Persistir avance solo si lease/versión siguen propias; no usar waitUntil como único almacenamiento. Etapas de blobs/tree pueden tener subestado y hashes guardados; la siguiente invocación retoma desde él. Todo payload saliente se deriva del registro durable validado.

Antes de crear cada efecto buscar rama/commit/PR de operationId. Commit usa parent y contenido fijos y fecha/autor guardados para SHA determinista; ref update sin force y PR lookup por head/base. Lease perdida ⇒ reconciliar antes de repetir; el duplicado de evento cron no duplica propuesta. Error transitorio programa 1,2,4 minutos (+0..15s jitter); hasta 3 reintentos por etapa, luego failed y aviso. 429 usa Retry-After si mayor y no bloquea cron. Error permanente→failed; operador puede reanudar mediante POST `/api/admin/operations/:id/retry` con Idempotency-Key y motivo, guardia completa y auditoría; la operación conserva ID/rama y reconcilia antes de mutar. Sin retry automático tras error de validación/conflicto de base.

Cron también detecta pending sin avance >15min y emite señal operativa; no publica ni fusiona nada. Probar muerte del proceso después de cada efecto externo y antes de persistir estado, doble tick, lease vencida y reanudación del mismo ID. Desactivar cron no pierde cola; al reactivar retoma. I11 prueba handler scheduled del **bundle** y alerta; no basta con unit test del runner. La captura/configuración de triggers en staging forma parte del preflight.

### 12.3 Idempotencia uniforme (A-03; I05/I07/I08/I10)

Todas las mutaciones administrativas, incluidos DELETE overrides, PATCH reports y retry operation, exigen header `Idempotency-Key` UUID v4 o v7 canónico minúsculo; falta/formato inválido→400. Clave lógica `(subject,key)`; hash SHA256 de método + pathname canónico + JSON con claves ordenadas recursivamente (arrays conservan orden), incluyendo expectedRevision. Mismo key con distinto hash→409 `IDEMPOTENCY_CONFLICT`. Registrar resultado de éxito y auditoría atómicamente con cambio D1; reintento de éxito devuelve mismo status y body, header `Idempotency-Replayed: true`, sin segunda revisión/evento.

Operaciones D1 síncronas no dejan pending durable: reserva, CAS, auditoría y respuesta se confirman en mismo batch, cualquier fallo rollback. Para CAS sin ganador, registrar o devolver 409 de forma determinista sin fila de éxito; siguiente intento válido usa nueva clave/revisión. Dos peticiones simultáneas con misma clave: una gana unique(subject,key), la otra relee resultado; si aún no visible devuelve 409 `REQUEST_IN_PROGRESS` con Retry-After:1 sin ejecutar cambio. Propuestas asíncronas sí tienen pending: repetición devuelve 202 con el mismo operationId y status actual, incluso si prUrl aún null. Claves y respuestas conservadas 7 días; propuestas conservan operación/rama y audit durante 365 días, por lo que una clave reutilizada tras ventana no autoriza sobrescribir otra operación ni elimina historial. Cliente genera clave nueva solo para intención nueva, no al reintentar timeout.

### 12.4 Baseline y migraciones reproducibles (A-04; I05/I10/I11)

Ledger nativo `d1_migrations` gestionado por Wrangler; nombres inmutables y hash SHA256 de cada SQL en manifest versionado, verificado por script `scripts/admin/db-preflight.mjs`. No marcar migración como aplicada manualmente para ocultar schema divergente.

| Migración | DB vacía | DB con scripts/schema.sql | Salida |
| --- | --- | --- | --- |
| 0001_baseline.sql | crea las tres tablas legacy | CREATE TABLE IF NOT EXISTS, antes verificar firma exacta columnas/tipos/PK | baseline y ledger 0001 |
| 0002_admin.sql | añade columnas/tablas/índices/triggers | mismo SQL aditivo | esquema admin, overrides viejos inactivos |
| 0003_proposals.sql | crea outbox y sus índices | igual | máquina durable de propuestas |

Preflight compara PRAGMA table_info, índices, triggers y ledger con firmas permitidas: vacía; legacy exacta sin ledger; 0001; 0002; 0003. Cualquier estado parcial/desconocido bloquea con diff y requiere reparación revisada, no reejecuta ALTER a ciegas. Cada archivo se aplica mediante migrations apply; reejecución omite ledger aplicado. Ensayar fallo dentro de 0002: verificar rollback de ese archivo o detección de firma parcial y **bloqueo**; recuperación restaura snapshot local de ensayo o aplica reparación explícita, nunca datos inventados. El runbook exige backup antes de primera migración remota.

Backfill: overrides legacy revision=0, active=0, expires_at=null, actor=null; request_id=null solo para importación; copia de updated_at original en legacy_updated_at. No atribuir autor o evidencia retrospectiva. Conservar textos en bandeja privada, pero GET público devuelve override=null hasta nueva revisión explícita. reports legacy status=new, revision=0, revisor/nota null. No interpretar datetime localtime sin comprobar zona real del runtime que lo escribió: conservar valor original y añadir timestamp_quality=unknown para legacy, created_at_utc nullable; si hay evidencia de zona UTC o Costa Rica, migración de reparación separada documenta conversión. Lectura/retención usa migrated_at UTC como ancla conservadora cuando fecha histórica es desconocida; no purga prematuramente. Escrituras nuevas usan UTC inequívoco y timestamp_quality=confirmed. Después de activar override, GET expone updated_at UTC y revision junto a columnas compatibles; schedule_text se deriva del JSON nuevo.

### 12.5 Matriz de adquisición y fallback (A-05; I02/I03)

| Fuente | Método admitido en v1 | Persistencia | Bloqueo/fallback |
| --- | --- | --- | --- |
| Maps/Search públicos | consulta interactiva en navegador/herramienta autorizada, sin login, sin scraping masivo ni evadir CAPTCHA | URL y fecha; place_id si disponible; hechos solo tras respaldo independiente autorizado | registrar acceso no disponible; seguir sitio oficial/institucional |
| Places API | integración opcional solo tras configurar permisos/cuota/atribución y política de datos; deshabilitada por defecto | place_id; no cachear payload ni exportar horarios/coordenadas de API a Markdown/Leaflet en v1 | cuota/error→sin datos, no fabricar ni reintentar en bucle |
| Sitio oficial/institución | páginas públicas mediante navegador o cliente permitido; respetar restricciones de acceso | URL, fecha y hechos resumidos atribuidos por campo, sin copias extensas | contradicción→REVIEW_REQUIRED |
| Redes/snippets | información públicamente accesible sin sesión como pista | URL/fecha y anotación de incertidumbre; no base única de VERIFIED | muro/login→anotar inaccesible |
| Confirmación directa aportada | revisión de evidencia por operador, no llamadas automáticas | fecha/método/campos, sin identidad privada ni transcripción | falta confirmación Tier A→no afirmar presencial 24/7 |

URLs/place_id se conservan mientras exista ficha y su historial de evidencia; revisión de enlaces al actualizar. Evidencia de hechos propios/autorizados se versiona con ficha y atribución URL por campo; un operador debe retirar material cuya licencia no permita conservarlo. No se guardan capturas/payloads Google. Si falta respaldo independiente, campos operativos quedan unknown/pendiente y el candidato no se transforma en ficha VERIFIED. No es obligatorio conseguir datos de Google ni pagar API para completar el flujo. Aceptación: caso Maps inaccesible + sitio oficial accesible produce evidencia oficial válida; todas las fuentes inaccesibles produce reporte de limitación sin alta ficticia. CI usa fixtures sintéticos.

### 12.6 Harness Workers/D1 de CI (A-06; I10)

Crear `scripts/admin/e2e-harness.mjs`, `playwright.admin.config.ts` y scripts npm `test:admin:prepare`, `test:admin:serve`, `test:admin:e2e`. Secuencia futura del job Node24: npm ci → build:no-shorten → test:admin:prepare → test:admin:e2e. Prepare lee `.wrangler/deploy/config.json` y el config generado del adapter (actualmente dist/server/wrangler.json), nunca inventa entrypoint. Produce `.tmp/admin-e2e/<runId>/wrangler.json` con main/assets absolutos apuntando al mismo bundle, DB local con migrations_dir absoluto, SESSION local, secrets ficticios y puertos 8788 Worker/8789 proveedor fixture. Prohíbe remote:true, IDs remotos, credentials de producción y envío EMAIL real. Artefactos temporales ignorados por Git y aislados por job.

Aplicar `npx --no-install wrangler d1 migrations apply DB --local --config <config-test> --persist-to <state-run>` y fixture SQL mediante d1 execute DB --local --file <fixture> con el mismo config/persist-to. Arrancar `npx --no-install wrangler dev --local --config <config-test> --persist-to <state-run> --port 8788 --test-scheduled`. Playwright admin baseURL http://127.0.0.1:8788, reuseExistingServer=false, workers=1 para estado mutable; fixture seed por test o slugs/subjects únicos. Harness captura PID/log y cierra procesos en finally; solo borra temporal cuyo path resuelto esté dentro de .tmp/admin-e2e. Preparar DB nueva y legacy en directorios separados y aplicar misma suite de migración.

Servidor fixture proveedor en 8789 sirve JWKS con claves efímeras RS256 y GitHub fake con estados/fallos controlables. Módulo de auth usa la misma verificación de firma/claims/allowlist que producción; solo endpoint confiable de configuración cambia. URLs no HTTPS de fixture se permiten exclusivamente por configuración local construida por harness y no exportable al deploy; CI del artefacto de producción prohíbe esos valores. El token firmado fixture válido entra por header real; pruebas negativas firman con otra clave, aud/exp/sub distintos. No helper `isAdmin=true`, no mock de DB. Fixture de GitHub captura intentos y permite matar Worker tras efecto; cron se dispara por interfaz de test local de Wrangler, no endpoint admin de producción.

Prueba de integridad del harness: manifiesto con hash del bundle y config; comprobar proceso/comando wrangler y que DB persiste tras reiniciar servidor; escribir override autenticado, reiniciar Worker, releer revisión y audit vía DB local. Fallar si servidor es astro dev/preview, si solo está un mock HTTP o si no existe migración aplicada. Los tests de firma inválida y CAS real deben fallar al mutar/eliminar sus guardias; añadir prueba de mutación focalizada de estos dos controles en I10. E2E públicos existentes se conservan; admin es suite adicional contra Workers. Los comandos exactos se validarán con la versión Wrangler del lockfile durante implementación, sin sustituir test por un dry-run de deploy.

### 12.7 Deuda versionada y cambios concurrentes (A-08; I02/I03/I10)

`docs/admin/data-debt.json` estricto: `{schemaVersion:1, baselineCommit:string, generatedAt:ISO_UTC, entries:[{slug,ruleId,recordSha256,reason,owner,createdAt,expiresAt,reviewRef}]}`. entries ordenadas por slug+ruleId, combinación única; owner identidad GitHub no vacía y reviewRef URL de PR/issue de revisión. recordSha256 = SHA256 de bytes UTF-8 exactos del Markdown con saltos normalizados LF **sin** eliminar BOM, espacios o claves; por tanto cualquier cambio exige revalidación y no permite usar vieja exención. max 30 días, expiresAt no prorrogable respecto a createdAt original; ausencia/duplicado/cambio de hash/vencimiento falla.

Generar baseline una sola vez en I02 desde catálogo real, con reporte de reglas e investigación pendiente; I03 retira entradas al corregir. CI compara contra merge-base de main (checkout fetch-depth:0 y ref base explícita): nuevas entradas, cambios de hash, prórrogas o cambio de regla en una exención existente fallan automáticamente; solo eliminación es normal. Bootstrap inicial tiene tarea/PR dedicada con inventario completo revisado y aceptación manual del mantenedor en revisión de código; workflow no confía en un label colocado por autor ni contiene flag general para saltar integridad. Si una ficha cambia concurrentemente se invalida hash y se exige resolver la regla, no actualizar hash para perpetuar deuda. Fixtures: exacta pasa solo para archivo intacto; ampliación/hash cambiado/vencida fallan; resolver unknown explícito con evidencia y retirar deuda pasa. El objetivo de I03 es entries vacío y validador total limpio; no obliga a inventar horarios cuando no hay fuentes.

### 12.8 Retiro integral de Pages Functions (A-09; I04/I07/I10/I11)

Inventario actual completo de handlers `functions/` y destino obligatorio en I04:

| Archivo legacy que se elimina | Destino único en Workers | Comportamiento durante transición |
| --- | --- | --- |
| functions/api/status-override.js | src/pages/api/status-override.ts | GET/HEAD 503 hasta I05; escrituras/OPTIONS 405 (§12.1) |
| functions/api/cron-check-links.js | src/pages/api/cron-check-links.ts, tombstone prerender=false | todos los métodos 410, sin leer ni escribir D1 ni solicitar URLs; HEAD sin cuerpo |
| functions/api/report-incorrect.js | src/pages/api/report-incorrect/index.ts ya existente | conservar único POST Astro, endurecido por I07; no dos implementaciones |
| functions/api/analytics.js | src/pages/api/analytics.ts, tombstone prerender=false | todos los métodos 410 y sin escritura; cliente ignora de forma silenciosa el retiro de telemetría opcional |

No migrar el robot de links como autor de cierres: una URL caída no prueba cierre físico de clínica. Su funcionalidad de comprobación queda limitada a revisión manual de enlaces del editor, sin modificar overrides automáticamente. El Cron de propuestas de §12.2 es distinto y no recupera esa lógica. Analytics queda deshabilitado en esta versión; no afecta búsqueda/filtros ni envía payloads a otro proveedor. I04 ajusta el cliente para no solicitar el endpoint retirado; pruebas garantizan que buscar/filtrar funciona sin telemetría. Conserva registros históricos D1, sin DROP ni borrado.

Gate `scripts/admin/check-runtime-boundary.mjs`: falla si existe cualquier handler ejecutable bajo functions/ (incluidos archivos nuevos no inventariados), si código de runtime contiene ADMIN_SECRET como autoridad o literal de respaldo, si workflow/script de despliegue usa Pages/Functions, o si config/artefacto agrega otra ruta de escritura legacy. Documentación y fixtures de rechazo pueden citar el secreto, nunca bundles de producto. Inventariar dinámicamente todos los archivos y rutas, compararlos con el manifiesto permitido; no limitar la prueba a estos cuatro nombres. I10 ejecuta gate de fuente y de bundle generado, más requests directos a todos los tombstones y legacy (GET/HEAD/POST/OPTIONS con y sin antiguo bearer) y compara tablas antes/después para demostrar cero efectos.

I11 preflight inventaría además deployments/hosts remotos anteriores: cualquier Pages todavía sirviendo estos handlers debe deshabilitar esas rutas o retirarse antes de habilitar admin en producción. No se da por retirado por borrar un archivo local; registrar URL/estado de smoke remoto y que ninguna ruta alternativa acepta escritura. Si se descubre otro handler/configuración, bloquear rollout y actualizar inventario/destino y pruebas, sin desplegar de forma parcial. Esta verificación y eventual retiro son tareas futuras de implementación; la entrega documental no toca despliegues existentes.
