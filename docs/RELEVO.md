# Relevo de Vet24 Costa Rica

Estado al 26 de noviembre de 2026. El directorio está en producción y el piloto SEO de Cartago ya está publicado. El próximo hito es la primera revisión de resultados el 4 de diciembre. El MCP de Search Console está implementado y probado con datos simulados. Falta conectarlo a la propiedad real.

## Para retomar

1. Leé [`TODO.md`](../TODO.md) y revisá primero las tareas con fecha vencida o próxima.
2. Comprobá la rama de trabajo y el último commit de `main` antes de editar. Para cambios de código, usá `npm ci`, `npm run build:no-shorten`, `npm run check` y `npm test`.
3. Antes de cerrar la sesión, anotá qué quedó en producción, qué verificaste y cuál es el siguiente paso. Guardá las ideas y vencimientos en [`TODO.md`](../TODO.md).

Mensaje para otra sesión: «Leé `docs/RELEVO.md` y `TODO.md` de Vet24. Decime qué está vencido o por vencer y retomá el pendiente que acordemos».

## Publicación y estado actual

- La rama `main` publica en el Worker `vet24-cr` mediante Cloudflare Workers Builds. Verificá el resultado en Cloudflare y después en la URL pública. Las pruebas de GitHub Actions usan Ubuntu 24.04 para ejecutar Chromium.
- El arreglo de enlaces eliminó los 74 errores 404 bajo `/zona/` del rastreo de Ubersuggest. El puntaje técnico del sitio pasó de 89 a 97/100. [PR #47](https://github.com/Gunz-cop/Vet24-cr/pull/47)
- El piloto de Cartago entró en `main` en `689e761`. El cambio está publicado con un título nuevo y cinco enlaces de llamada. Ubersuggest rastreó su URL y no señaló problemas de acceso o título. [PR #48](https://github.com/Gunz-cop/Vet24-cr/pull/48) · [Página de Cartago](https://vet24cr.com/provincia/cartago/)
- La tarea «Revisiones SEO de Cartago en Vet24» corre el 4 y el 11 de diciembre a las 9:00 a. m., hora de Costa Rica. Consulta el seguimiento de Ubersuggest y deja cada resultado en el historial de la tarea. Si no tenés acceso al historial, repetí la consulta y anotá la fecha real.

## Cómo seguir con Search Console

El código del MCP está en el commit `8a5eb61` del repositorio local `/workspace/search-console-mcp`. Su paquete de recuperación `search-console-mcp.bundle` está en el espacio de trabajo y guardado en el Drive privado del dueño. Cloná el paquete con `git clone search-console-mcp.bundle search-console-mcp`. GitHub rechazó la creación del repositorio privado desde esta sesión.

El Worker está configurado con `sc-domain:vet24cr.com` y ofrece consultas de rendimiento e inspección de URLs. Pasaron la comprobación de tipos, la compilación de Cloudflare y la prueba de las dos herramientas con Google simulado, incluido el rechazo de propiedades fuera de la lista permitida.

Para completar la conexión, habilitá Search Console API en Google Cloud, concedé a una cuenta de servicio dedicada permiso de lectura en la propiedad de Vet24 y seguí el `README.md` del MCP para cargar los secretos y desplegar. Confirmá una consulta real de rendimiento y una inspección de la página de Cartago antes de usarlo en las revisiones. Si el MCP aún no está conectado cuando llegue una fecha, hacé la revisión disponible en Ubersuggest.
