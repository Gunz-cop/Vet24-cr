# Auditoría independiente SDD panel administrativo y skill

Fecha: 2026-09-16 (Costa Rica)  
Auditoría: Luna, esfuerzo medium, revisión adversarial independiente  
Veredicto: **RECHAZADO**

## Identidad de la revisión

SDD revisado: `docs/sdd-panel-admin-y-skill.md`  
SHA256 exacto: `336108F11400FE22921F1B3FB046A0E431077947BAC61E1FB2DD4473C3328333`  
Base declarada: HEAD `3d03ecc0da65f2127a66b7935baa39e1bdd2d6b5` más árbol local de la rama `codex/blog-b3-politica-atribucion`.

Se leyeron íntegramente el SDD, `docs/analisis-creacion-fichas-y-horarios.md`, `docs/guia-implementacion-skill-horarios-y-ci.md`, `docs/plan-panel-administrativo.md`, `src/lib/schedule.ts` y `tests/unit/schedule.test.ts`. También se revisaron `astro.config.mjs`, `wrangler.toml`, `package.json`, `src/worker.ts`, `src/middleware.ts`, las rutas API existentes, `functions/api/status-override.js`, `scripts/schema.sql` y `.github/workflows/ci.yml`. La base local registra 86/86 pruebas unitarias aprobadas y 112 fichas; no se hicieron mutaciones remotas.

## Hallazgos accionables

### A-01 — P0 — La compatibilidad de `/api/status-override` no tiene implementación ni frontera de runtime definida

El SDD exige retirar el POST heredado y conservar un GET de compatibilidad (`§5.1` líneas 100–114; `§6.2` líneas 128–147), pero no define qué archivo/ruta del árbol Astro lo implementará ni cómo se elimina o excluye `functions/api/status-override.js` bajo el Worker. `wrangler.toml` solo ejecuta `src/worker.ts`; el archivo heredado contiene el fallback literal `vet24_admin_secret` y una escritura directa. Por tanto, los criterios “GET compatible”, “POST 405” y “sin segunda vía” no son verificables sobre un artefacto concreto y pueden divergir entre despliegues.

Acción: fijar una única ruta canónica en `src/pages/api/...` o declarar explícitamente que el GET desaparece; especificar el tratamiento de `functions/`, la respuesta para GET/POST/OPTIONS, y un test sobre el bundle Worker que demuestre que el secreto y la escritura heredados no son alcanzables.

### A-02 — P0 — Las propuestas GitHub no tienen mecanismo durable para reintentos, reconciliación ni timeout

`§8` líneas 175–181 promete hasta tres reintentos, operaciones abandonadas a los 15 minutos y reconciliación/cron, pero no define un binding ni un consumidor (Queues, Workflows, Durable Object, Cron Trigger) en `wrangler.toml`, ni quién ejecuta los estados posteriores a una respuesta de 10 s. La tabla de issues no convierte esa dependencia operacional en un criterio verificable. En un fallo después de commit o PR, la solicitud puede terminar sin continuar y la deduplicación queda solo como intención.

Acción: elegir y especificar el mecanismo de ejecución durable, sus bindings/configuración, payload y límites, política de reanudación por estado, cron/alarma, y fixtures que matan/reanudan cada etapa. Si todo ocurre síncronamente, eliminar la promesa de reconciliación y demostrar que cabe dentro del presupuesto de Worker.

### A-03 — P1 — Idempotencia no está contratada uniformemente en mutaciones

El modelo exige claves idempotentes y conflicto por payload (`§6.1` líneas 121–124), y `§6.2` exige `Idempotency-Key` para PUT, pero la tabla omite esa clave para DELETE (`§6.2` líneas 136–145) y para `PATCH /api/admin/reports/:id` (línea 141), aunque ambos son reintentables y el texto exige auditoría/reintentos. Tampoco se define si la clave viene en header o cuerpo, sus UUID/versiones aceptadas y la respuesta al reintento mientras el estado está pendiente.

Acción: añadir idempotencia explícita a cada mutación, con clave, hash, ventana, estados y respuestas exactas; incluir DELETE y PATCH en pruebas de pérdida de respuesta, payload distinto y repetición concurrente.

### A-04 — P1 — El contrato de migración no resuelve de forma reproducible el baseline existente

El SDD pide migraciones compatibles con DB vacía y existente, ledger y preservación de columnas (`§6.1` líneas 118–126), pero el único esquema actual usa `datetime('now','localtime')`, no tiene ledger, y `clinic_overrides` tiene `clinic_slug` como única PK (`scripts/schema.sql`). No se especifican nombres/versiones de migración, orden, transformación de timestamps locales, backfill de revisiones/active, ni cómo se detectan instalaciones parcialmente migradas. “Preflight inspecciona” no es un contrato ejecutable.

Acción: incluir una matriz de esquema inicial→final, migraciones numeradas idempotentes, reglas de backfill (incluida zona horaria de datos existentes), ledger y pruebas de DB vacía, DB actual, reejecución y fallo a mitad de migración. Definir también la compatibilidad exacta del GET heredado durante la transición.

### A-05 — P1 — La evidencia de investigación no fija cumplimiento para adquisición desde Google Maps/Search

