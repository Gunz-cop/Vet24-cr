# Auditoría cruzada con varias IAs

El escáner mide si publicás los archivos correctos. **No mide si un agente real
encuentra, recupera y entiende tu sitio.** Para eso hay que preguntárselo a
varios agentes, en producción, y leer sus respuestas con criterio.

En FuenteAI se hizo con cinco: ChatGPT, Claude, DeepSeek, Qwen y Gemini. Las
cinco concluyeron que no hay impedimento técnico. Pero **tres de las cinco
reportaron fallos que no existían**, y separarlos fue la mitad del valor del
ejercicio.

## Cómo se hace

1. Esperá a tener el sitio **en producción**. Estas herramientas auditan el
   dominio real; un preview no sirve para el índice de búsqueda.
2. Abrí una conversación nueva con cada IA, sin contexto previo del proyecto.
3. Pegá el prompt de `../templates/prompt-auditoria.md`, cambiando el dominio.
4. Guardá las respuestas enteras. La parte útil no es el veredicto: es la
   evidencia que cada una aporta.

Usá al menos tres, y que no compartan infraestructura de búsqueda. Con dos no se
distingue un fallo real de una limitación compartida.

## Cómo leer los resultados

Esta es la parte que importa. **Una IA que dice "tu sitio no tiene X" está
diciendo dos cosas distintas a la vez**, y hay que separarlas:

- «Pedí X y el servidor no me lo dio» → hallazgo, verificable.
- «Mi herramienta no pudo mirar X» → limitación de su entorno, no de tu sitio.

Las IAs no siempre distinguen las dos, y las que no lo hacen producen falsos
positivos con mucha seguridad.

**Verificá cada hallazgo con `curl` antes de tocar código.** Sin excepción.

### Los falsos positivos que aparecieron, y su causa

| Reporte | Realidad | Causa |
|---|---|---|
| «No hay JSON-LD» (dos IAs) | Hay `SoftwareApplication`, `FAQPage`, `BreadcrumbList`, `Offer`, `Organization` | Su extractor convierte la página a texto y descarta `<script>` |
| «`sitemap-index.xml` da error de conexión» | HTTP 200, XML válido | Restricción de navegación de su herramienta |
| «`robots.txt` inaccesible» | HTTP 200 | ídem |
| «`lastmod` único para todo el sitio» | Fechas granulares por URL | Leyeron el índice, no el sitemap hijo |

Ninguno era un fallo del sitio. Si se hubieran creído, el trabajo derivado
habría sido añadir JSON-LD que ya existía y "arreglar" un sitemap que
funcionaba.

### Los hallazgos que sí eran reales

Los que **varias IAs independientes** reportaron y `curl` confirmó:

- `/sitemap.xml` devolvía 404 (solo existía `sitemap-index.xml`). Tres de cinco
  tropezaron con esto. Un 301 lo resuelve.
- `og:image` genérica en todas las fichas.

Regla práctica: **un hallazgo que aparece en una sola IA y no se reproduce con
`curl` es de su herramienta; uno que aparece en tres y se reproduce, es tuyo.**

## Lo que esta auditoría sí demuestra, y lo que no

Las cinco respuestas coincidieron en distinguir dos planos, y conviene
mantenerlos separados al informar:

**Demuestra** — accesibilidad y comprensión: que los agentes encuentran el
dominio, recuperan el HTML sin bloqueos, siguen los enlaces internos y extraen
la entidad correcta con su fuente oficial. Eso es lo que controlás.

**No demuestra** — que te vayan a citar. La selección depende de ranking,
autoridad comparativa y de la query concreta. Nada de eso es auditable desde
fuera y ninguna IA puede prometerlo.

Y una advertencia que dieron dos de ellas, que vale la pena escuchar: para una
pregunta como *"¿cómo descargo X?"*, el sistema preferirá la fuente primaria —el
sitio del propio fabricante— salvo que tu página aporte **síntesis, curación o
verificación** que la fuente original no tiene. La preparación técnica te hace
elegible; lo que te hace citable es el trabajo editorial.

## Valor secundario: los huecos que revela

Varias IAs señalaron que no existía documentación oficial de su plataforma sobre
Content Signals, ARD o Agentmap. Es información útil: dice qué estándares están
adoptados hoy y cuáles son una apuesta. No invalida publicarlos, pero sí cambia
las expectativas de plazo.
