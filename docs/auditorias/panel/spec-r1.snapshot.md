# Especificación implementable del panel administrativo

Estado: **CANDIDATA**. Esta especificación no constituye aprobación ni afirma que el panel esté listo.

Fecha: 2026-09-16 (Costa Rica)  
Base: HEAD `24dc03d58ba970710a26bbb1f7f175556c500f14`, rama `main`  
SDD normativo: [`docs/sdd-panel-admin-y-skill.md`](./sdd-panel-admin-y-skill.md), SHA256 `10797303D82C4D7E2B5020EEA4312E40901FD7DBC2275A3BB68442A17C7532B5`

## 1. Propósito y límites

Esta especificación define la interfaz administrativa pendiente de I09/#35: catálogo privado, editor de fichas y horarios, mapa y evidencia, alertas temporales, reportes y propuestas permanentes mediante PR. La interfaz consume contratos propiedad de I02, I05, I07, I08, I10 e I11; no reemplaza sus validadores, persistencia, seguridad ni operación.

Al inspeccionar la base se encontraron `src/pages/admin/index.astro` y `src/pages/admin/nueva.astro` como placeholders, sin editor funcional, y no se encontró un endpoint implementado bajo `src/pages/api/admin/**`. `src/lib/admin/auth.ts` ya expone la frontera de autenticación, método, CSRF y límite de cuerpo que deberá reutilizarse. `src/lib/schedule.ts` ya expone el motor y tipos de horario que serán la autoridad cuando se implemente el editor. El contenido Markdown sigue siendo la fuente permanente; D1 solo contiene estado operativo, reportes, auditoría y propuestas.

Fuera de alcance: alterar el SDD, implementar aquí código, provisionar D1/Access/GitHub, publicar fichas, fusionar PR, enviar correo, hacer altas masivas o afirmar que el motor #27 y la seguridad #30 están completas. Ninguna prueba de esta entrega implica que exista infraestructura remota.

### 1.1 Puente entre el wire actual y el contrato futuro

El `clinicSchema` actual (`src/lib/clinic-schema.ts`) es el wire de lectura del catálogo construido. Sus defaults (`false`, `""`, `0`, `"medium"`, `"PARTIAL"`, `"Tier C"`) son valores de compatibilidad y **no** significan una afirmación negativa, verificación ausente demostrada ni coordenada real. El panel debe mostrar esos campos como “sin evidencia/por confirmar” cuando no exista sidecar de investigación, y no puede convertir `latitude=0` o `longitude=0` en una ubicación.

I02/I05 introducirán el contrato estricto de `schedule_v1` y el sidecar `research/clinics/<slug>.json`. Durante la transición, el endpoint de detalle puede devolver campos actuales y `schedule_v1: null`; la UI ofrece edición estructurada solo cuando el servidor acepta el contrato nuevo y nunca reconstruye evidencia desde un default. La respuesta debe distinguir `evidence: {status:"unavailable"|"partial"|"complete", facts, conflicts, sources}` de los campos de ficha; sidecar ausente es `unavailable`, no evidencia vacía confirmada.

Para una propuesta nueva, `baseCommit` es el SHA real de `main` usado para leer el catálogo y `blobSha` es explícitamente `null` porque todavía no existe blob; no se usa cadena vacía, `0` ni un hash inventado como sentinel. Para una edición existente ambos son los valores devueltos por GET y se conservan literalmente en POST. El servidor vuelve a comprobarlos contra GitHub antes de encolar.

## 2. Propiedad y dependencias

| Área | Propietario | Este panel consume | Gate de integración |
| --- | --- | --- | --- |
| Investigación, schema, UUID, slug, evidencia y deuda | I02/#28 | ficha editable, `research/clinics/<slug>.json`, diagnósticos | validar antes de guardar o proponer; no publicar si falta evidencia requerida |
| Motor de horarios y consumidores | I05/#31 | `ScheduleV1`, parser, evaluación y serialización | no editar `scheduleAttr`; todos los estados se derivan del contrato central |
| Retiro de rutas legacy y frontera Workers | I07/#33 | rutas canónicas y tombstones | no usar `functions/` ni crear una vía alternativa de escritura |
| Overrides D1, CAS, auditoría y reportes | I08/#34 | revisiones, expiración, idempotencia y estados | escritura atómica; 409 conserva el formulario |
| Auth, CSRF, límites, rate limit y XSS | I10/#36 | identidad Access y errores de servidor | auth antes de consultar datos; `private, no-store`; cuerpo máximo 64 KiB |
| Preflight, cron, observabilidad y rollback | I11 | estado de operación y salud | despliegue deshabilitado hasta pasar preflight; sin mutación remota en esta entrega |