`§4` líneas 88–94 ordena Maps/Google Search como primer paso y alude a políticas de Places, pero no define si se permite extracción de páginas/resultados públicos, límites de uso, atribución, retención de place_id/URLs, ni qué proveedor alternativo se usa cuando no hay acceso. Esto deja un procedimiento obligatorio ambiguo frente a las restricciones que el propio SDD reconoce en [F5], y puede producir datos no reproducibles o no autorizados.

Acción: añadir una matriz fuente→método permitido→campos almacenables→retención/atribución, distinguir Places API de navegación pública, y convertir bloqueo/cuota/ausencia de fuente en estados y criterios de revisión sin depender de Google para CI.

### A-06 — P1 — CI/E2E de Workers y D1 no está suficientemente especificado para ser reproducible

El CI actual solo ejecuta build, checks, unitarias, dry-run y Playwright (`.github/workflows/ci.yml`); no crea/aplica un D1 local ni levanta el handler Worker. El SDD exige ambas cosas (`§9` líneas 183–195), pero no fija comando, configuración de bindings, carga de migraciones/fixtures, servidor de prueba, aislamiento entre jobs ni cómo se inyectan JWKS/Access sin simular la autorización. “D1 local y handler real” no basta para reproducir el gate.

Acción: especificar scripts y artefactos de arranque/limpieza, puertos, `wrangler` config de test, migración fixture, servidor E2E y fixtures JWT/JWKS; añadir una prueba que falle si el E2E usa `astro dev` o un mock de DB/autorización.

### A-07 — P1 — El contrato de autenticación deja sin resolver el comportamiento cuando Access está ausente o delante del Worker

`§5.2` define 401/403/503 y redirect de UI, pero no fija si el redirect lo realiza Cloudflare Access o la aplicación, ni cómo el Worker distingue una navegación UI de una petición HTML directa, ni el status/cuerpo para `HEAD`, `OPTIONS` y assets bajo `/admin`. En el árbol actual `src/middleware.ts` canonicaliza antes de cualquier guardia y `src/worker.ts` delega directamente; los tests futuros descritos no tienen una especificación de headers/status completa.

Acción: documentar la secuencia Access→Worker→Astro, matriz método/ruta/host/credencial, y tests de acceso directo a HTML/assets, preview y canonicalización POST. Mantener la decisión de redirect fuera del Worker si esa es la arquitectura elegida y probarla en staging.

### A-08 — P1 — La regla de “offline reproducible” no cubre el coste ni la estabilidad del proceso de saneamiento

El SDD exige cerrar deuda de las 112 fichas y que CI total sea condición de cierre (`§3.2` líneas 80–84), pero el plan no define el formato versionado de `docs/admin/data-debt.json`, cómo se calcula/verifica `hash del registro`, quién fija responsable/vencimiento, ni cómo se revisan cambios concurrentes del inventario. Sin ese contrato, la excepción de legado puede ampliarse de forma silenciosa aunque el texto diga que no.

Acción: especificar schema de deuda, hash canónico, reglas de actualización, revisión requerida y fixtures de deuda exacta, ampliada y vencida; hacer que CI compare el inventario y rechace excepciones nuevas sin una razón auditable.

## Cobertura y límites

| Área | Cobertura | Resultado |
| --- | --- | --- |
| Base, referencias y árbol local | SDD, tres documentos, código/config relevante, CI y estado/hashes base | Cubierta |
| Astro 7, adapter Cloudflare, Worker/assets/rutas | `astro.config.mjs`, `src/worker.ts`, middleware, `wrangler.toml`, rutas existentes | Cubierta; A-01/A-07 |
| Auth UI/API, CSRF, hosts y secretos heredados | SDD y rutas/config heredadas | Cubierta; A-01/A-07 |
| D1, CAS, auditoría, expiración e idempotencia | SDD y `scripts/schema.sql` | Cubierta; A-03/A-04 |
| Horarios, TZ, parser, emergencias y Schema.org | contrato SDD, motor y pruebas, evidencia adversarial | Cubierta; especificación cubre los defectos observados |
| Investigación, fuentes y skill | tres documentos y contrato SDD | Cubierta; A-05 |
| Migración, rollback, observabilidad y operación | SDD, configuración existente | Cubierta; A-02/A-04 |
| CI, D1 local y E2E Worker | workflow actual y §9 SDD | Cubierta; A-06 |
| Grafo y trazabilidad de issues | §10 SDD | Revisada: grafo propuesto acíclico, pero no se deben crear issues hasta cerrar P0 |

La suite actual pasa, pero no contradice el rechazo: las comprobaciones base muestran que el motor todavía acepta `13:99pm`, infiere días para `D 10am-9pm` y evalúa mal un turno nocturno; son defectos preexistentes cubiertos por R02/I01, no cambios atribuidos a esta auditoría. No se implementó, no se editó el SDD y no se crearon issues.

## Condición para nueva auditoría

Corregir A-01 y A-02 como bloqueantes; después cerrar A-03–A-08 con contratos y tests verificables, actualizar el SHA del SDD y ejecutar una nueva auditoría independiente sobre ese SHA. Solo entonces procede la creación de issues reales.
