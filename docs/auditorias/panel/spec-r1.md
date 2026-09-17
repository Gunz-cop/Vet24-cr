# Auditoría independiente de la especificación del panel I09

Veredicto exacto: **FAIL**

Fecha de auditoría: 2026-09-16 (Costa Rica)  
Auditor: Luna, razonamiento high  
Candidato auditado: `docs/spec-panel-administrativo.md`  
SHA256 del candidato auditado: `9D62245C7B44BC46DA24F851528FA0D2CD0A194D957DC3C822DE0BF01A100A62`  
Base sellada: `24dc03d58ba970710a26bbb1f7f175556c500f14`  
Baseline: `docs/auditorias/panel/base.json`

La auditoría se hizo contra el contenido exacto del SDD, I09, I02, I05, I07, I08, I10 e I11 y contra los archivos de base listados en `base.json`. Los hashes de esas dependencias coinciden con el baseline; el hash del candidato también coincide con el comunicado para r1. No se modificó el candidato ni se ejecutó implementación remota.

## Matriz de cobertura

| Requisito | Cobertura de la spec | Evaluación |
| --- | --- | --- |
| R01 | Evidencia por campo, fuentes inaccesibles, conflictos y no inventar disponibilidad | Parcial: el pasaje hacia el sidecar canónico de I02 no queda cerrado en la interfaz de evidencia |
| R02 | Editor `ScheduleV1`, estados, intervalos, overnight, excepciones y preview Costa Rica | Cubierto en §6; propietario citado incorrectamente en §1.1, §2 y §12 |
| R03 | Validación, UUID/slug, coordenadas, enlaces y flags 24/7 | Cubierto con la salvedad del contrato de evidencia indicado en H-03 |
| R04 | Catálogo, filtros, paginación, reportes y conteos dinámicos | Cubierto en §4 |
| R05 | Editor accesible de ficha, horario, mapa y estados de error | Cubierto en §5–§7 y §10 |
| R06 | Overrides, expiración, CAS, tombstone, auditoría e idempotencia | Cubierto en §8.1; propietario citado incorrectamente en §2 y §12 |
| R07 | Proyección/degradación pública y coherencia entre consumidores | Parcial: la degradación D1 queda condicional en §9 |
| R08 | Outbox, PR, conflictos de base, reintentos y no auto-merge | Parcial: los estados de propuesta contradicen el contrato de I08 |
| R09 | Access, allowlist, CSRF, host, assets y secreto legacy | Cubierto como integración; propietario citado incorrectamente en §2 y §12 |
| R10 | Harness Workers/D1, fixtures y regresión | Cubierto en §11–§12 |
| R11 | Preflight, operación, observabilidad y rollback | Parcial: se delega a I11 correctamente, pero la secuencia también le asigna migraciones que pertenecen a I05 |
| R12 | Regresión de SEO, sitemap, Markdown, blog, especies y headers | Cubierto en I09-A10 |

## Hallazgos

### H-01 — P1 — Propietarios y secuencia contradicen el SDD

Ubicación: `docs/spec-panel-administrativo.md` §1.1 línea 21, §2 líneas 27–34 y §12 pasos 1–3 (líneas 171–174).  
Contrato exacto: SDD §10, tabla de issues; I04/I05/I07/I08/I10, secciones de propiedad del trabajo.

La spec atribuye el motor horario a `I05/#31`, la frontera Workers y tombstones a `I07/#33`, overrides y reportes a `I08/#34`, y auth a `I10/#36`. También hace que I10/I07 preparen la frontera, que I02/I05 expongan el motor y que I08/I11 apliquen migraciones y CAS. El contrato sellado asigna esas responsabilidades así: I01/#27 motor horario; I02/#28 schema, skill, evidencia y deuda; I04/#30 auth, frontera y retiro legacy; I05/#31 migraciones, overrides, CAS, auditoría e idempotencia compartida; I07/#33 reportes; I08/#34 propuestas y runner; I10/#36 CI/harness e integración; I11 operación y preflight.

