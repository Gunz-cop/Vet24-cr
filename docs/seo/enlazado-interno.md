# Enlazado interno del blog

Fuente única: `src/data/internal-links.ts`. Claves `pilar/slug`; sin relaciones en frontmatter. `PILAR_NAMES` reexporta los nombres de B1, cuyo archivo propietario no cambia.

| Familia | Identidad y validación | URL |
|---|---|---|
| Clínica | `data.slug`, nunca `entry.id` | `/clinica/{slug}/` |
| Zona | `priorityZones[].slug`, sin aliases y con artefacto | `/zona/{zona}/` |
| Provincia | mapa de la página actual y artefacto | `/provincia/{provincia}/` |
| Artículo | `pilar/slug` publicado y artefacto | `/blog/{pilar}/{slug}/` |

El catálogo B4 relaciona los cinco artículos seed con clínicas, zonas y provincias existentes. Los dos artículos de urgencias enlazan a la guía 24 h por zona; esa guía devuelve ambos cruces. El artículo de costos enlaza a urgencias en perros. Las relaciones de clínica y zona generan sus inversos desde esta misma fuente; provincia no tiene bloque inverso por contrato.

`directoryLinks` filtra publicados. `relatedGuides` invierte las mismas listas de clínica/zona; no hay listas inversas manuales ni bloque inverso de provincia. `crossPillarLinks` exige extremos publicados y pilares distintos. Una lista vacía no produce markup. En clínica el bloque sigue al contenedor completo detalle/contacto; en zona sigue a la sección de filtros/mapa/listado.

`node scripts/verification/blog.mjs` requiere build y preview local (`npm run preview`, `PLAYWRIGHT_BASE_URL` opcional). Inspecciona `dist/client` y `dist/server` por separado. Valida familia, identidad, URL completa, artefacto, catálogo e inversos; resuelve href internos y fragmentos y clasifica externos/tel/mailto aparte. La portada SSR se valida contra manifiesto generado y respuesta HTTP/canonical local. Extrae zonas/provincias de las fuentes actuales además de exigir artefactos.

Los borradores no producen rutas, enlaces ni sitemap en `dist/client`. Las ocurrencias en `dist/server` se reportan separadamente; desde B4 no se admite ningún borrador con contenido editorial real. El cierre seed exige exactamente cinco artículos y que todos estén publicados.

Los unitarios cubren mutaciones de identidad, familia, publicación, URL y destino/inverso eliminado. El E2E activa contactos con Enter y navegación interceptada, registra ausencias y recorre Tab. La comparación local usa `B2_BASE_GEOMETRY=docs/blog/evidencia/b2/base-loaded-geometry.json`; `B2_PUBLISHED_FIXTURE=1` exige bloques activos en fixture aislada; `B2_EVIDENCE_DIR` guarda medidas y capturas. E2E ordinario exige ausencia en el candidato borrador.

## Reproducción del verificador manual

Después de `npm run build:no-shorten`, iniciar desde el mismo checkout:

```sh
npm run preview -- --host 127.0.0.1 --port 4321
node scripts/verification/blog.mjs
```

El preview es una precondición para comprobar la portada SSR y sus fragmentos. El log de ejecución debe incluir la salida del comando de preview, además del SHA y de la salida del verificador. `PLAYWRIGHT_BASE_URL` permite indicar otro puerto; se registra el URL usado en la salida. Sin servidor, el control falla con `PREVIEW_UNAVAILABLE`, el comando que debe ejecutarse y la causa de conexión. No se emiten falsos errores de fragmento derivados de no haber recibido la portada. El resultado sigue siendo fallo; no se omite la compuerta SSR.

Los nombres de las anclas se obtienen de `data.nombre` de clínicas, `priorityZones[].nombre` de zonas y `data.provincia` de las fichas, asociada mediante la normalización existente. Las identidades/URLs de provincia siguen contrastándose con la página que las genera. No se transforman slugs en texto visible. Un nombre ausente bloquea la relación activa. La fixture y el verificador contrastan las etiquetas renderizadas con esos nombres reales.

El informe de `dist/server` normaliza sus rutas a `/`; el número de archivos se informa sin exigir un conteo específico de Windows o Linux.
