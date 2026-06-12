'use strict';

const { tDistribution9545 } = require('../../helpers/math.util');
const {
  PROFILE_HASIL_TEMPLATE,
} = require('./workbookProfile.service');

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function toNonNegative(value, fallback = 0) {
  const numeric = toNumberOrNull(value);
  if (numeric === null) return fallback;
  return numeric < 0 ? fallback : numeric;
}

function buildComponent({
  session_id,
  component_order,
  component_name,
  unit,
  uncertainty_type,
  distribution,
  u_value,
  divisor,
  degree_freedom,
  sensitivity_coefficient,
  is_auto_generated = true,
}) {
  const rawU = toNonNegative(u_value, 0);
  const den = toNumberOrNull(divisor) || 1;
  const vi = toNumberOrNull(degree_freedom);
  const ci = toNumberOrNull(sensitivity_coefficient) ?? 1;

  const ui = rawU / den;
  const uici = Math.abs(ui * ci);
  const uiciSquared = uici ** 2;
  const fourthOverVi = vi && vi > 0 ? (uiciSquared ** 2) / vi : 0;

  return {
    session_id,
    component_order,
    component_name,
    unit,
    uncertainty_type,
    distribution,
    u_value: rawU,
    divisor: den,
    degree_freedom: vi,
    ui_value: ui,
    sensitivity_coefficient: ci,
    uici,
    uici_squared: uiciSquared,
    uici_fourth_over_vi: fourthOverVi,
    is_auto_generated,
  };
}

function calculateCoverageFactor(veff) {
  const dof = toNumberOrNull(veff);
  if (dof === null || dof <= 0) return 2;
  const k = tDistribution9545(dof);
  if (!Number.isFinite(k) || k <= 0) return 2;
  return k;
}

function calculateUncertaintyBudget({
  session_id,
  unit,
  zero_deviation,
  max_repeatability,
  uncertainty_inputs,
  workbook_profile,
}) {
  const input = uncertainty_inputs || {};
  const profile = String(workbook_profile || '').toUpperCase();
  const isHasilTemplate = profile === PROFILE_HASIL_TEMPLATE;

  const indicatorType = String(input.indicator_type || 'DIGITAL').toUpperCase();
  const analogFactor = toNonNegative(input.analog_resolution_factor, 0.2);
  const digitalFactor = toNonNegative(input.digital_resolution_factor, 0.5);
  const resolutionFactor = indicatorType === 'ANALOG' ? analogFactor : digitalFactor;

  const standardSensitivity =
    toNumberOrNull(input.standard_sensitivity_coefficient)
    ?? (isHasilTemplate ? 0.00014 : 1);
  const metalRuleSensitivity =
    toNumberOrNull(input.metal_rule_sensitivity_coefficient)
    ?? (isHasilTemplate ? 0.0001 : 1);

  const resolution = toNonNegative(input.instrument_resolution, 0);
  const standardUncertainty = toNonNegative(input.standard_uncertainty, 0);
  const metalRuleUncertainty = toNonNegative(input.metal_rule_uncertainty, 0);

  const components = [
    buildComponent({
      session_id,
      component_order: 1,
      component_name: 'Ketidakpastian Zero Point',
      unit,
      uncertainty_type: 'A',
      distribution: 'RECT',
      u_value: toNonNegative(zero_deviation, 0),
      divisor: Math.sqrt(3),
      degree_freedom: 50,
      sensitivity_coefficient: 1,
    }),
    buildComponent({
      session_id,
      component_order: 2,
      component_name: 'Tes Keberulangan',
      unit,
      uncertainty_type: 'A',
      distribution: 'RECT',
      u_value: toNonNegative(max_repeatability, 0),
      divisor: Math.sqrt(3),
      degree_freedom: 50,
      sensitivity_coefficient: 1,
    }),
    buildComponent({
      session_id,
      component_order: 3,
      component_name: 'Standar',
      unit,
      uncertainty_type: 'B',
      distribution: 'NORMAL',
      u_value: standardUncertainty,
      divisor: 2,
      degree_freedom: 60,
      sensitivity_coefficient: standardSensitivity,
    }),
    buildComponent({
      session_id,
      component_order: 4,
      component_name: 'Resolusi',
      unit,
      uncertainty_type: 'B',
      distribution: 'RECT',
      u_value: resolution * resolutionFactor,
      divisor: Math.sqrt(3),
      degree_freedom: 50,
      sensitivity_coefficient: 1,
    }),
    buildComponent({
      session_id,
      component_order: 5,
      component_name: 'Metal Rule',
      unit,
      uncertainty_type: 'B',
      distribution: 'NORMAL',
      u_value: metalRuleUncertainty,
      divisor: 2,
      degree_freedom: 60,
      sensitivity_coefficient: metalRuleSensitivity,
    }),
  ];

  const sumUiciSquared = components.reduce(
    (acc, item) => acc + (toNumberOrNull(item.uici_squared) || 0),
    0
  );
  const sumUiciFourthOverVi = components.reduce(
    (acc, item) => acc + (toNumberOrNull(item.uici_fourth_over_vi) || 0),
    0
  );

  const combinedUncertainty = Math.sqrt(sumUiciSquared);
  const veff =
    sumUiciFourthOverVi > 0
      ? (combinedUncertainty ** 4) / sumUiciFourthOverVi
      : null;
  const coverageFactor = calculateCoverageFactor(veff);
  const expandedUncertainty = combinedUncertainty * coverageFactor;

  return {
    components,
    summary: {
      combined_uncertainty: combinedUncertainty,
      effective_degree_freedom: veff,
      coverage_factor: coverageFactor,
      expanded_uncertainty: expandedUncertainty,
    },
    metadata: {
      indicator_type: indicatorType,
      resolution_factor: resolutionFactor,
      sum_uici_squared: sumUiciSquared,
      sum_uici_fourth_over_vi: sumUiciFourthOverVi,
    },
  };
}

module.exports = {
  buildComponent,
  calculateCoverageFactor,
  calculateUncertaintyBudget,
};
