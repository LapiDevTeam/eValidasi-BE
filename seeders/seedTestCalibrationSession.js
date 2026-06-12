'use strict';

/**
 * seedTestCalibrationSession.js
 *
 * Seeds a COMPLETE end-to-end test calibration scenario for the pressure
 * calibration module. Covers the full workflow:
 *
 *   calibration_standards (must already exist – run seed:calibration-standards first)
 *   → calibration_sessions
 *   → calibration_readings  (6 cycles × N points)
 *
 * After running this seeder you can immediately call:
 *   GET /api/pressure-calibration/sessions/:session_id/calculate
 * and get a full result without any Postman chaining.
 *
 * This seeder is IDEMPOTENT:
 *   - If a session with the same instrument_id + calibration_date + standard_id
 *     already exists it is reused (not duplicated).
 *   - Readings for that session are deleted and reinserted.
 *
 * Run:
 *   npm run seed:test-session
 *
 * Source: sample data from Perhitungan Tekanan.xls
 */

require('dotenv').config();
const sql = require('mssql');
const { configMssql } = require('../config/configMssql');

// =============================================================================
// TEST SESSION PARAMETERS
// TODO: Replace instrument_id with an actual instrument ID from your master table
// =============================================================================
const SESSION = {
  instrument_id:    'QA-TH-000001', // QA_ID from T_Kalibrasi_DA_* tables (nvarchar 50)
                                  // Change to a pressure-instrument QA_ID from your actual data
  standard_code:    '83',        // must match seedCalibrationStandards.js
  calibration_date: '2026-05-12',
  temperature:      25.0,
  humidity:         60.0,
  pic:              'Test Operator',
  uut_unit:         'Bar',
  standard_unit:    'Bar',
  delta_h:          0,           // metres; 0 = UUT and standard at same height
  media_density:    1.2,         // kg/m³ (air)
  gravity:          9.78,        // m/s²
};

