'use strict';

const DEFAULT_DECIMAL_PLACES = 3;
const DOT_DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

const RESULT_NUMERIC_KEYS = new Set([
  'pembacaan_alat',
  'pembacaan_standar',
  'pembacaanstandar',
  'nilai_standar',
  'nilai_error',
  'error',
  'ketidakpastian',
  'ketidakpastian_menit',
  'ketidakpastian_detik',
  'pembacaan_alat_sec',
  'pembacaan_standar_sec',
  'error_sec',
  'titik_ukur',
  'setting',
  'setting_alat',
  'time',
  'rpm',
  'nominal',
  'min',
  'max',
  'shaftwobble',
  'basketswobble',
  'basketwobble',
  'paddlewobble',
  'rotspd1',
  'rotspd2',
  'rotspd3',
  'basket',
  'paddle',
  'tempvessel',
  't_1_kayuhan_detik',
  'kayuhan_per_menit',
  'distance_mm',
  'avg_std',
  'avg_uut',
  'avg_error',
  'u_expanded',
  'u_combined',
  'standard',
  'uut',
  'uncertainty',
]);

function normalizeKey(key) {
  return String(key || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .toLowerCase();
}

function roundToMaxDecimals(value, decimals = DEFAULT_DECIMAL_PLACES) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;

  const factor = 10 ** decimals;
  const rounded = Math.round((number + Number.EPSILON) * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function parseDotDecimal(value) {
  if (value === undefined || value === null || value === '') return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? roundToMaxDecimals(value) : null;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text || text.includes(',') || !DOT_DECIMAL_PATTERN.test(text)) {
      return null;
    }
    return roundToMaxDecimals(Number(text));
  }

  const number = Number(value);
  return Number.isFinite(number) ? roundToMaxDecimals(number) : null;
}

function roundNumericForDisplay(value) {
  if (value === undefined || value === null || value === '') return value;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? roundToMaxDecimals(value) : value;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text || text.includes(',') || !DOT_DECIMAL_PATTERN.test(text)) {
      return value;
    }
    return roundToMaxDecimals(Number(text));
  }

  return value;
}

function formatFixedNumericForDisplay(value) {
  if (value === undefined || value === null || value === '') return value;

  const numeric =
    typeof value === 'number'
      ? value
      : Number(String(value).trim().replace(',', '.'));

  if (!Number.isFinite(numeric)) return value;

  const zeroThreshold = 0.5 * 10 ** -DEFAULT_DECIMAL_PLACES;
  const safeNumeric = Math.abs(numeric) < zeroThreshold ? 0 : numeric;
  const fixed = safeNumeric.toFixed(DEFAULT_DECIMAL_PLACES);
  return fixed === '-0.000' ? '0.000' : fixed;
}

function normalizeCalculationNumbers(value) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? roundToMaxDecimals(value) : value;
  }
  if (typeof value === 'string') {
    const rounded = roundNumericForDisplay(value);
    return typeof rounded === 'number' ? rounded : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeCalculationNumbers(item));
  }
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeCalculationNumbers(item)])
    );
  }
  return value;
}

function formatResultRow(row) {
  if (!row || typeof row !== 'object') return row;

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      const normalizedKey = normalizeKey(key);
      const shouldFormat = RESULT_NUMERIC_KEYS.has(normalizedKey);
      return [key, shouldFormat ? formatFixedNumericForDisplay(value) : value];
    })
  );
}

function formatResultRows(rows) {
  return Array.isArray(rows) ? rows.map(formatResultRow) : [];
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function cleanPollutedParam(value) {
  let text = safeDecode(String(value || '').trim());
  if (!text) return '';

  const delimiterIndex = text.search(/[)\]\[?&#]/);
  if (delimiterIndex >= 0) text = text.slice(0, delimiterIndex);

  const slashIndex = text.indexOf('/');
  if (slashIndex >= 0) text = text.slice(0, slashIndex);

  return text.trim();
}

function extractNestedParamValues(value, paramName) {
  const text = safeDecode(String(value || '').trim());
  if (!text) return [];

  const fragments = [];
  const queryIndex = text.indexOf('?');
  const paramIndex = text.indexOf(`${paramName}=`);

  if (queryIndex >= 0) fragments.push(text.slice(queryIndex + 1));
  if (paramIndex >= 0) fragments.push(text.slice(paramIndex));

  const values = [];
  for (const fragment of fragments) {
    try {
      const params = new URLSearchParams(fragment);
      values.push(...params.getAll(paramName));
    } catch {
      // Ignore malformed nested query fragments.
    }
  }

  return values;
}

function normalizeQueryParam(value, paramName) {
  const rawValues = Array.isArray(value) ? value : [value];
  const candidates = [];

  for (const rawValue of rawValues) {
    if (rawValue === undefined || rawValue === null) continue;
    const rawText = String(rawValue).trim();
    if (!rawText) continue;

    candidates.push(...extractNestedParamValues(rawText, paramName));
    candidates.push(cleanPollutedParam(rawText));
  }

  return candidates.map(cleanPollutedParam).filter(Boolean).pop() || '';
}

function normalizeCertificateQuery(query = {}) {
  return {
    qa_id: normalizeQueryParam(query.qa_id ?? query.qaId ?? query.QA_ID, 'qa_id'),
    id_no_sertifikat: normalizeQueryParam(
      query.id_no_sertifikat ?? query.idNoSertifikat ?? query.ID_No_Sertifikat,
      'id_no_sertifikat'
    ),
  };
}

module.exports = {
  formatResultRow,
  formatResultRows,
  normalizeCalculationNumbers,
  normalizeCertificateQuery,
  parseDotDecimal,
  roundNumericForDisplay,
  roundToMaxDecimals,
};