Las elecciones de producto son: una sola vista de catálogo con panel lateral o navegación a detalle; una sola identidad/allowlist de editores v1; horario estructurado como verdad única; alerta temporal como override D1; cambio permanente como propuesta durable en outbox y PR sin auto-merge; y nueva ficha como borrador local del formulario hasta que la propuesta sea aceptada por servidor.

## 3. Arquitectura de navegación y estado

Rutas de UI futuras, todas `prerender = false` y protegidas por la frontera Worker/middleware:

| Ruta | Vista |
| --- | --- |
| `/admin/` | catálogo, filtros, bandeja y accesos a nueva ficha |
| `/admin/editar/:slug/` | editor de ficha existente, evidencia, horario, mapa y acciones |
| `/admin/nueva/` | formulario de borrador de nueva ficha |

Las rutas administrativas usan `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`, no se incluyen en sitemap y no incrustan tokens, contactos privados ni payloads de Places. Un GET sin sesión bajo Access conduce al login del proveedor; una API devuelve 401. La app nunca almacena JWT en `localStorage`.

El layout contiene enlace “Saltar al contenido”, encabezado con identidad y “Cerrar sesión”, navegación secundaria (Catálogo, Reportes), área principal y mensajes `aria-live`. En móvil la navegación se convierte en menú accesible; no hay scroll horizontal. Breakpoints de referencia: 360, 768, 1024 y 1440 px. El contenido principal conserva insets para que banners, teclado virtual o paneles fijos no lo oculten.

Estados globales de cada consulta/mutación: `idle`, `loading`, `success`, `empty`, `error` y `conflict`. `loading` usa skeleton para listas y deshabilita solo la acción en curso; `error` explica causa y ofrece reintento. Cambiar filtros o recargar nunca borra un borrador no guardado: mostrar advertencia y permitir cancelar, permanecer o descartar.

## 4. Catálogo y bandejas

### 4.1 Catálogo

`GET /api/admin/clinics?q=&provincia=&issue=&cursor=&limit=` devuelve `{ items, nextCursor, baseCommit, generatedAt }`. `q` admite nombre, slug y zona normalizados sin tildes, máximo 100 caracteres. `limit` entero 1..100, por defecto 25; `cursor` es opaco y validado por servidor. El orden es estable por nombre normalizado y, como desempate, slug/id. Cada ítem incluye `slug`, `id`, `nombre`, provincia/zona, estado editorial, flags de verificación, problemas calculados, alerta activa, reportes pendientes, `baseCommit` y `sourceHash`.

Filtros visibles: provincia; estado editorial; problema de horario; verificación pendiente; alertas activas; reportes pendientes. Un problema lleva `code`, `field`, explicación y referencias de fuente. `unknown` o “por confirmar” deliberado se muestra como “por confirmar”, nunca como “roto”. Los contadores son calculados de la respuesta actual y nunca se fijan a números históricos.

La tabla tiene columnas Clínica, ubicación, horario/estado, verificación, alerta y acciones. Cada fila ofrece “Editar” y, si existe, “Ver reportes”. En 360 px las columnas secundarias pasan a una tarjeta apilada; se conserva nombre, estado textual y acción. La paginación conserva query y foco en el encabezado de resultados. Vacío incluye el filtro aplicado y acción “Limpiar filtros”; error incluye “Reintentar”.

### 4.2 Detalle editable

`GET /api/admin/clinics/:slug` devuelve la ficha completa autorizada, evidencia, `blobSha`, `baseCommit`, `sourceHash`, `overrideRevision` y estado de propuesta. El slug debe existir en el catálogo publicado; 404 no revela si existe un registro fuera del catálogo. El servidor obtiene el Markdown desde la ref permitida y preserva cuerpo editorial y campos ajenos autorizados. El navegador no decide qué campos se conservan.

