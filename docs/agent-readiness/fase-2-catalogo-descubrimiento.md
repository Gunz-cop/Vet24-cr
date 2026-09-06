# AR2 — Catálogo público y descubrimiento

**Spec de producto:** [README.md](README.md), manda sobre este documento.
**Depende de:** AR1 fusionada y verificada en producción.
**Issue:** [índice de issues](issues/README.md).
**Base:** SHA de main con predecesora fusionada, registrado antes de empezar.
**Roles:** una sesión ejecuta; otra verifica. La sesión que escribió esta entrega no implementa.

## Objetivo y contratos

Exponer un catálogo público estático de clínicas, con evidencia y límites interpretables, y descubrirlo desde portada/fichas. Entrada: AR1 fusionada y validada. Salida: los seis recursos públicos de la tabla normativa responden, las cuatro relaciones Link funcionan en SSR y assets y el catálogo pasa controles de datos.

Leer antes de implementar: skill completa, contrato «Datos para agentes» y guías primarias content-signals/api-catalog/link-headers; fuentes enlazadas en fuentes-y-linea-base.md. El README define el esquema y las rutas: esta fase no añade otros campos/capacidades sin actualización coordinada.

## Trabajo, en orden

1. Crear `src/lib/agent-content.ts` como proyección de entradas de Astro. Recibir las entradas permite probar casos límite sin depender de importaciones virtuales en node:test. Usar `data.slug`, helpers de zona/provincia y cuerpo de la misma colección. No leer una copia YAML paralela ni filtrar por estado.
2. Generar `/api/catalog.json` en build, con el esquema completo del README. No añadir endpoint de búsqueda: los ejemplos filtran el documento descargado en memoria. No derivar openNow de horarioTexto ni hacer llamadas a D1 o geocodificación.
3. Generar `/api/openapi.json` con OpenAPI 3.1, servidor https://vet24cr.com, una operación GET `/api/catalog.json`, respuesta 200 application/json y schema íntegro. Sin parámetros de filtros que el servidor ignora, security inexistente ni referencia al API de reportes. Ejemplos verificables contra el catálogo real, sin contactos ficticios presentados como reales.
4. Generar `/llms.txt` desde el adaptador: H1, descripción del directorio, límites de actualidad y enlaces a recursos/HTML existentes. No poner todos los horarios ni duplicar el catálogo completo. No `/llms-full.txt`; no enlaces a mirrors todavía inexistentes.
5. Crear `public/api/readme.md` con diccionario, semántica de null/booleanos, los dos ejemplos de consultas del README y condición de confirmación telefónica. Crear `public/auth.md`: H1 con auth.md, catálogo anónimo, sin registro/API key/OAuth; no describir como anónimas o reutilizables las APIs de escritura del sitio.
6. Solo una vez disponibles esos endpoints, publicar `public/.well-known/api-catalog` como linkset RFC 9727. Un anchor absoluto al catálogo y arrays service-desc/service-doc con href absolutos al OpenAPI/docs, sin endpoint de salud inventado.
7. Crear `src/lib/agent-discovery.ts` con las constantes de Link para el runtime y controles de igualdad con `public/_headers`. En `src/middleware.ts`, conservar redirecciones canónicas y añadir cabeceras a respuestas HTML SSR de las familias incluidas. La excepción de slash debe ser **exacta** para `/.well-known/api-catalog`; host y HTTPS siguen normalizándose. No excluir todo /.well-known/ ni todo /api/ del middleware.
8. Configurar MIME y CORS de los seis recursos nuevos en _headers; mantener un único bloque global. No atribuir al middleware la entrega de assets estáticos: verificar ambas rutas de ejecución. Añadir únicamente alias sitemap 301 en _redirects. Si Astro incluye recursos nuevos en sitemap, excluirlos con filtro acotado en astro.config.mjs, sin cambiar ningún miembro HTML previo.
9. Crear pruebas de transformación y entrega y `scripts/verification/agent-catalog.mjs`. El validador localiza artefactos en la salida efectiva del adaptador (dist/client si corresponde); falla si faltan, valida JSON/OpenAPI/linkset y contrasta inventarios HTML. No exige dist/api/... si el build real está en otro subdirectorio.
10. CI ejecuta explícitamente el validador **después** de build:no-shorten. No necesita scripts npm ni dependencias nuevas; usar Node/test y herramientas ya disponibles. Cada regresión nueva debe tener prueba. Ejecutar verificación común y auditoría HTTP por una sesión distinta.

## Evidencia mínima y diagnóstico

En `docs/agent-readiness/evidencia/ar2/`: SHA BASE/HEAD/desplegado, inventario de rutas HTML/catálogo, resultados del verificador, cabeceras GET/HEAD, robots y sitemaps, salida CI y scan completo. Un diff semántico de HTML debe conservar texto, JSON-LD, canonical y metadata; las cabeceras nuevas y el alias sitemap son diferencias autorizadas.

