'use strict';

/**
 * timbanganFormula.service.js - Electronic Balance (Timbangan) math engine
 *
 * Pure functions (no DB / no I/O) reproducing the "HASIL HITUNG" and
 * "HASIL EVALUASI" sheets of TIMBANGAN.xls and TIMBANGAN (gr).xls.
 *
 * Supported units: 'kg' (default), 'g' (gram), 'mg' (milligram - no reference workbook).
 * AT master always stores konvensional_g in grams and uc_mg in milligrams regardless of unit.
 *
 * Section map (workbook -> function):
 *   I.   Pre-adjustment            -> computePreadjust
 *   II.  Daya ulang (repeatability)-> computeRepeatability
 *   III. Koreksi (per point)       -> computePoint
 *   IV.  Eksentrisitas             -> computeEccentricity
 *   V.   Hysteresis & LOP          -> computeHysteresis / computeLop
 *   Evaluasi                       -> evaluatePoint / deriveConclusion
 *
 * Uncertainty budget per measurement point (workbook HASIL HITUNG col L):
 *   u_repeatability = Sr / k          (k = sqrt(2) when Sr > Sres else 1)
 *   u_resolusi      = resolusi / (2*sqrt(3))
 *   u_sertifikat    = (Sigma AT UC / unit_divisor) / 2
 *   u_combined      = sqrt(u_rep^2 + u_res^2 + u_cert^2)
 *   U_expanded      = u_combined * 2
 *   tolerance       = resolusi * 5
 *
 * LOP CMAX source:
 *   unit='kg' -> max|error| across measurement points   (TIMBANGAN.xls)
 *   unit='g'  -> eccentricity maxDiff                   (TIMBANGAN (gr).xls)
 *   unit='mg' -> eccentricity maxDiff (assumed; no reference workbook provided)
 */

const COVERAGE_FACTOR = 2;              // k, 95% confidence
const REPEAT_K = Math.SQRT2;            // sqrt(2) when Sr > Sres
const RES_DIVISOR = 2 * Math.sqrt(3);  // rectangular distribution
const CERT_DIVISOR = 2;                 // certificate reported at k = 2
const SRES_FACTOR = 0.5 * 0.82;        // Sres = 0.41 * resolusi
const TOLERANCE_FACTOR = 5;             // toleransi = 5 * resolusi
const LOP_SR_FACTOR = 2.26;             // LOP = 2.26*Sr(max) + |CMAX| + U(CMAX)
const REPEAT_SOURCE_RATIO = 0.6;        // nominal > 0.6*maxLoad uses max-cap Sr

// Conversion factors from AT master storage (konvensional_g in g, uc_mg in mg) to working unit.
// gToUnit: multiply konvensional_g to get mass in target unit
// mgToUnit: multiply uc_mg to get UC in target unit
const UNIT_FACTORS = {
  kg: { gToUnit: 1 / 1000, mgToUnit: 1 / 1e6  },
  g:  { gToUnit: 1,         mgToUnit: 1 / 1000 },
  mg: { gToUnit: 1000,      mgToUnit: 1        },
};

