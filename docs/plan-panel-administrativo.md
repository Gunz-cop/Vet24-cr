# Plan de Implementación: Panel de Administración de Fichas y Sistema de Autenticación (Vet24)

Este documento presenta el diseño técnico, análisis de arquitectura y plan de ejecución para dotar a Vet24 de un **Panel Administrativo (`/admin`)** que permita a Gonzalo (y colaboradores autorizados) buscar, auditar, crear y modificar fichas de veterinarias con una interfaz visual intuitiva, eliminando la fricción de editar manualmente cientos de archivos Markdown o depender de prompts a ciegas con IAs.

---

## 1. Análisis de Arquitectura: ¿Markdown vs. Base de Datos?

Uno de los dilemas clave planteados es si a este volumen (112 fichas y en crecimiento a 200+) conviene seguir con archivos Markdown (`.md`) o migrar las fichas a una base de datos.

### Comparativa Técnica:

| Criterio | Opción A: Base de Datos Relacional (Cloudflare D1 / SQLite) | Opción B: Git-Backed CMS (Archivos Markdown en Repositorio) | Opción C: Híbrido (SSG Markdown Base + D1 Capa en Vivo) ⭐ **Recomendada** |
|---|---|---|---|
| **Velocidad de Carga al Usuario Final** | Puede ser rápida si se cachea en Edge, pero cada visita sin caché consulta D1 en SSR. Mayor latencia en redes móviles 3G lentas. | **Instantánea (0 ms DB lookup).** Los HTMLs están pre-renderizados en el Edge de Cloudflare (SSG). | **Instantánea (0 ms DB lookup).** HTML estático carga de inmediato; un fetch asíncrono liviano consulta solo si hay alertas en vivo. |
| **Tiempo de Publicación de Cambios** | **Inmediato (< 1 segundo).** El cambio se escribe en D1 y se refleja en la siguiente recarga. | **Lento (1 a 2 minutos).** Requiere commit en Git + ejecución del build de Cloudflare Pages. | **Inmediato para emergencias / horarios (vía D1).** Permanente / estructural (vía Git). |
| **Auditoría e Historial de Cambios** | Requiere programar tablas de logs de auditoría (`audit_log`) para saber quién cambió qué. | **Nativo en Git.** Historial completo de commits con autor, fecha, diff exacto y rollback con un clic. | **Doble beneficio:** Auditoría formal en Git para el catálogo + historial rápido en D1. |
| **Resistencia a Caídas en Emergencias** | Si la base de datos se satura o sufre un corte, el sitio completo deja de abrir fichas. | **Indestructible.** Si la base de datos se cae, el 100% de las fichas siguen funcionando al ser estáticas. | **Indestructible.** Si D1 falla, el sitio muestra la ficha estática sin degradar el servicio. |
| **Costo Operativo en Cloudflare** | Puede consumir cuotas de lecturas D1 en días de alto tráfico. | **Costo $0.** Cloudflare Pages sirve activos estáticos ilimitados. | **Costo prácticamente $0.** |

### Veredicto y Arquitectura Recomendada: Opción C (Modelo Híbrido Progresivo)
1. **La verdad histórica y el catálogo base permanecen en Markdown compilado (SSG):** Esto preserva la misión sagrada del proyecto: *un sitio ultrarrápido, que cargue en 200ms en el teléfono de un dueño con un perro convulsionando en la madrugada*.
2. **El Panel Admin en `/admin` ofrece dos niveles de acción:**
   - **Nivel 1 — Edición en Caliente (Vía Cloudflare D1 ya configurado):** Permite actualizar en 1 segundo: estado de apertura de emergencia, avisos temporales ("Cirujano no disponible hasta las 6 AM"), o cambios rápidos de horario. Utiliza la tabla `clinic_overrides` existente en D1.
   - **Nivel 2 — Edición Estructural / Permanente (Vía GitHub API o Herramienta CMS):** Modifica el archivo `.md` (dirección, coordenadas, servicios, notas) y hace un commit automático en GitHub, disparando el build limpio de Pages.

---

## 2. Mejores Prácticas para el Sistema de Autenticación y Login

Para acceder a la ruta administrativa `/admin`, se evalúan dos alternativas líderes de la industria:

### Alternativa 1: Cloudflare Access / Zero Trust (Máxima Seguridad y Cero Código)
* **Cómo funciona:** En el dashboard de Cloudflare, se crea una política de aplicación para la ruta `vet24cr.com/admin*`.
* **Flujo de Usuario:** Al intentar ingresar a `/admin`, Cloudflare intercepta la solicitud en el Edge antes de que toque la aplicación y solicita autenticación mediante:
  - Google Workspace / Cuenta personal de Gmail.
  - O un PIN de un solo uso (OTP) enviado al correo de Gonzalo.
* **Ventajas:**
  - **Cero código de login que mantener o parchar.**
  - Inmune a ataques de fuerza bruta, robo de base de datos de contraseñas o inyecciones SQL.
  - Permite acceso solo a correos autorizados en lista blanca (`gonzalo@...`).

### Alternativa 2: Módulo de Login Propio en Astro (Custom UI con Tema Vet24)
Si se prefiere una pantalla de login integrada estéticamente con el diseño del sitio:
* **Ruta:** `/admin/login` (formulario con correo y contraseña, o Magic Link por correo mediante el binding `EMAIL` ya presente en `wrangler.toml`).
* **Seguridad Criptográfica:**
  - **Haseho de contraseñas:** Uso de `Web Crypto API` (nativa en Cloudflare Workers) con PBKDF2 (100.000 iteraciones con sal criptográfica única) o Argon2.
  - **Manejo de Sesiones:** Al validar credenciales, se genera un token de sesión opaco (`crypto.randomUUID()`) almacenado en el KV `SESSION` (ya vinculado en `wrangler.toml`) con expiración de 7 días.
  - **Cookies:** Cookie `vet24_session` con banderas obligatorias: `HttpOnly; Secure; SameSite=Lax; Path=/admin`.
  - **Middleware de Protección (`src/middleware.ts`):** Intercepta cualquier ruta que inicie con `/admin` (excepto `/admin/login`) y verifica la validez del token en el KV `SESSION`.
  - **Rate Limiting anti fuerza bruta:** Almacenar intentos fallidos por IP en KV; tras 5 intentos fallidos, bloquear por 15 minutos.

---

## 3. Especificación Funcional del Panel Administrativo (`/admin`)

La interfaz del panel estará construida en Astro con Tailwind CSS v4, optimizada para uso rápido en móvil y desktop:

