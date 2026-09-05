# Las 21 comprobaciones, y cuáles aplican a tu sitio

El escáner de isitagentready.com agrupa 21 comprobaciones en cinco categorías y
las convierte en un nivel de 1 a 5. Las guías oficiales de cada una viven en
`https://isitagentready.com/.well-known/agent-skills/<nombre>/SKILL.md` y son la
fuente autoritativa: leelas antes de implementar, porque cambian.

## Matriz de decisión

Antes de implementar nada, decidí qué aplica. Perseguir las 21 en un sitio que
no las necesita produce documentos falsos.

| Comprobación | Blog / sitio editorial | Directorio o catálogo | SaaS con cuentas | Tienda |
|---|---|---|---|---|
| `robotsTxt`, `sitemap` | Sí | Sí | Sí | Sí |
| `robotsTxtAiRules` | Sí | Sí | Sí | Sí |
| `contentSignals` | Sí | Sí | Sí | Sí |
| `linkHeaders` | Sí | Sí | Sí | Sí |
| `markdownNegotiation` | Sí | Sí | Sí | Sí |
| `apiCatalog` | Solo si hay API | Sí | Sí | Sí |
| `agentSkills` | Opcional | Sí | Sí | Sí |
| `ard` | Opcional | Sí | Sí | Sí |
| `mcpServerCard` | No | Sí, si hay algo que consultar | Sí | Sí |
| `a2aAgentCard` | No | Opcional | Opcional | Opcional |
| `webMcp` | No | Sí, si hay buscador | Sí | Sí |
| `authMd` | Sí (declarando acceso anónimo) | Sí | Sí | Sí |
| `oauthDiscovery`, `oauthProtectedResource` | **No** | **No** | Sí, si ya hay OAuth | Sí, si ya hay OAuth |
| `webBotAuth` | Solo si tu sitio **envía** peticiones como bot | ídem | ídem | ídem |
| `dnsAid` | Ver advertencia abajo | ídem | ídem | ídem |
| `x402`, `mpp`, `ucp`, `acp`, `ap2` | No | No | Solo si vendés | Sí |

Las de comercio se marcan `neutral`, no `fail`, en un sitio que no vende: no
penalizan.

---

## Discoverability

### `robotsTxt`
Un `robots.txt` válido (RFC 9309) con `User-agent` y reglas. Trivial.

### `sitemap`
Un sitemap declarado desde `robots.txt`. **Ojo con la ruta**: si tu generador
emite `sitemap-index.xml` y no `sitemap.xml`, el escáner lo encuentra por la
directiva `Sitemap:`, pero varias herramientas y varias IAs piden primero
`/sitemap.xml` y reportan un 404 inexistente. Un 301 de `/sitemap.xml` al índice
cuesta una línea y evita el falso positivo. En la auditoría cruzada de FuenteAI,
**tres de las cinco IAs** reportaron ese 404 como un fallo del sitio.

### `linkHeaders`
Cabeceras `Link` (RFC 8288 / RFC 9727 §3) en la respuesta de la portada, con
relaciones **registradas**: `api-catalog`, `service-desc`, `service-doc`,
`describedby`. Vale una sola cabecera con valores separados por comas.

Un agente que solo hace `GET /` se lleva así las rutas legibles por máquina sin
adivinar. Emitirla en todo el sitio, no solo en la portada, sirve para el agente
que aterriza en una página interna desde un buscador.

### `dnsAid`
Registros `SVCB`/`HTTPS` bajo `_agents.tudominio.com`, más DNSSEC.

**Lo primero, porque cuesta una tarde descubrirlo: este check NO mira los
registros `TXT`.** Solo cuenta `SVCB` y `HTTPS` (`serviceRecordCount`). Los
`TXT` de `_index._agents` y `_catalog._agents` sí sirven —alimentan el check
`ard` como cuarto mecanismo de descubrimiento— pero no mueven `dnsAid` ni un
milímetro.

El criterio menciona claves experimentales `keyNNNNN`, y es fácil leer eso como
un bloqueo. No lo es: **son para parámetros *custom*, que son opcionales.** El
ejemplo canónico del propio criterio no lleva ninguno:

