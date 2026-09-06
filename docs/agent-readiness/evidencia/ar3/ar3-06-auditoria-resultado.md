# AR3-06 — Resultado de auditoría con tres IAs

Fecha de ejecución: **2026-09-06** (America/Costa_Rica). Sitio auditado:
`https://vet24cr.com`.

Esta auditoría se ejecutó después del despliegue de AR3, en tres conversaciones
nuevas, sin contexto previo del proyecto. Se usaron tres infraestructuras de
búsqueda distintas:

| IA / proveedor | Modelo o modo observable | Herramienta de búsqueda | Fecha y hora visible | Rutas de Vet24 que la interfaz mostró o recuperó |
|---|---|---|---|---|
| ChatGPT web / OpenAI | El transcript no expuso el identificador exacto del modelo; la UI sí mostró `Buscando en vet24cr.com` y búsqueda web activa | ChatGPT Search | 2026-09-06; la respuesta mostró ~1:09 p. m. CR | `/`, `/clinica/la-vete-san-pablo-heredia/`, `/provincia/heredia/` y fichas citadas de Medical Care, Ramírez, PETS+ San Antonio y HEMS; también mencionó Gocha |
| Gemini web / Google | Selector visible: `Flash`; versión exacta no expuesta | Búsqueda de Google (`Buscando en la Web`), con panel de resultados/mapa | 2026-09-06; la UI no expuso hora | `/clinica/la-vete-san-pablo-heredia/`, `/clinica/hospital-vet-medical-care-heredia/`, `/provincia/heredia/`, `/clinica/hems-una-heredia/`; Ramírez y Gocha fueron presentadas desde la guía provincial |
| Perplexity web / Perplexity | Modelo no identificable: el selector ofreció varios modelos pero no marcó uno como seleccionado | Perplexity Search | 2026-09-06; 1:12 p. m. y 1:13 p. m. CR | `/`, `/provincia/heredia/`, `/provincia/san-jose/`, `/acerca/`, `/clinica/soluciones-veterinarias-santiago-puriscal/`; fuentes externas irrelevantes y no abrió la ficha concreta de La Vete San Pablo |

La falta de identificador visible de modelo en ChatGPT y Perplexity se conserva
como limitación de metadatos; no se inventa un nombre de modelo.

## Prompts literales y respuestas íntegras

Las dos consultas se pegaron literalmente, con una segunda intervención en la
misma conversación nueva de cada proveedor. El texto de las respuestas se
conserva tal como lo mostró cada interfaz; las etiquetas de cita que la UI
renderizó sin URL se conservan como texto de cita y se detallan en la tabla de
rutas.

### 1. ChatGPT Search

Conversación nueva, iniciada en `https://chatgpt.com/`, sin archivos ni
contexto del proyecto.

Prompt 1:

~~~text
Usando https://vet24cr.com, ¿qué clínica está abierta ahora cerca de San Pablo de Heredia? Indica qué podés confirmar, horario registrado, teléfono, URL de ficha y límites de actualidad.
~~~

Respuesta completa:

~~~text
A la hora de esta consulta —domingo 6 de septiembre de 2026, ~1:09 p. m. en Costa Rica— la opción más clara dentro de San Pablo según Vet24 es La Vete • San Pablo.

Vet24 tiene registrado para esa sede L-S 8:00 a. m.–8:00 p. m. y domingos 8:00 a. m.–7:00 p. m.. Por ese horario, debería estar abierta ahora. La ficha indica además que no está confirmada como clínica de emergencias 24/7.
Vet24 Costa Rica

Teléfono: 4080-8333

WhatsApp registrado: 8800-9575

Dirección: Taller SYS, 300 m oeste, San Pablo de Heredia

Ficha: La Vete San Pablo en Vet24

Horario registrado: domingo 8 a. m.–7 p. m.
Vet24 Costa Rica

