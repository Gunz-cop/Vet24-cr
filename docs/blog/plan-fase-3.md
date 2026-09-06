# Fase 3 — Blog editorial de Vet24-cr

Estado: **plan aprobado, sin implementar**
Rama de desarrollo: `claude/vet24-cr-phase-3-blog-wos6bp`
Última revisión: 2026-09-06

## 1. Objetivo

Dar al sitio peso editorial propio, verificable por Adsense/Ezoic y por Google,
sin degradar lo que ya funciona: el directorio de 112 clínicas y la capa de
Agent-Readiness (nivel 4) entregada en la fase 2.

Peso editorial aquí significa tres cosas concretas, no una sensación:

1. Contenido original con investigación real y fuentes citadas.
2. Señales E-E-A-T visibles: autoría, política editorial, fechas de revisión.
3. Arquitectura interna que conecta ese contenido con el directorio, de modo
   que el blog no sea un apéndice sino la puerta de entrada a las fichas.

## 2. Alcance y no-alcance

### Dentro

- Colección `blog` nueva en `src/content.config.ts`, **añadida** junto a
  `clinicas`.
- Rutas de listado y artículo.
- Enlazado interno blog ↔ clínica / provincia / zona.
- Página de política editorial y autoría visible.
- Huecos publicitarios del blog, coexistiendo con la integración Ezoic actual.
- 5 artículos seed con investigación real.

### Fuera — no se toca

- `docs/agent-readiness/**` y todos los archivos bajo propiedad AR1/AR2/AR3
  (ver secciones "Propiedad AR1/AR2/AR3" del README de esa carpeta).
- El esquema de `clinicas` y sus 112 fichas.
- `src/lib/agent-*.ts`, `src/pages/api/**`, `src/pages/llms.txt.ts`,
  `src/pages/md/[...path].ts`, `public/robots.txt`, `.well-known`.
- El stack: Astro 7.2.10, adaptador Cloudflare 14.2.6, Tailwind 4.3.3. No se
  suben dependencias en esta fase.
- `astro.config.mjs`: `site`, `trailingSlash`, `output`, `adapter` y el filtro
  de sitemap quedan como están (verificado: `/blog/` no cae en el regex de
  exclusión, entra al sitemap sin cambios).

Verificación previa ya hecha: `src/pages/md/[...path].ts` sólo itera
`getCollection("clinicas")`, así que una colección `blog` nueva **no** genera
espejos Markdown ni altera el inventario de mirrors de AR3.

## 3. Decisiones tomadas con el usuario

| # | Decisión | Valor |
|---|---|---|
| D1 | Volumen del seed | 5 artículos |
| D2 | Pilares | `guias-por-especie`, `costos-y-acceso` |
| D3 | Proceso | Plan liviano (este doc) + issues por subfase. Sin SDD formal |
| D4 | Producción de contenido | Sesión de IA redacta con research real; **otra** sesión audita; el usuario aprueba |

Sobre D2: el enum de `pilar` en el schema se cierra con estos dos valores.
Añadir un pilar después es un cambio de schema — barato mientras el corpus sea
chico, caro después. Si aparece un tercer pilar, se decide antes del artículo 6,
no durante.

## 4. Arquitectura

### Rutas

```
/blog/                        listado general, orden por fecha
/blog/{pilar}/                listado de pilar
/blog/{pilar}/{slug}/         artículo
/politica-editorial/          política editorial + autoría
```

`trailingSlash: 'always'` ya es la política del sitio: todas las rutas nuevas
llevan barra final. Las rutas técnicas de AR no la llevan y no se tocan.

### Schema de la colección `blog`

Adaptado del precedente CuidaTuPerroViejo, no copiado. Cambios deliberados:

- `z.strictObject(...)`: un campo no declarado rompe el build en vez de pasar
  en silencio. Es la propiedad que hace auditable el frontmatter.
- `pilar`: enum cerrado con los dos valores de D2.
- `metaDescription`: máximo 160 caracteres, validado por zod.
- `autor`: obligatorio. Es una señal E-E-A-T, no un adorno; sin autor no se
  publica.
