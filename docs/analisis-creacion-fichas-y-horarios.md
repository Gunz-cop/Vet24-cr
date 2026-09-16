# Análisis Riguroso: Creación de Fichas, Fuentes de Datos y Autopsia de Errores de Horario en Vet24

**Fecha:** 7 de septiembre de 2026  
**Estado:** Documento de Referencia de Arquitectura y Auditoría Técnica  
**Alcance:** Dataset de 112 clínicas (`src/content/clinicas/*.md`), motor de renderizado Astro, componentes de filtrado y SEO.  
**Documento Adjunto de Implementación:** [`guia-implementacion-skill-horarios-y-ci.md`](./guia-implementacion-skill-horarios-y-ci.md) (Mejores prácticas para Skill de investigación, módulo central de horarios, estados no confirmados y CI).

---

## 1. Diagnóstico Inicial sobre la Documentación y Skills Existentes

1. **¿Existe ya un documento que explique cómo se crean las fichas y se obtienen los datos?**  
   **No.** Tras una exhaustiva auditoría en todo el repositorio (`docs/`, `.agents/`, `src/`, etc.):
   - No existía ningún documento de arquitectura o procedimiento operativo estándar (SOP) sobre cómo se crean las fichas.
   - Lo único existente eran reportes parciales post-mortem de incidentes específicos (como `docs/hotfix-semantico-fase1.md`, enfocado en badges de confianza) y notas de tareas específicas de tests e2e (`TEST_INFRA.md`, `.agents/worker_m2/`).
2. **¿Existe un "Skill" de creación de fichas?**  
   **No.** No existe ningún Skill de Antigravity registrado para la creación de fichas.
   Las 112 fichas que hoy existen fueron agregadas de forma manual o semi-automatizada mediante prompts a modelos de IA (Claude, Codex) que generaron directamente archivos Markdown sueltos sin un estándar formal de validación de sintaxis para horarios.

---

## 2. Cómo el Sitio Crea y Procesa las Fichas (Arquitectura del Software)

El flujo de vida de una ficha dentro del software sigue una arquitectura estática (Jamstack / SSG) sobre Astro:

```
[ Archivo Markdown en src/content/clinicas/<slug>.md ]
                       │
                       ▼
[ Validación de Frontmatter en src/content.config.ts (Zod) ]
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
[ Compilación SSG Astro ]    [ Generación de Catálogo JSON ]
 - src/pages/index.astro      - /api/catalog.json (para agentes)
 - src/pages/clinica/[slug]   - /api/clinics-links-manifest.json
 - src/pages/provincia/[p]    - /llms.txt
 - src/pages/zona/[z]
         │
         ▼
[ Hidratación / Ejecución Client-Side ]
 - FiltrosDashboard.astro (búsqueda, GPS, ordenación, isOpen)
 - Scripts de [slug].astro (badge isOpen, modal de reporte)
 - Mapa interactivo Leaflet (marcadores sincronizados con filtros)
```

### 2.1 Almacenamiento y Esquema (`src/content.config.ts`)
Astro v6 utiliza el Glob Loader para leer la colección desde `src/content/clinicas/`. El esquema Zod define 38 atributos.
Entre ellos:
- `horarioTexto: z.string()` ➔ **Un string libre sin estructura tipada.**
- `categoriaHorario: z.enum(["24/7 Emergencias", "Cierra después 21h", "Horario normal"])`
- `emergencias24h: z.boolean()`
- Coordenadas geográficas, contacto, indicadores de auditoría y notas.

### 2.2 El Pipeline de Renderizado
1. **Ficha Individual (`src/pages/clinica/[slug].astro`):**
   Ejecuta `getStaticPaths()` leyendo toda la colección con `getCollection('clinicas')` y pre-renderiza 112 archivos HTML estáticos con su marcado estructurado (`LocalBusiness`, `OpeningHoursSpecification`, `FAQPage`, `BreadcrumbList`).
2. **Directorio Principal (`src/pages/index.astro`):**
   Itera las 112 clínicas e inserta un `<article>` por clínica a través de `ClinicaCard.astro`. Cada tarjeta almacena en atributos HTML (`data-schedule`, `data-latitude`, `data-tier`, `data-is-open`, etc.) los metadatos que el script de cliente necesita para filtrar y ordenar sin consultar un backend.

---

