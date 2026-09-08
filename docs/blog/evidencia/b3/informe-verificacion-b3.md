# B3 — Informe de verificación independiente

**Veredicto: ACEPTADA CON HALLAZGOS.**

Ningún hallazgo es bloqueante para aceptar B3 como subfase. Dos deben resolverse
**antes de que B4 publique el primer artículo**, y uno exige decisión del usuario.
No se autoriza merge ni despliegue con este informe: §7 reserva esa autorización
al usuario, y el cierre productivo sigue pendiente porque B3 no está desplegada.

| Campo | Valor |
|---|---|
| Candidato | `48e51ba4623aeaccd59baeaa5863d5bbd60c0778` |
| Rama | `codex/blog-b3-politica-atribucion` |
| BASE | `6ec4497ec926aece6da9fc8070adc8a3136c20e7` |
| `main` vigente | `aab689eacc13524a3395289e53c0dd9aacf034c5` |
| Plan aplicado | §5/B3 de `main`, **con** la enmienda de autoría (no el plan de la BASE) |
| Sesión | verificadora independiente; no implementó ni modificó producto, tests ni plan |
| Evidencia | `docs/blog/evidencia/b3/verificacion-independiente/` y `blog-verificadora.log` |

## 0. SHAs confirmados

```
$ git merge-base 48e51ba4623aeaccd59baeaa5863d5bbd60c0778 aab689eacc13524a3395289e53c0dd9aacf034c5
6ec4497ec926aece6da9fc8070adc8a3136c20e7

$ git ls-remote origin
48e51ba4623aeaccd59baeaa5863d5bbd60c0778  refs/heads/codex/blog-b3-politica-atribucion
aab689eacc13524a3395289e53c0dd9aacf034c5  refs/heads/main
```

La `merge-base` coincide con la BASE declarada. `main` diverge de la BASE en **un
solo archivo**, `docs/blog/plan-fase-3.md` (la enmienda de autoría): la rama no
arrastra deuda de producto respecto de `main`. Todos los criterios de abajo se
evaluaron contra el texto de `main`, no contra el de la BASE.

## 1. Criterio por criterio (§5/B3)

Todos los comandos se corrieron en un `git worktree` del candidato con `npm ci`
limpio. Salidas íntegras en `verificacion-independiente/*.stdout.log` /
`*.stderr.log`, con comando, cwd, SHA, fecha y código en `*-command.log`.

### 1.1 Batería obligatoria de §7 — **CUMPLE**

| Comando | Código | Resultado |
|---|---|---|
| `npm run check` | **0** | 85 archivos, 0 errores, 0 warnings, 75 hints |
| `npm test` | **0** | 77 pass, 0 fail, **0 skipped**, 0 todo |
| `npm run build:no-shorten` | **0** | build completo |
| `node scripts/verification/blog.mjs` (sin preview) | 1 | único fallo `PREVIEW_UNAVAILABLE` |
| `node scripts/verification/blog.mjs` (con preview) | **0** | `blog: OK (134 HTML)` |
| `node scripts/verification/agent-markdown.mjs` | **0** | `OK (127 mirrors)` |
| `node scripts/verification/agent-catalog.mjs` | **0** | `112 clinics, 112 HTML routes` |

Los números de `check` y `test` reproducen exactamente los que reportó la
coordinadora. Confirmados, no aceptados.

### 1.2 `blog.mjs` en código 0 — **CUMPLE. Contradigo a la coordinadora.**

`correccion-2/entrega.md` lo dejó en «No verificado»:

> `blog.mjs` en código 0: requiere preview, que no arranca en este entorno.

**Arranca.** Salida real:

```
$ npm run preview -- --host 127.0.0.1 --port 4321
Preview server running at http://127.0.0.1:4321 (pid 2455)
$ curl -o /dev/null -w "%{http_code}" http://127.0.0.1:4321/
200
$ node scripts/verification/blog.mjs
blog: OK (134 HTML; dist/client: política de publicación y enlaces verificada)
EXIT=0
```

