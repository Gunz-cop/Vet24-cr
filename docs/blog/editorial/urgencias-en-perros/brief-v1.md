# Brief editorial v1 — `urgencias-en-perros`

Estado: **brief de planificación; no es una autorización para reescribir ni publicar**  
Fecha: **2026-09-09**  
Pilar: `guias-por-especie`  
URL objeto: `/blog/guias-por-especie/urgencias-en-perros/`  
Base observada: `c02b65f56bae6562b9b15373b80ed437b4df8d90`

## Lector, situación e intención

**Lector primario:** persona en Costa Rica que observa un deterioro repentino en su perro y necesita decidir si debe salir, qué comunicar por teléfono y cómo evitar errores durante el traslado.

**Situación:** estrés, poco tiempo, información incompleta, posible búsqueda desde móvil. Puede no saber si existe una clínica abierta, si atienden perros o si hay cupo.

**Intención principal:** informacional con acción inmediata: reconocer señales de alarma y conectar con atención veterinaria.

**Intenciones secundarias:** preparar una llamada, transportar sin agravar el riesgo, saber qué esperar del triage y encontrar una sede/zona para confirmar.

No hay datos de Search Console en esta entrega. Las consultas «urgencias en perros», «perro no puede respirar», «perro convulsiona», «veterinaria 24 horas para perros» e «intoxicación de perro qué hacer» son hipótesis de intención, no evidencia de demanda.

## Promesa y diferenciación

**Promesa:** en una lectura breve, la persona podrá identificar señales que no deben esperar, preparar una llamada y elegir el siguiente paso sin recibir un diagnóstico ni un tratamiento casero.

**Diferenciación editorial:** convertir conocimiento veterinario general en una secuencia local y operativa — **reconocer → llamar → trasladar → confirmar sede**— conectada a un directorio de Costa Rica. La página no debe competir por ser una enciclopedia de enfermedades ni por declarar qué clínica es «la mejor».

**Límite de promesa:** no diagnostica, no establece pronóstico, no garantiza atención, no confirma que una sede esté abierta ahora y no sustituye la indicación de un equipo veterinario.

## Outline accionable

1. **Apertura de decisión inmediata**
   - Una frase de alcance y un callout: si hay dificultad respiratoria, colapso, convulsiones, sangrado importante, trauma grave, intoxicación posible o abdomen distendido con arcadas sin vómito, llamar y organizar traslado sin esperar a que «se pase».
   - No presentar la lista como diagnóstico; «señal de urgencia» es el nivel editorial.
   - CTA contextual: «Buscar ayuda veterinaria ahora».

2. **Señales para salir ya**
   - Lista escaneable agrupada en respiración, conciencia/neurología, trauma/sangrado, intoxicación y abdomen distendido/arcadas.
   - Cada grupo debe tener una fuente concreta; no esconder todas las señales en párrafos.
   - Añadir una línea de seguridad: si la persona duda, llamar a una clínica y describir la señal.

3. **Qué hacer mientras organizás el traslado**
   - Llamar cuando sea posible sin retrasar la salida.
   - Informar especie, peso aproximado, señal principal, hora de inicio, accidente o sustancia, enfermedades y medicamentos.
   - Mantener al perro calmado, limitar movimiento y proteger manos/cara; pedir ayuda para cargarlo.

4. **Qué llevar y qué no hacer**
   - Separar empaque, nombre/concentración, pastillas o material masticado/vomitado si es seguro.
   - No inducir el vómito ni dar leche, aceite o medicamentos sin instrucción profesional.
   - No retirar objetos incrustados ni manipular una fractura.
   - Evitar instrucciones invasivas, dosis o tiempos exactos.

5. **Qué esperar al llegar**
   - Explicar triage en lenguaje simple: se priorizan amenazas vitales, así que el orden de llegada puede no ser el orden de atención.
   - Diferenciar valoración, estabilización y tratamiento; no prometer resultados.

