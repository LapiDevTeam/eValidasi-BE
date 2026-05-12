'use strict';

/**
 * standardCorrection.service.js  –  Standard Reading Correction
 *
 * Converts raw standard instrument readings to actual pressure values
 * using the calibration certificate correction points.
 *
 * Excel equivalent:
 *   LINEST / INTERCEPT applied to adjacent certificate points
 *   (piecewise linear interpolation through the correction curve).
 */

const { linearRegression } = require('../../helpers/math.util');

// ─────────────────────────────────────────────────────────────────────────────
// Unit conversion helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Conversion factors to a common base (Pa).
 * Extend this table when new units are added to the certificate seeds.
 */
const TO_PA = {
  pa:   1,
  kpa:  1e3,
  mpa:  1e6,
  bar:  1e5,
  mbar: 1e2,
  psi:  6894.757,
  'inhg': 3386.389,
  'inh2o': 249.089,
};

/**
 * Return the multiplication factor needed to convert a value from `from` unit
 * to `to` unit.  Returns 1 if either unit is unknown (no conversion).
 *
 * @param {string} from  – e.g. 'Pa', 'Bar', 'kPa'
 * @param {string} to    – e.g. 'Bar'
 * @returns {number}
 */
function getUnitFactor(from, to) {
  if (!from || !to) return 1;
  const f = (from + '').toLowerCase();
  const t = (to   + '').toLowerCase();
  if (f === t) return 1;
  const fPa = TO_PA[f];
  const tPa = TO_PA[t];
  if (!fPa || !tPa) return 1;   // unknown unit – pass through
  return fPa / tPa;
}

/**
 * Find the two adjacent certificate points that bracket a raw standard reading.
 *
 * Excel concept: for each raw standard reading, Excel finds the segment on
 * the correction curve between two certificate points and interpolates.
 *
 * @param {Array<{
 *   actual_pressure:      number,
 *   indicator_increasing: number,
 *   indicator_decreasing: number,
 *   uncertainty:          number
 * }>} points        – All certificate points for this standard (unsorted OK)
 * @param {number}   rawReading  – The raw standard reading to correct
 * @param {string}   direction   – 'increasing' | 'decreasing'
 *
 * @returns {{
 *   p1: object,
 *   p2: object,
 *   warning: string|null
 * }}
 */
function findSegment(points, rawReading, direction) {
  if (!Array.isArray(points) || points.length < 2) {
    throw new Error('findSegment: need at least 2 certificate points.');
  }

  const indicatorKey =
    direction === 'decreasing' ? 'indicator_decreasing' : 'indicator_increasing';

  // Sort a copy ascending by indicator value
  const sorted = [...points].sort(
    (a, b) => Number(a[indicatorKey]) - Number(b[indicatorKey])
  );

  const raw = Number(rawReading);

  // Tolerance: allow readings that are within 0.01 % of the full certificate
  // span outside the cert boundary before raising a warning.
  // This suppresses false alarms for near-zero readings caused by tiny
  // instrument offsets in the certificate (e.g. indicator_decreasing = 0.00003
  // for the nominal-zero point).
  const certMin  = Number(sorted[0][indicatorKey]);
  const certMax  = Number(sorted[sorted.length - 1][indicatorKey]);
  const span     = Math.abs(certMax - certMin) || 1;
  const tolerance = span * 0.0001;  // 0.01 % of span

  // Find the bracket
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = Number(sorted[i][indicatorKey]);
    const hi = Number(sorted[i + 1][indicatorKey]);
    if (raw >= lo && raw <= hi) {
      return { p1: sorted[i], p2: sorted[i + 1], warning: null };
    }
  }

  // Outside range – clamp to nearest segment.
  // Only emit a warning when the overshoot exceeds the tolerance.
  if (raw < certMin) {
    const overshoot = certMin - raw;
    return {
      p1: sorted[0],
      p2: sorted[1],
      warning: overshoot > tolerance
        ? `Standard reading ${raw} is below certificate range (min ${certMin}). Using first segment.`
        : null,
    };
  }

  const last = sorted.length - 1;
  const overshoot = raw - certMax;
  return {
    p1: sorted[last - 1],
    p2: sorted[last],
    warning: overshoot > tolerance
      ? `Standard reading ${raw} is above certificate range (max ${certMax}). Using last segment.`
      : null,
  };
}

/**
 * Apply the piecewise-linear correction to a single raw standard reading.
 *
 * Excel equivalent:
 *   corrected = SLOPE * rawReading + INTERCEPT
 *   where SLOPE/INTERCEPT come from LINEST on the two surrounding cert points.
 *
 * @param {Array}  points
 * @param {number} rawReading
 * @param {string} direction  – 'increasing' | 'decreasing'
 * @returns {{ corrected: number, warning: string|null }}
 */
function correctStandardReading(points, rawReading, direction) {
  const { p1, p2, warning } = findSegment(points, rawReading, direction);

  const indicatorKey =
    direction === 'decreasing' ? 'indicator_decreasing' : 'indicator_increasing';

  const x1 = Number(p1[indicatorKey]);
  const y1 = Number(p1.actual_pressure);
  const x2 = Number(p2[indicatorKey]);
  const y2 = Number(p2.actual_pressure);

  const { slope, intercept } = linearRegression(x1, y1, x2, y2);
  const corrected = slope * Number(rawReading) + intercept;

  return { corrected, warning };
}

/**
 * Apply corrections to an entire array of readings for one session.
 * Mutates nothing – returns a new array with correctedStandard populated.
 *
 * Unit conversion:
 *   Certificate points are stored in the unit specified by certPoints[].unit
 *   (e.g. 'Bar').  Raw standard readings may be in a different unit (e.g. 'Pa').
 *   This function converts readings to the cert unit before interpolation, then
 *   converts the corrected result back to the original reading unit so that
 *   downstream error calculations remain in a consistent unit.
 *
 * @param {Array<{
 *   standard_reading: number,
 *   direction:        string
 * }>} readings
 * @param {Array}  certificatePoints
 * @param {object} [options]
 * @param {string} [options.readingUnit]  – unit of standard_reading (e.g. 'Pa')
 * @param {string} [options.certUnit]     – unit of certificate points (e.g. 'Bar')
 * @returns {{ correctedReadings: Array, warnings: string[] }}
 */
function applyCorrections(readings, certificatePoints, options = {}) {
  const readingUnit = options.readingUnit || (certificatePoints[0] && certificatePoints[0].unit) || 'Pa';
  const certUnit    = options.certUnit    || (certificatePoints[0] && certificatePoints[0].unit) || 'Pa';

  // Factor: reading unit → cert unit (applied before interpolation)
  const toCert    = getUnitFactor(readingUnit, certUnit);
  // Factor: cert unit → reading unit (applied to restore output unit)
  const toReading = getUnitFactor(certUnit, readingUnit);

  const warnings = [];
  const correctedReadings = readings.map((r) => {
    // Convert raw reading to the same unit as the certificate points
    const readingInCertUnit = Number(r.standard_reading) * toCert;

    const { corrected, warning } = correctStandardReading(
      certificatePoints,
      readingInCertUnit,
      r.direction
    );
    if (warning) warnings.push(warning);

    // Convert corrected value back to the session reading unit
    return { ...r, correctedStandard: corrected * toReading };
  });
  return { correctedReadings, warnings };
}

module.exports = { findSegment, correctStandardReading, applyCorrections };
