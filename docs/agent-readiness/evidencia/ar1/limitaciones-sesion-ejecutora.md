# AR1 — Limitaciones de esta sesión ejecutora

Esta sesión implementó AR1 en un entorno remoto aislado con salida de red restringida a
un allowlist (GitHub, registro npm y similares). Se comprobó directamente:

```
$ curl -fsS -m 15 https://vet24cr.com/robots.txt
curl: (22) The requested URL returned error: 403

$ node --use-system-ca .claude/skills/agent-readiness/scripts/scan.mjs https://vet24cr.com ...
El escáner devolvió 403: Host not in allowlist: isitagentready.com.
```

Ninguno de los dos comandos llega a su destino real: el 403 lo emite el proxy de
egress de este entorno, no `vet24cr.com` ni `isitagentready.com`. No se sustituye
esta comprobación por una simulación ni se declara `pass` sin haberlo observado.

**Lo que sí se verificó en esta sesión, localmente, antes de proponer el cambio:**

- `npm ci` limpio, 0 vulnerabilidades.
- `npm test`: 37/37 (35 preexistentes + los 2 nuevos de `agent-content-signal.test.ts`).
- `npm run build:no-shorten`: build completo sin errores; `dist/client/robots.txt`
  contiene exactamente `Content-Signal: search=yes, ai-input=yes, ai-train=no` una
  sola vez, dentro del bloque `User-agent: *`, sin alterar `Allow: /` ni `Sitemap:`.
- `npm run check`: 0 errores, 0 warnings (72 hints preexistentes, no relacionados).
- `git diff --name-only` contra `main` limita el cambio a
  `public/robots.txt` y `tests/unit/agent-content-signal.test.ts`, dentro de la
  propiedad de archivos de AR1.

**Pendiente, y por qué corresponde a otra sesión (N9 lo exige de todas formas):**

- AR1-01: `curl.exe -fsS https://vet24cr.com/robots.txt` en producción, después del
  despliegue.
- AR1-02: escaneo completo (22 checks) antes y después del despliegue, con el JSON
  íntegro archivado — no solo el exit code.

Esta sesión no fusiona ni despliega este cambio: abre el PR y deja la verificación
productiva a una sesión con acceso de red real, tal como exige el contrato de AR1.
