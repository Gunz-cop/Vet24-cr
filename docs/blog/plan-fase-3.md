# Fase 3 — Blog editorial de Vet24-cr

Estado: **aprobado por el usuario, condicionado a las correcciones documentales de los nueve hallazgos; implementación no iniciada**.
Última revisión: **2026-09-07** (correcciones: enlace de navegación; frontera de artefactos y borradores; línea base del escaneo; evidencia versionada; autoría de organización y ausencia de revisor veterinario).
Rama documental: `claude/vet24-cr-phase-3-blog-wos6bp`.
Base documental comprobada: `3eed5bd598b8bb04eb9eb3923487449c08e2de70`.

## 1. Objetivo, aprobación y trazabilidad

Crear contenido editorial original con fuentes, autoría honesta y enlaces útiles al directorio de 112 clínicas, conservando la capa Agent-Readiness nivel 4 ya desplegada.

El usuario aprobó el plan el **2026-09-07**, después de que una auditoría independiente del commit `6ee7c8d` lo rechazara. La solicitud de corrección aceptó los nueve hallazgos y condicionó la aprobación a corregirlos. Esta revisión incorpora las nueve correcciones; la correspondencia verificable está en la sección G de la hoja de afirmaciones. Es una entrega de la sesión correctora, pendiente de lectura del diff por la coordinadora; no se presenta como reauditoría independiente favorable.

La aprobación cubre este diseño documental, sus dos defaults revocables, cinco artículos seed y el proceso serial B1–B4. La tarea presente autoriza únicamente corregir estos dos documentos, commitearlos y empujarlos a la rama documental. **No autoriza implementar ni abrir PR en esta tarea. Aprobar el plan no autoriza ningún merge a main**: cada merge requiere autorización explícita del usuario para el candidato concreto, porque cada push a main despliega automáticamente mediante Cloudflare Workers Builds. La autorización de otra IA no la sustituye.

## 2. Alcance y límites

Dentro de la futura implementación: colección blog junto a clinicas, rutas y layouts editoriales, enlaces blog/directorio, política editorial, autoría, dos placements publicitarios inicialmente null y cinco artículos con investigación y auditoría independiente.

Fuera: schema y contenido de clinicas; dependencias y stack (Astro 7.2.10, Cloudflare 14.2.6, Tailwind 4.3.3); `docs/agent-readiness/**`; todos los archivos de propiedad AR1/AR2/AR3; APIs, llms, mirrors, robots, Worker, bindings, secretos, acortador e indexador. No se modifica `astro.config.mjs`, `package.json`, `package-lock.json` ni `.github/workflows/ci.yml`.

### Default sitemap y deuda heredada

Se conserva el filtro de `astro.config.mjs:15`, propiedad AR2/AR3 con traspaso serial. La autorización AR existente se limita a excluir recursos técnicos nuevos: no autoriza aquí reparar este regex.

```js
/[\\/]?(api|auth\.md|llms\.txt|\.well-known|md)([/.]|$)/
```

Resultados reales obtenidos en Node el 2026-09-07, extrayendo el literal del config y probando `new URL(page).pathname` (`true` significa exclusión):

| Path | excluded |
|---|---|
| /blog/ | false |
| /blog/guias-por-especie/ | false |
| /blog/guias-por-especie/x/ | false |
| /blog/mdcuidados/ | false |
| /blog/md/ | true |
| /blog/costos-y-acceso/mdguia/ | false |
| /blog/costos-y-acceso/rapi/ | true |
| /md/index.md | true |
| /api/catalog.json | true |
| /auth.md | true |
| /llms.txt | true |
| /.well-known/api-catalog | true |

Deuda conocida: falta anclaje inicial y el separador inicial es opcional; cualquier coincidencia interna seguida de punto, barra o fin dispara exclusión (por ejemplo el sufijo api de rapi). No basta prohibir slugs que comiencen con md, pues mdcuidados pasa.

**Remedio de esta fase:** B1 incorpora una comprobación defensiva del filtro vigente, invocada por el schema/carga de blog durante `astro build`, que lanza error para cualquier URL de pilar o artículo excluida, incluso si es borrador. El test unitario lee el literal real del config y exige igualdad con el patrón usado por la comprobación; no se acepta una copia que pueda divergir silenciosamente. Un cambio de formato no reconocible del config debe fallar explícitamente. El build queda bloqueado hasta elegir un slug permitido; nunca se oculta silenciosamente un artículo publicado ni se modifica el regex.

Reparar el filtro requiere una tarea separada de la capa AR, con issue propio, propietario, ampliación explícita de autorización y verificación de recursos técnicos/sitemap. Este documento registra la deuda; no crea ese issue ni ejecuta su reparación.