// =============================================================================
// TEST READINGS
// Source: sample reading table from Perhitungan Tekanan.xls
//
// Each nominal calibration point has readings across 6 cycles:
//   X1, X3, X5 = increasing (upstroke)
//   X2, X4, X6 = decreasing (downstroke)
//
// Format per point:
//   { point_index, nominal_value, readings: [{ cycle_code, direction, uut_reading, standard_reading }] }
// =============================================================================
const CALIBRATION_POINTS = [
  {
    point_index:   0,
    nominal_value: 0,
    readings: [
      { cycle_code: 'X1', direction: 'increasing', uut_reading: 0.000,  standard_reading: 0.00000 },
      { cycle_code: 'X2', direction: 'decreasing', uut_reading: 0.000,  standard_reading: 0.00000 },
      { cycle_code: 'X3', direction: 'increasing', uut_reading: 0.000,  standard_reading: 0.00000 },
      { cycle_code: 'X4', direction: 'decreasing', uut_reading: 0.000,  standard_reading: 0.00000 },
      { cycle_code: 'X5', direction: 'increasing', uut_reading: 0.000,  standard_reading: 0.00000 },
      { cycle_code: 'X6', direction: 'decreasing', uut_reading: 0.000,  standard_reading: 0.00000 },
    ],
  },
  {
    point_index:   1,
    nominal_value: 0.25,
    readings: [
      { cycle_code: 'X1', direction: 'increasing', uut_reading: 0.250,  standard_reading: 0.25014 },
      { cycle_code: 'X2', direction: 'decreasing', uut_reading: 0.250,  standard_reading: 0.25014 },
      { cycle_code: 'X3', direction: 'increasing', uut_reading: 0.250,  standard_reading: 0.25014 },
      { cycle_code: 'X4', direction: 'decreasing', uut_reading: 0.250,  standard_reading: 0.25014 },
      { cycle_code: 'X5', direction: 'increasing', uut_reading: 0.250,  standard_reading: 0.25014 },
      { cycle_code: 'X6', direction: 'decreasing', uut_reading: 0.250,  standard_reading: 0.25014 },
    ],
  },
  {
    point_index:   2,
    nominal_value: 0.5,
    readings: [
      { cycle_code: 'X1', direction: 'increasing', uut_reading: 0.500,  standard_reading: 0.50032 },
      { cycle_code: 'X2', direction: 'decreasing', uut_reading: 0.500,  standard_reading: 0.50033 },
      { cycle_code: 'X3', direction: 'increasing', uut_reading: 0.500,  standard_reading: 0.50032 },
      { cycle_code: 'X4', direction: 'decreasing', uut_reading: 0.500,  standard_reading: 0.50033 },
      { cycle_code: 'X5', direction: 'increasing', uut_reading: 0.500,  standard_reading: 0.50032 },
      { cycle_code: 'X6', direction: 'decreasing', uut_reading: 0.500,  standard_reading: 0.50033 },
    ],
  },
  {
    point_index:   3,
    nominal_value: 1.0,
    readings: [
      { cycle_code: 'X1', direction: 'increasing', uut_reading: 1.000,  standard_reading: 1.00068 },
      { cycle_code: 'X2', direction: 'decreasing', uut_reading: 1.000,  standard_reading: 1.00070 },
      { cycle_code: 'X3', direction: 'increasing', uut_reading: 1.000,  standard_reading: 1.00068 },
      { cycle_code: 'X4', direction: 'decreasing', uut_reading: 1.000,  standard_reading: 1.00070 },
      { cycle_code: 'X5', direction: 'increasing', uut_reading: 1.000,  standard_reading: 1.00068 },
      { cycle_code: 'X6', direction: 'decreasing', uut_reading: 1.000,  standard_reading: 1.00070 },
    ],
  },
  {
    point_index:   4,
    nominal_value: 1.5,
    readings: [
      { cycle_code: 'X1', direction: 'increasing', uut_reading: 1.500,  standard_reading: 1.50104 },
      { cycle_code: 'X2', direction: 'decreasing', uut_reading: 1.500,  standard_reading: 1.50107 },
      { cycle_code: 'X3', direction: 'increasing', uut_reading: 1.500,  standard_reading: 1.50104 },
      { cycle_code: 'X4', direction: 'decreasing', uut_reading: 1.500,  standard_reading: 1.50107 },
      { cycle_code: 'X5', direction: 'increasing', uut_reading: 1.500,  standard_reading: 1.50104 },
      { cycle_code: 'X6', direction: 'decreasing', uut_reading: 1.500,  standard_reading: 1.50107 },
    ],
  },
  {
    point_index:   5,
    nominal_value: 2.0,
    readings: [
      { cycle_code: 'X1', direction: 'increasing', uut_reading: 2.000,  standard_reading: 2.00142 },
      { cycle_code: 'X2', direction: 'decreasing', uut_reading: 2.000,  standard_reading: 2.00144 },
      { cycle_code: 'X3', direction: 'increasing', uut_reading: 2.000,  standard_reading: 2.00142 },
      { cycle_code: 'X4', direction: 'decreasing', uut_reading: 2.000,  standard_reading: 2.00144 },
      { cycle_code: 'X5', direction: 'increasing', uut_reading: 2.000,  standard_reading: 2.00142 },
      { cycle_code: 'X6', direction: 'decreasing', uut_reading: 2.000,  standard_reading: 2.00144 },
    ],
  },
  {
    point_index:   6,
    nominal_value: 2.5,
    readings: [
      { cycle_code: 'X1', direction: 'increasing', uut_reading: 2.500,  standard_reading: 2.50178 },
      { cycle_code: 'X2', direction: 'decreasing', uut_reading: 2.500,  standard_reading: 2.50178 },
      { cycle_code: 'X3', direction: 'increasing', uut_reading: 2.500,  standard_reading: 2.50178 },
      { cycle_code: 'X4', direction: 'decreasing', uut_reading: 2.500,  standard_reading: 2.50178 },
      { cycle_code: 'X5', direction: 'increasing', uut_reading: 2.500,  standard_reading: 2.50178 },
      { cycle_code: 'X6', direction: 'decreasing', uut_reading: 2.500,  standard_reading: 2.50178 },
    ],
  },
];

// =============================================================================
// SEEDER
// =============================================================================

