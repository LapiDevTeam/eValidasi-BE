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
  const hydrostaticPa = Number(mediaDensity) * Number(gravity) * Number(deltaH);

  // Workbook chain:
  //   AK56 = rho * g * delta_h
  //   AK57 = AK56 * 10^-5
  //   AK59 = (1 / AN53) * AK57, with AN53 = 0.1 in the template
  // Net factor = 10^-4 from AK56 to correction term used in error table.
  return hydrostaticPa * 1e-4;
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

function buildCycleMap(readings) {
  const map = new Map();
  for (const row of readings || []) {
    const code = String(row.cycleCode || '').toUpperCase();
    if (!code) continue;
    map.set(code, {
      uut: Number(row.uutReading || 0),
      std: Number(row.correctedStandard || 0),
    });
  }
  return map;
}

function getCycleValue(cycleMap, cycleCode, key) {
  const row = cycleMap.get(cycleCode);
  if (!row) return 0;
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Workbook repeatability (H39:H46):
 *   MAX(
 *     ABS((Drow-D23)-(Brow-B23)-(Erow-E23)+(Crow-C23)),
 *     ABS((Jrow-D23)-(Hrow-B23)-(Krow-E23)+(Irow-C23))
 *   )
 *
 * Cycle mapping:
 *   B/C = X1 (uut/std), D/E = X3, H/I = X2, J/K = X4
 */
function calcWorkbookRepeatability(pointReadings, zeroPointReadings) {
  const pointMap = buildCycleMap(pointReadings);
  const zeroMap = buildCycleMap(zeroPointReadings);

  const pX1Uut = getCycleValue(pointMap, 'X1', 'uut');
  const pX1Std = getCycleValue(pointMap, 'X1', 'std');
  const pX2Uut = getCycleValue(pointMap, 'X2', 'uut');
  const pX2Std = getCycleValue(pointMap, 'X2', 'std');
  const pX3Uut = getCycleValue(pointMap, 'X3', 'uut');
  const pX3Std = getCycleValue(pointMap, 'X3', 'std');
  const pX4Uut = getCycleValue(pointMap, 'X4', 'uut');
  const pX4Std = getCycleValue(pointMap, 'X4', 'std');

  const zX1Uut = getCycleValue(zeroMap, 'X1', 'uut');
  const zX1Std = getCycleValue(zeroMap, 'X1', 'std');
  const zX3Uut = getCycleValue(zeroMap, 'X3', 'uut');
  const zX3Std = getCycleValue(zeroMap, 'X3', 'std');

  const termInc = Math.abs(
    (pX3Uut - zX3Uut)
    - (pX1Uut - zX1Uut)
    - (pX3Std - zX3Std)
    + (pX1Std - zX1Std)
  );

  const termDec = Math.abs(
    (pX4Uut - zX3Uut)
    - (pX2Uut - zX1Uut)
    - (pX4Std - zX3Std)
    + (pX2Std - zX1Std)
  );

  return Math.max(termInc, termDec);
}

/**
 * Workbook zero-point uncertainty source (I39:I46):
 *   MAX(
 *     ABS(H23-B23-(I23-C23)),
 *     ABS(J23-D23-(K23-E23)),
 *     ABS(L23-F23-(M23-G23))
 *   )
 *
 * Cycle mapping:
 *   X1..X6 pairs => (X2-X1), (X4-X3), (X6-X5)
 */
function calcWorkbookZeroDeviation(zeroPointReadings) {
  const zeroMap = buildCycleMap(zeroPointReadings);

  const x1Uut = getCycleValue(zeroMap, 'X1', 'uut');
  const x1Std = getCycleValue(zeroMap, 'X1', 'std');
  const x2Uut = getCycleValue(zeroMap, 'X2', 'uut');
  const x2Std = getCycleValue(zeroMap, 'X2', 'std');
  const x3Uut = getCycleValue(zeroMap, 'X3', 'uut');
  const x3Std = getCycleValue(zeroMap, 'X3', 'std');
  const x4Uut = getCycleValue(zeroMap, 'X4', 'uut');
  const x4Std = getCycleValue(zeroMap, 'X4', 'std');
  const x5Uut = getCycleValue(zeroMap, 'X5', 'uut');
  const x5Std = getCycleValue(zeroMap, 'X5', 'std');
  const x6Uut = getCycleValue(zeroMap, 'X6', 'uut');
  const x6Std = getCycleValue(zeroMap, 'X6', 'std');

  const term1 = Math.abs((x2Uut - x1Uut) - (x2Std - x1Std));
  const term2 = Math.abs((x4Uut - x3Uut) - (x4Std - x3Std));
  const term3 = Math.abs((x6Uut - x5Uut) - (x6Std - x5Std));

  return Math.max(term1, term2, term3);
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
  calcWorkbookRepeatability,
  calcWorkbookZeroDeviation,
  applyUnitConversion,
  INCREASING_CYCLES,
  DECREASING_CYCLES,
};