- `dateModified` opcional: **no se rellena por defecto**. Un `dateModified`
  automático declara una revisión que no ocurrió, y eso es exactamente el tipo
  de señal falsa que Adsense penaliza.
- `clinicasRelacionadas` / `zonasRelacionadas`: slugs del directorio con los que
  el artículo forma silo. Se validan contra las fichas reales en build.
- `revisadoPor` opcional: si un veterinario revisó el artículo, se declara; si
  no, se omite. Nunca se inventa un revisor.

### Silo interno — la diferencia real con el precedente

En CuidaTuPerroViejo el silo es blog ↔ blog ↔ herramientas. Acá el silo natural
es **blog ↔ directorio**, y esa es la razón de ser del blog:

```
/blog/{pilar}/{articulo}
   ├─→ /clinica/{slug}/       clínicas concretas citadas en el artículo
   ├─→ /zona/{zona}/          zona relevante al tema
   └─→ /provincia/{provincia}/
```

Y en sentido inverso: las fichas de clínica y las páginas de zona ganan un
bloque "Guías relacionadas" que enlaza al blog. Ese enlace de vuelta es lo que
convierte 112 fichas en distribución para el contenido nuevo.

Catálogo mantenible en `src/data/internal-links.ts` (archivo nuevo, no existe
hoy en este repo):

- `PILAR_NAMES`: nombres visibles.
- `ARTICULO_A_CLINICAS`: puentes artículo → fichas.
- `ARTICULO_A_ZONAS`: puentes artículo → zona/provincia.
- `CROSS_PILLAR_LINKS`: puentes artículo → artículo.

Regla dura: **ningún destino se escribe a mano sin comprobarlo**. Un test
unitario valida que cada slug del catálogo existe como entrada real de
`clinicas` o como zona de `src/lib/zones.ts`. Un enlace interno roto en
producción es peor que no tener el enlace.

### Publicidad

`src/config/ads.ts` gana dos claves nuevas — `blog-inline` y `blog-sidebar` —
**en `null`** hasta que existan los placeholders reales en el panel de Ezoic.
Un placeholder inventado no renderiza nada y ensucia el diagnóstico. Las cuatro
claves actuales (`home-inline`, `zona-inline`, `clinica-inline`,
`clinica-sidebar`) no se modifican.

## 5. Subfases

Cada subfase es un issue, un PR y una verificación independiente. Serial, no
paralelo: B2 depende del schema de B1, y B3 depende de que existan artículos.

### B1 — Infraestructura del blog

Colección, rutas de listado y artículo, layout, componente de tarjeta,
breadcrumbs, JSON-LD `Article` + `BreadcrumbList`, y un artículo piloto que
sirva de patrón.

Criterios de aceptación:

- `npm run check` y `npm run test:unit` salen 0, sin skips nuevos.
- `npm run build:no-shorten` genera `/blog/`, `/blog/{pilar}/` y la ruta del
  piloto con barra final.
- El sitemap generado contiene las rutas del blog y **sigue conteniendo** todas
  las rutas de clínica/provincia/zona que contenía antes. Se compara contra el
  sitemap del `main` vigente, no de memoria.
- El inventario de espejos Markdown de AR3 es idéntico antes y después.
- `git diff --name-only main...HEAD` no contiene ningún archivo de propiedad
  AR1/AR2/AR3.
- **Evidencia visual real**: capturas de `/blog/` y del artículo piloto, móvil
  y escritorio. Un build verde no prueba que la tarjeta de artículo se vea
  bien.

### B2 — Enlazado interno y silo con el directorio

`src/data/internal-links.ts`, bloque de guías relacionadas en ficha de clínica y
página de zona, test de validación de destinos.

Criterios de aceptación:

- Test unitario que falla si un slug del catálogo no existe en `clinicas` ni en
  `zones.ts`. Se demuestra que falla introduciendo un slug falso a propósito, y
  luego se retira.
- Ningún enlace del blog apunta a una ruta 404 en el build.
- Los bloques nuevos en ficha y zona no desplazan ni rompen el layout actual:
  capturas antes/después de `/clinica/{slug}/` y `/zona/{zona}/`.
