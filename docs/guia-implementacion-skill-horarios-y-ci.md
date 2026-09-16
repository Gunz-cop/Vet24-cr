# Guía de Implementación: Mejores Prácticas para Skill de Investigación, Módulo Central de Horarios, Estados No Confirmados y CI

**Documento:** Adjunto Técnico y Especificación de Ingeniería  
**Documento Principal Asociado:** [`analisis-creacion-fichas-y-horarios.md`](./analisis-creacion-fichas-y-horarios.md)  
**Fecha:** 7 de septiembre de 2026  
**Estado:** Propuesta de Arquitectura y Guía de Estándares para Vet24 Costa Rica  

---

## 1. Relación con el Análisis Principal

Este documento es el **complemento operativo** del [`analisis-creacion-fichas-y-horarios.md`](./analisis-creacion-fichas-y-horarios.md). Mientras el documento principal diagnosticó por qué fallan 24 de las 112 fichas y cómo se generó históricamente la información, esta guía establece las **mejores prácticas de la industria y la arquitectura concreta** para:
1. Construir un **Skill de Antigravity** especializado en extracción fidedigna de datos comerciales en internet.
2. **Centralizar el motor de horarios** eliminando código duplicado y heurísticas por nombre.
3. Implementar un **modelo de estados no confirmados** que termine con el falso "Cerrado ahora" 24/7.
4. Diseñar la **suite de pruebas y el pipeline de Integración Continua (CI)** para garantizar cero regresiones en producción.

---

## 2. Mejores Prácticas: Creación de un Skill de Investigación de Negocios (`investigar-veterinaria`)

### 2.1 El Reto de las Redes Sociales y las Limitaciones de los Agentes
Los agentes de IA que navegan la web se enfrentan a barreras conocidas:
- **Instagram y Facebook (Walled Gardens):** Aplican muros de inicio de sesión obligatorios, bloqueos antibot por huella TLS/Cloudflare y renderizado dinámico en React pesado. Los scrapers simples y LLMs no pueden acceder de forma determinista ni fiar de sus metadatos.
- **Copy Publicitario no Confiable:** En redes sociales, una clínica suele colocar "Atención 24/7" en su biografía como gancho de marketing, cuando en realidad se refieren a "tenemos un número celular en el que atendemos llamadas nocturnas", sin médico en clínica.
- **Google Maps / Google Business Profile como Fuente Primaria:**
  - Es el registro donde los negocios mantienen sus horarios operativos reales de puerta abierta actualizados para evitar penalizaciones y reclamos de clientes.
  - Expone datos estructurados limpios: coordenadas GPS de entrada física, teléfonos locales fijos, horarios por día (incluyendo cierres de almuerzo y feriados) y atributos ("Tiene servicio de urgencias").

### 2.2 Jerarquía de Fuentes de Verdad (Source Priority Matrix)
Todo skill o agente debe consultar las fuentes en este orden estricto:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. GOOGLE MAPS / GOOGLE BUSINESS PROFILE (Máxima Prioridad) │
│  - Horario regular por día (apertura y cierre de puertas)    │
│  - Coordenadas geográficas exactas (Lat/Lng)                │
│  - Teléfono fijo principal y enlaces a sitio web            │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. SITIO WEB OFICIAL / SCHEMA.ORG LOCALBUSINESS             │
│  - Especialidades (exóticos, cirugía, internamiento)        │
│  - Canal de WhatsApp oficial                                │
│  - Sección "Emergencias / Guardia Nocturna"                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. BÚSQUEDA SNIPPETS GOOGLE SEARCH (Cero Login Requerido)   │
│  - Consulta: site:facebook.com "Nombre Clinica" "horario"   │
│  - Extraer información visible en el fragmento sin entrar    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. AUDITORÍA TELEFÓNICA DIRECTA (Regla de Oro para Tier A)  │
│  - Obligatoria si la clínica afirma ser 24/7 física         │
│  - Pregunta de control: "¿Tienen médico físico ahora mismo  │
│    en el sitio o está bajo llamada?"                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Resolución del Dilema "Dice 24/7 pero en Google cierra a las 8 p.m."
Para evitar clasificaciones erróneas, el Skill debe aplicar una **separación de conceptos**:
1. **Horario Físico de Puerta Abierta (`horarioTexto` / `categoriaHorario`):** Se toma de Google Maps (ej. "L-S 8am-8pm").
2. **Disponibilidad de Urgencias Nocturnas:**
   - Si tiene médico en sitio toda la noche con quirófano: `emergencias24h: true`, `emergency_tier: "Tier A"`, `overnight_doctor_present: true`.
   - Si el médico está en su casa y atiende por llamada: `emergencias24h: false`, `emergency_tier: "Tier B"`, con nota expresa en `copyDiferenciador`: *"Consulta diurna presencial; guardias nocturnas bajo llamado telefónico previo."*

