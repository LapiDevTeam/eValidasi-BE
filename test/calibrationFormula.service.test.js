'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const formulaSvc = require('../src/services/calibrationFormula.service');

function nearlyEqual(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test('average ignores null/undefined/empty/NaN', () => {
  const result = formulaSvc.average([1, '2', null, undefined, '', NaN, 'abc']);
  nearlyEqual(result, 1.5, 1e-12);
});

test('correctStandardReading applies linear correction', () => {
  const corrected = formulaSvc.correctStandardReading(100, 1.00050025012506, 0);
  nearlyEqual(corrected, 100.050025012506, 1e-12);
});

test('calculateLevelCorrection matches workbook hydrostatic chain', () => {
  const valuePa = formulaSvc.calculateLevelCorrection({
    delta_h: 0.02,
    media_density: 1.2,
    gravity: 9.78,
    unit_mode: 'PA',
  });

  nearlyEqual(valuePa.correction_pascal, 0.23472, 1e-12);
  nearlyEqual(valuePa.correction_session_unit, 0.23472, 1e-12);

  const valueBar = formulaSvc.calculateLevelCorrection({
    delta_h: 0.02,
    media_density: 1.2,
    gravity: 9.78,
    unit_mode: 'BAR',
  });

  nearlyEqual(valueBar.correction_session_unit, 0.0000023472, 1e-15);
});

test('calculatePointResult matches workbook-style point 100 Pa sample', () => {
  const point = {
    point_id: 2,
    point_order: 2,
    nominal_value: 100,
    unit: 'PA',
  };

  const zeroPointRows = [
    { cycle_code: 'X1', direction: 'INCREASING', uut_reading: 0, corrected_standard_reading: 0 },
    { cycle_code: 'X2', direction: 'DECREASING', uut_reading: 0, corrected_standard_reading: 0 },
    { cycle_code: 'X3', direction: 'INCREASING', uut_reading: 0, corrected_standard_reading: 0 },
    { cycle_code: 'X4', direction: 'DECREASING', uut_reading: 0, corrected_standard_reading: 0 },
    { cycle_code: 'X5', direction: 'INCREASING', uut_reading: 0, corrected_standard_reading: 0 },
    { cycle_code: 'X6', direction: 'DECREASING', uut_reading: 0, corrected_standard_reading: 0 },
  ];

  const correctedRows = [
    { cycle_code: 'X1', direction: 'INCREASING', uut_reading: 100, corrected_standard_reading: 99.0495247624 },
    { cycle_code: 'X3', direction: 'INCREASING', uut_reading: 100, corrected_standard_reading: 100.0500250125 },
    { cycle_code: 'X5', direction: 'INCREASING', uut_reading: 100, corrected_standard_reading: 100.0500250125 },
    { cycle_code: 'X2', direction: 'DECREASING', uut_reading: 100, corrected_standard_reading: 98.0490245123 },
    { cycle_code: 'X4', direction: 'DECREASING', uut_reading: 100, corrected_standard_reading: 98.0490245123 },
    { cycle_code: 'X6', direction: 'DECREASING', uut_reading: 100, corrected_standard_reading: 97.0485242621 },
  ];

  const levelCorrection = 0.000023472;
  const result = formulaSvc.calculatePointResult({
    point,
    correctedReadings: correctedRows,
    levelCorrection,
    zeroPointReadings: zeroPointRows,
  });

  nearlyEqual(result.inc_standard_avg, 99.71652492913334, 1e-9);
  nearlyEqual(result.dec_standard_avg, 97.7155244289, 1e-9);
  nearlyEqual(result.mean_standard, 98.71602467901667, 1e-9);
  nearlyEqual(result.mean_uut, 100, 1e-12);
  nearlyEqual(result.final_error, -1.2839518489833316, 1e-9);
  nearlyEqual(result.repeatability, 1.0005002502, 1e-9);
});

test('calculatePointResult supports HASIL template error convention (UUT-STD)', () => {
  const point = {
    point_id: 2,
    point_order: 2,
    nominal_value: 10,
    unit: 'PA',
  };

  const zeroPointRows = [
    { cycle_code: 'X1', direction: 'INCREASING', uut_reading: 0, corrected_standard_reading: 0 },
    { cycle_code: 'X2', direction: 'DECREASING', uut_reading: 0, corrected_standard_reading: 0 },
    { cycle_code: 'X3', direction: 'INCREASING', uut_reading: 0, corrected_standard_reading: 0 },
    { cycle_code: 'X4', direction: 'DECREASING', uut_reading: 0, corrected_standard_reading: 0 },
    { cycle_code: 'X5', direction: 'INCREASING', uut_reading: 0, corrected_standard_reading: 0 },
    { cycle_code: 'X6', direction: 'DECREASING', uut_reading: 0, corrected_standard_reading: 0 },
  ];

  const correctedRows = [
    { cycle_code: 'X1', direction: 'INCREASING', uut_reading: 10, corrected_standard_reading: 8.991 },
    { cycle_code: 'X3', direction: 'INCREASING', uut_reading: 10, corrected_standard_reading: 9.99 },
    { cycle_code: 'X5', direction: 'INCREASING', uut_reading: 10, corrected_standard_reading: 9.99 },
    { cycle_code: 'X2', direction: 'DECREASING', uut_reading: 10, corrected_standard_reading: 9.99 },
    { cycle_code: 'X4', direction: 'DECREASING', uut_reading: 10, corrected_standard_reading: 9.99 },
    { cycle_code: 'X6', direction: 'DECREASING', uut_reading: 10, corrected_standard_reading: 9.99 },
  ];

  const result = formulaSvc.calculatePointResult({
    point,
    correctedReadings: correctedRows,
    levelCorrection: 0,
    zeroPointReadings: zeroPointRows,
    errorConvention: formulaSvc.ERROR_CONVENTION_UUT_MINUS_STD,
  });

  nearlyEqual(result.inc_error, 0.343, 1e-12);
  nearlyEqual(result.dec_error, 0.01, 1e-12);
  nearlyEqual(result.final_error, 0.1765, 1e-12);
});