El control manual obligatorio de §7 queda **satisfecho con código 0**, no
pendiente. La causa probable del bloqueo ajeno es el entorno de la coordinadora,
no el script: su `base-agent-scan-command.log` registra `EXIT_CODE=-1073740791`
(`0xC0000409`, un código de terminación de Windows). Eso explica su límite, pero
no lo convertía en un hecho verificado: se declaró un imposible sin agotarlo.
Es el mismo patrón que en B1 con producción y en B2 con la atribución al entorno.

### 1.3 `/politica-editorial/` responde 200 y el footer enlaza su canonical — **CUMPLE**

- `HTTP 200` en preview; artefacto `dist/client/politica-editorial/index.html`.
- `<link rel="canonical" href="https://vet24cr.com/politica-editorial/">`, con barra final.
- Enlace de footer presente y **visible** (`isVisible()=true`) en las cinco rutas
  probadas y en **ambos** viewports (390×844 y 1440×900).
- Sin scroll horizontal en ninguna combinación (`scrollWidth <= clientWidth`).
- Capturas propias: `verif-politica-editorial-390.png`, `verif-politica-editorial-1440.png`.
- La URL entra en el sitemap (§7 bloquea «ruta publicada fuera del sitemap»).

Medición en `nav-medicion-sin-publicados.json`.

### 1.4 Los dos lados del condicional de navegación — **CUMPLE**, medido con navegador

Los tests E2E de este criterio **no llegaron a ejecutar sus aserciones** en este
entorno (ver §3). Verifiqué el criterio con Chromium directamente, midiendo
visibilidad real (`isVisible()`, `boundingBox()`, `getComputedStyle().display`),
no clases CSS, abortando sólo peticiones a hosts externos.

**Cero artículos publicados** (`nav-medicion-sin-publicados.json`) — `/`, `/blog/`,
`/blog/guias-por-especie/`, `/blog/costos-y-acceso/`, `/politica-editorial/`, en 390 y 1440:

```
#nav-blog                 count=0   (ausente del DOM)
footer a[href="/blog/"]   count=0   (ausente del DOM)
```

**Fixture publicada** (`nav-medicion-fixture-publicada.json`), mismas rutas:

| Viewport | `#nav-blog` | `footer a[href="/blog/"]` |
|---|---|---|
| 390×844 | count=1, **`display:none`, `visible=false`** | count=1, **`visible=true`**, `href="/blog/"`, enfocable por teclado (`foco=true`), caja 28,03×20 |
| 1440×900 | count=1, `display:block`, `visible=true` | count=1, `visible=true`, `href="/blog/"`, enfocable |

El objetivo del arreglo se cumple: **en móvil se llega al blog**, por el footer.
El enlace es un `<a href>` normal, rastreable y enfocable. Con la barra final.

Advertencia sobre el test que cubre esto — ver hallazgo H-3.

### 1.5 Autoría: nombre y tipo — **CUMPLE**

`docs/blog/autoria.md` declara `firma-publica: Equipo editorial Vet24 Costa Rica`
y `tipo-entidad: Organization`. Con la fixture publicada, el sitio emite:

```json
"author": { "@type": "Organization", "name": "Equipo editorial Vet24 Costa Rica" }
```

y el autor visible es `<span data-blog-author>Equipo editorial Vet24 Costa Rica</span>`.
Nombre y tipo coinciden con el registro. `blog.mjs` con fixture publicada: **EXIT=0**.

`revisadoPor` está ausente del piloto y del registro; no hay ningún nodo `Person`.

### 1.6 Las mutaciones — **CUMPLE**. Cuatro, no dos.

Reproduje las dos que reportó la coordinadora y añadí dos que no probó. Cada
mutación se revirtió y su diff está archivado.

| # | Mutación | Diff | Código | Error emitido |
|---|---|---|---|---|
| 1 | `BlogLayout` emite `Person` | `mutacion-1-person.diff` | **1** | `tipo de autor JSON-LD no coincide con el registro: …; declarado: Organization; emitido: Person` |
| 2 | Firma no aprobada (`Dra. Persona Inventada`) | `mutacion-2-firma-no-aprobada.diff` | **1** | `firma no aprobada en el registro: …; declarada: Equipo editorial Vet24 Costa Rica; usada: Dra. Persona Inventada` |
| 3 | El **registro** declara `Person` (el layout emite `Organization`) | `mutacion-3-registro-person.diff` | **1** | `tipo de autor JSON-LD no coincide con el registro: …; declarado: Person; emitido: Organization` |
| 4 | Registro en `Estado: **pendiente…**` | `mutacion-4-registro-pendiente.diff` | **1** | `artículo publicado sin registro verificable de autoría: …` |

