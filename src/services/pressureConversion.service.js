'use strict';

const DEFAULT_FACTORS = [
  { from_unit: 'BAR', to_unit: 'PA', factor: 100000 },
  { from_unit: 'PA', to_unit: 'BAR', factor: 0.00001 },
  { from_unit: 'BAR', to_unit: 'MBAR', factor: 1000 },
  { from_unit: 'MBAR', to_unit: 'BAR', factor: 0.001 },
  { from_unit: 'BAR', to_unit: 'KPA', factor: 100 },
  { from_unit: 'KPA', to_unit: 'BAR', factor: 0.01 },
  { from_unit: 'BAR', to_unit: 'MPA', factor: 0.1 },
  { from_unit: 'MPA', to_unit: 'BAR', factor: 10 },
  { from_unit: 'PSI', to_unit: 'BAR', factor: 0.0689475699987085 },
  { from_unit: 'BAR', to_unit: 'PSI', factor: 14.50377439 },
];

const BASE_TO_PA = {
  PA: 1,
  BAR: 100000,
  MBAR: 100,
  KPA: 1000,
  MPA: 1000000,
  PSI: 6894.757,
};

function normalizeUnit(unit) {
  if (unit === null || unit === undefined) return null;
  const normalized = String(unit).trim().toUpperCase();
  return normalized || null;
}

function normalizeFactorRows(rows = []) {
  return rows
    .map((row) => ({
      from_unit: normalizeUnit(row.from_unit),
      to_unit: normalizeUnit(row.to_unit),
      factor: Number(row.factor),
    }))
    .filter(
      (row) =>
        row.from_unit &&
        row.to_unit &&
        row.from_unit !== row.to_unit &&
        Number.isFinite(row.factor) &&
        row.factor !== 0
    );
}

function getConversionFactor(fromUnit, toUnit, factors = DEFAULT_FACTORS) {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  if (!from || !to || from === to) return 1;

  const normalized = normalizeFactorRows(factors);
  const direct = normalized.find((row) => row.from_unit === from && row.to_unit === to);
  if (direct) return direct.factor;

  const reverse = normalized.find((row) => row.from_unit === to && row.to_unit === from);
  if (reverse) return 1 / reverse.factor;

  if (BASE_TO_PA[from] && BASE_TO_PA[to]) {
    return BASE_TO_PA[from] / BASE_TO_PA[to];
  }

  throw new Error(`No conversion factor found for ${from} -> ${to}`);
}

function convertPressure(value, fromUnit, toUnit, factors = DEFAULT_FACTORS) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;

  const factor = getConversionFactor(fromUnit, toUnit, factors);
  return numeric * factor;
}

function convertPascalToSessionUnit(correctionPascal, unitMode) {
  const mode = normalizeUnit(unitMode);
  if (mode === 'PA') return Number(correctionPascal);
  if (mode === 'BAR') return Number(correctionPascal) * 0.00001;
  if (mode === 'MPA') return Number(correctionPascal) * 0.000001;
  return Number(correctionPascal);
}

module.exports = {
  DEFAULT_FACTORS,
  normalizeUnit,
  normalizeFactorRows,
  getConversionFactor,
  convertPressure,
  convertPascalToSessionUnit,
};