const CONCLUSION_PASS = 'LAYAK DIGUNAKAN';
const CONCLUSION_FAIL = 'PENGGUNAAN FAKTOR KOREKSI';

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** true when a cell was left empty (null/undefined/''), but NOT for a typed 0. */
function isEntered(value) {
  if (value === null || value === undefined || value === '') return false;
  return Number.isFinite(Number(value));
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

/** mean over only the entered values (Excel AVERAGE ignores empty cells). */
function meanEntered(values) {
  const entered = values.filter(isEntered).map(Number);
  return entered.length ? mean(entered) : 0;
}

/** Excel STDEV - sample standard deviation (n-1); 0 for fewer than 2 values. */
function stdev(values) {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  const sumSq = values.reduce((acc, v) => acc + (v - m) * (v - m), 0);
  return Math.sqrt(sumSq / (n - 1));
}

// ---------------------------------------------------------------------------
// I. PRE-ADJUSTMENT
// ---------------------------------------------------------------------------

/**
 * @param {Array}  rows [{ konvensional_g, uut_reading, zero_reading }]
 * @param {string} unit 'kg' | 'g' | 'mg'
 * @returns {{ mass:number, result:number, error:number }}
 */
function computePreadjust(rows = [], unit = 'kg') {
  const active = rows.filter(
    (r) => isEntered(r.konvensional_g) || isEntered(r.uut_reading) || isEntered(r.at_no_id)
  );
  const factors = UNIT_FACTORS[unit] || UNIT_FACTORS.kg;
  const mass = active.reduce((acc, r) => acc + toNumber(r.konvensional_g), 0) * factors.gToUnit;
  const result = meanEntered(active.map((r) => r.uut_reading)) - meanEntered(active.map((r) => r.zero_reading));
  return { mass, result, error: result - mass };
}

// ---------------------------------------------------------------------------
// II. REPEATABILITY (DAYA ULANG)
// ---------------------------------------------------------------------------

/**
 * @param {Array}  rows [{ half_zero, half_reading, max_zero, max_reading }]
 * @param {number} resolusi
 */
function computeRepeatability(rows = [], resolusi = 0) {
  const halfActive = rows.filter((r) => isEntered(r.half_reading) || isEntered(r.half_zero));
  const maxActive = rows.filter((r) => isEntered(r.max_reading) || isEntered(r.max_zero));

  const halfM = halfActive.map((r) => toNumber(r.half_reading) - toNumber(r.half_zero));
  const maxM = maxActive.map((r) => toNumber(r.max_reading) - toNumber(r.max_zero));

  const srHalf = stdev(halfM);
  const srMax = stdev(maxM);
  const sres = SRES_FACTOR * toNumber(resolusi);

  return {
    srHalf,
    srMax,
    sres,
    kHalf: srHalf > sres ? REPEAT_K : 1,
    kMax: srMax > sres ? REPEAT_K : 1,
    avgHalfZero: meanEntered(halfActive.map((r) => r.half_zero)),
    avgHalfReading: meanEntered(halfActive.map((r) => r.half_reading)),
    avgMaxZero: meanEntered(maxActive.map((r) => r.max_zero)),
    avgMaxReading: meanEntered(maxActive.map((r) => r.max_reading)),
  };
}

// ---------------------------------------------------------------------------
// III. MEASUREMENT POINT (KOREKSI)
// ---------------------------------------------------------------------------

/**
 * @param {object} point
 * @param {Array}  point.standards    [{ konvensional_g, uc_mg, uut_reading, zero_reading, at_no_id }]
 * @param {number} point.resolusi
 * @param {object} point.repeatability  result of computeRepeatability
 * @param {number} point.maxLoadRef   kapasitas_alat in working unit (threshold = 0.6 * maxLoadRef)
 * @param {string} point.unit         'kg' | 'g' | 'mg'
 */
function computePoint({ standards = [], resolusi = 0, repeatability = {}, maxLoadRef = 0, unit = 'kg' }) {
  const active = standards.filter(
    (s) => isEntered(s.konvensional_g) || isEntered(s.uut_reading) || isEntered(s.at_no_id)
  );

  const factors = UNIT_FACTORS[unit] || UNIT_FACTORS.kg;
  const konvMass = active.reduce((acc, s) => acc + toNumber(s.konvensional_g), 0) * factors.gToUnit;
  const ucConverted = active.reduce((acc, s) => acc + toNumber(s.uc_mg), 0) * factors.mgToUnit;
  const reading = meanEntered(active.map((s) => s.uut_reading)) - meanEntered(active.map((s) => s.zero_reading));
  const error = reading - konvMass;

  // Pick half- or max-capacity repeatability based on 0.6 * kapasitas_alat (in working unit).
  const useMax = toNumber(maxLoadRef) > 0 && konvMass > REPEAT_SOURCE_RATIO * toNumber(maxLoadRef);
  const sr = useMax ? toNumber(repeatability.srMax) : toNumber(repeatability.srHalf);
  const k = useMax ? toNumber(repeatability.kMax) || 1 : toNumber(repeatability.kHalf) || 1;

  const uRepeatability = sr / k;
  const uResolusi = toNumber(resolusi) / RES_DIVISOR;
  const uSertifikat = ucConverted / CERT_DIVISOR;
  const uCombined = Math.sqrt(uRepeatability ** 2 + uResolusi ** 2 + uSertifikat ** 2);
  const uExpanded = uCombined * COVERAGE_FACTOR;

  const tolerance = toNumber(resolusi) * TOLERANCE_FACTOR;
  const evald = evaluatePoint(error, uExpanded, tolerance);

  return {
    konvMass,
    ucConverted,
    reading,
    error,
    repeatabilitySource: useMax ? 'MAX' : 'HALF',
    uRepeatability,
    uResolusi,
    uSertifikat,
    uCombined,
    uExpanded,
    tolerance,
    passFlag: evald.pass,
  };
}

/**
 * Evaluate a point: error band [error-U, error+U] must lie within [-tol, +tol].
 */
function evaluatePoint(error, uExpanded, tolerance) {
  const tol = toNumber(tolerance);
  const lower = error - uExpanded;
  const upper = error + uExpanded;
  if (!tol) return { pass: null, lower, upper };
  return { pass: lower >= -tol && upper <= tol, lower, upper };
}

// ---------------------------------------------------------------------------
// IV. ECCENTRICITY (EFEK BEBAN TIDAK TERPUSAT)
// ---------------------------------------------------------------------------

/**
 * @param {Array} rows [{ position, baca1, baca2 }] expected positions 0..4
 * G[i] = avg(baca1[i], baca2[n-1-i]); H[i] = G[0] - G[i]; maxDiff = max(H) - min(H)
 */
function computeEccentricity(rows = []) {
  const ordered = [...rows].sort((a, b) => toNumber(a.position) - toNumber(b.position));
  const n = ordered.length;
  if (!n) return { maxDiff: 0, averages: [] };

  const averages = ordered.map((r, i) => {
    const mirror = ordered[n - 1 - i];
    return mean([toNumber(r.baca1), toNumber(mirror.baca2)]);
  });

  const center = averages[0];
  const diffs = averages.map((g) => center - g);
  return {
    averages,
    diffs,
    maxDiff: Math.max(...diffs) - Math.min(...diffs),
  };
}

// ---------------------------------------------------------------------------
// V. HYSTERESIS
// ---------------------------------------------------------------------------

/**
 * Hysteresis = (Sum col1[M] - Sum col2[M]) / 4 over rows labelled 'M' (workbook E151).
 * @param {Array} rows [{ label, col1, col2 }]
 */
function computeHysteresis(rows = []) {
  const mRows = rows.filter((r) => String(r.label || '').trim().toUpperCase() === 'M');
  if (!mRows.length) return 0;
  const sumCol1 = mRows.reduce((acc, r) => acc + toNumber(r.col1), 0);
  const sumCol2 = mRows.reduce((acc, r) => acc + toNumber(r.col2), 0);
  return (sumCol1 - sumCol2) / 4;
}

// ---------------------------------------------------------------------------
// LIMIT OF PERFORMANCE (LOP)
// ---------------------------------------------------------------------------

/**
 * @param {object} opts
 * @param {number} opts.srHalf
 * @param {number} opts.srMax
 * @param {Array}  opts.results              [{ error, uExpanded }] - used for CMAX when unit='kg'
 * @param {string} opts.unit                 'kg' | 'g' | 'mg'
 * @param {number} opts.eccentricityMaxDiff  used as CMAX when unit='g' or 'mg'
 */
function computeLop({ srHalf = 0, srMax = 0, results = [], unit = 'kg', eccentricityMaxDiff = 0 }) {
  const srMaxUsed = Math.abs(Math.max(toNumber(srHalf), toNumber(srMax)));

  let cmax;
  if (unit === 'g' || unit === 'mg') {
    // Grams workbook (TIMBANGAN (gr).xls): CMAX = eccentricity maxDiff, not max|error|.
    cmax = Math.abs(toNumber(eccentricityMaxDiff));
  } else {
    cmax = results.length ? Math.max(...results.map((r) => Math.abs(toNumber(r.error)))) : 0;
  }

  const uCmax = results.length ? Math.max(...results.map((r) => toNumber(r.uExpanded))) : 0;
  return {
    srMaxUsed,
    cmax,
    uCmax,
    lop: LOP_SR_FACTOR * srMaxUsed + cmax + uCmax,
  };
}

// ---------------------------------------------------------------------------
// CONCLUSION
// ---------------------------------------------------------------------------

/** Any point outside tolerance -> correction factor needed. */
function deriveConclusion(results = []) {
  const evaluated = results.filter((r) => r.passFlag !== null && r.passFlag !== undefined);
  if (!evaluated.length) return null;
  return evaluated.every((r) => r.passFlag) ? CONCLUSION_PASS : CONCLUSION_FAIL;
}

module.exports = {
  COVERAGE_FACTOR,
  TOLERANCE_FACTOR,
  CONCLUSION_PASS,
  CONCLUSION_FAIL,
  UNIT_FACTORS,
  toNumber,
  mean,
  stdev,
  computePreadjust,
  computeRepeatability,
  computePoint,
  evaluatePoint,
  computeEccentricity,
  computeHysteresis,
  computeLop,
  deriveConclusion,
};