## 3. Cómo se Obtienen los Datos (Auditoría de Procedencia)

Al no existir un pipeline de scraping automatizado ni conexión con bases de datos oficiales (como el Colegio de Médicos Veterinarios de Costa Rica), los datos ingresaron históricamente por dos vías:

### 3.1 Fase Semilla: El Excel Original (`veterinarias_cr_directorio.xlsx`)
En la raíz del proyecto se encuentra el archivo `veterinarias_cr_directorio.xlsx`:
- Contiene **26 clínicas** recopiladas inicialmente a mano.
- Posee 21 columnas: `ID`, `Provincia`, `Zona / Ciudad`, `Nombre Clínica`, `Dirección`, `Teléfono 1`, `Teléfono 2`, `WhatsApp`, `Horario Texto`, `Categoría Horario`, `24/7 Emergencias`, `Exóticos`, `Cirugía Emerg.`, `Sitio Web`, `Facebook`, `Instagram`, `Slug URL`, `Estado`, `Fecha Publicado`, `Copy diferenciador`, `Notas / Pendientes`.
- Las primeras 26 fichas Markdown del repositorio provinieron directamente de este archivo.

### 3.2 Fase de Expansión por Modelos de IA (De 26 a 112 Fichas)
El crecimiento del catálogo ocurrió mediante solicitudes en sesiones de chat con modelos de IA para ampliar la cobertura provincial:
- **Commit `668a168`:** Expansión a al menos 10 clínicas por provincia.
- **Commit `53194e3`:** Adición de 9 clínicas.
- **Commit `44ae07a` y `0f99188`:** Adición de clínicas en Guanacaste, Limón y Puntarenas.
- **Commit `e1b7ba3`:** Inserción de 20 clínicas en cantones sin cobertura (Upala, Atenas, Pacayas, Cóbano, etc.).
- **Commit `95473aa`:** Veterinarias en San Vito y Pérez Zeledón.

### 3.3 Calidad y Veracidad Real de las Fuentes
De la inspección directa del frontmatter en las 112 fichas:
- **67 fichas (59,8 %):** Declaran `verification_source: "Búsqueda web - directorio local"`. El agente tomó datos de Google Maps, Waze o páginas de Facebook sin corroborar si el horario correspondía al año en curso.
- **14 fichas (12,5 %):** Tienen `verification_source: ""` vacío.
- **Solo 9 fichas (8,0 %):** Cuentan con verificación telefónica directa documentada (`"Auditoría telefónica"` o `"Llamada directa de auditoría de prueba"`).
- **22 fichas (19,6 %):** Cuentan con fuentes mixtas (Google Business Profile, notas específicas).

---

## 4. Autopsia Rigurosa: ¿Por Qué Están Ocurriendo Tantos Errores de Horario?

Los fallos de horario que experimentas son consecuencia de **siete defectos estructurales interconectados**:

### Defecto 1: Formato Libre en `horarioTexto` (Causa Raíz Principal)
El esquema de Zod permite cualquier cadena de texto. Al no existir restricción de formato, los agentes y humanos introdujeron textos heterogéneos como:
- `"L-V 8am-5pm"` (Legible por el parser actual)
- `"L-S 7am-12md, 1:30pm-6pm"` (Rompe por el uso de `12md` y turnos divididos por coma)
- `"Horario diurno, consultar disponibilidad"` (Sin rangos de horas)
- `"Consultar horario"` (Sin rangos)
- `"Horario por confirmar"` (Sin rangos)
- `"Martes-Domingo con cita previa | Lunes cerrado"` (Sin rangos)
- `"Consultar horario | Emergencias: 8817-0000"` (Texto informativo)

