'use strict';

/**
 * seedTestTimerSession.js
 *
 * Seeds a COMPLETE, fully-calculated, PASSING ("LAYAK DIGUNAKAN") example
 * session for the Timer (Stopwatch) calibration module.
 *
 * It drives the real service layer end-to-end, exactly like the UI does:
 *   timerCalculation.createSession  -> timer_sessions
 *   timerCalculation.saveWorkbook   -> timer_points + timer_readings
 *   timerCalculation.calculate      -> timer_results + timer_result_summary
 *
 * Because it calls calculate(), the persisted results/summary are guaranteed to
 * match the live application math.
 *
 * DATA: a realistic 3-point (6 / 60 / 300 s) digital-stopwatch calibration for
 * the "Stopwatch Casio HS-3" instrument already present in the system. No timer
 * reference workbook was supplied, so representative readings are used: the UUT
 * reads each nominal point while the time-base standard runs a few tenths of a
 * second faster (correction + small per-cycle scatter). All errors land well
 * inside the ±0.5 s tolerance, so the conclusion is OK.
 *
 * IDEMPOTENT: re-running deletes the previous seed session (matched by
 * session_code) and rebuilds it.
 *
 * Run:
 *   npm run seed:test-timer-session
 */

require('dotenv').config();
const sql = require('mssql');
const repo = require('../repositories/timer-calibration.repository');
const calc = require('../src/services/timerCalculation.service');

const SESSION_CODE = 'SEED-CASIO-TIMER';

// Per-cycle standard milli-second scatter (workbook divides std mDetik by 1000).
const STD_MS = [120, 90, 150, 110, 130, 100, 140, 95, 125, 105];

const SESSION = {
  session_code: SESSION_CODE,
  instrument_id: 'STW-HS3-001',
  instrument_code: 'STW-001',
  instrument_name: 'Stopwatch Casio HS-3',
  merk_tipe: 'Casio HS-3',
  no_seri: 'HS3-0001',
  kapasitas: '10 jam',
  resolusi: '0.01 detik',
  lokasi: 'Lab Kalibrasi',
  calibration_date: '2026-05-12',
  interval_bulan: '12',
  metode_kalibrasi: '',
  keterangan: 'Contoh sesi OK (seed) kalibrasi stopwatch digital, 3 titik ukur.',
  unit_mode: 'DETIK',
  indicator_type: 'DIGITAL',
  tolerance: 0.5,             // ±0.5 detik
  digital_resolution: 0.01,   // detik
  analog_resolution: 0,
  temperature: 22.7,
  humidity: 45.2,
  std_nama: 'Time Interval Standard',
  std_no_identitas: 'STD-TIME-01',
  std_no_sertifikat: 'CERT/TIME/2025/001',
  std_tertelusur: 'SNSU - BSN',
  std_rekalibrasi: '2027-01-15',
};

/** Build a measurement point: UUT reads the nominal, standard runs slightly fast. */
function timerPoint(order, nominalSec) {
  return {
    point_order: order,
    nominal_value: nominalSec,
    unit: 'DETIK',
    correction_std: 0.05,
    uc_std: 0.03,
    cycles: STD_MS.map((ms, i) => ({
      cycle_no: i + 1,
      std_jam: 0, std_menit: 0, std_detik: nominalSec, std_mdetik: ms,
      uut_jam: 0, uut_menit: 0, uut_detik: nominalSec, uut_mdetik: 0,
    })),
  };
}

const POINTS = [
  timerPoint(1, 6),
  timerPoint(2, 60),
  timerPoint(3, 300),
];

async function findExistingSessionId(sessionCode) {
  const pool = await repo.getPool();
  const result = await pool.request()
    .input('SessionCode', sql.VarChar(50), sessionCode)
    .query('SELECT session_id FROM [dbo].[timer_sessions] WHERE session_code = @SessionCode');
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
    console.log(`[seed] Created timer session_id=${sessionId}`);

    const counts = await calc.saveWorkbook(sessionId, POINTS);
    console.log('[seed] Saved workbook:', counts);

    const result = await calc.calculate(sessionId, 'SEEDER');
    console.log(`[seed] Calculated. conclusion="${result.conclusion}", maxExpanded=${Number(result.maxExpandedSec).toFixed(6)} s`);

    const results = await calc.getResults(sessionId);
    console.log('');
    console.log('[seed] Per-point summary (meanError ± U_expanded vs tolerance):');
    results.results.forEach((p) => {
      console.log(
        `[seed]   pt${p.point_order} nominal=${Number(p.nominal_value)}s  meanError=${Number(p.mean_error_sec).toFixed(6)}  ` +
        `U=±${Number(p.u_expanded_sec).toFixed(6)}  tol=±${Number(p.tolerance).toFixed(3)}  ${p.pass_flag ? 'PASS' : 'FAIL'}`
      );
    });

    const failing = results.results.filter((p) => p.pass_flag === false);
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
