# Verificación local I01 / I04

Fecha: 2026-09-16. Alcance: implementación local de issues #27 y #30. El panel completo y los demás issues no están terminados.

El SDD v1.2 permanece intacto, SHA-256 `10797303D82C4D7E2B5020EEA4312E40901FD7DBC2275A3BB68442A17C7532B5`. Se conservaron los cambios de trabajo preexistentes en tarjetas, ficha, filtros y estilos. No se editaron las fichas del catálogo ni se consultaron servicios de correo/base de datos remotos.

| Comprobación final | Resultado |
|---|---|
| `npm test` | 99 PASS, 0 FAIL |
| `npm run check` | 0 errores, 0 warnings, 35 hints |
| `npm run build:no-shorten` | PASS |
| `npm run deploy:dry-run` | PASS, sin publicar |
| `npm run check:runtime-boundary` | PASS |
| `npm run check:runtime-bundle` | PASS |
| `npm run test:admin:worker` | 2 PASS: Worker completo y middleware directo |
| Playwright: admin-boundary, agent-discovery, agent-markdown | 12 casos aprobados; 11 en corrida conjunta y búsqueda/filtros en repetición focalizada |
| `git diff --check` | PASS |

Las pruebas del Worker usan el bundle real, claves RS256 generadas para cada ejecución, JWKS interceptado exclusivamente en el runner y D1 efímero. Verifican host, claims/firma, métodos, respuestas HEAD, acceso directo, rutas codificadas, tombstones y conservación de la tabla de prueba. Una segunda ejecución invoca el middleware compilado sin wrapper y demuestra que no expone la respuesta privada. El runner usa la versión de Miniflare incluida por Wrangler y fijada por package-lock, con su adaptador de opciones V4.

Playwright ejecutó el bundle mediante Wrangler local en 127.0.0.1:4322. El intento inicial con `astro preview` terminó antes de que Playwright reconociera el daemon; se usó el servidor local explícito para la validación. La prueba de búsqueda se corrigió porque el catálogo contiene dos coincidencias legítimas de Agromédica. El producto no requirió un cambio por ese resultado. Se comprobó buscar, limpiar, filtrar hotel, restablecer y ausencia de requests a analytics. Los servidores de prueba se detuvieron al finalizar.

El build emitió un aviso de importación dinámica ya presente y el SDK local no pudo obtener metadatos Request.cf por la cadena de certificados del entorno; utilizó su fallback y completó correctamente. Esto no sustituye un smoke de producción. Los hints de check incluyen consumidores del adaptador compacto de horarios, cuya migración corresponde a #32.

Auditorías independientes Luna medium: `auditoria-i01-r2.md` APROBADO y `auditoria-i04-r4.md` APROBADO. No hubo deploy, commit, push ni cierre remoto de issues. Access real, rate store y persistencia administrativa, reportes endurecidos y rollout permanecen en los issues posteriores según el SDD.
