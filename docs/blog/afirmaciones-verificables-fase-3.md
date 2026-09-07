# Fase 3 — Afirmaciones verificables del plan

Este documento existe para una sola cosa: que una sesión auditora **independiente**
pueda comprobar, una por una, cada afirmación sobre la que se apoya
[plan-fase-3.md](plan-fase-3.md), sin tener que creerle nada a la sesión que lo
escribió.

Estado del plan cuando se escribió esto: **propuesto, no aprobado, no
implementado**. Commit del plan: `5803dac`. Rama:
`claude/vet24-cr-phase-3-blog-wos6bp`.

Regla para quien audite: cada fila de abajo es una **hipótesis**, no un hecho.
El comando de la columna derecha es una sugerencia de cómo comprobarla, no una
prueba de que se comprobó. Si un comando no reproduce lo afirmado, eso es un
hallazgo, no un malentendido.

## A. Afirmaciones sobre el estado actual del repo

| # | Afirmación | Cómo comprobarla |
|---|---|---|
| A1 | `main` está en `3eed5bd` y la rama de fase 3 sale de ahí | `git merge-base main claude/vet24-cr-phase-3-blog-wos6bp` |
| A2 | Hoy sólo existe la colección `clinicas`; no hay colección de blog | `cat src/content.config.ts` |
| A3 | Hay 112 fichas de clínica | `ls src/content/clinicas \| wc -l` |
| A4 | No existen `src/data/internal-links.ts`, `docs/seo/`, `briefings/` ni `src/pages/politica-editorial.astro` | `ls src/data docs/seo briefings src/pages/politica-editorial.astro` (debe fallar) |
| A5 | `src/config/ads.ts` define exactamente 4 claves: `home-inline`, `zona-inline`, `clinica-inline`, `clinica-sidebar` | `grep -n "inline\|sidebar" src/config/ads.ts` |
| A6 | El sitio usa `trailingSlash: 'always'` y `output: 'static'` | `cat astro.config.mjs` |
| A7 | El script `build` corre `scripts/shorten-links.js` antes de `astro build`, y existe `build:no-shorten` | `grep -n '"build' package.json` |

## B. Afirmaciones sobre no-colisión con la fase 2 (Agent-Readiness)

Estas son las críticas: si alguna es falsa, el plan puede romper el nivel 4 de
agent-readiness ya conseguido.

| # | Afirmación | Cómo comprobarla |
|---|---|---|
| B1 | `src/pages/md/[...path].ts` sólo itera `getCollection("clinicas")`, así que una colección `blog` nueva no genera espejos Markdown ni altera el inventario de mirrors de AR3 | `cat 'src/pages/md/[...path].ts'` — verificar que no hay otra llamada a `getCollection` ni un glob genérico de colecciones |
| B2 | El filtro de sitemap de `astro.config.mjs` excluye `api\|auth.md\|llms.txt\|.well-known\|md`, y `/blog/...` **no** cae en ese regex, por lo que el blog entra al sitemap sin modificar el config | Probar el regex del config contra `/blog/`, `/blog/guias-por-especie/`, `/blog/guias-por-especie/x/` y confirmar que ninguno matchea. **Ojo al falso positivo**: el segmento `md` del regex está anclado con `[\\/]?` y `([/.]\|$)` — comprobar que no matchea un slug que empiece por `md` |
| B3 | El blog no requiere tocar ningún archivo bajo propiedad AR1/AR2/AR3 | Leer las secciones "Propiedad AR1/AR2/AR3" de `docs/agent-readiness/README.md` (líneas ~158, ~164, ~185) y cruzarlas con la lista de archivos que el plan dice crear/modificar |
| B4 | `src/lib/agent-*.ts` no lee ninguna colección distinta de `clinicas` | `grep -rn "getCollection" src/lib src/pages` |

## C. Afirmaciones sobre el precedente (CuidaTuPerroViejo)

Repo público: `https://github.com/Gunz-cop/CuidaTuPerroViejo`. Se clonó con
`--depth 1` a un directorio temporal; **no** forma parte de este repo.

