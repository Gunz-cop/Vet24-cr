import { z } from 'zod';

export const intervalSchema = z.strictObject({
  start: z.number().int().min(0).max(1439),
  end: z.number().int().min(1).max(1440),
}).refine(({ start, end }) => start < end, 'El inicio debe preceder al cierre');

export const daySchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('unknown') }),
  z.strictObject({ kind: z.literal('closed') }),
  z.strictObject({ kind: z.literal('appointment') }),
  z.strictObject({ kind: z.literal('open'), intervals: z.array(intervalSchema).min(1).max(8) }),
]).superRefine((day, ctx) => {
  if (day.kind !== 'open') return;
  const sorted = [...day.intervals].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) ctx.addIssue({ code: 'custom', message: 'Intervalos superpuestos', path: ['intervals'] });
  }
}).transform((day) => {
  if (day.kind !== 'open') return day;
  const intervals: { start: number; end: number }[] = [];
  for (const interval of [...day.intervals].sort((a, b) => a.start - b.start)) {
    const previous = intervals.at(-1);
    if (previous?.end === interval.start) previous.end = interval.end;
    else intervals.push({ ...interval });
  }
  return { kind: 'open' as const, intervals };
});

export const scheduleSchema = z.strictObject({
  version: z.literal(1), timeZone: z.literal('America/Costa_Rica'),
  days: z.tuple([daySchema, daySchema, daySchema, daySchema, daySchema, daySchema, daySchema]),
  exceptions: z.array(z.strictObject({ date: z.iso.date(), day: daySchema })).max(60),
}).superRefine(({ exceptions }, ctx) => {
  const dates = new Set<string>();
  for (const [index, exception] of exceptions.entries()) {
    if (dates.has(exception.date)) ctx.addIssue({ code: 'custom', message: 'Fecha duplicada', path: ['exceptions', index, 'date'] });
    dates.add(exception.date);
  }
}).transform((schedule) => ({ ...schedule, exceptions: [...schedule.exceptions].sort((a, b) => a.date.localeCompare(b.date)) }));

export type ScheduleDay = z.output<typeof daySchema>;
export type ScheduleV1 = z.output<typeof scheduleSchema>;

export const directConfirmationSchema = z.strictObject({
  verifiedAt: z.union([z.iso.date(), z.iso.datetime({ offset: true })]),
  reference: z.string().trim().min(1),
});

export function emptySchedule(kind: 'unknown' | 'closed' = 'unknown'): ScheduleV1 {
  return scheduleSchema.parse({ version: 1, timeZone: 'America/Costa_Rica', days: Array.from({ length: 7 }, () => ({ kind })), exceptions: [] });
}

/** Existing catalog fields; kept outside Astro so APIs and research tools share them. */
export const clinicSchema = z.object({
    id: z.union([z.number(), z.string()]),
    nombre: z.string(),
    provincia: z.string(),
    zona: z.string(),
    direccion: z.string(),
    telefono1: z.string().optional().default(""),
    telefono2: z.string().optional().default(""),
    whatsapp: z.string().optional().default(""),
    horarioTexto: z.string(),
    schedule_v1: scheduleSchema.optional(),
    categoriaHorario: z.enum(["24/7 Emergencias", "Cierra después 21h", "Horario normal"]),
    emergencias24h: z.boolean(),
    atiendeExoticos: z.boolean(),
    cirugiaEmergencia: z.boolean(),
    atiendeGranja: z.boolean().optional().default(false),
    atiendePeces: z.boolean().optional().default(false),
    hotelMascotas: z.boolean().optional().default(false),
    hotelVerificacion: z.enum(["confirmado", "reportado", "no-confirmado"]).optional().default("no-confirmado"),
    hotelFuente: z.string().optional().default(""),
    confidence_score: z.enum(["high", "medium", "low"]).optional().default("medium"),
    record_status: z.enum(["VERIFIED", "PARTIAL", "REVIEW_REQUIRED", "CANDIDATE_REMOVAL"]).optional().default("PARTIAL"),
    emergency_tier: z.enum(["Tier A", "Tier B", "Tier C", "Tier D"]).optional().default("Tier C"),
    last_verified: z.string().optional().default(""),
    phone_verified: z.boolean().optional().default(false),
    address_verified: z.boolean().optional().default(false),
    schedule_verified: z.boolean().optional().default(false),
    emergency_verified: z.boolean().optional().default(false),
    has_surgery: z.boolean().optional().default(false),
    has_hospitalization: z.boolean().optional().default(false),
    overnight_doctor_present: z.boolean().optional().default(false),
    accepts_emergency_walkins: z.boolean().optional().default(false),
    verification_notes: z.array(z.string()).optional().default([]),
    verification_source: z.string().optional().default(""),
    latitude: z.number().optional().default(0),
    longitude: z.number().optional().default(0),
    waze_url: z.string().optional().default(""),
    maps_url: z.string().optional().default(""),
    web: z.string().optional().default(""),
    facebook: z.string().optional().default(""),
    instagram: z.string().optional().default(""),
    slug: z.string(),
    estado: z.enum(["pendiente", "publicado", "verificado", "inactivo"]),
    copyDiferenciador: z.string(),
  });
