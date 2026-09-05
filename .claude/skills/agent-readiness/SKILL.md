---
name: agent-readiness
description: Preparar un sitio web para que agentes de IA lo encuentren, lo lean y lo citen — Content Signals, cabeceras Link, llms.txt, espejo Markdown, servidor MCP, agente A2A, WebMCP, Agent Skills y ARD — y auditarlo con el escáner de isitagentready.com y con varias IAs en paralelo. Usá esta skill cuando el usuario quiera que su sitio "aparezca en ChatGPT/Claude/Perplexity", pida implementar MCP o llms.txt, hable de AEO/GEO o de "optimizar para IA", pregunte por qué los asistentes no lo citan, o pida auditar la accesibilidad de un sitio para agentes. Sirve para cualquier repo, no solo FuenteAI.
---

# Preparación de un sitio para agentes de IA

Este método llevó a `fuenteai.com` del **nivel 1 (Basic Web Presence) al nivel 5
(Agent-Native) con 81/100**, el último de la escalera, en las 21 comprobaciones de
[isitagentready.com](https://isitagentready.com), y lo validaron después cinco
IAs distintas auditando el sitio en vivo. El registro completo de ese trabajo,
con lo que salió mal, está en `docs/hito-agent-readiness.md`.

Esta skill empaqueta el método para repetirlo en otro sitio.

## La regla que gobierna todo

**No se publica el documento de descubrimiento de una capacidad que no existe.**

Un `.well-known/` no es una declaración de intenciones: es un endpoint que otro
software va a intentar usar. Una tarjeta MCP sin servidor detrás, o metadatos
OAuth sin servidor de autorización, no "suben la nota" — rompen al cliente que
se los cree, y ese cliente es el asistente que querías que te citara.

De ahí se derivan las tres decisiones que más ahorran tiempo:

1. **Construir el servicio antes que la tarjeta.** Si vas a publicar
   `/.well-known/mcp/server-card.json`, primero tiene que responder `/mcp`.
2. **Lo que no aplica se documenta, no se falsea.** Un sitio sin autenticación
   no publica metadatos OAuth: publica un `auth.md` que dice que el acceso es
   anónimo y por qué. Perderás esa comprobación. Es el precio correcto.
3. **Una sola fuente de verdad.** Lo que lee el agente sale de las mismas
   colecciones que generan el HTML. Si son dos caminos distintos, divergen en la
   primera edición y el agente empieza a citar datos que la página ya no dice.

## Cómo empezar

1. **Escanear antes de tocar nada**, para tener la línea base:

   ```bash
   node .claude/skills/agent-readiness/scripts/scan.mjs https://midominio.com
   ```

   La web de isitagentready.com renderiza el resultado en el navegador y su ruta
   `/<dominio>` devuelve 404 al servidor: no se puede leer con curl. El escaneo
   real es un `POST /api/scan`, que es lo que hace ese script.

   **Escaneá siempre completo.** La interfaz ofrece perfiles reducidos
   («Content Site» y similares) que suben la puntuación apagando categorías
   enteras. Eso no mide mejor: mide menos. En FuenteAI, el perfil Content Site
   daba 86 frente a 75 del completo, y lo conseguía **no mirando** la categoría
   donde estaba todo el trabajo (MCP, agent card, api-catalog, agent skills).
   Un perfil sirve para leer una categoría de cerca, nunca para reportar.

2. **Decidir qué aplica a este sitio.** Ver `references/comprobaciones.md`: las
   21 comprobaciones con lo que pide cada una y una matriz de qué implementar
   según el tipo de sitio. Un blog personal y una tienda no necesitan lo mismo,
   y perseguir las 21 en un sitio que no las necesita produce exactamente los
   documentos falsos que la regla de arriba prohíbe.

3. **Implementar por capas**, de menos a más coste, en este orden:
   `references/implementacion.md` tiene las mecánicas y, sobre todo, las trampas
   que costaron horas.

4. **Auditar con varias IAs en paralelo** cuando esté en producción:
   `references/auditoria-cruzada.md` y el prompt de
   `templates/prompt-auditoria.md`. Esto es lo que valida que un agente real
   —no el escáner— encuentra, recupera y entiende el sitio.

## El orden de implementación, y por qué

| Capa | Qué | Coste | Rinde desde |
|---|---|---|---|
| 1 | `Content-Signal` en robots.txt, cabeceras `Link`, `llms.txt` | Minutos | Ya: los rastreadores de IA existen hoy |
| 2 | Espejo Markdown + negociación `Accept: text/markdown` | Horas | Ya |
| 3 | API JSON del contenido + OpenAPI + `/.well-known/api-catalog` | Horas | Ya, y es la base de todo lo demás |
| 4 | Agent Skills, ARD (`ai-catalog.json`) | Horas | Cuando los registros de agentes lo indexen |
| 5 | Servidor MCP, agente A2A, WebMCP | Días | Apuesta a 12 meses |
| — | DNS-AID | Fuera del repo (DNS + DNSSEC) | Ya; se validó en producción |

**La capa 1 y la 2 son las que rinden hoy.** Los rastreadores de ChatGPT,
Perplexity y Google ya pasan por tu sitio: darles texto limpio en vez de HTML
con menús mejora lo que citan *ahora*. El MCP no lo descubre nadie por
accidente: hay que darlo de alta en registros y decírselo a la gente, o recibe
cero llamadas.

Si solo vas a hacer una cosa, hacé la capa 1.

## No negociables

- **Escanear antes y después, y siempre completo.** Sin línea base no sabés qué
  cambió. Y la puntuación de un perfil reducido no es comparable con la del
  escaneo completo: si la reportás, va con la etiqueta de parcial y el número de
  comprobaciones que incluyó.
- **Nunca fabricar un `claim_uri`, un `register_uri`, un `authorization_server`
  ni un `keyNNNNN` de DNS-AID** porque una comprobación lo pida. Si el dato no
  existe, la comprobación se pierde y se documenta el motivo.
- **El código de agentes no puede tumbar la web.** Todo lo que añadas delante
  del sitio va con su propia contención de errores y cae a servir el HTML de
  siempre. Ver la trampa del cuerpo consumido en `references/implementacion.md`.
- **Un test por cada fallo que encuentres.** Los tres fallos más caros de este
  trabajo fueron de configuración o de plataforma, invisibles para cualquier
  test de runtime. Cada uno tiene ahora un test que lo blinda.
- **Auditar en producción, no en local.** El escáner audita el dominio real. Un
  build verde en local no dice nada sobre el nivel.

## Handoff

Al terminar, entregá al usuario:

- el nivel antes y después, con la salida del escáner;
- qué comprobaciones quedaron sin pasar **y por qué cada una** — separando "no
  aplica" de "cuesta demasiado" de "requiere una decisión de negocio";
- las decisiones de negocio que quedan abiertas (la línea `Content-Signal` es
  siempre una);
- lo que hay que hacer fuera del repo (DNS, permisos del token de despliegue).