### Defecto 2: El Parser Regex es Hiperfrágil y Rígido
Tanto en `ClinicaCard.astro` (líneas 48-109) como en `src/pages/clinica/[slug].astro` (líneas 115-180), existe una función `getClientScheduleAttr()` que intenta convertir el texto en una regla compacta:
```typescript
const dayPatterns = [
  { pattern: /l-d(\d{1,2}(?::\d{2})?(?:am|pm))-(\d{1,2}(?::\d{2})?(?:am|pm))/, days: "1-0" },
  { pattern: /l-s(\d{1,2}(?::\d{2})?(?:am|pm))-(\d{1,2}(?::\d{2})?(?:am|pm))/, days: "1-6" },
  { pattern: /l-v(\d{1,2}(?::\d{2})?(?:am|pm))-(\d{1,2}(?::\d{2})?(?:am|pm))/, days: "1-5" },
  { pattern: /s-d(?:soloemergencias)?(\d{1,2}(?::\d{2})?(?:am|pm))-(\d{1,2}(?::\d{2})?(?:am|pm))/, days: "6-0" },
  { pattern: /d(?:yferiados)?(\d{1,2}(?::\d{2})?(?:am|pm))-(\d{1,2}(?::\d{2})?(?:am|pm))/, days: "0" },
  { pattern: /s(\d{1,2}(?::\d{2})?(?:am|pm))-(\d{1,2}(?::\d{2})?(?:am|pm))/, days: "6" },
];
```
Si el texto no calza con una de estas 6 regexes, la función retorna `""` (cadena vacía).

### Defecto 3: Parches Quemados con Nombres de Clínicas (*Hardcoding*)
En lugar de mejorar el parser, en commits anteriores se agregaron excepciones por texto que chequean nombres específicos:
```typescript
const text = normalizeHours(horarioTexto);
if (text.includes("oxígeno") || text.includes("10am-9pm")) {
  return "1-6:10-21,0:10-20";
}
if (text.includes("concasa") || text.includes("8am-9pm")) {
  return "1-5:8-21,6:9-19,0:9-17";
}
if (text.includes("medical care") || text.includes("9am-9pm")) {
  return "1-0:9-21";
}
if (text.includes("hems") || text.includes("9am-7pm")) {
  return "1-5:9-19,6-0:10-17";
}
```
Esto es frágil y peligroso: cualquier clínica que tenga en su nombre o dirección la palabra "hems" o "oxígeno" recibirá automáticamente horarios ajenos.

### Defecto 4: Impacto en UI: 24 Fichas Inaccesibles en "Abierto Ahora"
Al ejecutar una comprobación sobre el dataset completo de 112 fichas:
- **21 fichas** son emergencias 24h (`"24h"`).
- **67 fichas** son parseadas correctamente.
- **24 fichas (21,4 % del total)** devuelven regla de horario VACÍA (`""`).

#### Lista Completa de las 24 Clínicas Afectadas:
| Archivo de Clínica | Valor de `horarioTexto` | Comportamiento Actual |
|---|---|---|
| `aruma-centro-veterinario-upala.md` | `"Horario diurno, consultar disponibilidad"` | Siempre "Cerrado ahora" |
| `centro-medico-veterinario-aguilar-turrialba.md` | `"Horario diurno, consultar disponibilidad"` | Siempre "Cerrado ahora" |
| `centro-veterinario-medipets-limon-centro.md` | `"Horario diurno, consultar disponibilidad"` | Siempre "Cerrado ahora" |
| `centro-veterinario-nambi-cobano.md` | `"Horario diurno, consultar disponibilidad"` | Siempre "Cerrado ahora" |
| `cevet-san-pedro.md` | `"Consultar horario"` | Siempre "Cerrado ahora" |
| `clinica-veterinaria-alfarovet-santa-cruz.md` | `"Horario por confirmar"` | Siempre "Cerrado ahora" |
| `consultorio-veterinario-dr-gomez-puntarenas-centro.md` | `"Horario diurno, consultar disponibilidad"` | Siempre "Cerrado ahora" |
| `coral-vet-cahuita-talamanca.md` | `"Horario diurno, consultar disponibilidad"` | Siempre "Cerrado ahora" |
| `cruz-vet-tilaran.md` | `"Horario diurno, consultar disponibilidad"` | Siempre "Cerrado ahora" |
| `dr-jara-veterinaria-pacayas.md` | `"Horario diurno, consultar disponibilidad"` | Siempre "Cerrado ahora" |
| `farmacia-veterinaria-dr-furio-consumi-san-vito.md` | `"Horario diurno, consultar disponibilidad"` | Siempre "Cerrado ahora" |
| `farmacia-veterinaria-dr-furio-san-vito.md` | `"Consultar horario"` | Siempre "Cerrado ahora" |
| `guanavet-liberia.md` | `"Horario a confirmar (posiblemente cierra ~19:00)"` | Siempre "Cerrado ahora" |
| `hospital-vet-hipermascotas-guadalupe.md` | `"Horario a confirmar (posiblemente cierra ~20:00)"` | Siempre "Cerrado ahora" |
| `hospital-veterinario-ganagro-ciudad-quesada.md` | `"Consultar horario \| Emergencias: 8817-0000"` | Siempre "Cerrado ahora" |
| `lotovet-golfito.md` | `"Horario diurno, consultar disponibilidad"` | Siempre "Cerrado ahora" |
| `santivet-san-isidro.md` | `"Consultar horario"` | Siempre "Cerrado ahora" |
| `veterinaria-bethellos-guacimo.md` | `"Horario diurno, consultar disponibilidad"` | Siempre "Cerrado ahora" |
| `veterinaria-bosque-verde-san-isidro-de-heredia.md` | `"Horario diurno, consultar disponibilidad"` | Siempre "Cerrado ahora" |
| `veterinaria-ciudad-neily-corredores.md` | `"Horario diurno, consultar disponibilidad"` | Siempre "Cerrado ahora" |
| `veterinaria-dr-alejandro-acevedo-perez-zeledon.md` | `"Consultar horario"` | Siempre "Cerrado ahora" |
| `veterinaria-moravia-moravia.md` | `"Horario diurno, consultar disponibilidad"` | Siempre "Cerrado ahora" |
| `veterinaria-orotina.md` | `"Martes-Domingo con cita previa \| Lunes cerrado"` | Siempre "Cerrado ahora" |
| `veterinaria-palmares-palmares.md` | `"L-S 7am-12md, 1:30pm-6pm"` | Siempre "Cerrado ahora" |

