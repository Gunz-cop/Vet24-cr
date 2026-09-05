# Verificación explícita de consistencia

## Alcance y estado

Se revisan README, las tres specs de fase y los tres cuerpos de issues, contra las fuentes y la línea base real. Esta auditoría es de documentación: no certifica las implementaciones futuras.

La decisión D1 de Content-Signal sigue pendiente del propietario. Es un bloqueo de negocio explícito, no un criterio satisfecho. AR1 y por dependencia AR2/AR3 no deben arrancar hasta cerrarla. Las capas 4/5 siguen como decisiones reservadas por encargo del usuario. No se presenta el plan completo como listo para ejecución mientras D1 esté abierta.

## Pasada adversarial efectivamente realizada

Después de redactar, se volvió a leer **README completo** y, inmediatamente después, **spec AR1 → issue AR1 → spec AR2 → issue AR2 → spec AR3 → issue AR3**, sin saltar al informe de resultados. Se buscó: requisito sin propietario, permiso extra en un issue, umbral de scanner inventado, endpoint inconsistente y aceptación incompatible con la preservación de HTML/datos.

La revisión es de esta sesión documental. No se afirma revisión independiente por otra IA: la independencia exigida en N9 es una compuerta de las futuras implementaciones.

| Hallazgo | Corrección aplicada antes de publicación | Comprobación repetida |
|---|---|---|
| La skill dice 21, pero el servicio devuelve 22 y ap2 excluido | Repetir incluyendo 22; conservar ambos JSON y no inventar puntuación | Parseo, conteos y mensajes de exclusión |
| Las casillas decían escaneo posterior; N2 exige también anterior en cada subfase | Añadir escaneo previo explícito en AR1-02, AR2-06 y AR3-05 en README/spec/issue | Igualdad literal de las tres copias |
| AR2-06 citaba N7 aunque AR2 no implementa negociación | Eliminar esa referencia; N7 sigue cubierto por criterios AR3 | Cobertura inversa de N/D |
| La fase AR3 fijaba política de caché sin requisito explícito en aceptación | Subir private/no-store y ausencia de Cache API a N7 y AR3-03 | Lectura N7 → fase AR3 → casilla AR3-03 |
| La exclusión de mirrors del sitemap podía requerir archivo sin dueño | Autorizar solo filtro de recursos nuevos en astro.config.mjs; propiedad serial AR2→AR3 | Intersección de tres allowlists e instrucciones parciales |
| Riesgo de copiar _headers como solución de portada SSR | AR2 incorpora middleware acotado y prueba portada + ficha; AR3 conserva Link en wrapper | D4, AR2-04, AR3-04/05 |
| Los helpers HTML fuerzan slash en archivos técnicos | Tabla exacta y excepción de api-catalog sin extensión; mantener canonical HTML | AR2-03 y comparación de términos |
| Una copia ingenua del catch de FuenteAI saltaría SSR o consumiría POST | Fallback al adaptador oficial, GET/HEAD solo, pruebas de POST ajeno | N7/N8 y AR3-04 |
| Issue #5 describe hotel false, mientras main ya tiene true | Tratarlo como deuda de alcance, conservar texto de gatos/reserva actual sin reparar contenido | Caso Medical Care en N4 y AR2-02 |
| Timestamp del resumen transcrito incorrectamente | Copiar scannedAt exacto del JSON: 2026-09-05T19:29:43.890Z | Igualdad con evidencia original |
| Redacción de AR3-06 podía leerse como infraestructura “distinta a consultas” | Cada IA responde ambas consultas; independencia entre infraestructuras | Igualdad de casillas y lectura final |

No se deja ninguno de estos defectos como tarea para los ejecutores.

## Trazabilidad de ida y vuelta

La fuente de las 15 casillas está en README. Cada casilla es idéntica en README, spec de fase e issue. El informe mecánico incluye el mapa completo casilla→N/D; esta tabla muestra la cobertura inversa, con ejemplos suficientes para ubicarla.

| Requisito/decisión | Casillas que lo cubren |
|---|---|
| N1 | AR1-01, AR2-03/04, AR3-06 |
| N2 | AR1-02, AR2-06, AR3-05 |
| N3 | AR2-01, AR3-01 |
| N4 | AR2-01/02, AR3-01/06 |
| N5 | AR2-01/02, AR3-01/06 |
| N6 | AR2-03/04/05, AR3-03 |
| N7 | AR3-01/02/03/04 |
| N8 | AR1-03, AR2-04/05, AR3-03/04/05 |
| N9 | AR1-02, AR2-06, AR3-05/06; verificador AR1 además en AR1-03 |
| N10 | AR1-03, AR2-06, AR3-05 |
| D1 | AR1-01; pendiente de elección del propietario, no se marca aceptada |
| D2 | AR2-01/03, AR3-01 |
| D3 | AR2-01/02, AR3-01 |
| D4 | AR2-03/04, AR3-02/04 |
| D5 | AR2-05 |
| D6 | AR1-03, AR2-06, AR3-05 |
| D7 | AR2-06, AR3-06 |
| D8 | AR3-06 documenta no ejecución; la inversión sigue reservada |

