'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const uncertaintySvc = require('../src/services/uncertaintyCalculation.service');

function nearlyEqual(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

test('calculateCoverageFactor falls back to k=2 for invalid dof', () => {
  const k = uncertaintySvc.calculateCoverageFactor(null);
  assert.equal(k, 2);
});

test('calculateUncertaintyBudget aligns with workbook sample (session18)', () => {
  const budget = uncertaintySvc.calculateUncertaintyBudget({
    session_id: 18,
    unit: 'PA',
    zero_deviation: 0,
    max_repeatability: 2.00100050025014,
    uncertainty_inputs: {
      standard_uncertainty: 300,
      metal_rule_uncertainty: 0.0003,
      instrument_resolution: 25,
      indicator_type: 'DIGITAL',
      analog_resolution_factor: 0.2,
      digital_resolution_factor: 0.5,
      standard_sensitivity_coefficient: 0.00014,
      metal_rule_sensitivity_coefficient: 0.0001,
    },
  });

  assert.equal(budget.components.length, 5);
  nearlyEqual(budget.summary.combined_uncertainty, 7.3087921027, 1e-6);
  nearlyEqual(budget.summary.effective_degree_freedom, 52.5617481102, 1e-6);
  nearlyEqual(budget.summary.coverage_factor, 2.0066468051, 1e-6);
  nearlyEqual(budget.summary.expanded_uncertainty, 14.6661643217, 1e-6);
});

test('calculateUncertaintyBudget matches HASIL PA workbook defaults', () => {
  const budget = uncertaintySvc.calculateUncertaintyBudget({
    session_id: 24,
    unit: 'PA',
    zero_deviation: 0,
    max_repeatability: 0.999,
    workbook_profile: 'HASIL_TEMPLATE',
    uncertainty_inputs: {
      standard_uncertainty: 31,
      metal_rule_uncertainty: 0.0002,
      instrument_resolution: 0.1,
      indicator_type: 'ANALOG',
      analog_resolution_factor: 0.2,
      digital_resolution_factor: 0.5,
      standard_sensitivity_coefficient: null,
      metal_rule_sensitivity_coefficient: null,
    },
  });

  nearlyEqual(budget.summary.combined_uncertainty, 0.5768925742574045, 1e-12);
  nearlyEqual(budget.summary.effective_degree_freedom, 50.04149618207458, 1e-9);
  nearlyEqual(budget.summary.coverage_factor, 2.008559112100761, 1e-12);
  nearlyEqual(budget.summary.expanded_uncertainty, 1.1587228367279747, 1e-12);
});
