---
name: verificar-upgrade
description: Verifica que un cambio transversal no rompió el sitio FuenteAI/DescargasIA comparando el build nuevo contra una línea base — rutas, HTML renderizado, píxeles e interactividad. Usá esta skill SIEMPRE que vayas a subir dependencias (Astro, Vite, Tailwind, TypeScript, zod, wrangler), refrescar el lockfile o correr `npm audit fix`, tocar `astro.config.mjs`, `tsconfig.json` o los estilos globales, cambiar el bundler o el minificador, o hacer cualquier refactor que afecte a muchas páginas a la vez. Usala TAMBIÉN cuando el usuario diga sólo "actualizá X", "mirá si se puede subir Y", "¿esto rompe algo?" o "el build pasa, ¿está bien?" — que el build pase y los tests estén en verde NO prueba que el sitio se vea ni funcione igual. Si el cambio ya está hecho y no guardaste línea base, decilo cuanto antes: esa ventana no se recupera sin volver atrás.
---

# Verificar que un upgrade no rompió el sitio

`npm run build` en verde significa que el sitio **compila**, no que se vea ni
funcione igual que antes. Los cambios de stack rompen justo por debajo de esa
línea: un minificador distinto reescribe los scripts inline, un compresor de
HTML distinto borra espacios que sí contaban, un procesador de CSS distinto deja
de emitir un prefijo. Nada de eso falla el build.

Esta skill es el método para detectarlo, y sobre todo las trampas que hacen que
una verificación mal hecha diga "todo bien" con el sitio roto.

## Lo primero, antes de tocar nada

**Construí la línea base antes de modificar una sola línea.** Es el único paso
irreversible del método: sin el `dist/` de antes no hay contra qué comparar, y
recuperarlo obliga a deshacer el trabajo.

```bash
npm ci
npm run build:no-shorten        # no `build`: `shorten` reescribe contenido
                                # y mete ruido que no es del upgrade
mkdir -p /tmp/verif/base
cp -r dist /tmp/verif/base/dist
find dist -type f | sort > /tmp/verif/base/rutas.txt
```

Si llegás a la tarea con el cambio ya aplicado y sin línea base, decíselo al
usuario de entrada y ofrecé reconstruirla desde el commit anterior
(`git stash` o `git worktree add`) antes de seguir. No sirve comparar contra
producción: mezcla este cambio con todo lo que se desplegó desde entonces.

## La escalera de comprobaciones

De más barata a más cara. Cada peldaño responde una pregunta que el anterior no
puede.

### 1. ¿Existen las mismas páginas?

```bash
diff /tmp/verif/base/rutas.txt <(find dist -type f | sort)
```

**No filtres la salida.** Es tentador esconder `_astro/` porque son bundles con
hash y "siempre cambian", pero justamente ahí es donde se ve que el CSS o el JS
cambió de contenido: el nombre lleva el hash. Filtrarlo hace creer que el build
salió idéntico cuando no lo es.

Por la misma razón, cuidado con `join` para cruzar hashes: descarta en silencio
los archivos que están en un solo lado, que son precisamente los renombrados.

Un alta o una baja de ruta HTML es una regresión de enrutado y hay que
entenderla antes de seguir.

### 2. ¿Pasa el pipeline entero?

```bash
npm run build:no-shorten        # auditorías + tests + build + test:build + links
npx --no-install tsc --noEmit
npx --no-install wrangler deploy --dry-run --outdir=/tmp/wr
```

Sobre el conteo de tests: `npm test` corre **antes** de `astro build`, así que en
árbol limpio da uno menos (el nivel que exige `dist/api/catalog.json` se salta) y
`test:build` lo vuelve a lanzar después. No es una regresión.

### 3. ¿Dice lo mismo el texto renderizado?

```bash
node .claude/skills/verificar-upgrade/scripts/comparar-texto.mjs \
  --base /tmp/verif/base/dist --nuevo dist
```

Este peldaño existe por un caso concreto: Astro 7 cambió `compressHTML` a `'jsx'`
y dejó de conservar el espacio entre elementos inline que venía de un salto de
línea en el fuente. Resultado: `Redacción FuenteAI·Ver metodología` en 150 fichas.

El script devuelve **candidatos, no defectos**. No ve el CSS, y en un contenedor
flex con `gap` el espacio nunca contaba. Para cada candidato, mirá el contenedor:

- `display: flex` con `gap` → falso positivo, la separación la da el gap.
- Un `<p>`, `<h2>` o `<li>` normal → **defecto real**, confirmalo con el peldaño 4.
- `class="sr-only"` → no se ve, pero un lector de pantalla pierde la pausa. Cuenta.

### 4. ¿Se ve igual?

```bash
node .claude/skills/verificar-upgrade/scripts/comparar-visual.mjs \
  --base /tmp/verif/base/dist --nuevo dist
```

Es el árbitro: el CSS lo aplica un navegador de verdad, así que resuelve los
falsos positivos y negativos de los peldaños anteriores.

El script corre **siempre un control primero** (el build base contra sí mismo).
No es ceremonia: el sitio tiene animaciones de entrada (`.fai-rise`) que hacen
diferir dos capturas del mismo build. Sin medir ese ruido, el 100% de las
páginas parece regresión. Si el control no sale limpio, ninguna conclusión de la
pasada real vale — arreglá el determinismo antes de interpretar nada.