### 4.3 Reportes

`GET /api/admin/reports?status=&slug=&cursor=&limit=` devuelve `{items,nextCursor}`. Contacto del reportante aparece únicamente aquí. Cada ítem incluye id, slug, motivo, descripción, contacto si fue proporcionado, fecha, estado, revisión y resolución. `PATCH /api/admin/reports/:id` acepta `{expectedRevision,status,resolutionNote}`; `status` es `new|reviewed|resolved`. Una revisión concurrente devuelve 409 y no pierde nota ni estado local. La API pública de reportes debe indicar 503 si D1 falla; no responde éxito ficticio por disponer de email.

## 5. Editor de ficha

El editor organiza el formulario con `fieldset` y `legend`: identidad, contacto, ubicación, capacidades, horario, evidencia y cuerpo editorial. Cada campo tiene `<label>` visible, ayuda persistente cuando sea compleja y estado de error debajo del campo. Los campos requeridos se marcan con texto “obligatorio”, no solo color.

Identidad muestra `id` histórico en solo lectura o genera UUID en nueva ficha; nombre, slug y provincia/zona se editan según schema. El slug se normaliza y verifica como único en servidor; no se permite cambiar el slug de una ficha existente por un editor normal. Contacto incluye teléfonos, WhatsApp, web, Facebook, Instagram, Maps y Waze con validación de protocolo/host. Nunca se ejecutan URLs introducidas por el usuario ni se hace fetch server-side de destinos arbitrarios.

Capacidades separan emergencia telefónica, atención presencial, `overnight_doctor_present`, `accepts_emergency_walkins`, cirugía, hospitalización, hotel y demás campos existentes. No se deduce una capacidad de otra. La casilla `emergency_verified` solo se puede marcar junto con evidencia de confirmación directa; Tier A exige además calendario 24h completo y los campos del contrato I05.

La sección Evidencia permite seleccionar fuentes públicas autorizadas, fecha observada UTC, campo respaldado, confianza y conflicto/resolución. Una fuente inaccesible queda registrada como limitación. Un mapa o geocodificador solo sugiere; el editor debe confirmar sucursal y evidencia. `address_verified` no cambia por mover el pin.

## 6. Horarios y excepciones

El editor utiliza `ScheduleV1` del contrato central: versión 1, zona `America/Costa_Rica`, siete días con índice domingo=0 y excepciones `YYYY-MM-DD`. Estados por día: abierto, cerrado, por confirmar y cita previa. Para abierto se muestran hasta ocho intervalos ordenados; cada intervalo tiene inputs de hora `HH:mm` y controles equivalentes de teclado. No se redondean minutos ni se fuerza media hora.

Cada día ofrece “Añadir intervalo”, “Eliminar”, “Copiar a días…” y “Día completo (24 h)”. Copiar requiere lista de días, vista previa y confirmación de reemplazo; no sobrescribe silenciosamente. El descanso de almuerzo se representa como dos intervalos. La ayuda muestra el rango exacto `[inicio, fin)` y permite fin 24:00 solo como extremo.

Un intervalo con fin anterior al inicio activa modo “termina al día siguiente” y, tras confirmar, se divide: viernes 22:00–02:00 se serializa viernes `[1320,1440)` y sábado `[0,120)`. Si el siguiente día es `unknown` o `appointment`, el diálogo explica qué parte será confirmada y exige acción explícita; no convierte el resto en cerrado. Deben mostrarse conflictos con intervalos ya existentes o con una excepción fechada.

Las excepciones reemplazan el día regular completo. Se pueden añadir, editar y eliminar fechas únicas, máximo 60; estados y reglas tienen la misma validación. Excepción de sábado cerrado anula cualquier tramo que cruce desde viernes. La vista de excepción muestra si el día queda abierto, cerrado o por confirmar.

