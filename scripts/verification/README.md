# Verificación del upgrade

Ejecutar desde la raíz del repositorio, con dependencias instaladas. BASE y
NEW son directorios `dist/client` de los dos builds; OUT queda fuera del repo.
La portada es SSR: iniciar ambos Workers con su propio Wrangler y configuración
generada `dist/server/wrangler.json`, puertos 8081 y 8082, modo local y un
`--persist-to` fuera de los artefactos. En Windows el Worker base necesita una
instalación de Wrangler fuera del repo para no bloquear futuras instalaciones.

```powershell
$env:NODE_USE_SYSTEM_CA = '1'
$env:VET_BASE_URL = 'http://localhost:8081'
$env:VET_NEXT_URL = 'http://localhost:8082'
node scripts/verification/verify-browser.mjs . BASE NEW OUT
node scripts/verification/token-text.mjs . BASE NEW OUT/text.json
node scripts/verification/inspect-inline.mjs . BASE NEW OUT/inline.json
node scripts/verification/check-endpoints.mjs http://localhost:8081 OUT/base-endpoints.json
node scripts/verification/check-endpoints.mjs http://localhost:8082 OUT/new-endpoints.json
```

Guardar además el HTML de `/` desde ambos Workers y compararlo con los scripts
de texto usando carpetas que contengan ese `index.html`. Los scripts de texto
producen candidatos que requieren clasificación del contenedor; no prueban
por sí solos que un cambio de espacios sea inocuo. El script de endpoints
registra respuestas, no declara automáticamente equivalencia.

`visual-routes.txt` contiene la muestra por plantilla de esta migración.
El comparador visual ejecuta base/base antes de base/nuevo, prueba cuatro
perfiles y guarda PNG y report.json. Publicidad/CMP y tiles externos quedan
excluidos explícitamente. La UI usa respuestas API simuladas; los GET seguros
se verifican por separado y nunca se envían correos reales.

El pipeline reproducible es el workflow `.github/workflows/ci.yml`.