## 3. Decisiones editoriales

- Cinco artículos totales: **el piloto es el primero, no un sexto**.
- Dos pilares cerrados: `guias-por-especie` y `costos-y-acceso`.
- Plan liviano e issues por subfase; los criterios de este documento son el contrato de aceptación.
- Redacción asistida por IA, auditoría por otra sesión y aprobación humana explícita. Una auditoría editorial de IA no es revisión veterinaria profesional.

### Default emergencias y seed

Emergencias se cubre deliberadamente dentro de los dos pilares: urgencias por especie y acceso/costos nocturnos. No hay evidencia de volumen de búsquedas y no se afirma ventaja de tráfico. Los cinco temas y slugs previstos son:

| # | Pilar | Slug / tema del brief |
|---|---|---|
| 1, piloto | guias-por-especie | urgencias-en-perros — reconocimiento y búsqueda de atención, con límites documentados |
| 2 | guias-por-especie | urgencias-en-gatos — señales y acceso a atención por especie |
| 3 | guias-por-especie | atencion-veterinaria-para-exoticos — restricciones y confirmación de atención |
| 4 | costos-y-acceso | costo-emergencia-veterinaria-nocturna — componentes del costo y cómo solicitar presupuesto; ninguna tarifa inventada |
| 5 | costos-y-acceso | atencion-veterinaria-24h-por-zona — opciones registradas y confirmación telefónica, sin prometer disponibilidad actual |

Los briefs verifican fuentes y destinos antes de redactar; la elección temática no certifica datos clínicos o precios. Cambiar un tema/slug requiere actualizar su brief y esta tabla antes de producirlo.

**Condición para el artículo 6:** antes de aceptar su brief o incorporarlo a la colección, debe existir `docs/blog/revision-enum-antes-articulo-6.md` con evaluación de cobertura del seed, decisión de mantener/ampliar pilares y aprobación del usuario vinculada al commit. No basta declarar intención de revisarlo. Ese archivo y un sexto artículo están fuera de la allowlist de esta fase: requieren una ampliación documental autorizada antes de crearlos.

## 4. Arquitectura y contratos

### Rutas y schema

Rutas canónicas con barra final: `/blog/`, `/blog/{pilar}/`, `/blog/{pilar}/{slug}/`, `/politica-editorial/`. Los dos índices de pilar existen aunque no haya artículos publicados; muestran un estado vacío y no enlaces a borradores.

Blog usa `z.strictObject` con campos declarados: `title` y `seoTitle` no vacíos, `metaDescription` de 1 a 160 caracteres, `pilar` enum, `slug` no vacío y único en su URL, `estado` enum borrador/publicado con default borrador, `autor` no vacío, `datePublished` obligatorio para publicado, `dateModified` opcional y `revisadoPor` opcional. Fechas válidas ISO; una fecha de modificación requiere un registro de revisión real, no fecha automática de build. No se atribuye a AdSense una penalización específica. Revisor veterinario solo cuando exista identidad, credencial y registro de revisión del texto concreto; por decisión del usuario del 2026-09-07 no lo hay, y `revisadoPor` queda omitido en el seed. El campo `autor` admite una firma de organización; el tipo de entidad que emite el JSON-LD lo fija el registro de autoría, no el componente.

No hay relaciones de directorio en frontmatter. `src/data/internal-links.ts` es su fuente única. Las fichas conservan su schema. No se introduce MDX ni una dependencia nueva: artículos Markdown.

### Piloto y bloqueo de publicación

Se elige **piloto borrador excluido del build público hasta B4**, porque permite verificar infraestructura sin desplegar contenido antes de la política editorial y la auditoría. La colección puede cargarlo para validación, pero no genera HTML de artículo, tarjeta, enlace, JSON-LD Article ni entrada de sitemap mientras sea borrador. También se excluye de relaciones públicas. Su URL directa devuelve 404 en el preview productivo y en producción antes de B4.

Para capturas de B1 se publica temporalmente el piloto únicamente en un checkout de prueba aislado, servido localmente: se archiva diff de esa fixture y capturas etiquetadas como prueba, nunca se commitea ni despliega el cambio de estado. Luego se reconstruye el candidato sin esa modificación y se comprueba la ausencia del piloto. B4 levanta el bloqueo solo tras cumplir el contrato editorial completo de §5/B4 y B3 desplegada/verificada.

### Frontera de artefactos: qué se sirve y qué se empaqueta

Hallazgo de la verificación independiente de B1, resuelto aquí porque el criterio original era incompleto.

