# Addendum de revisión independiente — SERP, locators y gates

Fecha: **2026-09-09**  
Base: `c02b65f56bae6562b9b15373b80ed437b4df8d90`  
Documentos históricos conservados: `serp-analysis-2026-09-09.md`, `clinical-evidence-dossier-2026-09-09.md`, `brief-v3.md`

Estado: **REVISE; no habilita redacción, publicación ni evidencia B4**

## 1. SERP: diferencia entre contrato y evidencia archivada

El brief v3 exigía un inventario de los diez primeros resultados orgánicos de cada una de las cinco consultas. El archivo SERP existente no cumple ese contrato: registra resultados relevantes seleccionados, no posiciones 1–10.

| Consulta | Resultados relevantes registrados | ¿Inventario 1–10? |
|---|---:|---|
| `urgencias en perros` | 3 | No |
| `mi perro no puede respirar qué hacer` | 4 | No |
| `perro convulsiona veterinaria` | 4 | No |
| `veterinaria 24 horas para perros Costa Rica` | 6 | No |
| `intoxicación perro qué hacer` | 5 | No |

No se inventan posiciones ni se presenta esta muestra como cumplimiento del contrato original. La fecha, metodología y limitación de no geolocalización personalizada sí están archivadas en el SERP existente.

### Solicitud de decisión

Antes de la siguiente sesión redactora, el revisor/titular debe elegir una de estas opciones:

- **A — mantener el contrato v3:** ejecutar y archivar las posiciones 1–10 por consulta, con posición, URL, título, tipo, intención, EEAT observable, CTA, localización y motivo de inclusión/exclusión por fila.
- **B — reducir formalmente el contrato:** aprobar por escrito una muestra direccional de cinco resultados relevantes por consulta —o todos los resultados si el proveedor devuelve menos de cinco— con los mismos campos, sin llamarla inventario top 10.

Hasta recibir esa decisión, el SERP queda **BLOQUEADO**. El ángulo actual sigue siendo directional: título conservado, diferenciación local y secuencia de acción, sin afirmarlo como oportunidad validada.

## 2. Locators reproducibles C1–C7

Esta tabla complementa el dossier clínico histórico sin modificarlo. Cada localizador incluye heading, párrafo/viñeta o página, URL y fecha de acceso; el resumen no reproduce pasajes largos.

| Claim | Fuente y acceso | Localizador reproducible | Resumen fiel de una frase | H2 | Estado |
|---|---|---|---|---|---|
| C1 | S1 Cornell; 2026-09-09; https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/recognizing-and-responding-canine-respiratory-distress | Heading `What to do if your dog has difficulty breathing?`; primer párrafo bajo el heading, seguido de la lista `Signs of respiratory distress may include` | Ante signos de dificultad respiratoria, la fuente indica traslado rápido y calmado al hospital de emergencias y llamada previa cuando sea posible | Señales para salir ya | ELEGIBLE; auditoría independiente pendiente |
| C2 | S2 Merck; 2026-09-09; https://www.merckvetmanual.com/special-pet-topics/emergencies/evaluation-and-initial-treatment-of-dog-and-cat-emergencies | Heading principal; párrafo inicial sobre prioridad del triage; párrafo siguiente `Some problems require immediate treatment` y su lista | Merck enumera trauma, intoxicación, dificultad respiratoria, convulsiones, pérdida de conciencia y sangrado entre problemas que pueden requerir tratamiento inmediato | Señales para salir ya | ELEGIBLE; auditoría independiente pendiente |
| C3 | S3 Cornell; 2026-09-09; https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/gastric-dilatation-volvulus-gdv-or-bloat | Heading `Clinical signs`; viñetas sobre `Non-productive retching` y `Bloated abdomen`, junto con debilidad/colapso | La fuente identifica arcadas improductivas y abdomen distendido entre signos clínicos de GDV; el artículo debe tratarlos como señales, no como diagnóstico | Señales para salir ya | ELEGIBLE; auditoría independiente pendiente |
| C4 | S2 Merck + S6 AVMA; 2026-09-09; URLs del dossier | S2: primer párrafo tras el título sobre contar lo sucedido y proporcionar historia breve; S6: PDF p. 1, bloque que indica llamar al veterinario/hospital local para prepararse | La llamada ayuda a comunicar el caso y preparar la llegada, pero no debe retrasar un traslado evidente | Qué hacer mientras organizás el traslado | PENDIENTE DE REDACCIÓN CONTROLADA |
| C5 | S4 Merck + S5 ASPCA; 2026-09-09; URLs del dossier | S4: `General Treatment of Poisoning`, párrafos sobre cuándo puede inducirse vómito y cuándo no se recomienda; S5: headings `Gather the Evidence` y `Call APCC or Your Local Veterinarian Immediately` | Merck aporta el matiz clínico; ASPCA aporta consulta profesional antes de dar algo y reunir evidencia; no se formula una prohibición absoluta ni se usan contactos estadounidenses | Qué llevar y qué no hacer | REVALIDADA; requiere auditoría del texto final |
| C6 | S5 ASPCA; 2026-09-09; https://www.aspca.org/news/what-do-if-your-pet-poisoned | Heading `2. Gather the Evidence`; párrafo que pide reunir empaque/pastillas y revisar material de vómito; no usar el bloque de hotline | El empaque, pastillas o material pueden ayudar a identificar la exposición y comunicarla al profesional | Qué llevar y qué no hacer | ELEGIBLE CON EXCLUSIÓN DE DATOS EE. UU. |
| C7 | S2 Merck; 2026-09-09; https://www.merckvetmanual.com/special-pet-topics/emergencies/evaluation-and-initial-treatment-of-dog-and-cat-emergencies | Párrafo inicial después del título sobre revisión rápida y prioridad de problemas urgentes | El triage atiende primero los problemas potencialmente mortales y puede alterar el orden de atención | Qué esperar al llegar | ELEGIBLE; auditoría independiente pendiente |

