import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { emptySchedule, scheduleSchema, clinicSchema } from '../../src/lib/clinic-schema.ts';
import { addScheduleInterval, evaluateScheduleV1, evaluateSchedule, getCostaRicaTime, hourStringTo24, parseLegacySchedule, parseScheduleToRules, serializeSchedule, scheduleToSchemaOrg, getOpeningHoursFromSchedule, isVerifiedEmergency247 } from '../../src/lib/schedule.ts';

function parsed(text: string) {
  const result = parseLegacySchedule(text);
  assert.notEqual(result.status, 'invalid', JSON.stringify(result));
  if (result.status === 'invalid') throw new Error('Unreachable');
  return result.schedule;
}
const monday = (clock: string) => new Date(`2026-09-14T${clock}:00-06:00`);

test('schema estricto: límites, superposiciones, fechas reales/únicas y normalización', () => {
  const base = emptySchedule();
  assert.equal(scheduleSchema.safeParse({ ...base, extra: true }).success, false);
  assert.equal(scheduleSchema.safeParse({ ...base, timeZone: 'UTC' }).success, false);
  assert.equal(scheduleSchema.safeParse({ ...base, days: base.days.slice(1) }).success, false);
  for (const interval of [{ start: -1, end: 1 }, { start: 1440, end: 1440 }, { start: 0.5, end: 1 }, { start: 0, end: 1441 }, { start: 9, end: 8 }]) {
    const copy = emptySchedule(); copy.days[1] = { kind: 'open', intervals: [interval] };
    assert.equal(scheduleSchema.safeParse(copy).success, false, JSON.stringify(interval));
  }
  const overlapping = emptySchedule(); overlapping.days[1] = { kind: 'open', intervals: [{ start: 10, end: 30 }, { start: 20, end: 40 }] };
  assert.equal(scheduleSchema.safeParse(overlapping).success, false);
  const touching = emptySchedule(); touching.days[1] = { kind: 'open', intervals: [{ start: 60, end: 120 }, { start: 0, end: 60 }] };
  assert.deepEqual(scheduleSchema.parse(touching).days[1], { kind: 'open', intervals: [{ start: 0, end: 120 }] });
  const excessive = emptySchedule(); excessive.days[1] = { kind: 'open', intervals: Array.from({ length: 9 }, (_, i) => ({ start: i * 10, end: i * 10 + 5 })) };
  assert.equal(scheduleSchema.safeParse(excessive).success, false);
  for (const date of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-09-1']) {
    assert.equal(scheduleSchema.safeParse({ ...base, exceptions: [{ date, day: { kind: 'closed' } }] }).success, false);
  }
  const exception = { date: '2028-02-29', day: { kind: 'closed' } };
  assert.equal(scheduleSchema.safeParse({ ...base, exceptions: [exception] }).success, true);
  assert.equal(scheduleSchema.safeParse({ ...base, exceptions: [exception, exception] }).success, false);
  assert.equal(scheduleSchema.safeParse({ ...base, exceptions: Array.from({ length: 61 }, () => exception) }).success, false);
});

test('horas estrictas y notación costarricense', () => {
  for (const [text, expected] of [['12md', 12], ['12mn', 0], ['12pm', 12], ['12am', 0], ['8:31am', 8 + 31 / 60], ['23:59', 23 + 59 / 60], ['8:00 a.m.', 8]] as const) assert.equal(hourStringTo24(text), expected);
  for (const text of ['13:99pm', '0am', '13am', '24:00', '8:60am', '7am basura', 'NaN']) assert.equal(hourStringTo24(text), null, text);
});

test('sin heurísticas, sin días inventados y sin resultados parcialmente parseados', () => {
  const sunday = parsed('D 10am-9pm');
  assert.deepEqual(sunday.days[0], { kind: 'open', intervals: [{ start: 600, end: 1260 }] });
  assert.equal(sunday.days[1].kind, 'unknown');
  for (const text of ['8am-5pm', 'Oxígeno', 'L-V 13:99pm-5pm', 'L-V 8am-5pm | texto no interpretado', 'L-V 8am-5pm | 6pm-7pm', 'L 8am-5pm extra', 'L por confirmar | L 8am-5pm', 'L 8am-5pm | L cerrado', 'Horario a confirmar (posiblemente cierra ~19:00)', 'L-D 8am-6pm | Emergencias 24/7 por llamada']) {
    assert.equal(parseLegacySchedule(text).status, 'invalid', text);
    assert.equal(parseScheduleToRules(text, true), '', text);
  }
  for (const text of ['Consultar horario', 'Horario por confirmar', 'Horario a confirmar', 'cita previa', 'Horario diurno, consultar disponibilidad']) assert.equal(parseLegacySchedule(text).status, 'unconfirmed', text);
  assert.equal(parseScheduleToRules('Consultar horario', true), '');
});