El adaptador de Cloudflare produce dos salidas. `dist/server/wrangler.json` declara
`assets.directory = ../client`, de modo que **sólo `dist/client` se sirve como estático**; `dist/server` es el
script del worker. En consecuencia un borrador se serializa en el chunk del content layer de `dist/server`
(`_astro_data-layer-content_*.mjs`) y **viaja dentro del bundle desplegado**, aunque no sea recuperable por
ninguna URL: comprobado en producción con 404 en la ruta del borrador y cero ocurrencias en el HTML de `/blog/`.

Reglas que se derivan:

1. Toda afirmación de ausencia declara el directorio inspeccionado. «Ausente de todo artefacto» sin decir dónde
   se buscó no es una afirmación verificable.
2. `scripts/verification/blog.mjs` se amplía **en B2** para inspeccionar `dist/client` y `dist/server` por
   separado y reportar cada uno. Ampliar el control no es motivo para relajar la política.
3. Para B1 este empaquetado **no es incumplimiento**: el borrador es un marcador de preparación editorial, no es
   servible, y el criterio escrito no lo cubría.
4. **Regla dura desde B4**: ningún borrador con contenido editorial real se serializa en un artefacto de
   distribución. Cuando existan artículos sin publicar ni auditar, el bundle deja de ser un lugar aceptable para
   su texto. La subfase que introduzca el primer borrador de contenido real demuestra su ausencia en ambos
   directorios antes de fusionar; si el generador no permite excluirlo, el borrador no se versiona en la
   colección hasta estar listo para publicarse.

Nunca se altera la configuración del filtro ni del adaptador para ocultar un borrador en vez de excluirlo.

### Enlaces tipados y fuente única

El catálogo contiene `PILAR_NAMES`, `ARTICULO_A_CLINICAS`, `ARTICULO_A_ZONAS`, `ARTICULO_A_PROVINCIAS` y `CROSS_PILLAR_LINKS`. Claves de artículo identificadas por pilar/slug; las relaciones inversas se derivan del mismo catálogo, nunca se mantienen a mano.

| Tipo | Fuente de validación | URL que debe existir en el build |
|---|---|---|
| Clínica | `data.slug` de clinicas, nunca entry.id | `/clinica/{slug}/` |
| Zona | slug canónico de `priorityZones` en zones.ts y conjunto efectivamente generado; alias no es destino canónico | `/zona/{zona}/` |
| Provincia | conjunto de provincias generado por la página actual y su normalización existente | `/provincia/{provincia}/` |
| Artículo | blog publicado, identidad pilar/slug | `/blog/{pilar}/{slug}/` |

El test no acepta “existe en alguna colección”: valida el tipo, identidad y URL completa. Relaciones preparadas para borradores pueden permanecer inactivas; no se renderizan desde ningún lado y se validan al publicarse. En cada arista activa artículo→clínica/zona debe existir su enlace inverso clínica/zona→artículo. No se promete bloque inverso de provincia en esta fase.

Casos negativos obligatorios: clínica inexistente y confusión entry.id/data.slug; alias/zona no generada; provincia inexistente; artículo inexistente, borrador o pilar incorrecto; slug válido en familia equivocada; destino eliminado e inverso ausente. El verificador de artefactos recorre los href internos del blog y sus bloques inversos, resuelve URLs y exige destino generado/canónico; comprueba fragmentos si existen. Los esquemas tel/mailto y enlaces externos se clasifican aparte, no se confunden con rutas del sitio.

### Publicidad

`blog-inline` y `blog-sidebar` se añaden a ads.ts en null; las cuatro claves existentes no cambian. Se exige ausencia de placeholders y de IDs null enviados a showAds. El guard de BaseLayout evita showAds sin IDs; null no implica que BaseLayout deje de cargar todos los scripts globales. Activar IDs reales queda fuera de esta fase.

## 5. Subfases y aceptación falsable

Serial: B1 → B2 → B3 → B4, con cada predecesora fusionada por autorización humana y verificada en producción. La verificación común de §7 aplica a todas. Cada prueba/evidencia identifica BASE, commit candidato, comando, salida y código de salida; no se aceptan skips nuevos.

### B1 — Infraestructura y piloto borrador

Crea schema, rutas, layout, tarjeta, breadcrumbs y JSON-LD Article/BreadcrumbList del artículo publicado, además del piloto borrador y su brief.

Aceptación:

