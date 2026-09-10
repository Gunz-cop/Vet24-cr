# Brief editorial v3 — anexo correctivo de `urgencias-en-perros`

Estado: **REVISE; no aprobado para evidencia ni redacción final**  
Fecha: **2026-09-09**  
Base local leída: `c02b65f56bae6562b9b15373b80ed437b4df8d90`  
Documento base: [brief-v2.md](brief-v2.md)

Este anexo supersede únicamente las reglas y filas que modifica. El resto de `brief-v2.md` permanece vigente: cinco grupos de señales, H2 exactos, contrato de seis documentos clínicos de al menos cuatro instituciones, plan SERP, gate EEAT, plan visual, no publicación y no cambios de infraestructura.

## 1. Tabla clínica corregida: fecha disponible/actualización separada de consulta

La fecha disponible/actualización es la fecha visible en la fuente o en el registro de auditoría; la fecha de consulta indica cuándo se inspeccionó la URL. `No visible` no puede convertirse en una fecha inventada.

| ID | Estado | Institución/documento | URL profunda | Fecha disponible/actualización | Fecha de consulta | Pasaje y uso permitido | H2 exacto | Reemplazo si falla |
|---|---|---|---|---|---|---|---|---|
| S1 | RETENER, verificar en candidato | Cornell, dificultad respiratoria canina | https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/recognizing-and-responding-canine-respiratory-distress | Actualización visible: marzo de 2025, según el registro de fuente local; reconfirmar en la captura de auditoría | 2026-09-09 | Sección de respuesta a dificultad respiratoria: reconocer esfuerzo/alteración de color y traslado rápido con calma | Señales para salir ya | S2; si no se confirma el pasaje canino, BLOQUEADA |
| S2 | REEMPLAZA AAHA general | Merck, evaluación y tratamiento inicial de emergencias | https://www.merckvetmanual.com/special-pet-topics/emergencies/evaluation-and-initial-treatment-of-dog-and-cat-emergencies | Revisión completa y última actualización: diciembre de 2025, visible en la página | 2026-09-09 | Apertura/lista de problemas que requieren tratamiento inmediato y explicación de prioridad del triage | Señales para salir ya; Qué esperar al llegar | Cornell Emergency & Critical Care |
| S3 | REEMPLAZA AAHA GDV | Cornell, GDV/bloat | https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/gastric-dilatation-volvulus-gdv-or-bloat | Actualizado: abril de 2025, visible en la página | 2026-09-09 | `Clinical signs`: arcadas improductivas y abdomen distendido; señal de urgencia, no diagnóstico en casa | Señales para salir ya | Merck Bloat/GDV; si ambos fallan, BLOQUEADA |
| S4 | RETENER CON REVALIDACIÓN | Merck, tratamiento general de intoxicación | https://www.merckvetmanual.com/special-pet-topics/poisoning/general-treatment-of-poisoning | Actualización: septiembre de 2024; revisión completa: octubre de 2020, según el registro de fuente B4 | 2026-09-08, snapshot B4 HTTP 200 | El pasaje debe cubrir que inducir vómito puede ser apropiado en algunos casos y peligroso en otros; no convertirlo en prohibición absoluta | Qué llevar y qué no hacer | BLOQUEAR C5 si no se revalida |
| S5 | RETENER | ASPCA, intoxicación de mascotas | https://www.aspca.org/news/what-do-if-your-pet-poisoned | 20 de marzo de 2019, visible en la página | 2026-09-09 | `Gather the Evidence` y consulta profesional antes de dar algo; no reproducir hotline, precio ni instrucciones operativas de EE. UU. | Qué hacer mientras organizás el traslado; Qué llevar y qué no hacer | S4 para la parte clínica; para empaques, bloquear si no hay sustituto |
| S6 | NUEVA, integración limitada | AVMA, `Pet First Aid` PDF | https://ebusiness.avma.org/files/ProductDownloads/mcm-client-brochures-pet-first-aid-2025.pdf | ©/edición 2025, visible en el PDF | 2026-09-09 | Solo llamar al hospital local, preparar traslado, confinar/reducir movimiento, mantener la cara lejos de la boca y pedir ayuda; primeros auxilios no sustituyen atención | Qué hacer mientras organizás el traslado; Qué llevar y qué no hacer | S2 para triage; bloquear instrucciones no cubiertas por este alcance |

Con esta tabla, las seis fuentes clínicas son seis documentos/URLs distintos de cuatro instituciones: Cornell, Merck, ASPCA y AVMA. Las fuentes locales/editoriales siguen separadas y no cuentan para el mínimo.

AAHA general y AAHA GDV quedan fuera del contrato v3 por el 403 del snapshot B4. No deben aparecer como fuente candidata pendiente.

## 2. Regla dura de localización y seguridad sobre fuentes de EE. UU.

No reproducir en el artículo ni en sus assets, citas, alt text, metadatos, JSON-LD o CTA:

- teléfonos de APCC, Poison Control o cualquier línea de toxicología de EE. UU.;
- precios, tarifas o disponibilidad de esos servicios estadounidenses;
- instrucciones operativas para llamar o actuar con esos servicios como si fueran una opción costarricense;
- números o datos de contacto que aparezcan incidentalmente en ASPCA o AVMA.

