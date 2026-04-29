'use strict';

const VALID_SCORES = [1, 3, 5];

const VALID_STATUSES = [
  'Draft',
  'Submitted',
  'Reviewed',
  'Approved',
  'Rejected',
  'Cancelled',
];

const IMPACT_FIELDS = [
  'impactsProductQualityCQA',
  'usedForCPP',
  'usedForGxPEnvironment',
  'usedForBatchRelease',
  'impactsSafety',
];

/**
 * Validate body for POST (create) and PUT (update) operations.
 * Returns an array of error strings. Empty array means valid.
 */
function validateAssessmentBody(body) {
  const errors = [];

  const { instrumentName, impactAssessment, severity, probability, detectability } = body;

  // --- A. Informasi Alat ---
  if (!instrumentName || String(instrumentName).trim() === '') {
    errors.push('InstrumentName is required.');
  }

  // --- B. Impact Assessment ---
  if (!impactAssessment || typeof impactAssessment !== 'object' || Array.isArray(impactAssessment)) {
    errors.push('impactAssessment object is required.');
    // Cannot validate further without impactAssessment
    return errors;
  }

  let hasInvalidImpactField = false;
  for (const field of IMPACT_FIELDS) {
    if (typeof impactAssessment[field] !== 'boolean') {
      errors.push(`impactAssessment.${field} must be a boolean (true or false).`);
      hasInvalidImpactField = true;
    }
  }

  if (hasInvalidImpactField) {
    return errors;
  }

  // --- C. Risk Scoring (required only when all impact answers are No) ---
  const allImpactNo = IMPACT_FIELDS.every((f) => impactAssessment[f] === false);

  if (allImpactNo) {
    if (severity === undefined || severity === null || severity === '') {
      errors.push('Severity is required when all impact assessment answers are No.');
    } else if (!VALID_SCORES.includes(Number(severity))) {
      errors.push('Severity must be 1, 3, or 5.');
    }

    if (probability === undefined || probability === null || probability === '') {
      errors.push('Probability is required when all impact assessment answers are No.');
    } else if (!VALID_SCORES.includes(Number(probability))) {
      errors.push('Probability must be 1, 3, or 5.');
    }

    if (detectability === undefined || detectability === null || detectability === '') {
      errors.push('Detectability is required when all impact assessment answers are No.');
    } else if (!VALID_SCORES.includes(Number(detectability))) {
      errors.push('Detectability must be 1, 3, or 5.');
    }
  }

  return errors;
}

/**
 * Validate body for PATCH /:id/status.
 * Returns an array of error strings.
 */
function validateStatusBody(body) {
  const errors = [];
  const { status } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    errors.push(
      `status is required and must be one of: ${VALID_STATUSES.join(', ')}.`
    );
  }

  return errors;
}

module.exports = {
  validateAssessmentBody,
  validateStatusBody,
  VALID_STATUSES,
  IMPACT_FIELDS,
};