- `npm run check`, `npm run test:unit`, `npm run build:no-shorten` salen 0.
- Test unitario del filtro real cubre la tabla de §2. Una fixture con slug rapi provoca salida no cero de `build:no-shorten`; el piloto válido permite salida 0. Se archivan ambas salidas y se retira la fixture antes del build candidato. No se modifica config para superar la prueba.
- Ambos índices de pilar y /blog/ existen con canonical de barra final; no hay piloto borrador en HTML de artículo, enlaces, JSON-LD Article ni sitemap. Su URL devuelve 404 y el verificador falla si aparece. **La comprobación se hace sobre `dist/client` y `dist/server`, nombrando en qué directorio se buscó**: no se acepta una afirmación de ausencia que sólo haya inspeccionado la salida cliente.
- La fixture local publicada genera la ruta, autor, un Article y BreadcrumbList parseables con URL/autor/fechas iguales al contenido visible. Canonical y metaDescription coinciden con schema. Se conserva evidencia de la fixture y de su retirada.
- Capturas de /blog/ y fixture publicada a 390×844 y 1440×900. Aprobación visual: cero scroll horizontal, cajas de título/texto dentro del ancho del viewport, ningún solapamiento de texto con anuncios/navegación, enlaces enfocables con indicador visible. Se archivan medidas DOM y recorrido de teclado, además de PNG.
- Sitemap: ninguna URL preexistente de clínica/provincia/zona perdida; conjunto añadido igual al esperado para el estado actual. Inventario y contenido de mirrors y catálogo sin cambios semánticos respecto de BASE. Diff limitado a allowlist B1.

### B2 — Enlaces y protección de emergencia

Introduce catálogo tipado y bloques de guías; con piloto aún borrador no se muestran relaciones públicas. Fixture aislada con artículo publicado permite comprobar ambos sentidos; el build candidato vuelve a demostrar su ausencia.

Aceptación:

- Todos los casos positivos/negativos de §4 pasan y cada mutación inválida provoca fallo verificable; URLs activas presentes en artefactos, sin 404 ni inversos ausentes.
- “Guías relacionadas” en clínica se coloca **después del contenedor completo de dos columnas de detalle y contacto**, nunca dentro de la primera columna antes de la sidebar (que bajaría el contacto móvil). En zona, después del listado completo y sus controles. No altera el orden de los bloques existentes.
- Controles: `/clinica/hems-una-heredia/`, `/clinica/hospital-vet-medical-care-heredia/`, `/clinica/veterinaria-gocha-santo-domingo/`, `/zona/san-pablo-heredia/` y `/zona/guapiles/`, a 390×844 y 1440×900. Fixtures de relaciones activan bloques en esos destinos sin editar fichas.
- Comparar BASE y candidato/fixture con mismo navegador, fuentes cargadas, reloj fijado, red publicitaria aislada y scroll 0. Para datos rápidos, horario, advertencia diurna cuando exista, `btn-quick-call`, `btn-quick-wa` y botones de contacto sidebar presentes: diferencias de x/y/width/height ≤1 CSS px; mismo texto, href y orden relativo de foco; sin cobertura por elementos nuevos. Ningún elemento antes visible sobre el pliegue deja de estarlo. Ausencias registradas, como WhatsApp en HEMS, permanecen ausencias, no skips.
- Activar por teclado los controles presentes y comprobar el destino tel/WhatsApp con navegación interceptada, sin llamar ni enviar mensajes. Para zona se mantienen geometría y funcionamiento de controles del listado, con capturas antes/después.
- `docs/seo/enlazado-interno.md` enumera familias, fuente única, derivación inversa y algoritmo de validación, coincidentes con catálogo/tests.

### B3 — Política editorial y atribución

Publica política, enlace desde footer, entrada de navegación al blog y registro verificable de autoría; el piloto sigue borrador.

**Propiedad del enlace de navegación.** Hasta esta corrección ninguna subfase tenía asignado el enlace de navegación hacia `/blog/`, de modo que las rutas quedaron alcanzables sólo por sitemap y por URL directa. B3 lo asume porque ya es propietaria de `BaseLayout.astro`. La entrada se **renderiza únicamente cuando existe al menos un artículo publicado**: enlazar desde la navegación un índice vacío perjudica al lector y a la revisión publicitaria, y durante B3 todos los artículos siguen en borrador. En la práctica la entrada aparece recién con el primer artículo de B4, sin necesidad de un cambio de código adicional.

Aceptación:

