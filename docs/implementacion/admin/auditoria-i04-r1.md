# Auditoría independiente I04 r1

**Estado: RECHAZADO.**

Auditoría realizada sobre el árbol de trabajo actual de `veterinarias-cr` el 2026-09-16. No se modificó código de runtime, no se hizo build y no se realizó despliegue. El árbol tenía cambios sin commit; por ello los hashes siguientes identifican el snapshot auditado y no un commit.

## Hallazgos

### P0-01 — La frontera de middleware no autentica las familias administrativas

`src/middleware.ts:7-12` solo devuelve 405 para métodos no GET/HEAD de `/admin`; no llama a `authenticate` ni comprueba JWT, `iss`, `aud`, `exp`, `nbf` o `sub`. La autenticación existe en `src/worker.ts:7-8`, pero el contrato exige también protección en middleware, antes de canonicalizar, para la invocación directa del handler Astro y para defensa ante delegación inesperada. Una llamada al adapter que omita el wrapper Worker puede alcanzar las páginas admin sin la guardia normativa. Debe existir una única guardia reutilizable en ambas capas y una prueba que invoque el handler sin pasar por el Worker.

### P1-02 — No hay rechazo explícito de rutas ambiguas codificadas o variantes de familia

`src/lib/admin/auth.ts:36-41` compara el pathname recibido literalmente y `src/worker.ts:7` usa esa misma comparación. No se rechazan separadores codificados (`%2f`, `%5c`), segmentos codificados (`%61dmin`) ni variantes de mayúsculas antes de delegar/canonicalizar. El SDD exige rechazar codificaciones ambiguas y cubrir variantes `admin`, `admin/`, `admin/index.html`, slash de API y mayúsculas para impedir que una representación alternativa termine en assets o en otra ruta. La ausencia de una normalización/rechazo explícito deja una vía de bypass dependiente del router/asset handler.

### P1-03 — El gate de frontera no audita el bundle generado ni las rutas de escritura

`scripts/admin/check-runtime-boundary.mjs:13-19` solo inspecciona `src`, configuración y workflows seleccionados. No inspecciona `dist`/bundle generado, no mantiene un manifiesto de rutas permitidas y no descubre rutas de escritura legacy adicionales. El contrato de §12.8 exige gate de fuente **y bundle**, inventario dinámico de todos los handlers y detección de otra ruta de escritura. `npm run check:runtime-boundary` retorna `runtime boundary PASS`, pero ese PASS no demuestra la aceptación completa.

### P1-04 — Las pruebas no ejercitan JWT/JWKS reales ni la frontera de middleware

`tests/unit/admin-auth.test.ts:5-29` cubre familia, configuración ausente, host/CSRF y método, pero no firma RS256/JWKS, `kid` desconocido/refresco, firma forjada, `aud`/`iss`/`exp`/`nbf` inválidos, `sub` fuera de allowlist, ni invocación directa de middleware/HTML/assets. El contrato exige esos casos y una configuración fixture aislada. El resultado de `npm run test:unit -- --test-name-pattern='admin|run_worker_first|sitemap'` fue 92 tests, 92 PASS, pero la cobertura ausente impide acreditar esos criterios.

### P1-05 — El límite/guard de mutaciones existe sin integración en una ruta de mutación administrativa

`src/lib/admin/auth.ts:68-78` define `enforceMutation`, incluido límite de 64 KiB, Origin, Fetch Metadata y `X-Vet24-Admin`, pero `rg` muestra que solo lo importa el test (`tests/unit/admin-auth.test.ts:3`); ninguna ruta bajo `src/pages/api/admin/**` lo invoca. Actualmente las páginas admin son placeholders y fallan cerrado por la frontera Worker, pero I04 no deja una integración verificable del guard para cuando se habiliten operaciones. La futura implementación debe conectar auth + allowlist + guard, y las operaciones aún no implementadas deben seguir en 405/503 sin efectos.

### P1-06 — El endpoint público de reportes mantiene cuerpo y fallo de escritura sin política I04 verificable

Como dependencia de I07, `src/pages/api/report-incorrect/index.ts:22-29` llama `request.json()` sin límite previo de tamaño/content-type, y `:36-61` captura cualquier fallo D1 y continúa; `:68-75` puede responder `success:true` en fallback sin binding. Esto no prueba el guard administrativo de I04 y debe quedar explícitamente cubierto por I07 antes de habilitar el flujo, porque contradice el invariante de que ningún éxito encubre una escritura fallida si el reporte se considera operación persistente.

## Evidencia de comandos

- `npm run check:runtime-boundary` → `runtime boundary PASS` (PASS parcial; no cubre `dist`).
- `npm run test:unit -- --test-name-pattern='admin|run_worker_first|sitemap'` → 92 PASS, 0 FAIL; no contiene fixtures JWT/JWKS reales.
- `functions/` conserva solo el directorio vacío `functions/api`; los cuatro handlers `.js` no están presentes en el snapshot auditado.
- Sitemap: `astro.config.mjs:14-16` excluye `admin`, `api`, `auth.md`, `llms.txt`, `.well-known` y `md`; no se observó inclusión administrativa en la configuración.

## Hashes SHA-256 del snapshot auditado

| Archivo | SHA-256 |
|---|---|
| `src/lib/admin/auth.ts` | `DA15F3AA99DB7CDB5B5DBC9CB0624E6BD8980A2B4035C61D874EED324F715004` |
| `src/worker.ts` | `89FE9072BA4BA7EDBA0F6CB3E3B42A0A6C9C2320AE7C4A281B9A32CF29CAF20C` |
| `src/middleware.ts` | `F54FA4433A98F8711653B50180DDB2F14C1F29569F699AC9A425A424A4F1C387` |
| `wrangler.toml` | `F2BC32A0B77B566E6086A99156177DFC8E8C2A5BC9F819BFE3CCBFFE2BE143EA` |
| `scripts/admin/check-runtime-boundary.mjs` | `09B7801710F78AB5B3A02B09B91DF21303CC0E71E1DAD95562534A78638CA4CC` |
| `src/pages/api/status-override.ts` | `CF909FE546565D219624518B70305C1514B38E9D799985F6FE98630F7A37D3A8` |
| `src/pages/api/cron-check-links.ts` | `1FA823F0BD3E4B6C1BE5961BA5C6434642A175507CF6CAB498A31308133699CB` |
| `src/pages/api/analytics.ts` | `1FA823F0BD3E4B6C1BE5961BA5C6434642A175507CF6CAB498A31308133699CB` |
| `src/pages/api/report-incorrect/index.ts` | `4B637CDDA27682B7E9C1966286E5C7CC3B47B8819969C57E750686F8FE45413B` |
| `astro.config.mjs` | `675C1F27FB8CDA24EAE930C24590A452AD56FC6EE7999F17323F2D5E3906738E` |

