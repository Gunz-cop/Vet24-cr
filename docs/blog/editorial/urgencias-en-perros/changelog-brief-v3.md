# Changelog — brief v3

Fecha: **2026-09-09**  
Base exacta: `c02b65f56bae6562b9b15373b80ed437b4df8d90`  
Documento: [brief-v3.md](brief-v3.md)  
Estado: **REVISE; no autoaprobado**

## Cambios de esta revisión

1. Añadí a cada fuente clínica las columnas separadas de fecha disponible/actualización y fecha de consulta, con los datos visibles y su procedencia.
2. Incorporé la regla dura de no reproducir teléfonos, precios, disponibilidad ni instrucciones operativas de APCC/Poison Control de EE. UU.; añadí el escaneo negativo sobre cuerpo, citas, imágenes, alt text y metadatos.
3. Ajusté C5 para no convertir Merck en una prohibición absoluta: la especificación exige «no intentés inducir el vómito ni dar remedios por cuenta propia; consultá primero», respaldada conjuntamente por S4 y S5.
4. Limité S6/AVMA a llamada al hospital local, preparación del traslado, reducción de movimiento y seguridad no invasiva; excluí explícitamente RCP, compresiones, respiración de rescate, enfriamiento, presión, dosis, teléfonos y demás maniobras.
5. Conservé SERP/competencia y EEAT A/B como gates explícitamente bloqueados; documentarlos no los marca como resueltos.

## Validación y alcance

- El checkout de trabajo sigue en `c02b65f56bae6562b9b15373b80ed437b4df8d90`.
- Solo se añadieron estos dos documentos dentro de `docs/blog/editorial/urgencias-en-perros/`.
- El baseline, brief v1 y brief v2 se conservaron sin editar.
- No se modificó el artículo ni infraestructura; no se ejecutó build porque el cambio es exclusivamente documental.
- No hubo commit, push, publicación ni cierre de auditoría.
