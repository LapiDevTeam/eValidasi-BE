'use strict';

/**
 * Smoke test for grams (unit='g') formula against TM 027 (Sartorius CP 224S, 220g/0.0001g)
 * Reference: TIMBANGAN (gr).xls workbook
 *
 * Key expected values from the workbook:
 *   Sr_half  = 0.00012867  (HASIL HITUNG F23)
 *   Sr_max   = 0.00010541  (HASIL HITUNG K23)
 *   Sres     = 0.000041    (0.41 * 0.0001)
 *   LOP      = 0.00078865  (HASIL HITUNG N160)
 *   Eccent.  = 0.0003      (HASIL HITUNG I133..H137 maxDiff)
 *   Pt1 U    ~ 0.00019091  (Pt 0.05g, smallest AT only)
 *   Pt6 Sr   = HALF        (konvMass=120.000115 < 0.6*220=132)
 *   Pt7 Sr   = MAX         (konvMass=140.000143 > 0.6*220=132)
 */

const formula = require('../src/services/timbanganFormula.service');

const RESOLUSI = 0.0001; // g
const KAPASITAS_ALAT = 220; // g
const UNIT = 'g';

// --- REPEATABILITY rows (daya ulang) ---
// From HASIL HITUNG rows 10-19: half-cap (~120g), max-cap (~200g)
// These are the net readings (r - z) per trial.
// From the workbook DAYA ULANG section (approximate values to match Sr_half=0.00012867, Sr_max=0.00010541)
// We don't have exact raw rows, so we'll validate via the formula directly.
const srHalf = 0.00012867;
const srMax  = 0.00010541;
const sres   = formula.UNIT_FACTORS.g; // just to confirm it exported

console.log('--- Unit Factors ---');
console.log('g factors:', formula.UNIT_FACTORS.g);
console.log('kg factors:', formula.UNIT_FACTORS.kg);
console.log('mg factors:', formula.UNIT_FACTORS.mg);

// --- ECCENTRICITY ---
// maxDiff = 0.0003 (from workbook I133 = MAX(H133:H137) - MIN(H133:H137))
const eccentricityMaxDiff = 0.0003;

// Stub repeatability result matching the known Sr values
const repStub = {
  srHalf,
  srMax,
  sres: 0.5 * 0.82 * RESOLUSI, // 0.000041
  kHalf: srHalf > 0.5 * 0.82 * RESOLUSI ? Math.SQRT2 : 1,
  kMax:  srMax  > 0.5 * 0.82 * RESOLUSI ? Math.SQRT2 : 1,
};

console.log('\n--- Repeatability stub ---');
console.log('Sres:', repStub.sres.toFixed(8));
console.log('kHalf:', repStub.kHalf.toFixed(6));
console.log('kMax:', repStub.kMax.toFixed(6));

// --- MEASUREMENT POINT 1 (0.05g, AT001 only) ---
// AT001: konvensional_g = 0.050009, uc_mg = 0.002 (typical F1 class 50mg)
// Actual from workbook: error = 0.00029454g, U = 0.00019091g
// uRepeatability = 0.00012867 / sqrt(2) = 0.000090983 (uses half since 0.05 < 132)
// uResolusi = 0.0001 / (2*sqrt(3)) = 0.000028868
// uSertifikat = (0.002/1000) / 2 = 0.000001  (uc in mg -> g: /1000, then /2 for cert)
// uCombined = sqrt(0.000090983^2 + 0.000028868^2 + 0.000001^2)
//           = sqrt(8.2779e-9 + 8.3336e-10 + 1e-12)
//           = sqrt(9.1124e-9) = 0.000095459
// U_expanded = 0.000095459 * 2 = 0.000190918 ≈ 0.00019091 ✓

const pt1Standards = [{
  at_no_id: 'AT001',
  konvensional_g: 0.050009,  // 50mg AT, konv in g
  uc_mg: 0.002,               // UC = 0.002 mg
  uut_reading: 0.0503,        // arbitrary reading
  zero_reading: 0.0000,
}];

// Adjust reading so error = 0.00029454
// reading - konvMass = error => reading = konvMass + error
// konvMass = 0.050009 * 1 (gToUnit for 'g') = 0.050009
// reading = 0.050009 + 0.00029454 = 0.05030354
pt1Standards[0].uut_reading = 0.05030354;
pt1Standards[0].zero_reading = 0;

const pt1 = formula.computePoint({
  standards: pt1Standards,
  resolusi: RESOLUSI,
  repeatability: repStub,
  maxLoadRef: KAPASITAS_ALAT,
  unit: UNIT,
});

console.log('\n--- Point 1 (0.05g) ---');
console.log('konvMass:', pt1.konvMass.toFixed(8), '(expected: 0.05000900)');
console.log('error:', pt1.error.toFixed(8), '(expected: 0.00029454)');
console.log('repeatabilitySource:', pt1.repeatabilitySource, '(expected: HALF)');
console.log('uRepeatability:', pt1.uRepeatability.toFixed(8), '(expected: ~0.00009097)');
console.log('uResolusi:', pt1.uResolusi.toFixed(8), '(expected: ~0.00002887)');
console.log('uSertifikat:', pt1.uSertifikat.toFixed(8), '(expected: ~0.00000100)');
console.log('uExpanded:', pt1.uExpanded.toFixed(8), '(expected: ~0.00019091)');
console.log('tolerance:', pt1.tolerance.toFixed(8), '(expected: 0.00050000)');

