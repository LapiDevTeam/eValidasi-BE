'use strict';

/**
 * tappedVolumeterFormula.service.js
 *
 * Port cell-for-cell dari workbook "TAPPED VOLUMETER..xlsx" (sheet tunggal).
 * Hanya matematika murni — tidak menyentuh DB / IO.
 *
 * Model 1 setting (mis. baris 42-48 untuk setting 25, baris 51-57 untuk setting 50):
 *   B = Jumlah Ketukan
 *   C = Waktu (detik)                         -> input lapangan
 *   G = Error STD (detik)                      -> 1 nilai per setting (G43, G52)
 *   D = C + Error STD                          -> kolom "Waktu + Error STD" (informasional)
 *   E = B / (C/60)                             -> Jumlah Ketukan/menit  (memakai C MENTAH, bukan D)
 *   F = IF(AND(E>=235, E<=265.5), "MS", "TMS") -> status memenuhi/tidak memenuhi syarat
 *
 * Baris "Rata-rata":
 *   B_avg = AVERAGE(B), C_avg = AVERAGE(C), D_avg = AVERAGE(D), E_avg = AVERAGE(E)
 *   F_avg = IF(AND(E_avg>=235, E_avg<=265.5), "MS","TMS")
 *
 * PENTING (jebakan parity): E_avg = AVERAGE(E) per baris, BUKAN B_avg/(C_avg/60).
 * Keduanya berbeda. Mengikuti E48/E57 = AVERAGE(E43:E47)/AVERAGE(E52:E56).
 */

// Acuan toleransi workbook: 250 ± 15 ketukan/menit (235 - 265 ketukan/menit).
// Batas atas pada formula F adalah 265.5 (bukan 265 seperti teks toleransi).
const DEFAULT_NOMINAL_TARGET = 250;
const DEFAULT_LOWER_LIMIT = 235;
const DEFAULT_UPPER_LIMIT = 265.5;
const SECONDS_PER_MINUTE = 60;

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

// E = B / (C/60)  -> ketukan per menit, memakai waktu MENTAH (C), bukan D.
function ketukanPerMenit(jumlahKetukan, waktu) {
  const c = toNumber(waktu);
  if (c === 0) return 0;
  return toNumber(jumlahKetukan) / (c / SECONDS_PER_MINUTE);
}

// F: "MS" jika lower <= E <= upper, selain itu "TMS".
function msTms(value, lower, upper) {
  const e = toNumber(value);
  return e >= lower && e <= upper ? 'MS' : 'TMS';
}

function computeSetting(setting = {}, bounds = {}) {
  const lower = Number.isFinite(Number(bounds.lower)) ? Number(bounds.lower) : DEFAULT_LOWER_LIMIT;
  const upper = Number.isFinite(Number(bounds.upper)) ? Number(bounds.upper) : DEFAULT_UPPER_LIMIT;
  const errorStd = toNumber(setting.error_std);

  const readings = (setting.readings || []).map((row, index) => {
    const jumlahKetukan = toNumber(row.jumlah_ketukan);
    const waktu = toNumber(row.waktu);
    const waktuPlusError = waktu + errorStd; // D = C + Error STD
    const ketukan = ketukanPerMenit(jumlahKetukan, waktu); // E = B/(C/60)
    return {
      sequence_no: row.sequence_no || index + 1,
      jumlah_ketukan: jumlahKetukan,
      waktu,
      waktu_plus_error: waktuPlusError,
      ketukan_per_menit: ketukan,
      ms_tms: msTms(ketukan, lower, upper),
    };
  });

  const meanKetukanPerMenit = mean(readings.map((row) => row.ketukan_per_menit)); // AVERAGE(E)

  return {
    setting_no: setting.setting_no,
    setting_value: toNumber(setting.setting_value),
    error_std: errorStd,
    readings,
    mean_jumlah_ketukan: mean(readings.map((row) => row.jumlah_ketukan)),
    mean_waktu: mean(readings.map((row) => row.waktu)),
    mean_waktu_plus_error: mean(readings.map((row) => row.waktu_plus_error)),
    mean_ketukan_per_menit: meanKetukanPerMenit,
    ms_tms: msTms(meanKetukanPerMenit, lower, upper), // F dari rata-rata E
  };
}

function computeWorkbook(input = {}) {
  const nominalTarget = Number.isFinite(Number(input.nominal_target))
    ? Number(input.nominal_target)
    : DEFAULT_NOMINAL_TARGET;
  const lower = Number.isFinite(Number(input.lower_limit)) ? Number(input.lower_limit) : DEFAULT_LOWER_LIMIT;
  const upper = Number.isFinite(Number(input.upper_limit)) ? Number(input.upper_limit) : DEFAULT_UPPER_LIMIT;

  const settings = (input.settings || []).map((setting, index) => computeSetting({
    ...setting,
    setting_no: setting.setting_no || index + 1,
  }, { lower, upper }));

  const evaluated = settings.filter((setting) => setting.readings.length);
  const allMs = evaluated.length ? evaluated.every((setting) => setting.ms_tms === 'MS') : null;
  const conclusion = allMs === null ? null : (allMs ? 'MEMENUHI SYARAT' : 'TIDAK MEMENUHI SYARAT');

  return {
    nominal_target: nominalTarget,
    lower_limit: lower,
    upper_limit: upper,
    settings,
    all_ms: allMs,
    conclusion,
  };
}

module.exports = {
  DEFAULT_NOMINAL_TARGET,
  DEFAULT_LOWER_LIMIT,
  DEFAULT_UPPER_LIMIT,
  SECONDS_PER_MINUTE,
  toNumber,
  mean,
  ketukanPerMenit,
  msTms,
  computeSetting,
  computeWorkbook,
};