- `/politica-editorial/` responde 200 y el footer enlaza a su canonical. Capturas y condiciones geométricas/teclado de B1.
- Política distingue proceso previsto de trabajos ya realizados. Describe brief, redacción asistida, auditoría independiente y aprobación humana; prohíbe presentar auditoría IA como revisión veterinaria o afirmar comité inexistente.
- **Autoría de organización.** El usuario decidió el 2026-09-07 que la firma visible sea colectiva: «Equipo de Vet24cr». Es una atribución legítima, y por eso el JSON-LD debe declararla como tal: `author` de tipo **`Organization`**, nunca `Person`. Emitir `Person` con un nombre de equipo afirmaría en datos estructurados que existe una persona con ese nombre — una declaración falsa leída por buscadores, que es exactamente lo que esta fase existe para no hacer.
- `docs/blog/autoria.md` registra: el nombre público de la firma; el tipo de entidad (`Organization` o `Person`) que debe emitir el JSON-LD; la **persona responsable editorial** que responde por el contenido y aprueba la atribución, con su rol real; y los artículos y commits a los que aplica. La persona responsable puede no aparecer en el sitio, pero debe constar en el registro: una firma colectiva no exime de que alguien responda. No se versionan documentos de identidad privados ni direcciones de correo personales.
- Autor visible y JSON-LD coinciden con ese registro, en nombre **y en tipo**. Una atribución ficticia, un nombre sin respaldo en el registro, o un tipo de entidad que no corresponda con la firma, bloquean la publicación.
- **No hay revisión veterinaria profesional.** El usuario lo confirmó el 2026-09-07. `revisadoPor` se omite en todo el seed, y ni la política editorial ni ninguna página pueden insinuar lo contrario. Si en el futuro existe un revisor, hará falta credencial verificable y constancia de revisión del texto concreto, artículo por artículo; sin ambas se sigue omitiendo. Una persona real no se convierte en autora ni en revisora por aprobar un merge.
- La entrada de navegación al blog está implementada y condicionada: con cero artículos publicados no se renderiza en ninguna página, y con al menos uno enlaza a `/blog/` con su barra final. Se demuestra con una prueba por cada lado de la condición y con una fixture publicada; no se acepta la condición comprobada en un solo sentido. El enlace es `<a href>` normal, rastreable y enfocable por teclado, y no altera geometría ni orden de foco del resto de la navegación según las tolerancias de §5/B2.
- Capturas de política y autoría de fixture; la política se despliega y verifica antes de publicar el piloto.

### B4 — Cinco artículos, incluido piloto

Aceptación por artículo, sin excepciones para piloto:

- Brief previo versionado en `briefings/briefing-{slug}.md`, con historial anterior a redacción final, tema/pilar y contrato de fuentes/destinos.
- Mínimo seis fuentes distintas, con URL profunda, título, autor/institución, fecha disponible y fecha de consulta. Fuentes elegibles: estudios originales/revisiones científicas identificables, guías de facultades/colegios/organismos veterinarios o entidades públicas competentes; datos locales de un establecimiento solo respaldan lo que ese establecimiento declara (servicios/precios), no conclusiones clínicas generales. Seis URLs duplicadas de la misma fuente no cuentan como seis fuentes.
- Matriz afirmación→fuente→pasaje localizado→H2. Cada una de las seis fuentes debe sostener al menos una afirmación concreta de su H2, citada allí; referencia solo en bibliografía no cuenta. Cada afirmación clínica, cifra y tarifa verificable tiene evidencia; una contradicción, cita no comprobable o inferencia sin sustento queda como hallazgo bloqueante hasta resolución. El auditor registra comprobación fila por fila y motivo de elegibilidad; desacuerdo sin resolver impide aprobar.
- Auditoría por sesión distinta de la redactora, identificada en reporte versionado: **veredicto APROBADO sobre el SHA candidato** y cero hallazgos bloqueantes abiertos. Cualquier hallazgo pendiente sobre exactitud, fuentes, atribución, publicación, enlaces o aceptación técnica bloquea. Un RECHAZADO o APROBADO CON CAMBIOS pendientes no satisface el criterio. Cambiar el contenido después exige reauditar el nuevo candidato.
- Para evitar autorreferencia del SHA, reporte y autorización pueden incorporarse en un commit posterior solo de evidencia: se registra el SHA editorial auditado y se prueba que los archivos de producto/brief/catálogo no difieren de él. El merge requiere aprobación humana del HEAD final exacto; si cambió producto, se reinicia auditoría.
- El artículo muestra que es información orientativa y no sustituye consulta veterinaria; el aviso no exime de verificar afirmaciones clínicas. Autoría/política B3 cumplidas; fechas corresponden a publicación/revisión real, sin autorrelleno. Validación de sitemap defensiva y enlaces tipados/inversos pasa para todos los artículos publicados. Aparecen en índice general y su pilar; los borradores restantes siguen excluidos.
- Aprobación explícita del usuario antes de cada merge publicable. Son exactamente cinco artículos publicados al cierre, incluido piloto; no se acepta un sexto.

## 6. Propiedad exhaustiva y bases inmutables

C = creación inicial, M = modificación, C→M = creación y mantenimiento dentro de la misma subfase. Todo archivo no listado queda prohibido. Los globs solo autorizan el directorio/extensión indicados y deben materializarse en el inventario de base; no autorizan dependencias, config AR o archivos de otra familia.

