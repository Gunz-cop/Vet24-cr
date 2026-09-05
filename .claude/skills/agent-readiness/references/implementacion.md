# Implementación: mecánicas y trampas

Lo genérico primero; después, lo específico de Astro + Cloudflare Workers, que
es donde se hizo. Las trampas del final son la parte que ahorra tiempo: cada una
costó al menos una hora de depuración y ninguna aparece en la documentación de
los estándares.

## La arquitectura que funcionó

Sitio estático + una capa delgada delante que hace **solo** lo que un archivo
estático no puede hacer:

```
petición
   │
   ├─ /mcp                   ──► servidor MCP (Streamable HTTP)
   ├─ /a2a                   ──► agente A2A (JSON-RPC)
   ├─ Accept: text/markdown  ──► espejo /md/**.md
   └─ resto                  ──► los assets de siempre + Vary: Accept
```

Dos propiedades que hay que preservar:

1. **Aislada en un módulo, detrás de una sola función.** `tryAgentRoutes(request,
   env)` devuelve `null` en cuanto la petición no es suya. Integrarla en un
   router existente son dos líneas. Si repartís esta lógica por el router
   principal, el día que ese router cambie se rompe todo.
2. **Su entorno pide el mínimo.** Declarar `AgentEnv` con solo el binding de
   assets, y con **la misma firma** que use el `Env` del proyecto. Si la
   ensanchás (`Request | string` cuando el suyo dice `Request`), el `Env` del
   proyecto deja de encajar y toca modificarlo.

## Una sola fuente de verdad

Un módulo —`agent-content.ts` en este repo— deriva de las mismas colecciones de
contenido que generan el HTML:

- `/llms.txt` y `/llms-full.txt`
- `/api/catalog.json` y su OpenAPI
- el espejo Markdown de cada página
- lo que devuelven las herramientas MCP y el agente A2A

El servidor MCP **no** lleva una copia del catálogo dentro: lee el mismo
`/api/catalog.json` que se generó en build. Así no puede desincronizarse.

## Qué exponer en el API para agentes

Lo que la mayoría olvida: además de los campos obvios (nombre, URL, categoría),
incluí **lo que impide que el agente dé una respuesta peligrosa o incompleta**.
En un directorio de descargas eso fue `safetyNotes` y `faq`; en un sitio de
salud animal serían las contraindicaciones y cuándo ir al veterinario.

Un cliente que tiene el enlace pero no la advertencia da peor respuesta que la
propia página. Ese es el fallo que hay que evitar.

## Astro + Cloudflare Workers: dónde va cada cosa

| Recurso | Dónde |
|---|---|
| `Content-Signal`, `Agentmap` | `public/robots.txt` |
| Cabeceras `Link`, tipos MIME, CORS, `noindex` | `public/_headers` |
| `.well-known/**` estáticos | `public/.well-known/` (Astro copia los dotfiles) |
| `/llms.txt`, `/api/*.json` | Endpoints de Astro (`src/pages/*.ts`) |
| Espejo Markdown | Endpoint con `getStaticPaths` que emite `.md` |
| MCP, A2A, negociación | Worker en `worker/agents/` |
| Índice de Agent Skills | Script en la cadena de build, antes de `astro build` |

---

# Las trampas

## 1. `not_found_handling: "404-page"` impide que el Worker se ejecute

Con esa opción, el router de assets responde el 404 **él mismo** y el Worker
nunca corre. Consecuencia: `POST /mcp` devuelve 405 sin que tu código llegue a
verlo.

Hay que listar las rutas en `assets.run_worker_first`, **aunque no sean
archivos**:

```jsonc
"run_worker_first": ["/mcp", "/a2a", "/", "/sv", "/it", "/es/*", "/sv/*", "/it/*"]
```

Esto afecta también a cualquier API que ya tuvieras: en este repo, las rutas
`/api/hw/*` de otra app llevaban tiempo sin llegar al Worker por este mismo
motivo, y nadie lo había notado.