La vista previa deriva `horarioTexto` y, solo para consumidores migrados, `scheduleAttr`. Muestra evaluación a una fecha/hora elegida en Costa Rica como `OPEN`, `CLOSED` o `UNCONFIRMED` con texto y razón (`unknown`, `appointment`, `invalid`, `live_unavailable`, `temporary_closed`). Fecha inválida u horario inválido nunca se transforma en cerrado. El editor no acepta `emergencias24h` como entrada del motor.

Errores por campo incluyen intervalo superpuesto, minuto fuera de rango, fecha imposible, excepción duplicada, resto nocturno sin confirmar y capacidades 24/7 sin evidencia. Tras enviar un formulario inválido, el foco va al primer error y el resumen superior enlaza cada campo. `aria-live="polite"` anuncia guardado; `role="alert"` anuncia errores.

## 7. Ubicación, evidencia y enlaces

La ubicación combina dirección editable, latitud y longitud con precisión decimal introducida explícitamente. Se rechazan valores no finitos, fuera de rango y `0,0`; la caja territorial 8..11.3 / -86..-82.5 es una alarma de revisión, no una prueba de pertenencia. Un borrador puede tener coordenadas `null`, pero no puede proponerse publicable hasta aportar ubicación verificable.

El mapa Leaflet recibe únicamente coordenadas y datos locales permitidos; no se le entrega payload restringido de Places. Un pin arrastrable actualiza inputs con feedback y requiere confirmación de sucursal. Se muestran enlaces HTTPS generados a partir de coordenadas confirmadas para Maps y Waze, con botón de apertura manual en pestaña nueva y `rel="noopener noreferrer"`. Se rechazan `javascript:`, protocolos no HTTPS, host engañoso, redirección abierta y URLs fuera de la allowlist exacta. URLs abreviadas existentes se marcan para revisión o se resuelven únicamente con herramienta restringida a hosts permitidos y máximo tres saltos.

Cada afirmación verificada enlaza a su evidencia; el enlace por sí solo no marca `address_verified`, `schedule_verified` ni `emergency_verified`. No se guardan contactos privados, transcripciones de llamadas ni payloads completos de proveedores.

## 8. Acciones y contratos de mutación

Todas las mutaciones envían JSON con `Content-Type: application/json`, `Origin` exacto del origen configurado, `X-Vet24-Admin: 1`, `Sec-Fetch-Site: same-origin` cuando exista e `Idempotency-Key` UUID donde se indique. El servidor valida Access/allowlist, CSRF, tamaño máximo de 64 KiB, schema y rate limit D1 de 30 mutaciones por subject/minuto antes de consultar o escribir. No hay CORS permisivo.

La clave es obligatoria en todas las mutaciones (PUT, DELETE, PATCH y POST de propuesta/reintento): UUID v4 o v7 canónico en minúsculas; ausencia o formato inválido devuelve 400. La identidad lógica es `(subject,key)`. El hash idempotente es SHA256 de método, pathname canónico y JSON con claves ordenadas recursivamente (los arrays conservan orden), incluido `expectedRevision`. Reutilizar la clave con otro hash devuelve 409 `IDEMPOTENCY_CONFLICT`; un reintento exitoso devuelve el mismo status/body y `Idempotency-Replayed: true`. Dos solicitudes simultáneas con la misma clave producen un único efecto; si la reserva sigue pendiente, 409 `REQUEST_IN_PROGRESS` con `Retry-After: 1`. Claves y respuestas se conservan siete días. El cliente genera una nueva clave solo para una intención nueva, nunca para reintentar un timeout.

### 8.1 Alerta temporal

`PUT /api/admin/overrides/:slug` acepta:

```json
{
  "expectedRevision": 3,
  "temporarilyClosed": true,
  "message": "Cierre temporal por mantenimiento",
  "schedule": null,
  "expiresAt": "2026-09-18T18:00:00Z"
}
```

`message` es texto de máximo 500 caracteres; `schedule` es un `ScheduleV1` validado o `null`; `expiresAt` es obligatorio para una alerta activa, posterior a ahora y como máximo siete días desde ahora. El cierre tiene precedencia temporal sobre horario base; un mensaje solo no cambia apertura. Reapertura elimina el cierre temporal y deja que el horario determine el estado, nunca fuerza OPEN. Respuesta 200: `{success:true,slug,revision,expiresAt,checkedAt}`. DELETE `/api/admin/overrides/:slug` acepta `{expectedRevision}` y devuelve tombstone idempotente auditado; si no existe con revisión 0 no crea una fila nueva.

