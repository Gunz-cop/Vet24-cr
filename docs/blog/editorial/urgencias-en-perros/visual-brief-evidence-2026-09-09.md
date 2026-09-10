# Brief visual auditable — `urgencias-en-perros`

Fecha de investigación: **2026-09-09**  
Base local: `c02b65f56bae6562b9b15373b80ed437b4df8d90`  
Estado: **aprobación conceptual; no generar, descargar ni publicar asset**

## Decisión visual

Se aprueba conceptualmente un hero de **urgencia contenida**, ejecutado como fotografía licenciada o ilustración fotorrealista sintética. Para este piloto se prefiere una ilustración fotorrealista sintética únicamente si conserva una apariencia natural, se documenta su procedencia y se declara de forma prudente; una fotografía solo es válida con licencia y contexto verificables.

La imagen debe reforzar la acción de preparar un traslado, no funcionar como evidencia clínica ni dramatizar el peligro. El texto del artículo debe seguir siendo suficiente para entender las señales y decidir qué hacer sin ver la imagen. Esta decisión se alinea con [GOV.UK Design System: Images](https://design-system.service.gov.uk/styles/images/), que recomienda usar imágenes solo cuando hay una necesidad real y mantener la información esencial en texto, y con [WHO: Make it visual](https://www.who.int/about/communications/understandable/visuals), que propone usar visuales para hacer comprensibles mensajes de salud sin sustituir su contenido.

## Escena aprobada

**Escena:** una persona cuidadora prepara con calma el traslado de un perro estable, por ejemplo organizando una manta y un transportín o una correa junto a una puerta o vehículo. La persona muestra preocupación atenta, no pánico; el perro está consciente, sin signos visibles de dolor ni deterioro.

**Tratamiento:** luz cálida y natural, entorno doméstico o de salida neutral, vínculo respetuoso entre persona y animal, expresión contenida y acción reconocible. No debe parecer una consulta, un hospital ni una escena capturada durante una emergencia real.

**Composición:** 16:9, con el conjunto persona-perro en una zona central segura de aproximadamente 60% del ancho y 75% del alto. Mantener aire visual en ambos lados para recortes 1:1, 4:5, 1.91:1 y móvil; no colocar manos, cara, cabeza del perro o elementos de significado en los 15–20% exteriores. No añadir texto dentro de la imagen.

**Diversidad y dignidad:** representar una persona cuidadora sin estereotipos, sin presentar una etnia, edad, género o apariencia como señal de competencia veterinaria. Evitar identidades reconocibles, uniformes que sugieran credencial, marcas visibles y escenarios que atribuyan la imagen a una clínica concreta. La selección debe ser respetuosa con la persona y el animal; no convertir el miedo o el sufrimiento en recurso visual.

La elección de una escena calmada responde a la necesidad de comunicación accionable en una situación de estrés: [WHO: Understandable](https://www.who.int/about/communications/understandable) recomienda definir la acción principal, adaptar el mensaje a la audiencia y usar fotos o ilustraciones que refuercen esa acción. La referencia no autoriza introducir instrucciones clínicas nuevas.

## Prohibiciones de contenido

Rechazar el asset si muestra, sugiere o contiene:

- sangre, heridas, vómito, fluidos, encías azules, colapso, convulsiones o sufrimiento visible;
- procedimientos, agujas, instrumental clínico, medicación, envases de fármacos o maniobras de primeros auxilios;
- RCP, compresiones, respiración de rescate, Heimlich, extracción de objetos, presión, enfriamiento, dosis o cualquier intervención operativa;
- una clínica, ambulancia, uniforme, logo, placa, teléfono, dirección, precio, horario, texto incrustado o promesa de disponibilidad;
- una persona veterinaria, revisora, paciente real, caso real o testimonio implícito;
- una escena que permita creer que el perro fotografiado es el animal del lector o que el asset documenta un evento real;
- composición sensacionalista, color grading de alarma o elementos que contradigan el tono calmado del artículo.

La imagen no debe diagnosticar, representar una señal clínica ni presentar una clínica local como abierta, 24/7 o capaz de recibir el caso.

## Alt text y disclosure

**Alt funcional y breve propuesto:**

> Persona cuidadora preparando con calma el traslado de un perro.

No incluir en el alt la frase “imagen de”, keywords, procedencia, nombre de la herramienta, licencia ni afirmaciones clínicas. El alt describe la información que el visual aporta, conforme a [W3C WAI Images Tutorial](https://www.w3.org/WAI/tutorials/images/) y [W3C H37: `alt` en imágenes](https://www.w3.org/WAI/WCAG21/Techniques/html/H37.html). [GOV.UK](https://design-system.service.gov.uk/styles/images/) recomienda que el alt sea específico, significativo y conciso, y que no agregue información que no esté en la imagen.

**Caption/disclosure prudente si es sintética fotorrealista:**

> Imagen ilustrativa sintética: una persona prepara con calma el traslado de un perro. No representa un caso real ni una clínica específica.

La disclosure debe estar cerca del visual o en un control accesible de procedencia; no se debe presentar la imagen como fotografía documental. [Google Search Central recomienda dar contexto sobre cómo se creó el contenido generado y añadir metadata de imagen cuando corresponda](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content?hl=en). La disclosure no sustituye una licencia ni prueba por sí sola el origen.

## Procedencia, licencia y metadata

Antes de aceptar el archivo, registrar en un manifest editorial:

- ruta local, nombre descriptivo, formato, dimensiones, peso y hash SHA-256;
- si es fotografía: autor/fuente, URL de origen, licencia, permiso y fecha de verificación;
- si es sintética: herramienta o proceso, fecha de generación, prompt o brief aprobado, edición posterior y disclosure publicada;
- IPTC/XMP disponible, incluyendo creator/rights, copyright, caption y `DigitalSourceType` cuando la herramienta lo permita;
- presencia, validez y ubicación de Content Credentials/C2PA si la herramienta de generación o edición las produce;
- confirmación de que metadata no contiene ubicación, identidad, teléfono, contacto privado o datos que no deban publicarse.

[C2PA UX Guidance](https://spec.c2pa.org/specifications/specifications/2.2/ux/UX_Recommendations.html) recomienda que la procedencia ayude a creadores y consumidores a entender el historial del asset, con disclosure clara, lenguaje comprensible y revelación progresiva. Si existen Content Credentials, conservar el manifest y mostrar la disclosure en lenguaje de usuario; no usar un icono o sello como afirmación de autenticidad clínica. Si no existen, conservar el manifest editorial y no afirmar que el asset está certificado por C2PA.

## Rendimiento y responsive

Requisitos de implementación ya soportados por el plan técnico, pendientes de validar con el archivo real:

- composición base 16:9 con `width`/`height` declarados;
- `<img>` HTML real, no fondo CSS, para que el recurso sea descubrible y tenga alt;
- variantes responsive alrededor de 640 px y 1280 px, `srcset`/`sizes` y recorte que conserve la zona segura;
- hero con `decoding="async"` y carga prioritaria/eager solo si permanece cerca del encabezado;
- imágenes posteriores, si algún día existen, con `loading="lazy"`;
- evitar base64, GIF animado, video, fuente remota no controlada y archivos innecesariamente grandes;
- objetivo editorial inicial: revisar que el hero no desplace el callout de decisión fuera del primer viewport móvil y que no introduzca layout shift;
- comprobar 390×844 y 1440×900, conexión móvil simulada y fallback sin imagen.

[Google Image SEO](https://developers.google.com/search/docs/appearance/google-images?authuser=3&hl=en) recomienda usar elementos `<img>` descubribles, imágenes responsive, optimización de peso y calidad, nombres descriptivos, una imagen representativa de la página y evitar imágenes genéricas o con texto en `og:image`/datos estructurados.

## Auditoría previa a aceptación

### Imagen y metadata

- [ ] La escena coincide con el brief: traslado calmado, perro estable, sin diagnóstico ni procedimiento.
- [ ] No hay sangre, heridas, vómito, encías azules, colapso, medicación, logos, teléfonos, texto ni clínica identificable.
- [ ] No hay persona o paciente reconocible presentado como caso real.
- [ ] Alt, caption y disclosure fueron revisados en español costarricense y no prometen atención.
- [ ] Ruta, hash, dimensiones, peso, licencia/procedencia y fecha están en el manifest.
- [ ] IPTC/XMP/C2PA fue inspeccionado; cualquier campo sensible fue eliminado o justificado.
- [ ] Si es sintético, la disclosure no se omite aunque el archivo conserve Content Credentials.

### HTML y SEO

- [ ] `img` tiene `src`, `alt`, `width`, `height`, `loading` y `decoding` coherentes.
- [ ] La imagen no es la única portadora de información del callout o de las señales.
- [ ] `og:image`, Twitter image y `Article.image` apuntan al mismo recurso absoluto cuando existe `heroImage`.
- [ ] `og:image:alt`/Twitter alt, caption y alt no se contradicen.
- [ ] No aparece el fallback como imagen principal cuando sí existe un hero aprobado.
- [ ] El HTML generado conserva el artículo, el autor `Organization` y la ausencia de `revisadoPor`.
- [ ] El render se revisó en móvil/escritorio y con imagen desactivada o fallida.

## Estado

La dirección visual está **aprobada para brief**, no para generación ni publicación. El próximo gate requiere seleccionar una procedencia/licencia concreta, producir o adquirir el asset, calcular hash, conservar IPTC/C2PA si aplica, redactar la disclosure y pasar la auditoría negativa de imagen, metadata y HTML. No se generó, descargó ni instaló nada en esta fase.
