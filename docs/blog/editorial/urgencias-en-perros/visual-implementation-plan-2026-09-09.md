# Plan visual mínimo — `urgencias-en-perros`

Fecha: **2026-09-09**  
Base local: `c02b65f56bae6562b9b15373b80ed437b4df8d90`  
Estado de fase: **HERO INTEGRADO; AUDITORÍA VISUAL Y PUBLICACIÓN BLOQUEADAS**  
Alcance: **soporte opcional de schema/layout y asset aprobado para revisión; no se generó ni descargó ningún asset en esta sesión**

## Decisión

El piloto puede incorporar un único visual editorial, sobrio y no clínico, orientado a preparar un traslado seguro. No se incorporará una fotografía de lesión, sangre, vómito, procedimiento, medicación ni un caso real.

La implementación es opcional para no romper los artículos existentes. El soporte ya está incorporado, pero como el asset no está creado, auditado ni registrado, el artículo conserva el `og-share-default.png` existente y no declara una imagen en `Article` JSON-LD.

## Diagnóstico del código actual

| Superficie | Hallazgo | Implicación |
|---|---|---|
| `src/lib/blog.ts` | `blogSchema` es estricto y ahora valida opcionalmente `heroImage` con `src`, `srcset`, `alt`, `caption`, `width` y `height` | Los artículos existentes siguen siendo válidos; una imagen declarada debe ser local, responsive y tener alt/caption/dimensiones |
| `src/content.config.ts` | La colección `blog` usa `blogSchema` | La validación del frontmatter se centraliza en `src/lib/blog.ts`; no hace falta otra colección |
| `src/layouts/BlogLayout.astro` | Ahora consume `heroImage` opcional, añade `Article.image`, pasa la imagen/alt a `BaseLayout`, renderiza `<figure>`/`figcaption` y construye `srcset` | Sin `heroImage`, el HTML actual no añade ningún hero |
| `src/layouts/BaseLayout.astro` | Ahora acepta `imageAlt?: string` y emite alt para OG/Twitter cuando existe; mantiene `/images/og-share-default.png` como fallback | OG y JSON-LD quedan alineados solo cuando hay asset |
| `src/pages/blog/[pilar]/[slug].astro` | Obtiene `entry`, renderiza `Content` y lo entrega a `BlogLayout`; no construye metadata ni JSON-LD | No requiere cambio funcional si `BlogLayout` consume `entry.data.heroImage` |
| `public/images` | Existen variantes WebP 640×360, 1280×720 y 1600×900 para el hero | El manifest registra hash, procedencia, alt y disclosure; falta auditoría independiente |

## Campo de frontmatter propuesto

Nombre recomendado: `heroImage`.

Ejemplo aplicado después de crear y auditar el asset:

```yaml
heroImage:
  src: "/images/blog/urgencias-en-perros/hero-traslado-seguro-1600.webp"
  srcset:
    - src: "/images/blog/urgencias-en-perros/hero-traslado-seguro-640.webp"
      width: 640
    - src: "/images/blog/urgencias-en-perros/hero-traslado-seguro-1280.webp"
      width: 1280
    - src: "/images/blog/urgencias-en-perros/hero-traslado-seguro-1600.webp"
      width: 1600
  alt: "Persona cuidadora preparando con calma el traslado de un perro."
  caption: "Imagen ilustrativa sintética: una persona prepara con calma el traslado de un perro. No representa un caso real ni una clínica específica."
  width: 1600
  height: 900
```

Validación aplicada en `blogSchema`:

```ts
heroImage: z.object({
  src: z.string().trim().regex(
    /^\/images\/blog\/[a-z0-9-]+\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp)$/,
    'La imagen debe ser un asset local del blog',
  ),
  srcset: z.array(z.object({ src: z.string(), width: z.number().int().positive() })).min(1),
  alt: z.string().trim().min(1).max(180),
  caption: z.string().trim().min(1).max(240),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
}).optional(),
```

Razón de `optional`: los artículos actuales no tienen imágenes declaradas. Para el piloto, el campo se añade solo después de que el manifest confirme archivo, dimensiones, procedencia, licencia y revisión negativa. `alt`, `caption` y `srcset` son obligatorios cuando existe `heroImage`; no se permite un objeto parcial ni alt/caption vacíos.

