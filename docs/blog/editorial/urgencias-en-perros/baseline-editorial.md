# Baseline editorial — `urgencias-en-perros`

Fecha de auditoría: **2026-09-09**  
SHA de la fuente local: `c02b65f56bae6562b9b15373b80ed437b4df8d90`  
Objeto remoto: [artículo publicado](https://vet24cr.com/blog/guias-por-especie/urgencias-en-perros/)

## Alcance y separación de objetos

Este documento registra el estado observado; no redacta ni reescribe el artículo.

| Objeto | Qué se observó | Qué no se debe inferir |
|---|---|---|
| Fuente local | `src/content/blog/urgencias-en-perros.md`, componentes, enlaces y evidencia versionada en el SHA indicado | Que el Markdown local por sí solo pruebe qué versión sirve producción |
| Página remota | HTTP 200, canonical propio, contenido visible, JSON-LD `Article` y `BreadcrumbList`; consulta directa el 2026-09-09 | Que HTTP 200 demuestre la correspondencia exacta entre deployment y SHA |
| Cierre B1–B4 | El cierre registra rutas, sitemap y conservación AR; mantiene §7.1 pendiente porque no contiene la correspondencia deployment–SHA | Que CI, una captura o un SHA local sustituyan el ID del deployment |
| Capturas visuales | Evidencia local B4 en `docs/blog/evidencia/b4/visual-articulos/` a 390×844 y 1440×900 | Que esas capturas sean una medición geométrica nueva de producción |

Estado editorial visible: `publicado`, pilar `guias-por-especie`, autor `Equipo de Vet24cr`, fecha `2026-09-08`, sin `dateModified` y sin `revisadoPor`. La omisión de revisor profesional es coherente con `docs/blog/autoria.md`; no debe convertirse en una insinuación de revisión veterinaria.

## Resumen ejecutivo

La pieza cumple bien el contrato técnico básico: intención y URL claras, una advertencia clínica explícita, fuentes institucionales enlazadas en contexto, canonical, `Article` JSON-LD con autor `Organization`, breadcrumbs y enlaces a clínicas/zonas. El tema también ocupa un buen lugar en el cluster porque responde a la decisión más urgente: reconocer señales y buscar atención.

La principal deuda es de **retención y acción bajo estrés**. El lector debe atravesar párrafos largos para extraer la decisión inmediata; no hay resumen inicial en formato escaneable, lista de señales, bloque «hacé esto ahora», CTA contextual ni una sección separada para qué llevar. En móvil la pieza se vuelve muy vertical y densa; en escritorio el lateral complementario queda vacío en la captura archivada. La página es honesta, pero todavía se comporta más como una nota informativa que como una ayuda de decisión para una emergencia.

Prioridad recomendada: **P0 editorial** — mejorar escaneabilidad y CTA sin ampliar la promesa clínica; **P1 de confianza** — reconciliar fuentes y pasajes; **P1 local** — hacer más explícito qué puede confirmar Vet24 y qué debe confirmarse con cada clínica; **P2 visual/SEO** — resolver imagen social y soporte visual propio.

## Inventario medido

Las cifras son conteos reproducibles del árbol local y del HTML remoto, no métricas de Analytics ni Search Console.

| Señal | Local | Remoto | Lectura editorial |
|---|---:|---:|---|
| H1 | 1 | 1 | Correcto |
| H2 | 5 en Markdown | 7 con «Clínicas…» y «Guías relacionadas» | La estructura funcional añade dos bloques al final |
| Palabras aproximadas | 565 de cuerpo | 698 en `main`, incluidos enlaces y bloques de directorio | No es largo por volumen; sí es denso para lectura de urgencia |
| Enlaces externos de fuente | 7 | 7 | Buena trazabilidad, pero una fuente no equivale a una afirmación verificada |
| Enlaces de directorio | — | 7 | Oportunidad de conversión, hoy concentrada al final |
| Imágenes dentro de `main` | — | 0 | No hay apoyo visual ni imagen editorial propia |
| CTA contextual dentro del artículo | — | 0 botones; existe el SOS global del header | La acción depende de la navegación global |

## Baseline por dimensión

### Retención y lectura bajo estrés

Fortalezas:

- El título promete una decisión concreta y coincide con la intención de urgencia.
- El primer H2 empieza por señales de salida, no por contexto general.
- La secuencia «señales → llamada → qué no hacer → llegada» es razonable.
- La advertencia inicial evita diagnosticar, promete cupo o presenta el directorio como garantía.

Problemas:

- Las señales críticas aparecen en prosa continua; no hay una lista rápida ni agrupación por tipo de riesgo.
- El lector no recibe una respuesta de una línea del tipo «si ves X, llamá y trasladá» antes de los detalles.
- «Qué decir al llamar» contiene también qué llevar en caso de intoxicación; la acción queda mezclada.
- No hay anclas, tabla de contenido ni bloques de decisión. Las citas incrustadas alargan visualmente párrafos ya densos.
- El cierre de fuentes y los enlaces de directorio aparecen después de toda la explicación; la ayuda práctica llega tarde.

Hipótesis de mejora: una advertencia breve, una lista de señales y un CTA de ayuda visible en el primer viewport móvil deberían reducir el tiempo hasta la acción. No es un resultado medido; debe validarse con una comparación posterior.

### Estructura y UX

Fortalezas observadas en remoto y en la captura local:

- Breadcrumbs, H1 único, jerarquía H2, enlace «Saltar al contenido» y enlaces subrayados.
- El botón global «Emergencia» conduce al directorio/SOS y permanece visible en móvil.
- El layout evita desbordamiento horizontal en las capturas archivadas; el contenido se adapta a 390 px.
- Los destinos del directorio están tipados por familia y los enlaces publicados pasan el contrato de rutas.

Deuda:

- El header es la única llamada visual fuerte; no hay CTA junto al bloque de señales ni después de «Qué decir al llamar».
- El lateral de 336 px está vacío en la captura de escritorio, por lo que genera espacio sin orientación adicional.
- No hay lista numerada para el traslado ni checklist de datos/empaque.
- El texto usa voseo costarricense, pero no explicita en el primer párrafo que la acción local es confirmar sede, especie, capacidad y acceso antes de salir.

### EEAT y autoría

Señales positivas:

- Las fuentes son Cornell, Merck, AAHA y ASPCA, con enlaces profundos y citas cerca de las afirmaciones.
- El autor visible y JSON-LD coinciden: `Equipo de Vet24cr` como `Organization`.
- No se declara `revisadoPor` ni se sugiere una credencial inexistente.
- La fecha de publicación es visible y no se inventó `dateModified`.

Riesgos:

- La firma colectiva identifica al proyecto, no a una persona veterinaria. Debe mantenerse la frase de alcance: información orientativa, no consulta profesional.
- El artículo dice en «Fuentes consultadas» que usa AVMA para primeros auxilios, pero el párrafo de intoxicación enlaza ASPCA. Esta discrepancia debe resolverse en la próxima revisión: o se documenta AVMA con su pasaje real o se corrige el inventario editorial para reflejar ASPCA.
- La evidencia B4 registra que AAHA general y AAHA GDV devolvieron 403 en el snapshot HTTP. Eso no invalida automáticamente la fuente, pero sí exige volver a localizar el pasaje o reemplazarla antes de reutilizarla como soporte contractual.
- La matriz archivada coloca la afirmación sobre material de intoxicación bajo «Qué llevar», pero el artículo no tiene ese H2. La matriz, el H2 y la cita deben volver a sincronizarse.

### Visuales

Baseline: no hay imagen dentro del artículo ni recurso visual específico en el HTML; el `og:image` remoto es la imagen social por defecto del sitio. Las capturas locales muestran una tarjeta oscura, tipografía legible y buena adaptación, pero un documento muy alto en móvil y un área lateral vacía en escritorio.

Implicaciones:

- No conviene añadir fotos de lesiones, vómito o procedimientos: pueden alarmar, no ayudan a decidir y elevan el riesgo de interpretación clínica.
- Un visual útil sería una ilustración sobria de traslado seguro o una tarjeta/checklist de señales, con alt text descriptivo y procedencia registrada.
- La imagen no debe sustituir el texto ni presentar una escena como evidencia clínica de un caso real.

### SEO y descubrimiento

Fortalezas:

- URL corta y coherente: `/blog/guias-por-especie/urgencias-en-perros/`.
- `seoTitle`, meta description, canonical, Open Graph, `Article` JSON-LD y `BreadcrumbList` están presentes.
- El H1 contiene «urgencias en perros» y el meta description cubre señales, llamada y traslado.
- La página enlaza al pilar, a clínicas/zonas, a una guía de atención 24 horas y aparece en el sitemap según el cierre productivo.

Deuda:

- El Open Graph remoto declara `og:type=website`, aunque el JSON-LD sí declara `Article`; conviene revisar la consistencia en una tarea técnica posterior, sin cambiarla en este encargo.
- No hay imagen social específica del artículo.
- No hay datos de Search Console en este baseline; cualquier priorización de consultas es una hipótesis de intención, no una conclusión de demanda.
- `dateModified` está correctamente ausente mientras no exista una revisión real; no debe agregarse solo para SEO.

### Conversión

La conversión primaria es encontrar atención, no vender un servicio. Hoy existe un botón global «Emergencia», siete enlaces de directorio al final y una guía relacionada de atención 24 horas. Falta un puente textual inmediato entre la señal clínica y la acción de búsqueda.

CTA propuesto para una futura edición: **«Buscar ayuda veterinaria ahora»**, acompañado de **«Llamá para confirmar sede, especie y capacidad antes de trasladarte»**. Debe aparecer después del resumen de señales y repetirse al final, con el mismo destino existente; no debe insinuar que Vet24 presta la atención ni que una ficha está abierta en ese instante.

### Localización Costa Rica

El voseo (`buscá`, `llamá`, `tené`, `esperés`) y «setiembre» son adecuados para Costa Rica. El directorio aporta destinos concretos en Heredia, Limón y Guápiles, pero esa selección no debe leerse como cobertura nacional ni como disponibilidad nocturna.

La pieza debe conservar tres límites locales:

1. Una ficha puede describir emergencias por llamada o un horario publicado; no se debe inferir médico presencial, cupo, cirugía u hospitalización.
2. El lector debe confirmar ubicación, entrada nocturna, especie, capacidad y formas de pago con la sede exacta.
3. Si la emergencia es evidente, el CTA no debe retrasar el traslado esperando redes sociales o una respuesta del directorio.

### Seguridad clínica

La orientación actual es prudente: no diagnostica, no promete pronóstico, desaconseja inducir el vómito o administrar remedios, recuerda el riesgo de mordida y recomienda reducir movimiento. Los cambios futuros deben preservar estas barreras.

Puntos a vigilar:

- «Respuesta urgente» y «atención inmediata» deben seguir vinculados a fuentes elegibles y no convertirse en diagnósticos.
- No añadir dosis, maniobras, medicamentos, tiempos clínicos exactos ni instrucciones invasivas sin fuente profesional y revisión adecuada.
- Separar «llamar mientras se organiza el traslado» de «no retrasar el traslado» para evitar que el lector interprete la llamada como requisito previo.
- Toda escena o caso debe etiquetarse como ilustrativo si no existe caso real documentado y consentido.

## Arquitectura de cluster

El artículo funciona como hub de especie dentro de `guias-por-especie`, con un puente actual a `costos-y-acceso/atencion-veterinaria-24h-por-zona`. Los otros artículos seed son vecinos, no todos hijos directos:

| Pieza | Rol actual | Relación recomendada |
|---|---|---|
| `urgencias-en-perros` | Hub/piloto de reconocimiento y primera acción | Enlaza a acceso 24 h, costos y futuros subtemas clínicos seguros |
| `urgencias-en-gatos` | Sibling por especie | Enlace lateral; no mezclar señales entre especies |
| `atencion-veterinaria-para-exoticos` | Sibling por especie | Enlace lateral; exige confirmar especie exacta |
| `atencion-veterinaria-24h-por-zona` | Acceso local | Hijo funcional de «encontrar atención» y puente de vuelta al hub |
| `costo-emergencia-veterinaria-nocturna` | Acceso/expectativas económicas | Hijo funcional posterior a la decisión de salir, nunca motivo para retrasar urgencias |

La arquitectura futura debe preservar una fuente única de relaciones tipadas, enlaces inversos verificables y rutas existentes. No se debe inventar un sexto artículo ni cambiar pilares/rutas en este baseline.

## Backlog editorial priorizado

| Prioridad | Acción | Criterio de salida |
|---|---|---|
| P0 | Añadir resumen escaneable de señales, lista de acción y CTA contextual | La decisión «llamar/trasladar» aparece en el primer viewport móvil y no depende del footer |
| P1 | Separar «qué decir», «qué llevar» y «qué no hacer» | Matriz, H2 y citas coinciden fila por fila |
| P1 | Auditar las siete fuentes; resolver AVMA/ASPCA y los 403 | Cada afirmación clínica tiene pasaje localizable y URL elegible |
| P1 | Reforzar el límite local de disponibilidad | Ningún texto convierte 24/7, directorio o llamada en garantía de atención |
| P2 | Diseñar visual propio y `og:image` específico | Procedencia, licencia, alt text y ausencia de dramatización archivados |
| P2 | Medir una iteración de UX | Comparación 390×844/1440×900 y analítica de CTA, sin confundir captura con conversión |

## Fuentes y limitaciones de este baseline

- Local: `src/content/blog/urgencias-en-perros.md`, `briefings/briefing-urgencias-en-perros.md`, `docs/blog/autoria.md`, `docs/blog/plan-fase-3.md`, matriz B4 y `docs/blog/evidencia/cierre-b1-b4/cierre.md`.
- Remoto: HTML de la URL publicada, consultado directamente el 2026-09-09; HTTP 200, canonical y estructura visible comprobados, sin atribuirle el SHA local.
- Visual: `docs/blog/evidencia/b4/visual-articulos/urgencias-en-perros-390.png` y `urgencias-en-perros-1440.png`; son evidencia archivada del candidato B4.
- No se usaron métricas de Search Console, Analytics, heatmaps ni entrevistas. Las hipótesis de retención y conversión deben validarse después.
- No se modificaron rutas, schema, layout, componentes, configuración, CI, dependencias ni el artículo publicado.
