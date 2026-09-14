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

/**
 * Tebakan profil dari bentuk titik nominal saja.
 *
 * Dipakai HANYA sebagai fallback kalau sesi belum punya workbook_profile
 * eksplisit (mis. dibuat lewat API lama). Logika ini di-mirror di FE
 * (CalibrationWorkbookPage → deriveWorkbookProfile) supaya profil yang
 * ditampilkan sebagai "Otomatis" sama dengan yang dipakai BE saat menghitung.
 */
function resolveProfileFromPoints(points = []) {
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

/**
 * Profil menentukan BESARAN MANA yang dilaporkan, bukan "sheet mana" atau
 * "alat apa". Judul kolom di workbook menyebutnya sendiri, dan keduanya besaran
 * yang sama dengan tanda berlawanan (Koreksi = -Error):
 *
 *   HASIL_TEMPLATE -> kolom "Error"   = UUT - Standar
 *                     sheet LOW PRESSURE & IEG 510; beda level acuan = 0
 *   IEG            -> kolom "Koreksi" = Standar - UUT
 *                     sheet IEG 241 & IEG 281; beda level acuan dipakai
 *
 * PENTING: nama profil "IEG" menyesatkan, dipertahankan hanya demi data lama.
 * Alat IEG 510 punya sheet sendiri ("TEKANAN IEG.xls" -> sheet "IEG 510") yang
 * justru memakai konvensi Error: D38 = C38 - B38 dengan header kolom "Error",
 * dan M38 = K38 - J38 + L38. Sudah diverifikasi angka per angka.
 *
 * Karena itu profil TIDAK BISA ditebak:
 *   - dari nama alat  -> IEG 510 ber-nama IEG tapi konvensinya Error;
 *   - dari pola titik -> IEG 510 memakai titik 0/50/100/150/200 yang tidak
 *                        cocok template Pa maupun Bar, jadi fallback pola titik
 *                        di resolveProfileFromPoints() pun memilih IEG (salah).
 *
 * Sumber kebenarannya adalah kolom eksplisit calibration_sessions.workbook_profile
 * yang dipilih user di FE. Fallback pola titik hanya untuk sesi lama yang
 * kolomnya masih NULL, dan memang bisa salah — itu sebabnya dropdown-nya wajib.
 *
 * Versi lama menebak profil dari teks session_code/instrument_code/instrument_name
 * dengan regex /\bIEG\b/. Itu dibuang: nama alat bukan indikator konvensi.
 */
function resolveWorkbookProfile(session, points = []) {
  const explicit = toUpper(
    session?.workbook_profile
      || session?.formula_profile
      || session?.worksheet_profile
      || session?.calculation_profile
  );
  if (explicit.includes('HASIL')) return PROFILE_HASIL_TEMPLATE;
  if (explicit.includes('IEG')) return PROFILE_IEG;

  return resolveProfileFromPoints(points);
}

module.exports = {
  PROFILE_IEG,
  PROFILE_HASIL_TEMPLATE,
  PA_TEMPLATE_POINTS,
  BAR_TEMPLATE_POINTS,
  resolveProfileFromPoints,
  resolveWorkbookProfile,
};

