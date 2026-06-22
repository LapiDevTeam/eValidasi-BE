'use strict';

const test = require('node:test');
const assert = require('node:assert');
const f = require('../src/services/timerFormula.service');

// Helpers to build readings the way the FE/repository will.
function stdUut(sj, sm, sd, sms, uj, um, ud, ums) {
  return {
    std_jam: sj, std_menit: sm, std_detik: sd, std_mdetik: sms,
    uut_jam: uj, uut_menit: um, uut_detik: ud, uut_mdetik: ums,
  };
}

// ---------------------------------------------------------------------------
// Detik workbook — TITIK UKUR 6 detik (HITUNGAN rows 15..22, 8 readings)
//   correction_std (I15) = 0.044, uc_std (J15) = 0.04
//   digital res = 0, analog res (L15) = 0.2
//   Expected: meanError = -0.38225, SD = 0.220005681744813, U_exp = 0.21823763806151
// ---------------------------------------------------------------------------
test('Detik point 6 reproduces workbook mean error, SD and expanded uncertainty', () => {
  const readings = [
    stdUut(0, 0, 6, 317, 0, 0, 6, 0),
    stdUut(0, 0, 6, 281, 0, 0, 6, 0),
    stdUut(0, 0, 6, 541, 0, 0, 6, 0),
    stdUut(0, 0, 6, 101, 0, 0, 6, 0),
    stdUut(0, 0, 6, 378, 0, 0, 6, 0),
    stdUut(0, 0, 6, 441, 0, 0, 6, 0),
    stdUut(0, 0, 6, 659, 0, 0, 6, 0),
    stdUut(0, 0, 5, 988, 0, 0, 6, 0),
  ];

  const res = f.computePoint({
    correctionStd: 0.044,
    ucStd: 0.04,
    digitalRes: 0,
    analogRes: 0.2,
    readings,
  });

  assert.strictEqual(res.enteredCount, 8);
  assert.ok(Math.abs(res.meanErrorSec - -0.38225) < 1e-9, `meanError=${res.meanErrorSec}`);
  assert.ok(Math.abs(res.sdSec - 0.220005681744813) < 1e-9, `sd=${res.sdSec}`);
  assert.ok(Math.abs(res.uExpandedSec - 0.21823763806151) < 1e-9, `Uexp=${res.uExpandedSec}`);
});

// ---------------------------------------------------------------------------
// Detik workbook — TITIK UKUR 12 detik (HITUNGAN rows 31..38, 8 readings)
//   Expected: meanError = 0.596, U_exp = 0.169496172171977
// ---------------------------------------------------------------------------
test('Detik point 12 reproduces workbook mean error and expanded uncertainty', () => {
  const mdetik = [324, 362, 358, 299, 401, 378, 366, 392];
  const readings = mdetik.map((ms) => stdUut(0, 0, 11, ms, 0, 0, 12, 0));

  const res = f.computePoint({
    correctionStd: 0.044,
    ucStd: 0.04,
    digitalRes: 0,
    analogRes: 0.2,
    readings,
  });

  assert.ok(Math.abs(res.meanErrorSec - 0.596) < 1e-9, `meanError=${res.meanErrorSec}`);
  assert.ok(Math.abs(res.uExpandedSec - 0.169496172171977) < 1e-9, `Uexp=${res.uExpandedSec}`);
});

// ---------------------------------------------------------------------------
// Menit workbook — TITIK UKUR 10 menit (HITUNGAN rows 15..17, 3 readings)
//   correction_std (I15) = -0.011, uc_std (J15) = 0.04
//   digital res = 0, analog res (L15) = 30
//   Expected: meanError = -15.770, SD = 0.47923, U_exp = 24.50
// ---------------------------------------------------------------------------
test('Menit point 10 reproduces workbook mean error, SD and expanded uncertainty', () => {
  const readings = [
    stdUut(0, 10, 15, 442, 0, 10, 0, 0),
    stdUut(0, 10, 16, 329, 0, 10, 0, 0),
    stdUut(0, 10, 15, 571, 0, 10, 0, 0),
  ];

  const res = f.computePoint({
    correctionStd: -0.011,
    ucStd: 0.04,
    digitalRes: 0,
    analogRes: 30,
    readings,
  });

  assert.strictEqual(res.enteredCount, 3);
  assert.ok(Math.abs(res.meanErrorSec - -15.7696666666667) < 1e-6, `meanError=${res.meanErrorSec}`);
  assert.ok(Math.abs(res.sdSec - 0.47923) < 1e-4, `sd=${res.sdSec}`); // workbook V15 = 0.47923
  assert.ok(Math.abs(res.uExpandedSec - 24.4968052) < 1e-4, `Uexp=${res.uExpandedSec}`);
});

// ---------------------------------------------------------------------------
// Blank cycles are ignored (Excel behaviour) but repeatability divisor is sqrt(10)
// ---------------------------------------------------------------------------
test('blank cycles are excluded from averages', () => {
  const readings = [
    stdUut(0, 0, 6, 317, 0, 0, 6, 0),
    stdUut(0, 0, 6, 281, 0, 0, 6, 0),
    stdUut(0, 0, 0, 0, 0, 0, 0, 0), // blank
  ];
  const res = f.computePoint({ correctionStd: 0.044, ucStd: 0.04, analogRes: 0.2, readings });
  assert.strictEqual(res.enteredCount, 2);
});

// ---------------------------------------------------------------------------
// Evaluation against tolerance
// ---------------------------------------------------------------------------
test('evaluatePoint passes when error band within tolerance', () => {
  const e = f.evaluatePoint(-0.38225, 0.2182, 22);
  assert.strictEqual(e.pass, true);
});

test('evaluatePoint fails when band exceeds tolerance', () => {
  const e = f.evaluatePoint(-15.77, 24.5, 22);
  assert.strictEqual(e.pass, false); // band [-40.27, 8.73] breaches -22
});