| # | Afirmación | Cómo comprobarla |
|---|---|---|
| C1 | Existen 5 skills relevantes en `.agents/skills/`: `generar-briefing-contenido`, `redactar-articulo-blog`, `auditar-articulo-blog`, `auditar-briefing-contenido`, `enlazado-interno-sitio` | `ls .agents/skills` en el clon |
| C2 | Su colección `blog` usa `z.strictObject`, `metaDescription` con máx. 160, `pilar` como enum de 7 valores, y `dateModified` opcional con un comentario explícito de no declarar revisiones que no ocurrieron | `sed -n '1,40p' src/content.config.ts` en el clon |
| C3 | Su silo es blog ↔ blog ↔ herramientas, mediante `CROSS_PILLAR_LINKS` y `TOOL_LINKS` en `src/data/internal-links.ts` — **no** hay puentes a fichas de directorio, porque ese sitio no tiene directorio | `cat src/data/internal-links.ts` en el clon |
| C4 | `auditar-articulo-blog` documenta que en los 3 primeros artículos auditados, **los 3** contenían al menos una afirmación falsa en su reporte de entrega | `sed -n '1,40p' .agents/skills/auditar-articulo-blog/SKILL.md` en el clon |
| C5 | Las skills imponen separación de roles: quien redacta no audita | Secciones "Separación de roles" de ambas skills de auditoría |

## D. Decisiones de diseño — no son hechos, son juicios

La auditoría debe atacarlas como juicios discutibles, no verificarlas como
hechos. Se listan para que ninguna pase sin escrutinio.

| # | Decisión | Justificación dada | Contraargumento a considerar |
|---|---|---|---|
| D1 | Silo blog ↔ directorio en vez de blog ↔ blog | Las 112 fichas ya existentes son distribución gratuita para contenido nuevo | Añade acoplamiento: si un slug de clínica cambia, rompe enlaces del blog. El plan lo mitiga con un test, pero el test hay que escribirlo bien |
| D2 | Enum de `pilar` cerrado con 2 valores | Cambiarlo con 5 artículos es barato | Emergencias es el pilar con más tráfico potencial y más afín al directorio (`emergency_tier` ya existe en el schema de clínicas). Dejarlo fuera puede ser un error de alcance, no una simplificación |
| D3 | `dateModified` sin autorrelleno | Declarar una revisión que no ocurrió es una señal falsa | Ninguno serio |
| D4 | Claves de Ezoic nuevas en `null` | Un ID inventado no renderiza y ensucia el diagnóstico | Ninguno serio; verificar sólo que no rompe `showAds()` |
| D5 | Plan liviano en vez de SDD | La fase 2 mostró que el SDD genera overhead real | Sin specs por subfase, los criterios de aceptación de este doc son la única vara. Si son débiles, no hay red de seguridad |
| D6 | `z.strictObject` para el frontmatter | Un campo no declarado rompe el build en vez de pasar en silencio | Fricción al redactar; es el precio deliberado |

## E. Lo que NO se verificó — declarado explícitamente

No se presenta ninguna de estas como comprobada:

1. **No se corrió ningún build, check ni test** en esta sesión. El plan no
   modifica código todavía, así que no había nada que construir; pero eso
   significa que ninguna afirmación de este documento está respaldada por un
   build verde.
2. **No se verificó producción.** No se hizo ninguna petición a
   `vet24cr.com`. Nada de lo afirmado sobre el sitio desplegado sale de leer
   el repo.
3. **No se verificó el panel de Ezoic.** Que los placeholders 116-119 existan
   y que no haya otros libres es lo que dice el comentario de `ads.ts`, no algo
   comprobado.
4. **No se validó el volumen de búsqueda ni la competencia** de los dos pilares
   elegidos. La elección es del usuario; no hay research de keywords detrás.
5. **No hay evidencia visual** de nada, porque no hay nada implementado.

## F. Preguntas abiertas que la auditoría debería responder

1. ¿El regex de sitemap de `astro.config.mjs` deja pasar `/blog/` en todas sus
   formas, incluida una ruta de pilar cuyo slug empiece por `md`?
2. ¿Los criterios de aceptación de B1–B4 son **falsables**? Es decir: ¿se puede
   decir de cada uno si pasó o no sin juicio subjetivo? Si alguno no lo es, es
   un defecto del plan.
3. ¿Falta alguna subfase? En particular: ¿quién actualiza `llms.txt` o el
   catálogo de agentes para que el blog sea visible a agentes de IA — y debería
   hacerlo esta fase, o eso invade propiedad AR2?
4. ¿El bloque "Guías relacionadas" en la ficha de clínica desplaza contenido de
   emergencia por encima del pliegue? La home no lleva publicidad justamente
   porque es la página a la que se llega con una emergencia; la ficha merece el
   mismo cuidado.
5. ¿La página de política editorial puede describir el proceso real sin
   prometer una revisión veterinaria profesional que no existe?