```dns
_a2a._agents.example.com. 3600 IN SVCB 1 agent.example.com. alpn="a2a" port=443 mandatory=alpn,port
```

Solo `alpn`, `port` y `mandatory`. Nada que inventar. El `alpn` lleva un token
propio del protocolo (`a2a`, `mcp`), no `h2`: no es un ALPN real de TLS, es una
etiqueta de descubrimiento, y así lo usa el ejemplo oficial.

Lo que **sí** queda sin resolver es que `SVCB` apunta a un host y un puerto, no
a una ruta: `/mcp` no cabe en el registro. Ahí sí haría falta un `keyNNNNN`, y
ahí sí conviene no inventar nada — el agente encuentra la ruta por el manifiesto
ARD, que es a lo que apuntan los `TXT`.

En Cloudflare el tipo `SVCB` existe en el panel gratuito, con campos separados
de prioridad, destino y valor.

**Orden recomendado**: activar DNSSEC, publicar los `TXT` (ganan `ard`),
publicar los `SVCB` de los endpoints que existan de verdad, y escanear leyendo
`details.serviceRecordCount` y `details.dnssecValidated`.

En FuenteAI este orden funcionó: con DNSSEC más dos `SVCB` (`_mcp` y `_a2a`),
el check pasó con `serviceRecordCount: 2` y `dnssecValidated: true`. **Basta con
que exista uno de los puntos de entrada**: el mensaje fue "discovery record
found at `_a2a._agents`". No hace falta cubrir `_index`, `_a2a` y `_mcp` los
tres.

---

## Content Accessibility

### `markdownNegotiation`
Una petición con `Accept: text/markdown` debe devolver `Content-Type:
text/markdown`. Dos caminos:

- **Sin código**: activar "Markdown for Agents" en el panel de Cloudflare si el
  dominio está en una zona de Cloudflare.
- **Con código**: generar un espejo `.md` de cada página en build y servirlo
  desde un Worker/middleware cuando llegue esa cabecera.

El espejo duplica contenido, así que va con `X-Robots-Tag: noindex` y fuera del
sitemap. Pero **la cabecera `noindex` no debe viajar con la URL negociada**: esa
URL sí es indexable. Y hay que emitir `Vary: Accept` en ambas ramas, o una caché
intermedia le sirve Markdown a un navegador.

---

## Bot Access Control

### `robotsTxtAiRules`
Pasa con reglas comodín: no hace falta un bloque por bot. Añadir
`User-agent: GPTBot` / `Allow: /` no aporta nada técnico si ya tenés
`User-agent: *` / `Allow: /`.

### `contentSignals`
Una línea en `robots.txt` dentro del bloque `User-agent`:

```
Content-Signal: search=yes, ai-input=yes, ai-train=no
```

- `search` — indexar y enlazar, incluidos buscadores con IA.
- `ai-input` — usarlo como fuente citada al responder (RAG/grounding).
- `ai-train` — usarlo como material de entrenamiento.

**Es una decisión de negocio, no técnica.** Para un sitio que quiere ser citado,
`ai-input=yes` es el punto entero del ejercicio. `ai-train` es donde cada quien
decide. Cerrala con el usuario antes de escribirla.

### `webBotAuth`
Un JWKS en `/.well-known/http-message-signatures-directory` para firmar las
peticiones que **tu sitio envía** como bot. Si tu sitio no envía peticiones
automatizadas a terceros, publicar una clave que no usás es publicar ruido. La
comprobación es informativa y no afecta al nivel.

---

## Protocol Discovery

### `apiCatalog`
`/.well-known/api-catalog` con `Content-Type: application/linkset+json` (RFC
9727). Como el archivo no tiene extensión, el tipo hay que declararlo a mano en
la configuración de cabeceras o se sirve como binario.

Cada entrada necesita un `anchor` y relaciones `service-desc` (tu OpenAPI) y
`service-doc` (documentación legible).

### `oauthDiscovery` y `oauthProtectedResource`
Solo si ya existe un servidor de autorización OAuth/OIDC real. **No las
implementes por conseguir el check.** Publicar
`/.well-known/oauth-authorization-server` apuntando a un servidor inexistente
rompe a cualquier cliente que lo siga.

