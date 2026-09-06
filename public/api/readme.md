# API pública de Vet24-cr

`GET https://vet24cr.com/api/catalog.json` devuelve el catálogo completo de clínicas publicado por Vet24-cr.

## Forma del documento

- `schemaVersion`: versión del contrato (`"1"`).
- `timeZone`: `America/Costa_Rica`.
- `clinics`: todas las fichas que también tienen una ruta HTML `/clinica/<slug>/`, ordenadas por `slug`.
- `url`: URL canónica absoluta de la ficha HTML.
- `provinciaSlug` y `zonaSlug`: slugs calculados con las reglas del sitio.
- `openNow`: siempre `null`; este catálogo no informa disponibilidad en tiempo real.
- `latitude` y `longitude`: ambas `null` si falta una coordenada, no es válida o la pareja es `0/0`.
- Campos de contacto: el valor registrado o `null` si está vacío; no todos son URLs validadas.
- `copyDiferenciador`, `bodyMarkdown` y `verification_notes`: se conservan íntegramente, incluidas restricciones de especie, horario o reserva.
- `capacidades`: cada capacidad tiene `valorRegistrado` y `estado`; `afirmado` significa que el booleano está registrado como verdadero, mientras `no-confirmado` no significa que el servicio no exista.
- `advertencias`: límites de interpretación que acompañan cada ficha.

El catálogo es anónimo, estático y de solo lectura. No ofrece filtros, paginación, búsquedas HTTP ni una certificación de horarios. Descarga el JSON y filtra localmente; confirma por teléfono antes de trasladarte.

## Ejemplos de consultas locales

Emergencias registradas en Heredia:

```js
const catalog = await fetch('https://vet24cr.com/api/catalog.json').then((r) => r.json());
const opciones = catalog.clinics.filter(
  (clinic) => clinic.provinciaSlug === 'heredia' && clinic.capacidades.emergencias24h.estado === 'afirmado',
);
```

Clínicas de una zona para confirmar si están abiertas:

```js
const catalog = await fetch('https://vet24cr.com/api/catalog.json').then((r) => r.json());
const opciones = catalog.clinics.filter((clinic) => clinic.zonaSlug === 'guapiles');
// Usa horarioTexto y contacto; openNow es null y se debe confirmar por teléfono.
```

## Documentación

- OpenAPI: https://vet24cr.com/api/openapi.json
- API Catalog: https://vet24cr.com/.well-known/api-catalog
- Índice breve para agentes: https://vet24cr.com/llms.txt
