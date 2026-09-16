# Reauditoría independiente de issues administrativos (issues-r2)

Fecha: 2026-09-15, Costa Rica. Auditor: Luna, esfuerzo medium. Se consultaron nuevamente los issues remotos #27–#37 con gh issue view; no se usaron los candidatos locales como fuente. SDD sin cambios: SHA256 10797303D82C4D7E2B5020EEA4312E40901FD7DBC2275A3BB68442A17C7532B5.

## Veredicto

**APROBADO.** Los once issues son ahora contratos implementables y revisables sin depender de que el SDD local esté publicado: cada uno incorpora extractos normativos íntegros de las secciones declaradas, invariantes comunes, tareas en formato CommonMark válido, criterios medibles, validación, propiedad del trabajo, límites y dependencias enlazadas. Los gaps sustantivos de r1 fueron cerrados.

## Comprobaciones

| Control | Resultado |
|---|---|
| Issues remotos #27–#37, estado y títulos | 11/11 encontrados, OPEN, títulos coinciden con manifest |
| Checkboxes | 97 task items válidos; 0 usos inline inválidos |
| SDD exacto | SHA256 coincide en los 11 cuerpos y manifest |
| Prioridad/labels | Coinciden en los 11 issues (P0/P1 y etiquetas de dominio) |
| Dependencias | Coinciden cuerpo/manifest; enlaces GitHub explícitos; grafo acíclico |
| Propiedad y scope | Declarados; #27 posee motor, #32 proyección/consumidores, #31 persistencia compartida, #33 reportes, #34 runner; interfaces compartidas no se duplican |
| Criterios | Cada issue tiene checks verificables y evidencia de validación; no afirma pruebas futuras ya ejecutadas |
| Autosuficiencia | Cada issue incluye contrato aplicable, fixtures, límites y exclusiones; el hash identifica el SDD pero no sustituye los extractos |

## Resultado por issue

- **#27 / I01 — PASS.** El contrato de horarios ahora fija modelo estricto, unknown/closed/appointment/open, límites, solapes, excepciones, overnight, parser residual, UTC/TZ, emergencias Tier A, Schema.org y fixtures adversariales. La propiedad excluye correctamente la migración de consumidores, que pertenece a #32.
- **#28 / I02 — PASS.** Incluye validación YAML real, schema/evidencia por campo, deduplicación/geografía/URLs, matriz de adquisición y fallback, restricciones Places, escritura atómica, estados y deuda versionada/bootstrap.
- **#29 / I03 — PASS.** Define saneamiento dinámico del catálogo, evidencia y unknown sin invención, IDs estables, deuda estricta, hashes/merge-base/expiración y criterios para colección completa, fixtures y reversión.
- **#30 / I04 — PASS.** Incluye secuencia edge/origen, JWT/JWKS/claims/allowlist, hosts/canonicalización/assets, CSRF/métodos/límites/rate, respuestas 401/403/503/405, tombstones, frontera Workers y pruebas de cero efectos.
- **#31 / I05 — PASS.** Fija migraciones 0001–0003, ledger/preflight, CAS D1 y auditoría atómica, idempotencia uniforme, expiración, backfill, consistencia de lectura, reportes compatibles, retención y fixtures concurrentes.
- **#32 / I06 — PASS.** Define consumidor único, precedencia, snapshot/timeout/convergencia medibles, fallback UNCONFIRMED, no-JS/no-store, filtros y contadores coherentes, Tier A y preservación SEO/Markdown.
- **#33 / I07 — PASS.** Fija endpoints, validación y persistencia veraz, estados/revisión/auditoría, idempotencia, privacidad, XSS como texto, límites/rate y pruebas D1/auth/CSRF.
- **#34 / I08 — PASS.** Fija outbox D1 + Cron, leases/CAS, etapas, timeouts/retries/429, payload/hash, permisos GitHub, reconciliación post-efecto, PR única, retry idempotente y ausencia de auto-merge/deploy.
- **#35 / I09 — PASS.** Define catálogo/editor completo, ownership de interfaces, schedule/evidencia/capacidades, CAS/409, UUID/dedupe, enlaces seguros, SSRF, accesibilidad y preservación de contenido.
- **#36 / I10 — PASS.** Define harness Wrangler/Workers/D1 real, DB nueva/legacy, fixtures JWT/GitHub, aislamiento/cleanup, prohibiciones de mocks/remoto, gates dinámicos, cron bundle y matriz completa de regresión.
- **#37 / I11 — PASS.** Define preflight/ledger/backup/restore, hosts remotos y tombstones, rollout staging, observabilidad/umbrales, purga/retención, rotación y rollback no destructivo.

## Cobertura R01–R12 y secciones 2–12

La trazabilidad del manifest asigna R01–R12 sin requisitos huérfanos: R01/R03 en I02–I03; R02 en I01/I03; R04 en I06/I07/I09; R05 en I09; R06 en I05; R07 en I06; R08 en I08/I09; R09 en I04/I05/I07/I08; R10 en I10; R11 en I11; R12 en I04/I06/I10. Las secciones 2–9 y los anexos 12.1–12.8 aparecen como extractos en los issues propietarios o como interfaces explícitamente referenciadas a su propietario. §10 (plan/trazabilidad) está reflejado en manifest, dependencias y ownership; §11 (fuentes) se conserva dentro de los extractos donde aplica.

No detecté contradicciones internas, dependencia cíclica, prioridad incongruente ni scope duplicado material. Los contratos compartidos están delimitados por ownership y se prueban desde los consumidores dependientes.

## Reproducibilidad

El snapshot remoto reproducible está en [issues-r2-snapshot.json](C:/Users/grcx1/OneDrive/Documentos/Proyectos/vete/veterinarias-cr/docs/auditorias/admin/issues-r2-snapshot.json), con fecha de consulta, SHA256 de cada body, labels, dependencias y SHA del SDD. No se modificaron issues, SDD ni código, ni se enviaron comentarios.
