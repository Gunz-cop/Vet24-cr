# Manifest editorial del hero — `hero-traslado-seguro`

Fecha de registro editorial: **2026-09-09**  
Base local: `c02b65f56bae6562b9b15373b80ed437b4df8d90`  
Estado: **integrado; pendiente de revisión independiente visual/HTML**

## Procedencia

- Tipo: imagen ilustrativa sintética fotorrealista.
- Procedencia declarada: **OpenAI Media Service API**.
- Fuente original conservada fuera de `public/`: `assets/hero-traslado-seguro-source.png`.
- Metadata C2PA detectada en el PNG fuente mediante inspección binaria: `claim_generator_info` con `OpenAI Media Service API`, `digitalSourceType=trainedAlgorithmicMedia`, spec C2PA 2.2 y timestamp de creación `2026-09-10T00:00:00Z`.
- ID C2PA observado: `urn:c2pa:7296819a-ad14-4a5a-af39-15b6d691d210`.
- La hora C2PA está en UTC; la fecha de registro editorial usa la fecha local de la sesión. No se presenta la imagen como fotografía documental.
- Licencia/uso: asset generado para este proyecto; conservar el archivo fuente y su manifest C2PA junto al expediente editorial.

## Prompt/brief resumido

Escena 16:9 de una persona cuidadora preparando con calma el traslado de un perro estable, con luz cálida natural, vínculo respetuoso y preocupación contenida. Entorno doméstico de salida, sin clínica identificable. Composición con zona segura para recortes 1:1, 4:5, 1.91:1 y móvil; sin sangre, heridas, vómito, sufrimiento visible, encías azules, colapso, procedimientos, medicación, logos, teléfonos, texto incrustado, caso real ni promesa de disponibilidad.

## Archivos y hashes SHA-256

| Uso | Ruta | Formato | Dimensiones | SHA-256 |
|---|---|---|---:|---|
| Fuente C2PA, fuera de publicación | `docs/blog/editorial/urgencias-en-perros/assets/hero-traslado-seguro-source.png` | PNG | 1672×941 | `8ACE18860A58DD1EE6C5F88793CF26361BDA2F4321051425D1A33000861F44E2` |
| `srcset` 640w | `public/images/blog/urgencias-en-perros/hero-traslado-seguro-640.webp` | WebP | 640×360 | `36803E26ED8C306C70F5A0AAD268F858DA97C8369FFE5DFD5096D00BAD3D74CB` |
| `srcset` 1280w | `public/images/blog/urgencias-en-perros/hero-traslado-seguro-1280.webp` | WebP | 1280×720 | `99F3CA2D805E596810E30EBFE17B34127063BCE8B6FB6C5A88961ABC384B6ECB` |
| `src` fallback y `srcset` 1600w | `public/images/blog/urgencias-en-perros/hero-traslado-seguro-1600.webp` | WebP | 1600×900 | `B7A4DDDA20A69508E6FEDE20674270BD5500ADCDDF2E87AD63CAFA6890BEA84D` |

El máximo público real es 1600×900. La fuente 1672×941 conserva aproximadamente la misma relación 16:9; no se añadió una variante 1920w.

## Recorte, alt y disclosure

- Recorte: se conserva la relación 16:9; persona, perro y transportín permanecen dentro de la zona segura central. Las variantes WebP fueron inspeccionadas por dimensiones y el hero 1600w fue revisado visualmente.
- Alt: `Persona cuidadora preparando con calma el traslado de un perro.`
- Caption visible: `Imagen ilustrativa sintética: una persona prepara con calma el traslado de un perro. No representa un caso real ni una clínica específica.`
- El alt no diagnostica, no afirma disponibilidad, no incluye keywords, no menciona la herramienta y no sustituye el contenido clínico.
- La caption/disclosure evita una falsa impresión de fotografía documental o experiencia de Vet24.

## Assets de apoyo añadidos el 2026-09-10

Se generaron dos imágenes de apoyo con el mismo criterio visual del hero. Las fuentes PNG con C2PA se conservan fuera de `public/`; las copias públicas son WebP responsive y no contienen texto legible, teléfonos, logos ni datos personales.

| Uso | Fuente fuera de publicación | Variante pública | Dimensiones | SHA-256 |
|---|---|---|---:|---|
| Traslado seguro | `assets/transport-safe-source.png` | `public/images/blog/urgencias-en-perros/transport-safe-640.webp` | 640×360 | `5E607E6A6C8F817CAE1BF475CD6665048AAF534AD5B4270FDD601CA12236971D` |
| Traslado seguro | `assets/transport-safe-source.png` | `public/images/blog/urgencias-en-perros/transport-safe-1280.webp` | 1280×720 | `39F5F9B5EB6BCCE1693180DEFAB7FD7D029CD537582C38BEEC48AB0B100CD765` |
| Preparación de información | `assets/information-prep-source.png` | `public/images/blog/urgencias-en-perros/information-prep-640.webp` | 640×360 | `F580D28306041830828BD26ACFA1D08207F8F69DA7B1D29C4FCF435CC045093E` |
| Preparación de información | `assets/information-prep-source.png` | `public/images/blog/urgencias-en-perros/information-prep-1280.webp` | 1280×720 | `C7C8A9BD5003FB0D6A5C2CA2F471A4417597B01BAB5EE400AF4A7E9FED1E6B0C` |

Ambas fuentes originales miden 1672×941 y proceden de OpenAI Media Service API; sus hashes son `66785930348660E920CB1A07C29F8A376EA3AA0CA8CFB5879EDAAE972CC46704` y `9221BBA1D7E7753563FC9CA033B477EA6C6ADA8A38A3FFBBC12BA35944C4B054`, respectivamente. Alt y disclosure visibles se mantienen en el Markdown junto a cada figura. Se sirven con `loading="lazy"` porque aparecen después del contenido LCP.

## Gate de aceptación pendiente

- [x] Fuente fuera de `public/`.
- [x] Variantes WebP y dimensiones registradas.
- [x] Hashes verificados en el worktree.
- [x] C2PA/OpenAI Media Service detectado en la fuente.
- [x] Alt y disclosure definidos en frontmatter/render.
- [ ] Auditoría independiente de contenido negativo: sangre, heridas, vómito, sufrimiento, encías azules, colapso, procedimientos, medicación, logos, teléfonos, texto, clínica o caso real.
- [ ] Verificación visual 390×844 y 1440×900 del recorte y del primer viewport.
- [ ] Verificación final del HTML, `srcset`, OG/Twitter, JSON-LD, `width`/`height`, `loading` y ausencia de teléfonos estadounidenses.

Este manifest no autoriza publicación, commit, push ni deployment.