### 2.4 Arquitectura del Skill en Antigravity
Siguiendo las convenciones del sistema de personalización de Antigravity (`.agents/skills/investigar-veterinaria/SKILL.md`):

```
.agents/skills/investigar-veterinaria/
├── SKILL.md                 # Definición del flujo, prompts y criterios
├── scripts/
│   ├── normalize-hours.mjs  # Validador y normalizador de sintaxis de horarios
│   └── geocode-check.mjs    # Validador de coordenadas dentro del territorio de Costa Rica
└── templates/
    └── clinic-entry.md      # Plantilla vacía lista para poblar
```

#### Ejemplo de `SKILL.md`:
```yaml
---
name: investigar-veterinaria
description: >-
  Investiga, audita y genera o actualiza fichas de veterinarias en Costa Rica
  utilizando fuentes primarias (Google Maps, webs oficiales) con estandarización
  estricta de horarios, coordenadas y criterios de emergencia.
---

# Workflow de Investigación de Ficha Veterinaria

Al recibir el nombre o ubicación de una veterinaria:
1. **Paso 1: Búsqueda en Google Maps / Places:**
   - Extraer: Nombre oficial exacto, dirección con señas costarricenses, coordenadas (lat/lng), teléfono principal y horario de cada día.
2. **Paso 2: Detección de Canal de Urgencias:**
   - Buscar explícitamente menciones a guardias nocturnas o atención continuada.
   - Si solo hay número celular fuera de horario, NO marcar emergencias24h.
3. **Paso 3: Ejecución de Normalización:**
   - Ejecutar `node .agents/skills/investigar-veterinaria/scripts/normalize-hours.mjs "<texto-horario>"` para garantizar que la regla sea compatible con el motor antes de escribir el markdown.
4. **Paso 4: Generación de Markdown:**
   - Usar el template oficial asegurando que `id` sea correlativo y `slug` no colisione.
```

---

## 3. Mejores Prácticas: Centralización del Módulo de Horarios (`src/lib/schedule.ts`)

Actualmente, el código de interpretación de horarios está disperso y duplicado en:
- `ClinicaCard.astro`
- `src/pages/clinica/[slug].astro`
- `FiltrosDashboard.astro`

