'use strict';

/**
 * uncertainty.service.js  –  Uncertainty Budget Calculator
 *
 * Excel-aligned implementation for sheet "0 sd 600 Pa (750 Pa)" in
 * Perhitungan Tekanan.xls.
 *
 * Workbook mapping:
 *   T13 = IF(T12="Analog",0.2,IF(T12="Digital",0.5))
 *   G52 = T13 * T11
 *
 * Uncertainty components in workbook table:
 *   u1 – Ketidakpastian Zero Point : MAX(I39:I46) / SQRT(3),  vi=50
 *   u2 – Tes Keberulangan          : MAX(H39:H46) / SQRT(3),  vi=50
 *   u3 – Standar                   : U_certificate / k,       vi=60
 *   u4 – Resolusi                  : (T13*T11) / SQRT(3),     vi=50
 *   u5 – Metal Rule                : 0.0003 / 2,              vi=60
 */

const { tDistribution9545 } = require('../../helpers/math.util');

const INDICATOR_RESOLUTION_FACTOR = {
  Analog: 0.2,
  Digital: 0.5,
};

const WORKBOOK_STANDARD_CI = 0.00014;
const WORKBOOK_METAL_RULE_CI = 0.0001;

function normalizeIndicatorType(indicatorType) {
  const raw = String(indicatorType || '').trim().toLowerCase();
  if (raw === 'analog') return 'Analog';
  return 'Digital';
}

function getResolutionFactor(indicatorType) {
  const normalized = normalizeIndicatorType(indicatorType);
  return INDICATOR_RESOLUTION_FACTOR[normalized];
}

function buildComponent(name, u, divisor, nu, ci = 1) {
  const rawU = Math.abs(Number(u) || 0);
  const den = Number(divisor) || 1;
  const sensitivity = Number(ci) || 1;
  const ui = rawU / den;
  const uici = ui * sensitivity;
  const square = Math.pow(uici, 2);

  return {
    name,
    u: rawU,
    divisor: den,
    nu: Number(nu),
    ui,
    ci: sensitivity,
    uici,
    square,
    fourthOverNu: Number(nu) > 0 ? Math.pow(square, 2) / Number(nu) : 0,
  };
}

/**
 * Excel u4 (Resolusi): ui = (resolutionFactor * resolution) / sqrt(3)
 * where resolutionFactor follows T13 switch from T12.
 */
function calcResolutionUncertainty(resolution, indicatorType = 'Digital') {
  const resolutionFactor = getResolutionFactor(indicatorType);
  const component = buildComponent(
    'Resolusi',
    resolutionFactor * Number(resolution || 0),
    Math.sqrt(3),
    50
  );

  return {
    u: component.ui,
    nu: component.nu,
    rawU: component.u,
    resolutionFactor,
    indicatorType: normalizeIndicatorType(indicatorType),
  };
}

/**
 * Excel u2 (Tes Keberulangan): ui = maxRepeatability / sqrt(3), vi=50
 */
function calcRepeatabilityUncertainty(repeatability) {
  const component = buildComponent(
    'Tes Keberulangan',
    Number(repeatability || 0),
    Math.sqrt(3),
    50
  );
  return { u: component.ui, nu: component.nu, rawU: component.u };
}

/**
 * Excel u3 (Standar): ui = certUncertainty / certK, vi=60
 */
function calcStandardUncertainty(certUncertainty, certK = 2) {
  const component = buildComponent(
    'Standar',
    Number(certUncertainty || 0),
    Number(certK) || 2,
    60,
    WORKBOOK_STANDARD_CI
  );
  return { u: component.ui, nu: component.nu, rawU: component.u };
}

/**
 * Excel u1 (Zero Point): ui = zeroDeviation / sqrt(3), vi=50
 */
function calcZeroPointUncertainty(zeroDeviation) {
  const component = buildComponent(
    'Ketidakpastian Zero Point',
    Number(zeroDeviation || 0),
    Math.sqrt(3),
    50
  );
  return { u: component.ui, nu: component.nu, rawU: component.u };
}

/**
 * Excel u5 (Metal Rule): ui = metalRule / 2, vi=60
 */
function calcMetalRuleUncertainty(metalRule = 0.0003) {
  const component = buildComponent(
    'Metal Rule',
    Number(metalRule || 0.0003),
    2,
    60,
    WORKBOOK_METAL_RULE_CI
  );
  return { u: component.ui, nu: component.nu, rawU: component.u };
}

// ---------------------------------------------------------------------------
// Combined and expanded uncertainty
// ---------------------------------------------------------------------------

/**
 * Combined standard uncertainty (root-sum-of-squares).
 *
 * GUM: uc = sqrt( Σ ci² × ui² )
 *   Sensitivity coefficients ci = 1 for all independent additive components.
 *
 * @param {Array<{ ui?: number, uici?: number, u?: number }>} components
 * @returns {number} combined standard uncertainty
 */
