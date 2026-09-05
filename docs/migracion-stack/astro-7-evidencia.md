# Migración Astro 6 → 7

## Alcance y línea base

Fase de stack únicamente. Se conservan contenido, datos de clínicas, SEO y blog.
Las skills `verificar-upgrade` y `agent-readiness` se copiaron completas desde
DescargasIA; agent-readiness no se ejecutó. No se abrió PR ni se desplegó a producción.

La línea base se construyó antes de modificar archivos versionados, con `npm ci`
y `npx --no-install astro build`, desde `d8b703f406b6de3bd69d40f1eec85d29f6ecb2b2`.
`npm run build` incluye el acortador Linkzip, que puede llamar a una API y modificar
la caché; se usó la compilación directa para evitar efectos ajenos a la migración.
La nueva variante `build:no-shorten` permite repetir esa compilación.

Artefactos locales: `C:/Users/grcx1/AppData/Local/Temp/vet24-astro7-verif/base/`:
`dist/`, `rutas.txt`, `commit.txt`, `npm-ci.log`, `build.log`, `e2e.log`.
El adaptador original emite HTML en `dist/client/` y Worker en `dist/server/`.
La copia completa contiene 130 páginas HTML. Puede reconstruirse con un worktree
del SHA indicado si se limpia el directorio temporal.

## Compuerta previa

El repositorio no tenía workflows de GitHub Actions ni typecheck ejecutable.
Se agregó una compuerta sobre Astro 6 antes del salto: instalación limpia, build
sin acortador, regeneración y diff de tipos del Worker, `astro check`, `tsc`,
35 tests unitarios, dry-run y Playwright. Node 24 ejecuta los tests TypeScript.
`.env.ci` no contiene secretos y evita que el entorno personal contamine tipos.

El primer chequeo encontró errores preexistentes: acceso a aliases opcionales,
indexación de la caché JSON, declaraciones `cloudflare:workers`, tipos de JSON
de respuestas y mocks de Geolocation/Date. Las correcciones conservan el
comportamiento y no editan datos ni textos del sitio.

E2E original sobre Astro 6: **69 passed, 11 skipped, 3 failed** (83 pruebas).
Los tres fallos eran expectativas obsoletas: título antiguo, diez marcadores
de Cartago en vez de las clínicas actuales, y Ramírez como clínica más cercana
cuando Medical Care está más cerca de la coordenada simulada. Se actualizaron
los tests, incluido el conteo de marcadores contra las tarjetas geolocalizadas.
Los once skips originales del formulario siguen siendo una limitación explícita.

## Fuentes y revisión de cambios

Referencias de solo lectura clonadas:

- CuidaTuPerroViejo `58b7bc3f121dbbca8116f1fa73d9e3c26593f067`:
  [postmortem](https://github.com/Gunz-cop/CuidaTuPerroViejo/blob/58b7bc3f121dbbca8116f1fa73d9e3c26593f067/docs/migracion-stack/postmortem-astro-4-a-7.md)
  y README de migración.
- DescargasIA `07b0133ffd6ba906b94089e1497170e26a8ff97b`: ambas skills y scripts.
- Skill local `C:/Users/grcx1/.claude/skills/upgrade-astro-cloudflare/SKILL.md`
  y referencias base-2026, saltos y verificacion.
- [Guía oficial Astro 7](https://docs.astro.build/en/guides/upgrade-to/v7/),
  [adaptador Cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/)
  y [Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/).
- Changelogs oficiales de [Astro](https://github.com/withastro/astro/blob/main/packages/astro/CHANGELOG.md),
  [Astro 6](https://github.com/withastro/astro/blob/astro%406.4.8/packages/astro/CHANGELOG.md),
  [Cloudflare](https://github.com/withastro/astro/blob/main/packages/integrations/cloudflare/CHANGELOG.md),
  [Sitemap](https://github.com/withastro/astro/blob/main/packages/integrations/sitemap/CHANGELOG.md)
  y [Tailwind](https://github.com/tailwindlabs/tailwindcss/blob/main/CHANGELOG.md).

La versión resuelta original es Astro **6.4.4**, aunque package.json dice ^6.3.7.
Se revisaron también los cambios 6.3.8–6.4.8: preview estático/SSR, manejo de
URLs y headers reenviados, propagación de CSS, Content Layer y rendimiento
Cloudflare. No se requiere una migración de colecciones: ya usan Content Layer.

Astro 7 cambia a Vite 8, compilador Rust, Markdown Sätteri, enrutado avanzado y
compresión JSX. Los parches hasta 7.2.10 incluyen correcciones de manifiesto SSR,
prerender, CSS compartido, rutas y colecciones. El proyecto no configura plugins
remark/rehype, flags experimentales retirados, `src/fetch.ts` ni `@astrojs/db`.
Cloudflare 14.2.6 exige Astro ^7.2.0 y Wrangler ^4.125.0; se comprobó en npm.
Sitemap 3.7.4 corrige la portada con trailingSlash never/build.format file;
este proyecto conserva trailingSlash always.
Tailwind 4.3.1–4.3.3 corrige extracción, HMR, reglas de opacidad y preflight.
La atribución de CSS se debe comprobar separando el patch Tailwind del major Astro.

## Hallazgos previos fuera del salto

`functions/api/analytics.js`, `status-override.js` y `cron-check-links.js` usan
handlers de Pages y no tienen rutas Astro equivalentes. La UI llama a los dos
primeros. Su presencia en el repositorio no prueba que el Worker los publique.
El endpoint report-incorrect existe tanto en functions como en Astro; Astro ya
importaba bindings de `cloudflare:workers`, pero usaba casts `any`.
Los tests que simulan respuestas no prueban persistencia D1 ni entrega de correo.

## Resultado de migración

Verificación cerrada el 2026-09-05. Rama `stack/astro-7`; sin PR ni despliegue.

| Dependencia | Antes (resuelta) | Después (resuelta) |
|---|---|---|
| Astro | 6.4.4 (^6.3.7) | 7.2.10 (^7.2.10) |
| @astrojs/cloudflare | 13.7.0 | 14.2.6 |
| tailwindcss / @tailwindcss/vite | 4.3.0 | 4.3.3 |
| @astrojs/sitemap | 3.7.3 | 3.7.4 |
| Wrangler | 4.100.0, transitivo | 4.125.0, directo |

Se añadieron herramientas de compuerta: @astrojs/check 0.9.10, TypeScript 6.0.3
y @types/node 26.4.1. No se migró TypeScript a otro major preexistente: antes no
estaba declarado como herramienta del proyecto.

### Configuración y compatibilidad

- Se conserva `wrangler.toml`. El adaptador 14 lo acepta; no fue necesario JSONC.
  Se declaran el entrypoint `@astrojs/cloudflare/entrypoints/server`, ASSETS y
  nodejs_compat. Se conserva compatibility_date 2026-06-09 para no introducir
  además un cambio general de comportamiento del runtime.
- `output: 'static'` queda explícito. Se conservan las excepciones SSR: portada,
  ads.txt y report-incorrect. No existe 404.html propio, por lo que no se añade
  not_found_handling 404-page. Se mantienen DB, SESSION y EMAIL.
- `<alpha-value>`: cero ocurrencias en fuente y CSS; no aplica corrección.
- `locals.runtime`: cero ocurrencias; report-incorrect ya usa cloudflare:workers.
- Line-height: el proyecto ya estaba en Tailwind 4. No se observó regresión en
  los cuatro perfiles visuales; no se agregaron reglas globales compensatorias.
- Backdrop: los siete usos fuente se revisaron contra CSS construido. Las
  utilidades de blur conservan ambas propiedades; el popup Leaflet también
  recibe prefijo en Astro 7. No hizo falta añadir propiedades arbitrarias.
  La skill copiada aporta una utilidad extra sin consumidores al escaneo de
  Tailwind; es CSS no usado, sin cambio de apariencia.
- Compresión JSX: se mantiene el nuevo default. La inspección de fronteras de
  texto no encontró un espacio significativo perdido; no hizo falta `{' '}`.
- Sätteri y compilador Rust: build completo válido sin cambios de plantillas
  por sintaxis ni sustitución de plugins Markdown.

### Cinco peldaños: evidencia y clasificación

1. **Rutas — idéntico para páginas.** Las 130 rutas HTML estáticas coinciden.
   La portada SSR responde 200 en ambos Workers. El diff completo, incluidos
   hashes y chunks, está en `evidencia/routes-full-diff.json`; no se ocultaron
   assets. Los nombres de bundles y módulos del Worker cambian por el nuevo
   compilador: **diferencia aceptada**. Los archivos bajo server/.wrangler son
   estado SQLite creado por los servidores locales, no rutas del build; se
   conservaron identificados en el diff. `evidencia/base-rutas.txt` es el listado
   original anterior a esos servidores.
2. **Pipeline — verificado.** Compuerta Astro 6 verde en
   [run 33933435115](https://github.com/Gunz-cop/Vet24-cr/actions/runs/33933435115),
   SHA 51d1a2c. Astro 7 verde en
   [run 33970021862](https://github.com/Gunz-cop/Vet24-cr/actions/runs/33970021862),
   SHA 30138f4: npm ci, build sin acortador, tipos Worker reproducibles,
   astro check + tsc sin errores, 35 unit tests, 72 E2E y dry-run.
   **11 skips preexistentes**, no contados como pruebas superadas.
3. **Texto — contenido idéntico; espacios aceptados con inspección.** Diff por
   tokens HTML en 130 páginas más portada SSR: cero cambios de contenido que
   no sean whitespace. El detector genérico produce candidatos, no veredictos.
   DOMParser inspeccionó párrafos, listas, encabezados y sr-only en todas las
   páginas: cero diferencias en párrafos/sr-only. Los 180 li con diferencias
   tienen etiquetas span de bloque; los 130 h3 estáticos y 112 h3 SSR contienen
   alias de búsqueda ocultos con aria-hidden. El resto son trims en extremos
   o separación por flex/gap. No se detectó pérdida de separación inline real.
4. **Visual — idéntico dentro de la cobertura.** 14 rutas: portada, cuatro
   institucionales y ligera/mediana/pesada de clínica, provincia y zona.
   Chromium a 1280 y 390 px, tema claro y oscuro: **56/56 comparaciones con cero
   píxeles distintos**, con control base/base limpio. Hora fija, animaciones
   desactivadas, fuentes y Leaflet reales capturados una vez y reutilizados.
   `evidencia/browser-report.json` conserva el resultado completo.
5. **Interacción — idéntico dentro de la cobertura.** Cuatro perfiles comparan
   búsqueda, resultado vacío, reset, filtros 24/7 y exóticos, geolocalización,
   cambio de tema y apertura/cierre de reportes: mismos resultados y cero
   pageerror. Se sirvieron ambos Workers, no solo archivos. GET reales de
   portada, manifest, favicon y ads.txt mantienen status, tipo y redirección;
   manifest/favicon conservan SHA. status-override sigue devolviendo 404 tras
   normalizar slash en ambos, un defecto anterior al salto.

### Diferencias aceptadas y límites

La comparación aislada de Tailwind 4.3.0→4.3.3 sobre el mismo Astro 7 está en
`evidencia/tailwind-patch-css.diff`: cambia la pila de fuentes de respaldo,
la regla Firefox de foco de iframe y simplifica expresiones de espaciado
equivalentes. Las fuentes explícitas del sitio y la apariencia se conservan.

El lockfile generado inicialmente con npm 11.6.2 no incluía todos los paquetes
WASM opcionales que valida npm 11.19.0 en CI. Se regeneró fuera del repo con
**npm 11.19.0**, conservando versiones directas; la instalación limpia de CI
posterior demuestra la corrección. Para regenerar este lockfile, usar esa
versión de npm o una compatible y comprobar npm ci en CI.

**No verificado:** Safari 16.4–17 real; entrega de correo y persistencia D1/KV
remotas; comportamiento de publicidad/CMP de terceros; imágenes de los tiles
de OpenStreetMap (se sustituyeron por tiles transparentes). Los scripts de
Ezoic/CMP se excluyeron expresamente para determinismo. Las respuestas API
usadas en las interacciones de UI son simuladas y no prueban el backend.
El funcionamiento de analytics y cron-check-links no fue certificado.
No se ejecutó agent-readiness ni se modificaron datos de clínicas o SEO.

### Repetir la verificación

Las skills copiadas permanecen byte a byte iguales al origen. Los adaptadores
específicos de Vet24 están en `scripts/verification/`, separados de las skills.
Ver `scripts/verification/README.md` para comandos. Los PNG originales y logs
completos están en el temporal citado; los resúmenes y rutas están versionados
en `docs/migracion-stack/evidencia/`.
