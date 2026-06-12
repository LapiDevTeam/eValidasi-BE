'use strict';

const PROFILE_IEG = 'IEG';
const PROFILE_HASIL_TEMPLATE = 'HASIL_TEMPLATE';

const PA_TEMPLATE_POINTS = [0, 10, 20, 30, 40, 50, 60];
const BAR_TEMPLATE_POINTS = [0, 2, 4, 6, 8, 10];

function toUpper(value) {
  return String(value || '').trim().toUpperCase();
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function isSameTemplate(values, template, tolerance = 1e-9) {
  if (!Array.isArray(values) || values.length !== template.length) return false;
  for (let i = 0; i < template.length; i += 1) {
    if (Math.abs(values[i] - template[i]) > tolerance) return false;
  }
  return true;
}

function resolveWorkbookProfile(session, points = []) {
  const explicit = toUpper(
    session?.workbook_profile
      || session?.formula_profile
      || session?.worksheet_profile
      || session?.calculation_profile
  );
  if (explicit.includes('HASIL')) return PROFILE_HASIL_TEMPLATE;
  if (explicit.includes('IEG')) return PROFILE_IEG;

  const text = [
    session?.session_code,
    session?.instrument_code,
    session?.instrument_name,
    session?.notes,
  ]
    .map(toUpper)
    .join(' ');

  if (/\bHASIL\b/.test(text)) return PROFILE_HASIL_TEMPLATE;
  if (/\bIEG\b/.test(text)) return PROFILE_IEG;

  const pointValues = (points || [])
    .map((point) => toNumberOrNull(point?.nominal_value))
    .filter((value) => value !== null);

  if (pointValues.some((value) => value < 0)) return PROFILE_IEG;

  if (
    isSameTemplate(pointValues, PA_TEMPLATE_POINTS)
    || isSameTemplate(pointValues, BAR_TEMPLATE_POINTS)
  ) {
    return PROFILE_HASIL_TEMPLATE;
  }

  return PROFILE_IEG;
}

module.exports = {
  PROFILE_IEG,
  PROFILE_HASIL_TEMPLATE,
  resolveWorkbookProfile,
};