6. **Confirmaciones locales antes de salir**
   - Preguntar por sede exacta, atención de perros, capacidad actual, acceso nocturno, depósito/formas de pago y si recomiendan otro centro.
   - En una emergencia evidente, no convertir la confirmación telefónica en una espera.
   - Enlazar la guía de atención 24 horas por zona y las fichas del directorio solo como opciones para confirmar.

7. **Cierre de acción**
   - CTA repetido: «Buscar ayuda veterinaria ahora».
   - Recordatorio breve de que horarios, servicios y cupos cambian.
   - Fuentes consultadas y fecha real de revisión.

## Mapa preliminar del cluster

### Piezas existentes

| Pieza | Función | Enlace desde el piloto |
|---|---|---|
| `urgencias-en-gatos` | Comparación por especie; no reutilizar señales de perro como si fueran universales | Relación lateral, solo después de resolver la acción principal |
| `atencion-veterinaria-para-exoticos` | Confirmar especie/capacidad para especies no caninas | Relación lateral, no CTA principal |
| `atencion-veterinaria-24h-por-zona` | Encontrar acceso local y entender límites de «24/7» | Enlace prioritario desde el cierre y el CTA |
| `costo-emergencia-veterinaria-nocturna` | Preparar preguntas sobre valoración, depósito y pago | Enlace secundario después de «qué esperar»; nunca debe retrasar la atención |

### Hijos propuestos, aún no creados

Estos son temas para una fase posterior, no rutas autorizadas por este brief:

1. **Intoxicación en perros: qué información reunir antes de llamar** — hijo de seguridad/acción; debe evitar remedios y dosificación.
2. **Dificultad respiratoria en perros: cómo reconocerla sin diagnosticar** — hijo de reconocimiento; requiere fuente veterinaria primaria y lenguaje no diagnóstico.
3. **Cómo trasladar a un perro herido con menos riesgo** — hijo de transporte; debe cubrir mordida, movimiento y ayuda de otra persona sin maniobras clínicas.
4. **Abdomen distendido y arcadas sin vómito: por qué no esperar** — hijo de señal crítica; exige revisión de fuente y advertencia contra autodiagnóstico.
5. **Cómo confirmar una veterinaria de emergencia en Costa Rica** — hijo local de acceso; debe usar el catálogo vigente, estados de confianza y fecha de verificación.

Regla de arquitectura: cada hijo tendrá un solo padre temático, dos enlaces contextuales a piezas hermanas cuando sean útiles y un enlace inverso al piloto solo si aporta decisión; no publicar una expansión hasta revisar demanda y fuentes.

## Matriz preliminar de afirmaciones y fuentes

La matriz es de planificación. «Pendiente» significa que no se autoriza reutilizar la afirmación hasta localizar el pasaje y registrar la fecha de consulta.

| ID | Afirmación a sostener | Fuente candidata | Pasaje/uso requerido | H2 | Estado |
|---|---|---|---|---|---|
| C1 | Dificultad respiratoria o esfuerzo respiratorio requiere valoración rápida | Cornell, `recognizing-and-responding-canine-respiratory-distress` | Señales y traslado calmado | Señales para salir ya | Verificar pasaje y vigencia |
| C2 | Colapso, pérdida de respuesta, convulsiones, trauma y sangrado importante son motivos para buscar atención urgente | AAHA, `help-is-this-a-pet-emergency` | Lista de emergencias generales | Señales para salir ya | Candidata; el snapshot B4 devolvió 403 |
| C3 | Abdomen que se distiende con arcadas sin vómito no debe observarse en casa | AAHA, `understanding-canine-bloat-gdv-a-medical-emergency` | Señales y acción inmediata, sin diagnosticar GDV | Señales para salir ya | Candidata; el snapshot B4 devolvió 403 |
| C4 | Una llamada puede permitir instrucciones iniciales y preparar al centro | Merck Veterinary Manual, `what-to-do-in-a-dog-or-cat-emergency` | «Emergency care often starts with your phone call» | Qué hacer mientras organizás el traslado | Verificar fecha/pasaje |
| C5 | No inducir el vómito ni dar remedios sin instrucción profesional | Merck Veterinary Manual, `general-treatment-of-poisoning` | Contraindicaciones y riesgo de aspiración | Qué llevar y qué no hacer | Verificar alcance exacto |
| C6 | Empaque, pastillas o material pueden ayudar a identificar una intoxicación | ASPCA, `what-do-if-your-pet-poisoned` | «Gather the Evidence» y contacto inmediato | Qué llevar y qué no hacer | Fuente sustituta HTTP 200 en B4 |
| C7 | El triage prioriza amenazas vitales y puede alterar el orden de llegada | Cornell Hospital, `emergency-and-critical-care-0` | Lista de condiciones emergentes y explicación de triage | Qué esperar al llegar | Verificar pasaje |
| C8 | La sede, especie, capacidad, acceso y pago deben confirmarse con el establecimiento | Fichas y guía local de Vet24; cada dato con `record_status` y `last_verified` | Solo respalda lo que cada sede publica; no conclusiones clínicas | Confirmaciones locales antes de salir | Provisional; revisar por sede |
| C9 | «24/7» no equivale por sí solo a médico presencial, cupo, cirugía u hospitalización | `atencion-veterinaria-24h-por-zona` y registros de clínica | Afirmación editorial de límites del directorio | Confirmaciones locales antes de salir | Reutilizar solo si la guía sigue vigente |
| C10 | El artículo es orientación y no sustituye consulta | `docs/blog/autoria.md`, política editorial y aviso visible | Alcance de autoría; no es afirmación clínica | Apertura/cierre | Obligatorio |

