# Auditoría independiente I01 / implementación #27 — r2

**Resultado: APROBADO**

Reauditoría realizada el 2026-09-16 contra `docs/issues/admin/I01.md` (R02), después de corregir el hallazgo P1 de r1 y el redondeo del adaptador compacto. No se modificó implementación.

## Identidad auditada

SHA-1 de los artefactos auditados en el árbol de trabajo:

| Artefacto | SHA-1 |
|---|---|
| `src/lib/clinic-schema.ts` | `d1f87f6b422a4d45e11c152bd6bae15ae7c6434a` |
| `src/lib/schedule.ts` | `00b8b8123fed907a98eda7301ea03eea96229a2b` |
| `src/content.config.ts` | `55869a1247b7b6cc553d67c3a73b5f86abb83254` |
| `tests/unit/schedule.test.ts` | `adffff353f4bc13df1ef5e8ea17860cbc7596644` |
| `package.json` | `6c6896984e478848ba262180136fea9831ceba3b` |
| `package-lock.json` | `2d88e657cf27caa3a5c8240fc70575a009e8ecd9` |
| `docs/issues/admin/I01.md` | `6ee7e4e9f2bf08a37b2aa5f8404c67526fdb967a` |

## Evidencia

- `node --test tests/unit/schedule.test.ts`: **11/11 PASS**, incluyendo el caso de excepciones que invalida Tier A y la propiedad que recorre los 1440 minutos del adaptador compacto.
- `npm run check`: **0 errores, 0 warnings** de Astro/TypeScript; quedan 37 hints existentes, entre ellos el uso de la API compacta deprecada por consumidores que #32 migrará.
- Se verificaron nuevamente límites, fechas reales/únicas, intervalos semiabiertos, overnight, TZ fija UTC-6, estados `unknown`/`appointment`, serialización determinista, Schema.org y ausencia de heurísticas de días.

## Revisión del hallazgo r1

`isVerifiedEmergency247` ahora exige que los siete días y todas las excepciones sean intervalos exactamente `[0,1440)`, junto con las cuatro capacidades, Tier A y evidencia directa validada por schema. Excepciones `closed`, `unknown`, `appointment` o de horario parcial devuelven `false`; fechas ISO imposibles en la evidencia también devuelven `false`. El caso que anteriormente producía un falso positivo queda cubierto por prueba.

El adaptador compacto convierte horas a minutos con redondeo controlado y rechaza fracciones que no representan minutos exactos. La prueba de 1440 minutos confirma que no hay falsos límites por coma flotante.

No quedan hallazgos bloqueantes en el alcance de #27. La migración de consumidores compactos y la suite transversal pertenecen a #32/#36 según el issue.