## Asset y manifest permitidos

Ruta pública aplicada:

```text
public/images/blog/urgencias-en-perros/hero-traslado-seguro-{640,1280,1600}.webp
```

El asset fuente conservado fuera de `public/` mide 1672×941; las variantes públicas son 640×360, 1280×720 y 1600×900. El máximo real aplicado es 1600 px, no 1920. No se descargará una imagen remota para resolver esta fase.

Antes de implementarlo se debe crear un manifest editorial con, como mínimo:

- ruta exacta y hash del archivo;
- dimensiones, formato y peso;
- fuente o método de creación, licencia y fecha;
- `alt` aprobado;
- revisión de ausencia de texto incrustado, teléfonos, marcas no autorizadas y datos estadounidenses;
- confirmación de que no representa un paciente real, una intervención clínica ni una disponibilidad 24/7;
- estado de revisión independiente.

El manifest aplicado es [asset-manifest-hero-traslado-seguro-2026-09-09.md](asset-manifest-hero-traslado-seguro-2026-09-09.md). La fuente PNG con C2PA permanece fuera de `public/`.

## Render responsive y carga

La integración implementada en `BlogLayout.astro` y su validación futura deben:

1. Renderizar un `<figure>` opcional con `<img>` solo si `heroImage` existe.
2. Usar `src`, `width`, `height` y `alt` desde el frontmatter para evitar layout shift.
3. Servir una variante responsive mediante `srcset`/`sizes` o un pipeline equivalente, con `sizes="(max-width: 768px) 100vw, 960px"` como punto de partida.
4. Mantener `decoding="async"`; el hero puede usar `loading="eager"` y `fetchpriority="high"` por estar cerca del encabezado.
5. Usar `loading="lazy"` para cualquier imagen futura que aparezca después del contenido principal; no aplicar lazy al hero.
6. Verificar 390×844 y 1440×900. Si el visual empuja el callout de decisión fuera del primer viewport móvil, moverlo debajo del callout mediante una composición explícita o no usarlo en este piloto.

La imagen no debe reemplazar el texto ni ser necesaria para comprender las cinco señales, la llamada o el traslado.

## OG y `Article` JSON-LD

Cuando `heroImage` exista:

- `BlogLayout.astro` debe convertir `heroImage.src` a URL absoluta con el mismo origen canónico del sitio.
- Debe pasar esa URL a `BaseLayout` mediante su prop `image`, sustituyendo el fallback solo para ese artículo.
- `BaseLayout.astro` debe emitir la misma imagen en `og:image` y `twitter:image` y, preferiblemente, `og:image:alt`/`twitter:image:alt` desde `heroImage.alt`.
- El objeto `Article` debe incluir `image` con la URL absoluta. La forma mínima es una cadena; no se debe inventar un `ImageObject` con datos que no existan.
- Si no hay `heroImage`, se conserva el fallback actual para OG y se omite `image` del JSON-LD del artículo, sin declarar un recurso inexistente.

No se cambió `src/pages/blog/[pilar]/[slug].astro`: el `entry` completo ya llega a `BlogLayout`. La validación pendiente debe confirmar que el JSON-LD renderizado y las etiquetas OG coinciden cuando exista un asset.

## Criterios negativos obligatorios

El asset y su render quedan bloqueados si contienen o sugieren:

- lesiones, sangre, vómito, cadáveres, sufrimiento visible o procedimientos;
- RCP, compresiones, respiración de rescate, Heimlich, extracción de objetos, presión, enfriamiento, dosis o medicación;
- un paciente real, un caso real, una clínica identificable o una persona presentada como veterinaria/revisora;
- una sede abierta, atención 24/7, cupo, hospitalización o capacidad clínica no demostrada;
- teléfonos, precios, disponibilidad o instrucciones operativas de APCC/Poison Control de EE. UU.;
- texto incrustado que contradiga el artículo, CTA que prometa atención o una imagen que parezca evidencia clínica;
- alt text que diagnostique, prometa resultados o describa una situación no visible.

El alt debe describir la función visual de manera neutral, no repetir keywords ni convertir una ilustración en prueba médica.

