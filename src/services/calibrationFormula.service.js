'use strict';

const { convertPascalToSessionUnit } = require('./pressureConversion.service');

const CYCLE_DIRECTION_MAP = {
  X1: 'INCREASING',
  X2: 'DECREASING',
  X3: 'INCREASING',
  X4: 'DECREASING',
  X5: 'INCREASING',
  X6: 'DECREASING',
};

const INCREASING_CYCLES = new Set(['X1', 'X3', 'X5']);
const DECREASING_CYCLES = new Set(['X2', 'X4', 'X6']);
const ERROR_CONVENTION_STD_MINUS_UUT = 'STD_MINUS_UUT';
const ERROR_CONVENTION_UUT_MINUS_STD = 'UUT_MINUS_STD';

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function average(values = []) {
  const valid = values
    .map(toNumberOrNull)
    .filter((value) => value !== null);

  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function inferDirectionByCycle(cycleCode) {
  const code = String(cycleCode || '').toUpperCase();
  return CYCLE_DIRECTION_MAP[code] || null;
}

function normalizeDirection(direction, cycleCode) {
  const explicit = String(direction || '').trim().toUpperCase();
  if (explicit === 'INCREASING' || explicit === 'DECREASING') return explicit;
  return inferDirectionByCycle(cycleCode);
}

function correctStandardReading(rawStandardReading, xVariable, intercept) {
  const raw = toNumberOrNull(rawStandardReading);
  const x = toNumberOrNull(xVariable);
  const b = toNumberOrNull(intercept);

  if (raw === null || x === null || b === null) return null;
  return raw * x + b;
}

function calculateErrorValue(standardValue, uutValue, convention) {
  const std = toNumberOrNull(standardValue);
  const uut = toNumberOrNull(uutValue);
  if (std === null || uut === null) return null;

  const normalizedConvention = String(convention || ERROR_CONVENTION_STD_MINUS_UUT).toUpperCase();
  if (normalizedConvention === ERROR_CONVENTION_UUT_MINUS_STD) {
    return uut - std;
  }
  return std - uut;
}

function groupReadingsByDirection(rows = []) {
  const increasing = [];
  const decreasing = [];

  for (const row of rows) {
    const cycle = String(row.cycle_code || row.cycleCode || '').toUpperCase();
    const direction = normalizeDirection(row.direction, cycle);
    const normalized = {
      ...row,
      cycle_code: cycle,
      direction,
      uut_reading: toNumberOrNull(row.uut_reading ?? row.uutReading),
      corrected_standard_reading: toNumberOrNull(
        row.corrected_standard_reading ?? row.correctedStandardReading
      ),
    };

    if (direction === 'INCREASING' || INCREASING_CYCLES.has(cycle)) {
      increasing.push(normalized);
    } else if (direction === 'DECREASING' || DECREASING_CYCLES.has(cycle)) {
      decreasing.push(normalized);
    }
  }

  return { increasing, decreasing };
}

function buildCycleValueMap(rows = []) {
  const map = {};
  for (const row of rows) {
    const cycle = String(row.cycle_code || row.cycleCode || '').toUpperCase();
    if (!cycle) continue;
    map[cycle] = {
      uut: toNumberOrNull(row.uut_reading ?? row.uutReading),
      std: toNumberOrNull(
        row.corrected_standard_reading ?? row.correctedStandardReading
      ),
    };
  }
  return map;
}

function calculateRepeatability(rows = [], zeroPointRows = []) {
  const pointMap = buildCycleValueMap(rows);
  const zeroMap = buildCycleValueMap(zeroPointRows);

  const pX1Uut = pointMap.X1?.uut;
  const pX1Std = pointMap.X1?.std;
  const pX2Uut = pointMap.X2?.uut;
  const pX2Std = pointMap.X2?.std;
  const pX3Uut = pointMap.X3?.uut;
  const pX3Std = pointMap.X3?.std;
  const pX4Uut = pointMap.X4?.uut;
  const pX4Std = pointMap.X4?.std;

  const zX1Uut = zeroMap.X1?.uut;
  const zX1Std = zeroMap.X1?.std;
  const zX3Uut = zeroMap.X3?.uut;
  const zX3Std = zeroMap.X3?.std;

  const workbookTerms = [];
  if (
    [pX3Uut, zX3Uut, pX1Uut, zX1Uut, pX3Std, zX3Std, pX1Std, zX1Std]
      .every((value) => value !== null)
  ) {
    workbookTerms.push(
      Math.abs(
        (pX3Uut - zX3Uut)
        - (pX1Uut - zX1Uut)
        - (pX3Std - zX3Std)
        + (pX1Std - zX1Std)
      )
    );
  }

  if (
    [pX4Uut, zX3Uut, pX2Uut, zX1Uut, pX4Std, zX3Std, pX2Std, zX1Std]
      .every((value) => value !== null)
  ) {
    workbookTerms.push(
      Math.abs(
        (pX4Uut - zX3Uut)
        - (pX2Uut - zX1Uut)
        - (pX4Std - zX3Std)
        + (pX2Std - zX1Std)
      )
    );
  }

  if (workbookTerms.length > 0) {
    return Math.max(...workbookTerms);
  }

  // Fallback: max-min valid UUT values.
  const uutValues = rows
    .map((row) => toNumberOrNull(row.uut_reading ?? row.uutReading))
    .filter((value) => value !== null);

  if (!uutValues.length) return null;
  return Math.max(...uutValues) - Math.min(...uutValues);
}

function calculateZeroDeviationFromWorkbookLogic(zeroPointRows = []) {
  const zeroMap = buildCycleValueMap(zeroPointRows);

  const x1Uut = zeroMap.X1?.uut;
  const x1Std = zeroMap.X1?.std;
  const x2Uut = zeroMap.X2?.uut;
  const x2Std = zeroMap.X2?.std;
  const x3Uut = zeroMap.X3?.uut;
  const x3Std = zeroMap.X3?.std;
  const x4Uut = zeroMap.X4?.uut;
  const x4Std = zeroMap.X4?.std;
  const x5Uut = zeroMap.X5?.uut;
  const x5Std = zeroMap.X5?.std;
  const x6Uut = zeroMap.X6?.uut;
  const x6Std = zeroMap.X6?.std;

  const terms = [];

  if ([x2Uut, x1Uut, x2Std, x1Std].every((value) => value !== null)) {
    terms.push(Math.abs((x2Uut - x1Uut) - (x2Std - x1Std)));
  }
  if ([x4Uut, x3Uut, x4Std, x3Std].every((value) => value !== null)) {
    terms.push(Math.abs((x4Uut - x3Uut) - (x4Std - x3Std)));
  }
  if ([x6Uut, x5Uut, x6Std, x5Std].every((value) => value !== null)) {
    terms.push(Math.abs((x6Uut - x5Uut) - (x6Std - x5Std)));
  }

  if (!terms.length) return null;
  return Math.max(...terms);
}

function calculateZeroDeviation(pointRows = [], zeroPointRows = []) {
  const fromZeroPoint = calculateZeroDeviationFromWorkbookLogic(zeroPointRows);
  if (fromZeroPoint !== null) return fromZeroPoint;

  // TODO: map to exact workbook formula per sheet variant if required.
  return calculateZeroDeviationFromWorkbookLogic(pointRows);
}

function calculateLevelCorrection({
  delta_h,
  media_density,
  gravity,
  unit_mode,
}) {
  const deltaH = toNumberOrNull(delta_h) ?? 0.02;
  const density = toNumberOrNull(media_density) ?? 1.2;
  const g = toNumberOrNull(gravity) ?? 9.78;

  const correctionPascal = deltaH * density * g;
  const correctionSessionUnit = convertPascalToSessionUnit(correctionPascal, unit_mode);

  return {
    correction_pascal: correctionPascal,
    correction_session_unit: correctionSessionUnit,
  };
}

function calculatePointResult({
  point,
  correctedReadings = [],
  levelCorrection = 0,
  zeroPointReadings = [],
  errorConvention = ERROR_CONVENTION_STD_MINUS_UUT,
}) {
  const grouped = groupReadingsByDirection(correctedReadings);

  const incStandardAvg = average(
    grouped.increasing.map((row) => row.corrected_standard_reading)
  );
  const incUutAvg = average(grouped.increasing.map((row) => row.uut_reading));
  const incError = calculateErrorValue(incStandardAvg, incUutAvg, errorConvention);

  const decStandardAvg = average(
    grouped.decreasing.map((row) => row.corrected_standard_reading)
  );
  const decUutAvg = average(grouped.decreasing.map((row) => row.uut_reading));
  const decError = calculateErrorValue(decStandardAvg, decUutAvg, errorConvention);

  const meanStandard = average([incStandardAvg, decStandardAvg]);
  const meanUut = average([incUutAvg, decUutAvg]);

  const finalBaseError = calculateErrorValue(meanStandard, meanUut, errorConvention);
  const finalError =
    finalBaseError === null
      ? null
      : finalBaseError + (toNumberOrNull(levelCorrection) || 0);

  const repeatability = calculateRepeatability(correctedReadings, zeroPointReadings);
  const zeroDeviation = calculateZeroDeviation(correctedReadings, zeroPointReadings);

  return {
    point_id: point.point_id,
    point_order: point.point_order,
    nominal_value: toNumberOrNull(point.nominal_value),
    unit: point.unit,
    inc_standard_avg: incStandardAvg,
    inc_uut_avg: incUutAvg,
    inc_error: incError,
    dec_standard_avg: decStandardAvg,
    dec_uut_avg: decUutAvg,
    dec_error: decError,
    repeatability,
    zero_deviation: zeroDeviation,
    mean_standard: meanStandard,
    mean_uut: meanUut,
    level_correction: toNumberOrNull(levelCorrection),
    final_error: finalError,
  };
}

module.exports = {
  CYCLE_DIRECTION_MAP,
  INCREASING_CYCLES,
  DECREASING_CYCLES,
  ERROR_CONVENTION_STD_MINUS_UUT,
  ERROR_CONVENTION_UUT_MINUS_STD,
  average,
  inferDirectionByCycle,
  normalizeDirection,
  correctStandardReading,
  calculateErrorValue,
  groupReadingsByDirection,
  calculatePointResult,
  calculateRepeatability,
  calculateZeroDeviationFromWorkbookLogic,
  calculateZeroDeviation,
  calculateLevelCorrection,
};
