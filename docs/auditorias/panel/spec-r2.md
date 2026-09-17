# Segunda auditoría independiente de la especificación del panel I09

Veredicto exacto: **FAIL**

Fecha de auditoría: 2026-09-16 (Costa Rica)  
Auditor: Luna, razonamiento high  
Candidato auditado: `docs/spec-panel-administrativo.md` (r3)  
SHA256 del candidato auditado: `C7C48A2E4F96D05FE23D02707A4D831E7D5C053AF69349723BF8FEC3BA7862AD`  
Snapshot declarado: `docs/auditorias/panel/spec-r3.snapshot.md`  
Base sellada: `24dc03d58ba970710a26bbb1f7f175556c500f14`  
Baseline: `docs/auditorias/panel/base.json`

Se verificó el hash real del archivo candidato y se contrastó la spec completa con el SDD y los contratos exactos de I01/I02/I04/I05/I06/I07/I08/I09/I10/I11, además de los archivos de base sellados. El candidato coincide con el SHA comunicado. No se modificó la spec ni se ejecutaron cambios de código o infraestructura.

## Estado de los cierres anteriores

H-01 (propietarios/secuencia), H-05 (filtros sobre catálogo paginado) y H-06 (inventario de campos) del informe r1 fueron corregidos de forma sustancial. La nueva tabla de owners y la secuencia reflejan el grafo I01–I11; los filtros tienen parámetros cerrados, AND/OR y aplicación sobre el catálogo completo; el inventario enumera el wire, sidecar y triestado. Los hallazgos siguientes impiden todavía PASS.

## Matriz de cobertura

| Requisito | Cobertura de la spec r3 | Evaluación |
| --- | --- | --- |
| R01 | Evidencia por campo, sidecar, fuentes inaccesibles y conflictos | Parcial: DTO de lectura y sidecar usan nombres distintos sin mapeo normativo; triestado aún es ambiguo |
| R02 | `ScheduleV1`, intervalos, estados, overnight, excepciones y preview Costa Rica | Cubierto en §6; consume correctamente I01/#27 |
| R03 | Schema, UUID/slug, coordenadas, flags y evidencia | Parcial: serialización de `unknown` a booleano estricto no tiene una única regla |
| R04 | Catálogo, filtros, paginación, reportes y conteos | Parcial: filtros live y respuesta degradada con D1 caído no tienen resultado cerrado |
| R05 | Editor de ficha, horario, mapa y accesibilidad | Cubierto en §5–§7 y §10 |
| R06 | Overrides, expiración, CAS, tombstone, auditoría e idempotencia | Cubierto en §8.1; consume I05/#31 |
| R07 | Estado público y degradación común | Parcial: degradación de catálogo omite el estado operativo/override vivo |
| R08 | Outbox, PR, conflictos, estados y reintentos | Parcial: `stage`/`status` mantienen una contradicción interna |
| R09 | Access, allowlist, CSRF, hosts, assets y legacy | Cubierto como integración de I04/#30 e I10/#36 |
| R10 | Harness Workers/D1, fixtures y E2E | Cubierto en §11 y por dependencia I10/#36 |
| R11 | Preflight, operación, alertas, retención y rollback | Cubierto como responsabilidad de I11/#37 |
| R12 | SEO, sitemap, Markdown, blog, especies y regresión | Cubierto en I09-A10 |

## Hallazgos

### H-07 — P1 — DTO `sources` no está mapeado al sidecar `fuentes`

Ubicación: §1.1 línea 21 y §5 líneas 108–110.  
Contrato exacto: I02 §4, SDD §4 y §12.5.

La respuesta de detalle se define como `evidence: {status, facts, conflicts, sources}`, mientras que el sidecar que se transporta en la propuesta se define como `{schemaVersion, slug, observedAt, fuentes, facts, conflicts}`. La spec no declara si `sources` es un alias de lectura de `fuentes`, si hay conversión bidireccional, ni qué información se conserva al pasar del DTO al sidecar. Un implementador puede enviar `sources`, omitir `fuentes` y producir una propuesta que parece tener evidencia pero no cumple el contrato I02.

Corrección esperada: fijar un único DTO canónico o declarar explícitamente `evidence.sources` como alias de `evidence.fuentes`, con mapeo 1:1 de URL, tipo, fechas y referencias al construir el sidecar. El POST debe aceptar/transmitir exclusivamente la forma validada por I02 y rechazar pérdida o renombrado parcial de evidencia.

### H-08 — P1 — La serialización de `unknown` a booleano estricto sigue siendo no determinista

Ubicación: §5 líneas 94, 100 y 110, y §8.2 línea 170.  
Contrato exacto: `src/lib/clinic-schema.ts` de la base, I02 §3.2/§4 y SDD §3.2.

La spec correctamente introduce `unknown|true|false` durante el borrador, pero dice que al enviar una ficha publicable un `unknown` “bloquea la propuesta **o** mantiene el registro en `PARTIAL/REVIEW_REQUIRED`”. No define qué JSON se envía para un `unknown`, si el booleano se omite, si se conserva el default heredado, ni cuándo una edición existente puede guardar un registro parcial. Esa disyunción deja abierto el riesgo que la propia spec intenta evitar: convertir el default `false` del wire actual en una negación conocida o aceptar una propuesta publicable sin evidencia.

