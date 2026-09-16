# Auditoría independiente I01 / implementación #27 — r1

**Resultado: RECHAZADO**

Auditoría realizada el 2026-09-16 contra `docs/issues/admin/I01.md` (R02). Se revisaron el schema puro, parser legado, evaluador, serializadores y compatibilidad de la colección Astro. No se modificó implementación.

## Identidad auditada

SHA-1 de los artefactos auditados en el árbol de trabajo:

| Artefacto | SHA-1 |
|---|---|
| `src/lib/clinic-schema.ts` | `6b7bab9b5eae44c94fe72b79c534421fb821ffdb` |
| `src/lib/schedule.ts` | `7125df470c213ec0164a4673a70573501a199eb4` |
| `src/content.config.ts` | `55869a1247b7b6cc553d67c3a73b5f86abb83254` |
| `tests/unit/schedule.test.ts` | `16b94aa05c9ab082c2bde594fc37def34bc40260` |
| `package.json` | `6c6896984e478848ba262180136fea9831ceba3b` |
| `package-lock.json` | `2d88e657cf27caa3a5c8240fc70575a009e8ecd9` |
| `docs/issues/admin/I01.md` | `6ee7e4e9f2bf08a37b2aa5f8404c67526fdb967a` |

## Evidencia ejecutada

- `node --test tests/unit/schedule.test.ts`: **10/10 PASS**.
- `npm run check`: **0 errores**, con hints/warnings preexistentes y avisos de uso de la API compacta de horario deprecada.
- `npm test`: **86 PASS / 1 FAIL**. El fallo está en `tests/unit/agent-routing.test.ts`: rutas administrativas añadidas por trabajo concurrente aparecen en `run_worker_first`; no se atribuye a #27.
- Casos adversariales manuales confirmaron rechazo de `8am-5pm` sin día, horas inválidas, segmentos no interpretados, y conservación de `unknown`/`appointment`.

## Hallazgo bloqueante

**P1 — `isVerifiedEmergency247` ignora excepciones fechadas.** En `src/lib/schedule.ts:218-223` solo se comprueba que los siete días base sean `[0,1440)`. Una excepción que cierre un día no cambia el resultado. Reproducción:

```ts
const s = parseLegacySchedule('24/7').schedule;
s.exceptions.push({ date: '2026-09-19', day: { kind: 'closed' } });
isVerifiedEmergency247(s, {
  emergencias24h: true, emergency_verified: true,
  overnight_doctor_present: true, accepts_emergency_walkins: true,
  emergency_tier: 'Tier A',
  directConfirmation: { verifiedAt: '2026-09-15', reference: 'x' }
}); // true, incorrecto
```

El contrato exige horario completo 24h para Tier A. Cualquier excepción `closed`, `unknown`, `appointment` o intervalo distinto de 24h debe impedir esa afirmación (o el evaluador debe probar que no existe excepción relevante). Corregir la condición y añadir un fixture de regresión para excepción fechada.

## Cobertura conforme

El schema estricto valida límites de minutos, intervalos superpuestos, fusión de contiguos, tupla de siete días, fechas reales/únicas y máximo de excepciones. El parser no asigna L-V por defecto y devuelve `invalid` ante segmentos relevantes sin interpretar. El evaluador usa UTC-6 fijo, respeta extremos semiabiertos y devuelve `UNCONFIRMED` para entrada/fecha inválida y estados desconocidos. El overnight se divide y exige confirmación del resto del día. La serialización es determinista; `scheduleAttr` queda vacío cuando hay excepciones. Schema.org omite estados desconocidos/cita, representa cierre y 24h según los fixtures, y emite excepciones conocidas.

La auditoría no exige la migración de consumidores de #32. Sí queda advertido que `ClinicaCard.astro` y `[slug].astro` aún usan el adaptador compacto deprecado; esto explica hints de `npm run check` y debe resolverse en #32.

**Condición de cierre:** corregir el hallazgo P1, agregar prueba de excepción que invalide Tier A y repetir esta auditoría con nuevos hashes.