- `docs/seo/enlazado-interno.md` documenta la arquitectura resultante.

### B3 — Señales E-E-A-T

`/politica-editorial/`, autoría visible en el artículo, enlace desde el footer.

Criterios de aceptación:

- La política editorial describe el proceso **real** de esta fase (brief →
  redacción con fuentes → auditoría independiente → aprobación humana). No se
  declara un comité de revisión veterinaria que no existe.
- La autoría mostrada corresponde a una persona real y verificable.
- Capturas de la página y del bloque de autoría.

### B4 — Seed de contenido (5 artículos)

Producción con el pipeline de D4.

Criterios de aceptación por artículo:

- Brief previo versionado en `briefings/briefing-{slug}.md`.
- Mínimo 6 fuentes de autoridad, cada una trazada al H2 que sostiene. Sin
  fuentes decorativas.
- Auditoría por una **sesión distinta** de la que redactó, con veredicto
  escrito. El reporte del redactor se trata como hipótesis, no como hecho: el
  precedente documenta que 3 de 3 artículos auditados traían al menos una
  afirmación falsa en su propio reporte de entrega.
- El artículo enlaza a fichas/zonas reales del directorio y aparece en su pilar.
- Aprobación explícita del usuario antes de fusionar.

## 6. Reglas de proceso — vinculantes

Vienen de fallos concretos de las fases 1 y 2, no de teoría.

1. **Un reporte de "CI verde" de otra sesión no es evidencia.** El coordinador
   comprueba por su cuenta el `mergeable_state` del PR, el run de CI y su
   conclusión, y **lee el diff completo**, no el resumen. Ya ocurrió que un
   "todo OK" ocultaba un CI rojo (backslashes de Windows en un verificador que
   rompía en Linux) y una explicación equivocada del fallo.
2. **Un PR abierto no es un PR fusionado.** Antes de dar una subfase por
   cerrada se confirma que todos sus PRs están fusionados en `main`. En la
   fase 2 quedaron dos PRs de evidencia abiertos porque nadie volvió tras
   cerrar el issue.
3. **Prohibido `Closes #N`** en la descripción de un PR. El issue se cierra a
   mano, después de tener toda la evidencia.
4. **Verificar la base de cada rama** con `git merge-base` antes de leer un
   diff. Una rama vieja arrastra diffs ajenos contra el `main` actual.
5. **Sin red no hay verificación de producción.** Una sesión que no alcanza
   `vet24cr.com` (proxy 403) lo dice explícitamente y deja esa comprobación a
   una sesión con acceso real. Nunca se simula un `curl` ni su resultado.
6. **Seguimiento por evento, no por sondeo**: `subscribe_pr_activity` +
   `ScheduleWakeup`.
7. **El merge a `main` lo autoriza el usuario humano, siempre.** `main`
   despliega a producción automáticamente vía Cloudflare Workers Builds. La
   autorización de otra sesión de IA no sustituye la del dueño.
8. **Verde local no prueba aspecto.** Todo cambio de layout, listado o
   navegación exige evidencia visual, no sólo texto.
9. **Quien redacta no audita.** Auditar lo propio no es auditar.

## 7. Verificación común de cada subfase

```bash
npm run check
npm run test:unit
npm run build:no-shorten     # no `npm run build`: el acortador hace red y escribe datos
git diff --name-only main...HEAD   # contra propiedad AR y alcance de la subfase
```

Más: comparación de sitemap contra `main`, inventario de mirrors sin cambios, y
capturas donde el criterio de aceptación las pida.

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| El blog rompe el catálogo de agentes de la fase 2 | Alcance cerrado por allowlist; comparación de sitemap y de inventario de mirrors en cada subfase |
| Contenido con errores clínicos | Auditoría por sesión independiente + aprobación humana; el artículo declara que no sustituye consulta veterinaria |
| Enlaces internos rotos por slugs inventados | Test que valida cada destino contra las fichas reales |
| El enum de pilares queda corto | Se revisa antes del artículo 6, no durante |
| Placeholders de Ezoic inventados | Claves nuevas en `null` hasta que existan en el panel |
