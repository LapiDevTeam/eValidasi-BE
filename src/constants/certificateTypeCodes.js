'use strict';

/**
 * certificateTypeCodes.js
 *
 * Sumber kebenaran tunggal untuk KODE PARAMETER pada nomor sertifikat kalibrasi.
 * Acuan: "Nomor sertifikat berdasarkan tipe kalibrasi" (LAPI Labs).
 * Setiap kali nomor sertifikat di-generate otomatis, kode huruf harus mengikuti
 * tabel ini — nomor diterbitkan oleh fungsi SQL dbo.fnGetKal_Ser_<KODE>_No_ID().
 *
 * CATATAN: kode huruf di sini dipakai untuk menyusun nama fungsi SQL. Jangan
 * pernah menyusun nama fungsi dari input mentah — selalu lewat resolver di
 * bawah yang sudah ter-whitelist.
 */

// Parameter_Sertifikasi (apa adanya di tabel kalibrasi) -> kode huruf.
const PARAMETER_TO_CODE = Object.freeze({
  Timbangan: 'M',
  'Timbangan (Massa)': 'M',
  'Anak Timbangan': 'AT',
  Tekanan: 'P',
  Volume: 'V',
  Dimensi: 'D',
  Timer: 'R',
  Thermohygrometer: 'L',
  Temperatur: 'T',
  Enclosures: 'E',
  'Dissolution Tester': 'DT',
  'Disintegration Tester': 'DS',
  'Friability Tester': 'FT',
  'Moisture Analyzer': 'MA',
  RPM: 'RP',
  'pH, Redoks, dan Conductivity': 'H',
  'PH, redoks dan conductivity': 'H',
  'Indikator Suhu dan Simulasi Kelistrikan': 'TC',
  'Indikator suhu dan simulasi kelistrikan': 'TC',
  Torque: 'TQ',
  'Hardness Tester': 'HT',
  'Melting Point': 'MP',
  'Leak Tester': 'LT',
  'Leak Test': 'LT',
  'Leak Tester / Alat tes kebocoran': 'LT',
  'Alat tes kebocoran': 'LT',
  'Tapped Volumeter': 'TV',
  'Lain-Lain': 'Z',
  'Lain-lain': 'Z',
});

// Kode yang BENAR-BENAR punya fungsi generator nomor di DB (dbo.fnGetKal_Ser_<KODE>_No_ID).
// Tambahkan kode di sini hanya kalau fungsi SQL-nya sudah ada.
const GENERATOR_AVAILABLE_CODES = Object.freeze([
  'M',
  'AT',
  'P',
  'V',
  'D',
  'R',
  'L',
  'T',
  'E',
  'DT',
  'DS',
  'FT',
  'MA',
  'RP',
  'H',
  'TC',
  'TQ',
  'HT',
  'MP',
  'LT',
  'TV',
  'Z',
]);

/**
 * Ambil kode huruf untuk sebuah Parameter_Sertifikasi.
 * @param {string} parameter - mis. "Timer", "Timbangan", "Tekanan"
 * @returns {string|null} kode huruf, atau null bila tidak dikenal
 */
function getCertificateTypeCode(parameter) {
  const key = String(parameter || '').trim();
  if (!key) return null;
  if (PARAMETER_TO_CODE[key]) return PARAMETER_TO_CODE[key];
  // toleransi beda kapitalisasi
  const found = Object.keys(PARAMETER_TO_CODE).find(
    (k) => k.toLowerCase() === key.toLowerCase()
  );
  return found ? PARAMETER_TO_CODE[found] : null;
}

/**
 * Pastikan sebuah kode aman dipakai untuk menyusun nama fungsi SQL.
 * @param {string} code
 * @returns {boolean}
 */
function hasCertificateGenerator(code) {
  return GENERATOR_AVAILABLE_CODES.includes(String(code || '').toUpperCase());
}

module.exports = {
  PARAMETER_TO_CODE,
  GENERATOR_AVAILABLE_CODES,
  getCertificateTypeCode,
  hasCertificateGenerator,
};
