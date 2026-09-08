# Auditoría independiente B4

Fecha: 2026-09-08
SHA auditado: `dab96fd36d7056d9700642ba4afa51cbfe79111b`
BASE contractual: `f9f2eccff6d2acc494ccbc9f74b7fefeb7878ec0`
Rama auditada: `origin/codex/blog-b4-seed`
Veredicto: **RECHAZADO**
Firma: **Equipo de Vet24cr**

## Veredicto ejecutivo

El candidato no satisface B4. La estructura técnica principal pasa en ejecución serial: build, unitarios, verificador manual, catálogo, mirrors, sitemap, canonical, JSON-LD, cinco artículos publicados, ausencia de borradores y enlaces tipados/inversos. Sin embargo, quedan cuatro hallazgos bloqueantes abiertos: una afirmación local más específica que la fuente citada, varias citas AVMA no comprobables, un verificador de fuentes que reporta `pass` aun con fuentes inaccesibles y código ejecutable archivado dentro de la carpeta de evidencia contra la regla expresa del plan.

No hubo merge ni despliegue. La verificación productiva posterior de §7 sigue pendiente y este informe no declara B4 aprobada ni cerrada.

## Hallazgos priorizados

### [P0] E7 no sostiene “reptiles y aves”

La matriz de `atencion-veterinaria-para-exoticos` afirma que Hospital Veterinario Santamaría declara atención a reptiles y aves y localiza el pasaje en las secciones 4–6. La URL citada, revisada el 2026-09-08, solo enumera “atención a mascotas exóticas”; las secciones 5–6 cubren disponibilidad de citas y confirmación telefónica. No aparecen “reptiles” ni “aves”. El artículo abre el párrafo con “Un establecimiento puede declarar atención a reptiles y aves” y luego enlaza esa página, creando una especificidad que la fuente no respalda.

Esto cae directamente bajo §5/B4: una inferencia sin sustento o contradicción queda bloqueante. Debe reducirse la afirmación a “mascotas exóticas” o sustituirse por una fuente profunda que identifique expresamente las especies, actualizar briefing/matriz/artículo y reauditar un SHA nuevo.

### [P0] Cinco citas de tres documentos AVMA no son comprobables

Los endpoints de `ChoosingaVet_2016.pdf`, `SelectReptile-En.pdf` y `mcm-client-brochures-pet-first-aid-2025.pdf` responden con un 302 autorreferente y terminan en el límite de 50 redirecciones. El snapshot de la ejecutora ya registraba 404 para los dos primeros. En la repetición independiente, el propio verificador marcó esos URLs como `reachable: false` sin status final.

Los documentos sostienen filas E2, E6, C7, G7 y P7. Por tanto, cinco filas no cumplen el requisito de pasaje comprobable. Deben reemplazarse por URLs oficiales estables o archivarse evidencia verificable permitida por el contrato; luego hay que actualizar las citas y reauditar.

### [P0] El verificador de fuentes produce un falso positivo contractual

`verify-sources.mjs` devuelve exit 0 y `pass: true` aunque su salida contiene varias fuentes `reachable: false`, incluidas las AVMA sin status final. El `contractPass` actual solo prueba cantidad/formato de URLs profundas, no que las fuentes ni los pasajes sean comprobables. La evidencia archivada presenta ese resultado como “contrato documental de fuentes” aprobado, lo que contradice el criterio de §5/B4.

El control debe fallar ante una fuente requerida no recuperable o exigir una comprobación alternativa explícita del pasaje. Un 403 atribuible a anti-bot puede documentarse como limitación de herramienta si otra comprobación íntegra demuestra el pasaje; un redirect infinito/404 sin evidencia alternativa no puede convertirse en pass.

### [P1] La carpeta de evidencia contiene código ejecutable prohibido

El diff añade `compare-agent-scans.mjs`, `verify-artifacts.mjs` y `verify-sources.mjs` bajo `docs/blog/evidencia/b4/`. §6 permite allí registros, JSON, texto, logs, diffs de fixtures y capturas, y dice expresamente “no código ejecutable oculto”. El glob de propiedad no revoca la restricción de tipos de artefacto.

Los scripts deben moverse a una ruta de código autorizada mediante cambio documental de allowlist, o retirarse y conservar únicamente comandos/salidas permitidos. Cualquier cambio requiere un candidato nuevo y revisión de alcance.

## Observaciones no bloqueantes y técnicas