S6 queda limitado a llamada al hospital local, preparación del traslado y seguridad no invasiva. No se usan sus secciones de RCP, compresiones, respiración de rescate, enfriamiento, presión, dosis, hotline ni otras maniobras.

## 3. Preflight de localización: qué se comprobó y qué no

El resultado `US_PHONE_CHECK=PASS` previo cubre únicamente la documentación existente en la carpeta editorial. No es una aprobación del candidato porque todavía no existe artículo reescrito, HTML renderizado ni assets.

El registro reproducible está en [preflight-localization-2026-09-09.md](preflight-localization-2026-09-09.md). Resume:

- patrón usado para detectar números telefónicos con formato norteamericano;
- archivos Markdown de `docs/blog/editorial/urgencias-en-perros/` escaneados;
- resultado y fecha;
- superficies aún no disponibles: cuerpo HTML candidato, citas renderizadas, `title`, meta description, Open Graph, JSON-LD, alt text, texto incrustado en imágenes y assets.

El control integral debe repetirse después de redactar/renderizar y debe devolver cero teléfonos, precios, disponibilidad o instrucciones operativas de APCC/Poison Control de EE. UU. en todas esas superficies. Los datos estadounidenses observables en ASPCA/AVMA permanecen excluidos.

## 4. Estado por gate

| Gate | Estado | Motivo |
|---|---|---|
| SERP | **BLOQUEADO** | La muestra no cumple top 10; falta opción A o aprobación formal de reducción B |
| Evidencia clínica | **REVISE** | Dossier coherente y locators añadidos; falta auditoría independiente del dossier/candidato |
| EEAT | **DECIDIDO PARA PLANIFICACIÓN** | Opción B aprobada: `Organization`, sin caso real ni `revisadoPor`; no equivale a revisión profesional |
| Seguridad/localización | **BLOQUEADO PARA CANDIDATO** | Preflight documental pasa, pero aún no hay HTML/assets para el control integral |
| Publicación | **BLOQUEADO** | No hay redacción, auditoría final, autorización de publicación ni correspondencia deployment–SHA (§7.1) |

## 5. Alcance

Este addendum no edita el artículo, no cambia infraestructura, no crea assets, no ejecuta build, no hace commit/push y no autoaprueba ninguna fase. La siguiente sesión redactora solo puede crearse después de resolver el contrato SERP y auditar el dossier/locators.
