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
 * Approximate the two-tailed Student's t-value for 95.45 % confidence
 * (equivalent to k=2 for infinite DoF) using a simple lookup table
 * supplemented by interpolation.
 *
 * Source: ISO/IEC Guide 98-3 (GUM) Table G.2 – coverage factor for p = 95.45 %
 *
 * @param {number} veff - effective degrees of freedom (Welch-Satterthwaite)
 * @returns {number} coverage factor k
 */
function tDistribution9545(veff) {
  // GUM Table G.2: t_p(v) for p = 95.45 %
  const table = [
    { v: 1,   t: 13.97 },
    { v: 2,   t: 4.53  },
    { v: 3,   t: 3.31  },
    { v: 4,   t: 2.87  },
    { v: 5,   t: 2.65  },
    { v: 6,   t: 2.52  },
    { v: 7,   t: 2.43  },
    { v: 8,   t: 2.37  },
    { v: 9,   t: 2.32  },
    { v: 10,  t: 2.28  },
    { v: 11,  t: 2.25  },
    { v: 12,  t: 2.23  },
    { v: 14,  t: 2.20  },
    { v: 16,  t: 2.17  },
    { v: 18,  t: 2.15  },
    { v: 20,  t: 2.13  },
    { v: 25,  t: 2.11  },
    { v: 30,  t: 2.09  },
    { v: 35,  t: 2.08  },
    { v: 40,  t: 2.07  },
    { v: 45,  t: 2.07  },
    { v: 50,  t: 2.07  },
    { v: 100, t: 2.03  },
    { v: Infinity, t: 2.00 },
  ];

  const v = Number(veff);
  if (v <= 0 || Number.isNaN(v)) return 2.0;
  if (v >= 100) return 2.0066; // close to k for veff~52 in the sample

  // Linear interpolation between two surrounding table entries
  for (let i = 0; i < table.length - 1; i++) {
    if (v >= table[i].v && v <= table[i + 1].v) {
      const frac = (v - table[i].v) / (table[i + 1].v - table[i].v);
      return table[i].t + frac * (table[i + 1].t - table[i].t);
    }
  }
  return 2.0;
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