Corrección esperada: reemplazar la tabla de propietarios y los pasos de §12 por ese mapa exacto, incluyendo la dependencia I06 para la proyección pública cuando corresponda. La spec debe dejar claro que I09 consume esos contratos y no reubica sus propietarios. Hasta corregirlo, una implementación siguiendo esta spec puede duplicar o dejar sin dueño auth, motor, D1 y reportes.

### H-02 — P1 — Estados de propuesta no son los estados normativos de I08

Ubicación: §8.2, línea 132; también §8.3, línea 138.  
Contrato exacto: I08 §8, líneas 49–55, y §12.2, líneas 59–65.

La UI declara `pending|running|succeeded|failed`. I08 exige conservar la máquina `pending → branch_created → committed → pr_open`, además de `failed/retryable`, y observar `merged/deployed` únicamente mediante GitHub y `build-info`. `succeeded` no identifica si sólo se creó rama, commit o PR y puede presentar un PR abierto como operación terminada. La spec tampoco exige que el endpoint devuelva el estado durable exacto o un mapeo normativo inequívoco.

Corrección esperada: usar los estados persistidos de I08 en la respuesta y en la UI (`pending`, `branch_created`, `committed`, `pr_open`, `failed` con `retryable`/código, y observaciones separadas `merged`/`deployed`); si se desea una etiqueta visual agregada, definirla como derivación sin ocultar `stage`, `errorCode` ni la comprobación de build. `pr_open` debe seguir mostrando “PR creado, pendiente de revisión”.

### H-03 — P1 — El contrato de evidencia de la UI queda incompleto

Ubicación: §1.1 línea 21, §5 línea 80, §8.2 líneas 130 y 134.  
Contrato exacto: I02 §4 y SDD §4, §12.5.

La spec menciona `evidence: {status, facts, conflicts, sources}` y controles de fuente, fecha, campo y confianza, pero no cierra cómo el editor produce el sidecar requerido: `schemaVersion`, `slug`, `observedAt` ISO UTC, fuentes con URL/tipo/fecha de consulta o publicación, facts con valor y referencias, conflictos con resolución, ni los estados `VERIFIED`, `PARTIAL` y `REVIEW_REQUIRED` derivados del sidecar. Tampoco exige explícitamente que snippets/redes inaccesibles no sean base única de VERIFIED ni que el payload enviado sea el sidecar canónico completo. “Campos y evidencia completas” deja campos obligatorios y formas de error a interpretación.

Corrección esperada: declarar que la UI edita o transporta exactamente el esquema de I02, con sus tipos, fechas, referencias y conflictos; el servidor deriva `record_status` y flags, rechaza payload incompleto y bloquea VERIFIED/Tier A sin evidencia admitida. Mantener sidecar ausente como `unavailable`, no como evidencia vacía confirmada.

### H-04 — P2 — Degradación de catálogo ante D1 queda abierta a interpretación

Ubicación: §9 línea 144 y §11 I09-A10 línea 165.  
Contrato exacto: SDD §7.1 y §6.1; I05 criterios de aceptación.

La frase “el catálogo base puede seguir siendo visible si el contrato lo permite” no define el comportamiento implementable. El SDD exige que una lectura viva fallida no equivalga a ausencia de override: contacto y horario base pueden seguir visibles, el estado operativo vivo debe ser `UNCONFIRMED`, no debe presentarse un cierre como apertura confirmada y las mutaciones deben deshabilitarse. La spec deja el caso dependiente de otro contrato y no define la forma de error/degradación para la consulta del catálogo.

Corrección esperada: fijar en I09 la proyección degradada: conservar campos estáticos, marcar estado vivo `UNCONFIRMED` con motivo `live_unavailable`, no devolver `override:null` como éxito ante fallo D1, mostrar error/reintento y deshabilitar mutaciones. Las respuestas de I05 siguen siendo autoridad para el detalle de persistencia.

