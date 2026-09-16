import { directConfirmationSchema, emptySchedule, scheduleSchema, type ScheduleDay, type ScheduleV1 } from './clinic-schema.ts';
export type { ScheduleDay, ScheduleV1 } from './clinic-schema.ts';

export interface CostaRicaTime { day: number; hour: number; minute: number }
export type ClinicOpenState = 'OPEN' | 'CLOSED' | 'UNCONFIRMED';
export type ScheduleReason = 'scheduled' | 'unknown' | 'appointment' | 'invalid' | 'live_unavailable' | 'temporary_closed';
export interface ScheduleEvaluation {
  isOpen: boolean; state: ClinicOpenState; reason: ScheduleReason; statusBadgeText: string; badgeClass: string;
}

export function getCostaRicaTime(date = new Date()): CostaRicaTime {
  const shifted = new Date(date.getTime() - 6 * 3600_000);
  return { day: shifted.getUTCDay(), hour: shifted.getUTCHours() + shifted.getUTCMinutes() / 60, minute: shifted.getUTCMinutes() };
}

function result(state: ClinicOpenState, reason: ScheduleReason): ScheduleEvaluation {
  return {
    state, reason, isOpen: state === 'OPEN',
    statusBadgeText: state === 'OPEN' ? 'Abierto ahora' : state === 'CLOSED' ? 'Cerrado ahora' : 'Horario por confirmar',
    badgeClass: state === 'OPEN' ? 'bg-brand-success-bg text-brand-success border-brand-success-border' : 'bg-brand-surface text-brand-text-muted border-brand-card-border',
  };
}

function evaluateDay(day: ScheduleDay, minute: number): ScheduleEvaluation {
  if (day.kind === 'unknown' || day.kind === 'appointment') return result('UNCONFIRMED', day.kind);
  if (day.kind === 'closed') return result('CLOSED', 'scheduled');
  return result(day.intervals.some(i => minute >= i.start && minute < i.end) ? 'OPEN' : 'CLOSED', 'scheduled');
}

export function evaluateScheduleV1(input: unknown, date = new Date()): ScheduleEvaluation {
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success || !Number.isFinite(date.getTime())) return result('UNCONFIRMED', 'invalid');
  const local = new Date(date.getTime() - 6 * 3600_000);
  const localDate = local.toISOString().slice(0, 10);
  const day = parsed.data.exceptions.find(e => e.date === localDate)?.day ?? parsed.data.days[local.getUTCDay()];
  return evaluateDay(day, local.getUTCHours() * 60 + local.getUTCMinutes());
}

/** Editor operation: confirmation covers the remainder of unknown/appointment days. */
export function addScheduleInterval(input: unknown, day: number, start: number, end: number, confirmUnknownDays = false): ScheduleV1 {
  const schedule = scheduleSchema.parse(input);
  if (!Number.isInteger(day) || day < 0 || day > 6 || !Number.isInteger(start) || !Number.isInteger(end)
    || start < 0 || start > 1439 || end < 0 || end > 1440 || start === end) throw new Error('Intervalo inválido');
  const insert = (target: number, from: number, until: number) => {
    const current = schedule.days[target];
    if ((current.kind === 'unknown' || current.kind === 'appointment') && !confirmUnknownDays) throw new Error('Confirma el resto del día antes de añadir el intervalo');
    schedule.days[target] = { kind: 'open', intervals: [...(current.kind === 'open' ? current.intervals : []), { start: from, end: until }] };
  };
  if (end > start) insert(day, start, end);
  else { insert(day, start, 1440); if (end > 0) insert((day + 1) % 7, 0, end); }
  return scheduleSchema.parse(schedule);
}

export function normalizeHoursText(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/a\s*\.\s*m\s*\.?/g, 'am').replace(/p\s*\.\s*m\s*\.?/g, 'pm')
    .replace(/12\s*md\b/g, '12pm').replace(/12\s*mn\b/g, '12am')
    .replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
}

