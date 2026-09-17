# Auditoría independiente de implementación: backend del panel administrativo

Fecha: 2026-09-16 (Costa Rica)  
Alcance: `src/lib/admin/api.ts`, `src/lib/admin/auth.ts`, `src/worker.ts`, `src/middleware.ts`, `src/pages/api/admin/[...path].ts` y `migrations/0001_admin_panel.sql`.  
Base normativa: `docs/spec-panel-administrativo.md` (r4) y `docs/sdd-panel-admin-y-skill.md` (SHA declarado por la spec: `10797303D82C4D7E2B5020EEA4312E40901FD7DBC2275A3BB68442A17C7532B5`).  
Método: lectura completa de los archivos del alcance, contraste con los contratos de la spec/SDD y análisis de reproducciones de flujo. No se ejecutó build ni deploy y no se modificó el producto.

## Dictamen parcial

**NO APROBADO para integración o habilitación.** La frontera de autenticación y parte de los contratos síncronos están presentes, pero hay fallos demostrables en la carga inicial del catálogo, expiración, replay, CAS y validación de propuestas. Además, el outbox que responde `202` no tiene consumidor durable: las propuestas no pueden avanzar a PR. Los tests estáticos/integración existentes no cubren estos casos y no justifican un PASS.

## Hallazgos

### P0 — El outbox acepta propuestas `pending` sin ningún runner durable

`src/lib/admin/api.ts:875-886` inserta cada propuesta en `clinic_proposals` con estado `pending` y responde `202`. `src/lib/admin/api.ts:899-905` solo lee ese estado. No existe `src/lib/admin/proposal-runner.ts` ni otra implementación que actualice `branch_created`, `committed`, `pr_open` o `failed`; `src/worker.ts:8-32` exporta únicamente `fetch` y `wrangler.toml:6-9` no declara `[triggers]`/cron ni un handler `scheduled`.

La migración tampoco contiene los campos exigidos para reanudar de forma segura (`branch`, `commitSha`, `prNumber`, `next_attempt_at`, `lease_owner`, `lease_until`, `state_version`); `migrations/0001_admin_panel.sql:71-88` solo crea una fila mínima. Una llamada válida queda permanentemente en `pending`, por lo que falla el contrato 202 durable y toda la secuencia I08/I09-A7.

Reproducción: con D1 migrado y GitHub configurado, hacer un `POST /api/admin/clinic-proposals` válido; la respuesta es 202 y un `GET /api/admin/operations/:id` seguirá devolviendo `status: "pending"` porque no hay tick `scheduled` ni código que consuma la fila.

### P1 — La carga inicial del catálogo devuelve 422 por parámetros vacíos que genera la UI

`src/lib/admin/api.ts:430-442` usa `getAll()` y valida cada valor contra enums cerrados. Por tanto `?q=&provincia=&estado=&issue=&verification=&limit=25` produce `states = [""]` (y equivalentes), falla `allowedStates.has("")` y devuelve `422 INVALID_QUERY` antes de leer el catálogo. La ausencia de parámetro sí significa “sin filtro” en la spec, y la UI actual serializa esos controles vacíos en su consulta inicial.

Reproducción: solicitar `GET /api/admin/clinics?q=&provincia=&estado=&issue=&verification=&limit=25` con una sesión válida; se obtiene 422 en lugar de `{items,nextCursor,baseCommit,generatedAt,counts}`. Debe omitirse el parámetro vacío al construir la consulta o tratar el valor vacío como ausencia de filtro, manteniendo el rechazo de valores no vacíos desconocidos.

### P1 — Las alertas expiradas permanecen activas durante el resto del día

`src/lib/admin/api.ts:675-680` acepta y almacena cualquier fecha que `Date.parse` entienda, incluida la forma ISO UTC requerida. Después `src/lib/admin/api.ts:374` filtra con `expires_at > datetime('now')`. SQLite compara aquí cadenas: un valor como `2026-09-16T18:00:00.000Z` se ordena después de `2026-09-16 19:00:00` por la `T`, aunque ya haya expirado. El mismo filtro se usa para catálogo y detalle.

Reproducción: insertar/guardar un override activo con `expiresAt = new Date(Date.now() - 3600000).toISOString()` en el mismo día y llamar `GET /api/admin/clinics/:slug`; el override aparece en `liveIndex` y conserva el cierre. Normalizar a UTC SQLite (`YYYY-MM-DD HH:MM:SS`) antes de almacenar/comparar o comparar epoch de forma explícita. La validación también debe exigir el formato UTC canónico del contrato.

### P1 — El replay idempotente se comprueba después de leer estado mutable