ASPCA y AVMA pueden respaldar principios generales delimitados —reunir información, consultar primero, llamar al hospital local y trasladar con seguridad—, pero no una línea de atención para Costa Rica.

La acción local debe dirigir a una clínica o veterinario local del directorio y pedir confirmar sede, especie, capacidad y acceso. Si no existe una línea nacional costarricense verificable dentro de las fuentes aprobadas, el texto debe decir que no se verificó una línea nacional y dirigir a la clínica/local veterinarian correspondiente; queda prohibido inventar una alternativa.

### Criterio negativo obligatorio

Antes de aceptar un candidato, escanear el Markdown, HTML renderizado, cuerpo de citas, JSON-LD, `title`, meta description, Open Graph, nombres/alt text de imágenes, texto dentro de imágenes y etiquetas de CTA. El resultado debe demostrar **cero teléfonos estadounidenses, precios estadounidenses, disponibilidad de APCC/Poison Control o instrucciones operativas para esos servicios**. Una coincidencia bloquea la redacción/publicación hasta retirarla y repetir la comprobación.

## 3. C5 corregida: no convertir Merck en prohibición absoluta

La formulación de trabajo queda limitada a:

> **No intentés inducir el vómito ni dar remedios por cuenta propia; consultá primero.**

Es una especificación de sentido, no copy final. Debe conservar dos matices:

1. S4/Merck: inducir el vómito puede estar indicado en algunos casos y ser peligroso en otros, según sustancia, estado y contexto.
2. S5/ASPCA: ante posible intoxicación, consultar a un profesional antes de dar algo y reunir la información/material disponible.

La fila C5 de la matriz queda así:

| ID | Afirmación de trabajo | Estado | Fuentes | Pasaje requerido | H2 exacto | Condición de bloqueo |
|---|---|---|---|---|---|---|
| C5 | No intentés inducir el vómito ni dar remedios por cuenta propia; consultá primero | REQUIERE REVALIDACIÓN | S4 + S5 | S4 debe cubrir la diferencia entre casos en que puede considerarse y casos en que es peligroso; S5 debe cubrir la consulta profesional antes de dar algo | Qué llevar y qué no hacer | Si falta cualquiera de los dos pasajes, o si el texto se vuelve una prohibición absoluta, BLOQUEADA |

No usar C5 para dar dosis, nombrar productos, recomendar leche/aceite ni resolver un caso de intoxicación desde el artículo.

## 4. S6/AVMA: contrato de uso limitado y prohibiciones negativas

S6 se limita a estas cuatro funciones:

- llamar al hospital veterinario local para que pueda prepararse;
- preparar y organizar el traslado;
- reducir movimiento/confinar de forma no invasiva y pedir ayuda;
- mantener la cara lejos de la boca y tratar la seguridad de la persona como parte del traslado.

Aunque el PDF incluya otras instrucciones, no se pueden introducir mediante S6:

- RCP, compresiones o respiración de rescate;
- maniobra de Heimlich, extracción de objetos o presión sobre heridas;
- enfriamiento, vendajes, férulas, dosis o productos;
- números de toxicología, precios, disponibilidad o instrucciones de APCC/Poison Control;
- cualquier otra maniobra operativa que no esté expresamente dentro del alcance de traslado/seguridad anterior.

### Criterio negativo S6

La auditoría debe revisar cuerpo, citas, enlaces, imágenes, texto incrustado, alt text, `title`, meta description, Open Graph y JSON-LD. Debe registrar cero apariciones de las maniobras, dosis, teléfonos estadounidenses o instrucciones excluidas arriba. Una aparición bloquea el candidato aunque la fuente AVMA la contenga.

## 5. Gates que permanecen bloqueados

Documentar un gate no lo resuelve. El estado v3 sigue siendo **REVISE**.

- **SERP/competencia — BLOQUEADO:** no se ejecutó la búsqueda para las cinco consultas definidas en v2. El título, ángulo y promesa finales no pueden fijarse hasta archivar resultados y decidir si existe espacio editorial local.
- **EEAT A/B — BLOQUEADO:** el usuario/titular todavía debe elegir entre (A) revisión veterinaria identificada con credencial y constancia del texto concreto o (B) guía genérica honesta sin caso real ni `revisadoPor`. Ninguna opción se considera elegida por estar descrita.
- **Fuentes — BLOQUEADO:** S4 debe revalidarse; C5 requiere S4+S5; S6 debe integrarse con el alcance limitado; cada pasaje debe quedar archivado con H2 exacto.
- **Localización — BLOQUEADO:** falta comprobar la ausencia de teléfonos/precios/disponibilidad/instrucciones estadounidenses en todo el candidato y confirmar que el CTA dirige a una opción local verificable.
- **Producción — BLOQUEADO:** sigue pendiente la correspondencia deployment–SHA de §7.1; este anexo no cierra auditorías ni autoriza publicación.

## 6. Alcance conservado

Este v3 no edita `src/content/blog/urgencias-en-perros.md`, rutas, schema, layout, componentes, configuración, CI, dependencias, sitemap, catálogo ni despliegue. No crea imágenes, casos, fuentes locales, teléfonos, precios o disponibilidad. No hace commit ni push.
