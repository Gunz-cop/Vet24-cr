# Reauditoría independiente B4 — corrección 1

Fecha: 2026-09-08
SHA auditado: `13a74591098343438973ab7e85e00e3dcf263621`
SHA anteriormente rechazado: `dab96fd36d7056d9700642ba4afa51cbfe79111b`
BASE contractual: `f9f2eccff6d2acc494ccbc9f74b7fefeb7878ec0`
Rama auditada: `origin/codex/blog-b4-seed`
Firma: **Equipo de Vet24cr**

## Veredicto

**APROBADO para la auditoría editorial y técnica predeploy del SHA exacto `13a74591098343438973ab7e85e00e3dcf263621`.**

Los cuatro hallazgos bloqueantes de la auditoría anterior quedaron resueltos y no se encontraron bloqueantes nuevos. Este veredicto satisface la revisión independiente del candidato, pero **no declara B4 cerrada ni aprobada en producción**. Siguen pendientes la autorización humana del HEAD final, el merge, la correspondencia entre SHA y deployment y toda la comprobación productiva posterior exigida por §7.

No se hizo merge ni despliegue.

## Resolución independiente de los hallazgos anteriores

### 1. Cinco filas con fuentes sustitutas

Las cuatro páginas oficiales respondieron HTTP 200 y sus pasajes sostienen las cinco filas:

| Filas | Fuente y pasaje comprobado | Conclusión |
|---|---|---|
| P7 y G7 | [ASPCA Animal Poison Control Center](https://www.aspca.org/news/what-do-if-your-pet-poisoned): “Gather the Evidence” pide conservar empaques o pastillas; el artículo manda llamar inmediatamente al APCC o a la veterinaria local y aconseja no tomar medidas ni dar nada antes de hablar con un profesional. | Las redacciones de perros y gatos permanecen dentro de ese alcance. |
| E2 | [University of Illinois College of Veterinary Medicine](https://vetmed.illinois.edu/pet-health-columns/pain-exotic-pets/): “Choose a Knowledgeable Veterinarian” recomienda encontrar con anticipación una veterinaria familiarizada con la especie, antes de una situación que requiera atención. | La afirmación y la cita son exactas. |
| E6 | [Merck Veterinary Manual](https://www.merckvetmanual.com/exotic-and-laboratory-animals/reptiles/management-and-husbandry-of-reptiles): exige identificar la especie, obtener información de manejo clínicamente relevante y documenta recinto, temperatura, humedad, iluminación y dieta. | La matriz y el artículo no exceden el pasaje. |
| C7 | [University of Florida Veterinary Hospitals](https://hospitals.vetmed.ufl.edu/pay/): el estimado solo se entrega después del examen; una admisión, incluidas emergencias, requiere depósito; además enumera medios de pago. | El artículo lo presenta como ejemplo extranjero y no como precio o política costarricense. |

Todas las instituciones son fuentes elegibles bajo §5: centro de toxicología animal de una organización reconocida, facultades/hospitales veterinarios universitarios y manual veterinario identificable.

### 2. E7 corregida

Briefing, matriz y artículo dicen ahora “mascotas exóticas”. La redacción añade correctamente que esa categoría no confirma especies concretas. La página de Hospital Veterinario Santamaría respalda exactamente atención a mascotas exóticas, disponibilidad sujeta a confirmación y llamada previa para emergencias; ya no se le atribuyen reptiles ni aves.

### 3. Controles negativos

El verificador mantiene una lista explícita de las tres URLs AVMA retiradas. Una fixture que reintrodujo `ChoosingaVet_2016.pdf` produjo exit 1 y cuatro diagnósticos: fuente retirada, cita ausente, briefing desalineado y matriz desalineada.

Una segunda fixture agregó temporalmente `docs/blog/evidencia/b4/fixture-ejecutable.mjs`; el verificador produjo exit 1 con “evidencia B4 contiene código ejecutable”. Ambas fixtures se retiraron, el worktree volvió a limpio y el verificador pasó otra vez.

### 4. Ausencia de código ejecutable en evidencia

`git ls-files 'docs/blog/evidencia/b4/**'` filtrado por `.mjs`, `.js`, `.cjs` y `.ts` devuelve cero rutas. Los tres scripts observados en el candidato rechazado fueron eliminados.

### 5. Cita de Medical Pets

La afirmación “Medical Pets publica una sede abierta 24 horas en Cartago” lleva ahora el enlace de la página de contacto en la misma oración. La fuente oficial muestra Cartago y Curridabat con horario de 24 horas.

## Revisión editorial restante

- Los cinco artículos siguen firmados por `Equipo de Vet24cr`, sin `revisadoPor` y con aviso de que la información no sustituye consulta veterinaria.
- Hay exactamente cinco artículos, todos `publicado`, sin borradores.
- Los briefings y matrices archivadas son copias exactas de sus fuentes de trabajo; el verificador falla si divergen.
- No se introducen tarifas costarricenses inventadas ni se generalizan políticas extranjeras.
- Los enlaces tipados e inversos pasan; el verificador contó 199 enlaces internos y 36 externos.

## Resultados técnicos

| Control | Resultado |
|---|---|
| Identidad y ancestría | `origin/codex/blog-b4-seed` = SHA auditado; desciende del rechazado |
| `npm run check` | 0 errores; 75 hints heredados |
| `npm run test:unit` | 78/78 |
| `npm run build:no-shorten` | exit 0 |
| `node scripts/verification/blog.mjs` | exit 0; 5 publicados, 139 HTML |
| Catálogo AR2 | exit 0; 112 clínicas y 112 rutas |
| Mirrors AR3 | exit 0; 127 mirrors |
| Suite E2E serial | exit 0; 99 pases, 11 skips heredados, 0 fallos |
| Specs B4 seriales | 19/19 |
| Sitemap/canonical/Article JSON-LD | 5/5 |
| Autor JSON-LD | `Organization`, `Equipo de Vet24cr`, 5/5 |
| Borradores | 0 |
| Código ejecutable en evidencia | 0 |
| Diff BASE…SHA | 187 rutas y 25 511 líneas revisadas; dentro del alcance B4 |

El build conserva el warning TLS histórico al obtener `Request.cf` y usa el fallback documentado; termina con exit 0. Los 11 skips de Playwright ya existían y no aumentaron.

## Estado productivo

La producción no fue modificada durante esta auditoría. Para cerrar B4 todavía se debe:

1. Obtener autorización humana del HEAD final exacto.
2. Fusionar y desplegar por el flujo autorizado.
3. Demostrar que el deployment sirve el SHA autorizado.
4. Repetir HTTP, sitemap, catálogo, mirrors, negociación Markdown, cabeceras, controles visuales y comparación de los 22 checks contra la base B4.
5. No cerrar B4 ante ninguna regresión o evidencia productiva faltante.

Firma: **Equipo de Vet24cr**
