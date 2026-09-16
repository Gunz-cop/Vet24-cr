# Reauditoría independiente SDD panel administrativo y skill

Fecha del informe: 2026-09-15 21:36:41 -06:00 (Costa Rica)  
Auditoría: Luna, esfuerzo medium, reauditoría adversarial independiente  
Veredicto: **RECHAZADO**

## Identidad de la revisión

SDD revisado: `docs/sdd-panel-admin-y-skill.md`  
Versión declarada: 1.1 candidata  
SHA256 exacto: `B6FAB6B1B1AF49D5EFF8C849A702753930353DED7EFF26F2FE0210AA2D2732E2`

Releí íntegramente el SDD y sus tres documentos referenciados, y revisé la configuración y código relevante del repositorio: Astro/Cloudflare, Worker, middleware, rutas API, `functions/`, esquema D1, motor/pruebas de horarios y workflow CI. Verifiqué con la versión instalada de Wrangler que los comandos documentados para migraciones locales aceptan `--local` y `--persist-to`, y que `wrangler dev` admite `--persist-to` y `--test-scheduled`. La hora local real usada para este informe fue `2026-09-15 21:36:41 -06:00`.

## Evaluación de la corrección r1

La sección 12 convierte A-01–A-08 en contratos implementables y comprobables: fija `src/pages/api/status-override.ts`, elimina explícitamente el handler heredado principal, define la matriz de auth y métodos, el outbox D1 con Cron Trigger y leases, idempotencia para todas las mutaciones, migraciones 0001–0003 y backfill conservador, adquisición/fallback de fuentes, harness Wrangler contra Worker y D1 reales, y un formato/hash verificable para deuda. Estos cambios corrigen los bloqueantes de la auditoría r1.

Persiste un hallazgo material de seguridad y frontera de runtime.

### A-09 — P1 — Quedan handlers heredados de escritura D1 fuera del retiro normativo

§12.1 línea 244 ordena eliminar `functions/api/status-override.js` y probar que el secreto inseguro no aparece en el bundle, pero el árbol revisado también contiene `functions/api/cron-check-links.js`, que usa el mismo fallback literal `vet24_admin_secret` y escribe/borra `clinic_overrides`, y `functions/api/report-incorrect.js`, que mantiene otra escritura de `reports`. §5.1 y §12.1 declaran que el pipeline soportado es exclusivamente el Worker, pero no establecen una acción verificable sobre todos los handlers bajo `functions/`, ni un inventario/denylist que impida que un despliegue Pages o una configuración futura los vuelva accesibles. Buscar solo en el bundle Worker no demuestra que no exista una segunda vía en el repositorio o en un artefacto Pages alternativo.

Acción requerida: enumerar todos los archivos `functions/` y rutas antiguas en el preflight, y para cada uno declarar retiro/eliminación, conversión a ruta Astro única o bloqueo explícito. Como mínimo, retirar o convertir `cron-check-links.js` y `report-incorrect.js`, eliminar todos los fallbacks `ADMIN_SECRET` literales, y añadir una prueba de fuente/configuración que falle ante cualquier handler heredado con escritura D1 o secreto de respaldo. La aceptación debe cubrir el Worker y cualquier configuración de Pages/Functions que pudiera publicarse accidentalmente.

Este hallazgo no acusa cambios preexistentes como implementación nueva; exige que la especificación cubra esos defectos antes de habilitar el panel.

## Cobertura

| Área | Resultado |
| --- | --- |
| SDD completo, tres documentos fuente y SHA256 | Cubierta |
| Astro 7, adapter Cloudflare, output static, Worker y assets | Cubierta |
| Access UI/API, host, métodos, CSRF, headers y canonicalización | Cubierta por §12.1 |
| Horarios, TZ, parser, emergencias y Schema.org | Cubierta; los defectos base permanecen correctamente asignados a I01/R02 |
| D1 CAS, auditoría, expiración, idempotencia y lecturas primarias | Cubierta por §§6, 12.3 y 12.4 |
| Outbox GitHub, Cron, leases, reanudación y fallos post-efecto | Cubierta por §12.2 |
| Investigación, fuentes, licencias y fallback | Cubierta por §12.5 |
| Migración, backfill, ledger, rollback y retención | Cubierta por §12.4 y §9 |
| CI/E2E Worker-D1 real y aislamiento | Cubierta por §12.6 |
| Deuda de datos, hash canónico y concurrencia | Cubierta por §12.7 |
| Plan de issues y grafo | Revisado; grafo acíclico y cobertura R01–R12 declarada |
| Handlers heredados adicionales | Insuficiente; A-09 |

Los 86 tests unitarios existentes y las comprobaciones adversariales (`D 10am-9pm`, `13:99pm`, overnight) no convierten el diseño en producto implementado y no alteran este veredicto.

## Condición para aprobación

Precisar en §12 el inventario y destino de todos los handlers heredados con escritura D1, incluyendo `functions/api/cron-check-links.js` y `functions/api/report-incorrect.js`, y añadir el gate que impida secretos de respaldo o rutas alternativas. Recalcular el SHA256 y ejecutar otra auditoría independiente antes de crear issues reales.

No se modificó el SDD ni se crearon issues.
