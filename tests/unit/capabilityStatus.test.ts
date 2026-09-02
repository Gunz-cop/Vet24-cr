import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  UNCONFIRMED_LABEL,
  EMERGENCY_247_UNCONFIRMED_LABEL,
  capabilityStatus,
  overnightDoctorStatus,
  hospitalizationStatus,
  emergency247Status,
  petHotelStatus,
  verificationEvidence,
  recordStatusBadge,
  reviewEvidenceBadge,
  lastReviewLabel,
} from '../../src/lib/capabilityStatus.ts';

/** Afirmaciones negativas fuertes que la UI NO puede sostener con el dataset actual. */
const FORBIDDEN_NEGATIVES = [
  'Solo llamado',
  'No hay médico',
  'No disponible',
  'No Disponible',
  'No Atiende',
  'No atiende',
  'No ofrece',
];

function assertNoStrongNegative(label: string) {
  for (const forbidden of FORBIDDEN_NEGATIVES) {
    assert.ok(
      !label.includes(forbidden),
      `El copy "${label}" contiene la afirmación no sustentada "${forbidden}"`
    );
  }
}

describe('overnight_doctor_present', () => {
  test('false no produce "Solo llamado" ni ausencia de médico', () => {
    const status = overnightDoctorStatus(false);
    assert.equal(status.confirmed, false);
    assert.equal(status.label, UNCONFIRMED_LABEL);
    assertNoStrongNegative(status.label);
    assert.ok(!status.label.includes('🚫'));
  });

  test('undefined (campo ausente) se trata igual que no confirmado', () => {
    assert.deepEqual(overnightDoctorStatus(undefined), overnightDoctorStatus(false));
  });

  test('true sigue afirmando la presencia permanente', () => {
    const status = overnightDoctorStatus(true);
    assert.equal(status.confirmed, true);
    assert.equal(status.label, 'Confirmado Permanente');
  });
});

describe('has_hospitalization', () => {
  test('false no produce "No disponible"', () => {
    const status = hospitalizationStatus(false);
    assert.equal(status.confirmed, false);
    assert.equal(status.label, UNCONFIRMED_LABEL);
    assertNoStrongNegative(status.label);
  });

  test('true sigue mostrando el servicio como disponible', () => {
    const status = hospitalizationStatus(true);
    assert.equal(status.confirmed, true);
    assert.equal(status.label, 'Disponible');
  });
});

describe('emergencias24h', () => {
  test('false no se presenta como ausencia confirmada del servicio', () => {
    const status = emergency247Status(false);
    assert.equal(status.confirmed, false);
    assert.equal(status.label, EMERGENCY_247_UNCONFIRMED_LABEL);
    assertNoStrongNegative(status.label);
  });

  test('el copy de "no confirmado" es idéntico en todas las vistas', () => {
    // La ficha usa un label positivo distinto en cada bloque, pero el estado
    // no confirmado tiene que ser siempre el mismo texto.
    assert.equal(
      emergency247Status(false).label,
      emergency247Status(false, 'Confirmada en esta ficha').label
    );
  });

  test('true conserva cada copy positivo de su vista', () => {
    assert.equal(emergency247Status(true).label, 'SÍ Disponible');
    assert.equal(
      emergency247Status(true, 'Confirmada en esta ficha').label,
      'Confirmada en esta ficha'
    );
  });
});

describe('hotelMascotas', () => {
  test('false se mantiene neutral y no infiere que no ofrecen hotel', () => {
    const status = petHotelStatus(false);
    assert.equal(status.confirmed, false);
    assert.equal(status.label, UNCONFIRMED_LABEL);
    assertNoStrongNegative(status.label);
  });

  test('true + hotelVerificacion respeta el estado explícito ya existente', () => {
    assert.equal(petHotelStatus(true, 'confirmado').label, 'Sí, confirmado');
    assert.equal(petHotelStatus(true, 'reportado').label, 'Reportado; confirmar');
    assert.equal(petHotelStatus(true, 'no-confirmado').label, 'Reportado; confirmar');
  });
});

describe('capabilityStatus (regla general)', () => {
  test('cualquier booleano ambiguo en false cae en "No confirmado"', () => {
    for (const value of [false, undefined]) {
      const status = capabilityStatus(value, 'SÍ Atiende');
      assert.equal(status.label, UNCONFIRMED_LABEL);
      assert.equal(status.tone, 'neutral');
      assertNoStrongNegative(status.label);
    }
  });

  test('solo true sostiene la afirmación positiva', () => {
    assert.equal(capabilityStatus(true, 'SÍ Atiende').confirmed, true);
  });
});