| Archivo o glob acotado | Operación y propietario serial |
|---|---|
| docs/blog/plan-fase-3.md; docs/blog/afirmaciones-verificables-fase-3.md | M, coordinador documental; tarea actual solo estos dos |
| src/content.config.ts | M B1, solo añadir blog; clinicas intacta |
| src/lib/blog.ts | C→M B1, helpers schema, rutas y publicación |
| src/lib/blog-sitemap.ts | C→M B1, comprobación defensiva |
| src/pages/blog/index.astro | C B1 → M B2 (enlaces) |
| src/pages/blog/[pilar]/index.astro | C B1 → M B2 |
| src/pages/blog/[pilar]/[slug].astro | C B1 → M B2 |
| src/layouts/BlogLayout.astro | C B1 → M B2 (silo) → M B3 (atribución) |
| src/components/BlogCard.astro; src/components/BlogBreadcrumbs.astro | C→M B1 |
| src/config/ads.ts | M B1, únicamente dos claves null |
| src/content/blog/urgencias-en-perros.md | C B1 borrador → M B4 publicación |
| briefings/briefing-urgencias-en-perros.md | C B1 → M B4 con cambios trazados antes de redacción final |
| src/data/internal-links.ts; src/lib/blog-links.ts; src/components/GuiasRelacionadas.astro | C B2 → M B4 para relaciones del seed (componente/helper solo si defecto documentado dentro de contrato) |
| src/pages/clinica/[slug].astro; src/pages/zona/[zona].astro | M B2, solo bloque y conexión de guías; datos previos intactos |
| docs/seo/enlazado-interno.md | C B2 → M B4 para inventario final |
| src/pages/politica-editorial.astro; src/components/BlogAuthor.astro; docs/blog/autoria.md | C B3 → M B4 para registros reales del seed |
| src/layouts/BaseLayout.astro | M B3, solo enlace de política en footer y entrada de navegación al blog condicionada a artículos publicados |
| src/content/blog/{urgencias-en-gatos,atencion-veterinaria-para-exoticos,costo-emergencia-veterinaria-nocturna,atencion-veterinaria-24h-por-zona}.md | C→M B4; conjunto enumerado de cuatro archivos, no glob libre |
| briefings/briefing-{urgencias-en-gatos,atencion-veterinaria-para-exoticos,costo-emergencia-veterinaria-nocturna,atencion-veterinaria-24h-por-zona}.md | C→M B4; mismo conjunto enumerado |
| tests/unit/blog-schema.test.ts; tests/unit/blog-publication.test.ts; tests/unit/blog-sitemap.test.ts | C→M B1 |
| tests/unit/blog-links.test.ts | C B2 → M B4 para cobertura seed |
| tests/e2e/blog.spec.ts | C B1 → M B2 → M B3 → M B4, criterios respectivos |
| tests/e2e/blog-emergency-layout.spec.ts | C B2 → M B4 para comprobación final |
| scripts/verification/blog.mjs | C B1 → M B2 (amplía inspección a dist/client y dist/server) → M B3 → M B4, artefactos y condiciones respectivas |
| docs/blog/evidencia/b1/** | C→M B1: bases, fixtures, auditoría técnica, resultados y cierre |
| docs/blog/evidencia/b2/** | C→M B2: misma responsabilidad |
| docs/blog/evidencia/b3/** | C→M B3: misma responsabilidad |
| docs/blog/evidencia/b4/** | C→M B4: misma responsabilidad más auditorías editoriales y aprobaciones |

La subfase posee producto/tests; su verificadora independiente posee la evidencia de verificación y la coordinadora documental los registros de base/cierre. Nadie verifica su propia ejecución. Evidencia solo admite registros, JSON, texto, logs, diffs de fixtures y capturas; no código ejecutable oculto. Las fixtures transitorias se archivan como diff en evidencia, no se incorporan al producto.

El traspaso de una fila compartida ocurre solo después de merge autorizado y cierre productivo de la predecesora; se registra SHA de entrega y receptor en la base siguiente. No autoriza trabajo paralelo.

Antes de editar cada subfase, ejecutar y archivar el escaneo base de §7.4 y crear `docs/blog/evidencia/bN/base.json` con `baseSha` completo e inmutable igual al main remoto inicial, SHA de predecesora, inventario concreto de archivos permitidos, responsables y fecha. B1–B4 **no están iniciadas**: no se inventan sus futuros SHA; registrarlos es precondición bloqueante. La base documental actual no se reutiliza automáticamente como base futura. Si main cambia, se registra una nueva ejecución/base conservando la evidencia anterior y se repite verificación; nunca se sobrescribe la base para ocultar cambios.

Revisión obligatoria: `git diff --name-status <BASE_SHA>...HEAD` y diff completo contra esa base; adicionalmente diff contra main vigente. Cualquier ruta fuera de allowlist bloquea, incluso si es nueva. La coordinadora debe modificar y aprobar el alcance antes de habilitar un archivo faltante, nunca por decisión silenciosa del implementador.

## 7. Verificación común y cierre productivo

Antes del primer cambio de cada subfase: registrar BASE, construir base sin acortador y archivar sitemap, catálogo, mirrors, geometría aplicable y escaneo completo productivo. No confundir salida 0 con checks aprobados.

Comandos futuros de verificación de la sesión, separados, con salida/código archivados. Esta lista no describe los pasos del workflow de CI:

```bash
npm run check
npm run test:unit
npm run build:no-shorten
node scripts/verification/blog.mjs
node scripts/verification/agent-catalog.mjs
node scripts/verification/agent-markdown.mjs
npm run test:e2e
git diff --name-status <BASE_SHA>...HEAD
git diff <BASE_SHA>...HEAD
```

**La evidencia no existe hasta estar versionada y empujada.** Cualquier registro producido en una máquina local —informe, log, captura, diff— se commitea y se empuja a una rama del repositorio antes de reportar el trabajo como entregado. Una ruta de disco local no es un entregable: no la puede leer la coordinadora, no la puede auditar un tercero y desaparece con la sesión. Un veredicto cuya evidencia no esté en el repositorio no cierra ninguna subfase. Todo encargo a una sesión debe pedirlo explícitamente.

El workflow actual no ejecuta `scripts/verification/blog.mjs`: es un control **manual obligatorio**. La sesión ejecutora lo corre después del build del candidato y la verificadora independiente lo repite sobre ese mismo candidato. Cada una archiva comando, SHA, salida estándar, salida de error y código de salida en `docs/blog/evidencia/bN/blog-ejecutora.log` y `blog-verificadora.log`, respectivamente. Salida no cero o cualquiera de esos registros ausente bloquea aceptación y cierre aunque CI esté verde. La coordinadora comprueba ambos registros. No se modifica ci.yml para incorporarlo. Los nuevos tests unitarios sí quedan cubiertos por `npm test`, los specs E2E por `test:e2e` y la defensa del sitemap por `build:no-shorten`; eso no sustituye la ejecución manual de blog.mjs.

No `npm run build`: el acortador hace red y escribe datos. CI existente debe concluir success en el HEAD final y conservar controles (incluido dry-run/tipos/E2E); no modificar workflow ni aceptar skips nuevos. Registrar skips históricos como no verificados, no pass. La coordinadora comprueba run y conclusión del candidato, mergeability y diff; el resumen de otra IA no es evidencia.

### Descubrimiento y conservación AR

El blog se descubre mediante HTML, enlaces y sitemap. Estado real hasta que B3 despliegue la entrada de navegación y B4 publique el primer artículo: el descubrimiento es sólo por sitemap y URL directa, sin ningún enlace entrante desde el resto del sitio. Es una limitación conocida y aceptada de este tramo, no un supuesto cumplido; ninguna subfase puede declararla resuelta antes de que esa entrada exista y se verifique. No se añade a llms, catálogo de clínicas o mirrors; no se anuncia negociación Markdown de blog. Una futura ampliación de llms requiere tarea AR2 separada y autorización, no es condición implícita de esta fase.

Después de cada despliegue, verificadora distinta del ejecutor archiva en `docs/blog/evidencia/bN/`:

1. Registro de Workers Builds/deployment con ID, resultado y SHA de origen igual al merge autorizado, dominio/fecha y comprobación HTTP de una ruta afectada. Un SHA local o CI verde no prueba qué commit sirve producción. Si no se puede obtener esa correspondencia, el cierre queda pendiente.
2. GET/HEAD, status, MIME, cuerpo/cabeceras de `/api/catalog.json`, `/api/openapi.json`, `/llms.txt`, `/api/readme.md`, `/auth.md`, `/.well-known/api-catalog`; destinos 200 y HEAD sin cuerpo. `/sitemap.xml` conserva 301 a `/sitemap-index.xml`, XML 200 y conjunto esperado. Catálogo, llms e inventario/contenido de mirrors conservan datos de BASE.
3. En todas las rutas HTML con espejo del inventario BASE: Accept markdown devuelve Markdown; Accept navegador y markdown;q=0 conservan HTML; HEAD selecciona igual sin cuerpo. Vary: Accept y private,no-store permanecen; noindex solo en mirror directo, cuyo MIME/CORS/noindex se conserva. Relaciones Link de descubrimiento conservadas y destinos 200. Blog permanece HTML sin anunciar espejo.
4. Escaneo completo de los mismos 22 identificadores mediante script AR existente en modo lectura:
   robotsTxt,sitemap,linkHeaders,dnsAid,markdownNegotiation,robotsTxtAiRules,contentSignals,webBotAuth,apiCatalog,oauthDiscovery,oauthProtectedResource,authMd,mcpServerCard,a2aAgentCard,agentSkills,webMcp,ard,x402,mpp,ucp,acp,ap2.
   Se archiva el JSON íntegro y una comparación por identificador, no sólo el nivel. Si el servicio cambia la
   lista, documentar cobertura y bloquear cierre hasta resolver comparabilidad. No reducir perfil.

   **La comparación se hace contra la línea base ejecutada de la subfase.** Esa base sólo existe si se ejecutó
   *antes* de tocar código: producción sirve un único estado a la vez y un estado pasado no se puede escanear
   retroactivamente. Por eso ejecutar y archivar el escaneo base es **precondición bloqueante** de cada subfase,
   junto con `base.json`, y no una tarea que se pueda recuperar al final.

   **Regla de cierre, ejecutable:** la condición es que **ningún identificador que estuviera en `pass` pase a
   `fail` o `neutral`**, no una igualdad literal de todos los valores. Una mejora de `fail` a `pass` no bloquea;
   se documenta.

   **Excepción por base inobtenible.** Cuando la base de una subfase no se ejecutó a tiempo y ya no puede
   obtenerse, no se finge ni se sustituye en silencio: se archiva el escaneo productivo íntegro, se compara
   contra el escaneo AR archivado más reciente identificándolo por archivo y fecha, y se rotula explícitamente
   como comparación informativa, no contractual. El cierre bajo esta excepción requiere autorización del usuario
   y deja registrado por qué faltó la base, para que no se repita. La excepción no se invoca por comodidad: si la
   base es obtenible, se obtiene.
5. URLs nuevas previstas responden con estado/canonical esperado; borradores siguen 404; capturas/medidas y controles de emergencia exigidos por la subfase pasan. Auditoría independiente identifica candidato y evidencia productiva.

Bloquean cierre: base de escaneo no ejecutada a tiempo sin la excepción autorizada de §7.4; despliegue sin SHA demostrado; error nuevo HTTP/MIME/cabeceras/negociación; pérdida/cambio no autorizado de catálogo o mirror; ruta publicada fuera del sitemap; borrador accesible; regresión de un pass o descenso del nivel respecto de base; controles de aceptación fallidos; evidencia ausente o auditoría desfavorable. Estados fail/neutral heredados se comparan y documentan, nunca se convierten en pass. Sin red o panel, dejar explícitamente pendiente la verificación; no simular resultados ni cerrar issue.

Seguimiento de PRs por evento, no por sondeo: usar subscribe_pr_activity y ScheduleWakeup cuando estén disponibles; si no, registrar la limitación y coordinar el aviso de cierre sin simular esas herramientas.

El issue se cierra manualmente tras evidencia y todos los PRs asociados fusionados; no usar Closes automático. Un PR de evidencia requiere también autorización humana para merge y despliega: archivar en el siguiente registro de cierre su deployment, comprobar que solo cambió evidencia y hacer smoke HTTP de conservación. Ese registro final puede quedar en comentario del issue para evitar una cadena infinita de commits de evidencia; debe enlazar a evidencia versionada y deployment real. Ante regresión no declarar cierre ni iniciar dependiente; informar al usuario y preparar propuesta de reversión, sin asumir autorización de merge.

## 8. Riesgos y respuesta contractual

| Riesgo | Condición/mitigación verificable |
|---|---|
| Slug excluido por regex heredado | Build falla por comprobación B1; no modificar config AR |
| Colisión de archivos | Allowlist §6, BASE inmutable, traspaso serial, diff completo |
| Piloto prematuro | Borrador excluido de rutas/enlaces/sitemap; publicación solo con B3 y B4 cumplidas |
| Errores o fuentes decorativas | Matriz de afirmaciones, auditoría favorable del candidato, cero bloqueantes |
| Enlaces rotos | Validación por familia/URL, negativos e inversos |
| Desplazamiento de atención urgente | Ubicación fuera de contenedor completo y geometría/teclado §5/B2 |
| Regresión AR tras deploy | HTTP completo, SHA desplegado y escaneo comparado §7 |
| Pilares insuficientes | Emergencias distribuida en seed; gate documental antes de artículo 6 |
| Publicidad sin IDs | Dos claves null y ningún ID ficticio en showAds |
| Blog sin enlaces entrantes | Entrada de navegación con dueño en B3, condicionada a artículos publicados y probada por ambos lados |