```
┌────────────────────────────────────────────────────────────────────────┐
│  VET24 ADMIN DASHBOARD                                [ Gonzalo ] [Salir]│
├────────────────────────────────────────────────────────────────────────┤
│  🔍 [ Buscar por nombre, cantón, slug... ]   [ + Nueva Clínica ]       │
│  Filtros: [ Todas (112) ] [ Con Alertas D1 ] [ 24 Fichas Horario Roto ] │
├────────────────────────────────────────────────────────────────────────┤
│  NOMBRE CLÍNICA       ZONA         HORARIO        ESTADO D1    ACCIONES │
│  Hospital Vet Medical Heredia      L-D 9am-9pm    Activo       [Editar] │
│  Veterinaria Gocha    Santo Domingo L-S 8:30-18:30 Activo       [Editar] │
│  Aruma Upala          Upala        ⚠️ Roto (Diurno) [Sin regla] [Corregir]│
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Vistas Principales:
1. **Vista Directorio / Catálogo (`/admin`):**
   - Buscador predictivo en tiempo real con resaltado de discrepancias.
   - Pestaña especial: **"Fichas que requieren atención de horario"** (las 24 clínicas diagnosticadas).
   - Bandeja de reportes de usuarios enviados desde el modal "Reportar error" (conectado a la tabla `reports` de D1).
2. **Vista de Edición de Ficha (`/admin/editar/[slug]`):**
   - **Formulario de Metadatos:** Nombre, provincia, cantón, dirección exacta, teléfonos y WhatsApp con botón de llamada de prueba.
   - **Selector Visual de Horarios (Generador Automático):**
     - En lugar de escribir un texto libre susceptible a errores, el panel ofrece un selector por día (Lunes a Domingo) con horas de apertura y cierre mediante sliders/selectores desplegables, opción de "Cierre de mediodía" y checkbox "24 Horas continuas".
     - El componente compila automáticamente tanto el texto legible en español (`horarioTexto`) como la regla compacta (`scheduleAttr`), impidiendo que se guarden horarios rotos.
   - **Picker de Coordenadas y Mapas:**
     - Mapa interactivo para arrastrar el pin y obtener la latitud/longitud exacta.
     - Botones para autogenerar y probar las URLs de Waze y Google Maps.
   - **Sección de Overrides en Caliente (D1):**
     - Checkbox: `[ ] Cerrado temporalmente por emergencia`.
     - Campo de texto: `Aviso urgente en vivo (ej: "Sin cirujano esta noche por fuerza mayor")`.
     - Botón `[ Guardar Alerta en Vivo en D1 ]` (aplica en 1 segundo sin recompilar).
   - **Botón `[ Guardar Ficha Completa ]`:**
     - Genera el archivo Markdown actualizado o hace commit mediante la API de GitHub.

---

## 4. User Review Required

> [!IMPORTANT]
> **Decisión Requerida sobre el Mecanismo de Autenticación:**  
> ¿Prefieres utilizar **Cloudflare Access (Zero Trust)** (recomendado por máxima seguridad, cero mantenimiento de contraseñas y acceso instantáneo con tu correo) o prefieres una **pantalla de login personalizada con usuario y contraseña** integrada en el diseño oscuro de Vet24?

> [!IMPORTANT]
> **Decisión sobre el Guardado de Fichas:**  
> Para la edición permanente de las fichas, ¿prefieres:  
> - **Opción 1:** Que el panel admin guarde directamente en Cloudflare D1 y el sitio consuma D1 para las fichas editadas?  
> - **Opción 2:** Que el panel haga commit a GitHub vía la API de GitHub (usando un Personal Access Token) preservando el 100% de la arquitectura estática actual?

---

## 5. Plan de Ejecución por Fases

### Fase 1: Motor de Horarios y Backend de Sesiones
- Consolidar el módulo [`src/lib/schedule.ts`](file:///c:/Users/grcx1/OneDrive/Documentos/Proyectos/vete/veterinarias-cr/src/lib/schedule.ts) y su generador bidireccional (Matriz de días/horas ⇄ String normalizado).
- Configurar el middleware de autenticación (`src/middleware.ts`) utilizando Cloudflare Access o el KV `SESSION`.

### Fase 2: APIs Administrativas en Cloudflare Pages
- Crear endpoints en `functions/api/admin/`:
  - `GET /api/admin/clinics`: Listado de clínicas con estado de horarios y alertas D1.
  - `GET /api/admin/reports`: Listado de reportes enviados por usuarios.
  - `POST /api/admin/save-override`: Guardado en caliente en D1.
  - `POST /api/admin/save-clinic`: Guardado permanente (Git commit o D1).

### Fase 3: Interfaz de Usuario del Panel (/admin)
- Layout administrativo protegido con barra lateral, indicador de usuario y navegación rápida.
- Grid de búsqueda y filtros con resaltado de inconsistencias.
- Editor visual de fichas con selector interactivo de horarios y geolocalización.

### Fase 4: Verificación y Pruebas
- Pruebas E2E de Playwright sobre el flujo de autenticación, edición de fichas y reflejo del cambio en la vista pública.
- Validación de que ningún guardado administrativo pueda emitir un horario no parseable.

---

## 6. Verification Plan

### Pruebas Automatizadas
- `npm test`: Correr la suite de validación de tokens de sesión, hashing PBKDF2 y generador visual de horarios.
- `npx playwright test tests/e2e/admin.spec.ts`:
  - Intentar acceder a `/admin` sin autenticación -> esperar redirección 302 a login.
  - Iniciar sesión válida -> acceder al catálogo.
  - Modificar el horario de una clínica con el selector visual -> verificar que la regla generada es válida y que el estado de apertura en la ficha pública se actualiza correctamente.

### Pruebas Manuales
- Editar una ficha real desde el panel administrativo en el entorno de desarrollo y verificar que el cambio se refleja inmediatamente en la UI del directorio.
- Guardar una alerta en caliente en D1 y confirmar que aparece en `/clinica/[slug]` en menos de 2 segundos.
