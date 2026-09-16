# Adenda de auditoría independiente I04 r4

**Estado: APROBADO (se mantiene la aprobación de r3).**

Se revisó el refuerzo final del gate y de las pruebas, sin cambios al runtime de auth/Worker/middleware. El gate ahora lee el `wrangler.json` del bundle, exige exhaustivamente las siete rutas API permitidas del manifest compilado y valida el directorio de assets decodificando rutas y comprobando mayúsculas. Las pruebas añadieron rechazo de API extra en manifest y llamada directa al middleware compilado omitiendo el wrapper Worker.

## Evidencia final

- `node scripts/admin/check-runtime-boundary.mjs --bundle dist/server` → `runtime boundary PASS (52 files, bundle)`.
- `node --test tests/unit/runtime-boundary.test.ts tests/integration/admin-worker.test.mjs` → 9 PASS, 0 FAIL.
- La integración confirma Worker compilado con fixture JWKS RS256, D1 efímero, matriz de host/claims/métodos/assets/tombstones y middleware directo; la llamada directa al middleware devuelve 401/403 y no expone `PRIVATE FIXTURE`.

No aparecen hallazgos nuevos. La transferencia del body señalada en r2 permanece invalidada: las mutaciones I04 fallan cerrado antes del adapter; el payload deberá transferirse cuando I05 introduzca escrituras reales.

## Hashes SHA-256 actualizados

| Archivo | SHA-256 |
|---|---|
| `scripts/admin/check-runtime-boundary.mjs` | `98C0F33CEBFCCF1C3FF1B546B39E49AE089466A56C6BDEBB21B5D7F5A6AB12D8` |
| `tests/unit/runtime-boundary.test.ts` | `3BFA7721F2CCC117179488548A0809828ADDB0A83A889F1D9D901A2137D7B04B` |
| `tests/integration/admin-worker.test.mjs` | `EBA3E63D4304800051767ECC6FA48BC0F04F3BD9E31536D2474B19DC5734581B` |

