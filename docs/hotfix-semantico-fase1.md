# Hotfix semántico — Fase 1

Estado: implementado en la rama `claude/vet24-semantic-hotfix-heredia-bezx1i`.
Origen: incidente detectado en la ficha `hospital-vet-medical-care-heredia`.

Este documento existe para que la **fase de auditoría no empiece desde cero**.
Todas las cifras están medidas sobre las 112 fichas de `src/content/clinicas/`
en el commit `3ede450` y son reproducibles.

---

## 1. Qué resuelve el hotfix

El esquema de `src/content.config.ts` modela las capacidades como booleanos, así
que `false` mezcla cuatro significados: *no confirmado*, *desconocido*,
*no investigado* y *no disponible*. La UI convertía ese `false` en afirmaciones
negativas fuertes, y mostraba sellos de auditoría derivados únicamente de
`record_status`.

**Regla temporal** (implementada en `src/lib/capabilityStatus.ts`):

> Solo `true` sostiene una afirmación positiva. `false` y `undefined` se
> presentan siempre como **"No confirmado"**, nunca como ausencia del servicio.

**`true` significa «la ficha lo afirma», no «verificado».** No existe evidencia
por atributo: `phone_verified` / `address_verified` / `schedule_verified` cubren
datos de contacto, no capacidades clínicas. La fase 2 debe separar *afirmado* de
*verificado por método X en fecha Y* en lugar de heredar esta equivalencia.

---

## 2. Impacto medido en el dataset

### 2.1 Sello público de confianza: antes vs después

Antes, `confidence_score` se publicaba como sello de color. **Ahora ninguna
ficha muestra un sello verde de confiabilidad**: se sustituyó por un chip
descriptivo de qué metadatos de revisión contiene la ficha.

| Estado | Fichas |
|---|---|
| `Con fuente y fecha de revisión` (neutro, gris) | **68 / 112 — 60,7 %** |
| `Revisión sin documentar` (ámbar) | **44 / 112 — 39,3 %** |

Cruce con el sello anterior — el cambio es **selectivo, no un degradado masivo**:

| `confidence_score` anterior | Fichas | Quedan documentadas | Pasan a ámbar |
|---|---|---|---|
| `high` (mostraba "Alta Confiabilidad 🟢") | 74 | **62** | **12** |
| `medium` | 21 | 6 | 15 |
| `low` | 17 | 0 | 17 |

De las 74 fichas que presumían "Alta Confiabilidad", **62 conservan un estado
documentado**. Solo **12** caen a ámbar, y son exactamente las que están
marcadas `VERIFIED` sin fecha, sin fuente o sin ninguna verificación puntual.

### 2.2 Qué le falta a las 44 fichas en ámbar

| Carencia | Fichas |
|---|---|
| Sin `last_verified` | 19 |
| Sin `verification_source` | 14 |
| Sin ninguna verificación puntual (`*_verified`) | 31 |
| **Solo les falta la verificación puntual** (ya tienen fecha y fuente) | **25** |

Esas 25 son la vía más barata para reducir el ámbar en la fase de auditoría.

### 2.3 Badge de estado del registro

| Badge | Fichas |
|---|---|
| `Ficha revisada` (antes "Guardia Auditada", verde) | 73 — 65,2 % |
| `⚠️ Pendiente de Auditoría` | 27 — 24,1 % |
| `Información Parcial` | 12 — 10,7 % |

### 2.4 Evidencia de auditoría telefónica real

De 112 fichas, solo **9** declaran una fuente de tipo telefónico
(3 `"Llamada directa de auditoría de prueba"` + 6 `"Auditoría telefónica"`).
67 declaran `"Búsqueda web - directorio local"` y 14 están vacías.

**Por eso se retiró "Guardia Auditada" y su tooltip "Información auditada por
llamada de prueba": 73 fichas lo mostraban y como máximo 9 podrían sostenerlo.**

---

## 3. Reconciliación del conteo de fichas (112 vs 119)

**El repositorio nunca ha tenido más de 112 fichas.** Verificado recorriendo
todo el historial de `git`:

| Commit | Fecha | Fichas |
|---|---|---|
| `3ede450` (actual) | 2026-09-02 | 112 |
| `95473aa` | 2026-08-30 | 112 |
| `e1b7ba3` | 2026-08-14 | 108 |
| `44ae07a` | 2026-07-27 | 88 |
| `da0f79c` | 2026-07-19 | 79 |
| `88e5cf0` | 2026-06-11 | 70 |

Datos de integridad comprobados: **112 fichas, 112 `id` únicos, sin duplicados**
(el rango va de `1` a `223` con 112 huecos, más un id no numérico, `"19B"`).

Causa más probable de la discrepancia: la cifra de 119 no procede de contar
`src/content/clinicas/*.md` en este repo. Un candidato concreto es el problema
descrito en §4.4 — **26 fichas tienen el frontmatter malformado**, y según cómo
se parseen pueden contarse o saltarse. Sin el reporte original de Codex no se
puede cerrar del todo; **queda pendiente confirmar contra esa fuente**.