function calcCombinedUncertainty(components) {
  const sumSq = components.reduce((acc, c) => {
    const term = c.uici !== undefined
      ? Number(c.uici)
      : (c.ui !== undefined ? Number(c.ui) : Number(c.u));
    return acc + Math.pow(term, 2);
  }, 0);
  return Math.sqrt(sumSq);
}

/**
 * Effective degrees of freedom (Welch–Satterthwaite formula).
 *
 * GUM E.4:  νeff = uc⁴ / Σ( ui⁴ / νi )
 *
 * @param {Array<{ ui?: number, uici?: number, nu: number, fourthOverNu?: number }>} components
 * @param {number} uc  – combined standard uncertainty
 * @returns {number}
 */
function calcEffectiveDegreeFreedom(components, uc) {
  const denominator = components.reduce((acc, c) => {
    if (c.fourthOverNu !== undefined) return acc + Number(c.fourthOverNu);

    const nu = Number(c.nu);
    if (nu === 0 || !Number.isFinite(nu)) return acc;

    const term = c.uici !== undefined
      ? Number(c.uici)
      : (c.ui !== undefined ? Number(c.ui) : Number(c.u));

    return acc + Math.pow(term, 4) / nu;
  }, 0);

  if (denominator === 0) return Infinity;
  return Math.pow(Number(uc), 4) / denominator;
}

/**
 * Coverage factor k for 95.45 % confidence.
 *
 * @param {number} veff  – effective degrees of freedom
 * @returns {number}
 */
function calcCoverageFactor(veff) {
  return tDistribution9545(Number(veff));
}

/**
 * Expanded uncertainty.
 *
 * GUM: U = k × uc
 *
 * @param {number} combinedUncertainty
 * @param {number} coverageFactor
 * @returns {number}
 */
function calcExpandedUncertainty(combinedUncertainty, coverageFactor) {
  return Number(combinedUncertainty) * Number(coverageFactor);
}

// ---------------------------------------------------------------------------
// Orchestrator: full uncertainty budget for one calibration session
// ---------------------------------------------------------------------------

/**
 * Build the complete uncertainty budget for a calibration session.
 *
 * @param {{
 *   zeroDeviation:         number,  – workbook u1 source
 *   maxRepeatability:      number,  – worst-case repeatability across all points
 *   certUncertainty:       number,  – standard certificate expanded uncertainty
 *   certK:                 number,  – certificate coverage factor (default 2)
 *   resolution:            number,  – workbook T11 value
 *   indicatorType:         string,  – workbook T12 ('Analog'|'Digital')
 *   metalRule:             number,  – workbook G53 base value (default 0.0003)
 * }} params
 *
 * @returns {{
 *   components:          Array<{ name, u, divisor, ui, ci, uici, square, nu, fourthOverNu }>,
 *   resolutionFactor:    number,
 *   indicatorType:       string,
 *   combinedUncertainty: number,
 *   effectiveDegreeFreedom: number,
 *   coverageFactor:      number,
 *   expandedUncertainty: number
 * }}
 */
function buildUncertaintyBudget(params) {
  const {
    zeroDeviation   = 0,
    resolution,
    maxRepeatability,
    certUncertainty,
    certK        = 2,
    indicatorType = 'Digital',
    metalRule    = 0.0003,
  } = params;

  const normalizedIndicatorType = normalizeIndicatorType(indicatorType);
  const resolutionFactor = getResolutionFactor(normalizedIndicatorType);

  const components = [
    buildComponent('Ketidakpastian Zero Point', Number(zeroDeviation || 0), Math.sqrt(3), 50),
    buildComponent('Tes Keberulangan', Number(maxRepeatability || 0), Math.sqrt(3), 50),
    buildComponent(
      'Standar',
      Number(certUncertainty || 0),
      Number(certK) || 2,
      60,
      WORKBOOK_STANDARD_CI
    ),
    buildComponent('Resolusi', resolutionFactor * Number(resolution || 0), Math.sqrt(3), 50),
    buildComponent(
      'Metal Rule',
      Number(metalRule || 0.0003),
      2,
      60,
      WORKBOOK_METAL_RULE_CI
    ),
  ];

  const uc   = calcCombinedUncertainty(components);
  const veff = calcEffectiveDegreeFreedom(components, uc);
  const k    = calcCoverageFactor(veff);
  const U    = calcExpandedUncertainty(uc, k);

  return {
    components,
    resolutionFactor,
    indicatorType: normalizedIndicatorType,
    combinedUncertainty:      uc,
    effectiveDegreeFreedom:   veff,
    coverageFactor:           k,
    expandedUncertainty:      U,
  };
}

module.exports = {
  INDICATOR_RESOLUTION_FACTOR,
  normalizeIndicatorType,
  getResolutionFactor,
  calcZeroPointUncertainty,
  calcMetalRuleUncertainty,
  calcResolutionUncertainty,
  calcRepeatabilityUncertainty,
  calcStandardUncertainty,
  calcCombinedUncertainty,
  calcEffectiveDegreeFreedom,
  calcCoverageFactor,
  calcExpandedUncertainty,
  buildUncertaintyBudget,
};
