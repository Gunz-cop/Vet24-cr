# Revisión de implementación del panel — 2026-09-16

Veredicto: **FAIL — implementación parcial, no lista para aceptación**.

Alcance: árbol local sobre commit `24dc03d58ba970710a26bbb1f7f175556c500f14`, incluyendo archivos modificados y sin seguimiento. Comparación con `docs/spec-panel-administrativo.md` aprobada. No se verificó despliegue remoto ni se modificó código de producto.

## Hallazgos

### P1 — El catálogo inicial no carga

`src/pages/admin/index.astro:79` serializa todos los controles, incluyendo `estado=&issue=&verification=`. `src/lib/admin/api.ts:430` interpreta estos valores vacíos como filtros inválidos. Reproducción autenticada sobre Worker compilado y D1 de prueba: GET `/api/admin/clinics/?q=&provincia=&estado=&issue=&verification=&limit=25` devuelve **422 INVALID_QUERY**. Omitir filtros vacíos o normalizarlos en la API y cubrir el request real del formulario.

### P1 — Las propuestas no tienen procesamiento hasta PR

`src/lib/admin/api.ts:878` inserta `clinic_proposals` en `pending`. El código solo consulta operaciones y permite devolver operaciones fallidas a `pending`; no existe consumidor que cree rama, commit y PR. `src/worker.ts` solo exporta `fetch`, sin handler scheduled. Un 202 demuestra encolado, no el flujo permanente exigido por I08/I09. Implementar y probar el runner durable y la reconciliación antes de considerar completo este flujo.

### P1 — Editar otros datos altera el horario y descarta evidencia

`src/pages/admin/editar/[slug].astro:44` sustituye la ausencia de `schedule_v1` por siete días `unknown`. La línea 48 siempre envía ese horario, incluso si solo se cambia un teléfono. No se encontraron fichas actuales con `schedule_v1` en el contenido. El mismo submit reconstruye el sidecar con una única fuente y un fact de dirección, sin conservar las fuentes, facts y conflictos obtenidos al leer la ficha. Mantener el horario omitido si no se modifica, aplicar la conversión compartida cuando corresponda y preservar la evidencia existente con cambios explícitos.

### P1 — Las alertas administrativas no llegan al consumidor público

Las escrituras nuevas usan `admin_overrides`; sus lecturas se limitan a `src/lib/admin/api.ts`. No se encontró integración del sitio público con esa tabla. Guardar una alerta en D1 no modifica por sí solo el estado mostrado a visitantes. Falta conectar y verificar I06, incluyendo degradación y expiración.

### P2 — El replay de reportes falla tras una escritura exitosa

`src/lib/admin/api.ts:1050` valida la revisión antes de consultar idempotencia. Después de un PATCH exitoso, repetir exactamente método, URL, clave y cuerpo devuelve **409 CONFLICT**. Reproducido en Worker compilado; debe devolver el resultado almacenado sin duplicar efectos. Comprobar replay antes del conflicto de revisión, manteniendo el rechazo a reutilizar una clave con otro cuerpo.

## Verificación

- `npm test`: **100 pasan, 1 falla**. `tests/unit/admin-auth.test.ts:79` todavía espera el bloqueo 503 de todas las mutaciones; el guard ahora deja continuar una petición válida. Se debe reconciliar la prueba con el contrato actual; este fallo aislado no demuestra un bypass de autenticación.
- `npm run check`: **PASS**, 0 errores, 0 warnings, 36 hints.
- `npm run build:no-shorten`: **PASS**.
- `npm run check:runtime-bundle`: **PASS**, 37 archivos.
- Los tres tests de `tests/integration/admin-worker.test.mjs`, ejecutados desde una copia instrumentada: **PASS**. Dos probes añadidos a esa copia reproducen los 422/409 descritos arriba; esos resultados no forman parte de las aserciones existentes.
- Evidencia de ejecución: `../scratch/review-panel-unit.log`, `review-panel-check.log`, `review-panel-build.log`, `review-panel-boundary.log`, `review-panel-worker.log`; copia instrumentada `../scratch/review-panel-probe.mjs` (ejecutada temporalmente dentro del repositorio para resolver dependencias).

La auditoría de spec con PASS sigue siendo una validación documental; no certifica esta implementación. No se ejecutó publicación, push ni modificación remota.