GET de portada es SSR; una prueba solo sobre fichero de clínica no demuestra Link en portada. El API Catalog no lleva extensión: comprobar tipo y ausencia de slash agregado en HTTP real. No usar helpers canónicos de HTML para archivos técnicos. Falta de fecha/fuente no es error para “arreglar” inventando valores.

Para HEMS, afirmar revisión telefónica sería un defecto; para Medical Care, reducir hotel a “para mascotas” omitiendo gatos/reserva sería un defecto. Las pruebas usan tanto datos sintéticos identificados como tales como comparación de las fichas reales. No afirman que los datos fuente hayan sido revalidados en esta tarea.

## Fuera de alcance y reversión

No solucionar #5, no reescribir UI/FAQ, no poner openNow en tiempo real ni migrar esquema. No protocol cards ni mirrors en esta fase. Un fail de authMd por falta de OAuth no obliga a crear OAuth. Reversión: retirar AR2 como unidad (documentos + enlaces + cabeceras); si AR3 ya depende de ella, revertir primero AR3.

## Archivos que posee

- `src/lib/agent-content.ts`
- `src/lib/agent-discovery.ts`
- `src/pages/api/catalog.json.ts`
- `src/pages/api/openapi.json.ts`
- `src/pages/llms.txt.ts`
- `public/api/readme.md`
- `public/auth.md`
- `public/.well-known/api-catalog`
- `public/_headers`
- `public/_redirects`
- `src/middleware.ts`
- `tests/unit/agent-catalog.test.ts`
- `tests/unit/agent-discovery.test.ts`
- `tests/e2e/agent-discovery.spec.ts`
- `scripts/verification/agent-catalog.mjs`
- `.github/workflows/ci.yml`
- `astro.config.mjs`
- `docs/agent-readiness/evidencia/ar2/**`

Todos los demás archivos están protegidos. Aplican las restricciones por archivo compartido del README. `git diff --name-only <BASE>...HEAD` debe ser subconjunto de esta lista; AR2 y AR3 nunca modifican archivos compartidos en paralelo.

## Criterios de aceptación

- [ ] **AR2-01** [N3, N4, N5, D2, D3] Después de `npm run build:no-shorten`, `node scripts/verification/agent-catalog.mjs` sale 0 y falla si falta un artefacto: verifica el contrato «Datos para agentes», unicidad de slug, igualdad del conjunto de fichas con las rutas HTML de clínicas del mismo build y URLs canónicas existentes; no usa un conteo fijo ni excluye fichas por `estado` que el HTML sí publica.

- [ ] **AR2-02** [N4, N5, D3] `npm test` cubre datos de prueba con booleano falso, booleano verdadero sin evidencia, fecha/fuente vacías, coordenadas 0/0 y servicio limitado por especie. Confirma `openNow: null`, zona horaria `America/Costa_Rica`, ausencia de fecha editorial inventada, estados conservadores de capacidades y conservación de `copyDiferenciador`, `bodyMarkdown` y `verification_notes`; el caso real de Medical Care conserva «hotel exclusivamente para gatos» sin inferir hotel general.

- [ ] **AR2-03** [N1, N6, D2, D4] GET y HEAD a `/api/catalog.json`, `/api/openapi.json`, `/llms.txt`, `/api/readme.md`, `/auth.md` y `/.well-known/api-catalog` cumplen los códigos y MIME de la tabla de rutas, sin barra final añadida; HEAD no lleva cuerpo. El OpenAPI 3.1 describe exclusivamente GET del catálogo público, sin autenticación ni filtros de servidor; el catálogo RFC 9727 enlaza únicamente ese servicio y documentación que responde 200.

- [ ] **AR2-04** [N1, N6, N8, D4] `curl.exe -sS -D - -o NUL https://vet24cr.com/` y la misma comprobación sobre `/clinica/hems-una-heredia/` muestran las cuatro relaciones `Link` del contrato; todos sus destinos responden 200. Hay un solo bloque global `/*` en `public/_headers`, CORS comodín solo en los recursos públicos nuevos indicados, y el SSR de portada recibe las cabeceras mediante la integración runtime.

- [ ] **AR2-05** [N6, N8, D5] `curl.exe -sS -D - -o NUL https://vet24cr.com/sitemap.xml` devuelve 301 con destino `https://vet24cr.com/sitemap-index.xml` o su ruta relativa equivalente; el destino devuelve XML 200. Las URLs canónicas HTML, contenido/SEO y miembros de los sitemaps existentes permanecen iguales; los recursos de agentes no se añaden al sitemap.

- [ ] **AR2-06** [N2, N9, N10, D6, D7] Se archiva un escaneo completo antes de modificar la subfase. La verificación común y el verificador de artefactos tras build pasan en CI y en sesión independiente; el escaneo completo conserva los cuatro pass de AR1 y añade `linkHeaders=pass` y `apiCatalog=pass`. Se comprueba `/auth.md` anónimo, sin OAuth ficticio, y se archiva el resultado real de `authMd` aunque falle; el diff cumple propiedad AR2 y la evidencia queda en `docs/agent-readiness/evidencia/ar2/`.
