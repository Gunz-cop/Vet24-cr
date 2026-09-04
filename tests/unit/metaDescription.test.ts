import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildClinicMetaDescription,
  findVolatileMetadata,
  VOLATILE_METADATA_PATTERNS,
} from '../../src/lib/metaDescription.ts';

const CLINIC_DIR = 'src/content/clinicas';

/** Lector mínimo de frontmatter: solo los campos escalares que usa la metadata. */
function readClinic(file: string): Record<string, any> {
  const raw = readFileSync(join(CLINIC_DIR, file), 'utf8').replace(/^﻿/, '');
  const match = raw.match(/^---\r?\n?([\s\S]*?)\r?\n---/);
  assert.ok(match, `Frontmatter no encontrado en ${file}`);
  const data: Record<string, any> = {};
  for (const line of match![1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!kv) continue;
    let value: any = kv[2].trim();
    if (value === '' || value === '|' || value === '>') continue;
    if (/^".*"$/.test(value)) value = value.slice(1, -1);
    else if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (/^-?\d+(\.\d+)?$/.test(value)) value = Number(value);
    data[kv[1]] = value;
  }
  return data;
}

const clinicFiles = readdirSync(CLINIC_DIR).filter((f) => f.endsWith('.md') && !f.startsWith('_'));

describe('buildClinicMetaDescription — sin datos operativos volátiles', () => {
  test('el dataset completo genera metadata sin horarios ni disponibilidad', () => {
    assert.ok(clinicFiles.length > 100, 'se esperaba el dataset completo de fichas');
    for (const file of clinicFiles) {
      const data = readClinic(file);
      const desc = buildClinicMetaDescription(data as any);
      const volatile = findVolatileMetadata(desc);
      assert.deepEqual(volatile, [], `${file} generó metadata volátil (${volatile.join(', ')}): ${desc}`);
    }
  });

  test('las descripciones no son una plantilla intercambiable entre fichas', () => {
    const descriptions = clinicFiles.map((f) => buildClinicMetaDescription(readClinic(f) as any));
    // Quitando el nombre y la ubicación, debe quedar variedad real de contenido.
    const bodies = new Set(descriptions.map((d) => d.split('. ').slice(1).join('. ')));
    assert.ok(bodies.size >= 10, `demasiadas descripciones idénticas: ${bodies.size} variantes`);
    assert.equal(new Set(descriptions).size, descriptions.length, 'hay descripciones duplicadas exactas');
  });

  test('nunca se construye a partir de horarioTexto', () => {
    const base = {
      nombre: 'Clínica Ejemplo',
      zona: 'Heredia centro',
      provincia: 'Heredia',
      copyDiferenciador: 'Cirugía y laboratorio.',
      has_surgery: true,
    };
    const conHorario = buildClinicMetaDescription({
      ...base,
      // @ts-expect-error: se pasa a propósito para comprobar que se ignora.
      horarioTexto: 'L-D 9am-9pm jornada continua',
      categoriaHorario: 'Cierra después 21h',
      emergencias24h: true,
    });
    assert.equal(conHorario, buildClinicMetaDescription(base as any));
    assert.ok(!conHorario.includes('9am'));
  });

  test('copy operativo en copyDiferenciador no llega a la metadata', () => {
    const desc = buildClinicMetaDescription({
      nombre: 'Hospital Ejemplo',
      zona: 'Alajuela centro',
      provincia: 'Alajuela',
      copyDiferenciador:
        'Horario continuo hasta las 9pm todos los días. Abierto 24/7, atendemos de inmediato. Cirugía e internamiento.',
      has_surgery: true,
      has_hospitalization: true,
    });
    assert.deepEqual(findVolatileMetadata(desc), []);
  });

  test('la ausencia de datos no se convierte en afirmación negativa', () => {
    const desc = buildClinicMetaDescription({
      nombre: 'Veterinaria Sin Datos',
      zona: 'Nicoya',
      provincia: 'Guanacaste',
      copyDiferenciador: '',
      has_surgery: false,
      atiendeExoticos: false,
    });
    assert.ok(!/\bno\b/i.test(desc), `no debe negar servicios: ${desc}`);
    assert.ok(desc.includes('Veterinaria Sin Datos'));
  });

  test('findVolatileMetadata detecta el copy prohibido', () => {
    for (const sample of [
      'L-D 9am-9pm jornada continua',
      'Horario continuo hasta las 9pm',
      'Abierto ahora',
      'Emergencias 24/7',
      'Atendemos 24 horas',
      'Atendemos de inmediato',
      'Atención nocturna de guardia',
    ]) {
      assert.notDeepEqual(findVolatileMetadata(sample), [], `no detectado: ${sample}`);
    }
    assert.ok(VOLATILE_METADATA_PATTERNS.length > 0);
  });
});

describe('regresión — Hospital Veterinario Medical Care', () => {
  const data = readClinic('hospital-vet-medical-care-heredia.md');
  const desc = buildClinicMetaDescription(data as any);

  test('no contiene el snippet viejo ni disponibilidad operativa', () => {
    for (const forbidden of ['9am', '9pm', '9 a.m.', '9 p.m.', '24/7', 'Abierto ahora', 'Atendemos de inmediato']) {
      assert.ok(!desc.toLowerCase().includes(forbidden.toLowerCase()), `metadata contiene "${forbidden}": ${desc}`);
    }
    assert.deepEqual(findVolatileMetadata(desc), []);
  });

  test('sigue siendo específica de Medical Care', () => {
    assert.ok(desc.includes('Hospital Veterinario Medical Care'));
    assert.ok(desc.includes('Heredia centro'));
    assert.ok(/cirugía|internamiento|laboratorio|gatos/i.test(desc), desc);
  });
});
