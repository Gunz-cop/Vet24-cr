# AR3 — verificación productiva

Fecha de la sesión: 2026-09-06
Sitio: `https://vet24cr.com`
Rama de evidencia: `ar3/markdown-validation`

## AR3-02/03/04

La batería exacta solicitada en el issue se ejecutó contra producción. Las
cabeceras completas están en [production-headers.txt](production-headers.txt).

- Ficha HEMS con `Accept: text/markdown`: `200`, `text/markdown; charset=utf-8`, `Vary: Accept` y `Cache-Control: private, no-store`.
- Ficha HEMS sin `Accept` y con `Accept: text/markdown;q=0`: `200`, `text/html`, conservando `Vary: Accept` y `Cache-Control: private, no-store`.
- `HEAD` de la ficha con `Accept: text/markdown`: `200`, `text/markdown`, con las mismas cabeceras de selección y sin cuerpo.
- Mirror directo de HEMS: `200`, `text/markdown`, `Access-Control-Allow-Origin: *` y `x-robots-tag: noindex`.
- Listado de Heredia y portada negociados: `200`, `text/markdown`, `Vary: Accept` y `Cache-Control: private, no-store`.
- Mirror directo de portada: `200`, `text/markdown`, CORS público y `x-robots-tag: noindex`.
- La respuesta HTML de HEMS contiene canonical y no contiene `noindex`; la respuesta Markdown empieza con heading y no es HTML.
- La configuración desplegada conserva `run_worker_first` limitado a `/`, `/clinica/*`, `/provincia/*` y `/zona/*`; no captura `/api/` completo.

El POST de `/api/report-incorrect/` se probó con un payload de verificación y
respondió `200 application/json`; no se modificó el endpoint ni se añadió una
captura de su ruta al worker de Markdown. El detalle del probe está en
[api-report-incorrect.md](api-report-incorrect.md).

## AR3-05

El escaneo completo está archivado en
[scan-post-deploy.json](scan-post-deploy.json), con `scannedAt`
`2026-09-06T16:45:09.890Z`.

Los seis checks funcionales heredados de AR2 permanecen en `pass`:
`robotsTxt`, `sitemap`, `linkHeaders`, `robotsTxtAiRules`, `contentSignals` y
`apiCatalog`. Se suma `markdownNegotiation=pass`.

El script produjo el JSON completo, pero Node `v24.11.1` terminó con una
aserción de libuv al cerrar (`UV_HANDLE_CLOSING`) después de escribir la
respuesta JSON. El archivo es JSON válido y conserva la respuesta completa del
escáner; no se oculta ese límite de ejecución.

Como comprobación local complementaria, `npm ci` terminó con 335 paquetes y
0 vulnerabilidades, `npm test` pasó `50/50`, `npm run build:no-shorten`
completó y `node scripts/verification/agent-markdown.mjs` pasó `127 mirrors`.
