# Mini-brief de extensión — `urgencias-en-perros`

Fecha: **2026-09-10**  
Base: `c02b65f56bae6562b9b15373b80ed437b4df8d90`  
Estado: **redacción ampliada y preflight técnico aprobado; sin autorización de publicación**

## Objetivo

Convertir el candidato de una nota breve en una guía de decisión y preparación útil bajo estrés, sin perseguir una cuota vacía de palabras. La pieza conserva el H1, la intención principal, el autor colectivo `Equipo de Vet24cr`, la opción EEAT B, el CTA local y los seis H2 contractuales. No se agrega caso real, `revisadoPor`, promesa 24/7 ni dato operativo de EE. UU.

## Lectura y arquitectura aplicada

- Apertura empática con regla práctica: cinco familias de señales, llamada local y traslado sin retraso.
- Distinción prudente entre señal de urgencia y consulta prioritaria: la lista orienta, no diagnostica; un cambio nuevo o progresivo merece comunicación local aunque no encaje en una categoría.
- Cinco señales desarrolladas con observables y límites: respiración/color, conciencia/convulsiones, trauma/sangrado, posible intoxicación y abdomen distendido con arcadas improductivas.
- Primeros minutos en secuencia numerada: nombrar la señal, pedir apoyo, reducir movimiento, llamar y confirmar entrada/capacidad.
- Preparación de llamada: guion breve, datos de evento/evolución/exposición/medicamentos y división de tareas.
- Qué llevar y qué evitar: evidencia segura de posible intoxicación, no dar remedios ni inducir vómito por cuenta propia, no convertir la guía en manual de maniobras.
- Triage: qué puede preguntar el equipo, por qué puede cambiar el orden y cómo comunicar cambios mientras se espera.
- Confirmación local: sede, especie, horario/acceso, capacidad, depósito/derivación; el directorio orienta y la sede confirma.
- FAQ breve: cuatro dudas que resuelven decisiones reales sin abrir nuevos temas clínicos.

## Contrato clínico

Claims nuevos o desglosados: **C8–C15** en `clinical-evidence-dossier-2026-09-09.md`. Todos reutilizan S1–S6, con locators, fecha de consulta 2026-09-09 y alcance explícito. No se añadieron fuentes nuevas porque la ampliación no necesita una maniobra ni una afirmación fuera del dossier.

## Mapa visual de esta fase

1. **Hero reutilizado, ya integrado:** `hero-traslado-seguro-1600.webp` con variantes 640/1280/1600, alt y disclosure del manifest. Debe seguir siendo ilustración de preparación calmada, no evidencia clínica.
2. **Bloque “Si el traslado se complica”:** se integró `transport-safe` como fotografía editorial de un perro tranquilo sobre una manta en un vehículo estacionado. Alt: `Perro tranquilo sobre una manta mientras su cuidadora prepara el traslado en un vehículo estacionado.` Caption/disclosure: `Imagen ilustrativa sintética: un traslado preparado con calma en un vehículo estacionado. No representa un caso real ni una indicación clínica completa.` Prohibiciones: no mostrar RCP, presión, agujas, medicamentos, sangre, teléfonos, clínica o promesa de disponibilidad.
3. **Bloque “Qué información ayuda”:** se integró `information-prep` como naturaleza muerta editorial de objetos neutrales para reunir información y preparar el traslado. Alt: `Manta, correa, bolso de traslado y cuaderno preparados para reunir información de una urgencia veterinaria.` Caption/disclosure: `Imagen ilustrativa sintética: objetos que pueden ayudar a organizar un traslado y una llamada. La información escrita del artículo es la que guía qué reunir; no representa un caso real.` Prohibiciones: no incluir números de toxicología, precios, pantallas con datos estadounidenses, diagnósticos, dosis ni nombres de productos.
4. **Bloque “Qué esperar al llegar”:** podría usar una ilustración sobria de recepción/triage sin pacientes identificables. Alt propuesto: `Recepción veterinaria organizando la prioridad de atención de varios casos.` Caption/disclosure: `Escena ilustrativa: el orden de atención depende del triage y no representa una sede concreta.` Prohibiciones: no logos, uniformes reconocibles, reloj con tiempo de espera, paciente sufriendo, resultado clínico, disponibilidad 24/7 ni afirmación de que Vet24cr atiende el caso.

El hero existente no se reemplaza. Las dos imágenes de apoyo están integradas en el Markdown con variantes WebP, `srcset`, `sizes`, dimensiones, `loading="lazy"`, alt y disclosure; sus hashes y fuentes originales están en el manifest. La auditoría negativa visual/HTML sigue pendiente antes de publicar.

## Límites de SEO y localización

Se conservan URL, H1, intención y CTA. No se añade `dateModified` solo por ampliar texto; la fecha editorial visible se mantiene mientras no exista una decisión de publicación. El artículo no reproduce teléfonos, precios, disponibilidad ni instrucciones operativas de APCC/Poison Control, y no presenta horarios/capacidad del directorio como hechos garantizados.

## Salida esperada

Longitud objetivo orientativa: aproximadamente 2.300–2.800 palabras solo si cada bloque resuelve una duda o reduce una mala decisión. La versión entregada tiene aproximadamente 2.770 palabras de prosa editorial según el conteo local actualizado, excluyendo el HTML de las figuras. Pasó el preflight semántico/telefónico, `git diff --check` y el build del repositorio; no se ejecuta publicación, commit ni push.