**Consecuencias Graves en Producción:**
1. **En la Portada:** En `FiltrosDashboard.astro`, cuando el usuario activa el filtro "Abierto ahora", la condición `if (filterOnlyOpen && !isOpen) show = false;` oculta inmediatamente estas 24 clínicas.
2. **En la Ficha Individual:** En `src/pages/clinica/[slug].astro`, el badge superior evalúa `isOpenBySchedule("") === false`, mostrando el estado **"Cerrado ahora"** las 24 horas del día de lunes a domingo.

### Defecto 5: Discrepancia de Zona Horaria entre Portada y Ficha
- En `FiltrosDashboard.astro` (portada):
  ```typescript
  function getCostaRicaTime() {
    const now = new Date();
    const crTime = new Date(now.getTime() - (6 * 60 * 60 * 1000)); // UTC-6 Costa Rica
    return { day: crTime.getUTCDay(), hour: crTime.getUTCHours(), minute: crTime.getUTCMinutes() };
  }
  ```
- En `src/pages/clinica/[slug].astro` (detalle, líneas 1043-1045):
  ```typescript
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours() + now.getMinutes() / 60; // ⚠️ USA LA HORA LOCAL DEL DISPOSITIVO
  ```
**Efecto:** Si una persona con móvil configurado en hora de España (UTC+2) entra al sitio a las 8 p.m. de Madrid (12:00 mediodía en Costa Rica), la portada puede mostrarle la clínica como abierta (porque calcula UTC-6), pero al pulsar la ficha para ver el teléfono, la página de detalle le dice en rojo/gris **"Cerrado ahora"** porque lee las 8 p.m. de su teléfono.

### Defecto 6: Alucinación en Schema.org para Google (SEO Local)
En `src/pages/clinica/[slug].astro` (líneas 273-288):
```typescript
} else {
  return [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      "opens": "08:00",
      "closes": "20:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Sunday"],
      "opens": "08:00",
      "closes": "19:00"
    }
  ];
}
```
Si una clínica tiene horario no estandarizado o desconocido, el código le inyecta a Google un horario inventado de 8:00 a.m. a 8:00 p.m. de lunes a sábado y domingos de 8:00 a.m. a 7:00 p.m.

---

## 5. Proceso Estándar para la Creación de Nuevas Fichas

Para detener la propagación de datos defectuosos, se define el siguiente procedimiento estandarizado:

### 5.1 Protocolo de Auditoría Previo a la Creación
1. **Verificación Operativa Telefónica:**
   - Confirmar si la clínica cuenta con médico presencial nocturno para emergencias. Si no hay médico físico permanente toda la noche, está estrictamente prohibido marcar `emergencias24h: true` o `emergency_tier: "Tier A"`.