### H-05 — P1 — Los filtros visibles no tienen contrato de consulta sobre un catálogo paginado

Ubicación: §4.1, líneas 58–62.  
Contrato exacto: SDD §7.2 y §6.2, `GET /api/admin/clinics`.

La UI exige filtros de provincia, estado editorial, problema de horario, verificación pendiente, alertas activas y reportes pendientes, pero el endpoint sólo define `q`, `provincia`, `issue`, `cursor` y `limit`. No se define si estado/verificación/alertas/reportes se codifican en `issue`, si se aplican en servidor o si se filtran localmente. Con páginas de 25 elementos, un filtrado local no puede producir el conjunto, `nextCursor` ni los conteos correctos del catálogo completo.

Corrección esperada: fijar la codificación de cada filtro (parámetros enumerados o una unión `issue` cerrada), su semántica de combinación y el cálculo de conteos/cursor sobre el conjunto filtrado. Si algún filtro es local, la respuesta debe entregar explícitamente el dataset completo necesario y explicar sus límites; no dejar la decisión al cliente.

### H-06 — P1 — El inventario de campos y reglas de nueva ficha no queda cerrado

Ubicación: §5, líneas 74–80; §8.2, líneas 130–134.  
Contrato exacto: I02 schema/validación, I08 §8, I09 criterios y `src/lib/clinic-schema.ts` de la base.

La spec enumera grupos de formulario, pero deja “demás campos existentes”, “campos requeridos” y “ficha completa” sin una tabla de nombres, tipos, nulabilidad, conservación o evidencia requerida. Esto es sensible porque el wire actual aplica defaults (`false`, `""`, `0`) y el contrato futuro exige distinguir desconocido de falso conocido. Sin un inventario cerrado, una implementación puede omitir `copyDiferenciador`, `verification_notes`, flags de verificación, campos de hotel/especies, campos ajenos reconocidos o la forma canónica de `schedule_v1` y sidecar, y aun así considerar válido el POST.

Corrección esperada: incluir una matriz de campos para edición y nueva ficha (nombre exacto, tipo, requerido/nullable, editable o preservado, evidencia necesaria y regla de derivación), referenciando el schema estricto de I02 como autoridad. Exigir que el servidor rechace campos faltantes/extra o defaults de compatibilidad usados como hechos; la UI puede ocultar campos no editables, pero debe conservarlos en servidor según I08.

## Comprobaciones adicionales

- `baseCommit` y `blobSha` de alta nueva están correctamente cerrados: `baseCommit` es el SHA real de `main` y `blobSha` es `null`; para edición existente se conservan los valores leídos y el servidor los revalida.
- La spec identifica correctamente los defaults falsos, cadenas vacías y coordenadas cero del wire actual como compatibilidad, no como hechos negativos; también permite `null` sólo para borrador sin ubicación verificable.
- Reportes usan los estados normativos `new|reviewed|resolved`, revisión esperada, contacto sólo en bandeja autorizada y error 503 real de D1. No encontré contradicción en ese contrato.
- El contrato de horarios conserva minutos exactos, `unknown`/`appointment`, overnight, excepciones, 24h sin Tier A y no edición de `scheduleAttr`.
- La spec no afirma que el panel, D1, Access, GitHub, Cron o producción estén provisionados; mantiene la habilitación remota fuera de esta entrega.
- No se halló requisito de gate remoto como prerrequisito para aprobar esta especificación.

No hay hallazgos P0. Los hallazgos P1 H-01, H-02, H-03, H-05 y H-06 impiden PASS porque dejan contradicciones de propiedad, estados de propuesta, forma de evidencia, filtros paginados e inventario de campos que afectan implementación y veracidad del panel. Tras corregirlos, debe recalcularse el SHA y repetirse esta auditoría sobre el nuevo candidato; H-04 puede cerrarse en la misma revisión.
