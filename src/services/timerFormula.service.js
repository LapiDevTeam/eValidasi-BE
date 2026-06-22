'use strict';

/**
 * timerFormula.service.js  –  Timer (Stopwatch) Calibration math engine
 *
 * Pure functions (no DB, no I/O) that reproduce the "HITUNGAN" sheet of the
 * TIMER (Detik / Menit) workbook.
 *
 * Workbook reference (per measurement point, n = 10 cycles):
 *   S (standard, sec) = Jam*3600 + Menit*60 + Detik + mDetik/1000 + Correction_STD
 *   T (UUT, sec)      = Jam*3600 + Menit*60 + Detik + mDetik/100
 *   error             = T - S
 *   meanError         = AVERAGE(error)
 *   SD                = STDEV(error)            (sample standard deviation, n-1)
 *   Uncertainty budget (RSS of 4 components):
 *     u1 repeatability (Type A) = SD / SQRT(n)
 *     u2 digital resolution     = digitalRes / (2*SQRT(3))
 *     u3 analog resolution      = analogRes  / SQRT(6)
 *     u4 certificate (Type B)   = UC_STD / 2
 *     u_combined = SQRT(u1^2 + u2^2 + u3^2 + u4^2)
 *     U_expanded(sec) = u_combined * COVERAGE_FACTOR   (k = 2)
 *
 * NOTE (faithful to the source workbook): the UUT milli-second column is divided
 * by 100 while the STANDARD milli-second column is divided by 1000. This looks
 * like a workbook inconsistency but is preserved on purpose. The divisors are
 * exposed as constants so they can be reconciled later in one place.
 */

const COVERAGE_FACTOR = 2;            // k, 95% confidence
const STD_MS_DIVISOR = 1000;         // standard mDetik -> seconds
const UUT_MS_DIVISOR = 100;          // UUT mDetik -> seconds (workbook uses /100)
const REPEAT_DIVISOR = Math.sqrt(10);          // n = 10 readings
const DIGITAL_DIVISOR = 2 * Math.sqrt(3);      // rectangular distribution
const ANALOG_DIVISOR = Math.sqrt(6);           // triangular distribution
const CERT_DIVISOR = 2;                         // certificate reported at k = 2

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Convert an H/M/S/ms reading into total seconds.
 * @param {object} parts          { jam, menit, detik, mdetik }
 * @param {number} msDivisor      divisor applied to the mDetik component
 * @param {number} [correction]   additive correction in seconds (standard only)
 */
function toSeconds(parts, msDivisor, correction = 0) {
  const jam = toNumber(parts.jam);
  const menit = toNumber(parts.menit);
  const detik = toNumber(parts.detik);
  const mdetik = toNumber(parts.mdetik);
  return jam * 3600 + menit * 60 + detik + mdetik / msDivisor + toNumber(correction);
}

function standardSeconds(parts, correctionStd = 0) {
  return toSeconds(
    {
      jam: parts.std_jam ?? parts.jam,
      menit: parts.std_menit ?? parts.menit,
      detik: parts.std_detik ?? parts.detik,
      mdetik: parts.std_mdetik ?? parts.mdetik,
    },
    STD_MS_DIVISOR,
    correctionStd
  );
}

