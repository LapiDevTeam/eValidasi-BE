'use strict';

const COVERAGE_FACTOR = 2;
const REPEATABILITY_DIVISOR = Math.sqrt(10);
const DIGITAL_DIVISOR = 2 * Math.sqrt(3);
const ANALOG_DIVISOR = Math.sqrt(6);
const CERT_DIVISOR = 2;
const UNIFORMITY_DIVISOR = Math.sqrt(3);

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function mean(values) {
  const clean = values.map(toNumber).filter((value) => Number.isFinite(value));
  if (!clean.length) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function stdev(values) {
  const clean = values.map(toNumber).filter((value) => Number.isFinite(value));
  if (clean.length < 2) return 0;
  const avg = mean(clean);
  const sumSq = clean.reduce((sum, value) => sum + ((value - avg) * (value - avg)), 0);
  return Math.sqrt(sumSq / (clean.length - 1));
}

function computePoint(point = {}) {
  const correctionStandard = toNumber(point.correction_standard);
  const correctionMedia = toNumber(point.correction_media);
  const correctionUut = toNumber(point.correction_uut);
  const readings = (point.readings || []).map((row, index) => {
    const standardRaw = toNumber(row.standard_value);
    const uutRaw = toNumber(row.uut_value);
    const standard = standardRaw + correctionStandard + correctionMedia;
    const uut = uutRaw + correctionMedia + correctionUut;
    return {
      sequence_no: row.sequence_no || index + 1,
      standard_raw: standardRaw,
      uut_raw: uutRaw,
      standard,
      uut,
      // Error = UUT (alat) - Standar. Tanda ini harus sama dengan kolom Error
      // yang ditulis ke sertifikat, kalau tidak workbook dan sertifikat berlawanan tanda.
      error: uut - standard,
      input_error: uutRaw - standardRaw,
    };
  });
  const errors = readings.map((row) => row.error);
  const sd = stdev(errors);
  const uniformity = errors.length ? Math.max(...errors) - Math.min(...errors) : 0;
  const uRepeatability = sd / REPEATABILITY_DIVISOR;
  const uDigital = toNumber(point.digital_resolution) / DIGITAL_DIVISOR;
  const uAnalog = toNumber(point.analog_resolution) / ANALOG_DIVISOR;
  const uCertificate1 = toNumber(point.uc_1) / CERT_DIVISOR;
  const uCertificate2 = toNumber(point.uc_2) / CERT_DIVISOR;
  const uCertificate3 = toNumber(point.uc_3) / CERT_DIVISOR;
  const uUniformity = uniformity / UNIFORMITY_DIVISOR;
  const uCombined = Math.sqrt(
    uRepeatability ** 2
    + uDigital ** 2
    + uAnalog ** 2
    + uCertificate1 ** 2
    + uCertificate2 ** 2
    + uCertificate3 ** 2
    + uUniformity ** 2
  );
  const uExpanded = uCombined * COVERAGE_FACTOR;
  const meanError = mean(errors);
  const tolerance = toNumber(point.tolerance);
  const pass = tolerance ? Math.abs(meanError) + uExpanded <= tolerance : null;

  return {
    point_no: point.point_no,
    nominal_value: toNumber(point.nominal_value),
    correction_standard: correctionStandard,
    correction_media: correctionMedia,
    correction_uut: correctionUut,
    readings,
    mean_standard_raw: mean(readings.map((row) => row.standard_raw)),
    mean_uut_raw: mean(readings.map((row) => row.uut_raw)),
    mean_standard: mean(readings.map((row) => row.standard)),
    mean_uut: mean(readings.map((row) => row.uut)),
    mean_error: meanError,
    mean_input_error: mean(readings.map((row) => row.input_error)),
    sd,
    uniformity,
    u_repeatability: uRepeatability,
    u_digital: uDigital,
    u_analog: uAnalog,
    u_certificate_1: uCertificate1,
    u_certificate_2: uCertificate2,
    u_certificate_3: uCertificate3,
    u_uniformity: uUniformity,
    u_combined: uCombined,
    u_expanded: uExpanded,
    tolerance: tolerance || null,
    pass,
  };
}

function computeWorkbook(input = {}) {
  const points = (input.points || []).map((point, index) => computePoint({
    ...point,
    point_no: point.point_no || index + 1,
    tolerance: input.tolerance,
  }));
  const evaluated = points.filter((point) => point.pass !== null);
  const conclusion = evaluated.length
    ? (evaluated.every((point) => point.pass) ? 'LAYAK DIGUNAKAN' : 'TIDAK LAYAK DIGUNAKAN')
    : null;
  return {
    coverage_factor: COVERAGE_FACTOR,
    points,
    max_u_expanded: points.reduce((max, point) => Math.max(max, point.u_expanded || 0), 0),
    conclusion,
  };
}

module.exports = {
  COVERAGE_FACTOR,
  REPEATABILITY_DIVISOR,
  DIGITAL_DIVISOR,
  ANALOG_DIVISOR,
  CERT_DIVISOR,
  UNIFORMITY_DIVISOR,
  mean,
  stdev,
  computePoint,
  computeWorkbook,
};