### `authMd`
`/auth.md` con un H1 que contenga "auth.md".

**Punto importante, comprobado en producción**: el escáner marca `fail` si el
sitio no publica además OAuth Protected Resource Metadata *o* un flujo de
registro completo autocontenido. Un `auth.md` honesto que declara "no hay
autenticación, el acceso es anónimo" **no le basta**, aunque el criterio
publicado diga que un documento autocontenido es válido.

Es un techo real: un sitio público sin cuentas no puede pasar `authMd` sin
inventar un endpoint de registro. La decisión correcta es perder la
comprobación y documentar por qué.

### `mcpServerCard`
`/.well-known/mcp/server-card.json` con `serverInfo` (`name`, `version`), un
`endpoint` de transporte y `capabilities`. **Publicala solo cuando el endpoint
responda de verdad.**

### `a2aAgentCard`
`/.well-known/agent-card.json` con `name`, `version`, `description`,
`capabilities`, `skills` y **`supportedInterfaces`**.

**La trampa de versiones, comprobada contra la spec.** La versión publicada
actual de A2A es **1.0.0**. En ella:

- `supportedInterfaces` es **obligatorio**: *"Ordered list of supported
  interfaces. The first entry is preferred"* (§4.4.1; §8.3.1 se titula
  "Supported Interfaces Declaration").
- Cada entrada es `{url, protocolBinding, protocolVersion}`. El campo es
  **`protocolBinding`**, no `transport`.
- `additionalInterfaces` y `preferredTransport` **no existen** en 1.0: son de la
  0.3.

Es fácil equivocarse al revés —pensar que `supportedInterfaces` es "de una
versión futura" y quitarlo— y quedarse sin el único campo que los clientes 1.0 y
el escáner exigen. En FuenteAI pasó exactamente eso.

Lo correcto es **publicar ambas formas**: la de 1.0 y los campos de la 0.3.
Describen el mismo endpoint, y la spec pide ignorar los campos no reconocidos
(§5.7), así que la tarjeta sirve a clientes de las dos épocas sin mentir en
ninguna.

Y declará en `protocolVersion` de la interfaz **la versión que tu agente habla
de verdad**, no la última que exista. Poner `1.0` sin implementar lo que 1.0
exige (el `tenant` de §8.3.2, entre otras cosas) es prometer de más.

### `agentSkills`
`/.well-known/agent-skills/index.json` (Agent Skills Discovery v0.2.0) con
`$schema`, y por cada skill `name`, `type`, `description`, `url` y un `digest`
`sha256:` del artefacto.

**Generá el índice en build, nunca a mano**: el digest se queda obsoleto en la
primera edición del `SKILL.md`, y un cliente que lo verifique descarta la skill.
Y ojo con los finales de línea: el digest se calcula sobre los bytes, así que
con `core.autocrlf=true` un checkout en Windows genera un índice distinto. Se
arregla con `.gitattributes` (`text eol=lf`) más una comprobación en el script.

### `webMcp`
Herramientas registradas con `navigator.modelContext.registerTool()`. El script
debe correr al cargar la página y **no hacer nada** si el navegador no
implementa la API — hoy, casi todos.

Se puede verificar en local con un navegador headless inyectando un stub de
`navigator.modelContext` que capture los registros.

### `ard`
`/.well-known/ai-catalog.json` con `specVersion`, `host` y `entries`. Cada
entrada necesita `identifier` (`urn:air:<fqdn>:<namespace>:<nombre>`),
`displayName`, `type` (un media type) y **exactamente uno** de `url` o `data`,
nunca los dos. Requiere `Access-Control-Allow-Origin: *`.

Añadí los dos mecanismos secundarios, que son gratis: `Agentmap:` en robots.txt
y `<link rel="ai-catalog">` en el `<head>`.

---

## Commerce

`x402`, `mpp`, `ucp`, `acp`, `ap2`. Protocolos de pago agéntico. En un sitio que
no vende se marcan `neutral` y no penalizan. No los toques salvo que vendas.
