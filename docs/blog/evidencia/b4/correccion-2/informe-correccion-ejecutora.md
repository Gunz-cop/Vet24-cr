# Corrección ejecutora B4 — segunda ronda

Fecha: 2026-09-08  
SHA revisado: `13a74591098343438973ab7e85e00e3dcf263621`  
Estado: **pendiente de nuevo SHA y reauditoría independiente**

## B4-2: autoría JSON-LD

- `docs/blog/autoria.md` registra tanto la firma pública como el tipo JSON-LD: `Organization`.
- `blog.mjs` usa `publicAuthor` en vez de repetir `Equipo de Vet24cr` en el control de frontmatter.
- El verificador exige `articleJsonLd.author.name === article.data.autor` y `articleJsonLd.author['@type'] === publicAuthorType`.
- El registro de atribución vuelve a ser la fuente contractual única del nombre y del tipo esperado.

## N-1: matrices independientes

Los cinco archivos de `docs/blog/evidencia/b4/matrices/` ya no son copias de briefs. Cada uno contiene únicamente identidad, fecha y la matriz afirmación → fuente → pasaje → H2. El verificador extrae la tabla de la sección matriz del briefing y exige igualdad con la tabla del artefacto independiente, además de mínimo seis filas e identidad correcta.

## N-2: URLs AVMA

El control se denomina ahora `disallowedSourceUrls` y el error dice “fuente no admitida por auditoría B4”. No afirma que los tres endpoints estén permanentemente inaccesibles: dos devolvieron errores consistentes y el PDF de primeros auxilios mostró disponibilidad variable entre auditorías. Los tres permanecen fuera de este candidato porque fueron sustituidos por fuentes estables y verificadas. La comprobación busca cada URL tanto en la tabla del briefing como en todo el cuerpo del artículo.

No se declara B4 aprobada. Falta reauditoría independiente del nuevo SHA y verificación productiva posterior a un eventual merge/despliegue autorizado.

## Validaciones repetidas

| Control | Resultado |
|---|---|
| `npm run check` | código 0 |
| `npm test` | código 0; 78/78 |
| `npm run build:no-shorten` | código 0 |
| `node scripts/verification/blog.mjs` | código 0; incluye los controles nuevos de autoría y matrices |
| Specs B4 seriales | código 0; 19/19 |
| `git diff --check` | código 0 después de normalizar los archivos de matrices |

La suite completa serial de la ronda anterior permanece aplicable porque esta ronda solo cambia documentación/evidencia y el verificador manual; los 19 specs B4 se repitieron de todos modos sobre el árbol corregido.

Firma: **Equipo de Vet24cr**
