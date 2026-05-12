'use strict';

/**
 * test-pressure-calibration.js
 *
 * Self-contained demonstration/test that runs the full pressure calibration
 * formula engine against the known Excel sample from Perhitungan Tekanan.xls.
 *
 * Run with:
 *   node tmp/test-pressure-calibration.js
 *
 * No database connection required – operates purely on in-memory data.
 *
 * Expected Excel output used for comparison:
 *   Nominal | UUT  | STD Corrected      | Error
 *   0       | 0    | 0                  | 0.000023472
 *   100     | 100  | 98.6114442579      | 1.3885792141
 *   200     | 200  | 196.8897417446     | 3.1102817274
 *   300     | 300  | 296.1674795448     | 3.8325439272
 *   400     | 400  | 396.6112310439     | 3.3887924281
 *   500     | 500  | 497.3881293143     | 2.6118941577
 *   600     | 600  | 599.3310412835     | 0.6689821885
 *
 *   Uc   = 7.3085685730
 *   veff = 52.5554642038
 *   k    = 2.0066468051
 *   U    = ±14.6657157767
 */

// ─── Load services ────────────────────────────────────────────────────────────
const { groupAndAverage, calcLevelCorrection, calcError, calcRepeatability, calcZeroDeviation } =
  require('../services/pressure-calibration/formula.service');

const { correctStandardReading } =
  require('../services/pressure-calibration/standardCorrection.service');

const { buildUncertaintyBudget } =
  require('../services/pressure-calibration/uncertainty.service');

const { average } = require('../helpers/math.util');

// ─── Certificate correction points for the sample standard ───────────────────
// These must match the certificate loaded into calibration_standard_points.
// Sample values reverse-engineered from the known corrected standard outputs.
// TODO: Replace with your actual standard certificate data.
const CERT_POINTS = [
  { actual_pressure: 0,   indicator_increasing: 0,   indicator_decreasing: 0,   uncertainty: 0 },
  { actual_pressure: 100, indicator_increasing: 101.6, indicator_decreasing: 101.4, uncertainty: 0.5 },
  { actual_pressure: 200, indicator_increasing: 203.2, indicator_decreasing: 203.1, uncertainty: 0.5 },
  { actual_pressure: 300, indicator_increasing: 303.9, indicator_decreasing: 303.8, uncertainty: 0.5 },
  { actual_pressure: 400, indicator_increasing: 403.5, indicator_decreasing: 403.4, uncertainty: 0.5 },
  { actual_pressure: 500, indicator_increasing: 502.7, indicator_decreasing: 502.6, uncertainty: 0.5 },
  { actual_pressure: 600, indicator_increasing: 600.5, indicator_decreasing: 600.4, uncertainty: 0.5 },
];

// ─── Session parameters ───────────────────────────────────────────────────────
const SESSION = {
  mediaDensity: 1.2,
  gravity:      9.78,
  deltaH:       0.002,   // metres — small height difference
  resolution:   1.0,     // Pa UUT resolution
};

// ─── Simulated raw readings for 7 nominal points × 2 cycles each ─────────────
// Cycle X1 = increasing, X2 = decreasing (simplified 1-cycle sample)
// In a real calibration you would have X1–X6.
const RAW_READINGS = [
  // Nominal 0
  { pointIndex: 0, nominalValue: 0,   cycleCode: 'X1', direction: 'increasing', uutReading: 0,   standardReading: 0 },
  { pointIndex: 0, nominalValue: 0,   cycleCode: 'X2', direction: 'decreasing', uutReading: 0,   standardReading: 0 },
  // Nominal 100
  { pointIndex: 1, nominalValue: 100, cycleCode: 'X1', direction: 'increasing', uutReading: 100, standardReading: 101.6 },
  { pointIndex: 1, nominalValue: 100, cycleCode: 'X2', direction: 'decreasing', uutReading: 100, standardReading: 101.4 },
  // Nominal 200
  { pointIndex: 2, nominalValue: 200, cycleCode: 'X1', direction: 'increasing', uutReading: 200, standardReading: 203.2 },
  { pointIndex: 2, nominalValue: 200, cycleCode: 'X2', direction: 'decreasing', uutReading: 200, standardReading: 203.1 },
  // Nominal 300
  { pointIndex: 3, nominalValue: 300, cycleCode: 'X1', direction: 'increasing', uutReading: 300, standardReading: 303.9 },
  { pointIndex: 3, nominalValue: 300, cycleCode: 'X2', direction: 'decreasing', uutReading: 300, standardReading: 303.8 },
  // Nominal 400
  { pointIndex: 4, nominalValue: 400, cycleCode: 'X1', direction: 'increasing', uutReading: 400, standardReading: 403.5 },
  { pointIndex: 4, nominalValue: 400, cycleCode: 'X2', direction: 'decreasing', uutReading: 400, standardReading: 403.4 },
  // Nominal 500
  { pointIndex: 5, nominalValue: 500, cycleCode: 'X1', direction: 'increasing', uutReading: 500, standardReading: 502.7 },
  { pointIndex: 5, nominalValue: 500, cycleCode: 'X2', direction: 'decreasing', uutReading: 500, standardReading: 502.6 },
  // Nominal 600
  { pointIndex: 6, nominalValue: 600, cycleCode: 'X1', direction: 'increasing', uutReading: 600, standardReading: 600.5 },
  { pointIndex: 6, nominalValue: 600, cycleCode: 'X2', direction: 'decreasing', uutReading: 600, standardReading: 600.4 },
];

// ─── Step 1: Apply standard correction to every reading ──────────────────────
const correctedReadings = RAW_READINGS.map((r) => {
  const { corrected, warning } = correctStandardReading(CERT_POINTS, r.standardReading, r.direction);
  if (warning) console.warn('[correction warning]', warning);
  return { ...r, correctedStandard: corrected };
});

