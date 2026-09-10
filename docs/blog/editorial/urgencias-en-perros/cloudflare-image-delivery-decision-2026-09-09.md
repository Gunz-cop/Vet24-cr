# Decisión técnica de delivery de imágenes — `urgencias-en-perros`

Fecha: **2026-09-09**  
Base local: `c02b65f56bae6562b9b15373b80ed437b4df8d90`  
Estado: **decisión documentada; no crear recursos ni cambiar configuración**

## Estado actual del proyecto

`wrangler.toml` contiene:

- Worker `vet24-cr` con `src/worker.ts`;
- Static Assets desde `./dist` con binding `ASSETS`;
- bindings D1, KV y Send Email.

No contiene `[[r2_buckets]]`, un binding de R2, configuración de Cloudflare Images ni una transformación de imágenes. Tampoco existe hoy un bucket R2, un custom domain de assets o un recurso Cloudflare Images creado para este proyecto. La imagen disponible sigue siendo el fallback local `public/images/og-share-default.png`.

La documentación oficial de [Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/) muestra que un bucket R2 se declara explícitamente mediante `r2_buckets`; esa sección no existe en el archivo actual.

## Requisitos comunes de cualquier opción

El manifest editorial debe conservar:

- `src` fallback estable;
- `srcset` o URLs transformadas para **640, 1280 y 1920 px** como propuesta inicial;
- `sizes` coherente con el layout;
- `width` y `height` para evitar layout shift;
- `alt` funcional y breve;
- hash SHA-256, procedencia, licencia/disclosure, fecha y revisión negativa;
- IPTC/XMP y Content Credentials/C2PA cuando la herramienta los produzca.

El HTML debe conservar un `<img>` real, `src` como fallback y formatos optimizados mediante `format=auto`/WebP cuando el delivery lo permita. El fallback no se elimina: debe seguir funcionando si la transformación, CDN o variante falla.

