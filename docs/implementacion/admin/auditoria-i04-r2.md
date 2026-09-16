# Auditoría independiente I04 r2

**Estado: RECHAZADO (pendiente de corrección P1).**

Revisión del snapshot fuente estabilizado el 2026-09-16. No ejecuté build ni modifiqué código. El build/bundle e integración Miniflare quedaron fuera de esta revisión porque estaban siendo ejecutados por el agente principal.

## Resultado

La implementación ahora tiene una guardia compartida Worker/middleware, validación RS256/JWKS con claims obligatorios, allowlist por `sub`, rechazo de rutas ambiguas, headers privados/no-store y tombstones directos antes de redirects Astro. Las pruebas focalizadas ejecutadas localmente pasaron: `node --test tests/unit/admin-auth.test.ts tests/unit/runtime-boundary.test.ts` → 10 PASS, 0 FAIL.

## Hallazgos

### P1-01 — `guardAdmin` consume el body antes de entregar la request al handler

`src/lib/admin/auth.ts:93-108` obtiene un reader de `request.body`, lee y valida el JSON, y libera el stream. `src/worker.ts:19-26` después entrega la misma `request` a `officialHandler.fetch`. Por tanto, una mutación autorizada no podrá volver a ejecutar `request.json()`/leer el body en su endpoint; el guard no devuelve el payload validado ni reconstruye una request. El comentario del código reconoce que I05 debe pasar el payload, pero el Worker actual no implementa esa transferencia. Al habilitar cualquier POST/PUT/PATCH/DELETE, esto produce fallo funcional y puede convertir una operación válida en error. Debe pasar el cuerpo validado de forma explícita o reconstruir la request conservando headers y método antes del handler.

### P1-02 — La prueba de bundle/integración queda sin evidencia en esta auditoría

`tests/integration/admin-worker.test.mjs` depende de `dist/server/wrangler.json` y `dist/client`; `scripts/admin/check-runtime-boundary.mjs --bundle <ruta>` también requiere el artefacto generado. No ejecuté build por coordinación con el agente principal, así que no se acredita aún que el bundle real conserve los tombstones, no genere assets admin estáticos, mantenga headers/HEAD y no redirija las rutas legacy. El gate fuente sí pasó mediante `tests/unit/runtime-boundary.test.ts`, pero el estado I04 no puede marcarse aprobado hasta adjuntar el resultado del gate `--bundle` y la integración compilada.

## Observaciones que pasan

- `src/lib/admin/auth.ts` valida origen configurado, configuración completa, dominio HTTPS sin path/credenciales, RS256, issuer, audience, exp/nbf/sub y allowlist; cachea JWKS acotada a cuatro dominios con cooldown.
- `src/worker.ts` ejecuta `guardAdmin` antes del adapter para `/admin` y `/api/admin`, propaga identidad por `context.props` mediante Proxy y aplica headers privados/no-store/noindex; las rutas legacy se despachan antes de la canonicalización.
- `src/middleware.ts` reutiliza `guardAdmin`, toma identidad interna de `context.locals.cfContext.props` y evita canonicalización 301 para `/api/`.
- `status-override` devuelve GET/HEAD 503 y métodos restantes 405; analytics y cron tombstone devuelven 410, con HEAD sin cuerpo.
- `scripts/admin/check-runtime-boundary.mjs` inspecciona inventario de API, handlers `functions/`, referencias Pages/Functions, `ADMIN_SECRET` y bundle cuando se le entrega `--bundle`.
- El endpoint de reportes público se mantiene fuera del alcance I04, conforme a I07/I33.

## Evidencia y hashes

| Evidencia | Resultado |
|---|---|
| `node --test tests/unit/admin-auth.test.ts tests/unit/runtime-boundary.test.ts` | 10 PASS, 0 FAIL |
| `npm run check:runtime-boundary` vía prueba de inventario fuente | PASS |
| Build/bundle Miniflare | No ejecutado por esta auditoría; pendiente evidencia del agente principal |

| Archivo | SHA-256 |
|---|---|
| `src/lib/admin/auth.ts` | `E15FD814A2DB0BAE1101B93524EF0E75AE9A75F3242759BB112CA07A160F3F2B` |
| `src/worker.ts` | `BD707D9E8449119C5FC343180CB2DD6D5A6C94127F508278DC6E437178AFD9BA` |
| `src/middleware.ts` | `8988CFCA75C605ED98480FD5116F93439B49F39038CD2C9A069D0323B14C50D0` |
| `scripts/admin/check-runtime-boundary.mjs` | `2BDF2D3704A22E9C1357FD0EB9F81606E5733AEBAD01C7B7BF6CADF34031CB3C` |