Hay una distinción importante sobre la actualidad del dato: la portada de Vet24 fue rastreada hoy y sigue mostrando ese mismo horario para La Vete San Pablo, mientras que la copia de la ficha individual que pude consultar fue rastreada hace unos dos meses. Vet24 además advierte expresamente que horarios y servicios pueden cambiar sin previo aviso y recomienda confirmar por teléfono.
Vet24 Costa Rica
+1

Así que mi nivel de certeza sería: “abierta según el horario vigente registrado en Vet24”, no “acabo de confirmar físicamente que las puertas están abiertas”. Como comprobación adicional, el directorio local que consulté también la marca abierta ahora y registra el mismo teléfono y horario dominical. Para una urgencia, llamaría al 4080-8333 antes de salir.
~~~

Prompt 2:

~~~text
Usando https://vet24cr.com, ¿qué opciones de emergencias hay en Heredia? Distingue lo reportado como 24/7 de disponibilidad confirmada y conservá restricciones relevantes.
~~~

Respuesta completa:

~~~text
Sí. Tomando Heredia como provincia y usando lo que Vet24 publica actualmente, hay tres opciones que el directorio clasifica expresamente como “Emergencias 24/7”, más una opción hospitalaria con emergencias en horario limitado.
Vet24 Costa Rica
+1

4.6
Hospital Veterinario Medical Care
Clínica Veterinaria Ramírez
HEMS
4.4
PETS+ San Antonio
Ampliar
Use two fingers to move the map
Hospital Veterinario Medical Care
4.6
•
Hospital veterinario 24/7
Abierto
Clínica Veterinaria Ramírez
Emergencias 24/7
PETS+ San Antonio
4.4
•
Hospital veterinario 24/7
Abierto
HEMS
Hospital veterinario / emergencias

Hospital Veterinario Medical Care — Heredia centro. Vet24 lo marca como 24/7 todos los días y, además, su ficha hace una afirmación más fuerte que simplemente “abierto 24 horas”: reporta médico veterinario presencial durante toda la noche, internamiento y cirugía. Atiende perros, gatos y pequeños animales exóticos. Una restricción concreta que conviene conservar: el hotel es exclusivamente para gatos y con reserva previa.
Vet24 Costa Rica

Clínica Veterinaria Ramírez — San Rafael de Heredia. Está clasificada por Vet24 como “Emergencias 24/7”. También se reportan atención de exóticos, hotel, servicio a domicilio y especialidades como cardiología, ortopedia y oftalmología. Sin embargo, el resultado que puedo consultar no afirma específicamente que haya un veterinario físicamente presente toda la noche. Por eso no asumiría esa condición solamente a partir de la etiqueta 24/7.
Vet24 Costa Rica

PETS+ San Antonio — San Antonio de Belén. Vet24 registra “24/7 emergencias | Citas L-D todo el año”. Es decir, distingue el servicio de emergencia continuo del régimen de citas. También reporta atención de exóticos y especialidades como ortopedia, oftalmología, oncología y endoscopía. De nuevo, la ficha disponible confirma la oferta publicada de emergencias 24/7, no que yo pueda comprobar en vivo cuántos médicos están presentes en este instante.
Vet24 Costa Rica

Además está HEMS, el Hospital de Especies Menores y Silvestres de la UNA. No figura como 24/7. Su horario registrado es L-V 9 a. m.–7 p. m. y sábados-domingos únicamente emergencias de 10 a. m.–5 p. m.; tiene especial relevancia para fauna silvestre, exóticos y peces. Como hoy es domingo y son aproximadamente la 1:09 p. m., el horario registrado lo coloca dentro de su ventana dominical de emergencias. Eso sigue siendo disponibilidad por horario publicado, no confirmación telefónica en tiempo real.
Vet24 Costa Rica