function timeMinutes(text: string, allowEnd = false): number | null {
  const value = text.replace(/\s/g, '');
  const meridiem = /^(\d{1,2})(?::(\d{2}))?(am|pm)$/.exec(value);
  if (meridiem) {
    const h = Number(meridiem[1]), m = Number(meridiem[2] ?? 0);
    return h >= 1 && h <= 12 && m < 60 ? ((h % 12) + (meridiem[3] === 'pm' ? 12 : 0)) * 60 + m : null;
  }
  const clock = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!clock) return null;
  const h = Number(clock[1]), m = Number(clock[2]);
  if (allowEnd && h === 24 && m === 0) return 1440;
  return h < 24 && m < 60 ? h * 60 + m : null;
}

export function hourStringTo24(value: string): number | null {
  const minutes = timeMinutes(normalizeHoursText(value));
  return minutes === null ? null : minutes / 60;
}

const dayTokens: Record<string, number> = { domingo: 0, dom: 0, d: 0, lunes: 1, lun: 1, l: 1, martes: 2, mar: 2, m: 2, miercoles: 3, mie: 3, x: 3, jueves: 4, jue: 4, j: 4, viernes: 5, vie: 5, v: 5, sabado: 6, sab: 6, s: 6 };
const dayToken = Object.keys(dayTokens).sort((a, b) => b.length - a.length).join('|');
const dayPrefix = new RegExp(`^(${dayToken})(?:\\s*(?:-|a)\\s*(${dayToken}))?(?=\\s|\\d|$)\\s*`);
const clockToken = '(?:\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)|\\d{1,2}:\\d{2})';
const intervalPattern = new RegExp(`^(${clockToken})\\s*-\\s*(${clockToken})$`);
const daysInRange = (start: number, end: number): number[] => {
  const days = [start];
  while (days.at(-1) !== end) days.push((days.at(-1)! + 1) % 7);
  return days;
};
export interface ScheduleDiagnostic { segment: string; code: string }
export type LegacyScheduleResult =
  | { status: 'parsed' | 'unconfirmed'; schedule: ScheduleV1; diagnostics: ScheduleDiagnostic[] }
  | { status: 'invalid'; diagnostics: ScheduleDiagnostic[] };