La 3 es la que faltaba: prueba que **manda el registro**, no el layout. Sin ella,
«el registro es la fuente de verdad» habría sido una afirmación sin control, porque
`BlogLayout.astro` tiene `'Organization'` escrito a mano y nunca lee `autoria.md`.

Tras revertir: `git status` limpio, piloto en `estado: "borrador"` sin
`datePublished`, artículo **404**, `blog.mjs` **EXIT=0**.

### 1.7 El registro no lleva datos personales — **CUMPLE**

Barrido de `docs/blog/autoria.md` en busca de correos, tratamientos (`Dr.`/`Dra.`),
formatos de cédula y pares Nombre-Apellido: **cero coincidencias**. El único par
capitalizado del archivo es «Costa Rica». El repositorio es público y el registro
no compromete a ninguna persona.

### 1.8 Política editorial: proceso previsto vs trabajo hecho — **CUMPLE con hallazgo**

Leí el texto frase por frase contra la realidad del repo. Se sostiene, salvo lo
recogido en H-1 y H-2.

- Separa explícitamente «El proceso **previsto** para cada guía es…» de «**Qué se
  ha hecho** en esta etapa». La separación es real, no cosmética.
- Las cuatro cosas que dice haber implementado existen y las comprobé una a una:
  la ruta (`politica-editorial.astro`), el registro (`autoria.md`), la presentación
  de autoría en plantillas (`BlogAuthor.astro` + `BlogLayout.astro`) y los controles
  de borradores (piloto en 404, ausente de sitemap, enlaces y JSON-LD).
- **No insinúa autoría personal.** No aparece ningún nombre; el registro es colectivo
  y el tipo emitido es `Organization`.
- **No insinúa revisión veterinaria.** La niega de forma expresa dos veces, y
  condiciona cualquier revisor futuro a credencial y constancia.
- No afirma comité alguno.
- «El piloto continúa en borrador» — verificado: 404 y `estado: "borrador"`.

### 1.9 Alcance y conservación — **CUMPLE**

`git diff --name-status 6ec4497...48e51ba`: 151 archivos, **todos dentro de la
matriz §6** para B3. Ninguna ruta fuera de allowlist. Producto tocado: exactamente
los siete archivos de `base.json`.

Comparación de artefactos construidos, BASE vs candidato:

| Magnitud | BASE | Candidato |
|---|---|---|
| Clínicas (`.md`) | 112 | **112** |
| Rutas `/clinica/` | 112 | **112** |
| Rutas `/provincia/` | 7 | **7** |
| Rutas `/zona/` | 7 | **7** |
| Rutas de blog (HTML) | 3 | **3** |
| Mirrors Markdown | 127 | **127** |

- `api/catalog.json`, `api/openapi.json`, `llms.txt`, `auth.md`, `api/readme.md`,
  `.well-known/api-catalog`: **byte a byte idénticos**.
- `dist/client/md/` completo: **idéntico** (`diff -rq` sin diferencias).
- Sitemap: **0 URLs perdidas**; **1 añadida**, `https://vet24cr.com/politica-editorial/`,
  que es exactamente la esperada.

### 1.10 Línea base del escaneo — **CUMPLE**

`base-scan-coverage.json`: `scannedAt = 2026-09-07T21:25:46Z`, nivel 4, 22 checks
(8 `pass`, 9 `fail`, 5 `neutral`). El primer commit de código de la rama, `d91333d`,
es de `2026-09-07 15:40:47 -0600` = **21:40:47Z**. El escaneo es **15 minutos
anterior** al primer cambio de producto: la precondición bloqueante de §6/§7.4 se
cumple, y no hace falta invocar la excepción por base inobtenible.

El JSON íntegro está archivado y es parseable pese al `processExitCode` anómalo.
La regla de cierre —«ningún identificador que estuviera en `pass` puede pasar a
`fail` o `neutral`»— **no se puede aplicar todavía**: exige un escaneo productivo
posterior al despliegue, y B3 no está desplegada. Queda como condición de cierre,
no de aceptación (ver §4).

