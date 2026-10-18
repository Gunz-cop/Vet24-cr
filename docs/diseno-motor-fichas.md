# Diseño: motor de investigación y mantenimiento de fichas de veterinarias

**Versión:** 1.0, propuesta para revisión del dueño
**Fecha:** 2026-10-18 (Costa Rica)
**Base:** `main` en `b2b490b` (112 fichas en `src/content/clinicas/`)
**Alcance:** este documento es solo diseño. No implementa código ni modifica fichas, workflows ni configuración.
**Documentos que actualiza o reutiliza:** `docs/sdd-panel-admin-y-skill.md` (§4 skill y §12.5 matriz de fuentes), `docs/guia-implementacion-skill-horarios-y-ci.md` (§2 jerarquía de fuentes), `docs/analisis-creacion-fichas-y-horarios.md` e issues #27–#37. Se coordina también con la épica de retirada de tiers, #38–#46.

---

## 0. Resumen ejecutivo

El objetivo es que cada ficha de Vet24 sea **completa, correcta y comprobable**, y que esa calidad no se degrade con el tiempo. Para lograrlo se propone un **motor de fichas** con tres piezas:

1. **Motor determinista** (`src/lib/clinic-lookup/` y una CLI en Node 24). Resuelve enlaces de Maps, identifica la sucursal en Google Places, lee el sitio oficial y su schema.org, normaliza teléfonos, horarios y coordenadas, detecta duplicados y produce un *diff* de la ficha con evidencia. Corre igual en GitHub Actions, en Claude Code y en Codex. En CI no hace ninguna llamada de red.
2. **Skill `investigar-veterinaria`.** Orquesta el motor y añade el juicio que no se puede automatizar: interpretar textos ambiguos, decidir conflictos según las reglas, preparar la confirmación con la clínica y entregar una propuesta. **Nunca publica.** Lo que produce es una PR o una propuesta en el panel.
3. **Mantenimiento periódico** (GitHub Actions con cron mensual). Consulta Places solo por `place_id` y **compara contra la ficha**, no contra datos de Google guardados. Marca para revisión las clínicas cerradas, con horario distinto, con teléfono distinto, con coordenadas desplazadas o con la verificación vencida. El público ve «Verificado el <fecha> · <tipo de fuente>».

Para cumplir los términos, el diseño separa los datos en **dos carriles**:

- **Carril almacenable.** Va a Git: la ficha `.md` y `research/clinics/<slug>.json`. Solo admite hechos de fuentes que se pueden guardar: sitio oficial, publicaciones de la propia clínica, registros oficiales, confirmación directa y pin propio del operador.
- **Carril efímero.** Vive solo en memoria o en artefactos de 30 días o menos. Aquí entra lo que viene de Places (excepto `place_id`) y los fragmentos de Brave Search. Se usa para *identificar* la sucursal y *detectar cambios*, nunca para rellenar campos.

Los datos se obtienen en tres niveles: (1) automático en servidor; (2) asistido en el navegador del dueño, con su sesión y a ritmo humano; y (3) confirmación de la propia clínica, con mensajes que redacta el motor y que siempre envía una persona.

**Tres hallazgos de esta revisión cambian el riesgo del plan.** Están detallados en §1.2 y §11:

- **(a)** Las Condiciones de Google Maps Platform §3.2.3(d)(iii) prohíben usar los Core Services «en un servicio de listados o directorio», y Vet24 es un directorio.
- **(b)** Las Condiciones de Meta §3.2.3 prohíben el acceso automatizado sin permiso previo **aunque no haya sesión iniciada**. Esto afecta al «Facebook sin sesión» del nivel 1.
- **(c)** Google Custom Search JSON API ya no acepta clientes nuevos y deja de funcionar el 1 de enero de 2027. Queda Brave como opción de búsqueda.

El motor está diseñado para **funcionar completo con Places desactivado** (`PLACES_ENABLED=false`). Así, la decisión D1 no bloquea las fases 1 a 3.

**Costo estimado:** USD 0 al mes para 112 fichas, dentro de las cuotas gratuitas mensuales de Places (1 000 llamadas Enterprise, 5 000 Pro e IDs Only ilimitadas) y del crédito mensual de Brave. A precio de lista, sin cuotas gratuitas, la carga inicial cuesta unos USD 10 (Places ≈ USD 8 y Brave ≈ USD 1,7) y el mantenimiento mensual unos USD 2,24 (§5.3.4).

---

## 1. Base verificada

### 1.1 Hechos del código actual

| Hecho | Evidencia | Consecuencia |
| --- | --- | --- |
| El schema de clínica es compartido entre Astro, la API y los scripts | `src/lib/clinic-schema.ts:54-101`, `src/content.config.ts` | Los cambios de contrato se hacen ahí y se validan en todos los consumidores |
| Las coordenadas usan 0 como valor por defecto (centinela) | `src/lib/clinic-schema.ts:91-92`; filtros `src/components/MapaClinicas.astro:23`, `src/lib/admin/api.ts:380` | Hay que migrar a `null` para borradores (SDD §3.2) y validar el rango de Costa Rica y la precisión |
| Precisión real de las coordenadas | Medido en las 112 fichas: de 224 valores, 3 tienen 1 decimal, 26 tienen 2, 94 tienen 3, 87 tienen 4, 8 tienen 5 y 6 tienen 6 | **123/224 valores tienen 3 decimales o menos** (unos 110 m o peor); **64 fichas** tienen al menos uno de sus dos valores en esa situación. Ninguna está en 0,0 ni fuera de la caja continental |
| `schedule_v1` existe en el schema, pero **ninguna ficha lo usa** | `src/lib/clinic-schema.ts:65`; conteo = 0 | El motor produce `schedule_v1` y el texto se deriva con `serializeSchedule` (`src/lib/schedule.ts:157`) |
| Parser conservador disponible | `parseLegacySchedule` (`src/lib/schedule.ts:95-151`) devuelve `parsed/unconfirmed/invalid` | Lo reutiliza el lector de sitios; no se copia el parser |
| Los botones de Waze y Maps buscan por texto | Las 112 fichas usan `waze.com/ul?q=` y `google.com/maps/search/?api=1&query=<texto>`; hay fallback de texto en `src/components/ClinicaCard.astro:46` y `src/components/FiltrosDashboard.astro:212-213` | Se mantiene así por decisión del dueño |
| **El alta del panel genera enlaces por coordenadas** | `src/pages/admin/nueva.astro:78` (`waze.com/ul?ll=lat,lng` y `query=lat,lng`) | Contradice la decisión anterior; se corrige en la fase 1 (§4.3) |
| Validador de evidencia v1 muy estricto | `validSidecar` (`src/lib/admin/api.ts:215-280`): claves exactas, `url` HTTPS obligatoria por fuente (`:239`), hechos con 4 claves exactas (`:254-255`) | No admite una confirmación directa sin URL ni el estado o caducidad por hecho, así que se necesita **schemaVersion 2** (§4.4) |
| El directorio `research/` todavía no existe | `import.meta.glob("../../../research/clinics/*.json")` (`src/lib/admin/api.ts:123-127`) apunta a un directorio vacío | La migración a v2 no tiene datos heredados |
| El proposal-runner escribe ficha y evidencia en un único commit | `src/lib/admin/proposal-runner.ts:209-210` (árbol de 2 rutas) | Para la evidencia de urgencias de #43 y para `status.json` hace falta un árbol de N rutas |
| El runner usa un token estático, no una GitHub App | `GITHUB_TOKEN` en `src/lib/admin/proposal-runner.ts:5,35` y `src/lib/admin/api.ts:172-176`; el SDD D3 pedía GitHub App (`docs/sdd-panel-admin-y-skill.md:25,173`) | Queda como decisión D12 |
| Serialización YAML mediante `JSON.stringify` | `src/lib/admin/proposal-runner.ts:97-109` | Sirve para escalares y listas simples. `schedule_v1` (objeto anidado) se emite como JSON en línea, que es YAML válido; hay que probar que se puede volver a leer (§12) |
| Etiqueta pública de revisión | `lastReviewLabel` (`src/lib/capabilityStatus.ts:253-273`); resumen en `src/pages/clinica/[slug].astro:408-427`; `lastReviewed` JSON-LD `:221` | Se reemplaza por una etiqueta derivada de la evidencia (§9.4) |
| El JSON-LD publica `geo` con las coordenadas de la ficha | `src/pages/clinica/[slug].astro:196-200` | Las coordenadas guardadas tienen que salir de una fuente almacenable (§4.2) |
| El mapa público usa Leaflet con teselas OSM | `src/components/MapaClinicas.astro:136-137` | Ningún contenido de Places puede llegar a Leaflet (Condiciones de Google §3.2.3(e) y Service Specific Terms §14.2) |
| Comprobación de 24/7 aún basada en `Tier A` | `isVerifiedEmergency247` (`src/lib/schedule.ts:214-224`) | Coordinar con #39 (contrato `EmergencyAccess`, sin tiers) |
| El repositorio es **público** | `gh api repos/Gunz-cop/Vet24-cr` → `visibility: public` | Lo que se guarde en `research/` es público. No puede contener datos personales, contenido de Places ni fragmentos de Brave |
| CI actual sin red externa ni secretos | `.github/workflows/ci.yml:8-9` (`contents: read`) y pasos `:20-31` | Las pruebas del motor usan fixtures y bloquean la red |
| Cron de Worker cada minuto solo para propuestas | `wrangler.toml:7`, `src/worker.ts:31-35` | El mantenimiento **no** corre en el Worker; la clave de Places no entra al Worker |

### 1.2 Hallazgos externos que condicionan el diseño (verificados el 2026-10-18)

1. **Caché de Places.** Las Service Specific Terms §14.3 dicen: «Customer may temporarily cache latitude and longitude values from the Places API for up to 30 consecutive calendar days, after which Customer must delete the cached latitude and longitude values». §14.2 prohíbe usar contenido de Places «in conjunction with a non-Google map». La página de políticas de Places dice: «the place ID … is exempt from the caching restrictions. You can therefore store place ID values indefinitely». [G1, G2]
2. **Términos generales de Maps (§3.2.3).** (a)(iii) dice «copy and save business names, addresses, or user reviews» está prohibido. (c) prohíbe crear contenido a partir de contenido de Google Maps. **(d)(iii) prohíbe «use the Google Maps Core Services in a listings or directory service»**. (e) prohíbe «display or use Places content on a non-Google Map». Los «Google Maps Core Services» son los servicios listados por Google, y entre ellos está Places API. [G3] Vet24 es un directorio. El diseño reduce el uso de Places a verificación interna sin mostrar nada al público, pero **la cláusula no distingue uso interno**. Ver D1.
3. **Precedente reciente.** El commit `b2b490b` («Corregir coordenadas de VEHASA Hatillo según Google Maps») guardó coordenadas tomadas de Google Maps en `vehasa-hatillo.md`, que además se muestran sobre Leaflet/OSM y en JSON-LD. Con las reglas de los puntos 1 y 2, esas coordenadas deben **volver a obtenerse de una fuente almacenable** (confirmación de la clínica o pin propio). Ver §13, fase 7, y D14.
4. **Google Custom Search JSON API.** Está «closed to new customers», y los clientes actuales tienen «until January 1, 2027» para migrar. [G6] Para un proyecto nuevo no es una opción viable.
5. **Brave Search API.** Cuesta USD 5 por cada 1 000 consultas e incluye USD 5 de crédito mensual. Sus condiciones §3(b)(i) prohíben «store, cache, or create a database of Search Results», salvo almacenamiento transitorio. [B1, B2] Los fragmentos de Brave son por tanto **efímeros**; lo único que pasa al carril almacenable es la URL de la página propia de la clínica, que después se consulta como fuente separada.
6. **Meta.** Condiciones §3.2.3: «You may not access or collect data from our Products using automated means (without our prior permission)». Según la documentación para desarrolladores, aplica «regardless of whether such automated access or collection is undertaken while logged-in» y «Platform APIs are the only allowable means to access data programmatically». [M1, M2] Por eso **el «Facebook sin sesión» automático en servidor queda desactivado por defecto** (D3). La vía legítima es Graph API con *Page Public Metadata Access*, que exige App Review y verificación del negocio [M3].
7. **Registros oficiales de Costa Rica.**
   - SENASA ofrece una «Consulta de Establecimiento» pública en `sis.senasa.go.cr/establecimiento` que **solo busca por código de establecimiento**, no por nombre [S1, S2]. Sirve para comprobar un código de CVO que la clínica publique o comparta, no para descubrir clínicas.
   - El Colegio de Médicos Veterinarios tiene, según la prensa, un directorio público de **profesionales** [S3]. Su sitio no resolvió desde el entorno de esta revisión. Comprueba personas colegiadas, no establecimientos ni horarios.
   - Ambos se usan solo como comprobación manual de identidad y legitimidad (nivel 2).
