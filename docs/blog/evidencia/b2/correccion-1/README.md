# Corrección de la revisión de B2

Producto corregido: `9192a4b3694ca6c6a087100179fcc61cd42adfbb`.
BASE permanece `b9d7db74d85f99ab580c7bc0d03dd51c13744f71`; candidato revisado previamente: `cb2b32b27486ed5c3425e4cfd49c2f5ee62c46b6`.

## Hallazgo 1: etiquetas reales

`directoryNames` obtiene los nombres de las clínicas de `data.nombre`, los de zonas de `priorityZones[].nombre` y los de provincias de `data.provincia`, indexados con `normalizeSlug`. La identidad/URL de provincia sigue contrastándose con la página generadora; no se modifica esa página ni el contenido de fichas. `directoryLinks` exige un nombre presente: ya no transforma slugs en anclas.

`article-labels.json` y `article-390.png`/`article-1440.png` muestran siete anclas reales: HEMS, Hospital Veterinario Medical Care, Veterinaria Gocha, San Pablo de Heredia, Guápiles, Heredia y Limón. `label-mutations.json` demuestra que sustituir el nombre por slug en clínica, zona o provincia hace salir al verificador con código 1 y “Ancla incorrecta”. Los nuevos unitarios contrastan nombres y rechazan etiquetas ausentes.

## Hallazgo 2: requisito de preview explícito

Secuencia reproducida desde el checkout candidato:

```sh
npm run build:no-shorten
npm run preview -- --host 127.0.0.1 --port 4321
node scripts/verification/blog.mjs
```

`preview-start-current.log` contiene el comando realmente ejecutado y su salida. `blog-current.log` y `../blog-ejecutora.log` incluyen SHA, URL, comando de preview, stdout, stderr y código 0. El script informa la precondición y el puerto configurado en cada ejecución.

`no-preview.log` y `no-preview-custom-port.log` demuestran salida **1** con un único error accionable `PREVIEW_UNAVAILABLE`; no hay errores ficticios de fragmento derivados de no recibir la portada. El segundo demuestra que la instrucción coincide con el puerto 4323 configurado. El control SSR sigue siendo obligatorio: el sandbox que no pueda iniciar preview seguirá sin poder completar esa comprobación, y no se presenta como pass.

Las rutas de ocurrencias en `dist/server` se normalizan a `/` y se ordenan. El conteo de archivos se informa, sin usar 22 o 23 como condición de aceptación dependiente del sistema operativo. La política de borradores y la inspección de ambos directorios permanecen.

## Resultados de ejecución

| Control | Resultado | Código |
|---|---|---:|
| check-current.log | 0 errores | 0 |
| test-current.log | 77 pasan, 0 skips | 0 |
| build-current.log | build sin acortador | 0 |
| blog-current.log | dist/client: 133 HTML, 0 publicados; dist/server informado | 0 |
| agent-markdown-current.log | 127 mirrors | 0 |
| agent-catalog-current.log | 112 clínicas | 0 |
| e2e.log | 96 pasan, 11 skips heredados | 0 |
| fixture-e2e.log | 10 controles pasan | 0 |
| fixture-blog-current.log | 134 HTML, artículo publicado y anclas reales | 0 |
| no-preview*.log | precondición ausente rechazada | 1 esperado |
| label-mutations.json | tres etiquetas inválidas rechazadas | 1 esperado en cada caso |

`geometry-comparison.json`: 20 comparaciones BASE/fixture/candidato, delta máximo **0 CSS px**, mismo texto/href/pliegue y orden de contactos. Se conserva la ausencia de WhatsApp en HEMS. `conservation.json`: 134 artefactos sin cambios ni pérdidas respecto de BASE.

La publicación temporal se hizo sólo en el checkout aislado; `fixture.diff` registra el cambio y `fixture-removed.diff` está vacío tras retirarlo. El preview de la fixture se detuvo. El candidato se reconstruyó después y sigue borrador.

Los diffs identifican los SHA inspeccionados. Las diferencias de aplicación y tests entre la ejecución E2E y el último commit de producto son nulas; sólo cambió la instrucción de puerto del verificador. Los commits posteriores incorporan evidencia. Se repetirá además el control sobre el HEAD final de entrega; esa comprobación no sustituye la repetición independiente pendiente.

Esta corrección no autoriza merge ni declara cierre de B2. Los 11 skips heredados y la auditoría independiente siguen pendientes.
