# Acta de cierre — Subfase B1

Fecha: 2026-09-07
Estado: **CERRADA**, bajo la excepción de base inobtenible del plan §7.4
Autorizada por: el usuario, 2026-09-07, de forma explícita

## SHAs

| | |
|---|---|
| BASE | `89a365b8c374cdbf9912a07425ed68e34a496464` |
| Candidato de producto | `dc2581ab444ffbeebbc0bcd2ccc373da23ac2f28` |
| Evidencia de la ejecutora | `b3de9ed945176ef78df733962d952844fddfdd0e` |
| Merge de producto (PR #25) | `3edb6bcca050b110a491723846ec6f3a1ebed65b` |
| Evidencia de la verificadora | `7d148cba554b9ffe37a9107ef439379fc363858e` |

Todos los PRs y ramas asociados a B1 están fusionados en `main`. No queda
ninguno abierto. El cierre no se declaró por la palabra mágica de GitHub:
no se usó `Closes` en ninguna descripción.

## Qué se verificó y quién

Tres partes independientes tocaron este candidato:

1. **Ejecutora** — implementó y reportó (`blog-ejecutora.log`, capturas,
   `visual-dom.json`, `teclado.json`).
2. **Coordinadora** — reprodujo `check`, `test`, `build:no-shorten`,
   `blog.mjs`, `agent-markdown.mjs` y `agent-catalog.mjs` sobre el candidato;
   comprobó la ausencia del borrador contra el `dist` real y no sólo contra
   el verificador de la ejecutora; midió el orden de tabulación con Chromium;
   leyó el diff completo y la allowlist.
3. **Verificadora independiente** — informe completo en
   `informe-verificacion.md`, con controles productivos, escaneo de los 22
   identificadores y rectificación de su propio hallazgo.

CI concluyó `success` sobre el candidato (`b3de9ed`, run 34087484276) y sobre
`main` tras el merge (`3edb6bc`, run 34087689122).

## Los cuatro bloqueos reportados

| Bloqueo | Desenlace |
|---|---|
| Foco invisible en `#nav-directory` a 390×844 | **Retirado por falso.** La verificadora se rectificó; la coordinadora lo midió por separado con Chromium. `display:none` bajo 768px excluye el elemento del orden de Tab. `teclado.json` queda corroborado. `BaseLayout.astro` está además intacto desde la BASE. |
| Falta de navegación entrante al blog | **Retirado por obsoleto.** Resuelto en `main` `52ed4db`: la entrada tiene dueño en B3, condicionada a artículos publicados. |
| Piloto serializado en un chunk de `dist/server` | **Resuelto por enmienda.** `assets.directory = ../client`: sólo `dist/client` se sirve. El borrador viaja en el bundle pero no es recuperable (404 en producción, cero ocurrencias en el HTML de `/blog/`). No es incumplimiento de B1 —el criterio escrito no lo cubría— y el plan §4 fija ahora la frontera, amplía el control en B2 y establece una regla dura desde B4. |
| Sin base comparable para el escaneo de 22 identificadores | **Cerrado bajo excepción.** Ver abajo. |

## La excepción invocada

`base-agent-scan.json` declara `not_verified`. Ese hueco es **irrecuperable**:
la BASE era un estado pasado de producción, y producción sirve un único estado
a la vez. No existe forma de escanearlo retroactivamente.

Lo que sí existe y queda archivado:

- El escaneo productivo íntegro de los 22 identificadores
  (`production-agent-scan.json`, 2026-09-07T06:03:42Z).
- Su comparación identificador por identificador contra el escaneo AR
  archivado más reciente (`agent-scan-comparison.json`, base histórica
  `docs/agent-readiness/evidencia/scan-completo-22.json` del 2026-09-05).
- Resultado: **ningún identificador que estuviera en `pass` pasó a `fail` o
  `neutral`.** Tres mejoraron de `fail` a `pass` —`linkHeaders`,
  `markdownNegotiation`, `contentSignals`—, coherente con que la base
  histórica es anterior al cierre de AR2 y AR3.

Esa comparación es **informativa, no contractual**, y se rotula como tal.

**Por qué faltó la base**, para que no se repita: el plan exigía el escaneo
base pero no lo declaraba precondición bloqueante, así que la ejecutora
arrancó sin él y lo declaró `not_verified` al final, honestamente. La enmienda
de §7.4 lo convierte en precondición bloqueante de cada subfase, junto con
`base.json`. B2 no puede empezar sin ejecutarlo y archivarlo.

## Lo que sigue sin verificarse

No se presenta nada de esto como comprobado:

- No existe objeto `deployment` de GitHub ni cabecera HTTP pública con el SHA
  servido. La asociación disponible es el check de Workers Builds que vincula
  el SHA de merge con el build de producción (`deployment-sha.log`).
- Los 11 skips heredados de E2E se registran como **no verificados**, nunca
  como `pass`, y no autorizan skips nuevos.
- El panel de Ezoic no se comprobó. Las dos claves nuevas siguen en `null`.
- El blog no será visible navegando hasta B4, por decisión deliberada.

## Deuda que B1 deja abierta

1. **Regex del sitemap** (`astro.config.mjs:15`): sin anclaje inicial y con
   separador inicial opcional. B1 la neutraliza con una defensa de build que
   bloquea slugs afectados. La reparación es una tarea AR separada, con issue,
   propietario y verificación propios. No creada.
2. **Ampliación de `blog.mjs`** a `dist/server`, asignada a B2.
3. **Regla dura de borradores** desde B4.

## Precondiciones de B2

Antes de tocar código, B2 debe ejecutar y archivar el escaneo base de §7.4 y
crear `docs/blog/evidencia/b2/base.json` con `baseSha` inmutable igual al
`main` remoto vigente en ese momento. Ambas son bloqueantes.