// Check Sr threshold for Pt6 (120g) and Pt7 (140g)
// konvMass Pt6 = 120.000115, threshold = 0.6 * 220 = 132
// Pt6: 120.000115 < 132 -> HALF ✓
// konvMass Pt7 = 140.000143, 140.000143 > 132 -> MAX ✓

const pt6Standards = [{
  at_no_id: 'AT121',
  konvensional_g: 20.000010,
  uc_mg: 0.048,
  uut_reading: 0, zero_reading: 0,
}, {
  at_no_id: 'AT124',
  konvensional_g: 100.000105,
  uc_mg: 0.092,
  uut_reading: 0, zero_reading: 0,
}];
// konvMass = (20.000010 + 100.000105) * 1 = 120.000115
// Check only the Sr branch
const pt6Probe = formula.computePoint({
  standards: pt6Standards,
  resolusi: RESOLUSI,
  repeatability: repStub,
  maxLoadRef: KAPASITAS_ALAT,
  unit: UNIT,
});

const pt7Standards = [{
  at_no_id: 'AT122',
  konvensional_g: 20.000019,
  uc_mg: 0.048,
  uut_reading: 0, zero_reading: 0,
}, {
  at_no_id: 'AT123',
  konvensional_g: 20.000015,
  uc_mg: 0.048,
  uut_reading: 0, zero_reading: 0,
}, {
  at_no_id: 'AT124',
  konvensional_g: 100.000105,
  uc_mg: 0.092,
  uut_reading: 0, zero_reading: 0,
}];
// konvMass = (20.000019 + 20.000015 + 100.000105) * 1 = 140.000139

const pt7Probe = formula.computePoint({
  standards: pt7Standards,
  resolusi: RESOLUSI,
  repeatability: repStub,
  maxLoadRef: KAPASITAS_ALAT,
  unit: UNIT,
});

console.log('\n--- Sr Half/Max switchover test ---');
console.log('Pt6 konvMass:', pt6Probe.konvMass.toFixed(6), 'g | threshold:', (0.6 * KAPASITAS_ALAT).toFixed(1));
console.log('Pt6 Sr source:', pt6Probe.repeatabilitySource, '(expected: HALF)');
console.log('Pt7 konvMass:', pt7Probe.konvMass.toFixed(6), 'g');
console.log('Pt7 Sr source:', pt7Probe.repeatabilitySource, '(expected: MAX)');

// --- LOP ---
// LOP = 2.26 * srMaxUsed + cmax + uCmax
// where srMaxUsed = max(srHalf, srMax) = 0.00012867
// cmax (unit='g') = eccentricityMaxDiff = 0.0003
// uCmax = max(uExpanded) = 0.00019786 (from Pt1, approximately)
// LOP = 2.26*0.00012867 + 0.0003 + uCmax = 0.000290794 + 0.0003 + uCmax
// Expected LOP = 0.00078865 => uCmax = 0.00078865 - 0.000290794 - 0.0003 = 0.00019786

const computedForLop = [
  { error: 0.00029454, uExpanded: pt1.uExpanded },
];
const lop = formula.computeLop({
  srHalf, srMax,
  results: computedForLop,
  unit: UNIT,
  eccentricityMaxDiff,
});

console.log('\n--- LOP ---');
console.log('srMaxUsed:', lop.srMaxUsed.toFixed(8), '(expected: 0.00012867)');
console.log('cmax:', lop.cmax.toFixed(8), '(expected: 0.00030000 — eccentricity)');
console.log('uCmax:', lop.uCmax.toFixed(8), '(≈ max U_expanded across all points)');
console.log('LOP formula: 2.26 *', lop.srMaxUsed.toFixed(8), '+', lop.cmax.toFixed(8), '+', lop.uCmax.toFixed(8));
console.log('LOP =', lop.lop.toFixed(8));
console.log('If uCmax=0.00019786: LOP =', (2.26*0.00012867 + 0.0003 + 0.00019786).toFixed(8), '(expected: 0.00078865)');

// --- UNIT CONVERSION: kg sanity check (unit='kg' should still use max|error| for CMAX) ---
const lopKg = formula.computeLop({
  srHalf: 0, srMax: 0,
  results: [{ error: 0.01, uExpanded: 0.002 }, { error: -0.008, uExpanded: 0.003 }],
  unit: 'kg',
  eccentricityMaxDiff: 0.999,
});
console.log('\n--- LOP unit=kg (should use max|error|, NOT eccentricity) ---');
console.log('cmax:', lopKg.cmax.toFixed(6), '(expected: 0.010000, NOT 0.999000)');

// --- computePreadjust unit awareness ---
const paRows = [{ konvensional_g: 120, uut_reading: 120.00012, zero_reading: 0.00003 }];
const paG = formula.computePreadjust(paRows, 'g');
const paKg = formula.computePreadjust(paRows, 'kg');
console.log('\n--- computePreadjust ---');
console.log('unit=g: mass =', paG.mass.toFixed(6), '(expected: 120.000000)');
console.log('unit=kg: mass =', paKg.mass.toFixed(6), '(expected: 0.120000)');

console.log('\n=== PASS if all expected values match ===');
