# Cuarta auditoría independiente de la especificación del panel I09

Veredicto exacto: **FAIL**

Fecha de auditoría: 2026-09-16 (Costa Rica)  
Auditor: Luna, razonamiento high  
Candidato auditado: `docs/spec-panel-administrativo.md` (r5 comunicado)  
SHA256 del candidato auditado: `9A9957AF7BDDCF3D94BEC8C50FC80023AA30EEDE6F9867A6A803DE57EAB86FC3`  
Snapshot declarado: `docs/auditorias/panel/spec-r5.snapshot.md`  
Base sellada: `24dc03d58ba970710a26bbb1f7f175556c500f14`  
Baseline: `docs/auditorias/panel/base.json`

Se verificó el hash real del candidato y se contrastó su contenido completo con el SDD y los contratos exactos de I01/I02/I04/I05/I06/I07/I08/I09/I10/I11, además de los archivos de base sellados. El candidato coincide con el SHA comunicado. No se modificó la spec ni se ejecutaron cambios de código o infraestructura.

## Cierre de hallazgos anteriores

H-01–H-06 quedaron corregidos: owners y secuencia coinciden con el grafo del SDD; los filtros son server-side y paginables; y el inventario de campos separa wire actual de contrato futuro. H-07/H-12 (evidence DTO), H-08/H-13 (triestado), H-09 (status/stage), H-10 (degradación D1), H-11 (listas repetidas) y H-14 (schedule nullable) también están corregidos en r5. H-15 (requiredness del wire base) quedó corregido mediante la distinción explícita de campos opcionales actuales y futuros.

## Matriz de cobertura

| Requisito | Cobertura de r5 | Evaluación |
| --- | --- | --- |
| R01 | `EvidenceView` y `EvidenceSidecar` separados, fuentes por campo, conflictos y limitaciones | Cubierto |
| R02 | `ScheduleV1`, intervalos, estados, overnight, excepciones y preview Costa Rica | Cubierto; wire antiguo omite el campo y draft nullable queda local |
| R03 | Tipos/requiredness, UUID/slug, coordenadas, flags y evidencia | Parcial: la regla de coordenadas para nueva propuesta no distingue draft de publicable; H-16 |
| R04 | Catálogo, filtros, paginación, reportes, conteos y degradación | Parcial: el shape de `counts` no está definido; H-17 |
| R05 | Editor de ficha, horario, mapa y accesibilidad | Parcial por la frontera de nueva ficha en H-16 |
| R06 | Overrides, expiración, CAS, tombstone, auditoría e idempotencia | Cubierto en §8.1; consume I05/#31 |
| R07 | Estado público, override y degradación común | Cubierto: estado operativo/override se marcan no confirmados y filtros live devuelven 503 |
| R08 | Outbox, PR, estados, conflictos y reintentos | Cubierto: status único normativo y `merged/deployed` observados por separado |
| R09 | Access, allowlist, CSRF, hosts, assets y legacy | Cubierto como integración I04/#30 e I10/#36 |
| R10 | Harness Workers/D1, fixtures y E2E | Cubierto en §11 y por I10/#36 |
| R11 | Preflight, operación, alertas, retención y rollback | Cubierto como responsabilidad de I11/#37 |
| R12 | SEO, sitemap, Markdown, blog, especies y regresión | Cubierto en I09-A10 |

## Hallazgos

### H-16 — P1 — “Coordenadas o limitación” no cierra la publicación de una ficha nueva

Ubicación: §8.2, línea 170; el tipo `NewProposal` está en §5.  
Contrato exacto: SDD §3.2 y §7.2; I02 criterios de validación; I09 criterios de aceptación.

La spec dice que una nueva ficha permanece como borrador hasta que el servidor valide “coordenadas **o** limitación explícita”, evidencia y cuerpo. El único POST definido para nueva ficha es `POST /api/admin/clinic-proposals`; no existe un endpoint de guardado de borrador. El SDD permite `null` sólo para borradores sin ubicación y exige coordenadas verificables para nuevas fichas publicables. Al aceptar la alternativa “limitación explícita” sin nombrar un estado no publicable, un implementador puede encolar una propuesta permanente con ubicación nula que la UI considere lista, aunque el contrato de publicación la prohíbe.

Corrección esperada: separar las dos rutas semánticas. `NewDraftState` local puede tener coordenadas `null` y una limitación; el POST de propuesta publicable debe rechazar `null`/limitación con 422 y exigir coordenadas verificables, o definir de manera explícita una operación durable de borrador no publicable que no cree PR/ruta pública y tenga estado distinto. En cualquiera de los casos, la UI debe mostrar que la limitación mantiene el borrador y nunca satisface el requisito de ficha publicable.

### H-17 — P2 — `counts` se usa pero no tiene shape de respuesta

Ubicación: §4.1, líneas 64–66 y 68.  
Contrato relacionado: SDD §6.2 y §7.2; I09-A1.

La respuesta se ejemplifica como `{items,nextCursor,baseCommit,generatedAt}`, pero el texto exige calcular `counts` antes de responder y la UI muestra contadores dinámicos. No se declara si `counts` es un objeto por filtro, por estado, por categoría, o si se deriva sólo de `items`. Esto no bloquea el diseño porque puede cerrarse como DTO adicional, pero deja pruebas y consumo sin forma estable.

Corrección esperada: declarar el campo y su forma, por ejemplo `counts:{total,visible,byEstado,byIssue,byVerification,byAlert,byReport}`, calculado sobre el mismo conjunto filtrado y ausente o marcado no disponible cuando D1 impide el conteo live.

## Comprobaciones positivas

- El SHA real coincide exactamente con el comunicado y el commit base coincide con `base.json`.
- H-12 está cerrado: `EvidenceView` contiene `status` y `sidecar`; `EvidenceSidecar` es el único cuerpo de POST y no persiste status.
- H-13 está cerrado: `unknownFields` es exclusivamente estado local de `DraftState`; el POST canónico no lo incluye y `unknown` nuevo produce 422.
- H-14/H-15 están cerrados: `schedule_v1` antiguo se omite en vez de enviar `null`, y requiredness/tipos actuales (incluido `id` number|string) están separados del futuro I02.
- Ownership y secuencia I01–I11 siguen alineados con el SDD; no se reasignan responsabilidades ni se exige gate remoto para esta spec.
- Filtros usan claves repetidas, validación cerrada, AND/OR y 503 sin resultado falso cuando faltan datos live.
- Reportes, overrides, idempotencia, estados de propuestas, 24h/Tier A, horarios, enlaces, accesibilidad, pruebas y límites de producción conservan los contratos aprobados.
- `baseCommit`/`blobSha` nueva y existente, `copyDiferenciador`/`bodyMarkdown`, defaults heredados y no publicación antes de merge/build están expresamente tratados.

No hay hallazgos P0. H-16 es P1 y bloquea PASS porque puede permitir una propuesta nueva sin coordenadas verificables. H-17 es P2. Debe corregirse H-16, recalcular el SHA y repetir la auditoría sobre el archivo exacto; H-17 puede resolverse en la misma revisión.