## 2. Hallazgos

### H-1 — «Registramos los cambios editoriales relevantes» no es comprobable — *relevante, resolver antes de B4*

`src/pages/politica-editorial.astro`, sección «Correcciones y actualización».

La frase está en presente de indicativo y **fuera** del bloque rotulado «proceso
previsto», así que se lee como práctica vigente. No existe nada que la respalde:
no hay changelog editorial en el repo (`find` por `*changelog*` / `*cambios*`:
cero resultados), ningún artículo publicado, ningún `dateModified` renderizado y
ningún registro público de revisiones. `docs/blog/evidencia/` es interno y no es
un registro de cambios editoriales.

Es exactamente el riesgo que esta fase existe para evitar: una frase que pasa
todos los tests y aun así afirma de nosotros algo que no ocurre.

**Instrucción exacta.** En `src/pages/politica-editorial.astro`, sustituir

```
Registramos los cambios editoriales relevantes y no rellenamos con suposiciones los campos que no estén confirmados.
```

por

```
Cuando publiquemos guías, dejaremos constancia de las correcciones relevantes en el propio artículo, con su fecha de actualización. No rellenamos con suposiciones los campos que no estén confirmados.
```

Y en B4, o se emite `dateModified` visible al corregir un artículo, o se retira
también la forma en futuro.

### H-2 — La política promete «canales de contacto del sitio» sin enlazarlos — *menor*

Los canales existen (`mailto:info@vet24.cr` en `/acerca/` y el formulario de
reporte en las fichas), así que la frase no es falsa. Pero la página no enlaza
ninguno y el footer no tiene entrada «Contacto», sólo «Acerca de»: se pide una
acción al lector sin darle el medio.

**Instrucción exacta.** En la misma sección, cambiar `por los canales de contacto
del sitio` por `escribiendo a <a href="/acerca/">nuestra página de contacto</a>`,
o enlazar `mailto:info@vet24.cr` directamente.

### H-3 — El test de la fixture afirma en su título algo que el navegador desmiente — *menor, en tests*

`tests/e2e/blog.spec.ts`, test «B3 fixture publicada: **header y footer** enlazan
`/blog/` **también a 390px**». A 390 px el header **no** enlaza nada visible:
`#nav-blog` lleva `hidden md:inline-block` y mide `display:none`. El test pasa
igualmente porque afirma `toHaveCount(1)` —presencia en el DOM—, no visibilidad.

El producto está bien: el acceso móvil lo da el footer, y eso lo medí. El defecto
es del test, y es justo el que el encargo advertía: una aserción de conteo no
prueba que en móvil se llegue al blog, y su título afirma lo contrario de lo que
mide.

**Instrucción exacta.** En el bloque `B3_PUBLISHED_FIXTURE === '1'`, renombrar el
test a `B3 fixture publicada: el footer enlaza /blog/ también a 390px` y sustituir

```ts
await expect(headerLink).toHaveCount(1);
```

por

```ts
if (viewport.width >= 768) await expect(headerLink).toBeVisible();
else await expect(headerLink).toBeHidden();
await expect(footerLink).toBeVisible();
```

manteniendo el resto.

### H-4 — La firma publicada no es la que expresó el titular — *decisión del usuario*

El plan vigente dice, literalmente: «El usuario decidió el 2026-09-07 que la firma
visible sea colectiva: **«Equipo de Vet24cr»**». `autoria.md` declara
**«Equipo editorial Vet24 Costa Rica»**, y es lo que se emite.

**No sostengo la justificación de la coordinadora tal como está escrita.** Su
argumento principal —«es la que ya llevan los artículos»— es circular: esa cadena
la eligió la sesión ejecutora en B1, no el titular; justificar el registro con un
artefacto que el titular tampoco aprobó no añade ninguna aprobación. El argumento
subsidiario —«ambas designan al mismo colectivo»— sí es cierto, y por eso esto no
es una falsedad: ambas son colectivas, ninguna nombra a una persona, y el tipo
emitido es `Organization`. No hay afirmación falsa en datos estructurados.