Cuando el control está limpio, lo que queda es real. Para localizarlo, el script
imprime el rango de filas (`y=513..520`); recortá esa franja de ambas capturas y
miralas.

### 5. ¿Sigue funcionando?

```bash
node .claude/skills/verificar-upgrade/scripts/servir.mjs /tmp/verif/base/dist 8081 &
node .claude/skills/verificar-upgrade/scripts/servir.mjs dist 8082 &
node .claude/skills/verificar-upgrade/scripts/probar-interaccion.mjs
```

Comparar archivos nunca detecta que el buscador dejó de filtrar. Cuando cambia
el bundler o el minificador, los scripts inline se reescriben enteros
(`const`→`let`, comillas→backticks) y hay que hacer clic para saber que siguen
vivos. Cero errores de JS es parte del resultado, no un detalle.

## Trampas que ya costaron caro

**Un detector de texto "obvio" da falso negativo.** Si sustituís cada etiqueta
por un espacio, `a</span> <span>b` y `a</span><span>b` producen el mismo texto.
Dos detectores escritos así dijeron "cero diferencias" con el separador roto en
150 fichas. Las inline tienen que valer **nada**.

**El diff carácter a carácter no sirve en HTML.** En un archivo de 190 KB tarda
minutos y despedaza tres cambios lógicos en cientos de fragmentos ilegibles.
Tokenizá en etiquetas y texto (`split(/(<[^>]+>)/)`) y difeá esa lista: separa
limpiamente los hunks de sólo-espacio de los de contenido real.

**Verificá que un arreglo de CSS sobrevive al build.** Lightning CSS reescribe
lo que escribís. Un `-webkit-backdrop-filter` puesto junto a la propiedad sin
prefijar se borra por redundante; puesto en una regla aparte con el mismo
selector, fusiona las dos y descarta **la que no lleva prefijo**. Lo que aguanta
es una utilidad de Tailwind con propiedad arbitraria
(`[-webkit-backdrop-filter:blur(12px)]`), que se emite en su propia regla.
Después de cualquier arreglo así, `grep` sobre `dist/_astro/*.css` y contá.

**Para atribuir un cambio, construí las dos versiones sobre la misma base.**
Comparar contra producción mezcla causas. Si querés saber qué trajo un bump de
Tailwind, construí con la versión vieja y con la nueva sobre el mismo Astro, y
difeá esos dos. Así se ve que el bump cambia dos reglas y que el prefijo perdido
lo trajo otra cosa.

**Un timestamp no es una regresión.** `dist/api/catalog.json` lleva `generatedAt`
y cambia en cada build. Compará el JSON parseado, no los bytes.

**Un navegador moderno no cubre navegadores viejos.** El diff de píxeles corre
en Chromium actual: no dice nada de Safari 16.4–17, que es justo donde muerden
los prefijos perdidos. Cuando toques prefijos o targets de CSS, decilo
explícitamente en el reporte en vez de dejar creer que quedó verificado.

## Cómo reportarlo

Separá siempre tres cosas, porque se confunden:

1. **Idéntico** — lo verificado y sin cambio.
2. **Diferencia aceptada** — cambió, mirás por qué, y es el efecto buscado.
   Decí cuál es y por qué es aceptable (ej.: una insignia queda 4 px más cerca
   porque antes sumaba su margen *más* un espacio accidental).
3. **No verificado** — lo que el método no alcanza: navegadores viejos, el
   workflow que sólo corre al fusionar, el binding que no responde en local.
   Esto es lo más fácil de omitir y lo más valioso de decir.

Si encontrás un defecto, arreglá la **causa** y no el síntoma: hacé explícito el
espacio con `{' '}` en vez de volver el compresor atrás. Deja la intención
escrita y no se rompe otra vez con el próximo cambio de herramienta.

## Scripts

| script | para qué |
|---|---|
| `scripts/servir.mjs` | sirve un `dist/` resolviendo `/ruta` → `/ruta/index.html` |
| `scripts/comparar-texto.mjs` | candidatos de texto pegado o separado |
| `scripts/comparar-visual.mjs` | diff de píxeles con control de determinismo |
| `scripts/probar-interaccion.mjs` | buscador, chips y filtros en ambos builds |
| `scripts/lib/navegador.mjs` | resuelve Playwright y el Chromium del entorno |

Los que usan navegador se apañan solos: `lib/navegador.mjs` busca Playwright y,
si no está, lo instala en `/tmp/verif-navegador` — **fuera del repo**, porque
meterlo dentro ensuciaría `package.json` y el lockfile, que es justo lo que
estamos midiendo. También apunta al Chromium preinstalado de `/opt/pw-browsers`,
que casi nunca coincide con el build que espera Playwright.

`comparar-visual.mjs` elige rutas solo si no le pasás `--rutas`: agrupa por
plantilla y toma la más pesada, la mediana y la más liviana de cada grupo. Salen
unas 20, con portadas, categorías, fichas, la app de hardware y legales en los
tres idiomas.
