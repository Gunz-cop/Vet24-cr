# Enlazado interno del blog

Fuente única: `src/data/internal-links.ts`. Claves `pilar/slug`; sin relaciones en frontmatter. `PILAR_NAMES` reexporta los nombres de B1, cuyo archivo propietario no cambia.

| Familia | Identidad y validación | URL |
|---|---|---|
| Clínica | `data.slug`, nunca `entry.id` | `/clinica/{slug}/` |
| Zona | `priorityZones[].slug`, sin aliases y con artefacto | `/zona/{zona}/` |
| Provincia | mapa de la página actual y artefacto | `/provincia/{provincia}/` |
| Artículo | `pilar/slug` publicado y artefacto | `/blog/{pilar}/{slug}/` |

El piloto tiene tres clínicas (HEMS, Hospital Vet Medical Care, Gocha), dos zonas (San Pablo de Heredia, Guápiles) y dos provincias (Heredia, Limón). La relación cruzada a atención 24h por zona queda inactiva hasta que exista y esté publicado ese artículo. Sólo el piloto existe en la colección; los otros cuatro temas se crean en B4.

`directoryLinks` filtra publicados. `relatedGuides` invierte las mismas listas de clínica/zona; no hay listas inversas manuales ni bloque inverso de provincia. `crossPillarLinks` exige extremos publicados y pilares distintos. Una lista vacía no produce markup. En clínica el bloque sigue al contenedor completo detalle/contacto; en zona sigue a la sección de filtros/mapa/listado.

`node scripts/verification/blog.mjs` requiere build y preview local (`npm run preview`, `PLAYWRIGHT_BASE_URL` opcional). Inspecciona `dist/client` y `dist/server` por separado. Valida familia, identidad, URL completa, artefacto, catálogo e inversos; resuelve href internos y fragmentos y clasifica externos/tel/mailto aparte. La portada SSR se valida contra manifiesto generado y respuesta HTTP/canonical local. Extrae zonas/provincias de las fuentes actuales además de exigir artefactos.

Los borradores no producen rutas, enlaces ni sitemap en `dist/client`. Las ocurrencias en `dist/server` se reportan separadamente; sólo el marcador preparatorio heredado está permitido por §4. Un borrador editorial distinto del marcador identificado en el bundle provoca fallo.

Los unitarios cubren mutaciones de identidad, familia, publicación, URL y destino/inverso eliminado. El E2E activa contactos con Enter y navegación interceptada, registra ausencias y recorre Tab. La comparación local usa `B2_BASE_GEOMETRY=docs/blog/evidencia/b2/base-loaded-geometry.json`; `B2_PUBLISHED_FIXTURE=1` exige bloques activos en fixture aislada; `B2_EVIDENCE_DIR` guarda medidas y capturas. E2E ordinario exige ausencia en el candidato borrador.