Pero §5/B3 exige «la aprobación explícita del titular del sitio» sobre la firma
registrada, y aquí lo aprobado y lo registrado son cadenas distintas. Sustituir
una por otra era una consulta al usuario, no una nota justificativa autoexpedida
—menos aún escrita por quien estaba operando fuera de su rol—. Es una desviación
de proceso, no de veracidad.

**Instrucción exacta.** Preguntar al titular cuál de las dos formas quiere
publicar. Si elige «Equipo de Vet24cr», cambiar en `docs/blog/autoria.md` la línea
`- firma-publica: Equipo editorial Vet24 Costa Rica` por
`- firma-publica: Equipo de Vet24cr`, y alinear el `autor:` del frontmatter del
piloto en B4 —`blog.mjs` lo exigirá solo—. Si confirma la forma larga, dejarlo
como está y sustituir en `autoria.md` el párrafo «La expresó como…» por la
constancia de esa confirmación, con fecha. **En cualquiera de los dos casos, no
publicar ningún artículo hasta tener la respuesta**: es el único punto donde la
atribución del sitio depende de algo que ninguna sesión ha comprobado.

### H-5 — `autoria.md` no registra los commits a los que aplica — *menor*

§5/B3 pide que el registro anote «los artículos **y commits** a los que aplica».
La sección «Alcance» enumera los cinco artículos del seed pero **ningún commit**.
Hoy es inocuo —no hay nada publicado—, pero el campo existe para poder auditar
después a qué versión del texto se aplicó una firma.

**Instrucción exacta.** En B4, al publicar cada artículo, añadir bajo «Alcance»
una línea por artículo con el SHA editorial auditado, con el formato
`- urgencias-en-perros: <sha> (auditado en <informe>)`.

### H-6 — Añadir enlaces desplaza la navegación más de 1 px: la §5/B3 se contradice — *escalar a coordinación*

§5/B3 exige a la vez **añadir** un enlace de política y una entrada de blog, y que
esos enlaces «no alteren geometría ni orden de foco del resto de la navegación
según las tolerancias de §5/B2» (≤1 px). Medido, BASE vs candidato:

| Caso | 390×844 | 1440×900 |
|---|---|---|
| Enlace de política (estado actual) | los 5 enlaces previos **no se mueven** (0 px) | los 5 se desplazan **−122,83 px** en x; `y`/`width`/`height` idénticos |
| Entrada de blog (con fixture) | header sin cambio (oculto en móvil) | `#nav-directory` pasa de x=1048,50 a **985,39** = **−63,11 px** |

En una fila flex alineada a la derecha, añadir un elemento **necesariamente**
desplaza a sus hermanos: el criterio, leído al pie de la letra, es imposible de
satisfacer a la vez que el resto de B3. La tolerancia de ≤1 px se escribió en
§5/B2 para los controles de emergencia de las fichas, donde lo que no debe moverse
es el contacto; trasladarla sin matices a «añadir un enlace al footer» convierte
la subfase en autocontradictoria.

Lo sustantivo se conserva: sólo cambia `x` dentro de la misma fila, `y`, `width`
y `height` son idénticos, el orden de foco de los cinco enlaces previos se
mantiene (los nuevos se añaden al final), no hay solapamiento, no hay scroll
horizontal y a 390 px no se mueve nada. Ningún elemento antes visible sobre el
pliegue deja de estarlo.

**Esto no es un defecto de la implementación: es del plan**, y ni la ejecutora ni
la coordinadora lo midieron ni lo declararon. Por eso no lo trato como bloqueante,
pero no puedo darlo por cumplido en silencio.

**Instrucción exacta.** La coordinadora debe enmendar §5/B3 sustituyendo «no
altera geometría ni orden de foco del resto de la navegación según las tolerancias
de §5/B2» por: «no altera `y`, `width` ni `height` de los enlaces preexistentes de
navegación (tolerancia ≤1 px), preserva su orden relativo de foco añadiendo las
entradas nuevas al final, y no introduce scroll horizontal ni solapamiento. Se
acepta el desplazamiento en `x` inherente a añadir un elemento a una fila
alineada; se mide y se archiva.» Con esa redacción, el candidato cumple con los
números de arriba.

## 3. E2E: los fallos **no** son de B3, y lo probé

`npx playwright test` sobre el candidato: **exit 1**. Antes de atribuir nada, corrí
la misma suite sobre la **BASE** —el paso que en B2 nadie dio y dejó una
contradicción abierta—.

