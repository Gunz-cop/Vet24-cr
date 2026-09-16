# Auditoría independiente I04 r3

**Estado: APROBADO.**

Reauditoría del snapshot final de I04 el 2026-09-16. No se modificó código ni se ejecutó build.

La revisión confirma guardia compartida Worker/middleware, validación RS256/JWKS y claims obligatorios (`iss`, `aud`, `exp`, `nbf`, `sub`), allowlist de `sub`, host/configuración fail-closed, rechazo de rutas ambiguas, headers `private, no-store` + `noindex,nofollow`, HEAD sin cuerpo, tombstones antes de redirects y retiro de `functions/`.

## Corrección de r2

El hallazgo P1-01 de r2 queda **invalidado**. Aunque `enforceMutation` consume el body, `guardAdmin` devuelve una respuesta 503 para toda mutación aún no implementada (`src/lib/admin/auth.ts`, tramo final de `guardAdmin`), y `src/worker.ts` retorna inmediatamente cuando `auth.response` existe, antes de llamar a `officialHandler.fetch`. En I04 ningún body consumido llega al adapter ni se ejecuta escritura. La transferencia/reconstrucción del payload corresponde a I05 al introducir operaciones reales.

## Evidencia ejecutada

- `node --test tests/unit/admin-auth.test.ts tests/unit/runtime-boundary.test.ts` → 10 PASS, 0 FAIL.
- `node --test tests/integration/admin-worker.test.mjs` → 1 PASS, 0 FAIL. Incluye fixture JWKS RS256, workerd real, D1 efímero, matriz de host/métodos/claims/assets/tombstones y comparación de DB.
- `node scripts/admin/check-runtime-boundary.mjs --bundle dist/server` → `runtime boundary PASS (34 files, bundle)`.

El endpoint público de reportes permanece fuera del alcance I04, bajo I07/I33. No se observaron handlers `functions/` ejecutables ni assets admin estáticos en el gate del bundle. La aprobación queda limitada a la implementación y artefactos verificados por estas pruebas; despliegue remoto/Access real sigue siendo validación operacional posterior.

## Hashes SHA-256

| Archivo | SHA-256 |
|---|---|
| `src/lib/admin/auth.ts` | `E15FD814A2DB0BAE1101B93524EF0E75AE9A75F3242759BB112CA07A160F3F2B` |
| `src/worker.ts` | `BD707D9E8449119C5FC343180CB2DD6D5A6C94127F508278DC6E437178AFD9BA` |
| `src/middleware.ts` | `8988CFCA75C605ED98480FD5116F93439B49F39038CD2C9A069D0323B14C50D0` |
| `scripts/admin/check-runtime-boundary.mjs` | `2BDF2D3704A22E9C1357FD0EB9F81606E5733AEBAD01C7B7BF6CADF34031CB3C` |

