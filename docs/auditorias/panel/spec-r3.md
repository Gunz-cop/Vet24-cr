# Tercera auditoría independiente de la especificación del panel I09

Veredicto exacto: **FAIL**

Fecha de auditoría: 2026-09-16 (Costa Rica)  
Auditor: Luna, razonamiento high  
Candidato auditado: `docs/spec-panel-administrativo.md` (r4)  
SHA256 del candidato auditado: `1A9EACA7CA668BA203B6F2778F17EDF78B0509143510256D0E8551AF217C276A`  
Snapshot declarado: `docs/auditorias/panel/spec-r4.snapshot.md`  
Base sellada: `24dc03d58ba970710a26bbb1f7f175556c500f14`  
Baseline: `docs/auditorias/panel/base.json`

Se verificó el hash real del archivo candidato y se contrastó la spec completa con el SDD y los contratos exactos de I01/I02/I04/I05/I06/I07/I08/I09/I10/I11, además de `src/lib/clinic-schema.ts`, `src/lib/schedule.ts`, `src/lib/admin/auth.ts`, `src/worker.ts` y `src/middleware.ts` del baseline. El candidato coincide con el SHA comunicado. No se modificó la spec ni se ejecutaron cambios de código o infraestructura.

## Cierre de hallazgos previos

H-01 (owners/secuencia), H-05 (filtros paginados) y H-06 (inventario) están corregidos sustancialmente. H-02/H-09 (estados de propuestas), H-04/H-10 (degradación D1) y H-11 (listas OR) también quedaron corregidos en lo esencial: r4 define owners correctos, una sintaxis de claves repetidas, 503 para filtros live, `operationalState`/`override` no confirmados y un único vocabulario de `status`.

H-03/H-07, sin embargo, requieren el hallazgo H-12 de abajo porque la spec declara equivalencia entre dos formas que todavía no tienen la misma estructura. El tratamiento triestado mejora y fija el bloqueo de una nueva ficha publicable, pero deja el transporte de `unknownFields` sin una frontera contractual (H-13).

## Matriz de cobertura

| Requisito | Cobertura de r4 | Evaluación |
| --- | --- | --- |
| R01 | Evidencia por campo, sidecar, fuentes inaccesibles y conflictos | Parcial: envelope GET y sidecar se declaran “mismo DTO” pese a formas distintas; H-12 |
| R02 | `ScheduleV1`, intervalos, estados, overnight, excepciones y preview Costa Rica | Parcial: reglas funcionales cubiertas, pero transición `schedule_v1:null` no encaja en el schema actual; H-14 |
| R03 | Schema, UUID/slug, coordenadas, flags y evidencia | Parcial: `unknownFields` no tiene forma/flujo de POST cerrado; requeridos del wire actual son inconsistentes; H-13/H-15 |
| R04 | Catálogo, filtros, paginación, reportes y conteos | Cubierto en §4; filtros y degradación live quedaron explícitos |
| R05 | Editor de ficha, horario, mapa y accesibilidad | Parcial por H-13/H-14 en la forma de datos que edita |
| R06 | Overrides, expiración, CAS, tombstone, auditoría e idempotencia | Cubierto en §8.1; consume I05/#31 |
| R07 | Estado público y degradación común | Cubierto como integración I06/#32; r4 marca estado vivo/override no confirmado y 503 live |
| R08 | Outbox, PR, estados, conflictos y reintentos | Cubierto: `status` único y observaciones `merged/deployed` separadas |
| R09 | Access, allowlist, CSRF, hosts, assets y legacy | Cubierto como integración de I04/#30 e I10/#36 |
| R10 | Harness Workers/D1, fixtures y E2E | Cubierto en §11 y por I10/#36 |
| R11 | Preflight, operación, alertas, retención y rollback | Cubierto como responsabilidad de I11/#37 |
| R12 | SEO, sitemap, Markdown, blog, especies y regresión | Cubierto en I09-A10 |

## Hallazgos

### H-12 — P1 — La spec confunde el envelope de evidencia GET con el sidecar POST

Ubicación: §1.1 línea 21 y §5 línea 108.  
Contrato exacto: I02 §4 y SDD §4/§12.5.

El DTO de respuesta se define como `evidence: {status, facts, conflicts, fuentes}`. El sidecar transportado se define como `{schemaVersion, slug, observedAt, fuentes, facts, conflicts}`. La spec afirma que “este es el mismo DTO de `evidence` usado por GET y POST”, aunque el envelope GET incluye `status` y el sidecar incluye `schemaVersion`, `slug` y `observedAt` en el nivel raíz. No se define si GET devuelve un envelope que contiene el sidecar (`evidence.sidecar`), si `status` es una proyección calculada, ni cuál de las dos formas entra en `clinic-proposals`.

Corrección esperada: elegir y nombrar dos capas sin ambigüedad, por ejemplo `EvidenceView = {status, sidecar}` para GET y `EvidenceSidecar = {schemaVersion,slug,observedAt,fuentes,facts,conflicts}` para POST; declarar que `status` se deriva y no se persiste dentro del sidecar. O usar exactamente el sidecar en ambas rutas y documentar el status como campo de respuesta separado. El mapeo debe ser 1:1 y conservar fuentes, fechas, facts y conflictos.