### 3.1 Principio de Única Fuente de Verdad
Se debe consolidar toda la matemática temporal en un único módulo TypeScript: [`src/lib/schedule.ts`](file:///c:/Users/grcx1/OneDrive/Documentos/Proyectos/vete/veterinarias-cr/src/lib/schedule.ts).

### 3.2 Manejo Estricto de Zona Horaria (`America/Costa_Rica`)
Costa Rica opera en **UTC-6 sin cambio de hora estacional (DST)** todo el año.
Para evitar que clientes en el extranjero vean datos incorrectos, la hora debe calcularse forzando UTC-6 sin importar la zona horaria del navegador:

```typescript
export interface CostaRicaTime {
  day: number;      // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  hour: number;     // Hora fraccionaria (ej. 14.5 = 2:30 PM)
  minute: number;
}

export function getCostaRicaTime(date: Date = new Date()): CostaRicaTime {
  // Convertir timestamp universal a la zona horaria estricta de Costa Rica
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Costa_Rica',
    hour12: false,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
  };
  
  // Alternativa matemática ultrarrápida sin dependencias (UTC-6 directo):
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const crDate = new Date(utc - (3600000 * 6));
  
  return {
    day: crDate.getDay(),
    hour: crDate.getHours() + crDate.getMinutes() / 60,
    minute: crDate.getMinutes()
  };
}
```

### 3.3 Parser de Horarios Robusto y Sencillo
El parser debe ser capaz de procesar:
1. **24 horas:** `"24h"`, `"24/7"`.
2. **Minutos y medias horas:** `"8:30am-6:30pm"`.
3. **Turnos partidos (pausa de almuerzo):** `"L-S 8am-12pm, 1:30pm-6pm"`.
4. **Notación costarricense:** `"12md"` normalizado automáticamente a `"12pm"`.
5. **Días individuales y rangos:** `"L-V"`, `"L-S"`, `"S-D"`, `"Martes a Domingo"`.

#### Algoritmo Canónico de Regla Compacta:
La regla serializada compacta debe seguir el estándar:
`<dias>:<abre>-<cierra>` separado por comas.  
Ejemplo: `1-5:8-12,1-5:13.5-18,6:8-13` (L-V de 8 a 12 y de 1:30pm a 6pm; Sábado de 8 a 1pm).

### 3.4 Corrección de Schema.org (`getOpeningHoursSpec`)
En lugar del fallback falso actual que inventa horarios para Google, `getOpeningHoursSpec()` debe:
- Si es 24h: generar `"00:00"` a `"23:59"` de Lunes a Domingo.
- Si tiene reglas parseadas: emitir exactamente las especificaciones de días y horas reales.
- Si el horario es desconocido o por cita previa: **no emitir `openingHoursSpecification`**, o marcarlo explícitamente en el texto descriptivo, cumpliendo con las directrices de calidad de Google Search Central.

---

## 4. Mejores Prácticas: Soporte y Tratamiento de Estados No Confirmados

### 4.1 Superar la Falsa Dicotomía Binaria
El software actualmente asume que una clínica solo puede estar **Abierta** o **Cerrada**. Si el parser no entiende el horario, la clínica cae en `false` ("Cerrado ahora").

Se debe implementar una taxonomía de **3 estados operativos**:

```typescript
export type ClinicOpenStatus = 
  | 'OPEN'        // Verificado y actualmente dentro del rango horario
  | 'CLOSED'      // Verificado y actualmente fuera del rango horario
  | 'UNCONFIRMED' // Horario bajo cita previa, por llamada o en proceso de verificación
```

### 4.2 Comportamiento en la Interfaz (UI / UX)
- **Badge en Ficha Individual:**
  - `OPEN`: Chip verde esmeralda con punto pulsante: `● Abierto ahora`
  - `CLOSED`: Chip gris/pizarra: `○ Cerrado ahora`
  - `UNCONFIRMED`: Chip ámbar neutro con icono telefónico: `📞 Horario por confirmar · Llamar`
- **Comportamiento en Filtros:**
  - **Filtro "Solo 24/7" (Emergencias Críticas):**  
    Ocultar inmediatamente clínicas no confirmadas o Tier C/D. Aquí aplica la directriz de seguridad de vidas: no enviar a un dueño con una mascota en paro respiratorio a una clínica sin certeza médica.
  - **Filtro "Abierto ahora" (Consultas Diurnas):**  
    No eliminar las 24 clínicas. Presentar primero las clínicas confirmadas como abiertas, y si el usuario se encuentra en una zona con opciones no confirmadas, mostrar una sección secundaria:
    > *"Clínicas con horario sujeto a confirmación en esta zona. Llama antes de trasladarte."*

---

## 5. Mejores Prácticas: Creación de Tests en CI y Pipeline Robusto

El proyecto ya cuenta con un flujo en `.github/workflows/ci.yml`. Para blindar el sistema contra errores de datos, debemos incorporar **pruebas de contrato de dataset** e integrar el pipeline con las mejores prácticas.

### 5.1 Test Unitario de Integridad de Horarios (`tests/unit/schedule-integrity.test.ts`)
Este test debe ejecutarse en `npm test` con el test runner nativo de Node.js (`node --test`). Debe inspeccionar cada archivo Markdown de la colección y verificar que:
1. No exista frontmatter con caracteres ocultos (BOM UTF-8).
2. Todo `horarioTexto` produzca una regla válida o active deliberadamente la bandera de confirmación requerida.
3. Si `emergencias24h: true`, `emergency_verified` sea obligatorio y las coordenadas geográficas no sean `0, 0`.

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { parseSchedule, validateScheduleText } from '../../src/lib/schedule.ts';

test('Dataset Integrity: Todas las fichas poseen horarios válidos o catalogados', () => {
  const dir = path.resolve('src/content/clinicas');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));

  const brokenClinics: string[] = [];

  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const horarioMatch = content.match(/horarioTexto:\s*"([^"\r\n]+)"/);
    const is24h = /emergencias24h:\s*true/.test(content);

    if (!horarioMatch) {
      brokenClinics.push(`${file} (sin horarioTexto)`);
      continue;
    }

    const horarioTexto = horarioMatch[1];
    const validation = validateScheduleText(horarioTexto, is24h);

    if (!validation.isValid && !validation.isPendingConfirmation) {
      brokenClinics.push(`${file}: "${horarioTexto}" -> ${validation.error}`);
    }
  }

  assert.equal(
    brokenClinics.length, 
    0, 
    `Se encontraron ${brokenClinics.length} clínicas con formato de horario inválido:\n${brokenClinics.join('\n')}`
  );
});
```

### 5.2 Mejores Prácticas para el Pipeline Completo de CI (`.github/workflows/ci.yml`)

El pipeline moderno de CI debe estructurarse en **etapas paralelas con *fail-fast***:

```
                  ┌────────────────────────┐
                  │ 1. Lint & Typecheck    │ (astro check && tsc)
                  └───────────┬────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         ▼                                         ▼