8. **GitHub Actions.**
   - El cron solo corre en la rama por defecto, puede retrasarse o descartarse con carga alta y **se desactiva tras 60 días sin actividad en repositorios públicos** [GH1].
   - Los eventos creados con el `GITHUB_TOKEN` del workflow no disparan otros workflows. Hay una excepción: los `pull_request` opened/synchronize/reopened quedan pendientes de aprobación [GH2]. Por eso las PR del motor se abren con un token de GitHub App, para que el CI corra sin pasos manuales.
9. **Codex** busca skills en `.agents/skills` desde el directorio de trabajo hasta la raíz del repositorio [O1]. **Claude Code** las busca en `.claude/skills` (convención del repo: `.claude/skills/agent-readiness`).

---

## 2. Principios y no-objetivos

**Principios**

- **P1. Nada se publica solo.** El motor produce una propuesta (PR o `clinic_proposals`) y la publicación exige un merge humano y CI en verde (SDD D3).
- **P2. Cada hecho almacenado tiene evidencia por campo**: fuente almacenable, URL o referencia, fecha, estado, confianza, conflictos y fecha de revisión.
- **P3. Google identifica y alerta, pero no rellena campos.** Del carril efímero solo pasan a Git el `place_id`, códigos de discrepancia sin valores y fechas de comprobación.
- **P4. Ante un conflicto, el dato queda desconocido**, nunca el más amplio. Una contradicción sobre 24/7 deja la ficha en `REVIEW_REQUIRED` (SDD §4, #43).
- **P5. Determinismo y reproducibilidad.** La misma entrada produce la misma salida; las llamadas externas son inyectables y en CI se usan fixtures sintéticos.
- **P6. Sin evasión de bloqueos.** No hay proxies residenciales, resolución de CAPTCHAs, cuentas falsas, rotación de *user agents* ni scraping de Google Maps o redes sociales. Ante un muro de login, CAPTCHA o 403, el motor registra «inaccesible» y pasa al nivel siguiente.
- **P7. Privacidad.** No se guarda la identidad de informantes, transcripciones, capturas ni números privados (Ley 8968; SDD §4).

**No-objetivos de esta versión**

- Alta masiva automática de clínicas.
- Mostrar datos de Places en el sitio.
- Usar el estado «abierto ahora» de Google.
- Reemplazar los overrides temporales de D1 (#31 y #32).
- Rediseñar la presentación de urgencias, que corresponde a #39 y #40.

---

## 3. Arquitectura

### 3.1 Componentes y dónde corre cada uno

| Componente | Ubicación | Corre en | Red | Secretos |
| --- | --- | --- | --- | --- |
| Contrato de ficha (schema y validaciones) | `src/lib/clinic-schema.ts`, nuevo `src/lib/clinic-validate.ts` | Astro build, Worker, CLI, CI | No | No |
| Contrato de evidencia v2 | nuevo `src/lib/clinic-evidence.ts` | Worker (API admin), CLI, CI | No | No |
| Motor determinista | nuevo `src/lib/clinic-lookup/**` | Node 24: Actions, Claude Code, Codex. **Nunca dentro del bundle del Worker** | Sí, con `fetch` inyectable | Places, Brave |
| CLI | nuevo `scripts/clinic-lookup/cli.ts` (Node 24 ejecuta `.ts` sin compilar, como `npm run test:unit`, `package.json:20`) | Local y Actions | Sí | Por variables de entorno |
| Skill `investigar-veterinaria` | `.agents/skills/investigar-veterinaria/` (canónica, Codex) y copia verificada en `.claude/skills/investigar-veterinaria/` | Claude Code y Codex en la máquina del dueño | Por medio de la CLI y el navegador del dueño | Los del entorno local |
| Workflows | `.github/workflows/clinic-research.yml`, `clinic-maintenance.yml`; extensión de `ci.yml` | GitHub Actions | Sí (CI: no) | Secretos de repositorio o entorno |
| Panel admin y proposal-runner | `src/pages/admin/**`, `src/lib/admin/**` | Cloudflare Worker | GitHub API | Token de la GitHub App |
| Evidencia y estado de mantenimiento | `research/clinics/<slug>.json`, `research/maintenance/status.json` | Git (público) | — | — |

### 3.2 Diagrama

```
                         ┌──────────────── Personas ────────────────┐
                         │ Dueño/operador: navegador con su sesión   │
                         │ (nivel 2) · envía WhatsApp (nivel 3)      │
                         └───────┬───────────────────────┬───────────┘
                                 │ observa / pega         │ confirma
                                 ▼                        ▼
┌────────────── Claude Code / Codex (máquina del dueño) ──────────────┐
│ Skill investigar-veterinaria ──► CLI clinic-lookup ──┐               │
│   (juicio, conflictos, borrador WhatsApp)            │               │
└──────────────────────────────────────────────────────┼───────────────┘
                                                       │ mismo código
┌────────────── GitHub Actions (Node 24) ──────────────┼───────────────┐
│ clinic-research.yml (manual)   clinic-maintenance.yml (cron mensual) │
│              └──────────────► CLI clinic-lookup ◄───┘                │
│                                    │                                 │
│   src/lib/clinic-lookup/  ─────────┼──────────────────────────────┐  │
│   ┌ maps-link ┐ ┌ places-client ┐ ┌ official-site ┐ ┌ search ┐    │  │
│   │ normalize │ │ dedupe        │ │ diff/resolve  │ │ report │    │  │
│   └───────────┘ └───────┬───────┘ └───────┬───────┘ └───┬────┘    │  │
│                         │                 │             │         │  │
│     CARRIL EFÍMERO ◄────┘ (Places,        │  CARRIL     │ Brave   │  │
│     memoria / artefacto ≤ 30 d   Brave)   │  ALMACENABLE│ (pistas)│  │
│     solo pasa: place_id + códigos         ▼             │         │  │
│                          research/clinics/<slug>.json ◄─┘         │  │
│                          src/content/clinicas/<slug>.md           │  │
│                          research/maintenance/status.json         │  │
└───────────────────────────────┬────────────────────────────────────┘
                                │ rama + PR (GitHub App, sin auto-merge)
                                ▼
            CI (ci.yml): validate:clinics · test:lookup (offline) ·
            check:no-google-content · build · e2e
                                │ merge humano
                                ▼
┌──────────── Cloudflare Worker (Astro 7) ─────────────────────────────┐
│ Sitio público: ficha, «Verificado el <fecha> · fuente», Waze/Maps    │
│ por texto, Leaflet (solo datos almacenables)                         │
│ /admin: catálogo con problemas del validador y del mantenimiento,    │
│ editor con evidencia → /api/admin/clinic-proposals → D1 outbox       │
│ → proposal-runner (cron 1 min) → PR                                  │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.3 Frontera entre carriles

El cliente de Places devuelve objetos marcados como `Ephemeral<T>`. Estos objetos tienen un `toJSON()` que **lanza un error**, así que un `JSON.stringify` accidental, la escritura en un archivo o un log fallan en tiempo de ejecución y en las pruebas. Solo dos funciones pueden extraer información de ellos:

- `extractPlaceId()`;
- `compareWithClinic()`, que devuelve códigos de discrepancia **sin valores de Google**.

Los fragmentos de Brave usan el mismo envoltorio. Además, un gate de CI (`check:no-google-content`) revisa `research/` y `src/content/` en busca de claves y patrones de payloads de Google (`regularOpeningHours`, `googleMapsUri`, `places/…`, `formattedAddress`) y de campos de Brave (`extra_snippets`, `description` del resultado).

---

## 4. Contrato de datos

### 4.1 Cambios al schema (`src/lib/clinic-schema.ts`)

Todos los campos nuevos son opcionales, para no romper las 112 fichas. Las reglas estrictas se aplican a fichas **nuevas o modificadas**, y al resto mediante deuda versionada (SDD §12.7).

| Campo | Cambio | Regla |
| --- | --- | --- |
| `latitude`, `longitude` | `z.number().nullable()`; se elimina el `default(0)` cuando todos los consumidores acepten `null` (SDD §3.2) | `null` solo en `estado: pendiente`. Si se publica, debe cumplir §4.2 |
| `location_source` (nuevo) | `z.enum(['clinic_confirmed','official_site','operator_pin','legacy_unknown']).default('legacy_unknown')` | Fichas nuevas o con coordenadas modificadas: distinto de `legacy_unknown`. Prohibido `google`: no existe ese valor |
| `location_verified_at` (nuevo) | `z.iso.date().optional()` | Obligatorio si `location_source ≠ legacy_unknown` |
| `google_place_id` (nuevo) | `z.string().regex(/^[A-Za-z0-9_-]{10,}$/).optional()` | Único identificador de Google que se guarda indefinidamente [G2]. Único entre fichas |
| `google_place_id_checked_at` (nuevo) | `z.iso.date().optional()` | Se refresca si tiene más de 12 meses (recomendación de Google [G4]) |
| `telefono1`, `telefono2`, `whatsapp` | Se mantiene el string; nuevo normalizador | Formato `####-####` (8 dígitos; fijos 2xxx/4xxx, móviles 5–8xxx) o `800-###-####`. Si no cumple: error en fichas nuevas o modificadas, aviso en legado |
| `schedule_v1` | Sin cambios de contrato | El motor lo produce siempre que hay evidencia; los días sin evidencia quedan `unknown` |
| `last_verified`, `verification_source` | Se mantienen, pero **los deriva el motor** a partir de la evidencia (§4.6); no se editan a mano | `verification_source` toma valores de una lista controlada (§9.4) |
| `waze_url`, `maps_url` | Se mantienen en formato de búsqueda por texto, generados por `buildNavLinks()` (§4.3) | Hosts permitidos exactos; sin `ll=` ni coordenadas |
| Booleanos de capacidades | Sin cambios de contrato | Solo `true` con un hecho `confirmed` o `reported` en la evidencia. `false` sigue significando «no confirmado» (`capabilityStatus.ts`) |

No se añade `last_checked` a la ficha. El resultado de la comprobación automática vive en `research/maintenance/status.json` (§7.3), para no tener que tocar 112 fichas cada mes.

### 4.2 Validación de coordenadas (`src/lib/clinic-validate.ts`)

| Regla | Severidad en fichas nuevas o modificadas | Severidad en legado |
| --- | --- | --- |
| Números finitos; no `0,0`; ni `lat` ni `lng` igual a 0 | Error | Error (hoy no hay ninguna) |
| Latitud 8,0–11,3 y longitud −86,0 a −82,5 (caja continental del SDD §3.2) | Error, salvo excepción territorial explícita: Isla del Coco ≈ 5,50 N, −87,06 W, con `location_source` y nota | Error |
| **Precisión**: decimales de la representación numérica más corta, con 5 o más como objetivo | **Error con menos de 4**; **aviso con exactamente 4** (un 5.º decimal en 0 se pierde al convertir a número) | Deuda `coord_precision` (64 fichas) |
| `location_source` almacenable y `location_verified_at` presente | Error | Deuda `coord_source` |
| Coherencia con la zona: distancia a la mediana de las otras fichas de la misma `zona` mayor de 25 km (o de la provincia si es la única) | Aviso que obliga a escribir una nota | Aviso |
| Duplicado espacial: otra ficha a menos de 30 m con teléfono distinto | Aviso de posible sucursal o duplicado (§5.7) | Aviso |
| Deriva respecto a Places (solo en mantenimiento, carril efímero): más de 150 m es aviso y más de 500 m es alta | Código `coord_drift_150` o `coord_drift_500`, sin guardar la coordenada de Google | Igual |

Contexto de las cifras: 3 decimales son unos 111 m y 4 decimales unos 11 m. El error de VEHASA fue de 650 m, que habría saltado como `coord_drift_500`. La comparación de distancias con un valor temporal de Places es un cálculo efímero. No es *point-in-polygon*, que §3.2.3(c)(iv) prohíbe, y no guarda la coordenada de Google.

**Fuentes almacenables de coordenadas**, en orden de preferencia:

1. **Confirmación de la clínica:** un pin de ubicación enviado por WhatsApp o la coordenada que la clínica comparte en respuesta a nuestra solicitud.
2. **Sitio oficial:** `geo` en schema.org o una coordenada publicada por la clínica.
3. **Pin del operador:** colocado en el editor del panel sobre teselas OSM (ya en uso) u ortofotos del SNIT (licencia por verificar, D2), contrastando con la dirección y fotos propias de la clínica.

Un enlace de Google Maps publicado por la clínica sirve **para identificar** la sucursal (su `place_id` o `query_place_id`), pero sus coordenadas no se copian.

### 4.3 Enlaces de navegación (Waze y Google Maps)

Se mantienen por texto, como pide el dueño. Una única función `buildNavLinks({ nombre, zona, provincia })` en `src/lib/clinic-lookup/nav-links.ts` genera:

- `https://waze.com/ul?q=<nombre zona provincia Costa Rica>&navigate=yes`
- `https://www.google.com/maps/search/?api=1&query=<nombre zona provincia Costa Rica>`

Es el mismo formato de las 112 fichas actuales. Se corrige `src/pages/admin/nueva.astro:78`, que hoy genera `ll=` y `query=lat,lng`. El validador exige host exacto (`waze.com`, `www.google.com`), HTTPS, sin credenciales y un máximo de 2 048 caracteres [G5].

Hay una mejora opcional que mantiene la búsqueda por texto: añadir `&query_place_id=<google_place_id>`. Según la documentación de Maps URLs, `query_place_id` tiene prioridad y `query` queda como respaldo [G5], lo que evitaría abrir otra sucursal con el mismo nombre. Waze no admite `place_id`. **Por defecto no se aplica**; queda como D8.

### 4.4 Evidencia v2 (`research/clinics/<slug>.json`)

**Contrato** (zod en `src/lib/clinic-evidence.ts`, compartido por la API admin, la CLI y CI):

```ts
type EvidenceStatus = 'new' | 'under_review' | 'confirmed' | 'reported' | 'conflicted' | 'expired' | 'rejected'; // mismos estados que #43
type SourceKind =
  | 'official_site'        // sitio de la clínica (incluye schema.org)
  | 'official_social'      // publicación/página propia en redes, observada por una persona (nivel 2)
  | 'direct_confirmation'  // confirmación de la clínica (nivel 3)
  | 'official_registry'    // SENASA (código CVO), Colegio (profesional), etc.
  | 'operator_observation' // pin propio, visita, foto propia (no se publica la foto)
  | 'legacy';              // dato heredado sin fuente
interface EvidenceV2 {
  schemaVersion: 2;
  slug: string;
  observedAt: string;               // ISO UTC; última modificación del archivo
  identity: {
    googlePlaceId?: string;         // almacenable (G2)
    placeIdCheckedAt?: string;      // YYYY-MM-DD
    matchMethod?: string;           // p. ej. "places_text_search+phone+distance"
    branchNote?: string;            // por qué es esta sucursal y no otra
  };
  sources: Array<{
    id: string;                     // "s1", "s2"… referenciado por facts/conflicts
    kind: SourceKind;
    url?: string;                   // HTTPS; obligatoria salvo direct_confirmation / operator_observation
    platform?: 'facebook' | 'instagram' | 'whatsapp' | 'tiktok' | 'web';
    method?: 'whatsapp' | 'telefono' | 'correo' | 'formulario' | 'presencial' | 'navegador_dueno' | 'motor';
    reference?: string;             // id opaco de confirmación (directConfirmationSchema, clinic-schema.ts:45-48)
    consultedAt: string;            // ISO UTC
    publishedAt?: string;           // si la fuente declara fecha
    capturedBy: 'engine' | 'owner' | 'operator' | 'clinic';
    note?: string;                  // ≤ 280 caracteres, sin datos personales ni texto copiado extenso
  }>;
  facts: Array<{
    field: string;                  // ruta en la ficha: "telefono1", "schedule_v1.days.1", "location", "atiendeExoticos"
    value: unknown;                 // valor normalizado tal como irá a la ficha
    status: EvidenceStatus;
    confidence: 'high' | 'medium' | 'low';
    sources: string[];              // ids de sources (≥ 1)
    observedAt: string;
    reviewBy: string;               // YYYY-MM-DD según política de frescura (§4.5)
  }>;
  conflicts: Array<{
    field: string;
    values: unknown[];              // solo valores de fuentes almacenables
    sources: string[];
    status: 'open' | 'resolved';
    resolution?: string;            // regla aplicada (R1..R12) y razonamiento breve
  }>;
  checks: Array<{                   // comprobaciones automáticas; SIN valores de Google/Brave
    provider: 'google_places' | 'official_site' | 'brave_search';
    checkedAt: string;
    outcome: 'match' | 'discrepancy' | 'not_found' | 'closed_temporarily' | 'closed_permanently' | 'inaccessible' | 'skipped';
    codes: string[];                // p. ej. ["hours_mismatch:0,6", "phone_absent", "coord_drift_150"]
  }>;
  pending: Array<{ field: string; level: 2 | 3; action: string }>;
  externalRefs?: { emergencyAccess?: string }; // "research/emergency-access-evidence.json#<slug>" (#43)
}
```

**Ejemplo** (ilustrativo y sintético; no es evidencia real de VEHASA):

```json
{
  "schemaVersion": 2,
  "slug": "vehasa-hatillo",
  "observedAt": "2026-10-20T15:42:00Z",
  "identity": {
    "googlePlaceId": "ChIJ_EJEMPLO_SINTETICO_123",
    "placeIdCheckedAt": "2026-10-20",
    "matchMethod": "places_text_search+phone+distance",
    "branchNote": "Única sede con este teléfono; la otra marca homónima está en Escazú (>8 km)."
  },
  "sources": [
    { "id": "s1", "kind": "official_site", "url": "https://clinica-ejemplo.cr/contacto", "method": "motor", "consultedAt": "2026-10-20T15:30:00Z", "capturedBy": "engine", "note": "JSON-LD VeterinaryCare con telephone y openingHoursSpecification" },
    { "id": "s2", "kind": "official_social", "platform": "facebook", "url": "https://www.facebook.com/clinica.ejemplo", "method": "navegador_dueno", "consultedAt": "2026-10-20T15:35:00Z", "publishedAt": "2026-09-30T00:00:00Z", "capturedBy": "owner", "note": "Publicación fijada con horario de octubre" },
    { "id": "s3", "kind": "direct_confirmation", "method": "whatsapp", "reference": "conf-2026-10-20-001", "consultedAt": "2026-10-20T15:40:00Z", "capturedBy": "operator" }
  ],
  "facts": [
    { "field": "telefono1", "value": "2254-1920", "status": "confirmed", "confidence": "high", "sources": ["s1", "s3"], "observedAt": "2026-10-20T15:40:00Z", "reviewBy": "2027-10-20" },
    { "field": "schedule_v1.days.1", "value": { "kind": "open", "intervals": [{ "start": 480, "end": 1140 }] }, "status": "confirmed", "confidence": "high", "sources": ["s1", "s2", "s3"], "observedAt": "2026-10-20T15:40:00Z", "reviewBy": "2027-04-18" },
    { "field": "schedule_v1.days.0", "value": { "kind": "unknown" }, "status": "conflicted", "confidence": "low", "sources": ["s1", "s2"], "observedAt": "2026-10-20T15:35:00Z", "reviewBy": "2026-11-19" },
    { "field": "location", "value": { "lat": 9.917512, "lng": -84.096233, "location_source": "clinic_confirmed" }, "status": "confirmed", "confidence": "high", "sources": ["s3"], "observedAt": "2026-10-20T15:40:00Z", "reviewBy": "2028-10-20" }
  ],
  "conflicts": [
    { "field": "schedule_v1.days.0", "values": [{ "kind": "open", "intervals": [{ "start": 480, "end": 960 }] }, { "kind": "closed" }], "sources": ["s1", "s2"], "status": "open", "resolution": "R1: sin elegir el más amplio; domingo queda unknown hasta confirmación (pending nivel 3)." }
  ],
  "checks": [
    { "provider": "google_places", "checkedAt": "2026-10-20T15:31:00Z", "outcome": "discrepancy", "codes": ["hours_mismatch:0", "coord_drift_500"] },
    { "provider": "official_site", "checkedAt": "2026-10-20T15:30:00Z", "outcome": "match", "codes": ["jsonld_found"] }
  ],
  "pending": [
    { "field": "schedule_v1.days.0", "level": 3, "action": "Preguntar por WhatsApp si abren domingos." }
  ],
  "externalRefs": { "emergencyAccess": "research/emergency-access-evidence.json#vehasa-hatillo" }
}
```

**Compatibilidad**

- `validSidecar` (`src/lib/admin/api.ts:215-280`) se sustituye por `evidenceSchema.safeParse` (v1 ∪ v2). La v1 se acepta solo para leer; toda escritura nueva es v2. Hoy no hay archivos v1 en Git, así que no hay migración de datos.
- El editor (`src/pages/admin/editar/[slug].astro:75`) y el alta (`src/pages/admin/nueva.astro:79`) pasan a construir v2.
- Las afirmaciones de urgencias (modalidad, presencia nocturna, walk-ins, canal) siguen la fuente canónica de #43, `research/emergency-access-evidence.json`. El sidecar solo las **referencia** en `externalRefs.emergencyAccess` y no las duplica. Cuando el motor encuentra evidencia de urgencias, la PR modifica ambos archivos (§9.3).

### 4.5 Política de frescura (`reviewBy`)

| Campo | Vigencia de `confirmed` | Al vencer |
| --- | --- | --- |
| Horario (`schedule_v1`) | 180 días | `expired`; público: «Horario por reconfirmar». El evaluador sigue el SDD; el mantenimiento lo marca |
| Teléfono y WhatsApp | 365 días | `expired`; marca `verification_expired:phone` |
| Urgencias y 24/7 (registro de #43) | 90 días | `expired`, que se proyecta como `unknown` (#39) |
| Coordenadas | 730 días | Aviso; no se degrada la publicación |
| Servicios (exóticos, cirugía, hospitalización, hotel, especies) | 365 días | `expired`; la etiqueta pública pasa a «reportado» |
| Existencia (no cerrada) | Comprobación mensual (Places `businessStatus`) | Ver R7 |

Las vigencias son una propuesta y quedan sujetas a la decisión D9.

### 4.6 Cómo se derivan los campos de verificación

La función `deriveVerification(evidence, now)` es pura y vive en `src/lib/clinic-evidence.ts`. Calcula, sin intervención manual:

- `phone_verified`, `address_verified`, `schedule_verified`: `true` si el campo tiene un hecho `confirmed` vigente.
- `emergency_verified`: lo resuelve #39 a partir del registro de #43.
- `last_verified`: la fecha más reciente entre los hechos `confirmed` vigentes de teléfono, ubicación y horario.
- `verification_source`: etiqueta controlada según la fuente de mayor rango que respalda esos hechos. Puede ser «Confirmación directa de la clínica», «Sitio oficial», «Publicación oficial de la clínica», «Registro oficial» o «Sin fuente verificable».
- `record_status`:
  - `VERIFIED` si teléfono, ubicación y horario están `confirmed`, vigentes y sin conflictos abiertos;
  - `REVIEW_REQUIRED` si hay algún conflicto abierto, un código `closed_*` o una contradicción de 24/7;
  - `PARTIAL` en los demás casos.
- `officially_confirmed`: `true` solo si existe una `direct_confirmation` vigente.

CI comprueba que la ficha y la derivación coinciden: si alguien edita a mano `record_status: VERIFIED` sin la evidencia correspondiente, CI falla.

---

## 5. Motor determinista (`src/lib/clinic-lookup/`)

### 5.1 Módulos

| Módulo | Responsabilidad | Entradas y salidas |
| --- | --- | --- |
| `types.ts` | Tipos `Candidate`, `Fact`, `Ephemeral<T>`, `LookupContext` (fetch, reloj y presupuesto inyectables) | — |
| `net.ts` | `safeFetch`: solo HTTPS, resolución DNS con bloqueo de rangos privados y loopback, máximo 3 redirecciones con revalidación de host, timeout de 10 s, límite de 2 MB y `User-Agent: Vet24Bot/1.0 (+https://vet24cr.com/acerca)`. Si `CLINIC_LOOKUP_OFFLINE=1`, lanza un error | URL → `Response` |
| `maps-link.ts` | Resuelve enlaces de Maps y Waze (§5.2) | URL → `{placeId?, cid?, textQuery?, hintPoint?: Ephemeral}` |
| `places-client.ts` | Places API (New): Text Search y Place Details con field masks (§5.3) | consulta → `Ephemeral<PlaceSnapshot>` |
| `official-site.ts` | Lector de sitio oficial y schema.org (§5.4) | dominio → `Fact[]` almacenables |
| `search-client.ts` | Brave Search: descubre URLs propias de la clínica (§5.5) | consulta → `Ephemeral<Hit[]>` |
| `normalize/phone.ts` | Teléfonos de Costa Rica | `"+506 2254 1920"` → `"2254-1920"` |
| `normalize/hours.ts` | Texto → `ScheduleV1` (por medio de `parseLegacySchedule`); `openingHoursSpecification` → `ScheduleV1`; `periods` de Places → `ScheduleV1` (efímero, solo para comparar) | — |
| `normalize/text.ts` | Nombres y direcciones: minúsculas, sin tildes, sin «clínica/veterinaria/hospital», tokens | — |
| `normalize/geo.ts` | Haversine, decimales, caja de Costa Rica, coherencia de zona | — |
| `dedupe.ts` | Decide si un candidato es la misma ficha, una sucursal, otra clínica o un caso ambiguo (§5.7) | — |
| `resolve.ts` | Aplica las reglas R1–R12 (§6.3) a los hechos | `Fact[]` → decisiones por campo y conflictos |
| `diff.ts` | Diferencia entre la ficha actual y la candidata, con motivo por campo | `Clinic`, `Clinic` → `FieldDiff[]` |
| `compare.ts` | `compareWithClinic(snapshot, clinic)` → códigos sin valores de Google | — |
| `evidence-writer.ts` | Construye y fusiona el sidecar v2 de forma estable (claves ordenadas, LF, salto de línea final) | — |
| `report.ts` | Informe Markdown para el cuerpo de la PR o issue, escapado y de 20 KB como máximo | — |
| `nav-links.ts` | `buildNavLinks()` (§4.3) | — |

**Frontera de runtime.** `scripts/admin/check-runtime-boundary.mjs` se amplía para fallar si cualquier módulo de `src/lib/clinic-lookup/` aparece en el bundle del Worker. Los únicos módulos compartidos con el Worker son `clinic-schema.ts`, `clinic-validate.ts`, `clinic-evidence.ts` y `nav-links.ts`.

### 5.2 Resolución de enlaces de Maps (`maps-link.ts`)

- **Hosts permitidos (lista exacta):** `maps.app.goo.gl`, `goo.gl` (solo la ruta `/maps/…`), `www.google.com` y `maps.google.com` (ruta `/maps…`), `waze.com`, `www.waze.com` y `ul.waze.com`. Cualquier otro host se rechaza (protección contra SSRF y redirección abierta, SDD §7.2).
- **Enlaces cortos:** se siguen con `HEAD` o `GET` sin cuerpo, **sin cookies** y con un máximo de 3 saltos, revalidando el host en cada salto. Si la respuesta es una página de consentimiento o un CAPTCHA, el resultado es `inaccessible` y no se reintenta.
- **Extracción, por prioridad:**
  1. `query_place_id=` o `place_id:` → `placeId`.
  2. `cid=` o `ludocid=` → `cid`. Es un identificador interno de Maps. No se guarda; solo sirve para buscar con Text Search por nombre y comparar `googleMapsUri` de forma efímera.
  3. `!3d<lat>!4d<lng>` (posición del lugar) → `hintPoint`.
  4. `@lat,lng,zoom` es **el centro de la cámara, no el pin**. Se usa solo como sesgo de búsqueda (`locationBias`) y nunca como coordenada candidata.
  5. `/place/<nombre>/` y `q=` → `textQuery`.
- **Waze:** `ll=` → `hintPoint`; `q=` → `textQuery`.
- `hintPoint` es `Ephemeral`, porque una coordenada sacada de un enlace de Google también es contenido de Google. Sirve para el sesgo de búsqueda y para el cálculo de distancia en la deduplicación.

### 5.3 Cliente de Places API (New) (`places-client.ts`)

#### 5.3.1 Llamadas y field masks

Todas las llamadas usan `X-Goog-FieldMask` (obligatorio en Text Search [G7]), `languageCode: "es"` y `regionCode: "CR"`. El SKU que se cobra es **el más alto entre los campos pedidos** [G8].

| Paso | Endpoint | Field mask | SKU [G8] |
| --- | --- | --- | --- |
| A. Candidatos | `POST https://places.googleapis.com/v1/places:searchText` con `textQuery: "<nombre> <zona> Costa Rica"`, `includedType: "veterinary_care"`, `pageSize: 5`, `locationBias` (círculo de 5 km en la mediana de la zona o en `hintPoint`) | `places.id` | **Text Search Essentials (IDs Only)**: gratis e ilimitado |
| B. Identificación (hasta 3 candidatos) | `GET https://places.googleapis.com/v1/places/{id}` | `id,displayName,formattedAddress,location,businessStatus,types,primaryType,googleMapsUri` | **Place Details Pro** |
| C. Contraste (candidato elegido) y mantenimiento | `GET …/places/{id}` | `id,displayName,businessStatus,location,regularOpeningHours,currentOpeningHours,nationalPhoneNumber,internationalPhoneNumber,websiteUri,utcOffsetMinutes` | **Place Details Enterprise** |
| D. Refresco de `place_id` (más de 12 meses o `NOT_FOUND`) | `GET …/places/{id}` | `id` (y `movedPlaceId` si está disponible) | **Place Details Essentials (IDs Only)**: gratis [G4] |

#### 5.3.2 Reglas de uso

- **Lo único que se guarda es `id`.** `websiteUri` se usa en memoria para encontrar el sitio oficial, que luego se consulta como fuente propia. La URL que acaba en la ficha es la del sitio (fuente `official_site`), no un dato copiado de Places, y se registra solo si el sitio responde y se identifica como de la clínica (nombre o teléfono coinciden).
- `NOT_FOUND`: se intenta el paso D. Si no hay `movedPlaceId`, se repite A, que es gratis, y se marca `place_id_obsolete`.
- **Presupuesto:** `MAX_PLACES_CALLS` por ejecución (300 por defecto) y un contador por SKU. Al agotarse, el resultado es `skipped`, nunca un error silencioso.
- **Reintentos:** máximo 2 ante 429/5xx, con espera exponencial y `Retry-After`. Si la cuota está agotada, el resultado es `skipped`.
- La clave nunca aparece en logs. Las solicitudes se registran por SKU y estado, sin cuerpo.

#### 5.3.3 Comparación (`compare.ts`)

Los códigos se guardan **sin valores**:

- `closed_permanently`, `closed_temporarily` (de `businessStatus`).
- `hours_mismatch:<días>`: se compara la conversión de `regularOpeningHours.periods` a `ScheduleV1` con `schedule_v1` de la ficha. `currentOpeningHours` solo se usa para anotar `special_hours_next7` como pista de feriados.
- `hours_24_conflict`: Google indica 24 h y la ficha no, o al revés. Es el disparador de R4.
- `phone_absent`: ninguno de los teléfonos de la ficha aparece en Places.
- `phone_extra`: Places tiene un número que no está en la ficha. **No se guarda el número.**
- `website_mismatch`: el dominio es distinto.
- `coord_drift_150` y `coord_drift_500`.
- `name_changed`: la similitud de nombre baja de 0,6.

#### 5.3.4 Costo estimado

Precios de lista consultados el 2026-10-18 [G8]. Hay una cuota gratuita mensual por SKU y por cuenta de facturación: Essentials 10 000, Pro 5 000 y Enterprise 1 000.

| Escenario | Llamadas/mes | Costo con cuota gratuita | Costo a precio de lista (sin cuota) |
| --- | --- | --- | --- |
| **Carga inicial de 112 fichas**: A ×1–2, B ×≤3, C ×1 | A ≤ 224 (IDs Only), B ≤ 336 (Pro, USD 17/1000), C 112 (Enterprise, USD 20/1000) | **USD 0** | 336 × 0,017 + 112 × 0,020 ≈ **USD 7,95** |
| **Mantenimiento mensual**: C ×112 y D cuando corresponda | 112 Enterprise y D gratis | **USD 0** | 112 × 0,020 = **USD 2,24** |
| Mantenimiento semanal (opción D9) | ≈ 485 Enterprise | USD 0 | ≈ USD 9,70 |
| Crecimiento a 500 fichas, semanal | ≈ 2 165 Enterprise | (2 165 − 1 000) × 0,020 ≈ **USD 23,30** | ≈ USD 43,30 |
| Brave (solo altas e investigación, unas 3 consultas por clínica) | ≈ 336 en la carga inicial | USD 0 (crédito de USD 5 al mes) | ≈ USD 1,68 |

Las cuotas gratuitas se suman entre todos los proyectos de la cuenta de facturación. Si el dueño ya usa Places para otra cosa, comparten cuota. Para el costo de Brave, ver la nota de §11.2.

### 5.4 Lector de sitio oficial (`official-site.ts`)

- **Alcance:** solo el dominio oficial (desde la ficha, el panel, Brave o `websiteUri` efímero), con un máximo de 6 páginas: `/`, y rutas o enlaces del menú que contengan *contacto*, *horario*, *servicios*, *emergencias*, *ubicación* o *nosotros*.
- **Cortesía:** respeta `robots.txt` (biblioteca de parseo fijada en el lockfile, sin `crawl-delay` menor de 2 s) y hace 1 solicitud cada 2 s por dominio. No ejecuta JavaScript. Si el contenido solo existe con JS, registra `inaccessible:js_required` y pasa al nivel 2.
- **Qué extrae, por prioridad:**
  1. **JSON-LD y microdata** de schema.org: `@type` ∈ {`VeterinaryCare`, `LocalBusiness`, `MedicalBusiness`, `AnimalShelter`}; `telephone`, `openingHoursSpecification` (convertido a `ScheduleV1` con la misma convención 23:59 = 24 h de `scheduleToSchemaOrg`, `src/lib/schedule.ts:196-206`), `geo`, `address`, `sameAs` (para descubrir redes propias) y `name`.
  2. Enlaces `tel:` y `https://wa.me/506…` y `api.whatsapp.com/send?phone=506…`.
  3. Texto visible con patrones de horario («Lunes a viernes 8 a. m.–6 p. m.», «12md»), procesado con `parseLegacySchedule`. Si el resultado es `invalid`, no se genera ningún hecho y queda un diagnóstico.
  4. Palabras clave de servicios («exóticos», «cirugía», «internamiento», «hospitalización», «hotel», «grandes especies»). Generan hechos `reported` con confianza `medium`. **Nunca** se marca 24/7 por palabras clave (R4).
- **Identificación:** el sitio solo se acepta como `official_site` si el nombre normalizado o algún teléfono coinciden con la ficha o el candidato. Si no, es `inaccessible:identity_unproven`.
- **Inyección de instrucciones:** el texto del sitio es **dato**. Se extrae con reglas y nunca se pasa como instrucción a un LLM. La skill recibe hechos estructurados y extractos de 280 caracteres como máximo, marcados como no confiables.

### 5.5 Búsqueda de pistas (`search-client.ts`, Brave)

- **Consultas** (máximo 3 por clínica): `"<nombre>" <zona> veterinaria`, `"<nombre>" site:facebook.com` y `"<nombre>" site:instagram.com`.
- **Uso:** encontrar las URLs propias de la clínica (sitio, página de Facebook o Instagram) para los niveles 1 y 2. Los fragmentos se muestran a la skill como pista y **no se guardan** (Brave §3(b)(i)). En el sidecar solo queda un `check` con `provider: brave_search` y códigos (`candidate_site_found`, `candidate_facebook_found`).
- Una URL de Facebook o Instagram encontrada **no** se consulta automáticamente desde el servidor (D3). Pasa a `pending` de nivel 2.
- Google Programmable Search **no se usa**: no acepta clientes nuevos y deja de funcionar el 1 de enero de 2027 [G6].

### 5.6 Normalizadores

| Normalizador | Reglas | Casos de prueba |
| --- | --- | --- |
| Teléfono | Quita `+506`, `(506)`, espacios, puntos y guiones. Exige 8 dígitos con primer dígito en {2,4,5,6,7,8}, o el formato 800 de 10 dígitos. Salida `####-####` | `+506 2254 1920`, `2254.1920`, `506-8993-3471`, `8993 3471 (WhatsApp)`, `800-VET-0000` (inválido) |
| WhatsApp | Del enlace `wa.me/506XXXXXXXX` o del texto «WhatsApp» cercano. Debe ser móvil (5–8) | `wa.me/50689933471` |
| Horario | El texto pasa por `parseLegacySchedule`; schema.org por un conversor dedicado; Places `periods` (efímero) también, con `day` 0 = domingo, igual que `ScheduleV1`. Si un periodo cruza la medianoche, se divide como en SDD §3.1. Si no hay `close`, es 24 h | almuerzo, 12md, sábado medio día, viernes 22–02, 24 h, «cita previa» |
| Nombre y dirección | NFKD sin tildes, minúsculas, sin «clínica», «veterinaria», «hospital», «centro», «vet», «s.a.», con tokens ordenados. Las direcciones conservan las señas de Costa Rica («100 m norte de…») | «Hospital Veterinario VEHASA (Beasa)» frente a «Vehasa» |
| Geo | Decimales, caja de Costa Rica, haversine y mediana de zona | ver §4.2 |

### 5.7 Deduplicación (`dedupe.ts`)

Puntuación determinista para cada par formado por un candidato (o una ficha nueva) y una ficha existente:

| Señal | Efecto |
| --- | --- |
| Mismo `google_place_id` | **Misma ficha** (sin más análisis) |
| Algún teléfono normalizado coincide y distancia < 300 m | Misma ficha |
| Mismo dominio web oficial y distancia < 300 m | Misma ficha |
| Similitud de nombre ≥ 0,85 y distancia < 100 m | Misma ficha |
| Similitud ≥ 0,85, distancia > 300 m y teléfonos distintos | **Sucursal**: ficha distinta y slug con la zona. Se exige `identity.branchNote` con evidencia |
| Mismo teléfono y distancia > 1 km | **Ambiguo**: puede ser una central telefónica de cadena. Requiere revisión humana |
| Nada de lo anterior | Clínica distinta |

La distancia se calcula con las coordenadas de la ficha, que son almacenables, o con coordenadas efímeras de Places solo durante la ejecución. Un resultado ambiguo detiene el flujo de alta (P1).

### 5.8 Diff y propuesta

`diff.ts` produce `FieldDiff { field, before, after, reason, rule, sources[] }`, ordenado por un orden canónico de campos. Reglas del diff:

- Nunca elimina campos ajenos al motor ni el cuerpo Markdown (igual que el runner, `src/lib/admin/proposal-runner.ts:102-109`).
- Nunca cambia `slug` ni `id`.
- Solo propone `estado: inactivo` con R7 y evidencia de nivel 2 o 3.

### 5.9 CLI (`scripts/clinic-lookup/cli.ts`)

```
node scripts/clinic-lookup/cli.ts investigate --slug vehasa-hatillo [--maps-url URL] [--places] [--search] --out .tmp/lookup/
node scripts/clinic-lookup/cli.ts investigate --new "Nombre de la clínica" --zona "Hatillo" --provincia "San José" ...
node scripts/clinic-lookup/cli.ts maintain --all|--slugs a,b [--budget 300] --out .tmp/maintenance.json
node scripts/clinic-lookup/cli.ts link "https://maps.app.goo.gl/…"         # diagnóstico de enlace
node scripts/clinic-lookup/cli.ts validate [--changed-since origin/main]  # = npm run validate:clinics
node scripts/clinic-lookup/cli.ts whatsapp --slug X                       # borrador de mensaje nivel 3
```

**Salidas en `.tmp/lookup/<slug>/`** (en `.gitignore`):

- `candidate.md`: la ficha propuesta;
- `evidence.json`: el sidecar v2;
- `diff.json`;
- `report.md`;
- `pending.json`.

Los artefactos efímeros con contenido de Google o Brave van a `.tmp/ephemeral/` y se borran al terminar. En Actions no se suben como artefacto; si hiciera falta para depurar, se suben con `retention-days: 7`.

---

## 6. Skill `investigar-veterinaria`

Este diseño actualiza el SDD §4, que nunca llegó a construirse.

### 6.1 Ubicación y estructura

```
.agents/skills/investigar-veterinaria/          # canónica (Codex la descubre aquí [O1])
├── SKILL.md                                    # flujo, reglas R1–R12, límites, formato de salida
├── templates/
│   ├── whatsapp-confirmacion.md                # mensaje nivel 3 (variantes: alta, actualización, 24/7)
│   ├── checklist-nivel2.md                     # qué mirar en el navegador y qué NO hacer
│   └── informe-pr.md                           # estructura del cuerpo de PR
└── references/
    ├── fuentes.md                              # matriz §8 y términos (§11)
    └── reglas-conflicto.md                     # R1–R12 con ejemplos
.claude/skills/investigar-veterinaria/SKILL.md  # copia byte a byte; CI verifica igualdad (scripts/skills/check-sync.mjs)
```

No se usan symlinks porque el dueño también trabaja en Windows (ver las rutas `c:\Users\…` en `docs/guia-implementacion-skill-horarios-y-ci.md:119`). La skill **no contiene lógica propia de parseo**: llama a la CLI. Así se cumple el SDD §4, que exige que los wrappers llamen al contrato central.

### 6.2 Flujo de la skill

1. **Preparar.** Leer el schema (`src/lib/clinic-schema.ts`), la ficha y el sidecar existentes, `research/maintenance/status.json` y el registro de urgencias de #43. Si es un alta, comprobar duplicados con `cli validate` y `dedupe`.
2. **Nivel 1 (automático).** Ejecutar `cli investigate` (con `--places` solo si `PLACES_ENABLED=true`). La skill recibe los hechos almacenables, las pistas efímeras y los códigos.
3. **Interpretar.** Revisar los diagnósticos `invalid` del horario y los textos ambiguos del sitio (siempre como dato no confiable) y proponer hechos con estado `reported`. La skill no puede subir un hecho a `confirmed` sin una fuente almacenable que lo diga explícitamente.
4. **Nivel 2 (asistido, solo si queda algo pendiente y el dueño lo autoriza en esa sesión).** Ver §8.2. El resultado son fuentes `official_social` u `operator_observation` con su URL, fecha y una nota breve.
5. **Nivel 3 (confirmación).** Generar el mensaje de WhatsApp (`cli whatsapp`), con un enlace `https://wa.me/506XXXXXXXX?text=…` para el **número que ya consta en la ficha o en el sitio oficial**. El dueño lo envía y luego pega la respuesta, que la skill transcribe como hechos `confirmed` con `reference` opaco. La transcripción no se guarda.
6. **Resolver.** Aplicar R1–R12 (§6.3) con `resolve.ts`. Los conflictos abiertos dejan el campo en `unknown` o vacío.
7. **Validar.** Ejecutar `npm run validate:clinics` sobre la colección candidata, escribiendo a un archivo temporal y sustituyendo de forma atómica (SDD §4).
8. **Entregar.**
   - En Claude Code o Codex: crear la rama `engine/<slug>-<fecha>`, hacer commit de la ficha y el sidecar (y del registro de #43 si aplica) y abrir una PR con `informe-pr.md`. El commit y el push solo se hacen si el dueño lo pide en esa sesión.
   - Alternativa: exportar el paquete para el panel (`/admin/editar/<slug>` → «Importar propuesta»).

### 6.3 Reglas de resolución de conflictos

Tienen precedencia sobre la jerarquía de `docs/guia-implementacion-skill-horarios-y-ci.md` §2.2, que ponía Google Maps como «máxima prioridad». Esa jerarquía queda **sustituida**: Google identifica y alerta (P3) y no es fuente de hechos almacenados.

| Regla | Situación | Resolución |
| --- | --- | --- |
| **R1** | Dos fuentes almacenables dan horarios distintos para un día | Ese día queda `unknown`, el conflicto queda `open` y se añade un `pending` de nivel 3. **Nunca** se elige el intervalo más amplio |
| **R2** | Places difiere de una fuente almacenable | No se cambia nada en automático. Se registra el código `*_mismatch` y la ficha pasa a `REVIEW_REQUIRED` si el campo es horario o teléfono. Se resuelve solo con nivel 2 o 3 |
| **R3** | Precedencia entre fuentes almacenables no contradictorias | `direct_confirmation` vigente > `official_site` con fecha > `official_social` con fecha (de los últimos 180 días) > `official_site` sin fecha > `official_registry` (solo identidad y legitimidad) > `legacy`. Entre fuentes del mismo rango gana la más reciente |
| **R4** | Afirmaciones de 24/7 o urgencias | Mientras exista `Tier A`, exige confirmación directa documentada, horario de 24 h los 7 días, `overnight_doctor_present`, `accepts_emergency_walkins` y canal. Después de #39, exige `onsite_247` `confirmed`. Si el marketing dice «24/7» pero el horario físico es menor, queda `REVIEW_REQUIRED` y se clasifica como `after_hours_call` o `unknown` según la evidencia. `hours_24_conflict` siempre lleva a revisión |
| **R5** | Teléfonos | Un teléfono publicado por la clínica (sitio o publicación propia) es `reported`; con confirmación directa pasa a `confirmed`. Un teléfono que solo aparece en Places no se guarda: código `phone_extra` y `pending` de nivel 3 |
| **R6** | Coordenadas | Solo de fuentes almacenables (§4.2), con 4 decimales o más y `location_source`. Con `coord_drift_500` se pide pin de nivel 3 o pin del operador; con `coord_drift_150`, revisión |
| **R7** | `closed_permanently` | Se propone `REVIEW_REQUIRED` y **no** se marca `inactivo` hasta tener evidencia de nivel 2 o 3: publicación de cierre, teléfono fuera de servicio en dos intentos con 7 días de diferencia, o visita. Con `closed_temporarily` se sugiere un override temporal de D1 (#31 y #32) con fecha de expiración, tras comprobación humana |
| **R8** | Duplicados y sucursales | Según §5.7. Un caso ambiguo detiene el alta |
| **R9** | Nombre y dirección | Salen del sitio oficial, de la confirmación o del operador. `displayName` y `formattedAddress` de Places solo sirven para emparejar y **nunca** se copian (§3.2.3(a)(iii)) |
| **R10** | Sin evidencia | El campo queda vacío o `unknown`. Los booleanos quedan en `false`, que significa «no confirmado», y nunca se infiere un «no» |
| **R11** | Fuente inaccesible (login, CAPTCHA, 403, solo JS) | Se registra `inaccessible:<motivo>` y se pasa al nivel siguiente, sin reintentar ni evadir |
| **R12** | Datos de terceros (directorios ajenos, agregadores, chip247, voofla) | Se tratan como pista y nunca dan `confirmed`; como mucho `reported` con confianza `low` si coinciden con otra fuente. En la base actual, al menos 4 fichas usan agregadores ajenos (chip247, petsmas, voofla) como `verification_source` |

### 6.4 Salida de la skill

- La PR (o el paquete para el panel) contiene: la ficha candidata, el sidecar v2, el registro de #43 si aplica y el informe.
- El informe incluye:
  - tabla de cambios por campo con fuente y regla aplicada;
  - conflictos abiertos;
  - pendientes de nivel 2 y 3;
  - mensaje de WhatsApp listo para copiar;
  - resultado de `validate:clinics`;
  - declaración explícita: «no contiene contenido de Google Places ni fragmentos de búsqueda».
- Nunca: llamadas, envíos, merge, cambios en workflows ni cambios en fichas no relacionadas.

---

## 7. Flujos

### 7.1 Crear una ficha

```
entrada (nombre + cantón, o enlace de Maps, o formulario «sugiere una clínica»)
 → maps-link (si hay enlace) → dedupe contra catálogo ── duplicado ⇒ flujo «actualizar»
 → [Places A/B si habilitado] identificar sucursal + place_id
 → official-site (websiteUri efímero / Brave / sameAs) → hechos almacenables
 → pendientes nivel 2 (redes) y nivel 3 (WhatsApp: horario por día, 24/7, pin de ubicación)
 → resolve R1–R12 → candidate.md (estado: pendiente si faltan teléfono, ubicación u horario)
 → validate → PR «Alta: <nombre> (<zona>)», etiqueta needs-human-review
```

Requisitos mínimos para `estado: publicado`:

- nombre, provincia y zona;
- al menos un teléfono `reported` o `confirmed`;
- ubicación almacenable;
- `schedule_v1` con al menos un día con evidencia (los demás pueden ser `unknown`).

Para obtener `VERIFIED` se aplican las condiciones de §4.6.

### 7.2 Actualizar una ficha

```
disparador (reporte público #33, código de mantenimiento, petición del dueño, «actualiza tu ficha»)
 → cli investigate --slug (reusa google_place_id; refresca si > 12 meses)
 → diff contra ficha + sidecar existente (fusiona fuentes; vence hechos según §4.5)
 → niveles 2/3 solo para campos en conflicto o vencidos
 → PR «Actualizar ficha: <slug>» o propuesta del panel
```

### 7.3 Mantener las fichas (cron)

```
clinic-maintenance.yml (mensual)
 → para cada ficha con google_place_id: Places C (Enterprise) → compare → códigos
 → para cada ficha sin place_id: código no_place_id (se reintenta identificar con A, gratis, si --identify)
 → frescura: hechos con reviewBy vencido → verification_expired:<campo>
 → validador: deuda y avisos actuales
 → research/maintenance/status.json  { slug: { lastChecked, outcome, codes[] } }   (sin valores de Google)
 → PR mensual «Mantenimiento <AAAA-MM>» con status.json (merge manual)
 → issue «Mantenimiento <AAAA-MM>» con tabla priorizada (closed_* > hours_24_conflict > hours/phone > drift > expired)
```

Una ficha con `outcome: match` y sin vencimientos muestra al público «Comprobación automática: <fecha>» (§9.4). El motor nunca cambia la ficha en este flujo.

---

## 8. Los tres niveles de obtención

### 8.1 Nivel 1: automático en servidor (Actions o CLI)

Incluye Places (efímero), el sitio oficial (almacenable) y Brave (efímero, para descubrir URLs). Facebook sin sesión queda **desactivado por defecto**, porque las Condiciones de Meta §3.2.3 prohíben el acceso automatizado sin permiso aunque no haya sesión [M1, M2] (D3). Si el dueño consigue permiso de Meta (Graph API con *Page Public Metadata Access* tras App Review [M3]), se añadiría como fuente `official_social` con `method: motor`.

### 8.2 Nivel 2: asistido en el navegador del dueño

- **Modo por defecto: el dueño observa y pega.** El dueño abre la página de Facebook o Instagram de la clínica, o su ficha de Google Maps, con su sesión. Pega el texto relevante, o una captura que la skill transcribe, junto con la URL y la fecha. Las capturas **no** se guardan en el repo. De Google Maps solo se toma el `place_id` (D1); nada de lo que el dueño vea en Google Maps se transcribe como hecho.
- **Modo Claude in Chrome (opción sujeta a D3).** Las reglas de operación son:
  - solo las URLs concretas de la clínica que el dueño apruebe en esa sesión;
  - como máximo 10 páginas por sesión, con pausas humanas (30 s o más entre páginas);
  - solo lectura: sin likes, follows, mensajes, comentarios, envío de formularios ni descargas masivas;
  - sin listados ni búsquedas masivas dentro de las redes;
  - se detiene ante cualquier CAPTCHA, verificación o aviso de actividad inusual, y no lo resuelve;
  - nunca usa cuentas que no sean del dueño.

  **Riesgo:** un agente que maneja el navegador puede considerarse «medio automatizado» en el sentido de Meta §3.2.3, que no exime el acceso con sesión iniciada.
- **Registros oficiales:**
  - SENASA, consulta por código de establecimiento si la clínica publica o comparte su código CVO [S2];
  - Colegio de Médicos Veterinarios, directorio de profesionales [S3], para comprobar que el regente o médico declarado está activo. No se guarda el nombre del profesional; solo `official_registry` con nota «profesional activo comprobado».

### 8.3 Nivel 3: confirmación de la clínica

- **Mensaje de WhatsApp redactado** (`templates/whatsapp-confirmacion.md`): presentación de Vet24, enlace a la ficha pública, preguntas cerradas por campo (horario día a día, feriados, urgencias fuera de horario y su modalidad, ubicación con «compártanos su pin», servicios) y opción de baja. Siempre lo envía una persona, desde el número de Vet24, al número público de la clínica.
- **Formulario «Actualiza tu ficha»** (D11), en `/clinica/<slug>/actualizar` → `POST /api/clinic-update`:
  - se guarda como reporte privado de tipo `clinic_update` en la bandeja de #33, con Turnstile y límite de frecuencia;
  - **no confirma nada por sí solo**: el operador verifica llamando o escribiendo **al número que ya consta**, no al que llegó en el formulario, y entonces registra `direct_confirmation`.
- **Llamada telefónica** hecha por una persona, con el mismo registro (`method: telefono`, `reference` opaco). Es obligatoria para Tier A y `onsite_247` (R4).

### 8.4 Matriz campo × fuente

Leyenda: ✔ fuente almacenable del nivel; ◐ pista o indicio, nunca `confirmed` por sí solo; ⚑ solo detección o comparación, efímero y sin guardar; — no aplica.

| Campo | N1 Places (efímero) | N1 Sitio oficial | N1 Brave | N2 Redes propias (dueño) | N2 Registros oficiales | N3 Clínica | Mínimo para `confirmed` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Identidad / sucursal | ⚑ candidatos; `place_id` ✔ | ✔ nombre y dirección propios | ◐ | ✔ | ◐ (CVO o profesional) | ✔ | Sitio, red propia o clínica, más dedupe resuelto |
| `google_place_id` | ✔ (único dato guardable de Google) | — | — | ◐ (el dueño copia el ID o el enlace) | — | — | Emparejamiento por teléfono, nombre y distancia |
| Nombre | ⚑ para emparejar | ✔ | ◐ | ✔ | ◐ | ✔ | Sitio, red o clínica |
| Dirección (señas) | ⚑ | ✔ | ◐ | ✔ | — | ✔ | Sitio, red o clínica |
| Coordenadas | ⚑ deriva | ✔ si publica `geo` | — | ◐ (el pin de una red no se copia) | — | ✔ pin de WhatsApp | Clínica, sitio o pin del operador (§4.2) |
| Teléfono | ⚑ `phone_absent/extra` | ✔ | ◐ | ✔ | — | ✔ | Clínica (confirmed); sitio o red (reported) |
| WhatsApp | — | ✔ `wa.me` | ◐ | ✔ | — | ✔ | Igual que teléfono |
| Horario por día | ⚑ `hours_mismatch` | ✔ JSON-LD o texto | ◐ | ✔ (publicación con fecha) | — | ✔ | Clínica, o sitio con fecha de 180 días o menos |
| Días feriados / excepciones | ⚑ `special_hours_next7` | ✔ si los publica | — | ✔ | — | ✔ | Publicación con fecha o clínica |
| Cerrada (temporal o definitivamente) | ⚑ `businessStatus` | ◐ (sitio caído no basta) | ◐ | ✔ (aviso de cierre) | ◐ | ✔ | R7 |
| Urgencias / 24-7 (#43) | ⚑ `hours_24_conflict` | ◐ (marketing) | ◐ | ◐ | — | ✔ obligatorio | Confirmación directa (R4) |
| Presencia nocturna / walk-ins | — | ◐ | — | ◐ | — | ✔ | Confirmación directa |
| Cirugía / hospitalización | — | ✔ reported | ◐ | ✔ reported | — | ✔ | Clínica para `confirmed` |
| Exóticos / granja / peces / hotel | — | ✔ reported | ◐ | ✔ reported | — | ✔ | Clínica para `confirmed` |
| Web | ⚑ `websiteUri` (solo descubrimiento) | ✔ si el sitio se identifica | ◐ | ✔ (enlace desde la red) | — | ✔ | Sitio identificado |
| Facebook / Instagram | — | ✔ `sameAs` o enlaces | ◐ | ✔ | — | ✔ | Enlace desde el sitio, o dueño verifica que es la página propia |
| Legitimidad sanitaria | — | ◐ (si publica CVO) | — | — | ✔ (código CVO; profesional activo) | ✔ | Registro oficial (solo identidad, no operación) |

---

## 9. Integración con el panel admin y el proposal-runner

### 9.1 Catálogo (`GET /api/admin/clinics`)

`catalogItems()` (`src/lib/admin/api.ts:351-406`) hoy calcula tres problemas. Pasa a usar `validateClinicRecord()` de `src/lib/clinic-validate.ts` y los códigos de `research/maintenance/status.json`, que se importa con `import.meta.glob` igual que la evidencia (`:123-127`).

Problemas nuevos:

- `coord_precision`, `coord_source`, `coord_out_of_cr`, `coord_drift_*`;
- `closed_permanently`, `closed_temporarily`;
- `hours_mismatch`, `hours_24_conflict`, `phone_absent`, `phone_extra`;
- `verification_expired:<campo>`, `no_place_id`, `place_id_obsolete`;
- `evidence_missing`, `derivation_mismatch`.

Se añade el filtro «Mantenimiento» con el orden de prioridad de §7.3.

### 9.2 Editor (`/admin/editar/[slug]`, `/admin/nueva`)

- **Panel «Evidencia por campo»:** muestra cada hecho con su estado, fuente, fecha y `reviewBy`, y permite marcar un conflicto como resuelto con una regla. Sustituye el formulario de una sola fuente de `src/pages/admin/editar/[slug].astro:18`.
- **«Registrar confirmación directa»:** pide el método, la fecha y los campos confirmados con sus valores. Genera `reference` en el servidor y no pide identidad del informante.
- **`google_place_id`:**
  - en solo lectura, con el botón «Abrir en Google Maps» construido como `https://www.google.com/maps/search/?api=1&query=<nombre>&query_place_id=<id>`, que no muestra contenido de Places en el panel;
  - con el botón «Reidentificar», que según D7 lanza `clinic-research.yml` o muestra el comando de la CLI.
- **«Copiar mensaje de WhatsApp»:** usa la misma plantilla que la skill (endpoint `GET /api/admin/clinics/:slug/whatsapp-draft`, sin envío).
- **«Importar propuesta del motor»:** carga `candidate.md` y `evidence.json` de la CLI y los valida en el servidor con los mismos esquemas.
- El pin del mapa queda con `location_source: operator_pin` y `location_verified_at`. La geocodificación es solo una sugerencia (SDD §7.2).
- Se corrigen los enlaces de `nueva.astro:78` para usar `buildNavLinks()`.

### 9.3 Propuestas y runner

- `proposal()` (`src/lib/admin/api.ts:811-959`):
  - `validSidecar` se sustituye por `evidenceSchema`;
  - la ficha debe cumplir `deriveVerification`, rechazando con 422 un `VERIFIED` sin evidencia;
  - `hasLocationEvidence` (`:334-349`) pasa a exigir un hecho `location` con `location_source` almacenable;
  - se acepta el campo opcional `emergencyEvidence`, la entrada del slug para el registro de #43.
- `proposal-runner.ts`:
  - el árbol pasa de 2 a N rutas en una lista blanca fija: ficha, sidecar, `research/emergency-access-evidence.json` y `research/maintenance/status.json` (solo para retirar códigos resueltos);
  - el commit y la PR incluyen el `report.md` saneado;
  - se mantiene el resto de garantías (CAS, lease, idempotencia, sin force y sin auto-merge; SDD §12.2).
- **Dos caminos, un solo validador.** Las PR del motor (Actions o CLI) **no pasan por el Worker**. Se abren directamente con la GitHub App y el CI ejecuta `validate:clinics` y `check:no-google-content`, igual que con las PR del panel. Hacer que Actions publique en `/api/admin/clinic-proposals` exigiría autenticar un *service token* de Access en `src/lib/admin/auth.ts:45-61`, que hoy solo autoriza por `sub` o email. Queda fuera de la versión 1 (D6).

### 9.4 Proyección pública: «Verificado el <fecha> · fuente»

`lastReviewLabel` y `reviewEvidenceBadge` (`src/lib/capabilityStatus.ts:232-273`) pasan a consumir `deriveVerification()`:

- Con hechos `confirmed` vigentes: **«Verificado el 20-oct-2026 · Confirmación directa de la clínica»**. La fuente es la etiqueta controlada de §4.6 y nunca se nombra a Google como fuente.
- Sin hechos `confirmed` vigentes: «Datos reportados por <tipo de fuente> · revisión pendiente desde <fecha>».
- Con `status.json` en `match`, una línea secundaria: «Comprobación automática sin cambios: <fecha>» (redacción en D10).
- Con `REVIEW_REQUIRED`: «En revisión: hay información contradictoria; llama antes de ir».
- El JSON-LD `lastReviewed` (`src/pages/clinica/[slug].astro:221`) usa el mismo `last_verified` derivado.
- La presentación de urgencias es responsabilidad de #40 y #39; aquí solo se suministra la evidencia.

---

## 10. GitHub Actions

### 10.1 Workflows

| Workflow | Disparador | Qué hace | Permisos `GITHUB_TOKEN` | Secretos |
| --- | --- | --- | --- | --- |
| `ci.yml` (existente, ampliado) | `push` y `pull_request` | Añade `npm run validate:clinics`, `npm run test:lookup` (fixtures con red bloqueada), `npm run check:no-google-content` y `node scripts/skills/check-sync.mjs` | `contents: read` (sin cambios, `.github/workflows/ci.yml:8-9`) | **Ninguno** |
| `clinic-maintenance.yml` (nuevo) | `schedule: "23 13 2 * *"` (día 2 de cada mes, 07:23 en Costa Rica) y `workflow_dispatch` (`slugs`, `dry_run`, `identify`) | `cli maintain` → `status.json` → PR mensual e issue | `contents: read`, `issues: write` | `GOOGLE_PLACES_API_KEY` (entorno `places`), `VET24_ENGINE_APP_ID`, `VET24_ENGINE_APP_KEY` |
| `clinic-research.yml` (nuevo) | Solo `workflow_dispatch`: `slug` o `nuevo` (nombre, zona, provincia), `maps_url`, `use_places`, `use_search` | `cli investigate` → rama `engine/research-<slug>-<run_id>` → PR en borrador con `needs-human-review` | `contents: read` | Places, Brave, App |

### 10.2 Esqueleto de `clinic-maintenance.yml` (indicativo)

```yaml
name: Clinic maintenance
on:
  schedule: [{ cron: "23 13 2 * *" }]
  workflow_dispatch:
    inputs:
      slugs: { type: string, required: false }
      dry_run: { type: boolean, default: false }
permissions: { contents: read, issues: write }
concurrency: { group: clinic-maintenance, cancel-in-progress: false }
jobs:
  maintain:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    timeout-minutes: 20
    environment: places            # restringido a la rama main; sin revisores (el cron no puede esperar aprobación)
    steps:
      - uses: actions/checkout@<sha>
      - uses: actions/setup-node@<sha>
        with: { node-version: 24, cache: npm }
      - run: npm ci
      - run: node scripts/clinic-lookup/cli.ts maintain --all --budget 300 --out .tmp/maintenance.json
        env:
          PLACES_ENABLED: "true"
          GOOGLE_PLACES_API_KEY: ${{ secrets.GOOGLE_PLACES_API_KEY }}
      - uses: actions/create-github-app-token@<sha>
        id: app
        with: { app-id: ${{ vars.VET24_ENGINE_APP_ID }}, private-key: ${{ secrets.VET24_ENGINE_APP_KEY }} }
      - run: node scripts/clinic-lookup/publish-maintenance.mjs .tmp/maintenance.json   # PR status.json + issue
        env: { GH_TOKEN: ${{ steps.app.outputs.token }}, DRY_RUN: ${{ inputs.dry_run }} }
```

### 10.3 Secretos y configuración

| Nombre | Tipo | Alcance | Notas |
| --- | --- | --- | --- |
| `GOOGLE_PLACES_API_KEY` | Secreto del entorno `places` | Solo `main`; solo los workflows de mantenimiento e investigación | En Google Cloud: restricción de API a «Places API (New)»; cuota diaria (p. ej. 400 solicitudes/día) y por minuto; alerta de presupuesto en USD 5. La alerta de presupuesto no detiene el gasto; la cuota sí |
| `BRAVE_SEARCH_API_KEY` | Secreto del entorno `places` | Igual | Límite de gasto en el panel de Brave |
| `VET24_ENGINE_APP_ID` / `VET24_ENGINE_APP_KEY` | Variable / secreto | Workflows del motor | GitHub App instalada solo en este repo, con `contents: write`, `pull_requests: write` e `issues: write`. **Sin** `workflows` ni `actions`, salvo que D7 lo pida. Es la misma App que D12 podría reutilizar para el Worker |
| Locales (CLI) | `.env.local` (ignorado) | Máquina del dueño | Nunca se suben al repo; `.env.ci` no las contiene |

### 10.4 Límites y salvaguardas

- **Sin `pull_request_target`.** Los workflows con secretos solo corren con `schedule` o `workflow_dispatch` desde `main`. Las PR de forks no reciben secretos y los workflows del motor no ejecutan código de PR.
- Las acciones se fijan por SHA y el job tiene `timeout-minutes: 20`.
- El cron puede retrasarse o descartarse y se **desactiva tras 60 días sin actividad** en repos públicos [GH1]. El issue mensual menciona la fecha de la última ejecución, y si el mes siguiente no aparece, el dueño lo nota. Hay un `workflow_dispatch` manual de respaldo.
- PR creadas con la App, para que el CI corra sin aprobación manual [GH2]. Sin auto-merge.
- **Ritmo:** Places a 2 solicitudes/s como máximo; sitios oficiales a 1 solicitud cada 2 s por dominio; Brave a 1 solicitud/s (su límite es 50 qps).
- **Artefactos:** no se suben datos efímeros. Si se sube un artefacto de depuración, debe tener `retention-days: 7` o menos, por debajo del límite de 30 días para lat/lng de Places.

---

## 11. Seguridad, costos y cumplimiento de términos

### 11.1 Seguridad

- **SSRF:** `safeFetch` (§5.1) y la lista blanca de hosts en `maps-link`. No se hacen *fetch* de URLs arbitrarias desde el Worker (SDD §7.2).
- **Inyección de instrucciones:** el contenido web es dato no confiable. La skill solo recibe estructuras y extractos marcados, y nunca ejecuta comandos ni sigue instrucciones que aparezcan en páginas, redes o respuestas de clínicas.
- **Salida:** los informes de PR e issues se escapan (sin HTML crudo, con *backticks* neutralizados); los valores se validan con zod antes de serializarse.
- **Secretos:** no se imprimen, se enmascaran y la CLI se niega a correr con `--verbose` si hay claves en el entorno de CI.
- **Repositorio público:** `check:no-google-content` revisa claves y patrones de Places y Brave, más un detector de teléfonos fuera de los campos permitidos y de correos electrónicos en `research/`.
- **Privacidad:** no se guarda la identidad de informantes, transcripciones, capturas ni números privados (Ley 8968; P7). Los contactos del formulario «Actualiza tu ficha» viven solo en D1 privado, con retención según el SDD §6.1.

### 11.2 Cumplimiento por proveedor

| Proveedor | Uso permitido en este diseño | Prohibido en este diseño | Riesgo residual |
| --- | --- | --- | --- |
| Google Places API (New) [G1–G4, G7, G8] | Identificar la sucursal; guardar `place_id` de forma indefinida; comparar en memoria; lat/lng efímeras (≤ 30 días); refresco de ID | Copiar nombre, dirección, horario, teléfono o reseñas a la ficha (§3.2.3(a)(iii)); mostrar algo sobre Leaflet/OSM (§3.2.3(e), §14.2); guardar payloads o fixtures reales; usar Places en el cliente | **Alto: §3.2.3(d)(iii) «listings or directory service»** (D1). Mitigación: uso interno, nada visible, motor completo sin Places, consulta escrita a Google antes de activarlo |
| Google Maps (sitio de consumo) | Que una persona lo mire y copie el `place_id` o el enlace | Scraping, copiar coordenadas u horarios (caso VEHASA, §1.2.3) | Medio, por la práctica previa. Se corrige en F7 |
| Google Custom Search | — | No usar (cerrado a nuevos clientes, fin el 1/1/2027) [G6] | — |
| Brave Search API [B1, B2] | Consultas para descubrir URLs; uso transitorio de resultados | Guardar resultados o fragmentos, crear una base de datos con ellos, redistribuirlos | Bajo. Solo se guarda la URL propia de la clínica, que luego se consulta como fuente independiente. Nota: la página de precios indica USD 5/1000 y USD 5 de crédito mensual, con un titular de «hasta USD 20»; confirmar el plan al contratar |
| Meta (Facebook / Instagram) [M1–M3] | Nivel 2: el dueño mira y pega; opcional, Graph API con App Review | Acceso automatizado desde servidor, con o sin sesión, sin permiso previo; evasión de bloqueos | Medio si se usa Claude in Chrome (D3) |
| Sitios oficiales | `robots.txt`, ritmo bajo, sin JS, identificación de bot | Ignorar `robots.txt`, eludir muros, copiar textos extensos | Bajo |
| SENASA / Colegio [S1–S3] | Consulta manual puntual | Consultas automáticas masivas; guardar datos personales de profesionales | Bajo |
| OSM (teselas del mapa) | Uso actual de Leaflet | — | Ajeno a este diseño; se recuerda la política de uso de teselas |

### 11.3 Proveedores de datos de terceros (opción del dueño, no recomendada)

Apify (actor «Google Maps Scraper», desde USD 1,50/1000 lugares) y Outscraper (500 negocios gratis y luego USD 3/1000) [T1, T2] **extraen datos de Google Maps mediante scraping**. Riesgos:

1. Los datos obtenidos son contenido de Google Maps, así que guardarlos o mostrarlos choca con §3.2.3(a)–(e) igual que si los hubiera extraído Vet24, y además sin la relación contractual de la API.
2. El propio Apify advierte que algunas funciones «return personal data» y que la base legal es responsabilidad del cliente (Ley 8968).
3. La calidad y la vigencia no se pueden auditar por campo.
4. Se depende de un proveedor que opera en contra de los términos de Google y puede desaparecer o cambiar sin aviso.

Si el dueño decidiera usarlos (D5), solo sería como **pista efímera de nivel 1**, con las mismas reglas que Brave y sin guardar nada.

### 11.4 Costos totales estimados (mes típico, 112 fichas)

| Partida | Costo |
| --- | --- |
| Places (mantenimiento mensual + 5–10 investigaciones) | USD 0 dentro de la cuota (≤ USD 3 a precio de lista) |
| Brave | USD 0 dentro del crédito |
| GitHub Actions (repo público, runners estándar) | USD 0 |
| Claude Code / Codex | Suscripción existente del dueño |
| Tiempo humano (niveles 2 y 3) | El principal costo real: unos 10–15 min por clínica en conflicto |

---

## 12. Pruebas con fixtures (sin llamar a Google en CI)

- **Inyección de dependencias:** todos los clientes reciben `fetch`, `now` y `budget`. En `tests/unit/clinic-lookup/*.test.ts`, un `setup` sustituye `globalThis.fetch` por uno que **falla ante cualquier URL no registrada** y define `CLINIC_LOOKUP_OFFLINE=1`.
- **Fixtures sintéticos** en `tests/fixtures/clinic-lookup/`:
  - respuestas con la **forma** de la API de Places, con IDs y valores inventados. No se permiten payloads reales: guardarlos en un repo público violaría §3.2.3(a)/(b);
  - HTML de sitios ficticios;
  - respuestas de Brave inventadas;
  - una lista de enlaces de Maps y Waze.
- **Casos mínimos:**

| Área | Casos |
| --- | --- |
| `maps-link` | `maps.app.goo.gl` → 2 saltos; `query_place_id`; `!3d!4d` frente a `@lat,lng` (cámara); host engañoso (`google.com.evil.tld`); 4 saltos (rechazo); página de consentimiento (`inaccessible`); Waze `ll=` y `q=` |
| `places-client` | Field mask exacto por paso (comprueba el SKU esperado); presupuesto agotado → `skipped`; 429 con `Retry-After`; `NOT_FOUND` → refresco D; `Ephemeral.toJSON` lanza error; la clave no aparece en logs |
| `compare` | Deriva de 650 m → `coord_drift_500` (caso VEHASA sintético); horario con almuerzo igual a dos periodos; periodo nocturno viernes→sábado; 24 h sin `close`; `closed_permanently`; teléfono `+506` frente a `####-####` |
| `official-site` | JSON-LD `VeterinaryCare` con `openingHoursSpecification` (23:59); horario solo en texto con «12md»; `robots.txt` que prohíbe; sitio solo JS; identidad no probada; texto con instrucciones inyectadas («ignora tus reglas…»), que no produce efecto |
| `normalize` | Pruebas de propiedad: normalizar dos veces da lo mismo; teléfonos inválidos; nombres con tildes y sufijos |
| `dedupe` | Dos sucursales de la misma marca a 8 km; mismo teléfono a 3 km (ambiguo); mismo `place_id` |
| `resolve` | Las reglas R1–R12 una por una, incluyendo «marketing 24/7 frente a cierre a las 20 h» → `REVIEW_REQUIRED` y nunca el horario más amplio |
| Evidencia | v1 legible y v2 escribible; referencias a `sources` inexistentes, que se rechazan; `VERIFIED` sin evidencia, que hace fallar `derivation_mismatch`; serialización estable byte a byte |
| Validador de fichas | Coordenadas con 3 decimales (deuda), 0,0, fuera de Costa Rica e Isla del Coco con nota; enlaces con `ll=` rechazados; `place_id` duplicado |
| Runner / API | Árbol de N rutas con lista blanca; propuesta con `emergencyEvidence`; ida y vuelta YAML de `schedule_v1` emitido por `clinicMarkdown` |
| Gates | `check:no-google-content` detecta `regularOpeningHours` en `research/`; `check-sync` detecta diferencias entre las dos copias de la skill; `check:runtime-boundary` detecta `clinic-lookup` en el bundle del Worker |

- **Prueba de humo opcional** (fuera de CI): `npm run lookup:smoke -- --slug <x>`. La corre el dueño con su clave y solo imprime códigos.

---

## 13. Plan de implementación por fases

Las claves I12–I20 son issues **sugeridos**, sin crear. Relación con issues existentes: #27 (motor de horario), #28 (validar y empaquetar la skill), #29 (sanear legado y deuda), #31 (D1 y overrides), #32 (estado público), #33 (reportes), #34 (propuestas y PR), #35 (editor), #36 (CI), #37 (rollout), #39 (`EmergencyAccess`), #40 (presentación pública), #41 (migración de tiers) y #43 (gobernanza de evidencia).

| Fase | Issue sugerido | Contenido | Depende de | Relación |
| --- | --- | --- | --- | --- |
| **F0** | — | El dueño resuelve D1–D14 (al menos D1, D2, D3, D12). Consulta escrita a Google sobre §3.2.3(d)(iii) | — | — |
| **F1** | **I12** `feat(data): contrato de evidencia v2 y validador de fichas` | `clinic-evidence.ts` (v1 ∪ v2), `clinic-validate.ts` (coordenadas, teléfonos, enlaces, `place_id`), `deriveVerification`, `npm run validate:clinics`, base de deuda (`coord_precision` ×64, `coord_source`), `check:no-google-content`, `buildNavLinks` y corrección de `nueva.astro:78` | #27 | **Cumple la parte de validación de #28**; aporta los DTO de evidencia de #43; la base de deuda la cierra #29 |
| **F2** | **I13** `feat(lookup): motor determinista sin proveedores de Google` | `net`, `maps-link`, `official-site`, normalizadores, `dedupe`, `resolve`, `diff`, `evidence-writer`, `report`, CLI y fixtures; frontera de runtime | I12 | Implementa los scripts de la skill de #28 (`normalize-hours`, `geocode-check` del SDD §4 quedan absorbidos por la CLI) |
| **F3** | **I14** `feat(skill): investigar-veterinaria v1` | `.agents/skills/…` y copia en `.claude/skills/…`, plantillas de niveles 2 y 3, `check-sync` | I13 | **Cierra la parte de skill de #28** |
| **F4** | **I15** `feat(lookup): cliente Places (New) y Brave con presupuesto` | `places-client`, `search-client`, `compare`, `Ephemeral`, flag `PLACES_ENABLED`, pruebas de SKU y field mask | I13 y **D1 aprobado** | Nuevo |
| **F5** | **I16** `ci: workflows clinic-research y clinic-maintenance` | Workflows, GitHub App, entorno `places`, `status.json`, PR mensual e issue | I15 | Coordina con #36 (gates de CI) |
| **F5** | **I17** `feat(public): verificación derivada de evidencia` | `lastReviewLabel` y JSON-LD a partir de `deriveVerification` y `status.json` | I12 | Coordina con #40 (presentación) y #32 (estado vivo) |
| **F6** | **I18** `feat(admin): evidencia por campo, problemas del motor e importación` | Editor, catálogo y `proposal()` con `evidenceSchema`; runner con árbol de N rutas; borrador de WhatsApp | I12, I13 | Extiende #34 y #35; integra #43 (registro de urgencias) |
| **F6** | **I19** `feat(public): formulario «Actualiza tu ficha»` | Ruta, Turnstile, reporte `clinic_update`, verificación por número de la ficha | #33 | Extiende #33; política de privacidad |
| **F7** | **I20** `fix(data): re-investigar las 112 fichas por lotes` | Lotes de 10; prioridad: (1) VEHASA y otras con coordenadas de Google, (2) las 64 fichas con precisión ≤ 3 decimales, (3) horarios `unconfirmed`, (4) fichas con 24/7 declarado, (5) resto. Objetivo: deuda vacía | I14 (+ I15 opcional) | **Ejecuta #29**; coordina con #41 (inventario de tiers) |

Orden crítico: F1 → F2 → F3 da un motor útil **sin Google**. F4 y F5 dependen de D1. F6 puede avanzar en paralelo con F4 y F5. F7 empieza tras F3 y se acelera con F4.

**Criterios de cierre del programa:**

- CI con `validate:clinics` sin deuda;
- 112 fichas con sidecar v2;
- `research/maintenance/status.json` con dos meses consecutivos ejecutados;
- ninguna ficha con `location_source: legacy_unknown`;
- `check:no-google-content` en verde.

---

## 14. Decisiones abiertas para el dueño

| ID | Decisión | Opciones | Recomendación |
| --- | --- | --- | --- |
| **D1** | Usar Places dado §3.2.3(d)(iii) («listings or directory service») | (a) Pedir confirmación escrita a Google o a un partner antes de activarlo; (b) aceptar el riesgo con uso interno y nada visible; (c) no usar Places | **(a)**. Mientras tanto, `PLACES_ENABLED=false`; el motor funciona igual |
| **D2** | Fuente de coordenadas almacenables | Pin de la clínica por WhatsApp; pin del operador sobre OSM; ortofotos del SNIT (verificar licencia); umbrales de deriva de 150 y 500 m | Pin de la clínica como preferente y pin del operador sobre OSM como respaldo; evaluar la licencia del SNIT |
| **D3** | Facebook e Instagram | (a) Solo «el dueño mira y pega»; (b) Claude in Chrome con las reglas de §8.2, aceptando el riesgo de Meta §3.2.3; (c) solicitar *Page Public Metadata Access*; (d) Facebook sin sesión automático | (a) por defecto, (c) a medio plazo. **No (d)**, por ser contrario a las condiciones de Meta |
| **D4** | API de búsqueda | Brave (USD 5/1000, sin almacenamiento) / ninguna | Brave, con límite de gasto |
| **D5** | Apify / Outscraper | No usar / pista efímera | **No usar** (§11.3) |
| **D6** | Dónde viven los códigos de mantenimiento | (a) `status.json` por PR mensual; (b) D1 mediante endpoint con *service token* de Access | (a) en v1; (b) si la frecuencia sube |
| **D7** | Lanzar la investigación desde el panel | (a) Solo CLI o Actions manual; (b) botón que hace `workflow_dispatch` (la App necesita `actions: write`) | (a) en v1 |
| **D8** | Botón de Maps con `query_place_id` | Mantener solo texto / texto + `query_place_id` | Mantener solo texto por ahora; reconsiderar tras D1 |
| **D9** | Frecuencia y vigencias | Mantenimiento mensual o quincenal; vigencias de §4.5 | Mensual y las vigencias de §4.5 |
| **D10** | Texto público | Nombrar o no la comprobación automática; formato de fecha | «Verificado el <fecha> · <tipo de fuente>» más una línea secundaria sin nombrar al proveedor |
| **D11** | Formulario «Actualiza tu ficha» | Habilitar o no; Turnstile; retención | Habilitar tras #33, con verificación por el número que consta en la ficha |
| **D12** | Autenticación de GitHub del Worker | Mantener el token estático actual (`proposal-runner.ts:35`) / migrar a GitHub App (SDD D3) | Migrar a la App compartida con los workflows del motor |
| **D13** | Evidencia de urgencias | Registro canónico de #43 (`research/emergency-access-evidence.json`) referenciado desde el sidecar / todo en el sidecar | Registro de #43, para no tener dos fuentes de verdad |
| **D14** | Coordenadas de VEHASA (`b2b490b`) | Re-obtener mediante confirmación o pin propio / mantener | Re-obtener en F7 (prioridad 1) |

---

## 15. Fuentes consultadas (2026-10-18)

**Google**

- [G1] Google Maps Platform Service Specific Terms, §14 Places API (Legacy and New): 14.1–14.3 («up to 30 consecutive calendar days»; «No use with a non-Google map»). Última modificación indicada: 15 de octubre de 2026. https://cloud.google.com/maps-platform/terms/maps-service-terms
- [G2] Places API, Policies: «the place ID … is exempt from the caching restrictions… store place ID values indefinitely»; atribución si se muestra sin mapa de Google. https://developers.google.com/maps/documentation/places/web-service/policies
- [G3] Google Maps Platform Terms of Service, §3.2.3 (a) No Scraping, (b) No Caching, (c) No Creating Content, (d)(iii) «listings or directory service», (e) No Use With Non-Google Maps; definición de «Google Maps Core Services». https://cloud.google.com/maps-platform/terms
- [G4] Place IDs: refresco de IDs con más de 12 meses, `NOT_FOUND` y refresco con el campo `id`. https://developers.google.com/maps/documentation/places/web-service/place-id
- [G5] Maps URLs: acción Search, `query` y `query_place_id`, codificación y 2 048 caracteres. https://developers.google.com/maps/documentation/urls/get-started
- [G6] Custom Search JSON API, Overview: «closed to new customers», fecha límite el 1 de enero de 2027, USD 5/1000 y 10 000 al día para clientes existentes. https://developers.google.com/custom-search/v1/overview
- [G7] Text Search (New): endpoint, `includedType`, `locationBias`, `regionCode`, `pageSize` y field mask obligatorio. https://developers.google.com/maps/documentation/places/web-service/text-search
- [G8] Places Data Fields (SKU por campo) y precios de Google Maps Platform (Text Search IDs Only gratis e ilimitado; Pro USD 32/1000; Place Details Essentials USD 5, Pro USD 17, Enterprise USD 20, Enterprise + Atmosphere USD 25 por 1000; cuotas gratuitas 10 000 / 5 000 / 1 000). https://developers.google.com/maps/documentation/places/web-service/data-fields · https://developers.google.com/maps/billing-and-pricing/pricing

**Brave**

- [B1] Brave Search API: planes y precios (Search USD 5/1000, 50 qps, USD 5 de crédito mensual). https://brave.com/search/api/
- [B2] Brave Search API Terms of Use (actualizadas el 1 de septiembre de 2026), §3(b)(i), (ii), (xii), (xiii) y §13(c)(ii). https://api-dashboard.search.brave.com/terms-of-service

**Meta**

- [M1] Condiciones del servicio de Meta (vigentes desde el 1 de enero de 2025), §3.2.3: acceso o recolección automatizada sin permiso previo. https://www.facebook.com/terms.php
- [M2] Meta for Developers, Automated Data Collection: «regardless of whether … logged-in»; «Platform APIs are the only allowable means». https://developers.facebook.com/docs/development/terms-and-policies/automated-data-collection/
- [M3] Meta, Page Public Metadata Access (requiere App Review y verificación del negocio). https://developers.facebook.com/docs/features-reference/page-public-metadata-access

**Costa Rica**

- [S1] SENASA, portal institucional (enlaces de CVO, «Consulta de Establecimiento» y SIREA). https://www.senasa.go.cr/
- [S2] SENASA, Consulta de Establecimiento (búsqueda solo por código). https://sis.senasa.go.cr/establecimiento
- [S3] Teletica, «Alertan por extranjeros que castran animales sin autorización en Costa Rica» (el Colegio remite a su directorio de profesionales). https://www.teletica.com/nacional/alertan-por-extranjeros-que-castran-animales-sin-autorizacion-en-costa-rica_419185 · Contexto: Tico Times sobre el CVO para clínicas que venden perros o gatos (2026). https://ticotimes.net/2026/06/17/costa-ricas-new-dog-and-cat-breeding-rules-take-effect

**GitHub y Codex**

- [GH1] GitHub Docs, Events that trigger workflows, `schedule` (mínimo 5 min, retrasos, solo rama por defecto, desactivación a los 60 días en repos públicos). https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- [GH2] GitHub Docs, GITHUB_TOKEN (los eventos creados con él no crean ejecuciones, con excepciones). https://docs.github.com/en/actions/concepts/security/github_token
- [O1] OpenAI Codex, Build skills (busca `.agents/skills` desde el directorio de trabajo hasta la raíz). https://learn.chatgpt.com/docs/build-skills

**Terceros**

- [T1] Apify, Google Maps Scraper (precio y advertencias de datos personales). https://apify.com/compass/crawler-google-places
- [T2] Outscraper, precios. https://outscraper.com/pricing/

**Documentos internos:** `docs/sdd-panel-admin-y-skill.md` (§3.2, §4, §7.2, §8, §12.2, §12.5, §12.7), `docs/guia-implementacion-skill-horarios-y-ci.md` (§2.2, sustituida en lo que respecta a la prioridad de Google), `docs/analisis-creacion-fichas-y-horarios.md` (§3.3 y §5.1), `docs/issues-panel-admin-y-skill.md` e issues #38–#46 del repositorio.

Las cifras de precios y las condiciones cambian. Hay que volver a verificarlas en las fuentes oficiales antes de activar cada proveedor (fase F4).
