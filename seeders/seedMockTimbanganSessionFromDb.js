'use strict';

/**
 * seedMockTimbanganSessionFromDb.js
 *
 * Seeds a realistic Timbangan calibration session using AT (anak timbangan)
 * master values that already live in the database. The mock readings are
 * intentionally close to the conventional mass so the session ends with a
 * real "LAYAK DIGUNAKAN" conclusion, but the values are not hand-copied:
 * they are computed against live DB data and run through the production
 * calculation service.
 *
 * Idempotent: re-running deletes the previous mock session (matched by
 * session_code) and rebuilds it.
 *
 * Run:
 *   npm run seed:mock-timbangan-session
 */

require('dotenv').config();
const sql = require('mssql');
const repo = require('../repositories/timbangan-calibration.repository');
const calc = require('../src/services/timbanganCalculation.service');

const SESSION_CODE = 'MOCK-TIMBANGAN-001';

async function fetchAtMaster() {
  const pool = await repo.getPool();
  const result = await pool.request().query(`
    SELECT no_id, no_id_label, konvensional_g, uc_mg,
           no_sertifikat, rekalibrasi, tertelusur, kelas
    FROM [dbo].[timbangan_at_standards]
    WHERE is_active = 1
    ORDER BY konvensional_g ASC
  `);
  return result.recordset.map((r) => ({
    no_id: String(r.no_id).trim(),
    no_id_label: r.no_id_label,
    konvensional_g: Number(r.konvensional_g),
    uc_mg: Number(r.uc_mg),
    no_sertifikat: r.no_sertifikat,
    rekalibrasi: r.rekalibrasi,
    tertelusur: r.tertelusur,
    kelas: r.kelas,
  }));
}

function requireAt(atList, noIds) {
  const map = new Map(atList.map((a) => [a.no_id, a]));
  const missing = noIds.filter((id) => !map.has(String(id)));
  if (missing.length) {
    throw new Error(`AT master missing required no_id: ${missing.join(', ')}. Run migrations first.`);
  }
  return map;
}

function buildPoint(order, atRecords, targetReadingKg, unit = 'kg') {
  return {
    point_order: order,
    unit,
    standards: atRecords.map((at, i) => ({
      row_order: i + 1,
      at_no_id: at.no_id,
      konvensional_g: at.konvensional_g,
      uc_mg: at.uc_mg,
      uut_reading: targetReadingKg,
      zero_reading: 0,
    })),
  };
}

async function findExistingSessionId(sessionCode) {
  const pool = await repo.getPool();
  const result = await pool.request()
    .input('SessionCode', sql.VarChar(50), sessionCode)
    .query('SELECT session_id FROM [dbo].[timbangan_sessions] WHERE session_code = @SessionCode');
  return result.recordset[0]?.session_id || null;
}

async function seed() {
  try {
    const atList = await fetchAtMaster();
    if (!atList.length) {
      throw new Error('timbangan_at_standards is empty. Run create-timbangan-at-master.sql first.');
    }

    // Prefer the exact AT combination used by the real TIMBANGAN.xls workbook.
    const atMap = requireAt(atList, ['24', '25', '26', '27', '28', '156']);

    const at = (id) => atMap.get(String(id));

    const SESSION = {
      session_code: SESSION_CODE,
      instrument_id: 'TM 131',
      instrument_code: 'TM 131',
      instrument_name: 'Timbangan Elektronik Avery Weight',
      merk_tipe: 'Avery Weight',
      no_seri: 'AW-123456',
      kapasitas_ukur: 30,
      kapasitas_alat: 30,
      unit: 'kg',
      resolusi: 0.01,
      kapasitas_resolusi: '30 kg / 0.01 kg',
      lokasi: 'Lab. Timbangan Lantai 2',
      calibration_date: '2025-10-10',
      interval_bulan: '12',
      metode_kalibrasi: 'PK.VN.000006 REV 01',
      keterangan: 'Mock session seeded from live AT master (timbangan_at_standards).',
      temperature: 22.7,
      humidity: 45.2,
    };

    const WORKBOOK = {
      // I. Pre-adjustment: ~25 kg (AT 156 + AT 27).
      preadjust: [
        { row_order: 1, at_no_id: at('156').no_id, konvensional_g: at('156').konvensional_g, uut_reading: 24.99, zero_reading: 0 },
        { row_order: 2, at_no_id: at('27').no_id,  konvensional_g: at('27').konvensional_g,  uut_reading: 24.99, zero_reading: 0 },
      ],

      // II. Repeatability: 10 rows at 1/2 and max capacity.
      repeatability: Array.from({ length: 10 }, (_, i) => ({
        row_no: i + 1,
        half_zero: 0, half_reading: 14.99,
        max_zero: 0,  max_reading: 29.98,
      })),

      // III. Measurement points.
      points: [
        buildPoint(1,  [at('25'), at('24')],       3.0001),
        buildPoint(2,  [at('27')],                 5),
        buildPoint(3,  [at('27'), at('25'), at('26')], 8.99),
        buildPoint(4,  [at('28'), at('25')],       11.99),
        buildPoint(5,  [at('28'), at('27')],       14.99),
        buildPoint(6,  [at('28'), at('27'), at('25')], 16.99),
        {
          point_order: 7,
          unit: 'kg',
          standards: [
            { row_order: 1, at_no_id: at('156').no_id, konvensional_g: at('156').konvensional_g, uc_mg: at('156').uc_mg, uut_reading: 19.99, zero_reading: 0 },
            { row_order: 2, at_no_id: null, konvensional_g: 0, uc_mg: 0, uut_reading: 19.98, zero_reading: 0 },
          ],
        },
        buildPoint(8,  [at('156'), at('25'), at('26')], 23.98),
        buildPoint(9,  [at('156'), at('27'), at('25')], 26.98),
        buildPoint(10, [at('156'), at('28')],      29.98),
      ],

      // IV. Eccentricity: center + 3 corners at ~1/2 capacity.
      eccentricity: [
        { position: 0, baca1: 14.99, baca2: 14.99 },
        { position: 1, baca1: 14.99, baca2: 14.99 },
        { position: 2, baca1: 14.99, baca2: 14.99 },
        { position: 3, baca1: 14.99, baca2: 14.99 },
      ],

      // V. Hysteresis: not measured.
      hysteresis: [],
    };

    const existingId = await findExistingSessionId(SESSION_CODE);
    if (existingId) {
      console.log(`[seed] Existing mock session ${existingId} found — deleting before rebuild.`);
      await repo.deleteSessionGraph(existingId);
    }

    const { sessionId } = await calc.createSession(SESSION, 'MOCK-SEEDER');
    console.log(`[seed] Created timbangan session_id=${sessionId}`);

    const counts = await calc.saveWorkbook(sessionId, WORKBOOK);
    console.log('[seed] Saved workbook:', counts);

    const result = await calc.calculate(sessionId, 'MOCK-SEEDER');
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
      console.warn(`[seed] NOTE: got "${result.conclusion}" with ${failing.length} failing point(s). The mock is still persisted for inspection.`);
    } else {
      console.log('');
      console.log(`[seed] ✔ Mock ready — session_id=${sessionId} (status CALCULATED, conclusion LAYAK DIGUNAKAN)`);
    }
  } catch (err) {
    console.error('[seed] ERROR:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    try { await (await repo.getPool()).close(); } catch (_) { /* ignore */ }
  }
}

seed();
