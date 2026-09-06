# AR3 — evidencia de ejecución

## Línea base

`scan-pre-deploy.json` conserva íntegramente el escaneo completo productivo
archivado por AR2 el 2026-09-06T07:59:55.124Z, antes de la implementación de
AR3: los seis checks de AR2 están en `pass` y `markdownNegotiation` está en
`fail`.

La repetición del escaneo desde este entorno se intentó antes del primer cambio
de código y falló por una restricción de red del sandbox (`EACCES` al conectar
con `isitagentready.com`). No se reemplaza ese resultado por una simulación.