## 2. `"/sv/*"` no matchea `"/sv"`

Cada portada de idioma necesita su entrada **exacta** además del comodín. Sin
ella, `/sv` devuelve HTML aunque le pidan Markdown. Es un fallo de configuración
que ningún test de runtime detecta: hay que testear la lista.

## 3. La red de seguridad puede caerse sola

El patrón obvio —`try { ... } catch { return env.ASSETS.fetch(request) }`— **se
rompe** si el handler ya leyó el cuerpo de la petición:

```
TypeError: Cannot reconstruct a Request with a used body
```

Un error manejable se convierte en un 500 sin cuerpo, que es lo contrario de lo
que esa red existe para hacer. La contención tiene que vivir **dentro del módulo
que consume el cuerpo**: ahí se responde un error JSON-RPC en condiciones, y
solo las rutas GET/HEAD reintentan contra los assets.

## 4. `Origin` en MCP: la política del sitio no sirve

La spec de MCP Streamable HTTP obliga a validar `Origin` contra DNS rebinding.
Pero **la política habitual —exigir que `Origin` sea el propio sitio— deja el
servidor inservible**: los clientes MCP reales (Claude Desktop, los conectores
de ChatGPT, un script) no son navegadores y **no envían `Origin` en absoluto**.

La regla correcta para un servidor público de solo lectura:

| `Origin` | Respuesta |
|---|---|
| ausente | Permitir. Es el cliente MCP normal. |
| igual al sitio | Permitir, y devolver **ese** origen en CORS. |
| cualquier otro | 403, sin ninguna cabecera CORS. |

Nunca `Access-Control-Allow-Origin: *` en `/mcp` ni `/a2a`: el comodín autoriza
a cualquier página a leer la respuesta desde el navegador de un tercero, que es
justo lo que la validación impide. En los estáticos sí, y ahí es correcto.

## 5. El digest de Agent Skills depende de los finales de línea

Se calcula sobre los bytes, que es lo que se sirve y lo que el cliente vuelve a
hashear. Con `core.autocrlf=true`, un checkout en Windows convierte LF a CRLF y
el mismo repositorio genera un índice distinto. Dos barreras:

- `.gitattributes`: `public/.well-known/agent-skills/** text eol=lf`
- El script falla si encuentra CRLF — `.gitattributes` normaliza el checkout,
  pero no impide que un editor guarde CRLF antes.

## 6. Un test que se salta no es un test

Si la validación del artefacto construido corre **antes** del build, se salta en
un árbol limpio y no se repite: en CI no se ejecuta nunca. Relanzala después del
build con una variable que convierta el `skip` en fallo.

## 7. Node exige extensiones en los imports

Si vas a testear los módulos del Worker con `node --test` (type stripping
nativo), los imports entre ellos necesitan extensión `.ts` explícita. esbuild
los resuelve igual, así que no cuesta nada.

## 8. El prefijo `/api/` es demasiado ancho

Si tu router captura `url.pathname.startsWith('/api/')` y además publicás
`/api/catalog.json` como asset estático, un `GET` a ese archivo se convierte en
un 405. Acotá el filtro al prefijo real de tu API (`/api/hw/`, `/api/v1/`).

---

## Qué testear

Los tres fallos más caros fueron de configuración o de plataforma. Los tests que
los blindan:

| Test | Qué cubre |
|---|---|
| Cobertura de `run_worker_first` | Que toda ruta que debe pasar por el Worker esté listada, portadas de idioma incluidas. Es config: ningún test de runtime lo ve. |
| Los tres casos de `Origin` | Ausente 200, propio 200 con CORS acotado, ajeno 403 sin CORS. |
| Negociación en todas las rutas con espejo | Incluidas las portadas, que es donde falló. |
| Fuente de datos caída | Que salga como error del protocolo, no como excepción. |
| Petición con el cuerpo ya consumido | Que ninguna excepción escape de las rutas POST. |
| Campos críticos del API | Que ninguna ficha publicada llegue sin sus advertencias. |