El contrato exige que una misma clave y payload devuelva siempre el status/body original. En `patchReport`, `src/lib/admin/api.ts:1040-1053` consulta existencia y revisión y solo después llama a `reserveIdempotency`; tras el primer PATCH, la misma petición con la misma clave ve la revisión incrementada y devuelve 409 antes de la reserva. El mismo orden aparece en propuestas (`src/lib/admin/api.ts:801-872`, con comprobaciones de base/blob/GitHub antes de reservar) y retry (`src/lib/admin/api.ts:929-939`, que exige que la operación siga `failed`).

Reproducción: repetir exactamente el PATCH autenticado con la misma `Idempotency-Key` y cuerpo después de que el primer PATCH haya subido la revisión; la segunda llamada devuelve `409 CONFLICT` en vez de `200` con `Idempotency-Replayed: true`. Para propuesta/retry, cambiar el estado remoto/D1 entre llamadas produce el mismo defecto. La reserva/lookup del ledger debe ocurrir después de validar únicamente forma y límites del cuerpo, antes de cualquier lectura mutable o llamada externa; una fila existente debe ganar siempre por hash.

### P1 — La creación concurrente de un override responde 503 en vez de resolver el CAS

En `src/lib/admin/api.ts:694-705` se lee la revisión fuera de la transacción y, si no hay fila, la rama de inserción usa `INSERT` simple en `src/lib/admin/api.ts:748-750`. Dos solicitudes con `expectedRevision: 0` pueden observar ausencia; una inserta y la otra choca con la PK `clinic_slug`. El `catch` de `src/lib/admin/api.ts:759-762` convierte ese conflicto de concurrencia en `503 LIVE_UNAVAILABLE`, no en el 409 CAS normativo. La reserva de idempotencia de cada solicitud no evita la carrera porque las claves son distintas.

Reproducción: lanzar dos PUT válidos simultáneos sobre el mismo slug sin override, ambas con revisión 0 y claves UUID distintas. El ganador recibe 200; el perdedor puede recibir 503 por constraint, en vez de 409 con revisión actual, y el resultado no es el CAS determinista exigido por I05/I09-A6. La inserción debe ser condicionada/convertirse en un resultado de conflicto comprobable dentro del batch.

### P1 — La propuesta nueva puede pasar sin evidencia verificable ni comprobar ausencia remota

`hasLocationEvidence` (`src/lib/admin/api.ts:295-309`) solo exige un `fact.field` con nombre relacionado con ubicación y que latitud/longitud sean finitas. `validSidecar` permite una lista de fuentes vacía y referencias vacías (`src/lib/admin/api.ts:219-269`), de modo que un sidecar con `facts: [{field: "location", value: null, references: [], confidence: "low"}]` y coordenadas numéricas satisface el gate de `src/lib/admin/api.ts:836-840`. No se exige referencia no vacía, valor concordante con las coordenadas, tipo/precisión territorial ni confirmación de sucursal.

Además, `verifyGithubSource` retorna éxito inmediatamente cuando `expectedBlob === null` (`src/lib/admin/api.ts:168-180`), así que para una nueva ficha nunca consulta si `src/content/clinicas/<slug>.md` o `.mdx` ya existe en el commit base. Una ficha que falta del build estático pero ya existe en `main` puede encolarse como nueva. El GET de detalle también calcula `blobSha/sourceHash` desde los globs estáticos (`src/lib/admin/api.ts:560-569`), no desde el ref GitHub permitido, por lo que una build vieja puede presentar hashes/evidencia obsoletos.

Reproducción: enviar una propuesta nueva con fuentes `[]`, el fact de ubicación sin referencias y coordenadas válidas; el endpoint alcanza 202 si el resto coincide. Para el caso remoto, hacer que el archivo exista en GitHub pero no en el catálogo embebido y repetir con `blobSha: null`; la comprobación de commit pasa sin comprobar colisión de ruta. El servidor debe exigir evidencia admitida y referenciada, validar la sucursal/coordenadas y consultar explícitamente la ausencia del path remoto antes de reservar/encolar.

## Observaciones de alcance

`auth.ts` conserva una frontera razonable de Access/JWT, host, CSRF, método y límite de cuerpo, pero el dictamen de este informe no la convierte en aprobación del producto completo. La migración actual es una única `0001_admin_panel.sql` aditiva parcial; no demuestra el ledger de migraciones, backfill, purga de idempotencia/rate buckets ni la compatibilidad baseline exigida por el SDD. Esos gaps quedan registrados junto al hallazgo P0 porque impiden considerar durable el outbox y la operación.

