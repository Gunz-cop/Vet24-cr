# Validación del candidato editorial — `urgencias-en-perros`

Fecha: **2026-09-09**  
Base local: `c02b65f56bae6562b9b15373b80ed437b4df8d90`  
Candidato: `src/content/blog/urgencias-en-perros.md`  
Estado: **candidato editorial; no aprobado para publicación**

## Cambios cubiertos

- Apertura visible con límite clínico, cinco grupos de señales, llamada/traslado y CTA local.
- H2 reconciliados con el brief v3: `Señales para salir ya`, `Qué hacer mientras organizás el traslado`, `Qué llevar y qué no hacer`, `Qué esperar al llegar`, `Confirmaciones locales antes de salir` y `Fuentes consultadas`.
- Fuentes AAHA retiradas del candidato; se usan Cornell, Merck, ASPCA y AVMA dentro del alcance del dossier.
- Firma conservada como `Equipo de Vet24cr`; no se añadió `revisadoPor`, caso real ni revisión profesional identificada.
- AVMA limitado a llamada al hospital local, preparación del traslado, reducción de movimiento, distancia de la boca y solicitud de ayuda.
- C5 conserva el matiz Merck + ASPCA: no inducir el vómito ni dar remedios por cuenta propia; consultar primero; Merck no se convierte en una prohibición absoluta.
- El claim de intoxicación se limita a ingestión; el de encías usa solo azuladas; las convulsiones quedan acotadas a activas, continuas o repetidas.
- El CTA usa `Buscá ayuda veterinaria ahora` y apunta al flujo SOS real del directorio (`https://vet24cr.com/?sos=true#directorio`), cuyo código activa el modo SOS mediante el parámetro `sos=true`.
- La discrepancia histórica entre siete bloques del outline y seis H2 más un callout queda documentada en `changelog-candidate-corrections-2026-09-09.md`.
- No se crearon imágenes binarias ni se alteraron rutas, schema, layout, componentes, configuración, CI, dependencias, sitemap o catálogo.

## Preflight semántico y de localización

Comando ejecutado en PowerShell:

```powershell
$candidate = Get-Content -Raw 'src/content/blog/urgencias-en-perros.md'
$required = @('## Señales para salir ya','## Qué hacer mientras organizás el traslado','## Qué llevar y qué no hacer','## Qué esperar al llegar','## Confirmaciones locales antes de salir','## Fuentes consultadas')
foreach ($heading in $required) { if (-not $candidate.Contains($heading)) { throw "Falta H2: $heading" } }
$forbidden = '(?i)(AAHA|revisadoPor|APCC|Poison Control|RCP|compresiones|respiración de rescate|Heimlich|enfriamiento|\bdosis\b|1-800|1-888|1-877|1-866|1-855|1-844|1-833|1-822|national poison control)'
if ($candidate -match $forbidden) { throw 'SEMANTIC_CHECK=FAIL: aparece contenido fuera de alcance' }
$phone = '(?<!\d)(?:\+?1[ -.])?(?:\(?\d{3}\)?[ .-])\d{3}[ .-]\d{4}(?!\d)'
if ($candidate -match $phone) { throw 'PHONE_CHECK=FAIL' }
if ($candidate -notmatch 'Equipo de Vet24cr') { throw 'AUTHOR_CHECK=FAIL' }
if ($candidate -match 'revisad[oa] por|caso real|experiencia clínica') { throw 'EEAT_CHECK=FAIL' }
```

Resultado tras las correcciones:

```text
SEMANTIC_CHECK=PASS
PHONE_CHECK=PASS
EEAT_CHECK=PASS
```

Este control cubre el Markdown candidato. No valida HTML generado, metadatos renderizados, JSON-LD final, Open Graph ni texto dentro de imágenes porque el build no llegó a ejecutarse y todavía no hay hero, imágenes ni assets editoriales.

## Check y build

Comandos intentados:

```text
npm run check
npm run build:no-shorten
```

Ambos quedaron **BLOQUEADOS POR ENTORNO** antes de analizar el contenido:

```text
'astro' is not recognized as an internal or external command,
operable program or batch file.
```

El worktree no tiene dependencias instaladas (`astro` no está disponible). No se ejecutó `npm install`/`npm ci` para evitar modificar el entorno fuera del alcance solicitado. `npm run build:no-shorten` se eligió para no invocar el script de acortamiento de enlaces ni arriesgar cambios en caché.

## Addendum de validación — 2026-09-10

Después de instalar las dependencias en este worktree de trabajo, el candidato se verificó sin cambiar manifests:

```text
npm run check=PASS (0 errores, 0 warnings, 75 hints)
npm run build:no-shorten=PASS
ARTICLE_HTML_CHECK=PASS (hero, 2 imágenes de apoyo, metadatos, JSON-LD y CTA)
SUPPORT_IMAGES_HTML_CHECK=PASS (WebP responsive, alt, captions, dimensiones y lazy loading)
US_PHONE_HTML_CHECK=PASS
FORBIDDEN_TERMS_HTML_CHECK=PASS
git diff --check=PASS
```

La vista local quedó disponible en `http://127.0.0.1:4321/blog/guias-por-especie/urgencias-en-perros/`. La revisión móvil manual, la aceptación final de assets, los gates SERP y la correspondencia deployment–SHA siguen pendientes; no se hizo commit, push ni deploy.

## Estado de aprobación

- Redacción candidata: **completada para revisión editorial**.
- Preflight Markdown: **PASS**.
- Check Astro/TypeScript: **pendiente por dependencias ausentes**.
- Build Astro: **pendiente por dependencias ausentes**.
- Auditoría independiente de claims, render, metadatos y assets: **pendiente**.
- Publicación, commit, push y deployment: **no realizados**.