┌─────────────────────────┐               ┌─────────────────────────┐
│ 2. Unit & Data Tests    │               │ 3. Static Build         │
│  - schedule-integrity   │               │  - astro build          │
│  - metaDescription      │               │  - worker types         │
│  - capabilityStatus     │               └────────────┬────────────┘
└─────────────────────────┘                            │
                                                       ▼
                                          ┌─────────────────────────┐
                                          │ 4. Playwright E2E Tests │
                                          │  - Mocking de Leaflet   │
                                          │  - Reportes de artefacto│
                                          └─────────────────────────┘
```

#### Reglas de Oro para el CI de Vet24:
1. **Evitar Dependencias Externas en CI (Egress Blocker):**  
   Los runners de CI frecuentemente bloquean peticiones a CDNs de mapas (como cdnjs o OpenStreetMap). En los tests de Playwright, se debe interceptar las peticiones a Leaflet para devolver stubs locales y evitar fallos por *timeout*.
2. **Validación Prevención de Regresiones en Frontmatter:**  
   El CI debe fallar de inmediato si algún archivo Markdown tiene BOM (`\uFEFF`), campos requeridos nulos o coordenadas inválidas en Costa Rica (Lat: 8.0 a 11.3, Lng: -86.0 a -82.5).
3. **Caché Eficiente:**  
   Aprovechar `actions/setup-node` con `cache: 'npm'` y cachear el binario del navegador de Playwright (`~/.cache/ms-playwright`) para reducir el tiempo de CI de 5 minutos a menos de 90 segundos.

---

## 6. Hoja de Ruta de Implementación Recomendada

| Tarea | Archivo Afectado | Complejidad | Impacto |
|---|---|---|---|
| **Paso 1: Módulo Central** | Crear [`src/lib/schedule.ts`](file:///c:/Users/grcx1/OneDrive/Documentos/Proyectos/vete/veterinarias-cr/src/lib/schedule.ts) con soporte UTC-6, parser robusto y tests unitarios | Media | Resuelve el desbalance entre páginas y la hora del usuario |
| **Paso 2: Migrar Componentes** | Refactorizar `ClinicaCard.astro`, `[slug].astro` y `FiltrosDashboard.astro` para consumir `src/lib/schedule.ts` | Baja | Elimina código duplicado y heurísticas quemadas |
| **Paso 3: Corregir las 24 Fichas** | Normalizar los textos de las 24 fichas rotas identificadas | Media | Recupera el 21,4 % del directorio en "Abierto ahora" |
| **Paso 4: Chip de Estado Neutro** | Renderizar `Horario por confirmar` para fichas de consulta previa | Baja | Termina con el falso "Cerrado 24/7" |
| **Paso 5: Test en CI** | Incorporar `tests/unit/schedule-integrity.test.ts` en GitHub Actions | Baja | Evita que cualquier PR vuelva a romper los horarios |
| **Paso 6: Skill de Antigravity** | Empaquetar `.agents/skills/investigar-veterinaria/` con scripts de verificación | Media | Estandariza la adición de futuras clínicas |