Contrato mínimo para pasar de matriz v1 a redacción: seis fuentes elegibles distintas, URL profunda, institución/autor, fecha disponible y fecha de consulta; cada afirmación de alto riesgo con pasaje localizado y H2; no contar una URL solo por aparecer en bibliografía. Si AAHA continúa inaccesible, reemplazar C2/C3 por fuentes institucionales estables antes de redactar.

## Autoría, revisión y caso real

- Firma pública: **Equipo de Vet24cr**, tipo JSON-LD **Organization**.
- `revisadoPor`: omitido hasta contar con una persona veterinaria identificada, credencial verificable y constancia de revisión del texto concreto.
- Auditoría editorial: una sesión distinta de quien redacte debe revisar el SHA candidato, fuentes, enlaces, seguridad clínica y criterios de aceptación.
- No existe caso real documentado en este brief. La alternativa segura es un ejemplo compuesto y explícitamente ilustrativo («si tu perro…»), sin edad, raza, clínica, diagnóstico ni resultado inventados.
- Si se incorpora un caso real, exigir consentimiento documentado, anonimización, fuente primaria y separación visual entre testimonio y recomendación clínica. Un testimonio no respalda una afirmación médica.

## Plan de imágenes y procedencia

Estado actual: **sin imagen editorial dentro del artículo**; el remoto usa la imagen social por defecto.

| Pieza visual | Uso | Procedencia exigida | Alt text propuesto |
|---|---|---|---|
| Ilustración de apertura | Apoyar traslado seguro sin dramatizar | Ilustración original encargada o recurso con licencia archivada; no usar foto de un caso real sin consentimiento | «Persona sostiene con cuidado a un perro mientras se prepara para llevarlo a una veterinaria» |
| Tarjeta/checklist de señales | Escaneabilidad en móvil | Diseño propio basado solo en afirmaciones ya mapeadas; revisión editorial antes de publicar | «Señales de urgencia en un perro y pasos para llamar y trasladarlo» |
| Imagen social específica | Compartir la guía | Recurso propio/licenciado; registrar archivo, licencia, fecha y relación con el artículo | «Guía de urgencias en perros de Vet24 Costa Rica» |

Evitar imágenes de lesiones, procedimientos, vómito o animales inmovilizados. El alt text debe describir lo que realmente aparece, no añadir «emergencia 24/7», diagnóstico o promesa de atención.

## CTA y enlaces internos

**CTA primario:** «Buscar ayuda veterinaria ahora».  
**Apoyo:** «Llamá para confirmar sede, especie y capacidad antes de trasladarte».

Ubicaciones propuestas: después del resumen inicial, después de «Confirmaciones locales» y al final. El destino debe ser un flujo existente del directorio/SOS; no crear una ruta ni convertir el CTA en garantía de disponibilidad.