Primero, un fallo que sí era mío y lo digo: la primera ejecución murió entera con
`browserType.launch: Executable doesn't exist at …/chromium_headless_shell-1223/…`.
Es un binario ausente en mi contenedor, no un defecto del candidato. Instalé la
versión que Playwright pide y repetí. Ambas salidas están archivadas.

Ya con navegador, todos los fallos restantes tienen la misma forma:

```
Test timeout of 30000ms exceeded.
Error: page.goto: Test timeout of 30000ms exceeded.
Call log: - navigating to "http://127.0.0.1:4321/blog/", waiting until "load"
```

`page.goto` espera el evento `load`, que aquí nunca llega porque las subpeticiones
externas (fuentes, publicidad, teselas) no resuelven a través del proxy del
entorno. Los tests que pasan tardan ~25 s, al filo del timeout de 30 s.

Contraste BASE vs candidato, `tests/e2e/blog.spec.ts`, un solo worker:

| Test | BASE `6ec4497` | Candidato `48e51ba` |
|---|---|---|
| B1 · `/blog/` canonical | ✓ 25,7 s | ✓ 25,6 s |
| B1 · `/blog/guias-por-especie/` canonical | ✓ 25,6 s | ✓ 25,6 s |
| B1 · `/blog/costos-y-acceso/` canonical | ✓ 25,6 s | ✓ 25,6 s |
| B1 · piloto borrador da 404 | ✓ 25,6 s | ✓ 25,8 s |
| B1 · sin scroll horizontal y foco visible | **✘ timeout** | **✘ timeout** |
| B2 · catálogo inactivo en fichas y zonas | **✘ timeout** | **✘ timeout** |
| B3 · política editorial enlazada desde footer | n/a | **✓ 25,8 s** |
| B3 · ninguna navegación muestra Blog sin publicados | n/a | ✘ timeout |

Los dos tests que fallan en el candidato y existen en la BASE **fallan idéntico en
la BASE**, con el mismo mensaje y el mismo `page.goto`. Los fallos son del entorno
de verificación. El único test nuevo de B3 que falla lo hace por la misma causa —se
cae navegando, antes de llegar a sus aserciones—, y su contenido lo verifiqué con
Chromium en §1.4, que es lo que el encargo pedía: medirlo con navegador.

Los mismos timeouts golpean a muchos specs preexistentes de mapa y geolocalización
—también dependientes de recursos externos—, lo que refuerza la atribución.

**No declaro la suite E2E verde.** Declaro que su rojo no es imputable a B3, con la
comparación contra BASE que lo demuestra.

## 4. Lo que **no** pude verificar, y por qué

1. **`npm run test:e2e` en verde.** El entorno no resuelve subrecursos externos y
   `page.goto` con `waitUntil: 'load'` agota los 30 s. Salida real en §3. Queda
   **no verificado**, no «pass», conforme a §7. La sustitución que hice —medición
   directa con Chromium abortando hosts externos— cubre el criterio de navegación,
   no la suite entera.
2. **Todo el cierre productivo de §7.** B3 no está fusionada ni desplegada: no hay
   deployment de Workers Builds, ni ID, ni SHA de origen, ni comprobación HTTP
   contra `vet24cr.com`. No lo intenté contra producción porque produciría un
   escaneo del estado **anterior** a B3 y compararlo sería engañoso.
3. **La regla de conservación del escaneo AR.** Verifiqué que la base existe, está
   completa y se capturó a tiempo. La comparación «ningún `pass` pasa a `fail` o
   `neutral`» necesita un escaneo posterior al despliegue: **pendiente**, y bloquea
   el cierre, no la aceptación.
4. **La aprobación del titular sobre la firma exacta.** No tengo forma de
   comprobarla; es H-4 y sólo el usuario la resuelve.
5. **Geometría de `btn-quick-call` / `btn-quick-wa`.** Mis selectores no
   localizaron esos controles en `/clinica/hems-una-heredia/` ni en la BASE ni en el
   candidato, así que no obtuve medida. Al ser nulo en ambos lados no hay diferencia
   que atribuir a B3, pero lo declaro **no medido** en vez de darlo por conservado.
   La conservación de esos controles es criterio de B2 y ya fue objeto de su propia
   verificación.

