# Corrección ejecutora B4 tras auditorías

Fecha: 2026-09-08  
SHA rechazado: `dab96fd36d7056d9700642ba4afa51cbfe79111b`  
Rama: `codex/blog-b4-seed`  
Estado: **candidato corregido; pendiente de nueva auditoría independiente y verificación productiva**

## Resolución de hallazgos

1. Se sustituyeron los tres endpoints AVMA no comprobables en las cinco filas afectadas:
   - P7 y G7: ASPCA Animal Poison Control Center, HTTP 200.
   - E2: University of Illinois College of Veterinary Medicine, HTTP 200.
   - E6: Manual Veterinario de Merck, HTTP 200.
   - C7: University of Florida Veterinary Hospitals, HTTP 200.
2. E7 ya no atribuye “reptiles y aves” a Hospital Veterinario Santamaría. Dice únicamente “mascotas exóticas” y aclara que esa categoría no confirma especies concretas.
3. La afirmación de Cartago ahora lleva la cita de Medical Pets en la misma oración.
4. Se eliminaron `compare-agent-scans.mjs`, `verify-artifacts.mjs` y `verify-sources.mjs` de `docs/blog/evidencia/b4/`; no queda código ejecutable en evidencia.
5. El falso positivo histórico de fuentes se rotuló como inválido. El control contractual principal ahora rechaza explícitamente las tres URLs retiradas, exige sincronía exacta entre briefing y sus copias archivadas y falla si reaparece código ejecutable en evidencia B4.

## Trazabilidad de pasajes sustitutos

| Filas | Fuente | Pasaje localizado y alcance usado |
|---|---|---|
| P7, G7 | ASPCA, “What to Do if Your Pet Is Poisoned”, 2019-03-20 | “Gather the Evidence” pide reunir empaques o pastillas; “Call APCC or Your Local Veterinarian Immediately” y “Don’t Panic” indican contactar al profesional antes de tomar medidas o dar algo. |
| E2 | University of Illinois, “Know Thy Species”, Hannah Beers, 2017-03-24 | “Choose a Knowledgeable Veterinarian” recomienda encontrar una persona veterinaria familiarizada con la especie antes de una situación que requiera atención. |
| E6 | Divers y Comolli, Manual Veterinario de Merck, revisión 2025-07 | Introducción y secciones por especie documentan la necesidad de identificar especie y recopilar recinto, temperatura, humedad, iluminación y dieta. |
| C7 | University of Florida Veterinary Hospitals, “Financial Services”, sin fecha visible | Indica que el estimado se entrega después del examen, que las emergencias pueden exigir depósito y enumera opciones de pago propias. El artículo aclara que no son condiciones ni precios costarricenses. |

Todas se consultaron el 2026-09-08. `source-replacements-http.json` registra HTTP 200, URL final y descarga no vacía para las cuatro URLs, con límite de diez redirecciones.

## Validaciones repetidas

| Control | Resultado |
|---|---|
| `npm run check` | código 0 |
| `npm test` | código 0; 78/78 |
| `npm run build:no-shorten` | código 0 |
| `node scripts/verification/blog.mjs` | código 0; 5 publicados, 0 borradores, 139 HTML |
| `node scripts/verification/agent-catalog.mjs` | código 0 |
| `node scripts/verification/agent-markdown.mjs` | código 0 |
| `npm run test:e2e -- --workers=1` | código 0; 99 pases y 11 skips heredados |
| Specs B4 seriales | código 0; 19/19 |
| HTTP de cuatro fuentes sustitutas | código 0; 4/4 HTTP 200 |

No se declara B4 aprobada. Falta auditoría independiente del nuevo SHA y, después de autorización humana, merge, despliegue y verificación productiva conforme a §7.

Firma: **Equipo de Vet24cr**
