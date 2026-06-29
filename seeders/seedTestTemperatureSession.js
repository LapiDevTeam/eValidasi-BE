'use strict';

/**
 * seedTestTemperatureSession.js
 *
 * Seeds a COMPLETE, fully-calculated example session for the Temperature
 * calibration module from C:\eValidasi\TEMPERATURE.xls, sheet "TS 214".
 *
 * It drives the real service layer:
 *   temperatureCalculation.createSession -> temperature_sessions
 *   temperatureCalculation.saveWorkbook  -> temperature_points/readings
 *   temperatureCalculation.calculate     -> temperature_results/summary
 *
 * IDEMPOTENT: re-running deletes the previous seed session matched by
 * session_code and rebuilds it.
 *
 * Run:
 *   npm run seed:test-temperature-session
 */

require('dotenv').config();
const sql = require('mssql');
const repo = require('../repositories/temperature-calibration.repository');
const calc = require('../src/services/temperatureCalculation.service');

const SESSION_CODE = 'SEED-TS214-TEMPERATURE';

const SESSION = {
  session_code: SESSION_CODE,
  instrument_id: 'TS 02',
  instrument_code: 'TS 02',
  instrument_name: 'TEMPERATURE SENSOR MESIN STRIPPING CHENTAI PN 030 (ROLLER B)',
  merk_tipe: '',
  no_seri: '',
  kapasitas: '',
  resolusi: '0.1 deg C',
  lokasi: '',
  calibration_date: '2018-11-08',
  interval_bulan: '12',
  metode_kalibrasi: 'Kalibrasi Temperature - Workbook',
  keterangan: 'Mock session from TEMPERATURE.xls sheet TS 214.',
  tolerance_accuracy: 1,
  temperature: null,
  humidity: null,
  std_nama: 'Temperature Standard',
  std_no_identitas: 'VN 094 + VN 110 / VN 108 / VN 043',
  std_no_sertifikat: '',
  std_tertelusur: '',
  std_rekalibrasi: '',
  pic: '',
};

const POINT_DEFAULTS = {
  correction_standard: 0.016,
  correction_media: 0,
  correction_uut: -0.4,
  uc_1: 0.023,
  uc_2: 0.1,
  uc_3: 0,
  digital_resolution: 0.1,
  analog_resolution: 0,
};

function point(pointNo, nominalValue, standardRows, uutValue, expectedError, expectedU) {
  return {
    point_no: pointNo,
    nominal_value: nominalValue,
    ...POINT_DEFAULTS,
    expected_error: expectedError,
    expected_u_expanded: expectedU,
    readings: standardRows.map((standardValue, index) => ({
      sequence_no: index + 1,
      standard_value: standardValue,
      uut_value: uutValue,
    })),
  };
}

const WORKBOOK = {
  points: [
    point(
      1,
      100,
      [100.240, 100.240, 100.239, 100.239, 100.239, 100.240, 100.240, 100.241, 100.241, 100.241],
      100,
      0.6560000000000101,
      0.11776218974413354
    ),
    point(
      2,
      115,
      [115.418, 115.418, 115.419, 115.419, 115.419, 115.418, 115.418, 115.419, 115.419, 115.419],
      115.5,
      0.3346000000000117,
      0.11774452570431165
    ),
    point(
      3,
      135,
      [135.616, 135.616, 135.617, 135.617, 135.617, 135.617, 135.616, 135.616, 135.615, 135.615],
      135.9,
      0.1321999999999946,
      0.1177621142624208
    ),
    point(
      4,
      150,
      [150.750, 150.752, 150.752, 150.755, 150.757, 150.757, 150.757, 150.756, 150.756, 150.756],
      152,
      -0.8292000000000002,
      0.11802638123176852
    ),
  ],
};

async function findExistingSessionId(sessionCode) {
  const pool = await repo.getPool();
  const result = await pool.request()
    .input('SessionCode', sql.VarChar(50), sessionCode)
    .query('SELECT session_id FROM [dbo].[temperature_sessions] WHERE session_code = @SessionCode');
  return result.recordset[0]?.session_id || null;
}

async function seed() {
  try {
    const existingId = await findExistingSessionId(SESSION_CODE);
    if (existingId) {
      console.log(`[seed] Existing temperature seed session ${existingId} found; deleting before rebuild.`);
      await repo.deleteSessionGraph(existingId);
    }

    const { sessionId } = await calc.createSession(SESSION, 'SEEDER');
    console.log(`[seed] Created temperature session_id=${sessionId}`);

    const counts = await calc.saveWorkbook(sessionId, WORKBOOK);
    console.log('[seed] Saved workbook:', counts);

    const result = await calc.calculate(sessionId, 'SEEDER');
    console.log(`[seed] Calculated. conclusion="${result.conclusion}", maxExpanded=${Number(result.max_u_expanded).toFixed(12)} deg C`);

    console.log('');
    console.log('[seed] Workbook parity against TEMPERATURE.xls / TS 214:');
    result.results.forEach((row, index) => {
      const expected = WORKBOOK.points[index];
      const deltaError = Math.abs(Number(row.mean_error) - expected.expected_error);
      const deltaU = Math.abs(Number(row.u_expanded) - expected.expected_u_expanded);
      console.log(
        `[seed]   pt${row.point_no} nominal=${Number(row.nominal_value)} deg C  ` +
        `koreksi=${Number(row.mean_error).toFixed(12)}  U=+/-${Number(row.u_expanded).toFixed(12)}  ` +
        `deltaError=${deltaError.toExponential(3)} deltaU=${deltaU.toExponential(3)}`
      );
      if (deltaError > 1e-9 || deltaU > 1e-9) {
        throw new Error(`Workbook parity mismatch at point ${row.point_no}`);
      }
    });

    console.log('');
    console.log(`[seed] OK mock ready: session_id=${sessionId}, session_code=${SESSION_CODE}`);
  } catch (err) {
    console.error('[seed] ERROR:', err.message);
    process.exitCode = 1;
  } finally {
    try { await (await repo.getPool()).close(); } catch (_) { /* ignore */ }
  }
}

seed();