## 5. Sobre el delta escrito por la coordinadora (`48e51ba`)

Lo traté como la parte menos fiable de la entrega y no acepté ninguna de sus
conclusiones sin rehacerla.

- Sus cifras de `check`, `test`, `build`, `agent-markdown` y `agent-catalog`:
  **reproducidas y correctas**.
- Su JSON-LD con fixture publicada: **reproducido y correcto**.
- Sus dos mutaciones: **reproducidas**, con los mismos mensajes. Añadí dos más,
  una de ellas —la 3— necesaria para que «el registro manda» deje de ser una
  afirmación sin control.
- Su «no verificado: `blog.mjs` en código 0»: **incorrecto como límite general**.
  Arranca y da 0. §1.2.
- Su justificación de la firma: **no la sostengo tal como está redactada**. H-4.
- El defecto que corrigió era real y grave: la BASE emitía
  `author: { '@type': 'Person', name: "Equipo editorial Vet24 Costa Rica" }`, que
  al publicar habría afirmado ante los buscadores la existencia de una persona
  inexistente. Lo confirmé en el diff. Nada llegó a producción.

Que el delta sea correcto no sanea la ruptura de roles. Queda constancia: el
código de `48e51ba` lo escribió quien normalmente revisaría a la ejecutora, y esta
verificación es la única lectura independiente que ha tenido.

## 6. Inventario de evidencia

Todo en `docs/blog/evidencia/b3/`:

- `blog-verificadora.log` — exigido por §7: `blog.mjs` con y sin preview, con
  fixture y tras revertir, más las cuatro mutaciones. Comando, SHA, stdout, stderr
  y código.
- `informe-verificacion-b3.md` — este informe.
- `verificacion-independiente/`
  - `shas-confirmados.log`, `commits-rama.log`
  - `cand-{check,test,build,agent-markdown,agent-catalog,e2e}.{stdout,stderr}.log` + `-command.log`
  - `cand-blog-{no-,}preview.*`, `fixture-blog-preview.*`, `post-mutaciones-blog-preview.*`
  - `cand-e2e-blogspec-serial.*` y `base-e2e-blogspec-serial.*` — la comparación de §3
  - `mutacion-{1,2,3,4}-*.diff` + sus `.stdout.log` / `.stderr.log`
  - `nav-medicion-sin-publicados.json`, `nav-medicion-fixture-publicada.json`
  - `geometria-base.json`, `geometria-candidato.json`, `geometria-candidato-fixture-publicada.json`
  - `sitemap-{base,candidato}.txt`, `sitemap-urls-{perdidas,anadidas}.txt`
  - `diff-catalog-base-vs-candidato.txt`, `diff-mirrors-base-vs-candidato.txt`
  - `diff-name-status-base.log`, `diff-completo-base.log`, `diff-producto-base.log`, `diff-name-status-main-vigente.log`
  - `verif-politica-editorial-{390,1440}.png`

## 7. Veredicto

**ACEPTADA CON HALLAZGOS**, sobre `48e51ba4623aeaccd59baeaa5863d5bbd60c0778`.

El producto hace lo que §5/B3 pide: la política responde 200 con su canonical y su
enlace de footer visible en móvil y escritorio; los dos lados del condicional de
navegación se comportan como se prometió, medidos con navegador; la atribución es
colectiva, tipada como `Organization`, respaldada por un registro sin datos
personales, y cuatro mutaciones deliberadas la rompen y son detectadas; el alcance
no sale de la matriz §6; y las 112 clínicas, 7 provincias, 7 zonas, 127 mirrors,
catálogo y rutas de blog se conservan sin un solo cambio semántico, con el sitemap
ganando exactamente la URL esperada.

Antes de que B4 publique: **H-1** (la frase del registro de cambios) y **H-4** (la
firma que el titular no expresó). **H-6** necesita que la coordinación enmiende una
contradicción del propio plan. H-2, H-3 y H-5 son menores.

Este informe **no autoriza merge ni despliegue**, y B3 **no queda cerrada**: el
cierre productivo de §7 exige un despliegue con SHA demostrado y un escaneo AR
posterior, que no existen todavía.
