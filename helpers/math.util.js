'use strict';

/**
 * math.util.js
 * Pure mathematical helpers used by the pressure calibration formula engine.
 * All functions are stateless and side-effect-free.
 */

/**
 * Compute the arithmetic mean of an array, ignoring null / undefined /
 * empty-string / NaN values.
 *
 * @param {Array<number|null|undefined|string>} values
 * @returns {number|null} Mean, or null when there are no valid values.
 */
function average(values) {
  const valid = values.filter(
    (v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v))
  );
  if (valid.length === 0) return null;
  return valid.reduce((sum, v) => sum + Number(v), 0) / valid.length;
}

/**
 * Compute the population standard deviation of an array.
 *
 * @param {number[]} values
 * @returns {number}
 */
function stdDev(values) {
  const valid = values.filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v)));
  if (valid.length < 2) return 0;
  const mean = valid.reduce((s, v) => s + Number(v), 0) / valid.length;
  const variance = valid.reduce((s, v) => s + Math.pow(Number(v) - mean, 2), 0) / valid.length;
  return Math.sqrt(variance);
}

/**
 * Compute sample standard deviation (denominator = n-1, Bessel's correction).
 *
 * @param {number[]} values
 * @returns {number}
 */
function sampleStdDev(values) {
  const valid = values.filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v)));
  if (valid.length < 2) return 0;
  const mean = valid.reduce((s, v) => s + Number(v), 0) / valid.length;
  const variance = valid.reduce((s, v) => s + Math.pow(Number(v) - mean, 2), 0) / (valid.length - 1);
  return Math.sqrt(variance);
}

/**
 * Compute linear regression parameters for exactly two calibration points.
 * Maps Excel LINEST / INTERCEPT for a two-point segment.
 *
 *   slope     = (y2 - y1) / (x2 - x1)
 *   intercept = y1 - slope * x1
 *
 * @param {number} x1 - indicator value of lower certificate point
 * @param {number} y1 - actual pressure of lower certificate point
 * @param {number} x2 - indicator value of upper certificate point
 * @param {number} y2 - actual pressure of upper certificate point
 * @returns {{ slope: number, intercept: number }}
 */
function linearRegression(x1, y1, x2, y2) {
  if (x2 === x1) {
    throw new Error(`linearRegression: x1 and x2 must differ (both are ${x1}).`);
  }
  const slope = (y2 - y1) / (x2 - x1);
  const intercept = y1 - slope * x1;
  return { slope, intercept };
}

/**
 * Approximate Excel TINV(0.05, veff) (two-tailed 95 % confidence)
 * using a numerical inverse CDF for Student's t-distribution.
 *
 * This aligns more closely with workbook formulas that use TINV(0.05, veff).
 *
 * @param {number} veff - effective degrees of freedom (Welch-Satterthwaite)
 * @returns {number} coverage factor k
 */
function tDistribution9545(veff) {
  const v = Number(veff);
  if (v <= 0 || Number.isNaN(v)) return 1.959963984540054;

  // Legacy Excel TINV truncates degrees_of_freedom to integer.
  const dof = Math.max(1, Math.floor(v));

  // Two-tailed 95 % => upper-tail probability 0.025 => CDF target 0.975
  return inverseStudentTCdf(0.975, dof);
}

function gammaLn(z) {
  const cof = [
    76.18009172947146,
    -86.50532032941677,
    24.01409824083091,
    -1.231739572450155,
    0.001208650973866179,
    -0.000005395239384953,
  ];

  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);

  let ser = 1.000000000190015;
  for (let j = 0; j < cof.length; j += 1) {
    y += 1;
    ser += cof[j] / y;
  }

  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

function betaCf(a, b, x) {
  const maxIterations = 200;
  const eps = 1e-12;
  const fpMin = 1e-300;

  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < fpMin) d = fpMin;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= maxIterations; m += 1) {
    const m2 = 2 * m;

    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < fpMin) d = fpMin;
    c = 1 + aa / c;
    if (Math.abs(c) < fpMin) c = fpMin;
    d = 1 / d;
    const del = d * c;
    h *= del;

    if (Math.abs(del - 1) <= eps) break;
  }

  return h;
}

function regularizedIncompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const bt = Math.exp(
    gammaLn(a + b) - gammaLn(a) - gammaLn(b)
    + a * Math.log(x)
    + b * Math.log(1 - x)
  );

  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaCf(a, b, x)) / a;
  }

  return 1 - (bt * betaCf(b, a, 1 - x)) / b;
}

function studentTCdf(t, dof) {
  const v = Number(dof);
  if (!Number.isFinite(v) || v <= 0) return Number.NaN;

  const x = v / (v + t * t);
  const ib = regularizedIncompleteBeta(x, v / 2, 0.5);

  if (t >= 0) return 1 - 0.5 * ib;
  return 0.5 * ib;
}

function inverseStudentTCdf(probability, dof) {
  const p = Number(probability);
  const v = Number(dof);

  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  if (p < 0.5) {
    return -inverseStudentTCdf(1 - p, v);
  }

  let low = 0;
  let high = 1;

  while (studentTCdf(high, v) < p && high < 1e6) {
    high *= 2;
  }

  for (let i = 0; i < 120; i += 1) {
    const mid = (low + high) / 2;
    const cdf = studentTCdf(mid, v);

    if (cdf < p) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Convert pressure between common units.
 * Add more cases as your instrument range requires.
 *
 * TODO: Extend with additional units (mbar, kPa, psi, mmHg, cmH2O, inH2O)
 *       if required by your instrument catalogue.
 *
 * @param {number} value
 * @param {string} fromUnit
 * @param {string} toUnit
 * @returns {number}
 */
function convertPressure(value, fromUnit, toUnit) {
  if (fromUnit === toUnit) return value;

  // Conversion factors to Pascal (Pa)
  const toPa = {
    Pa:     1,
    kPa:    1000,
    MPa:    1e6,
    mbar:   100,
    bar:    1e5,
    psi:    6894.757,
    mmHg:   133.322,
    cmH2O:  98.0665,
    inH2O:  249.089,
  };

  const from = toPa[fromUnit];
  const to   = toPa[toUnit];

  if (from === undefined || to === undefined) {
    // TODO: Add the missing unit conversion factor in toPa table above.
    throw new Error(`convertPressure: unknown unit "${fromUnit}" or "${toUnit}".`);
  }

  return (value * from) / to;
}

module.exports = {
  average,
  stdDev,
  sampleStdDev,
  linearRegression,
  tDistribution9545,
  convertPressure,
};