Un éxito solo se muestra después de comprobar la escritura D1 y su auditoría en la misma transacción. 409 devuelve `{success:false,error:"CONFLICT",requestId,currentRevision,current}`; la UI conserva el formulario, muestra diff antes/después y exige “Recargar y reaplicar”. Nunca se hace overwrite silencioso. Misma clave y payload devuelve el resultado original; misma clave con hash distinto devuelve 409.

### 8.2 Cambio permanente y nueva ficha

`POST /api/admin/clinic-proposals` acepta `{slug,newClinic,baseCommit,blobSha,clinic,evidence}` y `Idempotency-Key`. Para existente, `baseCommit` y `blobSha` deben corresponder a lo cargado; para nueva ficha `newClinic:true`, `id` es UUID, el slug es único y el paquete incluye ficha y evidencia completas. La respuesta inicial es `202 {operationId,prUrl:null,status:"pending"}`; el cron durable posterior puede actualizar el enlace. No se informa `deployed` sin comprobación real.

La interfaz separa visualmente “Guardar alerta temporal” y “Proponer cambio permanente”. La primera muestra expiry y revisión; la segunda muestra `operationId`, estado `pending|running|succeeded|failed`, error recuperable y PR cuando exista. Un 409 de base conserva campos, marca los cambios conflictivos y ofrece recargar/reaplicar. Un error GitHub o 429 no borra el borrador ni crea otra propuesta al reintentar con la misma clave. El outbox y el runner son I08/I11; esta UI no usa `waitUntil` como almacenamiento.

Una nueva ficha permanece como borrador hasta que el servidor valide identidad, slug, campos requeridos, coordenadas o limitación explícita, evidencia y cuerpo. No se crea ruta pública antes de merge y build. Cancelar un borrador con cambios requiere confirmación; el servidor nunca elimina una ficha publicada por esta acción.

### 8.3 Operaciones

`GET /api/admin/operations/:id` devuelve únicamente la operación autorizada: `{operationId,status,stage,attempts,prUrl,errorCode,updatedAt}`. No expone payload completo ni secretos. Reintento de una operación fallida usa `POST /api/admin/operations/:id/retry` con Idempotency-Key y motivo, conforme a I08; la UI solo habilita esa acción para error recuperable y vuelve a validar auth, allowlist, base y auditoría.

## 9. Errores y recuperación

La UI mapea 401 a sesión Access requerida, 403 a ausencia de permiso/origen/CSRF, 404 a ficha no encontrada, 405 a método no permitido, 409 a conflicto o clave idempotente incompatible, 413 a cuerpo mayor de 64 KiB, 415 a Content-Type, 422 a validación de campo, 429 a rate limit con `Retry-After`, 503 a configuración/D1 no disponible y 5xx a error con reintento. Todos los mensajes incluyen `requestId` sin tokens, SQL ni datos privados.

En pérdida de red se conserva el formulario en memoria y se ofrece reintentar; no se asume que la escritura falló hasta consultar el resultado por clave. En D1 caído, el catálogo base puede seguir siendo visible si el contrato lo permite, pero no se presenta estado temporal como confirmado y se deshabilitan mutaciones. En Access ausente o inválido se falla cerrado.

## 10. Accesibilidad y diseño visual

Aplicar un sistema de tokens semánticos de superficie, texto, borde, foco, éxito, advertencia y peligro; contraste mínimo 4.5:1 para texto normal y 3:1 para elementos grandes. El estado siempre combina texto/icono con color. Usar una familia coherente de iconos vectoriales; no usar emojis estructurales. Botones e inputs tienen mínimo 44×44 px, separación de 8 px y feedback de pulsación sin cambiar el layout.

El orden de foco coincide con el orden visual; diálogos tienen título, foco inicial, foco atrapado y escape/cancelar. Tablas anuncian encabezados, orden y paginación; cada botón iconográfico tiene `aria-label`. Soportar teclado completo, zoom, texto aumentado, orientación apaisada y `prefers-reduced-motion`; transiciones 150–300 ms y ninguna animación bloquea entrada. Probar 360 px, escritorio, paisaje y lector de pantalla.