2. **Geocodificación Exacta:**
   - Obtener latitud y longitud numéricas con al menos 4 decimales.
   - Probar los enlaces de Waze (`https://waze.com/ul?q=...`) y Google Maps (`https://maps.google.com/?q=...`).
3. **Estandarización Obligatoria de `horarioTexto`:**
   - Mientras se introduce un campo estructurado, redactar el horario usando la sintaxis canónica:
     - Días: `L-D`, `L-S`, `L-V`, `S-D`, `S`, `D`.
     - Horas: `8am-5pm`, `8:30am-6:30pm` (usar `12pm` en lugar de `12md`).
     - Si el horario es desconocido o con cita previa, indicarlo explícitamente y asignar `categoriaHorario: "Horario normal"` con una nota en `verification_notes`.

### 5.2 Plantilla Canónica de Ficha Markdown
Crear el archivo en `src/content/clinicas/<slug-unico>.md`:

```markdown
---
id: 154
nombre: "Clínica Veterinaria Ejemplo"
provincia: "San José"
zona: "Escazú"
direccion: "100 metros norte del parque central, Escazú"
telefono1: "2289-0000"
telefono2: ""
whatsapp: "8888-0000"
horarioTexto: "L-S 8am-6pm"
categoriaHorario: "Horario normal"
emergencias24h: false
atiendeExoticos: false
cirugiaEmergencia: false
atiendeGranja: false
atiendePeces: false
hotelMascotas: false
hotelVerificacion: "no-confirmado"
hotelFuente: ""
confidence_score: "medium"
record_status: "VERIFIED"
emergency_tier: "Tier C"
last_verified: "2026-09-07"
phone_verified: true
address_verified: true
schedule_verified: true
emergency_verified: false
has_surgery: false
has_hospitalization: false
overnight_doctor_present: false
accepts_emergency_walkins: false
verification_notes: ["Horario verificado en llamada directa. Atención diurna general."]
verification_source: "Auditoría telefónica"
latitude: 9.9182
longitude: -84.1405
waze_url: "https://waze.com/ul?q=Clinica%20Veterinaria%20Ejemplo%20Escazu"
maps_url: "https://maps.google.com/?q=9.9182,-84.1405"
web: ""
facebook: ""
instagram: ""
slug: "clinica-veterinaria-ejemplo-escazu"
estado: "publicado"
copyDiferenciador: "Atención médica preventiva y vacunación en el centro de Escazú."
---

Detalles adicionales sobre servicios de laboratorio clínico básico y estética canina diurna.
```

---

## 6. Plan de Acción Inmediato Recomendado

Para corregir los errores en producción de forma definitiva:

1. **Centralizar el Módulo de Horarios (`src/lib/schedule.ts`):**
   - Unificar la función de parseo de horarios y la de cálculo de zona horaria (`America/Costa_Rica` UTC-6) para que `ClinicaCard.astro`, `[slug].astro` y `FiltrosDashboard.astro` consuman la misma lógica.
2. **Soporte para Horarios No Estructurados:**
   - Si una clínica tiene `"Consultar horario"` o `"Horario diurno, consultar disponibilidad"`, **no debe mostrar "Cerrado ahora"**. Debe mostrar un chip neutro: `Horario por confirmar · Llamar`.
   - En los filtros, no ocultar estas clínicas diurnas cuando el usuario busca opciones generales durante el día.
3. **Corregir las 24 Fichas Afectadas:**
   - Normalizar la redacción de las 24 fichas listadas en la Sección 4 para que tengan horarios legibles por el sistema.
4. **Agregar Test Automatizado de Validación (`tests/unit/schedule.test.ts`):**
   - Implementar una prueba en `npm test` que valide que ninguna ficha en `src/content/clinicas/*.md` produzca una regla de horario rota.
5. **Crear el Skill de Creación de Fichas:**
   - Formalizar un Skill de Antigravity (`investigar-veterinaria`) que guíe la generación de nuevas fichas exigiendo campos obligatorios, validando coordenadas y verificando la coherencia del horario.

> [!TIP]
> La especificación detallada de arquitectura, código y diseño para cada uno de estos 5 puntos se encuentra completamente desarrollada en el documento adjunto:
> 🔗 [`guia-implementacion-skill-horarios-y-ci.md`](./guia-implementacion-skill-horarios-y-ci.md).