/* ── Auditoría / confianza ─────────────────────────────────────────────── */

// Caso real que originó el hotfix: VERIFIED + confianza alta, sin ninguna evidencia.
const MEDICAL_CARE = {
  record_status: 'VERIFIED',
  last_verified: '',
  verification_source: '',
  phone_verified: false,
  address_verified: false,
  schedule_verified: false,
};

const CON_EVIDENCIA = {
  record_status: 'VERIFIED',
  last_verified: '2026-08-14',
  verification_source: 'Llamada directa de auditoría de prueba',
  phone_verified: true,
  address_verified: true,
  schedule_verified: true,
};

describe('badges de verificación', () => {
  test('una ficha sin fuente/fecha/verificaciones no afirma auditoría por llamada', () => {
    const badge = recordStatusBadge(MEDICAL_CARE.record_status);
    const evidence = reviewEvidenceBadge(MEDICAL_CARE);
    const review = lastReviewLabel(MEDICAL_CARE);

    for (const text of [badge.label, badge.title, evidence.label, review.label]) {
      assert.ok(!/llamada/i.test(text), `"${text}" no debe afirmar una llamada`);
      assert.ok(!/guardia auditada/i.test(text));
    }
    assert.ok(!/auditada/i.test(badge.label));
  });

  test('record_status VERIFIED por sí solo ya no muestra "Guardia Auditada"', () => {
    const badge = recordStatusBadge('VERIFIED');
    assert.equal(badge.label, 'Ficha revisada');
    assert.ok(/no implica auditoría telefónica/i.test(badge.title));
  });

  test('ningún record_status muestra un sello de confiabilidad', () => {
    for (const status of ['VERIFIED', 'PARTIAL', 'REVIEW_REQUIRED', 'CANDIDATE_REMOVAL', undefined]) {
      assert.ok(!/confiabilidad/i.test(recordStatusBadge(status).label));
    }
  });

  test('REVIEW_REQUIRED conserva la advertencia', () => {
    assert.match(recordStatusBadge('REVIEW_REQUIRED').label, /Pendiente de Auditoría/);
  });

  test('sin metadatos la ficha se marca como revisión sin documentar', () => {
    const badge = reviewEvidenceBadge(MEDICAL_CARE);
    assert.equal(badge.tone, 'warning');
    assert.equal(badge.label, 'Revisión sin documentar');
  });

  test('con fecha + fuente + verificación puntual sí se reconoce la revisión', () => {
    const evidence = verificationEvidence(CON_EVIDENCIA);
    assert.equal(evidence.hasDocumentedReview, true);
    assert.equal(reviewEvidenceBadge(CON_EVIDENCIA).label, 'Con fuente y fecha de revisión');
  });

  test('fecha + fuente sin ninguna verificación puntual no basta', () => {
    const parcial = { ...CON_EVIDENCIA, phone_verified: false, address_verified: false, schedule_verified: false };
    assert.equal(verificationEvidence(parcial).hasDocumentedReview, false);
    assert.equal(reviewEvidenceBadge(parcial).tone, 'warning');
  });

  test('una fuente en blanco no se rellena con "Llamada directa"', () => {
    const label = lastReviewLabel({ ...MEDICAL_CARE, last_verified: '2026-06-09' }).label;
    assert.ok(!/llamada directa/i.test(label));
    assert.match(label, /Fuente no registrada/);
  });

  test('sin fecha se avisa explícitamente en lugar de inventar una auditoría', () => {
    const review = lastReviewLabel(MEDICAL_CARE);
    assert.equal(review.tone, 'warning');
    assert.match(review.label, /Sin fecha de revisión registrada/);
  });

  test('con evidencia se muestra fecha y fuente reales', () => {
    const review = lastReviewLabel(CON_EVIDENCIA);
    assert.match(review.label, /2026-08-14/);
    assert.match(review.label, /Llamada directa de auditoría de prueba/);
  });

  test('espacios en blanco no cuentan como evidencia', () => {
    const evidence = verificationEvidence({ last_verified: '   ', verification_source: '  ', phone_verified: true });
    assert.equal(evidence.hasDate, false);
    assert.equal(evidence.hasSource, false);
    assert.equal(evidence.hasDocumentedReview, false);
  });
});