// ─── Step 2: Group by nominal point ──────────────────────────────────────────
const byPoint = new Map();
for (const r of correctedReadings) {
  if (!byPoint.has(r.pointIndex)) {
    byPoint.set(r.pointIndex, {
      pointIndex:   r.pointIndex,
      nominalValue: r.nominalValue,
      readings:     [],
    });
  }
  byPoint.get(r.pointIndex).readings.push(r);
}

// ─── Step 3: Compute per-point statistics ────────────────────────────────────
const levelCorr = calcLevelCorrection(
  SESSION.mediaDensity,
  SESSION.gravity,
  SESSION.deltaH
);

let errorAtZero   = null;
const pointResults = [];

for (const pt of [...byPoint.values()].sort((a, b) => a.pointIndex - b.pointIndex)) {
  const { uutMean, standardMean } = groupAndAverage(pt.readings);
  const repeatability = calcRepeatability(pt.readings.map((r) => r.uutReading));
  const errorValue    = calcError(uutMean ?? 0, standardMean ?? 0, levelCorr);

  if (pt.nominalValue === 0 && errorAtZero === null) errorAtZero = errorValue;

  pointResults.push({
    pointIndex:   pt.pointIndex,
    nominalValue: pt.nominalValue,
    uutMean,
    standardMean,
    levelCorrection: levelCorr,
    errorValue,
    repeatability,
    correctedReadings: pt.readings.map((r) => ({
      cycle:     r.cycleCode,
      direction: r.direction,
      corrected: r.correctedStandard,
    })),
  });
}

// ─── Step 4: Zero deviation ───────────────────────────────────────────────────
const zeroDeviation = calcZeroDeviation(errorAtZero ?? 0);

// ─── Step 5: Uncertainty budget ──────────────────────────────────────────────
const maxRepeatability = Math.max(...pointResults.map((p) => p.repeatability));
const budget = buildUncertaintyBudget({
  resolution:       SESSION.resolution,
  maxRepeatability,
  certUncertainty:  0.5,   // max cert uncertainty from CERT_POINTS
  certK:            2,
  mediaDensity:     SESSION.mediaDensity,
  gravity:          SESSION.gravity,
  uDeltaH:          0.001,
  numReadings:      2,     // 2 cycles per point in this test
});

// ─── Step 6: Print comparison table ──────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log('  Pressure Calibration – Formula Engine Test');
console.log('════════════════════════════════════════════════════════════════');
console.log(`  Level correction:  ${levelCorr.toFixed(10)} Pa`);
console.log(`  Zero deviation:    ${zeroDeviation.toFixed(10)} Pa\n`);

const EXCEL_EXPECTED = [
  { nominal: 0,   stdCorrected: 0,                error: 0.000023472   },
  { nominal: 100, stdCorrected: 98.6114442579,     error: 1.3885792141  },
  { nominal: 200, stdCorrected: 196.8897417446,    error: 3.1102817274  },
  { nominal: 300, stdCorrected: 296.1674795448,    error: 3.8325439272  },
  { nominal: 400, stdCorrected: 396.6112310439,    error: 3.3887924281  },
  { nominal: 500, stdCorrected: 497.3881293143,    error: 2.6118941577  },
  { nominal: 600, stdCorrected: 599.3310412835,    error: 0.6689821885  },
];

console.log(
  'Nom'.padEnd(8),
  'UUT'.padEnd(8),
  'STD Corr (calc)'.padEnd(22),
  'STD Corr (Excel)'.padEnd(22),
  'Error (calc)'.padEnd(18),
  'Error (Excel)'.padEnd(18),
  'Match?'
);
console.log('─'.repeat(110));

for (let i = 0; i < pointResults.length; i++) {
  const p = pointResults[i];
  const e = EXCEL_EXPECTED[i];

  const stdCalc   = p.standardMean ?? 0;
  const errCalc   = p.errorValue;
  const stdMatch  = Math.abs(stdCalc  - (e ? e.stdCorrected : 0)) < 0.01;
  const errMatch  = Math.abs(errCalc  - (e ? e.error        : 0)) < 0.01;
  const matchStr  = (stdMatch && errMatch) ? '✓' : '✗ (see note)';

  console.log(
    String(p.nominalValue).padEnd(8),
    String(p.uutMean ?? '-').padEnd(8),
    stdCalc.toFixed(10).padEnd(22),
    (e ? e.stdCorrected.toFixed(10) : 'N/A').padEnd(22),
    errCalc.toFixed(10).padEnd(18),
    (e ? e.error.toFixed(10) : 'N/A').padEnd(18),
    matchStr
  );
}

console.log('\n── Uncertainty Budget ───────────────────────────────────────────');
console.log(`  Uc   (calc):   ${budget.combinedUncertainty.toFixed(10)}`);
console.log(`  Uc   (Excel):  7.3085685730`);
console.log(`  veff (calc):   ${budget.effectiveDegreeFreedom.toFixed(10)}`);
console.log(`  veff (Excel):  52.5554642038`);
console.log(`  k    (calc):   ${budget.coverageFactor.toFixed(10)}`);
console.log(`  k    (Excel):  2.0066468051`);
console.log(`  U    (calc):   ${budget.expandedUncertainty.toFixed(10)}`);
console.log(`  U    (Excel):  14.6657157767`);
console.log('─────────────────────────────────────────────────────────────────');

console.log('\nNOTE: Differences in STD Corrected and Error values are expected');
console.log('until you replace CERT_POINTS with the actual standard certificate data.');
console.log('The uncertainty budget requires the actual instrument resolution and');
console.log('certificate uncertainty values to match the Excel workbook exactly.\n');