### H-13 — P1 — `unknownFields` no tiene frontera entre DTO de borrador y POST canónico

Ubicación: §5 líneas 108–110 y §8.2 línea 166.  
Contrato exacto: I02 §3.2/§4, I08 §8 y `src/lib/clinic-schema.ts` del baseline.

R4 dice que el borrador serializa `unknown` como `unknownFields`, pero el POST sólo acepta `{slug,newClinic,baseCommit,blobSha,clinic,evidence}` y el sidecar tiene exactamente seis claves. No se especifica si `unknownFields` vive fuera de `clinic`, si se guarda en `evidence`, si es únicamente estado local, ni qué transformación elimina esa propiedad antes del POST. La frase posterior de que el servidor rechaza claves extra hace incompatible un envío ingenuo del DTO de borrador. Además, la spec deja dos comportamientos distintos: para nueva ficha bloquea 422, mientras para existente conserva el booleano histórico y “añade el campo a `unknownFields`”, sin declarar dónde queda esa marca en el registro o respuesta.

Corrección esperada: declarar tipos y límites: `DraftState` puede tener `unknownFields` sólo en memoria/DTO UI; nunca se incluye dentro de `clinic`, sidecar ni POST. Para nueva publicable, `unknownFields` no vacío produce 422 `UNKNOWN_FIELD`. Para edición existente, la marca debe derivarse de evidencia/estado del servidor mediante un campo de respuesta explícito o sidecar canónico, conservando el valor histórico sin usarlo como afirmación nueva. El request final debe validar exactamente el esquema I02/I08.

### H-14 — P1 — `schedule_v1:null` contradice el schema estricto del wire actual sin DTO de transición

Ubicación: §1.1 línea 21 y §5 línea 92.  
Contrato exacto: `src/lib/clinic-schema.ts` del baseline y SDD §3.1.

R4 permite que el detalle devuelva `schedule_v1: null` y lo incluye como `ScheduleV1 opcional/null`. En el schema real sellado, `schedule_v1` es `scheduleSchema.optional()` y no acepta `null`; el SDD define el campo como opcional, es decir, puede estar ausente. La spec no declara un DTO de respuesta separado ni una versión nullable del schema. Un endpoint que siga la spec puede entregar una respuesta que falla la validación central, mientras uno que siga el schema no puede expresar el estado de transición indicado.

Corrección esperada: usar ausencia del campo para el wire estricto, o definir explícitamente un `ClinicDetailTransitionDTO` nullable y su validador/envelope separado, sin llamarlo `clinicSchema`. Documentar la conversión antes de entrar al editor y mantener `null` fuera del frontmatter canónico si I01 sólo admite campo opcional.

### H-15 — P2 — El inventario r4 atribuye requiredness que no coincide con el schema base

Ubicación: §5 líneas 84–105; `src/lib/clinic-schema.ts` baseline.

La tabla llama requeridos y nunca nulos a `atiendeGranja`, `atiendePeces` y `hotelMascotas`, pero el schema base los declara opcionales con default `false`. También describe `id` como string aunque el wire base acepta `number|string`; el SDD exige comparación normalizada y conservación de IDs históricos. La spec puede estar describiendo el futuro schema I02, pero no separa ese contrato del wire actual que presenta como inventario. Esto afecta qué muestra la UI y cómo preserva fichas antiguas.

Corrección esperada: separar tabla `WireActual` de `ClinicDTO futuro I02`, o corregir requiredness/tipos para reflejar el baseline y declarar la normalización de IDs históricos. Mantener defaults como compatibilidad y no convertirlos en hechos; el schema futuro debe ser la única autoridad para nuevas altas.

## Comprobaciones positivas

- Hash del candidato y base commit coinciden con los valores comunicados y el baseline.
- Ownership y secuencia I01–I11 quedaron alineados; I09 consume contratos y no reasigna propietarios.
- `baseCommit`/`blobSha` para nueva ficha están cerrados (`baseCommit` real de `main`, `blobSha:null`), y la edición existente revalida ambos.
- Filtros enumerados usan claves repetidas, AND/OR definido y filtrado server-side del catálogo completo; filtros live fallan 503 sin conteos/listas falsos.
- El triestado evita convertir defaults heredados en falsos conocidos y bloquea una nueva ficha publicable con `unknown`.
- Reportes usan `new|reviewed|resolved`; overrides mantienen expiración, CAS, tombstone, auditoría e idempotencia.
- Propuestas usan un `status` único `pending|branch_created|committed|pr_open|failed`, con `retryable`, `errorCode` y observaciones separadas `merged/deployed`.
- Horarios, 24h/Tier A, overnight, excepciones, accesibilidad, seguridad de enlaces y pruebas mantienen los contratos del SDD.
- La repetición de una mutación con la misma clave es la recuperación definida; no falta un endpoint adicional por clave.

No hay hallazgos P0. H-12, H-13 y H-14 son P1 y bloquean PASS por contradicciones o fronteras ausentes en DTOs que afectan evidencia, publicación y validación. H-15 es P2. Debe corregirse el candidato, recalcular su SHA y repetir la auditoría sobre el archivo exacto antes de promocionarlo.
