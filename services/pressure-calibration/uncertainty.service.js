'use strict';

/**
 * uncertainty.service.js  –  Uncertainty Budget Calculator
 *
 * Implements the GUM (ISO/IEC Guide 98-3) uncertainty budget for
 * pressure calibration of Differential Pressure Gauges.
 *
 * Each uncertainty component is a separate function so that individual
 * contributions can be inspected and validated against the Excel workbook.
 *
 * Components used in the budget:
 *   u1 – Resolution uncertainty (UUT)          [Type B, rectangular]
 *   u2 – Repeatability uncertainty             [Type A]
 *   u3 – Standard calibration uncertainty      [Type B, from certificate]
 *   u4 – Level correction uncertainty          [Type B, rectangular]
 *
 * TODO: Validate each component's divisor and degrees of freedom against
 *       the Excel workbook sheet "Uncertainty Budget".
 *       If the workbook uses a different number of components or different
 *       distribution types, update the corresponding function below.
 */

const { tDistribution9545 } = require('../../helpers/math.util');

// ---------------------------------------------------------------------------
// Individual uncertainty components
// ---------------------------------------------------------------------------

/**
 * Resolution uncertainty (Type B, rectangular distribution).
 *
 * Excel concept: u_resolution = resolution / (2 * sqrt(3))
 *
 * For a digital display: resolution = smallest scale division.
 * The rectangular half-width is resolution/2, divided by sqrt(3).
 *
 * Degrees of freedom for Type B rectangular: effectively infinite (ν = ∞ → 50 used as proxy).
 *
 * @param {number} resolution  – UUT smallest scale increment (same unit as calibration)
 * @returns {{ u: number, nu: number }}
 */
function calcResolutionUncertainty(resolution) {
  // TODO: Confirm divisor with workbook. Some implementations use resolution / sqrt(12).
  //       resolution / (2*sqrt(3)) === resolution / sqrt(12) — they are equivalent.
  const u = Number(resolution) / (2 * Math.sqrt(3));
  return { u, nu: 50 }; // ν = 50 as proxy for infinite DoF
}

/**
 * Repeatability uncertainty (Type A).
 *
 * Excel concept: u_repeatability = R / (2 * sqrt(3))
 *   where R = max(UUT readings) – min(UUT readings) at same nominal point.
 *
 * TODO: Validate whether the workbook uses range/2√3 or std_dev/√n.
 *       Common alternatives:
 *         a) u = R / (2*sqrt(3))          — range method, rectangular
 *         b) u = sampleStdDev / sqrt(n)   — standard error of the mean
 *       Update the divisor below to match your workbook.
 *
 * @param {number} repeatability  – Range (max – min) of UUT readings at one point
 * @param {number} [numReadings]  – Number of readings (used for DoF)
 * @returns {{ u: number, nu: number }}
 */
function calcRepeatabilityUncertainty(repeatability, numReadings = 3) {
  const u = Number(repeatability) / (2 * Math.sqrt(3));
  // Degrees of freedom for Type A: ν = n - 1
  const nu = Math.max(numReadings - 1, 1);
  return { u, nu };
}

/**
 * Standard instrument calibration uncertainty (Type B, from certificate).
 *
 * Excel concept: u_standard = U_certificate / k_certificate
 *   where U_certificate is the expanded uncertainty from the standard's certificate
 *   and k_certificate is the coverage factor stated on that certificate (typically 2).
 *
 * TODO: Confirm the certificate k-factor used in the workbook.
 *       If the certificate states k=2 for 95% confidence, divisor = 2.
 *       If k=2 for 95.45%, divisor is also 2.
 *
 * @param {number} certUncertainty  – Expanded uncertainty from standard certificate
 * @param {number} [certK]          – Coverage factor stated on the certificate (default 2)
 * @returns {{ u: number, nu: number }}
 */
function calcStandardUncertainty(certUncertainty, certK = 2) {
  const u = Number(certUncertainty) / Number(certK);
  return { u, nu: 50 }; // Type B: effective ν ≈ 50
}