## Gates de esta fase

| Gate | Estado | Condición de salida |
|---|---|---|
| Campo y schema | IMPLEMENTADO | `heroImage` valida `src`, `srcset`, alt, caption y dimensiones |
| Asset local | INTEGRADO; AUDITORÍA VISUAL PENDIENTE | Manifest, hashes, C2PA y disclosure registrados |
| Render responsive | IMPLEMENTADO; HTML VALIDADO | `srcset` 640/1280/1600, `sizes`, 1600w LCP y fallback `src` |
| OG | IMPLEMENTADO; HTML VALIDADO | `BaseLayout` recibe imagen/alt y emite OG/Twitter image/alt |
| `Article` JSON-LD | IMPLEMENTADO; HTML VALIDADO | Emite `image` absoluto cuando existe `heroImage` |
| Seguridad editorial | BLOQUEADO | Pasar criterios negativos y revisión independiente |
| Publicación | BLOQUEADO | Requiere todos los gates anteriores, build/render y correspondencia deployment–SHA |

## Validación de esta implementación

El control estático pasó:

```text
STATIC_HERO_SUPPORT_CHECK=PASS
ARTICLE_ASSET_FRONTMATTER_CHECK=PASS
```

Confirmó el campo opcional, la ruta local, la propagación a OG/JSON-LD, el `srcset`, el `loading` del hero y la caption/disclosure visible del `heroImage` aplicado.

Inicialmente, `npm run check` y `npm run build:no-shorten` quedaron bloqueados porque `astro` no estaba instalado. La instalación posterior se ejecutó únicamente con el `package-lock.json` existente y sin editar los manifests.

Actualización posterior, autorizada solo en este worktree:

```text
npm ci                       EXIT=0   DURACIÓN≈20 s
npm run check                EXIT=0   DURACIÓN=36,093 ms
npm run build:no-shorten     EXIT=0   DURACIÓN=19,759 ms
```

`npm ci` añadió 335 paquetes y reportó cinco vulnerabilidades de alta severidad. No se ejecutó `npm audit fix` porque modificaría dependencias. El build generó:

```text
dist/client/blog/guias-por-especie/urgencias-en-perros/index.html
```

Controles sobre ese HTML:

```text
ARTICLE_OUTPUT_CHECK=PASS (validación previa sin heroImage)
OG_FALLBACK_CHECK=PASS (validación previa sin heroImage)
ARTICLE_JSONLD_NO_IMAGE_CHECK=PASS (validación previa sin heroImage)
```

El artículo deja de usar el fallback como imagen principal: `og:image`, Twitter y `Article.image` apuntan al hero absoluto en el HTML generado. La validación post-integración quedó así:

```text
npm run check                EXIT=0   DURACIÓN=15,717 ms
npm run build:no-shorten     EXIT=0   DURACIÓN=15,646 ms
ARTICLE_OUTPUT_HERO_CHECK=PASS
SRCSET_RESPONSIVE_CHECK=PASS
OG_TWITTER_IMAGE_ALT_CHECK=PASS
ARTICLE_JSONLD_IMAGE_CHECK=PASS
US_PHONE_HTML_CHECK=PASS
FORBIDDEN_TERMS_HTML_CHECK=PASS
```

El check mantuvo 0 errores, 0 warnings y 75 hints del proyecto. El build terminó correctamente con las advertencias conocidas de import dinámico (`astro:content`) y certificado TLS durante la consulta de `Request.cf`. La QA visual en viewport móvil/escritorio y la revisión final de publicación siguen pendientes.

La decisión de delivery Cloudflare está separada en [cloudflare-image-delivery-decision-2026-09-09.md](cloudflare-image-delivery-decision-2026-09-09.md): **`public/` versionado para el piloto; R2 + Images Transformations cuando el cluster tenga volumen; Images Hosted como alternativa gestionada**. Hoy `wrangler.toml` no tiene R2 ni Images binding.

No se autoriza generación adicional de imágenes, descarga de assets, cambios adicionales de infraestructura, build de producción, commit, push o publicación. El schema/layout recibieron únicamente el soporte opcional descrito en este plan; no se modificaron rutas, dependencias ni la página dinámica.