Corrección esperada: definir una sola regla por operación. Para nueva ficha publicable, cualquier booleano requerido en `unknown` debe bloquear el POST; para edición existente, el servidor debe conservar el valor histórico y marcarlo explícitamente como no confirmado mediante sidecar/estado, sin tratar el default como hecho nuevo. Definir el DTO de borrador y su transformación al schema estricto, incluyendo la forma exacta de rechazo 422. No usar `PARTIAL/REVIEW_REQUIRED` como alternativa silenciosa al bloqueo de una propuesta que pretende publicar una afirmación.

### H-09 — P1 — `stage` y `status` tienen vocabularios incompatibles dentro de la propia spec

Ubicación: §8.2 línea 168 y §8.3 línea 174.  
Contrato exacto: I08 §8 líneas 49–55 y §12.2.

§8.2 define el `stage` normativo como `pending|branch_created|committed|pr_open|failed`. §8.3 define que `stage` usa `pending|branch_created|committed|pr_open` y que `failed` lo acompaña, sin precisar si vive en `status`, `errorCode` o una observación. Además, “`status` conserva el estado durable de I08” no enumera sus valores ni establece si replica `stage`. La UI y el endpoint pueden por tanto divergir al representar un fallo, un retryable o el estado `pr_open`.

Corrección esperada: definir una forma única de respuesta, por ejemplo `status: pending|branch_created|committed|pr_open|failed`, `retryable: boolean`, `stage` sólo como subetapa opcional de la etapa activa, y observaciones separadas `merged`/`deployed`; o definir otra separación equivalente sin contradicción. La forma debe conservar exactamente el estado durable de I08 y mantener `pr_open` como “PR creado, pendiente de revisión”.

### H-10 — P1 — La degradación D1 no cubre estado operativo ni filtros live

Ubicación: §4.1 línea 66 y §9 línea 180.  
Contrato exacto: SDD §7.1, §6.1–§6.2; I05 e I06 criterios de aceptación.

Cuando D1 no está disponible, la spec sólo marca `fields:["alerts","reports"]` como `UNCONFIRMED`. El catálogo también consume overrides/estado operativo vivo, y el SDD exige que un fallo de lectura no se convierta en ausencia de override ni en un estado confirmado. Tampoco se define qué devuelve `alerts=active` o `reports=pending` si la fuente necesaria está caída: devolver páginas de catálogo sin esos filtros, conteos normales o listas vacías produciría resultados falsos.

Corrección esperada: incluir explícitamente `operationalState`/`override` junto con alertas y reportes en la proyección degradada, conservar sólo datos estáticos, marcar el estado vivo `UNCONFIRMED` con `live_unavailable`, y fijar el comportamiento de cada filtro que depende de D1 (por ejemplo, respuesta 503 recuperable o respuesta sin `items/counts` live). Nunca devolver `override:null` ni un conteo filtrado como si la lectura hubiera sido exitosa.

### H-11 — P2 — La sintaxis de listas repetidas de filtros no está fijada

Ubicación: §4.1 líneas 64–66.

La spec exige OR dentro de una lista, pero sólo muestra parámetros escalares y no define si la lista usa claves repetidas, CSV, JSON u otra codificación ni cómo se escapan valores. Es un vacío menor porque puede resolverse dentro del contrato de endpoint, pero debe cerrarse antes de implementar para que cursor, cache key, conteos y pruebas sean reproducibles.

Corrección esperada: fijar una sintaxis, preferiblemente claves repetidas (`estado=publicado&estado=verificado`), su ordenamiento canónico para cursor/hash y rechazo de valores desconocidos.

## Comprobaciones positivas

- El hash del candidato coincide exactamente con el SHA comunicado y la base sellada coincide con `base.json`.
- La propiedad de I01–I11 quedó alineada con el SDD; I09 se presenta como consumidor y no reasigna motores, auth, D1, reportes, propuestas, CI u operación.
- `baseCommit`/`blobSha` para nueva ficha están cerrados (`baseCommit` real de `main`, `blobSha:null`); la edición existente conserva ambos valores y los revalida.
- Los defaults `false`, `""` y `0` del wire actual están tratados como compatibilidad, y `copyDiferenciador`/`bodyMarkdown` se distinguen y preservan.
- Reportes conservan `new|reviewed|resolved`, concurrencia, contacto privado y error real de D1.
- El flujo de propuesta conserva 202 durable, PR pendiente, no auto-merge, reconciliación, retry con la misma clave y no declara `deployed` sin build-info.
- Horarios, 24h/Tier A, overnight, excepciones, accesibilidad, seguridad de enlaces y pruebas mantienen los contratos previos.
- La repetición de una mutación con la misma clave está descrita; no hace falta un endpoint adicional de consulta por clave.

No hay hallazgos P0. H-07, H-08, H-09 y H-10 son P1 y bloquean PASS por afectar evidencia, veracidad de afirmaciones, estados de operación y resultados live. H-11 es P2. Tras corregir los P1, recalcular el SHA y repetir la auditoría sobre el candidato exacto; no se debe promover r3.