Hay otro caso que conviene no mezclar con los 24/7 confirmados del directorio: Veterinaria Gocha, Santo Domingo. Su ficha dice “L-S 8:30 a. m.–6:30 p. m.; domingo cerrado — urgencias nocturnas por teléfono” y explícitamente señala “No confirmado como 24/7”. Que exista un teléfono para urgencias nocturnas no significa que Vet24 la considere una clínica abierta físicamente 24 horas.
Vet24 Costa Rica

La distinción clave sería entonces: Vet24 sí puede confirmar qué afirma o registra cada ficha; no puede confirmar por sí solo la disponibilidad operacional en vivo. El propio sitio advierte que horarios y servicios pueden cambiar y recomienda llamar antes de trasladarse, especialmente en una emergencia.
Vet24 Costa Rica

Si la prioridad fuera una emergencia ahora mismo en Heredia centro, Medical Care es la opción cuya ficha aporta la evidencia operacional más específica: no solo dice 24/7, sino que reporta médico presencial toda la noche.
~~~

### 2. Gemini Flash con Google Search

Conversación nueva, iniciada en `https://gemini.google.com/`, modo visible
`Flash`, sin abrir un cuaderno ni proporcionar contexto del proyecto.

Prompt 1:

~~~text
Usando https://vet24cr.com, ¿qué clínica está abierta ahora cerca de San Pablo de Heredia? Indica qué podés confirmar, horario registrado, teléfono, URL de ficha y límites de actualidad.
~~~

Respuesta completa:

~~~text
Según la información registrada en el directorio de Vet24 Costa Rica, los detalles de la opción listada en la zona de San Pablo de Heredia son los siguientes:

La Vete San Pablo
4.6 stars rating
4.6
🐾 Cuidados veterinarios
Open
· Closes 7:00 PM
La Vete San Pablo
Hacer clic para abrir el panel lateral y obtener más información

Lo que se puede confirmar:

Aparece registrada en la ficha del directorio como Abierta ahora (atención diurna regular).

Ubicación registrada: Taller SYS 300 m oeste, San Pablo de Heredia.

No cuenta con servicio de emergencia 24/7 confirmado.

Horario registrado:

Lunes a Sábado: 8:00 a. m. – 8:00 p. m.

Domingos: 8:00 a. m. – 7:00 p. m.

Teléfonos de contacto:

Teléfono principal: 4080-8333

WhatsApp: 8800-9575

URL de la ficha:

[https://vet24cr.com/clinica/la-vete-san-pablo-heredia/](https://vet24cr.com/clinica/la-vete-san-pablo-heredia/)

Límites de actualidad e información:

El sitio indica que la ficha se encuentra con la última auditoría operativa en estado "Pendiente de validar", por lo que el directorio recomienda realizar una llamada previa antes de trasladarse.

¿Deseás información sobre centros médicos con atención nocturna o de emergencia 24/7 en zonas contiguas como Heredia Centro?
~~~

Prompt 2:

~~~text
Usando https://vet24cr.com, ¿qué opciones de emergencias hay en Heredia? Distingue lo reportado como 24/7 de disponibilidad confirmada y conservá restricciones relevantes.
~~~

Respuesta completa:

~~~text
Según el directorio de Vet24 Costa Rica, en la provincia de Heredia existen distintas categorías de atención para emergencias, distinguiendo entre las que cuentan con presencia o atención 24/7 confirmada y aquellas con esquemas parciales o atenciones telefónicas.

Opción 24/7 con Disponibilidad Confirmada en Sitio
Hospital Veterinario Medical Care
4.6 stars rating
4.6
🐾 Cuidados veterinarios
Open
Hospital Veterinario Medical Care
Hacer clic para abrir el panel lateral y obtener más información

Clasificación en el sitio: Tier A (Emergencia Real 24/7). Ficha revisada.

Confirmación 24/7: Cuenta con médico veterinario presencial permanente en sitio durante toda la noche y facilidad de hospitalización.

Especies atendidas: Perros, gatos y pequeños animales de compañía exóticos (conejos, erizos, hámsters, cuilos, etc.).

Ubicación: Heredia Centro, 25 m oeste de la Escuela Moya Murillo, contiguo a la sucursal del INS.

Contactos:

Teléfono principal: 2262-6826

WhatsApp: 8639-6793

Ficha en Vet24: https://vet24cr.com/clinica/hospital-vet-medical-care-heredia/

Opciones 24/7 o de Emergencia Parcial / Condicionada
Clínica Veterinarias Ramírez
4.5 stars rating
4.5
🐾 Cuidados veterinarios
Open
· Closes 2:00 PM
Clínica Veterinarias Ramírez
Hacer clic para abrir el panel lateral y obtener más información

Clasificación en el sitio: Emergencias 24/7 reportado.

Restricción/Condición: Ofrece servicios de emergencia y consulta general, así como servicios especializados (cardiología, ortopedia).

Ubicación: San Rafael de Heredia, costado este del Centro Comercial Manolo (BAC).

Contactos:

Teléfono: 2237-4098

Ficha en Vet24: Presente en la guía provincial (https://vet24cr.com/provincia/heredia/).

HEMS (Hospital de Especies Menores y Silvestres - UNA)
4.5 stars rating
4.5
🐾 Cuidados veterinarios
Open
· Closes 5:00 PM
HEMS (Hospital de Especies Menores y Silvestres - UNA)
Hacer clic para abrir el panel lateral y obtener más información

Clasificación en el sitio: Tier B (Emergencia Parcial / No es 24/7 permanente).

Horario de emergencias registrado:

Lunes a Viernes: 9:00 a. m. – 7:00 p. m.

Sábados y Domingos: Atiende solo emergencias de 10:00 a. m. a 5:00 p. m.

Restricción de actualidad: Ficha marcada con "Pendiente de validar". No cuenta con servicio nocturno las 24 horas.

Especialidad: Hospital universitario especializado en pequeñas especies, fauna silvestre y animales exóticos.

Ubicación: Universidad Nacional, Heredia (Campus Omar Dengo).

Contactos: 2260-9234 / 2261-1775

Ficha en Vet24: [https://vet24cr.com/clinica/hems-una-heredia/](https://vet24cr.com/clinica/hems-una-heredia/)

Veterinaria Gocha
4.7 stars rating
4.7
🐾 Cuidados veterinarios
Closed
· Opens 8:30 AM Mon
Veterinaria Gocha
Hacer clic para abrir el panel lateral y obtener más información

Clasificación en el sitio: Atención de urgencias bajo llamado/guardia telefónica.

Horario de atención: Lunes a Sábado de 8:30 a. m. a 6:30 p. m. Domingos cerrado en sede física.

Mecanismo de urgencia: Dispone de un canal telefónico exclusivo 24/7 para atención de urgencias fuera del horario regular.

Ubicación: Santo Domingo de Heredia, del McDonald's 50 m este y 50 m norte.

Contactos: 2244-8726

Ficha en Vet24: Presente en la guía provincial (https://vet24cr.com/provincia/heredia/).

Restricciones Relevantes y Notas del Directorio

Límites de Garantía: Salvo en las fichas revisadas de nivel Tier A (como Medical Care), el directorio insta a llamar o enviar un mensaje de WhatsApp previamente para reconfirmar al médico de guardia antes de desplazarse.

Cobertura Específica: En el caso de animales exóticos o fauna silvestre, las opciones preparadas reportadas en Heredia son Medical Care, HEMS (UNA) y Veterinaria Gocha.

¿Necesitás que verifique los datos de contacto directos de algún hospital veterinario en particular?
~~~

### 3. Perplexity Search

Conversación nueva, iniciada en `https://www.perplexity.ai/`, pestaña `Answer`,
modo `Search`, sin iniciar sesión ni proporcionar contexto del proyecto.

Prompt 1:

~~~text
Usando https://vet24cr.com, ¿qué clínica está abierta ahora cerca de San Pablo de Heredia? Indica qué podés confirmar, horario registrado, teléfono, URL de ficha y límites de actualidad.
~~~

Respuesta completa:

~~~text
La Vete San Pablo en San Pablo de Heredia está abierta hoy: L-S 8am-8pm | D 8am-7pm. Confirmación disponible en la ficha de Vet24 Costa Rica y suele incluir teléfono, ruta y opción de WhatsApp. Registro de horario publicado y límites de actualidad: la información se basa en el horario registrado en la plataforma Vet24 y en auditoría reciente (indicaciones de “emergencias 24/7” y estado verde para clínicas abiertas ahora). Teléfono y URL de ficha: consulta la ficha de La Vete San Pablo en Vet24 Costa Rica para obtener el teléfono y la URL exacta.
~~~

Prompt 2:

~~~text
Usando https://vet24cr.com, ¿qué opciones de emergencias hay en Heredia? Distingue lo reportado como 24/7 de disponibilidad confirmada y conservá restricciones relevantes.
~~~

Respuesta completa:

~~~text
En Heredia hay 10 clínicas listadas en Vet24 Costa Rica; de ellas, dos se reportan como “Emergencias 24/7” o “Urgencias 24/7 — canal exclusivo nocturno”. A continuación distingo lo que el sitio marca como 24/7 de la disponibilidad confirmada y conservando las restricciones relevantes.

Opciones reportadas como 24/7 en Vet24CR

Clínica Veterinaria Ramírez (San Rafael de Heredia): etiquetada “Emergencias 24/7”.

Veterinaria Gocha (Santo Domingo de Heredia): etiquetada “Urgencias 24/7 — canal exclusivo nocturno”.

Disponibilidad confirmada y restricciones (según la ficha)

Clínica Veterinaria Ramírez: 24/7 según la etiqueta; el sitio indica que las clínicas 24/7 aparecen priorizadas cuando tienen emergencia confirmada o auditoría reciente, pero recomienda llamar antes de salir.

Veterinaria Gocha: 24/7 para urgencias vía canal telefónico exclusivo nocturno; atienden fauna silvestre y exóticos, y el sitio reitera la recomendación de confirmar antes de trasladarse.

Otras con horario extendido (no 24/7) y notas de uso

Hospital Veterinario Medical Care (Heredia centro): L–D 9am–9pm (jornada continua).

La Vete Mall Oxígeno (Mall Oxígeno): L–S 10am–9pm | D 10am–8pm.

HEMS (Heredia, UNA): L–V 9am–7pm | S–D solo emergencias 10am–5pm.

La Vete Belén Cariari: L–S 8am–8pm | D 8am–7pm.

La Vete San Pablo (San Pablo de Heredia): L–S 8am–8pm | D 8am–7pm.

Veterinaria Biopet Barva: L–S 8am–7pm.

Veterinaria Lancelot (Santo Domingo): L–S 8am–6pm.

Veterinaria Sarapiquí (Puerto Viejo de Sarapiquí): L–V 7am–7pm.

Límites de actualidad y cómo confirmar

Vet24CR aclara que “llama antes de salir” y que las clínicas marcadas como 24/7 aparecen priorizadas cuando tienen emergencia confirmada o auditoría reciente; esto implica que el estado “abierto ahora” puede cambiar y que la confirmación telefónica/WhatsApp es necesaria antes de ir.

Para emergencias reales, usa los botones de llamada o WhatsApp en cada ficha y, si es posible, verifica la etiqueta 24/7 y la nota de “auditoría reciente” en la página de la clínica.

Si me decís tu ubicación exacta (barrio/canton) y si es de día o de noche, te puedo filtrar la opción más cercana y con mayor probabilidad de atención inmediata según estas etiquetas.
~~~

## Contraste HTTP y clasificación de hallazgos

Comprobaciones ejecutadas con `curl.exe` contra producción el 2026-09-06:

| Ruta | Resultado HTTP | Observación |
|---|---:|---|
| `/` | 200 `text/html` | La portada responde. |
| `/provincia/heredia/` | 200 `text/html` | La guía provincial responde. |
| `/clinica/la-vete-san-pablo-heredia/` | 200 `text/html` | Ficha citada por ChatGPT y Gemini responde. |
| `/clinica/hospital-vet-medical-care-heredia/` | 200 `text/html` | Ficha citada por ChatGPT y Gemini responde. |
| `/clinica/hems-una-heredia/` | 200 `text/html` | Ficha citada por las respuestas responde. |
| `/clinica/clinica-veterinaria-ramirez-heredia/` | 200 `text/html` | Ficha canónica de Ramírez responde. |
| `/clinica/veterinaria-gocha-santo-domingo/` | 200 `text/html` | Slug canónico publicado; responde. |
| `/clinica/pets-plus-san-antonio-belen/` | 200 `text/html` | Ficha canónica de PETS+ responde. |
| `/api/catalog.json` | 200 `application/json; charset=utf-8` | Catálogo público completo responde. |
| `/md/clinica/hems-una-heredia.md` | 200 `text/markdown; charset=utf-8` | Mirror directo responde. |
| `/md/clinica/hospital-vet-medical-care-heredia.md` | 200 `text/markdown; charset=utf-8` | Mirror directo responde. |
| `/md/clinica/veterinaria-gocha-santo-domingo.md` | 200 `text/markdown; charset=utf-8` | Mirror directo responde. |
| `/md/clinica/pets-plus-san-antonio-belen.md` | 200 `text/markdown; charset=utf-8` | Mirror directo responde. |
| `/clinica/veterinaria-gocha-heredia/` | 404 | URL no canónica inferida durante la comprobación; no es la ruta publicada por el catálogo. No se clasifica como fallo del sitio. |

El catálogo confirma que para La Vete San Pablo y HEMS `openNow` es `null`.
La Vete tiene `horarioTexto = "L-S 8am-8pm | D 8am-7pm"`, teléfono
`4080-8333`, y `last_verified`/`verification_source` nulos. HEMS tiene
`horarioTexto = "L-V 9am-7pm | S-D solo emergencias 10am-5pm"` y también
`last_verified`/`verification_source` nulos. Medical Care tiene
`horarioTexto = "24/7 todos los días"`, `last_verified = 2026-09-04`,
fuente de confirmación telefónica/correo, médico nocturno afirmado, y conserva
“hotel exclusivamente para gatos con reserva previa”. Ramírez tiene
`Emergencias 24/7` y `emergencias24h.valorRegistrado = true`, pero sin
fecha/fuente. PETS+ San Antonio publica `24/7 emergencias | Citas L-D todo el
año`, con `emergencias24h` afirmado. Gocha publica canal telefónico 24/7, pero
`emergencias24h` es `no-confirmado`, no hay médico físico de madrugada y su
atención física es L-S 8:30 a. m.–6:30 p. m.; domingo cerrado.

### Clasificación por proveedor

| Proveedor / hallazgo | Clasificación | Comprobación y motivo |
|---|---|---|
| ChatGPT: La Vete, horario, teléfono y ficha | Correcto; no es fallo del sitio | La ficha y `/api/catalog.json` responden 200 y contienen los valores publicados. `openNow=null`: la respuesta usa correctamente “debería” y recomienda llamar. |
| ChatGPT: “portada rastreada hoy” y ficha individual rastreada hace dos meses | Limitación de herramienta / afirmación no reproducible | HTTP responde 200, pero el catálogo de La Vete tiene `last_verified=null` y `verification_source=null`; no hay fecha de rastreo que respalde esa precisión. |
| ChatGPT: Medical Care, Ramírez, PETS+, HEMS y Gocha | Correcto en la distinción principal | Las rutas/catálogo responden; los valores publicados confirman 24/7 afirmado para Medical Care, Ramírez y PETS+, horario parcial para HEMS y canal telefónico/no médico nocturno para Gocha. |
| ChatGPT: hotel de Medical Care solo para gatos y con reserva | Deuda de datos conocida, conservada correctamente | El `bodyMarkdown` y `verification_notes` públicos contienen exactamente esa restricción. |
| Gemini: La Vete aparece “Open” y con horario | Limitación de herramienta, no fallo del sitio | HTTP y catálogo responden; `openNow=null` y no hay confirmación de disponibilidad en vivo. |
| Gemini: “última auditoría operativa ... Pendiente de validar” para La Vete | Limitación de herramienta / estado no publicado literalmente | La ficha responde 200, pero sus campos `last_verified`, `verification_source` y `verification_notes` están vacíos; el sitio no expone ese estado como registro de La Vete. |
| Gemini: Medical Care como presencia nocturna y hotel/especies | Correcto como dato registrado; no equivale a disponibilidad en vivo | Ficha y catálogo 200; `last_verified=2026-09-04`, médico nocturno afirmado y notas de especies. La propia auditoría exige no convertirlo en apertura operacional actual. |
| Gemini: omite PETS+ San Antonio de las opciones de emergencias | Limitación de herramienta / recuperación incompleta | `/api/catalog.json` 200 y ficha PETS+ 200; el registro publica `24/7 emergencias` y `emergencias24h` afirmado. No es un fallo del endpoint. |
| Gemini: HEMS “Pendiente de validar” y sin 24/7 | Deuda de datos conocida, con una extrapolación de herramienta | La ruta responde y el horario está publicado; HEMS carece de `last_verified`/`verification_source`, que es la deuda semántica conocida. `emergencias24h` es no-confirmado. |
| Gemini: Gocha con canal telefónico 24/7, pero no sede física | Correcto en la restricción | La ficha canónica y el catálogo 200 reflejan canal nocturno, sede cerrada los domingos y ausencia de médico físico de madrugada. |
| Gemini: no conserva en la respuesta la restricción del hotel de Medical Care | Limitación de herramienta / omisión | El `bodyMarkdown` y notas de Medical Care responden por catálogo y contienen hotel exclusivo para gatos con reserva. |
| Perplexity: La Vete “abierta hoy” sin teléfono ni URL exacta | Limitación de herramienta / respuesta incompleta | La ficha canónica y catálogo responden 200 y contienen teléfono/URL; la propia lista de fuentes de Perplexity mostró `/` y `/provincia/heredia/`, no la ficha concreta. |
| Perplexity: “auditoría reciente” y “estado verde” para La Vete | Limitación de herramienta / afirmación no respaldada | Catálogo 200, pero La Vete no tiene `last_verified`, `verification_source` ni `openNow`; no es un fallo HTTP. |
| Perplexity: dice que Medical Care solo tiene horario L-D 9 a. m.–9 p. m. y no la cuenta como 24/7 | Limitación de herramienta / dato recuperado incorrectamente | Ficha y catálogo 200 publican `24/7 todos los días`; `last_verified=2026-09-04` y fuente directa. No se observa fallo del sitio. |
| Perplexity: lista solo Ramírez y Gocha como 24/7 | Limitación de herramienta / cobertura incompleta y mezcla de niveles | Catálogo 200 publica Medical Care, Ramírez y PETS+ con `emergencias24h` afirmado. Gocha tiene canal telefónico 24/7, pero `emergencias24h` no-confirmado y sin médico físico nocturno; esa diferencia debía conservarse. |
| Perplexity: cuenta 10 clínicas en Heredia | Limitación de herramienta / conteo no reproducible con el catálogo actual | El catálogo devuelve 12 con provincia exacta `Heredia` y además PETS+ San Antonio registra `Heredia / Alajuela`; no es un endpoint roto. |
| Perplexity: fuentes externas y rutas de otras provincias | Limitación de herramienta | La lista de fuentes mostró `pasapet.com`, `vets.cl`, `veterinaria24-7.com`, `/provincia/san-jose/`, `/acerca/` y otras rutas no necesarias para responder la consulta. HTTP de Vet24 sí responde. |

No se observó un fallo nuevo del sitio: ninguna ruta canónica necesaria por el
protocolo falló. La única respuesta 404 fue una URL no canónica construida como
`veterinaria-gocha-heredia`; el catálogo publica
`veterinaria-gocha-santo-domingo`, que fue verificada con 200 HTML y 200
Markdown.

## Checks del escaneo post-despliegue que no están en `pass`

El escaneo íntegro archivado en
[scan-post-deploy.json](scan-post-deploy.json) tiene
`scannedAt=2026-09-06T16:45:09.890Z`, nivel 4 (`Agent-Integrated`) y conserva
los seis checks funcionales previos en `pass`, además de
`markdownNegotiation=pass`. Se enumeran aquí todos los estados `fail` y
`neutral`, sin presentarlos como fallos introducidos:

| Check | Estado | Clasificación | Razón |
|---|---|---|---|
| `dnsAid` | fail | Decisión de negocio reservada / fuera de alcance D8 | No se autorizó DNS-AID ni cambios DNS. |
| `webBotAuth` | neutral | No aplicable a catálogo público D7 | No existe lectura protegida ni bot firmante registrado. |
| `oauthDiscovery` | fail | Decisión D7 / no aplicable | El catálogo es anónimo y no se autorizó OAuth. |
| `oauthProtectedResource` | fail | Decisión D7 / no aplicable | No hay recurso protegido por OAuth. |
| `authMd` | fail | Techo aceptado de acceso anónimo D7 | Existe `/auth.md`, pero no se inventa registro de agentes ni credenciales. |
| `mcpServerCard` | fail | Capa 5 no autorizada D8 | No se publica tarjeta ni endpoint MCP. |
| `a2aAgentCard` | fail | Capa 5 no autorizada D8 | No se publica tarjeta ni endpoint A2A. |
| `agentSkills` | fail | Capa 4 no autorizada D8 | No se publica índice de Agent Skills. |
| `webMcp` | fail | Capa 5 no autorizada D8 | No se registran herramientas WebMCP. |
| `ard` | fail | Capa 4 no autorizada D8 | No se publica manifiesto ARD. |
| `x402` | neutral | No aplicable: sitio sin comercio | No hay endpoint de pago. |
| `mpp` | neutral | No aplicable: sitio sin comercio | No hay flujo de pagos. |
| `ucp` | neutral | No aplicable: sitio sin comercio | No hay perfil de comercio. |
| `acp` | neutral | No aplicable: sitio sin comercio | No hay checkout ni protocolo de compra. |
| `ap2` | neutral | No aplicable: sitio sin comercio | No existe tarjeta A2A; no se añade una para cambiar el resultado. |

Estas clasificaciones respetan el alcance del issue: no se reparan checks de
capas 4/5, DNS-AID, OAuth ni comercio dentro de AR3-06.

## Conclusión

Se auditaron **3 IAs con infraestructuras de búsqueda distintas** y cada una
respondió las dos consultas literales en una conversación nueva. El criterio
**AR3-06 queda cubierto por completo respecto del mínimo de tres IAs**. No se
observan fallos nuevos del sitio introducidos por AR3; las discrepancias son
limitaciones de recuperación/interpretación de las herramientas o deuda de
datos ya documentada (`HEMS` sin `last_verified`/`verification_source` y
restricción de hotel de Medical Care a gatos con reserva). Este informe no
promete citación futura ni declara que el sitio ya sea citado por IAs.

No se tocan `src/`, no se publican endpoints de capas 4/5 o DNS-AID, no se
cierra el issue #15 y este cambio está limitado a documentación de evidencia.