---

## 4. Backlog priorizado

### 4.1 Filtro "Abierto ahora" oculta el 24 % del directorio — *prioridad alta*

`src/components/FiltrosDashboard.astro` (≈ línea 518) esconde fichas con
`confidence_score: "low"` o `record_status: "REVIEW_REQUIRED"`.

**Medido: 27 de 112 fichas (24,1 %) nunca aparecen bajo "Abierto ahora"**,
aunque estén abiertas. Concentración por provincia:

| Provincia | Ocultas / total |
|---|---|
| Puntarenas | 6 / 18 |
| Guanacaste | 5 / 16 |
| Limón | 4 / 15 |
| San José | 4 / 18 |
| Alajuela | 3 / 19 |
| Heredia | 3 / 12 |
| Cartago | 2 / 13 |

Golpea más fuerte justo donde la cobertura ya es más fina. Es un problema de
resultados incompletos, no de presentación: el usuario no tiene forma de saber
que se le está ocultando un cuarto del directorio.

### 4.2 Filtro "Solo 24/7" y `emergency_verified` — *riesgo latente, no activo*

El mismo bloque exige `emergency_verified: true` en el modo "Solo 24/7".

**Medido: las 20 fichas con `emergencias24h: true` tienen `emergency_verified:
true`, ninguna es `low` ni `REVIEW_REQUIRED`. Hoy el filtro no oculta ninguna
clínica 24/7.** Tampoco hay ninguna ficha Tier A o Tier B entre las 27 ocultadas
por §4.1.

No es una fuga activa en el flujo de emergencia, sino una **trampa latente**:
`emergency_verified` no está documentado, no se muestra nunca al usuario, y su
valor por defecto es `false`. La próxima clínica 24/7 que se añada sin marcarlo
desaparecerá silenciosamente del filtro de emergencias. Necesita una regla
escrita y una validación que falle el build, no un parche de UI.

### 4.3 Horarios calculados por el nombre de la clínica — *prioridad alta*

`src/pages/clinica/[slug].astro` y `src/components/ClinicaCard.astro` derivan el
badge "Abierto / Cerrado ahora" con heurísticas de texto que incluyen
coincidencias por **nombre de establecimiento**:
`text.includes("medical care")`, `"hems"`, `"concasa"`, `"oxígeno"`.

Está duplicado en ambos archivos y colisiona con cualquier ficha nueva de nombre
u horario parecido. El horario debe salir de datos estructurados, no del nombre.

### 4.4 Frontmatter malformado en 26 fichas — *prioridad media*

26 de las 112 fichas abren el frontmatter como `﻿---id: 8` (BOM + `---` pegado a
la primera clave) en vez de `---` en su propia línea. Astro lo tolera y el build
genera las 112 páginas, pero **cualquier script que parsee el YAML por líneas se
salta esas 26 en silencio** — incluida la ficha del incidente,
`hospital-vet-medical-care-heredia.md`. Es una fuente directa de conteos
divergentes (ver §3) y de auditorías con falsos negativos.

### 4.5 Suite e2e con fallos preexistentes — *no normalizar*

Los fallos observados **no los introduce el hotfix**: se reprodujeron sobre
`main` sin los cambios, y el baseline falla más (11 pasan / 21 fallan) que la
rama (21 pasan / 11 fallan). Causas: el CDN de Leaflet está bloqueado por la
política de egress del entorno de CI, y varios tests de geolocalización son
sensibles a *timing*. Debe abrirse un issue propio; "ya fallaba" no puede
volverse un estado permanente.

### 4.6 Fases de datos ya acordadas

1. Auditoría de integridad del dataset (reutilizar este documento).
2. Modelo de evidencia / estados (`confirmed` / `unknown` / `unverified` /
   `not_offered`). `hotelVerificacion` ya es el patrón a generalizar.
3. Definición de evidencia por atributo: fuente, fecha y método por capacidad.
4. Migración de las fichas.
5. Definición formal y *enforcement* de Tier A/B/C/D, y revisión de los Tiers
   inconsistentes.

---

## 5. Fuera del alcance de este hotfix, por decisión explícita

- **No se modificó ninguna ficha** (`git diff --stat -- src/content/` sale vacío),
  incluida `hospital-vet-medical-care-heredia`, pendiente de la respuesta del
  establecimiento. Su actualización debe ir en un commit posterior y separado.
- **No se tocó `emergency_tier`** ni se implementó ningún scoring.
- **No se diseñó una regla nueva de auditoría.** Donde no había regla documentada
  se eliminó la afirmación pública o se degradó a un estado neutral.

---

## Cómo reproducir estas cifras

```sh
npm ci
npm run test:unit        # 23 tests de la regla de presentación
npx astro build          # genera las 112 fichas
```

Los conteos de §2 salen de aplicar `reviewEvidenceBadge` y `recordStatusBadge`
de `src/lib/capabilityStatus.ts` al frontmatter de cada ficha; los de §3, de
`git ls-tree -r --name-only <commit> -- src/content/clinicas | grep -c '\.md$'`.
