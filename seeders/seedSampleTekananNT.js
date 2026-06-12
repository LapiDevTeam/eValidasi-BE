'use strict';

require('dotenv').config();
const sql = require('mssql');
const { configMssql } = require('../config/configMssql');

const SAMPLE_SESSIONS = [
  {
    session_code: 'TEKANAN-NT-IEG-281',
    instrument_code: 'IEG 281',
    instrument_name: 'Differential Pressure Gauge IEG 281',
    unit_mode: 'PA',
    points: [0, 10, 20, 30, 40, 50, 60],
  },
  {
    session_code: 'TEKANAN-NT-IEG-241',
    instrument_code: 'IEG 241',
    instrument_name: 'Differential Pressure Gauge IEG 241',
    unit_mode: 'PA',
    points: [-60, -40, -20, 0, 20, 40, 60],
  },
  {
    session_code: 'TEKANAN-NT-HASIL-PA',
    instrument_code: 'HASIL PA',
    instrument_name: 'HASIL HITUNGAN (SATUAN PA)',
    unit_mode: 'PA',
    points: [0, 10, 20, 30, 40, 50, 60],
  },
  {
    session_code: 'TEKANAN-NT-HASIL-BAR',
    instrument_code: 'HASIL BAR',
    instrument_name: 'HASIL HITUNGAN (SATUAN BAR)',
    unit_mode: 'BAR',
    points: [0, 2, 4, 6, 8, 10],
  },
];

const CYCLES = ['X1', 'X2', 'X3', 'X4', 'X5', 'X6'];

function getDirection(cycleCode) {
  return ['X1', 'X3', 'X5'].includes(cycleCode) ? 'INCREASING' : 'DECREASING';
}

async function ensureSession(transaction, seed) {
  const findResult = await new sql.Request(transaction)
    .input('SessionCode', sql.VarChar(50), seed.session_code)
    .query(`
      SELECT session_id
      FROM [dbo].[calibration_sessions]
      WHERE session_code = @SessionCode
    `);

  if (findResult.recordset.length) {
    return findResult.recordset[0].session_id;
  }

  const inserted = await new sql.Request(transaction)
    .input('SessionCode', sql.VarChar(50), seed.session_code)
    .input('InstrumentCode', sql.VarChar(100), seed.instrument_code)
    .input('InstrumentName', sql.VarChar(255), seed.instrument_name)
    .input('CalibrationDate', sql.Date, '2026-05-26')
    .input('UnitMode', sql.VarChar(20), seed.unit_mode)
    .query(`
      INSERT INTO [dbo].[calibration_sessions]
      (
        session_code,
        instrument_code,
        instrument_name,
        calibration_date,
        unit_mode,
        status
      )
      OUTPUT INSERTED.session_id
      VALUES
      (
        @SessionCode,
        @InstrumentCode,
        @InstrumentName,
        @CalibrationDate,
        @UnitMode,
        'DRAFT'
      )
    `);

  return inserted.recordset[0].session_id;
}

async function clearSessionData(transaction, sessionId) {
  await new sql.Request(transaction)
    .input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[calibration_corrected_readings] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_results] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_uncertainty_components] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_result_summary] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_readings] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_regression_inputs] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_nominal_points] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_level_corrections] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_uncertainty_inputs] WHERE session_id = @SessionId;
    `);
}

async function seedSession(transaction, seed) {
  const sessionId = await ensureSession(transaction, seed);
  await clearSessionData(transaction, sessionId);

  const pointIds = [];
  for (let i = 0; i < seed.points.length; i += 1) {
    const nominal = seed.points[i];
    const insertedPoint = await new sql.Request(transaction)
      .input('SessionId', sql.Int, sessionId)
      .input('PointOrder', sql.Int, i + 1)
      .input('NominalValue', sql.Decimal(18, 10), nominal)
      .input('Unit', sql.VarChar(20), seed.unit_mode)
      .query(`
        INSERT INTO [dbo].[calibration_nominal_points]
        (session_id, point_order, nominal_value, unit, is_active)
        OUTPUT INSERTED.point_id
        VALUES (@SessionId, @PointOrder, @NominalValue, @Unit, 1)
      `);
    const pointId = insertedPoint.recordset[0].point_id;
    pointIds.push({ pointId, nominal, pointOrder: i + 1 });

    for (const cycle of CYCLES) {
      const direction = getDirection(cycle);
      await new sql.Request(transaction)
        .input('SessionId', sql.Int, sessionId)
        .input('PointId', sql.Int, pointId)
        .input('PointIndex', sql.Int, i)
        .input('NominalValue', sql.Decimal(18, 10), nominal)
        .input('CycleCode', sql.VarChar(10), cycle)
        .input('Direction', sql.VarChar(20), direction)
        .input('Uut', sql.Decimal(18, 10), nominal)
        .input('Std', sql.Decimal(18, 10), nominal)
        .query(`
          INSERT INTO [dbo].[calibration_readings]
          (
            session_id,
            point_index,
            nominal_value,
            point_id,
            cycle_code,
            direction,
            uut_reading,
            standard_reading
          )
          VALUES
          (
            @SessionId,
            @PointIndex,
            @NominalValue,
            @PointId,
            @CycleCode,
            @Direction,
            @Uut,
            @Std
          )
        `);
    }
  }

  await new sql.Request(transaction)
    .input('SessionId', sql.Int, sessionId)
    .input('Unit', sql.VarChar(20), seed.unit_mode)
    .query(`
      INSERT INTO [dbo].[calibration_level_corrections]
      (
        session_id,
        delta_h,
        media_density,
        gravity,
        correction_pascal,
        correction_session_unit,
        session_unit
      )
      VALUES
      (
        @SessionId,
        0.02,
        1.2,
        9.78,
        0.235,
        CASE WHEN @Unit = 'BAR' THEN 0.00000235 ELSE 0.235 END,
        @Unit
      )
    `);

  await new sql.Request(transaction)
    .input('SessionId', sql.Int, sessionId)
    .query(`
      INSERT INTO [dbo].[calibration_uncertainty_inputs]
      (
        session_id,
        standard_uncertainty,
        metal_rule_uncertainty,
        instrument_resolution,
        indicator_type,
        analog_resolution_factor,
        digital_resolution_factor
      )
      VALUES
      (
        @SessionId,
        0.003,
        0.0003,
        1,
        'DIGITAL',
        0.2,
        0.5
      )
    `);

  // Global regression defaults for both directions.
  await new sql.Request(transaction)
    .input('SessionId', sql.Int, sessionId)
    .query(`
      INSERT INTO [dbo].[calibration_regression_inputs]
      (session_id, point_id, direction, x_variable, intercept, source_type)
      VALUES
      (@SessionId, NULL, 'INCREASING', 1.000000000000, 0.000000000000, 'IMPORTED_EXCEL'),
      (@SessionId, NULL, 'DECREASING', 1.000000000000, 0.000000000000, 'IMPORTED_EXCEL')
    `);
}

async function seed() {
  let pool;
  let transaction;

  try {
    pool = await sql.connect(configMssql);
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    for (const session of SAMPLE_SESSIONS) {
      await seedSession(transaction, session);
    }

    await transaction.commit();
    console.log('[seedSampleTekananNT] done');
  } catch (error) {
    console.error('[seedSampleTekananNT] failed:', error.message);
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (_) {
        // ignore rollback failure
      }
    }
    process.exitCode = 1;
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (_) {
        // ignore close failure
      }
    }
  }
}

seed();