test('días individuales, abreviaturas, rangos completos y vuelta semanal', () => {
  for (const [day, text] of ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].entries()) {
    const schedule = parsed(`${text} 08:00-17:00`);
    assert.equal(schedule.days[day].kind, 'open');
    assert.equal(schedule.days[(day + 1) % 7].kind, 'unknown');
  }
  assert.equal(parsed('Martes a Domingo 8am-5pm').days[1].kind, 'unknown');
  const wrap = parsed('Sáb-Lun 8am-5pm');
  for (const day of [6, 0, 1]) assert.equal(wrap.days[day].kind, 'open');
  assert.equal(wrap.days[2].kind, 'unknown');
  const appointment = parsed('Martes-Domingo con cita previa | Lunes cerrado');
  assert.equal(evaluateScheduleV1(appointment, monday('10:00')).state, 'CLOSED');
  assert.equal(evaluateScheduleV1(appointment, new Date('2026-09-15T10:00:00-06:00')).reason, 'appointment');
});

test('almuerzo, minutos exactos y extremos semiabiertos', () => {
  const schedule = parsed('L-S 7am-12md, 1:31pm-6pm');
  for (const [clock, state] of [['06:59', 'CLOSED'], ['07:00', 'OPEN'], ['12:00', 'CLOSED'], ['13:30', 'CLOSED'], ['13:31', 'OPEN'], ['18:00', 'CLOSED']]) assert.equal(evaluateScheduleV1(schedule, monday(clock)).state, state, clock);
  assert.equal(evaluateScheduleV1(schedule, new Date('2026-09-13T12:00:00-06:00')).reason, 'unknown');
});

test('overnight divide días, exige confirmación y respeta excepción de cierre', () => {
  assert.throws(() => addScheduleInterval(emptySchedule(), 5, 1320, 120), /Confirma/);
  const friday = addScheduleInterval(emptySchedule('closed'), 5, 1320, 120);
  assert.equal(evaluateScheduleV1(friday, new Date('2026-09-19T01:00:00-06:00')).state, 'OPEN');
  assert.equal(evaluateScheduleV1(friday, new Date('2026-09-19T02:00:00-06:00')).state, 'CLOSED');
  assert.equal(evaluateScheduleV1(friday, new Date('2026-09-18T01:00:00-06:00')).state, 'CLOSED');
  friday.exceptions.push({ date: '2026-09-19', day: { kind: 'closed' } });
  assert.equal(evaluateScheduleV1(friday, new Date('2026-09-19T01:00:00-06:00')).state, 'CLOSED');
  assert.equal(serializeSchedule(friday).scheduleAttr, '', 'El formato compacto no representa excepciones');
  const sunday = addScheduleInterval(emptySchedule('closed'), 0, 1320, 120);
  assert.equal(evaluateScheduleV1(sunday, monday('01:00')).state, 'OPEN');
  assert.throws(() => addScheduleInterval(sunday, 1, 60, 180), /superpuestos/);
  assert.equal(parseLegacySchedule('Viernes 22:00-02:00').status, 'invalid', 'No inventar resto del sábado');
  assert.equal(evaluateScheduleV1(parsed('Viernes 22:00-02:00 | Sábado 03:00-04:00'), new Date('2026-09-19T01:00:00-06:00')).state, 'OPEN');
});

test('fecha/excepciones desconocidas y entradas inválidas nunca se vuelven cerrado por descarte', () => {
  const schedule = parsed('L-D 24h');
  assert.equal(evaluateScheduleV1(schedule, new Date(NaN)).reason, 'invalid');
  assert.equal(evaluateScheduleV1({}).reason, 'invalid');
  schedule.exceptions.push({ date: '2026-09-14', day: { kind: 'unknown' } });
  assert.equal(evaluateScheduleV1(schedule, monday('12:00')).reason, 'unknown');
  assert.equal(evaluateScheduleV1(schedule, new Date('2026-09-15T12:00:00-06:00')).state, 'OPEN');
  assert.equal(evaluateSchedule('basura').reason, 'invalid');
  assert.equal(evaluateSchedule('1:8-17,basura', { day: 1, hour: 10, minute: 0 }).reason, 'invalid');
  assert.equal(evaluateSchedule('1:8-17', { day: 0, hour: 10, minute: 0 }).reason, 'unknown');
  assert.equal(evaluateSchedule('5:22-2', { day: 6, hour: 1, minute: 0 }).state, 'OPEN');
});