function uutSeconds(parts) {
  return toSeconds(
    {
      jam: parts.uut_jam ?? parts.jam,
      menit: parts.uut_menit ?? parts.menit,
      detik: parts.uut_detik ?? parts.detik,
      mdetik: parts.uut_mdetik ?? parts.mdetik,
    },
    UUT_MS_DIVISOR,
    0
  );
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

/**
 * Sample standard deviation (Excel STDEV, divides by n-1).
 * Returns 0 when fewer than 2 values are supplied.
 */
function stdev(values) {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  const sumSq = values.reduce((acc, v) => acc + (v - m) * (v - m), 0);
  return Math.sqrt(sumSq / (n - 1));
}

/**
 * Build the 4-component uncertainty budget for one measurement point.
 *
 * @param {object} input
 * @param {number} input.sd             sample SD of the per-cycle errors (sec)
 * @param {number} [input.digitalRes]   UUT digital resolution (sec)
 * @param {number} [input.analogRes]    UUT analog resolution (sec)
 * @param {number} [input.ucStd]        standard certificate uncertainty (sec, k=2)
 * @returns {object} budget incl. components array + combined/expanded values
 */
function buildUncertaintyBudget({ sd, digitalRes = 0, analogRes = 0, ucStd = 0 }) {
  const uRepeat = toNumber(sd) / REPEAT_DIVISOR;
  const uDigital = toNumber(digitalRes) / DIGITAL_DIVISOR;
  const uAnalog = toNumber(analogRes) / ANALOG_DIVISOR;
  const uCert = toNumber(ucStd) / CERT_DIVISOR;

  const uCombined = Math.sqrt(
    uRepeat * uRepeat + uDigital * uDigital + uAnalog * uAnalog + uCert * uCert
  );
  const uExpandedSec = uCombined * COVERAGE_FACTOR;

  return {
    components: [
      { no: 1, sumber: 'Daya ulang', tipe: 'A', nilai: toNumber(sd), divisor: REPEAT_DIVISOR, ui: uRepeat },
      { no: 2, sumber: 'Resolusi (Digital)', tipe: 'B', nilai: toNumber(digitalRes), divisor: DIGITAL_DIVISOR, ui: uDigital },
      { no: 2, sumber: 'Resolusi (Analog)', tipe: 'B', nilai: toNumber(analogRes), divisor: ANALOG_DIVISOR, ui: uAnalog },
      { no: 3, sumber: 'Sertifikat', tipe: 'B', nilai: toNumber(ucStd), divisor: CERT_DIVISOR, ui: uCert },
    ],
    uRepeatability: uRepeat,
    uDigitalRes: uDigital,
    uAnalogRes: uAnalog,
    uCertificate: uCert,
    uCombined,
    uExpandedSec,
    uExpandedMenit: uExpandedSec / 60,
    uExpandedJam: uExpandedSec / 3600,
    coverageFactor: COVERAGE_FACTOR,
  };
}

/**
 * Compute the full result for a single measurement point.
 *
 * @param {object} point
 * @param {number}  point.correctionStd
 * @param {number}  point.ucStd
 * @param {number}  point.digitalRes
 * @param {number}  point.analogRes
 * @param {Array}   point.readings   array of up to 10 cycle objects (std_ and uut_ fields)
 * @returns {object}
 */
function isBlankReading(r) {
  const fields = [
    r.std_jam, r.std_menit, r.std_detik, r.std_mdetik,
    r.uut_jam, r.uut_menit, r.uut_detik, r.uut_mdetik,
  ];
  return fields.every((v) => v === null || v === undefined || v === '' || Number(v) === 0);
}

function computePoint({ correctionStd = 0, ucStd = 0, digitalRes = 0, analogRes = 0, readings = [] }) {
  // Mirror Excel: completely blank cycles are ignored by AVERAGE/STDEV.
  const entered = readings.filter((r) => !isBlankReading(r));
  const rows = entered.map((r) => {
    const s = standardSeconds(r, correctionStd);
    const t = uutSeconds(r);
    return { standardSec: s, uutSec: t, errorSec: t - s };
  });

  const errors = rows.map((r) => r.errorSec);
  const meanStd = mean(rows.map((r) => r.standardSec));
  const meanUut = mean(rows.map((r) => r.uutSec));
  const meanError = mean(errors);
  const sd = stdev(errors);

  const budget = buildUncertaintyBudget({ sd, digitalRes, analogRes, ucStd });

  return {
    rows,
    enteredCount: entered.length,
    meanStdSec: meanStd,
    meanUutSec: meanUut,
    meanErrorSec: meanError,
    sdSec: sd,
    ...budget,
  };
}

/**
 * Evaluate a point against tolerance.
 * Pass rule (default): the error band [mean - U, mean + U] must lie within
 * [-tolerance, +tolerance].
 */
function evaluatePoint(meanErrorSec, uExpandedSec, tolerance) {
  const tol = toNumber(tolerance);
  if (!tol) return { pass: null, lower: meanErrorSec - uExpandedSec, upper: meanErrorSec + uExpandedSec };
  const lower = meanErrorSec - uExpandedSec;
  const upper = meanErrorSec + uExpandedSec;
  const pass = lower >= -tol && upper <= tol;
  return { pass, lower, upper };
}

module.exports = {
  COVERAGE_FACTOR,
  STD_MS_DIVISOR,
  UUT_MS_DIVISOR,
  toSeconds,
  standardSeconds,
  uutSeconds,
  mean,
  stdev,
  buildUncertaintyBudget,
  computePoint,
  evaluatePoint,
};