/**
 * Level correction uncertainty (Type B, rectangular distribution).
 *
 * Arises from uncertainty in the height difference measurement Δh.
 *
 * Excel concept: u_level = (ρ × g × u_deltaH) / sqrt(3)
 *   where u_deltaH is the uncertainty in height measurement (metres).
 *
 * TODO: Confirm the half-width of the height measurement uncertainty
 *       used in the workbook (typical value: 0.001 m for tape measure).
 *
 * @param {number} mediaDensity   – kg/m³
 * @param {number} gravity        – m/s²
 * @param {number} uDeltaH        – uncertainty in Δh measurement (metres, half-width)
 * @returns {{ u: number, nu: number }}
 */
function calcLevelCorrectionUncertainty(mediaDensity, gravity, uDeltaH = 0.001) {
  // Rectangular distribution: u = half-width / sqrt(3)
  const halfWidth = Number(mediaDensity) * Number(gravity) * Number(uDeltaH);
  const u = halfWidth / Math.sqrt(3);
  return { u, nu: 50 };
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
 * @param {Array<{ u: number }>} components
 * @returns {number} combined standard uncertainty
 */
function calcCombinedUncertainty(components) {
  const sumSq = components.reduce((acc, c) => acc + Math.pow(Number(c.u), 2), 0);
  return Math.sqrt(sumSq);
}

/**
 * Effective degrees of freedom (Welch–Satterthwaite formula).
 *
 * GUM E.4:  νeff = uc⁴ / Σ( ui⁴ / νi )
 *
 * @param {Array<{ u: number, nu: number }>} components
 * @param {number} uc  – combined standard uncertainty
 * @returns {number}
 */
function calcEffectiveDegreeFreedom(components, uc) {
  const denominator = components.reduce((acc, c) => {
    const nu = Number(c.nu);
    if (nu === 0 || !Number.isFinite(nu)) return acc;
    return acc + Math.pow(Number(c.u), 4) / nu;
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
 *   resolution:            number,  – UUT resolution (scale division)
 *   maxRepeatability:      number,  – worst-case repeatability across all points
 *   certUncertainty:       number,  – standard certificate expanded uncertainty
 *   certK:                 number,  – certificate coverage factor (default 2)
 *   mediaDensity:          number,
 *   gravity:               number,
 *   uDeltaH:               number,  – height measurement uncertainty (metres)
 *   numReadings:           number,  – number of readings per point
 * }} params
 *
 * @returns {{
 *   components:          Array<{ name, u, nu }>,
 *   combinedUncertainty: number,
 *   effectiveDegreeFreedom: number,
 *   coverageFactor:      number,
 *   expandedUncertainty: number
 * }}
 */
function buildUncertaintyBudget(params) {
  const {
    resolution,
    maxRepeatability,
    certUncertainty,
    certK        = 2,
    mediaDensity = 1.2,
    gravity      = 9.78,
    uDeltaH      = 0.001,
    numReadings  = 3,
  } = params;

  const u1 = calcResolutionUncertainty(resolution);
  const u2 = calcRepeatabilityUncertainty(maxRepeatability, numReadings);
  const u3 = calcStandardUncertainty(certUncertainty, certK);
  const u4 = calcLevelCorrectionUncertainty(mediaDensity, gravity, uDeltaH);

  const components = [
    { name: 'Resolution (UUT)',           ...u1 },
    { name: 'Repeatability',              ...u2 },
    { name: 'Standard calibration cert',  ...u3 },
    { name: 'Level correction',           ...u4 },
  ];

  const uc   = calcCombinedUncertainty(components);
  const veff = calcEffectiveDegreeFreedom(components, uc);
  const k    = calcCoverageFactor(veff);
  const U    = calcExpandedUncertainty(uc, k);

  return {
    components,
    combinedUncertainty:      uc,
    effectiveDegreeFreedom:   veff,
    coverageFactor:           k,
    expandedUncertainty:      U,
  };
}

module.exports = {
  calcResolutionUncertainty,
  calcRepeatabilityUncertainty,
  calcStandardUncertainty,
  calcLevelCorrectionUncertainty,
  calcCombinedUncertainty,
  calcEffectiveDegreeFreedom,
  calcCoverageFactor,
  calcExpandedUncertainty,
  buildUncertaintyBudget,
};
