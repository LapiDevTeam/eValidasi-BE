'use strict';

const COVERAGE_FACTOR = 2;
const REPEATABILITY_DIVISOR = Math.sqrt(5);
const DIGITAL_DIVISOR = 2 * Math.sqrt(3);
const ANALOG_DIVISOR = Math.sqrt(6);
const CERT_DIVISOR = 2;

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

// Reading dianggap blank bila standard & uut dua-duanya kosong/nol
// (mirror Excel: baris kosong tidak ikut AVERAGE/STDEV — preseden timerFormula.isBlankReading)
function isBlankReading(row = {}) {
  return toNumber(row.standard_value) === 0 && toNumber(row.uut_value) === 0;
}

// Titik ukur blank bila tidak punya reading sama sekali atau semua reading-nya blank
function isBlankPoint(point = {}) {
  const readings = point.readings || [];
  if (!readings.length) return true;
  return readings.every((row) => isBlankReading(row));
}

function computePoint(point = {}) {
  const correction = toNumber(point.correction);
  const readings = (point.readings || []).map((row, index) => {
    const standard = toNumber(row.standard_value) + correction;
    const uut = toNumber(row.uut_value);
    return {
      sequence_no: row.sequence_no || index + 1,
      standard,
      uut,
      error: uut - standard,
    };
  });
  const errors = readings.map((row) => row.error);
  const sd = stdev(errors);
  const uRepeatability = sd / REPEATABILITY_DIVISOR;
  const uDigital = toNumber(point.digital_resolution) / DIGITAL_DIVISOR;
  const uAnalog = toNumber(point.analog_resolution) / ANALOG_DIVISOR;
  const uCertificate = toNumber(point.uc) / CERT_DIVISOR;
  const uCombined = Math.sqrt(
    uRepeatability ** 2
    + uDigital ** 2
    + uAnalog ** 2
    + uCertificate ** 2
  );
  const uExpanded = uCombined * COVERAGE_FACTOR;
  const meanError = mean(errors);
  const tolerance = toNumber(point.tolerance);
  const pass = tolerance ? Math.abs(meanError) + uExpanded <= tolerance : null;

  return {
    point_no: point.point_no,
    nominal_value: toNumber(point.nominal_value),
    readings,
    mean_standard: mean(readings.map((row) => row.standard)),
    mean_uut: mean(readings.map((row) => row.uut)),
    mean_error: meanError,
    sd,
    u_repeatability: uRepeatability,
    u_digital: uDigital,
    u_analog: uAnalog,
    u_certificate: uCertificate,
    u_combined: uCombined,
    u_expanded: uExpanded,
    tolerance: tolerance || null,
    pass,
  };
}

function computeWorkbook(input = {}) {
  // Titik ukur blank (tidak terpakai) dilewati total: tidak menghasilkan baris hasil,
  // tidak mempengaruhi max_u_expanded maupun kesimpulan (revisi LMS RPM Rev 01)
  const points = (input.points || [])
    .filter((point) => !isBlankPoint(point))
    .map((point, index) => computePoint({
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
  mean,
  stdev,
  isBlankReading,
  isBlankPoint,
  computePoint,
  computeWorkbook,
};