Cada obligación detallada de datos/rutas pertenece a N3–N6 y se comprueba por AR2-01/02/03; cada condición de negociación a N7/AR3-01–04. Las decisiones reservadas no se ocultan como “sin cobertura”: su cobertura exige no implementarlas y registrar la disposición, no que haya un servicio nuevo. Hito de nivel superior y citación no tienen casilla porque no son compromisos de producto.

## Propiedad y paralelismo

Se extrajeron las allowlists de cada uno de los tres documentos correspondientes y se compararon exactamente. AR1 no comparte archivos. AR2/AR3 comparten únicamente:
- public/_headers
- astro.config.mjs
- .github/workflows/ci.yml

README asigna ese traspaso serial tras merge/verificación. Las carpetas de evidencia son disjuntas. La lista de implementador excluye los documentos de contrato, de modo que no puede cambiar aceptación mientras implementa.

El diff de esta entrega debe contener solo docs/agent-readiness/**. No se abrió PR, no se ejecutaron los issues ni se modificó producto. Esta comprobación incluye archivos nuevos, no solo git diff de archivos ya seguidos.

## Comprobaciones mecánicas y reproducibilidad

[evidencia/consistencia-local.json](evidencia/consistencia-local.json) registra:
- IDs únicos de las 15 casillas y referencia a N/D existentes.
- Igualdad literal de cada casilla en las tres superficies documentales (normalizando solo CRLF→LF).
- Cobertura de N1–N10 y D1–D8, sin huérfanos.
- Igualdad de allowlists, intersecciones y términos por documento.
- Parseo completo de las dos respuestas del escáner y conteos 3/13/6.
- Huellas SHA-256 de README/specs/cuerpos revisados.

Se ejecutó además:

```powershell
rg -n 'Content-Signal|/llms\.txt|/api/catalog\.json|/api/openapi\.json|/api/readme\.md|/auth\.md|/\.well-known/api-catalog|/md/|run_worker_first|openNow|America/Costa_Rica' docs/agent-readiness/README.md docs/agent-readiness/fase-1-content-signal.md docs/agent-readiness/fase-2-catalogo-descubrimiento.md docs/agent-readiness/fase-3-markdown-validacion.md docs/agent-readiness/issues
git diff --name-only c5e9a6886aae23a6ddaf16774b5916111dca3e91...HEAD
```

El grep usa distinción de mayúsculas; las menciones a protocolos fuera de alcance no se confunden con rutas autorizadas. No se exige que un término aparezca en una fase que no lo implementa, sino que toda aparición del recurso conserve su nombre exacto. Se verifican además los slugs de los nombres de archivo en enlaces/allowlists.

**Resultado local: PASS**, 15 casillas, 18 referencias N/D cubiertas, cero diferencias de aceptación o propiedad. Se repitió la lectura README → issue AR1 → issue AR2 → issue AR3 después de las correcciones; no aparecieron nuevas contradicciones técnicas. La comprobación de whitespace también pasó después de eliminar líneas vacías sobrantes al final de los documentos.

**Resultado remoto: PASS**, comprobado el 2026-09-05T19:48:15.981Z en [consistencia-github.json](evidencia/consistencia-github.json): cuerpos completos de [#12](https://github.com/Gunz-cop/Vet24-cr/issues/12), [#13](https://github.com/Gunz-cop/Vet24-cr/issues/13) y [#15](https://github.com/Gunz-cop/Vet24-cr/issues/15) idénticos a los Markdown locales, normalizando únicamente CRLF a LF. [github-issues.json](evidencia/github-issues.json) conserva las respuestas leídas, no solo una declaración de éxito. Las URLs definitivas están en [issues/README.md](issues/README.md). El estado de implementación vive en GitHub, no en una tabla de progreso duplicada.

## Límite de cierre

La coherencia técnica no resuelve D1. Mientras no llegue la elección del negocio, no se escribe una directiva elegida por el asistente ni se declara cerrada esta decisión. Al responder el propietario, el coordinador debe actualizar D1 y la condición de entrada, repetir esta lectura/verificación y sincronizar cualquier cuerpo de issue que cambie.
