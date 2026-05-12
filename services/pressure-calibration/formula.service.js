'use strict';

/**
 * formula.service.js  –  Pressure Calibration Formula Engine
 *
 * Implements core Excel Perhitungan Tekanan.xls calculation steps
 * as reusable pure functions.
 *
 * Excel concept → function mapping:
 *   AVERAGE of corrected inc/dec readings   → groupAndAverage()
 *   Level correction (Beda level acuan)     → calcLevelCorrection()
 *   Error per point                         → calcError()
 *   Repeatability per point                 → calcRepeatability()
 *   Zero deviation                          → calcZeroDeviation()
 */

const { average, convertPressure } = require('../../helpers/math.util');

// Cycles that represent the upward sweep
const INCREASING_CYCLES = new Set(['X1', 'X3', 'X5']);
// Cycles that represent the downward sweep
const DECREASING_CYCLES = new Set(['X2', 'X4', 'X6']);

/**
 * Given all readings for one nominal point, separate them by direction
 * and compute per-direction and combined means.
 *
 * Excel equivalent: separate columns for Naik (increasing) / Turun (decreasing),
 * then AVERAGE of both directions for the combined standard mean and UUT mean.
 *
 * @param {Array<{
 *   cycleCode: string,
 *   direction: string,
 *   uutReading: number,
 *   correctedStandard: number
 * }>} readings  – All readings for a single nominal point
 *
 * @returns {{
 *   uutInc:      number|null,
 *   uutDec:      number|null,
 *   stdInc:      number|null,
 *   stdDec:      number|null,
 *   uutMean:     number|null,
 *   standardMean: number|null
 * }}
 */
function groupAndAverage(readings) {
  const incReadings = readings.filter(
    (r) => INCREASING_CYCLES.has(r.cycleCode) || r.direction === 'increasing'
  );
  const decReadings = readings.filter(
    (r) => DECREASING_CYCLES.has(r.cycleCode) || r.direction === 'decreasing'
  );

  const uutInc = average(incReadings.map((r) => r.uutReading));
  const uutDec = average(decReadings.map((r) => r.uutReading));
  const stdInc = average(incReadings.map((r) => r.correctedStandard));
  const stdDec = average(decReadings.map((r) => r.correctedStandard));

  // Combined mean = average of increasing mean and decreasing mean
  // (treats each direction equally regardless of number of cycles)
  const uutVals  = [uutInc, uutDec].filter((v) => v !== null);
  const stdVals  = [stdInc, stdDec].filter((v) => v !== null);

  const uutMean      = uutVals.length  ? average(uutVals)  : null;
  const standardMean = stdVals.length  ? average(stdVals)  : null;

  return { uutInc, uutDec, stdInc, stdDec, uutMean, standardMean };
}

/**
 * Level correction (Beda Level Acuan / height correction).
 *
 * Excel concept: Beda Level Acuan = ρ × g × Δh
 *   where:
 *     ρ (mediaDensity) = density of measurement medium (kg/m³)
 *     g (gravity)      = local gravitational acceleration (m/s²)
 *     Δh (deltaH)      = height difference between UUT and standard (m)
 *
 * Result is in Pa when inputs are in SI units.
 *
 * @param {number} mediaDensity  kg/m³  (default 1.2 for air)
 * @param {number} gravity       m/s²   (default 9.78)
 * @param {number} deltaH        metres (signed; positive when UUT is higher)
 * @returns {number}
 */
function calcLevelCorrection(mediaDensity, gravity, deltaH) {
  return Number(mediaDensity) * Number(gravity) * Number(deltaH);
}

/**
 * Error per calibration point.
 *
 * Excel concept: Error = UUT_mean - STD_corrected_mean + Level_correction
 *
 * @param {number} uutMean
 * @param {number} standardMean
 * @param {number} levelCorrection
 * @returns {number}
 */
function calcError(uutMean, standardMean, levelCorrection) {
  return Number(uutMean) - Number(standardMean) + Number(levelCorrection);
}

/**
 * Repeatability per calibration point.
 *
 * Excel concept: Repeatability = MAX(all UUT readings) – MIN(all UUT readings)
 * for the same nominal point across all cycles.
 *
 * @param {number[]} uutReadings  – All UUT readings at the same nominal point
 * @returns {number}
 */
function calcRepeatability(uutReadings) {
  const valid = uutReadings
    .filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v)))
    .map(Number);
  if (valid.length === 0) return 0;
  return Math.max(...valid) - Math.min(...valid);
}

/**
 * Zero deviation.
 *
 * For the zero nominal point (pointIndex === 0):
 *   zeroDeviation = absolute value of error at zero point
 *
 * For non-zero points:
 *   zeroDeviation = errorAtZero (propagated from point 0)
 *
 * TODO: Validate this logic against your Excel workbook.
 *       Some implementations use Math.abs(uutMean_at_zero - nominalZero).
 *       If the workbook calculates zero deviation differently per point,
 *       update this function accordingly.
 *
 * @param {number} errorAtZeroPoint  – error value calculated at nominal 0
 * @returns {number}
 */
function calcZeroDeviation(errorAtZeroPoint) {
  return Math.abs(Number(errorAtZeroPoint));
}

/**
 * Apply unit conversion to a level-corrected pressure value if the UUT and
 * standard use different units.
 *
 * If units are the same, returns the value unchanged.
 *
 * @param {number} value
 * @param {string} fromUnit
 * @param {string} toUnit
 * @returns {number}
 */
function applyUnitConversion(value, fromUnit, toUnit) {
  if (!fromUnit || !toUnit || fromUnit === toUnit) return value;
  return convertPressure(value, fromUnit, toUnit);
}

module.exports = {
  groupAndAverage,
  calcLevelCorrection,
  calcError,
  calcRepeatability,
  calcZeroDeviation,
  applyUnitConversion,
  INCREASING_CYCLES,
  DECREASING_CYCLES,
};
