/**
 * Hotfix semántico (fase 1) — interpretación conservadora de los booleanos del dataset.
 *
 * PROBLEMA: el esquema actual (`src/content.config.ts`) modela capacidades como
 * booleanos, así que `false` mezcla al menos cuatro significados distintos:
 * no confirmado, desconocido, no disponible y no investigado.
 *
 * REGLA TEMPORAL: mientras no exista un modelo multiestado
 * (`confirmed` / `unknown` / `unverified` / `not_offered`), `false` se presenta
 * siempre como "no confirmado" y NUNCA como una afirmación negativa fuerte
 * ("solo llamado", "no disponible", "no atiende").
 *
 * Solo `true` sostiene una afirmación positiva, porque es el único valor que
 * alguien registró de forma deliberada.
 *
 * Esto es un parche de presentación. El rediseño del modelo de evidencia y la
 * migración de las fichas van en fases posteriores.
 */

export type CapabilityTone = "positive" | "neutral" | "warning";

export interface CapabilityStatus {
  /** `true` solo cuando el dato afirma explícitamente la capacidad. */
  confirmed: boolean;
  /** Texto visible en la UI. */
  label: string;
  tone: CapabilityTone;
  /** Tooltip que explica el alcance real del dato. */
  title: string;
}

/** Copy neutral por defecto para cualquier booleano ambiguo en `false`. */
export const UNCONFIRMED_LABEL = "No confirmado";

/** Copy unificado para `emergencias24h: false` en todas las vistas. */
export const EMERGENCY_247_UNCONFIRMED_LABEL = "No confirmado como 24/7";

/** Tooltip único de la regla temporal, para no repetir la explicación. */
export const UNCONFIRMED_TITLE =
  "Sin confirmar en la información revisada. El dato actual no permite distinguir entre " +
  "«no se ofrece» y «no se ha verificado», así que no afirmamos que el servicio no exista.";

/**
 * Convierte un booleano ambiguo en un estado de presentación conservador.
 *
 * @param value valor crudo de la ficha (puede venir `undefined`)
 * @param confirmedLabel copy a mostrar cuando el dato es `true`
 * @param options.unconfirmedLabel copy alterno para el estado no confirmado
 * @param options.confirmedTitle tooltip alterno para el estado confirmado
 */
export function capabilityStatus(
  value: boolean | undefined,
  confirmedLabel: string,
  options: { unconfirmedLabel?: string; confirmedTitle?: string } = {}
): CapabilityStatus {
  if (value === true) {
    return {
      confirmed: true,
      label: confirmedLabel,
      tone: "positive",
      title: options.confirmedTitle ?? "Confirmado en la información revisada de esta ficha.",
    };
  }

  return {
    confirmed: false,
    label: options.unconfirmedLabel ?? UNCONFIRMED_LABEL,
    tone: "neutral",
    title: UNCONFIRMED_TITLE,
  };
}

/** `overnight_doctor_present`. `false` NO implica «solo llamado» ni ausencia de médico. */
export function overnightDoctorStatus(value?: boolean): CapabilityStatus {
  return capabilityStatus(value, "Confirmado Permanente");
}

/** `has_hospitalization`. `false` NO implica «no disponible». */
export function hospitalizationStatus(value?: boolean): CapabilityStatus {
  return capabilityStatus(value, "Disponible");
}

/** `emergencias24h`. `false` solo significa que no está confirmada como 24/7. */
export function emergency247Status(
  value?: boolean,
  confirmedLabel = "SÍ Disponible"
): CapabilityStatus {
  return capabilityStatus(value, confirmedLabel, {
    unconfirmedLabel: EMERGENCY_247_UNCONFIRMED_LABEL,
  });
}

export type HotelVerificacion = "confirmado" | "reportado" | "no-confirmado";

/**
 * `hotelMascotas` + `hotelVerificacion`. Es el único campo que ya tiene un
 * estado explícito de verificación, así que se respeta tal cual; `false` sigue
 * siendo «no confirmado», nunca «no ofrece hotel».
 */