[Cloudflare Images recomienda imágenes responsive y puede usar `width=auto` para elegir el ancho apropiado sin almacenar manualmente cada copia](https://developers.cloudflare.com/images/optimization/make-responsive-images/). [Google Search Central también recomienda `<img>` HTML, responsive images, optimización de peso, nombres descriptivos, una imagen representativa y `og:image`/structured data coherentes](https://developers.google.com/search/docs/appearance/google-images).

## Comparación de opciones

| Opción | Almacenamiento y delivery | Responsive | Ventajas | Riesgos/coste operativo | Encaje |
|---|---|---|---|---|---|
| **A. `public/` versionado + variantes WebP** | Archivos dentro del build y Static Assets existentes | Copias manuales 640/1280/1920, `srcset`, `sizes`, fallback local | Cero recursos nuevos, máxima auditabilidad, hash en Git, despliegue junto al SHA | Hay que producir y mantener variantes; más peso/versiones en el repositorio; sin transformación bajo demanda | **Piloto recomendado** |
| **B. R2 + custom domain + Images Transformations** | Originales en R2; delivery por custom domain; transformaciones en edge | URLs con `width=640/1280/1920`, `format=auto` o `width=auto`; `src` original como fallback | No obliga a guardar manualmente todas las copias; caché en edge; control de bucket/origen; pipeline escalable | Bucket público por custom domain; configuración DNS/cache/WAF; invalidación y consistencia de caché; billing R2 + Images Transformations; binding/configuración nueva | **Migración cuando el cluster tenga volumen** |
| **C. Cloudflare Images Hosted** | Upload directo a Images; storage, optimización y delivery gestionados | Delivery URL/variants administradas; `format=auto` y widths bajo demanda según configuración | Menos infraestructura; entrega global y variantes administradas; no requiere gestionar bucket | Storage y delivery de Images requieren plan/métricas propias; lock-in de IDs/delivery; menos control de origen/retención que R2 | Alternativa si se prioriza operación gestionada |

## Opción A — piloto auditable simple

Ruta propuesta:

```text
public/images/blog/urgencias-en-perros/hero-traslado-seguro.jpg
public/images/blog/urgencias-en-perros/hero-traslado-seguro-640.webp
public/images/blog/urgencias-en-perros/hero-traslado-seguro-1280.webp
public/images/blog/urgencias-en-perros/hero-traslado-seguro-1920.webp
```

El `src` fallback sería el JPG local; `srcset` apuntaría a las variantes WebP. Esta opción es la más fácil de auditar junto con el SHA y no requiere R2, Images, DNS, billing adicional ni cambios de `wrangler.toml`.

Su límite es operativo: cada variante debe conservar el mismo recorte seguro, alt, disclosure y procedencia, y cada cambio requiere una nueva revisión/hash. No hay que elegir esta opción para un cluster grande si el mantenimiento manual empieza a dominar el trabajo editorial.

## Opción B — R2 + custom domain + Transformations

Arquitectura futura:

```text
R2 original -> custom domain de assets -> Cloudflare Images Transformations -> CDN/cache -> <img>
```

Cloudflare describe Images Transformations como una forma de transformar y cachear imágenes desde cualquier origin, incluido R2, sin generar copias manuales para cada breakpoint. [La guía de Transformations](https://developers.cloudflare.com/images/optimization/transformations/overview/) confirma que la respuesta transformada se optimiza en edge y se cachea; [la guía de R2 + Cache](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/) explica que el custom domain permite servir el bucket mediante la caché de Cloudflare.

Propuesta de URLs durante una futura implementación:

```text
src="https://assets.example/urgencias-en-perros/hero-traslado-seguro.jpg"
srcset="
  https://assets.example/cdn-cgi/image/width=640,format=auto/urgencias-en-perros/hero-traslado-seguro.jpg 640w,
  https://assets.example/cdn-cgi/image/width=1280,format=auto/urgencias-en-perros/hero-traslado-seguro.jpg 1280w,
  https://assets.example/cdn-cgi/image/width=1920,format=auto/urgencias-en-perros/hero-traslado-seguro.jpg 1920w
"
sizes="(max-width: 768px) 100vw, 960px"
```

La sintaxis exacta, dominio y política de transformación deben validarse contra la configuración final; este bloque es solo un contrato de diseño, no una URL productiva.

Riesgos que deben quedar explícitos:

- conectar un **custom domain hace público el bucket**; se deben aplicar controles de acceso si el contenido deja de ser público;
- `r2.dev` es un endpoint público de desarrollo, rate-limited y no destinado a producción;
- el custom domain habilita caché, pero el cache miss llega al origin R2 y la invalidación/overwrite puede mantener respuestas antiguas hasta TTL o purge;
- el billing se separa: R2 factura almacenamiento/operaciones y Images factura transformaciones; la [documentación de precios de R2](https://developers.cloudflare.com/r2/pricing/) y la [de Images](https://developers.cloudflare.com/images/pricing/) deben revisarse al activar el producto;
- un binding R2 solo sería necesario si el Worker debe leer/escribir objetos; no debe añadirse por anticipado solo para servir archivos públicos.

[R2 Public Buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/) confirma que los buckets son privados por defecto, que un custom domain expone el contenido y que `r2.dev` es para tráfico no productivo. También advierte que cache/WAF/access controls requieren custom domain.

## Opción C — Cloudflare Images Hosted

Arquitectura futura:

```text
Cloudflare Images Hosted -> delivery domain/variants -> <img>
```

Cloudflare presenta Images Hosted como una solución gestionada para almacenar, optimizar y entregar imágenes, con variantes predefinidas. [La introducción oficial](https://developers.cloudflare.com/images/get-started/introduction/) distingue este modelo del uso de R2 como storage propio: Images Hosted reduce infraestructura; R2 + Images conserva más control del pipeline.

La decisión de coste debe mantenerse separada del código: la [página de precios de Images](https://developers.cloudflare.com/images/pricing/) distingue Images Stored/Delivered para assets alojados de Images Transformed para assets externos como R2. En consecuencia, no se debe asumir que “usar Images” tiene una sola métrica o precio.

Esta opción evita administrar un bucket y su custom domain, pero introduce dependencia de IDs/delivery de Images y requiere confirmar el plan disponible antes de diseñar el manifest definitivo. Es adecuada si el sitio desarrolla un cluster de imágenes considerable y se desea operación gestionada; no aporta suficiente valor para un único hero piloto.

## Recomendación por fases

### Fase 1 — piloto del artículo

Elegir **A: `public/` versionado + variantes WebP**, cuando el asset haya pasado la auditoría editorial. Mantener el fallback local, hashes y manifest junto al contenido. No crear R2, Images binding, custom domain ni transformaciones para resolver un solo hero.

### Fase 2 — cluster con volumen

Reevaluar **B: R2 + Images Transformations** cuando existan suficientes artículos/visuales para justificar un origin común, variantes bajo demanda, cache y pipeline de publicación. La migración debe conservar las URLs canónicas, alt, disclosure, procedencia y fallback durante un periodo de verificación.

### Fase 3 — operación gestionada

Considerar **C: Images Hosted** solo si la prioridad pasa a ser menor mantenimiento operativo, entrega gestionada y variantes administradas, y el coste/lock-in fueron aprobados. No elegirla por anticipado ni mezclarla con R2 sin una decisión de ownership del origin.

## Gate de no ejecución

- [ ] No existe hoy binding R2 ni Images en `wrangler.toml`.
- [ ] No se creó bucket, custom domain, transformación, variante Hosted ni URL productiva.
- [ ] No se cambiaron código, `wrangler.toml`, assets ni dependencias.
- [ ] No se añadieron `width=auto`, `format=auto` o `srcset` productivos; aparecen solo como propuesta.
- [ ] Antes de activar B/C, revisar billing, cache, origin, acceso público, invalidación, observabilidad y rollback.

La decisión actual es **A para el piloto, B como migración recomendada por volumen y C como alternativa gestionada**. No autoriza creación de recursos ni publicación.