export function parseLegacySchedule(text: string): LegacyScheduleResult {
  const normalized = normalizeHoursText(text);
  const schedule = emptySchedule();
  const diagnostics: ScheduleDiagnostic[] = [];
  if (!normalized || /^(?:consultar horario|horario (?:por|a) confirmar|horario diurno, consultar disponibilidad|consultar disponibilidad|(?:con )?cita previa)$/.test(normalized)) {
    return { status: 'unconfirmed', schedule, diagnostics: [{ segment: text, code: 'unconfirmed' }] };
  }
  if (/^(?:24\/7|24h|24 horas)(?: todos los dias)?$/.test(normalized)) {
    schedule.days = schedule.days.map(() => ({ kind: 'open', intervals: [{ start: 0, end: 1440 }] })) as ScheduleV1['days'];
    return { status: 'parsed', schedule, diagnostics };
  }
  const overnight: { day: number; end: number; segment: string }[] = [];
  let inherited: number[] | null = null;
  const declaredStates = new Set<number>();
  const segments = normalized.split(/([,|·;])/);
  for (let index = 0; index < segments.length; index += 2) {
    const segment = segments[index];
    if (index > 0 && segments[index - 1] !== ',') inherited = null;
    let remaining = segment.trim();
    const prefix = dayPrefix.exec(remaining);
    if (prefix) {
      inherited = daysInRange(dayTokens[prefix[1]], dayTokens[prefix[2] ?? prefix[1]]);
      remaining = remaining.slice(prefix[0].length).trim();
    }
    const fail = (code: string) => diagnostics.push({ segment, code });
    if (!inherited) { fail('missing_days'); continue; }
    const state = /^(?:cerrado|cerrada)$/.test(remaining) ? 'closed' : /^(?:con )?cita previa$/.test(remaining) ? 'appointment' : /^(?:consultar horario|por confirmar|desconocido)$/.test(remaining) ? 'unknown' : null;
    if (state) {
      for (const day of inherited) {
        if (schedule.days[day].kind !== 'unknown' || declaredStates.has(day)) fail('conflicting_day');
        declaredStates.add(day);
        schedule.days[day] = { kind: state };
      }
      continue;
    }
    const allDay = /^(?:24h|24\/7|24 horas)$/.test(remaining);
    const match = intervalPattern.exec(remaining);
    const start = allDay ? 0 : match ? timeMinutes(match[1]) : null;
    const end = allDay ? 1440 : match ? timeMinutes(match[2], true) : null;
    if (start === null || end === null || start === end) { fail('unparsed_or_invalid_interval'); continue; }
    for (const day of inherited) {
      const current = schedule.days[day];
      if (declaredStates.has(day)) { fail('conflicting_day'); continue; }
      schedule.days[day] = { kind: 'open', intervals: [...(current.kind === 'open' ? current.intervals : []), { start, end: end > start ? end : 1440 }] };
      if (end < start && end > 0) overnight.push({ day: (day + 1) % 7, end, segment });
    }
  }
  for (const spill of overnight) {
    const day = schedule.days[spill.day];
    if (day.kind !== 'open') diagnostics.push({ segment: spill.segment, code: 'confirm_next_day' });
    else day.intervals.push({ start: 0, end: spill.end });
  }
  const valid = scheduleSchema.safeParse(schedule);
  if (!valid.success) diagnostics.push(...valid.error.issues.map(i => ({ segment: i.path.join('.'), code: i.message })));
  if (diagnostics.length || !valid.success) return { status: 'invalid', diagnostics };
  return { status: valid.data.days.some(d => d.kind === 'open' || d.kind === 'closed') ? 'parsed' : 'unconfirmed', schedule: valid.data, diagnostics };
}

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const formatMinute = (minute: number): string => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
export const formatMinutesToHHMM = (hour: number): string => formatMinute(Math.round(hour * 60));

export function serializeSchedule(input: unknown): { horarioTexto: string; scheduleAttr: string } {
  const schedule = scheduleSchema.parse(input);
  const text = (day: ScheduleDay) => day.kind === 'open' ? day.intervals.map(i => `${formatMinute(i.start)}-${formatMinute(i.end)}`).join(', ') : day.kind === 'closed' ? 'cerrado' : day.kind === 'appointment' ? 'cita previa' : 'por confirmar';
  const horarioTexto = [...schedule.days.map((day, i) => `${dayNames[i]} ${text(day)}`), ...schedule.exceptions.map(e => `${e.date} ${text(e.day)}`)].join(' | ');
  // Lossy transition format; schedule_v1 remains authoritative.
  const scheduleAttr = schedule.exceptions.length ? '' : schedule.days.every(d => d.kind === 'open' && d.intervals.length === 1 && d.intervals[0].start === 0 && d.intervals[0].end === 1440)
    ? '24h' : schedule.days.flatMap((day, i) => day.kind === 'open' ? day.intervals.map(r => `${i}:${r.start / 60}-${r.end / 60}`) : []).join(',');
  return { horarioTexto, scheduleAttr };
}

/** @deprecated The emergency boolean is intentionally ignored. */
export function parseScheduleToRules(text: string, _emergencies = false): string {
  const parsed = parseLegacySchedule(text);
  return parsed.status === 'invalid' ? '' : serializeSchedule(parsed.schedule).scheduleAttr;
}

