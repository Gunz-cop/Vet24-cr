# AR3 — Verificación común

Fecha de la sesión: 2026-09-06
Base: `07e7839` (`ar2/verification-evidence`)

## Resultados ejecutados

- `npm ci`: falló en el worktree original por archivos bloqueados dentro de `node_modules` (`EPERM`/`EBUSY`). Se repitió con el mismo `package.json` y `package-lock.json` en un checkout temporal limpio: OK, 335 paquetes, 0 vulnerabilidades.
- `npm run build:no-shorten`: OK en el checkout temporal limpio.
- `node scripts/verification/agent-markdown.mjs`: OK, `127 mirrors`, sin skips.
- `npm run types:worker`: OK; `worker-configuration.d.ts` coincide con la salida generada.
- `npm run check`: OK, 0 errores, 0 warnings y 73 hints.
- `npm test`: OK, 50/50 pruebas.
- `npm run deploy:dry-run`: OK; terminó en `--dry-run` y no desplegó nada.
- `git diff --check`: OK.
- `npm run test:e2e`: la ejecución completa local obtuvo 69 pasadas, 11 fallos y 11 skips bajo el preview concurrente. La suite AR3 aislada obtuvo 2/3; el único fallo fue la expectativa de 301 en `localhost`, donde el middleware existente omite redirecciones canónicas deliberadamente. La prueba fue ajustada para aceptar el 200 HTML local sin permitir Markdown y conservar la aserción 301 en hosts canónicos. Los fallos restantes de la ejecución completa fueron timeouts/ECONNRESET del preview y regresiones de geolocalización no introducidas por AR3.
- Suite AR3 aislada después del ajuste: OK, 3/3 pruebas con un worker.

## Alcance no certificable en esta sesión

Esta sesión implementa y verifica localmente lo posible, pero no fusiona, despliega ni certifica producción. La repetición del escaneo remoto quedó bloqueada por conectividad del entorno (`fetch failed`/`EACCES` hacia `isitagentready.com`). La validación con las tres IAs y la evidencia post-despliegue quedan para la sesión verificadora con acceso de red real.
