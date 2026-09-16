# Changelog de extensión — `urgencias-en-perros`

Fecha: **2026-09-10**  
Base: `c02b65f56bae6562b9b15373b80ed437b4df8d90`  
Alcance: contenido Markdown y documentación editorial únicamente.

## Cambios realizados

- Se amplió `src/content/blog/urgencias-en-perros.md` de una nota breve a una guía escaneable de aproximadamente 2.770 palabras de prosa editorial, según el conteo local actualizado que excluye el HTML de las figuras.
- Se mantuvieron sin cambios el frontmatter SEO, H1, CTA SOS, autoría colectiva, fecha publicada, hero, intención principal y seis H2 contractuales.
- Se añadió una apertura empática y una regla práctica para separar una señal que requiere traslado sin demora de una duda que conviene comunicar a una sede local, sin diagnosticar.
- Se desarrollaron los cinco grupos de señales con observables, lenguaje prudente y fuentes inline.
- Se añadió una secuencia de primeros minutos, división de tareas, guion de llamada, datos para comunicar, checklist de información, traslado no invasivo, qué evitar y explicación del triage.
- Se añadió una sección de contingencia para traslados difíciles: pedir apoyo, preparar el camino, reducir manipulación y comunicar cambios de sede sin introducir maniobras clínicas nuevas.
- Se añadieron dos imágenes de apoyo en WebP responsive para traslado y preparación de información, con alt, disclosure visible y fuentes originales fuera de `public/`.
- Se añadió un CTA inline tras la apertura: pregunta si la persona está en una emergencia y ofrece el botón `Abrir ayuda de emergencia` con `data-sos-trigger`, reutilizando el flujo SOS global hacia el directorio local sin duplicar teléfonos ni rutas.
- Los enlaces HTTP(S) externos dentro del cuerpo del blog ahora abren en una pestaña nueva con `rel="noopener noreferrer"` y una indicación accesible; los enlaces internos y el flujo SOS local conservan la navegación en la misma pestaña.
- Se añadió una FAQ breve bajo `Confirmaciones locales antes de salir` para resolver cuatro dudas de decisión; no se creó una nueva página del cluster.
- Se actualizó `clinical-evidence-dossier-2026-09-09.md` con C8–C15, fuente, locator, fecha de consulta y límite de uso.
- Se creó `extension-brief-2026-09-10.md` con arquitectura, contrato clínico, mapa visual y gates.

## Fuera de alcance

- No se añadió ninguna fuente clínica nueva: C8–C14 reutilizan S1–S6.
- No se incorporaron dosis, RCP, compresiones, respiración de rescate, Heimlich, extracción de objetos, presión, enfriamiento, medicamentos ni tiempos clínicos rígidos.
- No se incorporaron teléfonos, precios, disponibilidad o instrucciones de servicios estadounidenses.
- No se cambiaron schema, layout, componentes, infraestructura, dependencias, rutas ni páginas hijas.
- Se generaron e integraron dos imágenes sintéticas de apoyo en WebP responsive: traslado seguro y preparación de información. Los originales PNG, hashes, disclosures y procedencia están en `asset-manifest-hero-traslado-seguro-2026-09-09.md`; no se subieron a un servicio externo ni se activó R2/Cloudflare Images.
- No se modificó `datePublished`, no se agregó `dateModified`, no se inventaron testimonios ni se agregó `revisadoPor`.

## Pendientes y gates

- Preflight semántico/telefónico sobre Markdown y HTML generado: completado.
- `git diff --check` y build del repositorio: completados.
- QA visual de escritorio del hero: completada; la verificación móvil manual sigue pendiente.
- QA visual y funcional del CTA inline en escritorio/móvil: pendiente; el código reutiliza el flujo SOS existente y el botón usa control nativo, objetivo mínimo de 48 px y foco visible.
- Verificar en navegador que los enlaces de Cornell, Merck, ASPCA y AVMA abran una pestaña nueva sin perder la posición del artículo.
- Revisar el manifest independiente y aceptar los assets antes de publicación.
- Resolver los gates históricos de SERP y correspondencia deployment–SHA antes de publicación.

No se hizo commit, push ni deploy.

## Validación de la extensión

```text
ARTICLE_BODY_WORDS=2770 (conteo editorial local; prosa, excluye figuras)
US_PHONE_MARKDOWN_CHECK=PASS
FORBIDDEN_TERMS_MARKDOWN_CHECK=PASS
ARTICLE_HTML_CHECK=PASS (hero + 2 apoyos, metadatos, JSON-LD y CTA)
SUPPORT_IMAGES_HTML_CHECK=PASS (2 figuras, alt, caption, srcset/sizes, lazy y dimensiones)
INLINE_SOS_CTA_CHECK=PASS (texto de emergencia, `data-sos-trigger`, `type=button`, `min-h-12` y foco visible)
EXTERNAL_LINK_TARGET_CHECK=PASS (enlaces externos del cuerpo reciben `_blank`, `noopener noreferrer` y etiqueta accesible; enlaces internos quedan sin `_blank`)
CORNELL_SOURCE_HTTP_CHECK=PASS (URL exacta responde HTTP 200; contenido accesible)
LOCAL_PREVIEW_4321_CHECK=PASS (artículo, CTA, URL de Cornell y política de enlaces presentes)
US_PHONE_HTML_CHECK=PASS
FORBIDDEN_TERMS_HTML_CHECK=PASS
git diff --check=PASS
npm run check=PASS (0 errores, 0 warnings, 75 hints; 17,601 ms)
npm run build:no-shorten=PASS (17,825 ms)
```

El build generó `/blog/guias-por-especie/urgencias-en-perros/index.html`. Persisten únicamente advertencias conocidas del proyecto: import dinámico de `astro:content`, fallback TLS de `Request.cf` durante la generación y hints existentes del proyecto. La QA visual móvil 390×844 y la aceptación final de los assets siguen pendientes.
