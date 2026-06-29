'use strict';

const COVERAGE_FACTOR = 2;
const STD_MS_DIVISOR = 1000;
const UUT_MS_DIVISOR = 100;
const DIGITAL_DIVISOR = 2 * Math.sqrt(3);
const ANALOG_DIVISOR = Math.sqrt(6);
const CERT_DIVISOR = 2;
const THREE_READING_DIVISOR = Math.sqrt(3);

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mean(values) {
  const clean = values.map(toNumber).filter((v) => Number.isFinite(v));
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function stdev(values) {
  const clean = values.map(toNumber).filter((v) => Number.isFinite(v));
  if (clean.length < 2) return 0;
  const avg = mean(clean);
  const sumSq = clean.reduce((sum, value) => sum + ((value - avg) * (value - avg)), 0);
  return Math.sqrt(sumSq / (clean.length - 1));
}

function toSeconds(parts, msDivisor, correction = 0) {
  return (
    toNumber(parts.jam) * 3600
    + toNumber(parts.menit) * 60
    + toNumber(parts.detik)
    + toNumber(parts.mdetik) / msDivisor
    + toNumber(correction)
  );
}

function isBlankTimerRow(row) {
  return [
    row.std_jam, row.std_menit, row.std_detik, row.std_mdetik,
    row.uut_jam, row.uut_menit, row.uut_detik, row.uut_mdetik,
  ].every((value) => value === null || value === undefined || value === '' || Number(value) === 0);
}

function computeTemperaturePoint({ setting = 37, standardRows = [], uutRows = [], correctionReadout = 0, correctionThermocouple = 0, digitalResolution = 0, analogResolution = 0, ucReadout = 0, ucThermocouple = 0 }) {
  const rows = [0, 1, 2].map((index) => {
    const standard = toNumber(standardRows[index]) + toNumber(correctionReadout) + toNumber(correctionThermocouple);
    const uut = toNumber(uutRows[index]);
    return { sequence_no: index + 1, standard, uut, error: uut - standard };
  });
  const errors = rows.map((row) => row.error);
  const sd = stdev(errors);
  const uniformity = errors.length ? Math.max(...errors) - Math.min(...errors) : 0;
  const uRepeatability = sd / THREE_READING_DIVISOR;
  const uDigital = toNumber(digitalResolution) / DIGITAL_DIVISOR;
  const uAnalog = toNumber(analogResolution) / ANALOG_DIVISOR;
  const uCertReadout = toNumber(ucReadout) / CERT_DIVISOR;
  const uCertThermocouple = toNumber(ucThermocouple) / CERT_DIVISOR;
  const uUniformity = uniformity / THREE_READING_DIVISOR;
  const uCombined = Math.sqrt(
    uRepeatability ** 2
    + uDigital ** 2
    + uAnalog ** 2
    + uCertReadout ** 2
    + uCertThermocouple ** 2
    + uUniformity ** 2
  );
  const uExpanded = uCombined * COVERAGE_FACTOR;
  return {
    setting: toNumber(setting),
    rows,
    mean_uut: mean(rows.map((row) => row.uut)),
    mean_standard: mean(rows.map((row) => row.standard)),
    mean_error: mean(errors),
    sd,
    uniformity,
    u_repeatability: uRepeatability,
    u_digital_res: uDigital,
    u_analog_res: uAnalog,
    u_cert_readout: uCertReadout,
    u_cert_thermocouple: uCertThermocouple,
    u_uniformity: uUniformity,
    u_combined: uCombined,
    u_expanded: uExpanded,
  };
}

function computeTemperature(input = {}) {
  const pointCount = Math.min(3, Math.max(1, Number(input.point_count) || 1));
  const points = [];
  for (let i = 0; i < pointCount; i += 1) {
    points.push(computeTemperaturePoint({
      setting: input.setting,
      standardRows: (input.standard_points || [])[i] || [],
      uutRows: (input.uut_points || [])[i] || [],
      correctionReadout: input.correction_readout,
      correctionThermocouple: input.correction_thermocouple,
      digitalResolution: input.digital_resolution,
      analogResolution: input.analog_resolution,
      ucReadout: input.uc_readout,
      ucThermocouple: input.uc_thermocouple,
    }));
  }
  return points;
}

function computeStrokeRate(rows = []) {
  const clean = rows.map((row, index) => ({
    sequence_no: row.sequence_no || index + 1,
    seconds_per_stroke: toNumber(row.seconds_per_stroke),
  })).filter((row) => row.seconds_per_stroke !== 0);
  const computedRows = clean.map((row) => ({
    ...row,
    strokes_per_minute: 60 / row.seconds_per_stroke,
  }));
  return {
    rows: computedRows,
    avg_seconds_per_stroke: mean(computedRows.map((row) => row.seconds_per_stroke)),
    sd_seconds_per_stroke: stdev(computedRows.map((row) => row.seconds_per_stroke)),
    avg_strokes_per_minute: mean(computedRows.map((row) => row.strokes_per_minute)),
    sd_strokes_per_minute: stdev(computedRows.map((row) => row.strokes_per_minute)),
  };
}

function computeDistance(rows = []) {
  const clean = rows.map((row, index) => ({
    sequence_no: row.sequence_no || index + 1,
    distance_mm: toNumber(row.distance_mm),
  })).filter((row) => row.distance_mm !== 0);
  return {
    rows: clean,
    avg_distance_mm: mean(clean.map((row) => row.distance_mm)),
  };
}

function computeTimerPoint({ nominal_value = 5, unit = 'Menit', correction_std = 0, uc_std = 0, digital_resolution = 0, analog_resolution = 0, readings = [] }) {
  const entered = readings.filter((row) => !isBlankTimerRow(row));
  const rows = entered.map((row, index) => {
    const standard_sec = toSeconds({
      jam: row.std_jam,
      menit: row.std_menit,
      detik: row.std_detik,
      mdetik: row.std_mdetik,
    }, STD_MS_DIVISOR, correction_std);
    const uut_sec = toSeconds({
      jam: row.uut_jam,
      menit: row.uut_menit,
      detik: row.uut_detik,
      mdetik: row.uut_mdetik,
    }, UUT_MS_DIVISOR, 0);
    return {
      sequence_no: row.sequence_no || index + 1,
      standard_sec,
      uut_sec,
      error_sec: uut_sec - standard_sec,
    };
  });
  const errors = rows.map((row) => row.error_sec);
  const sd = stdev(errors);
  const uRepeatability = sd / THREE_READING_DIVISOR;
  const uDigital = toNumber(digital_resolution) / DIGITAL_DIVISOR;
  const uAnalog = toNumber(analog_resolution) / ANALOG_DIVISOR;
  const uCertificate = toNumber(uc_std) / CERT_DIVISOR;
  const uCombined = Math.sqrt(uRepeatability ** 2 + uDigital ** 2 + uAnalog ** 2 + uCertificate ** 2);
  const uExpandedSec = uCombined * COVERAGE_FACTOR;
  return {
    nominal_value: toNumber(nominal_value),
    unit,
    rows,
    mean_standard_sec: mean(rows.map((row) => row.standard_sec)),
    mean_uut_sec: mean(rows.map((row) => row.uut_sec)),
    mean_error_sec: mean(errors),
    sd_sec: sd,
    u_repeatability: uRepeatability,
    u_digital_res: uDigital,
    u_analog_res: uAnalog,
    u_certificate: uCertificate,
    u_combined: uCombined,
    u_expanded_sec: uExpandedSec,
    u_expanded_menit: uExpandedSec / 60,
    u_expanded_jam: uExpandedSec / 3600,
  };
}

function evaluateTimerPoint(meanErrorSec, uExpandedSec, tolerance) {
  const tol = toNumber(tolerance);
  if (!tol) return { pass: null, lower: meanErrorSec - uExpandedSec, upper: meanErrorSec + uExpandedSec };
  const lower = meanErrorSec - uExpandedSec;
  const upper = meanErrorSec + uExpandedSec;
  return { pass: lower >= -tol && upper <= tol, lower, upper };
}

function deriveConclusion(results = []) {
  const evaluated = results.filter((row) => row.pass_flag !== null && row.pass_flag !== undefined);
  if (!evaluated.length) return null;
  return evaluated.every((row) => row.pass_flag) ? 'LAYAK DIGUNAKAN' : 'TIDAK LAYAK DIGUNAKAN';
}

module.exports = {
  COVERAGE_FACTOR,
  STD_MS_DIVISOR,
  UUT_MS_DIVISOR,
  mean,
  stdev,
  toSeconds,
  computeTemperature,
  computeTemperaturePoint,
  computeStrokeRate,
  computeDistance,
  computeTimerPoint,
  evaluateTimerPoint,
  deriveConclusion,
};