export function petHotelStatus(
  hotelMascotas?: boolean,
  hotelVerificacion: HotelVerificacion = "no-confirmado",
  confirmedLabel = "Sí, confirmado"
): CapabilityStatus {
  if (hotelMascotas !== true) {
    return {
      confirmed: false,
      label: UNCONFIRMED_LABEL,
      tone: "neutral",
      title: UNCONFIRMED_TITLE,
    };
  }

  if (hotelVerificacion === "confirmado") {
    return {
      confirmed: true,
      label: confirmedLabel,
      tone: "positive",
      title: "Hotel para mascotas confirmado en una fuente pública.",
    };
  }

  return {
    confirmed: true,
    label: "Reportado; confirmar",
    tone: "warning",
    title: "Servicio de hotel reportado en una fuente pública; confirma cupo y condiciones.",
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Verificación / auditoría
 *
 * `record_status: "VERIFIED"` NO es evidencia de una auditoría telefónica:
 * hay fichas VERIFIED con `last_verified: ""`, `verification_source: ""` y
 * `phone_verified: false`. Mientras no exista una regla de evidencia documentada
 * por atributo, la UI no afirma auditorías: solo describe los metadatos que la
 * ficha realmente contiene.
 * ──────────────────────────────────────────────────────────────────────────── */

export interface VerificationInput {
  record_status?: string;
  last_verified?: string;
  verification_source?: string;
  phone_verified?: boolean;
  address_verified?: boolean;
  schedule_verified?: boolean;
}

export interface VerificationEvidence {
  /** La ficha registra una fecha de revisión. */
  hasDate: boolean;
  /** La ficha registra de dónde salió el dato. */
  hasSource: boolean;
  /** Al menos un campo concreto quedó marcado como verificado. */
  hasFieldChecks: boolean;
  /** Fecha + fuente + al menos una verificación puntual. */
  hasDocumentedReview: boolean;
}

const isFilled = (value?: string) => typeof value === "string" && value.trim().length > 0;

export function verificationEvidence(data: VerificationInput = {}): VerificationEvidence {
  const hasDate = isFilled(data.last_verified);
  const hasSource = isFilled(data.verification_source);
  const hasFieldChecks =
    data.phone_verified === true ||
    data.address_verified === true ||
    data.schedule_verified === true;

  return {
    hasDate,
    hasSource,
    hasFieldChecks,
    hasDocumentedReview: hasDate && hasSource && hasFieldChecks,
  };
}

export interface StatusBadge {
  label: string;
  tone: CapabilityTone;
  title: string;
}

/**
 * Badge de estado del registro.
 *
 * Antes: `record_status === "VERIFIED"` mostraba «Guardia Auditada» con el
 * tooltip «Información auditada por llamada de prueba». Ninguna de las dos
 * afirmaciones se puede sostener con el dataset actual, así que se eliminan y
 * se degradan a una descripción neutral del estado del registro.
 */
export function recordStatusBadge(record_status?: string): StatusBadge {
  if (record_status === "VERIFIED") {
    return {
      label: "Ficha revisada",
      tone: "neutral",
      title:
        "Estado interno del registro en Vet24. No implica auditoría telefónica ni " +
        "verificación de la guardia nocturna.",
    };
  }

  if (record_status === "REVIEW_REQUIRED") {
    return {
      label: "⚠️ Pendiente de Auditoría",
      tone: "warning",
      title: "Este registro está marcado para revisión.",
    };
  }

  return {
    label: "Información Parcial",
    tone: "neutral",
    title: "Registro incompleto: faltan datos por revisar.",
  };
}

/**
 * Reemplaza el sello «Alta / Media / Baja Confiabilidad», que era un juicio sin
 * regla documentada, por un dato comprobable: qué metadatos de revisión trae la
 * ficha. No infiere nada sobre la clínica.
 */
export function reviewEvidenceBadge(data: VerificationInput = {}): StatusBadge {
  const evidence = verificationEvidence(data);

  if (evidence.hasDocumentedReview) {
    return {
      label: "Con fuente y fecha de revisión",
      tone: "neutral",
      title: "La ficha registra fecha, fuente y al menos un campo verificado.",
    };
  }

  return {
    label: "Revisión sin documentar",
    tone: "warning",
    title:
      "Falta fecha, fuente o verificación de campos concretos. No podemos afirmar " +
      "cómo se comprobó esta información.",
  };
}

/** Última revisión registrada. Sin fuente NO se asume «llamada directa». */
export function lastReviewLabel(data: VerificationInput = {}): StatusBadge {
  const evidence = verificationEvidence(data);

  if (!evidence.hasDate) {
    return {
      label: "⚠️ Sin fecha de revisión registrada",
      tone: "warning",
      title: "La ficha no registra cuándo se revisó por última vez.",
    };
  }

  const source = evidence.hasSource
    ? (data.verification_source as string).trim()
    : "Fuente no registrada";

  return {
    label: `📅 ${(data.last_verified as string).trim()} · ${source}`,
    tone: "neutral",
    title: "Fecha y fuente tal como están registradas en la ficha.",
  };
}
