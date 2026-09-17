# Quinta auditoría independiente de la especificación del panel I09

Veredicto exacto: **PASS**

Fecha de auditoría: 2026-09-16 (Costa Rica)  
Auditor: Luna, razonamiento high  
Candidato auditado: `docs/spec-panel-administrativo.md` (r6 comunicado; etiqueta interna r4)  
SHA256 del candidato auditado: `264BCB0159496116373F99F1808E405C6D8D8D796FD693139560D6530E658F2B`  
Snapshot declarado: `docs/auditorias/panel/spec-r6.snapshot.md`  
Base sellada: `24dc03d58ba970710a26bbb1f7f175556c500f14`  
Baseline: `docs/auditorias/panel/base.json`

Se verificó el hash real del archivo candidato y se contrastó la spec completa con el SDD y los contratos exactos de I01/I02/I04/I05/I06/I07/I08/I09/I10/I11, además de `src/lib/clinic-schema.ts`, `src/lib/schedule.ts`, `src/lib/admin/auth.ts`, `src/worker.ts` y `src/middleware.ts` del baseline. El candidato coincide con el SHA comunicado. No se modificó la spec ni se ejecutaron cambios de código o infraestructura.

## Matriz de cierres H-01–H-17

| Hallazgo previo | Estado en r6 | Evidencia de cierre |
| --- | --- | --- |
| H-01 | Cerrado | §2 y §12 asignan I01–I11 conforme al SDD y mantienen I09 como consumidor |
| H-02 | Cerrado | §8.2–§8.3 usan estado durable normativo de I08 |
| H-03 | Cerrado | §5 define el sidecar canónico completo y sus reglas |
| H-04 | Cerrado | §4/§9 fijan degradación D1 y no confunden fallo con ausencia |
| H-05 | Cerrado | §4.1 define todos los filtros, AND/OR y paginación server-side |
| H-06 | Cerrado | §5 separa inventario actual y DTO futuro |
| H-07 | Cerrado | §1.1/§5 separan `EvidenceView` y `EvidenceSidecar` sin alias |
| H-08 | Cerrado | §5 deja `unknown` local y bloquea nueva publicación con 422 |
| H-09 | Cerrado | §8.2/§8.3 fijan `status` único y `stage` repetido opcional |
| H-10 | Cerrado | §4/§9 cubren estado operativo, override y filtros live |
| H-11 | Cerrado | §4.1 fija claves repetidas sin CSV/JSON y orden canónico |
| H-12 | Cerrado | GET usa envelope con sidecar; POST usa sólo sidecar |
| H-13 | Cerrado | `unknownFields` es sólo `DraftState`, nunca request/schema |
| H-14 | Cerrado | `schedule_v1` ausente en wire antiguo y nullable sólo local |
| H-15 | Cerrado | requiredness/tipos actuales (`id`, campos opcionales) quedan alineados |
| H-16 | Cerrado | §8.2 exige latitud/longitud verificables y evidencia para propuesta publicable |
| H-17 | Cerrado | `counts:{totalFiltered:number}` se calcula antes de paginar; filtros live caídos dan 503 sin counts live |

## Matriz de cobertura

| Requisito | Cobertura r6 | Evaluación |
| --- | --- | --- |
| R01 | EvidenceView/Sidecar, fuentes por campo, conflictos, limitaciones y no invención | Cubierto |
| R02 | ScheduleV1, parser/serialización consumidos, intervalos, overnight, excepciones y preview | Cubierto |
| R03 | Tipos, requiredness, UUID/slug, coordenadas, flags y validación sidecar | Cubierto |
| R04 | Catálogo, filtros, paginación, reportes, counts y degradación | Cubierto; observación P2 H-18 |
| R05 | Editor de ficha/horario/mapa con estados y accesibilidad | Cubierto |
| R06 | Overrides, expiración, CAS, tombstone, auditoría e idempotencia | Cubierto |
| R07 | Proyección pública consumida por I06 y estado live no confirmado tras fallo | Cubierto; observación P2 H-18 |
| R08 | Outbox, estados normativos, PR, conflictos, retry y no auto-merge | Cubierto |
| R09 | Access, allowlist, CSRF, hosts, assets, headers y legacy | Cubierto |
| R10 | Harness Workers/D1, fixtures, E2E y regresión | Cubierto |
| R11 | Preflight, operación, alertas, retención y rollback | Cubierto |
| R12 | SEO, sitemap, Markdown, blog, especies y preservación | Cubierto |

## Observaciones no bloqueantes

### H-18 — P2 — Forma de campos live por ítem durante fallo D1

Ubicación: §4.1 y §9.

La spec fija correctamente 503 para filtros `alerts`/`reports` cuando D1 cae y permite conservar sólo campos estáticos con estado operativo no confirmado. Para consultas sin filtro live, no define si las propiedades de ítem `alerta activa` y `reportes pendientes` se omiten, se exponen como estado triestado o se acompañan de `liveState`. La conducta segura está implícita (no inventar datos), por lo que no bloquea PASS.

Corrección sugerida: documentar en la implementación que esas propiedades no se serializan como `false` ante fallo; se omiten o llevan `UNCONFIRMED/live_unavailable`, mientras contacto, horario y demás campos estáticos permanecen disponibles.

### H-19 — P2 — Etiqueta de revisión interna desactualizada

Ubicación: encabezado de `docs/spec-panel-administrativo.md`.

El archivo se identifica como `Revisión: r4`, aunque el candidato comunicado y auditado es r6. El hash y el snapshot identifican sin ambigüedad el artefacto promovido, por lo que no es un bloqueo contractual.

Corrección sugerida: alinear la etiqueta de revisión con el identificador usado en el registro de auditoría, sin modificar contenido normativo fuera de esa metadata.

## Comprobaciones positivas

- El SHA real coincide exactamente con el comunicado y el commit base coincide con `base.json`.
- H-01–H-17 están cerrados en el texto r6; no quedan hallazgos P0 ni P1.
- `EvidenceView` y `EvidenceSidecar` tienen fronteras inequívocas; `status` no se persiste en el sidecar.
- `unknownFields` es sólo estado local; las nuevas fichas con booleanos desconocidos reciben 422 y nunca convierten defaults en falsos conocidos.
- `schedule_v1` antiguo se omite, `scheduleDraft:null` es local y las propuestas publicables exigen horario válido si se modifica.
- El inventario distingue requiredness del wire actual y DTO futuro I02; `id` histórico conserva `number|string` y se normaliza para comparar.
- Filtros repetidos, `counts.totalFiltered`, 503 live y estado operativo no confirmado tienen comportamiento reproducible.
- Nuevas fichas no pueden proponerse publicables sin coordenadas válidas/evidencia; la limitación sin ubicación conserva sólo el borrador local.
- Reportes, overrides, idempotencia, estados de propuestas, Tier A, horarios, enlaces, accesibilidad, pruebas, preflight y regresión mantienen los contratos del SDD.
- No se exige infraestructura remota ni se presenta implementación futura como existente.

Con el SHA indicado, la spec es implementable sin contradicciones ni vacíos bloqueantes. H-18 y H-19 son observaciones P2 y no impiden PASS.
