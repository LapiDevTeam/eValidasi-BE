'use strict';

const IMPACT_FIELDS = [
  'impactsProductQualityCQA',
  'usedForCPP',
  'usedForGxPEnvironment',
  'usedForBatchRelease',
  'impactsSafety',
];

/**
 * Calculate IsImpactCritical, RPN, RiskCategory, CalibrationDecision, and DecisionReason
 * based on the CPOB / Annex 15 / GxP risk-based calibration logic.
 *
 * Business rules:
 *   - If ANY impact assessment answer is true  → Tinggi / WAJIB DIKALIBRASI (skip RPN)
 *   - If ALL impact assessment answers are false → calculate RPN = S × P × D
 *       RPN >= 40  → Tinggi   / WAJIB DIKALIBRASI
 *       RPN 20–39  → Sedang   / Kalibrasi / Kontrol Alternatif
 *       RPN < 20   → Rendah   / Tidak Perlu Kalibrasi
 *
 * @param {Object} params
 * @param {Object} params.impactAssessment  – { impactsProductQualityCQA, usedForCPP, ... }
 * @param {number|null} params.severity      – 1 | 3 | 5 (ignored when any impact is true)
 * @param {number|null} params.probability   – 1 | 3 | 5
 * @param {number|null} params.detectability – 1 | 3 | 5
 * @returns {{ isImpactCritical, rpn, riskCategory, calibrationDecision, decisionReason }}
 */
function calculateDecision({ impactAssessment, severity, probability, detectability }) {
  const isImpactCritical = IMPACT_FIELDS.some((f) => impactAssessment[f] === true);

  if (isImpactCritical) {
    const triggeredFields = IMPACT_FIELDS
      .filter((f) => impactAssessment[f] === true)
      .join(', ');

    return {
      isImpactCritical: true,
      rpn: null,
      riskCategory: 'Tinggi',
      calibrationDecision: 'WAJIB DIKALIBRASI',
      decisionReason: `One or more impact assessment answers are Yes (${triggeredFields}). Instrument is automatically classified as High Risk per CPOB / Annex 15 / GxP requirements.`,
    };
  }

  // All impact answers are No → proceed with RPN scoring
  const s = Number(severity);
  const p = Number(probability);
  const d = Number(detectability);
  const rpn = s * p * d;

  let riskCategory, calibrationDecision, decisionReason;

  if (rpn >= 40) {
    riskCategory = 'Tinggi';
    calibrationDecision = 'WAJIB DIKALIBRASI';
    decisionReason = `All impact assessment answers are No. RPN = ${s} x ${p} x ${d} = ${rpn} (>= 40). Instrument classified as High Risk.`;
  } else if (rpn >= 20) {
    riskCategory = 'Sedang';
    calibrationDecision = 'Kalibrasi / Kontrol Alternatif';
    decisionReason = `All impact assessment answers are No. RPN = ${s} x ${p} x ${d} = ${rpn} (20–39). Instrument classified as Medium Risk.`;
  } else {
    riskCategory = 'Rendah';
    calibrationDecision = 'Tidak Perlu Kalibrasi';
    decisionReason = `All impact assessment answers are No. RPN = ${s} x ${p} x ${d} = ${rpn} (< 20). Instrument classified as Low Risk.`;
  }

  return {
    isImpactCritical: false,
    rpn,
    riskCategory,
    calibrationDecision,
    decisionReason,
  };
}

module.exports = { calculateDecision };