Enlaces internos previstos, sujetos a verificación de destino en la próxima implementación:

- `/blog/costos-y-acceso/atencion-veterinaria-24h-por-zona/` — «veterinarias 24 horas por zona».
- `/blog/costos-y-acceso/costo-emergencia-veterinaria-nocturna/` — «qué preguntar sobre valoración y pago».
- `/clinica/hems-una-heredia/`, `/clinica/hospital-vet-medical-care-heredia/` y `/clinica/veterinaria-gocha-santo-domingo/` — solo como fichas del directorio para confirmar, no como ranking.
- `/zona/san-pablo-heredia/`, `/zona/guapiles/`, `/provincia/heredia/` y `/provincia/limon/` — solo si el destino sigue publicado y la relación geográfica se entiende.

La selección actual es heredada del catálogo tipado; no implica cobertura nacional. Los enlaces de clínica deben conservar una nota o contexto que invite a confirmar horario y capacidad.

## Plan de actualización

Propuesta operativa, no política ya ejecutada:

1. Revisar fuentes clínicas y pasajes antes de cada nueva edición y, como máximo, cada 90 días mientras el artículo sea de alto riesgo.
2. Revisar inmediatamente si una institución cambia la guía, si una URL da 4xx/5xx, si una recomendación resulta ambigua o si llega una alerta de seguridad.
3. Revisar los destinos locales según `last_verified`, `record_status`, teléfono, dirección y horario; nunca propagar «24/7» por marca o zona sin evidencia independiente.
4. Registrar `dateModified` solo cuando la revisión real haya terminado y el diff de contenido sea auditable.
5. Después de cambiar contenido, repetir auditoría independiente y comprobar la página remota; no declarar que el SHA servido coincide sin evidencia de deployment.

## Criterios de aceptación medibles

### Contenido y seguridad

- Una lista inicial permite identificar al menos seis grupos de señales sin leer párrafos largos.
- 100% de las afirmaciones clínicas, cifras y prohibiciones tienen fuente y pasaje localizado en la matriz; las filas de alto riesgo no quedan en estado pendiente.
- Cero dosis, diagnósticos, pronósticos, maniobras invasivas o promesas de atención.
- La llamada se presenta como ayuda para coordinar, nunca como requisito que retrase un traslado evidente.
- El aviso orientativo, autor `Organization` y ausencia de `revisadoPor` coinciden con el registro de autoría.

### UX, conversión y localización

- En 390×844, el primer viewport contiene título, límite clínico, resumen de señales y CTA contextual; medir sobre el candidato, no asumirlo por captura.
- Existe al menos un CTA textual dentro del artículo y otro al cierre; ambos llevan a un destino existente y no prometen disponibilidad.
- El artículo conserva un H1 único, headings en orden, foco visible y cero desbordamiento horizontal en 390×844.
- La página ofrece al menos un enlace a acceso por zona y uno a expectativas de costo, sin interrumpir la acción urgente.
- Cada afirmación local separa horario publicado, emergencia por llamada, presencia física, cupo y servicio especializado.

### Fuentes, cluster y publicación

- Mínimo seis fuentes elegibles distintas; cada una aporta al menos una afirmación en su H2.
- AAHA/AVMA y cualquier URL que haya dado 4xx/5xx se verifica o se reemplaza; no se conserva una cita decorativa.
- La matriz independiente coincide con el briefing y el texto candidato; no hay discrepancias de H2.
- El piloto enlaza a dos piezas del cluster y recibe al menos un enlace inverso útil, sin crear rutas nuevas en esta tarea.
- La auditoría independiente emite `APROBADO` sobre el SHA candidato con cero bloqueantes antes de cualquier nueva publicación; el deployment y el SHA servido se comprueban por separado.

## Fuera de alcance de este brief

No autoriza modificar `src/content/blog/urgencias-en-perros.md`, rutas, schema, layout, componentes, configuración, CI, dependencias, sitemap, catálogo, despliegue, publicación, push ni cierre de la auditoría B1–B4.