test('UTC-6 independiente de TZ y cambios DST del dispositivo', () => {
  const dates = ['2026-03-08T09:59:00Z', '2026-03-08T10:01:00Z', '2026-11-01T08:59:00Z', '2026-11-01T09:01:00Z', '2026-09-14T06:00:00Z'];
  const script = `import {getCostaRicaTime,evaluateScheduleV1,parseLegacySchedule} from './src/lib/schedule.ts'; const s=parseLegacySchedule('L-D 00:00-05:00').schedule; console.log(JSON.stringify(${JSON.stringify(dates)}.map(d=>[getCostaRicaTime(new Date(d)),evaluateScheduleV1(s,new Date(d))])));`;
  const outputs = ['UTC', 'Europe/Madrid', 'America/Los_Angeles'].map(TZ => execFileSync(process.execPath, ['--input-type=module', '-e', script], { env: { ...process.env, TZ }, encoding: 'utf8' }));
  assert.equal(outputs[0], outputs[1]); assert.equal(outputs[0], outputs[2]);
  assert.deepEqual(getCostaRicaTime(new Date(dates[4])), { day: 1, hour: 0, minute: 0 });
});

test('adaptador compacto conserva los 1440 minutos sin errores de punto flotante', () => {
  for (let minute = 0; minute < 1440; minute++) {
    const schedule = addScheduleInterval(emptySchedule('closed'), 1, minute, minute + 1);
    const { scheduleAttr } = serializeSchedule(schedule);
    assert.equal(evaluateSchedule(scheduleAttr, { day: 1, hour: minute / 60, minute: minute % 60 }).state, 'OPEN', `minuto ${minute}`);
    if (minute < 1439) assert.equal(evaluateSchedule(scheduleAttr, { day: 1, hour: (minute + 1) / 60, minute: (minute + 1) % 60 }).state, 'CLOSED');
  }
  assert.equal(evaluateSchedule('1:8.12345-9', { day: 1, hour: 8.5, minute: 30 }).reason, 'invalid');
});

test('serialización normalizada no muta entrada y conserva minutos; 24h no significa Tier A', () => {
  const schedule = parsed('L-V 8:31am-6:29pm');
  const before = structuredClone(schedule);
  const first = serializeSchedule(schedule);
  assert.match(first.horarioTexto, /Lunes 08:31-18:29/);
  assert.deepEqual(serializeSchedule(scheduleSchema.parse(schedule)), first);
  assert.deepEqual(schedule, before);
  const full = parsed('24/7');
  const flags = { emergencias24h: true, emergency_verified: true, overnight_doctor_present: true, accepts_emergency_walkins: true, emergency_tier: 'Tier A', directConfirmation: null };
  assert.equal(isVerifiedEmergency247(full, flags), false);
  const evidence = { verifiedAt: '2026-09-15', reference: 'research/clinics/demo.json' };
  assert.equal(isVerifiedEmergency247(full, { ...flags, directConfirmation: evidence }), true);
  assert.equal(isVerifiedEmergency247(full, { ...flags, directConfirmation: evidence, overnight_doctor_present: false }), false);
  assert.equal(isVerifiedEmergency247(schedule, { ...flags, directConfirmation: evidence }), false);
  assert.equal(isVerifiedEmergency247(full, { ...flags, directConfirmation: { ...evidence, verifiedAt: '2026-02-30' } }), false);
  for (const day of [{ kind: 'closed' }, { kind: 'unknown' }, { kind: 'appointment' }, { kind: 'open', intervals: [{ start: 0, end: 720 }] }] as const) {
    const restricted = { ...full, exceptions: [{ date: '2026-09-19', day }] };
    assert.equal(isVerifiedEmergency247(restricted, { ...flags, directConfirmation: evidence }), false, day.kind);
  }
});

test('Schema.org: cerrado, 24h, desconocido y excepciones sin inventar horas', () => {
  // Google LocalBusiness: closed = 00:00/00:00, all day = 00:00/23:59.
  // https://developers.google.com/search/docs/appearance/structured-data/local-business
  const schedule = parsed('L-D 24h');
  schedule.exceptions.push({ date: '2026-09-14', day: { kind: 'closed' } });
  const schema = scheduleToSchemaOrg(schedule);
  assert.equal(schema.openingHoursSpecification.length, 7);
  assert.equal(schema.openingHoursSpecification[0].closes, '23:59');
  assert.deepEqual(schema.specialOpeningHoursSpecification[0], { '@type': 'OpeningHoursSpecification', opens: '00:00', closes: '00:00', validFrom: '2026-09-14', validThrough: '2026-09-14' });
  schedule.exceptions[0].day = { kind: 'appointment' };
  assert.equal(scheduleToSchemaOrg(schedule).specialOpeningHoursSpecification.length, 0);
  assert.equal(scheduleToSchemaOrg(schedule).openingHoursSpecification.some(s => s.dayOfWeek?.includes('Monday')), false);
  assert.deepEqual(getOpeningHoursFromSchedule('Consultar horario', true), []);
  assert.equal(getOpeningHoursFromSchedule('L-V 8am-5pm')[0].opens, '08:00');
  assert.ok(clinicSchema.shape.schedule_v1, 'Contrato de colección comparte schema puro');
});