async function seed() {
  let pool;
  let transaction;

  try {
    pool = await sql.connect(configMssql);
    console.log('[seed] Connected to database.');

    // -------------------------------------------------------------------------
    // Resolve standard_id from standard_code
    // -------------------------------------------------------------------------
    const stdResult = await pool.request()
      .input('StandardCode', sql.VarChar(50), SESSION.standard_code)
      .query(`SELECT standard_id FROM [dbo].[calibration_standards] WHERE standard_code = @StandardCode AND is_deleted = 0`);

    if (!stdResult.recordset.length) {
      console.error(`[seed] ERROR: No calibration_standard found with standard_code="${SESSION.standard_code}".`);
      console.error('[seed] Run "npm run seed:calibration-standards" first.');
      process.exit(1);
    }
    const standardId = stdResult.recordset[0].standard_id;
    console.log(`[seed] Resolved standard_id=${standardId} for code="${SESSION.standard_code}"`);

    transaction = new sql.Transaction(pool);
    await transaction.begin();
    console.log('[seed] Transaction started.');

    // -------------------------------------------------------------------------
    // Check if session already exists (idempotency key: instrument + date + standard)
    // -------------------------------------------------------------------------
    const sessionCheck = await new sql.Request(transaction)
      .input('InstrumentId',    sql.NVarChar(50), SESSION.instrument_id)
      .input('StandardId',      sql.Int,  standardId)
      .input('CalibrationDate', sql.Date, SESSION.calibration_date)
      .query(`
        SELECT session_id FROM [dbo].[calibration_sessions]
        WHERE instrument_id    = @InstrumentId
          AND standard_id      = @StandardId
          AND calibration_date = @CalibrationDate
          AND is_deleted       = 0
      `);

    let sessionId;

    if (sessionCheck.recordset.length > 0) {
      sessionId = sessionCheck.recordset[0].session_id;
      console.log(`[seed] Session already exists – session_id=${sessionId} (will refresh readings)`);
    } else {
      const sessionInsert = await new sql.Request(transaction)
        .input('InstrumentId',    sql.NVarChar(50), SESSION.instrument_id)
        .input('StandardId',      sql.Int,          standardId)
        .input('CalibrationDate', sql.Date,         SESSION.calibration_date)
        .input('Temperature',     sql.Decimal(10,2), SESSION.temperature)
        .input('Humidity',        sql.Decimal(10,2), SESSION.humidity)
        .input('Pic',             sql.VarChar(100),  SESSION.pic)
        .input('UutUnit',         sql.VarChar(20),   SESSION.uut_unit)
        .input('StandardUnit',    sql.VarChar(20),   SESSION.standard_unit)
        .input('DeltaH',          sql.Decimal(18,8), SESSION.delta_h)
        .input('MediaDensity',    sql.Decimal(18,8), SESSION.media_density)
        .input('Gravity',         sql.Decimal(18,8), SESSION.gravity)
        .query(`
          INSERT INTO [dbo].[calibration_sessions]
            (instrument_id, standard_id, calibration_date, temperature, humidity,
             pic, uut_unit, standard_unit, delta_h, media_density, gravity, status)
          OUTPUT INSERTED.session_id
          VALUES
            (@InstrumentId, @StandardId, @CalibrationDate, @Temperature, @Humidity,
             @Pic, @UutUnit, @StandardUnit, @DeltaH, @MediaDensity, @Gravity, 'DRAFT')
        `);
      sessionId = sessionInsert.recordset[0].session_id;
      console.log(`[seed] Session created – session_id=${sessionId}`);
    }

    // -------------------------------------------------------------------------
    // Delete existing readings for this session, then reinsert
    // -------------------------------------------------------------------------
    const delResult = await new sql.Request(transaction)
      .input('SessionId', sql.Int, sessionId)
      .query(`DELETE FROM [dbo].[calibration_readings] WHERE session_id = @SessionId`);
    const deletedCount = delResult.rowsAffected[0] || 0;
    if (deletedCount > 0) {
      console.log(`[seed] Deleted ${deletedCount} existing reading(s) for session_id=${sessionId}`);
    }

    // -------------------------------------------------------------------------
    // Insert all readings
    // -------------------------------------------------------------------------
    let insertedCount = 0;
    for (const pt of CALIBRATION_POINTS) {
      for (const r of pt.readings) {
        await new sql.Request(transaction)
          .input('SessionId',      sql.Int,         sessionId)
          .input('PointIndex',     sql.Int,         pt.point_index)
          .input('NominalValue',   sql.Decimal(18,8), pt.nominal_value)
          .input('CycleCode',      sql.VarChar(10), r.cycle_code)
          .input('Direction',      sql.VarChar(20), r.direction)
          .input('UutReading',     sql.Decimal(18,8), r.uut_reading)
          .input('StandardReading',sql.Decimal(18,8), r.standard_reading)
          .query(`
            INSERT INTO [dbo].[calibration_readings]
              (session_id, point_index, nominal_value, cycle_code, direction, uut_reading, standard_reading)
            VALUES
              (@SessionId, @PointIndex, @NominalValue, @CycleCode, @Direction, @UutReading, @StandardReading)
          `);
        insertedCount++;
      }
    }
    console.log(`[seed] Inserted ${insertedCount} reading(s) across ${CALIBRATION_POINTS.length} calibration point(s)`);

    await transaction.commit();
    console.log('[seed] Transaction committed. Seeding complete.');
    console.log('');
    console.log(`[seed] ✔ Ready to test! Use session_id=${sessionId}`);
    console.log(`[seed]   POST /api/pressure-calibration/sessions/${sessionId}/calculate`);
    console.log(`[seed]   GET  /api/pressure-calibration/sessions/${sessionId}/result`);

  } catch (err) {
    console.error('[seed] ERROR:', err.message);
    if (transaction) {
      try {
        await transaction.rollback();
        console.error('[seed] Transaction rolled back.');
      } catch (rbErr) {
        console.error('[seed] Rollback failed:', rbErr.message);
      }
    }
    process.exit(1);
  } finally {
    if (pool) await pool.close();
  }
}

seed();