- La fila Z3 del briefing promete un H2 “Cartago y Curridabat”, pero el artículo separa la evidencia: cita Medical Pets dentro de “San José” para Curridabat y deja la afirmación de Cartago sin enlace inmediato. La misma URL sí aparece en el artículo y confirma ambas sedes; conviene alinear H2/matriz y colocar la cita junto a Cartago para que la trazabilidad no dependa de contexto distante.
- `npm run test:e2e` con paralelismo predeterminado falló por saturación del preview (55 fallos). La repetición serial `npm run test:e2e -- --workers=1` pasó 99 pruebas y conservó 11 skips preexistentes; los 19 specs B4 pasaron aparte. Esto demuestra el comportamiento candidato en serial, pero el intento literal no cero debe conservarse y el arnés debería fijar un modo reproducible.
- El build emitió el fallback conocido de `Request.cf` por verificación TLS y terminó 0.

## Auditoría fila por fila

Leyenda: **OK** = institución elegible y afirmación/pasaje coherentes; **BLOQUEA** = no comprobable o no sustentado; **OBS** = comprobable, pero la trazabilidad editorial debe alinearse.

| Artículo | Filas | Resultado independiente |
|---|---|---|
| urgencias-en-perros | P1 OK; P2 OK; P3 OK; P4 OK; P5 OK; P6 OK; P7 **BLOQUEA** | AAHA, Cornell y Merck son fuentes veterinarias elegibles; P7 depende del PDF AVMA no recuperable. |
| urgencias-en-gatos | G1 OK; G2 OK; G3 OK; G4 OK; G5 OK; G6 OK; G7 **BLOQUEA** | Cornell, Merck, AAHA e International Cat Care son elegibles; G7 depende del PDF AVMA no recuperable. |
| atención para exóticos | E1 OK; E2 **BLOQUEA**; E3 OK; E4 OK; E5 OK; E6 **BLOQUEA**; E7 **BLOQUEA** | E2/E6 usan PDFs AVMA no recuperables; E7 amplía “mascotas exóticas” a reptiles y aves sin pasaje citado. |
| costo nocturno | C1 OK; C2 OK; C3 OK; C4 OK; C5 OK; C6 OK; C7 **BLOQUEA** | Facultades y páginas oficiales son elegibles; C7 depende del PDF AVMA no recuperable. No se publican tarifas inventadas. |
| 24 h por zona | Z1 OK; Z2 OK; Z3 **OBS**; Z4 OK; Z5 OK; Z6 OK; Z7 OK | Las siete son páginas oficiales de establecimientos y solo respaldan declaraciones propias. Z3 confirma Cartago/Curridabat, pero matriz y H2/cita no están alineados. |

## Resultado de validaciones

| Control | Resultado |
|---|---|
| Identidad/ancestría | SHA exacto y BASE ancestro: pass |
| `npm run check` | pass; 0 errores, 75 hints |
| `npm run test:unit` | pass; 78/78 |
| `npm run build:no-shorten` | pass |
| `node scripts/verification/blog.mjs` | pass; 5 publicados, 139 HTML |
| `node scripts/verification/agent-catalog.mjs` | pass; 112 clínicas/112 rutas |
| `node scripts/verification/agent-markdown.mjs` | pass; 127 mirrors |
| `npm run test:e2e` literal | fail en paralelo; intento preservado |
| E2E serial diagnóstico | pass; 99, 11 skips heredados |
| Specs B4 seriales | pass; 19/19 |
| Diff BASE…HEAD | 156 rutas revisadas; producto dentro de allowlist, pero tres `.mjs` violan la regla de tipo de evidencia |
| Sitemap/artefactos/JSON-LD | pass; cinco rutas, canonical, `Article`, autor `Organization`, fechas y cero borradores |
| Verificación productiva posterior | **pendiente; no ejecutable sin merge/despliegue autorizado** |

## Separado: observación sobre B3

El SHA BASE `f9f2ecc…` sí contiene la línea B3 completa hasta `3d03ecc…`, incluida la firma organizacional y la política. Sin embargo, dentro de `docs/blog/evidencia/b3/` no aparece el archivo nominal `blog-verificadora.log` requerido por §7 ni una evidencia posterior que vincule el SHA servido en producción con el deployment. Esto no altera el candidato B4, pero la coordinadora debe conservar o integrar la evidencia B3 producida en la otra línea de trabajo antes de afirmar que la dependencia “B3 desplegada/verificada” está demostrada en el HEAD final.

## Condiciones para una nueva auditoría

1. Corregir E7 y la redacción asociada.
2. Sustituir o hacer comprobables los tres endpoints AVMA y sus cinco filas.
3. Endurecer la verificación de fuentes para que inaccesibilidad sin evidencia alternativa no sea pass.
4. Retirar o reubicar los `.mjs` de evidencia con allowlist autorizada.
5. Repetir §7 sobre el SHA nuevo y solicitar otra auditoría independiente.
6. Tras autorización humana de merge/despliegue, demostrar correspondencia SHA–deployment y completar toda la comprobación productiva. Hasta entonces B4 permanece no aprobada.

Firma: **Equipo de Vet24cr**
