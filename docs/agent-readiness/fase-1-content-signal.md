# AR1 — Política de rastreo

**Spec de producto:** [README.md](README.md), manda sobre este documento.
**Depende de:** PR #11 fusionado; decisión D1 confirmada por el propietario.
**Issue:** [índice de issues](issues/README.md).
**Base:** SHA de main con predecesora fusionada, registrado antes de empezar.
**Roles:** una sesión ejecuta; otra verifica. La sesión que escribió esta entrega no implementa.

## Objetivo y contratos

Publicar la política elegida por el negocio en el robots existente, sin alterar rastreo ni sitemap. Entrada: base main que contiene PR #11 y D1 resuelta en README. Salida: los cuatro checks de AR1 verdes en producción, con evidencia independiente.

## Instrucciones

1. Leer README y D1, aprobada por el propietario el 2026-09-05: `Content-Signal: search=yes, ai-input=yes, ai-train=no`. Implementar esos valores sin reabrir la decisión de negocio.
2. Añadir una sola línea Content-Signal al bloque comodín existente. No crear reglas individuales para bots que ya cubre el comodín.
3. Añadir una prueba del archivo que compruebe los valores de D1, pertenencia al bloque y conservación del sitemap.
4. Ejecutar verificación común, revisión independiente y escaneo completo tras el despliegue del flujo habitual. Registrar todos los estados, no solo el nuevo pass.

## Fuera de alcance y riesgos

No llms, Link, mirrors, API ni configuración Cloudflare. No configurar el panel para sobreescribir robots. Si producción sirve robots diferente al archivo, documentar la respuesta y resolver la procedencia antes de cerrar; no superponer directivas contradictorias. El Content-Signal expresa la política, no garantiza obediencia de rastreadores.

Revertir únicamente el commit AR1 si aún no hay dependientes. No modificar README para elegir ai-train desde una sesión ejecutora.

## Archivos que posee

- `public/robots.txt`
- `tests/unit/agent-content-signal.test.ts`
- `docs/agent-readiness/evidencia/ar1/**`

Todos los demás archivos están protegidos. Aplican las restricciones por archivo compartido del README. `git diff --name-only <BASE>...HEAD` debe ser subconjunto de esta lista; AR2 y AR3 nunca modifican archivos compartidos en paralelo.

## Criterios de aceptación

- [ ] **AR1-01** [N1, D1] `curl.exe -fsS https://vet24cr.com/robots.txt` devuelve 200, conserva `User-agent: *`, `Allow: /` y `Sitemap: https://vet24cr.com/sitemap-index.xml`; contiene exactamente la directiva `Content-Signal: search=yes, ai-input=yes, ai-train=no` aprobada en D1, una sola vez y dentro del bloque comodín.

- [ ] **AR1-02** [N2, N9] Se archiva un escaneo completo antes de modificar la subfase. Después del despliegue, el escaneo completo definido en «Verificación común» devuelve `robotsTxt=pass`, `sitemap=pass`, `robotsTxtAiRules=pass` y `contentSignals=pass`; se archiva el JSON íntegro, fecha, commit desplegado y estados de todos los checks, sin convertir la salida 0 del script en una prueba de éxito.

- [ ] **AR1-03** [N8, N10, D6] La verificación común pasa; `git diff --name-only <BASE>...HEAD` solo contiene archivos de la lista de propiedad AR1. Una sesión distinta documenta la comprobación HTTP en `docs/agent-readiness/evidencia/ar1/`, sin cambios de producto fuera de robots.
