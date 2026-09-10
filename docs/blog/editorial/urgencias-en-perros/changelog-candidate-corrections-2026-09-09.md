# Correcciones trazables del candidato — `urgencias-en-perros`

Fecha: **2026-09-09**  
Base: `c02b65f56bae6562b9b15373b80ed437b4df8d90`

## Contrato de H2

No se modifican `brief-v2.md` ni `brief-v3.md`. La inconsistencia se resuelve documentalmente para este candidato:

- §3 de `brief-v2.md` enumera siete elementos del outline.
- El elemento 1 es un **callout inicial de decisión**, y el propio brief dice que no es un H2.
- Los elementos 2–7 son los seis H2 editoriales del candidato: `Señales para salir ya`, `Qué hacer mientras organizás el traslado`, `Qué llevar y qué no hacer`, `Qué esperar al llegar`, `Confirmaciones locales antes de salir` y `Fuentes consultadas`.
- La frase histórica de aceptación que llama «siete títulos» a esos elementos se interpreta como siete bloques del outline, no como siete etiquetas H2.

El candidato conserva, por tanto, un callout inicial más seis H2. Esta corrección no cambia los documentos históricos ni agrega un H2 artificial para satisfacer un conteo ambiguo.

## Correcciones de revisión independiente

- `Posible intoxicación` quedó limitado a sospecha de ingestión, porque la cita inline de ASPCA usada por el candidato respalda ese alcance.
- `Encías azuladas o grisáceas` se redujo a `encías azuladas`.
- Las convulsiones se acotaron a activas, continuas o repetidas, sin introducir umbral temporal.
- Se eliminó el consejo de triage sin mapeo y se sustituyó por acciones citadas por Cornell.
- Se eliminó la frase amplia sobre administrar sustancias.
- El CTA usa el copy `Buscá ayuda veterinaria ahora` y enlaza al destino real del flujo SOS: `https://vet24cr.com/?sos=true#directorio`. El repositorio confirma que `FiltrosDashboard` activa el flujo cuando la URL contiene `sos=true`.
