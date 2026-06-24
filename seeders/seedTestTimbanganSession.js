'use strict';

/**
 * seedTestTimbanganSession.js
 *
 * Seeds a COMPLETE, fully-calculated, PASSING ("LAYAK DIGUNAKAN") example
 * session for the Timbangan (electronic balance) calibration module.
 *
 * It drives the real service layer end-to-end, exactly like the UI does:
 *   timbanganCalculation.createSession   -> timbangan_sessions
 *   timbanganCalculation.saveWorkbook    -> preadjust / repeatability / points
 *                                           + point_standards / eccentricity
 *   timbanganCalculation.calculate       -> timbangan_results + _result_summary
 *
 * Because it calls calculate(), the persisted results/summary are guaranteed to
 * match the live application math (no hand-copied numbers that can drift).
 *
 * DATA SOURCE — TIMBANGAN.xls (Timbangan Elektronik Avery Weight, "TM 131"):
 *   Identity, anak-timbangan (AT) combinations per point, repeatability and the
 *   raw UUT readings are taken verbatim from the workbook's "INPUT FORM" sheet
 *   and cross-checked against "HASIL  EVALUASI".
 *
 *   ONE deliberate change vs the raw workbook: resolusi = 0.01 kg (matching the
 *   certificate identity "30 kg / 0.01 kg" printed on the sheet) instead of the
 *   stale header cell F2 = 0.001 kg. With resolusi 0.001 the workbook's own
 *   tolerance (resolusi x 5 = 0.005 kg) is exceeded by the real errors (up to
 *   ~0.020 kg) and the sheet concludes "Penggunaan Faktor Koreksi" (FAIL). Using
 *   the certified 0.01 kg resolusi -> tolerance 0.05 kg, all points pass, so this
 *   becomes a clean OK example (decision logged with Michael, 2026-06-22).
 *
 * IDEMPOTENT: re-running deletes the previous seed session (matched by
 * session_code) and rebuilds it.
 *
 * Run:
 *   npm run seed:test-timbangan-session
 */

require('dotenv').config();
const sql = require('mssql');
const repo = require('../repositories/timbangan-calibration.repository');
const calc = require('../src/services/timbanganCalculation.service');

const SESSION_CODE = 'SEED-TM131-TIMBANGAN';

// AT master values (verbatim from TIMBANGAN.xls / timbangan_at_standards).
const AT = {
  24:  { konvensional_g: 1000.006,  uc_mg: 2 },
  25:  { konvensional_g: 2000.002,  uc_mg: 4 },
  26:  { konvensional_g: 2000.012,  uc_mg: 4 },
  27:  { konvensional_g: 5000.01,   uc_mg: 8 },
  28:  { konvensional_g: 10000.015, uc_mg: 16 },
  156: { konvensional_g: 20000,     uc_mg: 29 },
};

/** Build point standards: one row per AT id, repeating the point's UUT reading. */
function point(order, atIds, uutReading) {
  return {
    point_order: order,
    unit: 'kg',
    standards: atIds.map((id, i) => ({
      row_order: i + 1,
      at_no_id: String(id),
      konvensional_g: AT[id].konvensional_g,
      uc_mg: AT[id].uc_mg,
      uut_reading: uutReading,
      zero_reading: 0,
    })),
  };
}

const SESSION = {
  session_code: SESSION_CODE,
  instrument_id: 'TM 131',
  instrument_code: 'TM 131',
  instrument_name: 'Timbangan Elektronik Avery Weight',
  merk_tipe: 'Avery Weight',
  no_seri: '',
  kapasitas_ukur: 30,
  kapasitas_alat: 30,
  unit: 'kg',
  resolusi: 0.01,                       // see header note (certified 0.01 kg)
  kapasitas_resolusi: '30 kg / 0.01 kg',
  lokasi: '',
  calibration_date: '2025-10-10',       // INPUT FORM B2 "10.10.25"
  interval_bulan: '12',
  metode_kalibrasi: '',
  keterangan: 'Contoh sesi OK (seed) dari TIMBANGAN.xls. Resolusi disesuaikan ke 0.01 kg sesuai identitas sertifikat.',
  temperature: 22.7,                    // INPUT FORM B5
  humidity: 45.2,                       // INPUT FORM B6
  // std_* left blank: auto-derived from the AT master during calculate().
};