/** Compact legacy rules: omitted days remain unknown; malformed rules invalidate all. */
export function evaluateSchedule(attr: string, time = getCostaRicaTime()): ScheduleEvaluation {
  if (!Number.isInteger(time.day) || time.day < 0 || time.day > 6 || !Number.isFinite(time.hour) || time.hour < 0 || time.hour >= 24) return result('UNCONFIRMED', 'invalid');
  if (!attr) return result('UNCONFIRMED', 'unknown');
  if (attr === '24h') return result('OPEN', 'scheduled');
  const schedule = emptySchedule();
  try {
    for (const rule of attr.split(',')) {
      const match = /^(\d)(?:-(\d))?:(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(rule);
      if (!match || Number(match[1]) > 6 || Number(match[2] ?? match[1]) > 6) throw new Error('Invalid rule');
      const rawStart = Number(match[3]) * 60, rawEnd = Number(match[4]) * 60;
      const start = Math.round(rawStart), end = Math.round(rawEnd);
      if (Math.abs(rawStart - start) > 1e-7 || Math.abs(rawEnd - end) > 1e-7) throw new Error('Fractional minute');
      for (const day of daysInRange(Number(match[1]), Number(match[2] ?? match[1]))) schedule.days = addScheduleInterval(schedule, day, start, end, true).days;
    }
    return evaluateDay(scheduleSchema.parse(schedule).days[time.day], Math.floor(time.hour * 60 + 1e-7));
  } catch { return result('UNCONFIRMED', 'invalid'); }
}

export interface OpeningHoursSpec {
  '@type': 'OpeningHoursSpecification'; dayOfWeek?: string[]; opens: string; closes: string; validFrom?: string; validThrough?: string;
}
const schemaDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export function scheduleToSchemaOrg(input: unknown): { openingHoursSpecification: OpeningHoursSpec[]; specialOpeningHoursSpecification: OpeningHoursSpec[] } {
  const schedule = scheduleSchema.parse(input);
  const specs = (day: ScheduleDay): OpeningHoursSpec[] => day.kind === 'closed'
    ? [{ '@type': 'OpeningHoursSpecification', opens: '00:00', closes: '00:00' }]
    : day.kind === 'open' ? day.intervals.map(i => ({ '@type': 'OpeningHoursSpecification' as const, opens: formatMinute(i.start), closes: i.end === 1440 ? '23:59' : formatMinute(i.end) })) : [];
  const uncertain = new Set(schedule.exceptions.filter(e => e.day.kind === 'unknown' || e.day.kind === 'appointment').map(e => new Date(`${e.date}T12:00:00Z`).getUTCDay()));
  return {
    openingHoursSpecification: schedule.days.flatMap((day, i) => uncertain.has(i) ? [] : specs(day).map(s => ({ ...s, dayOfWeek: [schemaDays[i]] }))),
    specialOpeningHoursSpecification: schedule.exceptions.flatMap(e => specs(e.day).map(s => ({ ...s, validFrom: e.date, validThrough: e.date }))),
  };
}

export function getOpeningHoursFromSchedule(text = '', _emergencies = false): OpeningHoursSpec[] {
  const parsed = parseLegacySchedule(text);
  return parsed.status === 'invalid' ? [] : scheduleToSchemaOrg(parsed.schedule).openingHoursSpecification;
}
export const getOpeningHoursSpec = getOpeningHoursFromSchedule;

export function isVerifiedEmergency247(input: unknown, capabilities: {
  emergencias24h: boolean; emergency_verified: boolean; overnight_doctor_present: boolean;
  accepts_emergency_walkins: boolean; emergency_tier: string; directConfirmation: { verifiedAt: string; reference: string } | null;
}): boolean {
  const parsed = scheduleSchema.safeParse(input);
  const proof = directConfirmationSchema.safeParse(capabilities.directConfirmation);
  const allDay = (d: ScheduleDay) => d.kind === 'open' && d.intervals.length === 1 && d.intervals[0].start === 0 && d.intervals[0].end === 1440;
  // This predicate asserts the entire declared calendar, not merely a typical week.
  return parsed.success && parsed.data.days.every(allDay) && parsed.data.exceptions.every(e => allDay(e.day))
    && capabilities.emergencias24h === true && capabilities.emergency_verified === true && capabilities.overnight_doctor_present === true
    && capabilities.accepts_emergency_walkins === true && capabilities.emergency_tier === 'Tier A' && proof.success;
}