## 11. Trazabilidad y pruebas de aceptación

| ID de aceptación | Evidencia exigida |
| --- | --- |
| I09-A1 / R04 | E2E busca sin tildes, combina filtros, pagina con cursor, calcula conteos dinámicos y distingue unknown de roto |
| I09-A2 / R05 | pruebas de horario cubren siete días, múltiples intervalos, descanso, 24h, excepciones, overnight viernes/sábado, unknown y cita previa |
| I09-A3 / R05 | fixture demuestra minutos exactos, fin 24:00, errores por campo, foco al primer error y preview Costa Rica estable en TZ UTC/Madrid/Los Angeles |
| I09-A4 / R01 | fixture de evidencia inaccesible/contradictoria impide VERIFIED y mantiene referencias, conflictos y limitación |
| I09-A5 / R03 | fixture rechaza `0,0`, protocolo peligroso, host engañoso, redirección abierta y pin sin `address_verified` |
| I09-A6 / R06 | D1 local verifica PUT/DELETE, expiración, auditoría atómica, revisión 409, tombstone e idempotencia con payload distinto |
| I09-A7 / R08 | runner fixture demuestra 202 durable, avance por cron, PR pendiente, conflicto de blob y reintento sin duplicar |
| I09-A8 / R09 | E2E de Workers comprueba Access, allowlist, host alternativo, assets directos, CSRF, 64 KiB, 405, 429 y ausencia de secreto legacy |
| I09-A9 | Playwright a 360 px y teclado verifica labels, `aria-live`, contraste, foco, cambios sin guardar y no scroll horizontal |
| I09-A10 / R07/R12 | regresión comprueba tarjeta, detalle, mapa, filtros, Schema.org, sitemap, Markdown, blog y especies sin disponibilidad inventada |

La validación usa el bundle Workers real, D1 local y mocks solo para proveedores externos. No basta Astro dev, un conteo fijo ni una prueba unitaria aislada. Cada caso conserva comando, revisión, resultado y artefactos; una prueba futura se registra como pendiente hasta ejecutarse.

## 12. Secuencia verificable de implementación

1. I10/I07 preparan frontera, rutas canónicas y rechazo de legacy; comprobar que `/functions` no ofrece escritura y que auth se ejecuta antes de assets.
2. I02/I05 exponen schema, motor, validador, evidencia y fixtures; fijar la misma dependencia YAML para runtime y CI.
3. I08/I11 aplican migraciones aditivas, tablas de auditoría/idempotencia/outbox, CAS y runner Cron; validar DB vacía y baseline existente.
4. Implementar contratos de lectura del catálogo y detalle; probar paginación, filtros, `baseCommit` y degradación D1.
5. Implementar layout accesible, editor de identidad/evidencia y ubicación; ejecutar validación por campo y pruebas de enlaces/mapa local.
6. Implementar editor estructurado de horarios con preview y excepciones; ejecutar todos los fixtures de overnight, unknown, 24h y TZ.
7. Conectar alerta temporal y reportes; probar escritura veraz, expiración, auditoría, 409, idempotencia y resolución.
8. Conectar propuestas y operaciones; probar 202, leases, fallo/429, reconciliación y PR sin auto-merge.
9. Ejecutar suites unitarias, contratos, integración Workers/D1, E2E, accesibilidad y regresión; corregir hasta cumplir la tabla anterior.
10. I11 ejecuta preflight de hosts, Access, bindings, ledger, secretos, GitHub App, cron, backup y rollback en staging. La habilitación remota queda fuera de esta entrega y requiere su proceso autorizado.

## 13. Criterio de promoción de esta spec

Esta spec permanece **CANDIDATA** hasta una auditoría independiente que produzca un informe con SHA256 exacto y veredicto PASS contra el SDD y las dependencias. Un auditor puede exigir correcciones; este documento no se autoaprueba. La existencia de esta spec tampoco prueba que el panel, D1, Access, GitHub, Cron o producción estén provisionados.