const WORKBOOK = {
  // I. Pre-adjustment (INPUT FORM R15-R16) — 25 kg load (AT 156 + AT 27).
  preadjust: [
    { row_order: 1, at_no_id: '156', konvensional_g: AT[156].konvensional_g, uut_reading: 24.99, zero_reading: 0 },
    { row_order: 2, at_no_id: '27',  konvensional_g: AT[27].konvensional_g,  uut_reading: 24.99, zero_reading: 0 },
  ],

  // II. Repeatability (INPUT FORM R26-R35) — 10 rows, 1/2 cap = 14.99, max cap = 29.98.
  repeatability: Array.from({ length: 10 }, (_, i) => ({
    row_no: i + 1,
    half_zero: 0, half_reading: 14.99,
    max_zero: 0,  max_reading: 29.98,
  })),

  // III. Measurement points (INPUT FORM "ERROR TERHADAP PEMBACAAN", R41-R84).
  points: [
    point(1,  [25, 24],       3.0001),
    point(2,  [27],           5),
    point(3,  [27, 25, 26],   8.99),
    point(4,  [28, 25],       11.99),
    point(5,  [28, 27],       14.99),
    point(6,  [28, 27, 25],   16.99),
    // Point 7: single AT (156) but two UUT readings 19.99 & 19.98 -> mean 19.985.
    {
      point_order: 7,
      unit: 'kg',
      standards: [
        { row_order: 1, at_no_id: '156', konvensional_g: AT[156].konvensional_g, uc_mg: AT[156].uc_mg, uut_reading: 19.99, zero_reading: 0 },
        { row_order: 2, at_no_id: null,  konvensional_g: 0, uc_mg: 0, uut_reading: 19.98, zero_reading: 0 },
      ],
    },
    point(8,  [156, 25, 26],  23.98),
    point(9,  [156, 27, 25],  26.98),
    point(10, [156, 28],      29.98),
  ],

  // IV. Eccentricity (INPUT FORM R96-R100) — center + 3 corners measured at 14.99
  // (workbook position 4 left blank, so it is omitted here).
  eccentricity: [
    { position: 0, baca1: 14.99, baca2: 14.99 },
    { position: 1, baca1: 14.99, baca2: 14.99 },
    { position: 2, baca1: 14.99, baca2: 14.99 },
    { position: 3, baca1: 14.99, baca2: 14.99 },
  ],

  // V. Hysteresis — not measured in the workbook ("-"), so left empty.
  hysteresis: [],
};

async function findExistingSessionId(sessionCode) {
  const pool = await repo.getPool();
  const result = await pool.request()
    .input('SessionCode', sql.VarChar(50), sessionCode)
    .query('SELECT session_id FROM [dbo].[timbangan_sessions] WHERE session_code = @SessionCode');
  return result.recordset[0]?.session_id || null;
}

async function seed() {
  try {
    const existingId = await findExistingSessionId(SESSION_CODE);
    if (existingId) {
      console.log(`[seed] Existing seed session ${existingId} found — deleting before rebuild.`);
      await repo.deleteSessionGraph(existingId);
    }

    const { sessionId } = await calc.createSession(SESSION, 'SEEDER');
    console.log(`[seed] Created timbangan session_id=${sessionId}`);

    const counts = await calc.saveWorkbook(sessionId, WORKBOOK);
    console.log('[seed] Saved workbook:', counts);

    const result = await calc.calculate(sessionId, 'SEEDER');
    console.log(`[seed] Calculated. conclusion="${result.conclusion}", maxExpanded=${result.maxExpanded.toFixed(6)} kg`);

    const failing = result.points.filter((p) => p.pass_flag === false);
    console.log('');
    console.log('[seed] Per-point summary (error ± U_expanded vs tolerance):');
    result.points.forEach((p) => {
      console.log(
        `[seed]   pt${p.point_order}  konv=${Number(p.konv_mass).toFixed(6)}  reading=${Number(p.reading).toFixed(4)}  ` +
        `error=${Number(p.error).toFixed(6)}  U=±${Number(p.u_expanded).toFixed(6)}  tol=±${Number(p.tolerance).toFixed(3)}  ` +
        `${p.pass_flag ? 'PASS' : 'FAIL'}`
      );
    });

    if (result.conclusion !== 'LAYAK DIGUNAKAN' || failing.length) {
      console.error(`[seed] WARNING: expected an OK (LAYAK DIGUNAKAN) session but got "${result.conclusion}" with ${failing.length} failing point(s).`);
      process.exitCode = 1;
    } else {
      console.log('');
      console.log(`[seed] ✔ OK example ready — session_id=${sessionId} (status CALCULATED, conclusion LAYAK DIGUNAKAN)`);
    }
  } catch (err) {
    console.error('[seed] ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    try { await (await repo.getPool()).close(); } catch (_) { /* ignore */ }
  }
}

seed();
