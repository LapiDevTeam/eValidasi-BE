'use strict';

const sql = require('mssql');
const { configMssql } = require('../config/configMssql');
const { hasCertificateGenerator } = require('../src/constants/certificateTypeCodes');

let _pool = null;

async function getPool() {
  if (!_pool) {
    _pool = await sql.connect(configMssql);
  }
  return _pool;
}

async function createRequest(transaction) {
  if (transaction) return new sql.Request(transaction);
  const pool = await getPool();
  return pool.request();
}

function toDbNull(value) {
  return value === undefined ? null : value;
}

async function listSessions(filters = {}) {
  const request = await createRequest();

  const where = [];
  if (filters.status) {
    request.input('Status', sql.VarChar(30), String(filters.status).toUpperCase());
    where.push('cs.status = @Status');
  }
  if (filters.unitMode) {
    request.input('UnitMode', sql.VarChar(20), String(filters.unitMode).toUpperCase());
    where.push('cs.unit_mode = @UnitMode');
  }

  let query = `
    SELECT
      cs.session_id,
      cs.session_code,
      cs.instrument_id,
      cs.instrument_code,
      cs.instrument_name,
      cs.calibration_date,
      cs.unit_mode,
      cs.status,
      cs.pic,
      cs.temperature,
      cs.humidity,
      cs.notes,
      cs.evaluation_result,
      cs.approved_by_admin,
      cs.approved_by_admin_date,
      cs.approved_by_officer,
      cs.approved_by_officer_date,
      cs.approved_by_manager,
      cs.approved_by_manager_date,
      cs.rejected_by,
      cs.rejected_reason,
      cs.rejected_at,
      cs.created_by,
      cs.updated_by,
      cs.created_at,
      cs.updated_at,
      (
        SELECT COUNT(1)
        FROM [dbo].[calibration_nominal_points] p
        WHERE p.session_id = cs.session_id
          AND p.is_active = 1
      ) AS active_point_count
    FROM [dbo].[calibration_sessions] cs
  `;

  if (where.length) {
    query += `\nWHERE ${where.join('\n  AND ')}`;
  }

  query += '\nORDER BY cs.session_id DESC';
  const result = await request.query(query);
  return result.recordset;
}

async function getSessionById(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT
        session_id,
        session_code,
        instrument_id,
        instrument_code,
        instrument_name,
        calibration_date,
        unit_mode,
        status,
        pic,
        temperature,
        humidity,
        notes,
        evaluation_result,
        approved_by_admin,
        approved_by_admin_date,
        approved_by_officer,
        approved_by_officer_date,
        approved_by_manager,
        approved_by_manager_date,
        rejected_by,
        rejected_reason,
        rejected_at,
        created_by,
        updated_by,
        created_at,
        updated_at
      FROM [dbo].[calibration_sessions]
      WHERE session_id = @SessionId
    `);

  return result.recordset[0] || null;
}

async function createSession(payload, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionCode', sql.VarChar(50), toDbNull(payload.session_code))
    .input('InstrumentId', sql.VarChar(50), toDbNull(payload.instrument_id))
    .input('InstrumentCode', sql.VarChar(100), toDbNull(payload.instrument_code))
    .input('InstrumentName', sql.VarChar(255), toDbNull(payload.instrument_name))
    .input('CalibrationDate', sql.Date, toDbNull(payload.calibration_date))
    .input('UnitMode', sql.VarChar(20), payload.unit_mode)
    .input('Status', sql.VarChar(30), payload.status || 'DRAFT')
    .input('Pic', sql.VarChar(100), toDbNull(payload.pic))
    .input('Temperature', sql.Decimal(18, 6), toDbNull(payload.temperature))
    .input('Humidity', sql.Decimal(18, 6), toDbNull(payload.humidity))
    .input('Notes', sql.VarChar(1000), toDbNull(payload.notes))
    .input('CreatedBy', sql.VarChar(100), toDbNull(payload.created_by))
    .query(`
    INSERT INTO [dbo].[calibration_sessions]
    (
      session_code,
      instrument_id,
      instrument_code,
      instrument_name,
      calibration_date,
      unit_mode,
      status,
      pic,
      temperature,
      humidity,
      notes,
      created_by
    )
    OUTPUT INSERTED.session_id
    VALUES
    (
      @SessionCode,
      @InstrumentId,
      @InstrumentCode,
      @InstrumentName,
      @CalibrationDate,
      @UnitMode,
      @Status,
      @Pic,
      @Temperature,
      @Humidity,
      @Notes,
      @CreatedBy
    )
  `);

  return result.recordset[0].session_id;
}

async function updateSession(sessionId, payload, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .input('SessionCode', sql.VarChar(50), toDbNull(payload.session_code))
    .input('InstrumentId', sql.VarChar(50), toDbNull(payload.instrument_id))
    .input('InstrumentCode', sql.VarChar(100), toDbNull(payload.instrument_code))
    .input('InstrumentName', sql.VarChar(255), toDbNull(payload.instrument_name))
    .input('CalibrationDate', sql.Date, toDbNull(payload.calibration_date))
    .input('UnitMode', sql.VarChar(20), payload.unit_mode)
    .input('Status', sql.VarChar(30), payload.status)
    .input('Pic', sql.VarChar(100), toDbNull(payload.pic))
    .input('Temperature', sql.Decimal(18, 6), toDbNull(payload.temperature))
    .input('Humidity', sql.Decimal(18, 6), toDbNull(payload.humidity))
    .input('Notes', sql.VarChar(1000), toDbNull(payload.notes))
    .input('UpdatedBy', sql.VarChar(100), toDbNull(payload.updated_by))
    .query(`
    UPDATE [dbo].[calibration_sessions]
    SET
      session_code     = @SessionCode,
      instrument_id    = @InstrumentId,
      instrument_code  = @InstrumentCode,
      instrument_name  = @InstrumentName,
      calibration_date = @CalibrationDate,
      unit_mode        = @UnitMode,
      status           = @Status,
      pic              = @Pic,
      temperature      = @Temperature,
      humidity         = @Humidity,
      notes            = @Notes,
      updated_by       = @UpdatedBy,
      updated_at       = GETDATE()
    WHERE session_id = @SessionId
  `);

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function updateSessionStatus(sessionId, status, updatedBy, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .input('Status', sql.VarChar(30), status)
    .input('UpdatedBy', sql.VarChar(100), toDbNull(updatedBy))
    .query(`
      UPDATE [dbo].[calibration_sessions]
      SET
        status = @Status,
        updated_by = @UpdatedBy,
        updated_at = GETDATE()
      WHERE session_id = @SessionId
    `);

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function updateSessionApproval(sessionId, { roleKey, userId }, transaction) {
  const columnMap = {
    admin: 'approved_by_admin',
    officer: 'approved_by_officer',
    manager: 'approved_by_manager',
  };
  const dateColumnMap = {
    admin: 'approved_by_admin_date',
    officer: 'approved_by_officer_date',
    manager: 'approved_by_manager_date',
  };
  const column = columnMap[roleKey];
  const dateColumn = dateColumnMap[roleKey];
  if (!column || !dateColumn) {
    throw new Error(`Invalid approval role: ${roleKey}`);
  }

  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .input('UserId', sql.VarChar(100), toDbNull(userId))
    .query(`
      UPDATE [dbo].[calibration_sessions]
      SET ${column} = @UserId, ${dateColumn} = GETDATE(), updated_by = @UserId, updated_at = GETDATE()
      WHERE session_id = @SessionId
    `);
  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function clearSessionApprovals(sessionId, { rejectedBy, rejectedReason }, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .input('RejectedBy', sql.VarChar(100), toDbNull(rejectedBy))
    .input('RejectedReason', sql.VarChar(500), toDbNull(rejectedReason))
    .query(`
      UPDATE [dbo].[calibration_sessions]
      SET
        approved_by_admin = NULL,
        approved_by_admin_date = NULL,
        approved_by_officer = NULL,
        approved_by_officer_date = NULL,
        approved_by_manager = NULL,
        approved_by_manager_date = NULL,
        rejected_by = @RejectedBy,
        rejected_reason = @RejectedReason,
        rejected_at = GETDATE(),
        updated_by = @RejectedBy,
        updated_at = GETDATE()
      WHERE session_id = @SessionId
    `);
  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function resetSessionApprovals(sessionId, updatedBy, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .input('UpdatedBy', sql.VarChar(100), toDbNull(updatedBy))
    .query(`
      UPDATE [dbo].[calibration_sessions]
      SET
        approved_by_admin = NULL,
        approved_by_admin_date = NULL,
        approved_by_officer = NULL,
        approved_by_officer_date = NULL,
        approved_by_manager = NULL,
        approved_by_manager_date = NULL,
        rejected_by = NULL,
        rejected_reason = NULL,
        rejected_at = NULL,
        updated_by = @UpdatedBy,
        updated_at = GETDATE()
      WHERE session_id = @SessionId
    `);
  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function updateEvaluationResult(sessionId, evaluationResult, updatedBy, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .input('EvaluationResult', sql.VarChar(100), toDbNull(evaluationResult))
    .input('UpdatedBy', sql.VarChar(100), toDbNull(updatedBy))
    .query(`
      UPDATE [dbo].[calibration_sessions]
      SET
        evaluation_result = @EvaluationResult,
        updated_by = @UpdatedBy,
        updated_at = GETDATE()
      WHERE session_id = @SessionId
    `);

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function deleteSessionHard(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query('DELETE FROM [dbo].[calibration_sessions] WHERE session_id = @SessionId');

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function deleteSessionGraph(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[calibration_corrected_readings] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_results] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_uncertainty_components] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_result_summary] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_readings] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_regression_inputs] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_level_corrections] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_uncertainty_inputs] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_nominal_points] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_audit_logs] WHERE session_id = @SessionId;
    `);

  return deleteSessionHard(sessionId, transaction);
}

async function listPoints(sessionId, options = {}, transaction) {
  const request = await createRequest(transaction);
  request.input('SessionId', sql.Int, sessionId);

  const includeInactive = options.includeInactive === true;
  const where = includeInactive ? '' : 'AND is_active = 1';
  const result = await request.query(`
    SELECT
      point_id,
      session_id,
      point_order,
      nominal_value,
      unit,
      is_active,
      created_at,
      updated_at
    FROM [dbo].[calibration_nominal_points]
    WHERE session_id = @SessionId
      ${where}
    ORDER BY point_order ASC, point_id ASC
  `);

  return result.recordset;
}

async function getPointById(pointId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('PointId', sql.Int, pointId)
    .query(`
      SELECT
        point_id,
        session_id,
        point_order,
        nominal_value,
        unit,
        is_active,
        created_at,
        updated_at
      FROM [dbo].[calibration_nominal_points]
      WHERE point_id = @PointId
    `);

  return result.recordset[0] || null;
}

async function createPoint(sessionId, payload, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .input('PointOrder', sql.Int, payload.point_order)
    .input('NominalValue', sql.Decimal(18, 10), payload.nominal_value)
    .input('Unit', sql.VarChar(20), payload.unit)
    .input('IsActive', sql.Bit, payload.is_active === undefined ? 1 : payload.is_active ? 1 : 0)
    .query(`
      INSERT INTO [dbo].[calibration_nominal_points]
        (session_id, point_order, nominal_value, unit, is_active)
      OUTPUT INSERTED.point_id
      VALUES
        (@SessionId, @PointOrder, @NominalValue, @Unit, @IsActive)
    `);

  return result.recordset[0].point_id;
}

async function updatePoint(pointId, payload, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('PointId', sql.Int, pointId)
    .input('PointOrder', sql.Int, payload.point_order)
    .input('NominalValue', sql.Decimal(18, 10), payload.nominal_value)
    .input('Unit', sql.VarChar(20), payload.unit)
    .input('IsActive', sql.Bit, payload.is_active === undefined ? 1 : payload.is_active ? 1 : 0)
    .query(`
      UPDATE [dbo].[calibration_nominal_points]
      SET
        point_order = @PointOrder,
        nominal_value = @NominalValue,
        unit = @Unit,
        is_active = @IsActive,
        updated_at = GETDATE()
      WHERE point_id = @PointId
    `);

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function deactivatePoint(pointId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('PointId', sql.Int, pointId)
    .query(`
      UPDATE [dbo].[calibration_nominal_points]
      SET is_active = 0, updated_at = GETDATE()
      WHERE point_id = @PointId
    `);

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function listReadings(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT
        r.reading_id,
        r.session_id,
        r.point_id,
        r.cycle_code,
        r.direction,
        r.uut_reading,
        r.standard_reading,
        r.created_at,
        r.updated_at,
        p.point_order,
        p.nominal_value,
        p.unit
      FROM [dbo].[calibration_readings] r
      INNER JOIN [dbo].[calibration_nominal_points] p
        ON p.point_id = r.point_id
      WHERE r.session_id = @SessionId
      ORDER BY p.point_order ASC, r.cycle_code ASC
    `);

  return result.recordset;
}

async function getReadingById(readingId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('ReadingId', sql.Int, readingId)
    .query(`
      SELECT
        reading_id,
        session_id,
        point_id,
        cycle_code,
        direction,
        uut_reading,
        standard_reading,
        created_at,
        updated_at
      FROM [dbo].[calibration_readings]
      WHERE reading_id = @ReadingId
    `);

  return result.recordset[0] || null;
}

async function findReadingBySessionPointCycle(sessionId, pointId, cycleCode, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .input('PointId', sql.Int, pointId)
    .input('CycleCode', sql.VarChar(10), cycleCode)
    .query(`
      SELECT TOP 1
        reading_id,
        session_id,
        point_id,
        cycle_code,
        direction,
        uut_reading,
        standard_reading
      FROM [dbo].[calibration_readings]
      WHERE session_id = @SessionId
        AND point_id = @PointId
        AND cycle_code = @CycleCode
      ORDER BY reading_id DESC
    `);

  return result.recordset[0] || null;
}

async function createReading(sessionId, payload, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .input('PointId', sql.Int, payload.point_id)
    .input('CycleCode', sql.VarChar(10), payload.cycle_code)
    .input('Direction', sql.VarChar(20), payload.direction)
    .input('UutReading', sql.Decimal(18, 10), toDbNull(payload.uut_reading))
    .input('StandardReading', sql.Decimal(18, 10), toDbNull(payload.standard_reading))
    .query(`
      INSERT INTO [dbo].[calibration_readings]
      (
        session_id,
        point_id,
        point_index,
        nominal_value,
        cycle_code,
        direction,
        uut_reading,
        standard_reading
      )
      OUTPUT INSERTED.reading_id
      SELECT
        @SessionId AS session_id,
        p.point_id,
        p.point_order AS point_index,
        p.nominal_value,
        @CycleCode AS cycle_code,
        @Direction AS direction,
        @UutReading AS uut_reading,
        @StandardReading AS standard_reading
      FROM [dbo].[calibration_nominal_points] p
      WHERE p.point_id = @PointId
        AND p.session_id = @SessionId
    `);

  const readingId = result.recordset[0]?.reading_id || null;
  if (!readingId) {
    const err = new Error(
      `Point ${payload.point_id} is invalid for session ${sessionId}, reading not inserted.`
    );
    err.statusCode = 422;
    throw err;
  }
  return readingId;
}

async function updateReading(readingId, payload, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('ReadingId', sql.Int, readingId)
    .input('PointId', sql.Int, payload.point_id)
    .input('CycleCode', sql.VarChar(10), payload.cycle_code)
    .input('Direction', sql.VarChar(20), payload.direction)
    .input('UutReading', sql.Decimal(18, 10), toDbNull(payload.uut_reading))
    .input('StandardReading', sql.Decimal(18, 10), toDbNull(payload.standard_reading))
    .query(`
      UPDATE r
      SET
        r.point_id = @PointId,
        r.point_index = p.point_order,
        r.nominal_value = p.nominal_value,
        r.cycle_code = @CycleCode,
        r.direction = @Direction,
        r.uut_reading = @UutReading,
        r.standard_reading = @StandardReading,
        r.updated_at = GETDATE()
      FROM [dbo].[calibration_readings] r
      INNER JOIN [dbo].[calibration_nominal_points] p
        ON p.point_id = @PointId
       AND p.session_id = r.session_id
      WHERE r.reading_id = @ReadingId
    `);

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function deleteReading(readingId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('ReadingId', sql.Int, readingId)
    .query('DELETE FROM [dbo].[calibration_readings] WHERE reading_id = @ReadingId');

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function bulkUpsertReadings(sessionId, rows, transaction) {
  let inserted = 0;
  let updated = 0;

  for (const row of rows) {
    if (row.reading_id) {
      const ok = await updateReading(row.reading_id, row, transaction);
      if (ok) updated += 1;
      continue;
    }

    const existing = await findReadingBySessionPointCycle(
      sessionId,
      row.point_id,
      row.cycle_code,
      transaction
    );

    if (existing) {
      const ok = await updateReading(existing.reading_id, row, transaction);
      if (ok) updated += 1;
    } else {
      await createReading(sessionId, row, transaction);
      inserted += 1;
    }
  }

  return { inserted, updated };
}

async function listRegressionInputs(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT
        regression_id,
        session_id,
        point_id,
        direction,
        x_variable,
        intercept,
        source_type,
        created_at,
        updated_at
      FROM [dbo].[calibration_regression_inputs]
      WHERE session_id = @SessionId
      ORDER BY
        CASE WHEN point_id IS NULL THEN 0 ELSE 1 END ASC,
        point_id ASC,
        direction ASC
    `);

  return result.recordset;
}

async function getRegressionInputById(regressionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('RegressionId', sql.Int, regressionId)
    .query(`
      SELECT
        regression_id,
        session_id,
        point_id,
        direction,
        x_variable,
        intercept,
        source_type,
        created_at,
        updated_at
      FROM [dbo].[calibration_regression_inputs]
      WHERE regression_id = @RegressionId
    `);

  return result.recordset[0] || null;
}

async function createRegressionInput(sessionId, payload, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .input('PointId', sql.Int, toDbNull(payload.point_id))
    .input('Direction', sql.VarChar(20), payload.direction)
    .input('XVariable', sql.Decimal(18, 12), payload.x_variable)
    .input('Intercept', sql.Decimal(18, 12), payload.intercept)
    .input('SourceType', sql.VarChar(30), payload.source_type || 'MANUAL')
    .query(`
      INSERT INTO [dbo].[calibration_regression_inputs]
      (
        session_id,
        point_id,
        direction,
        x_variable,
        intercept,
        source_type
      )
      OUTPUT INSERTED.regression_id
      VALUES
      (
        @SessionId,
        @PointId,
        @Direction,
        @XVariable,
        @Intercept,
        @SourceType
      )
    `);

  return result.recordset[0].regression_id;
}

async function updateRegressionInput(regressionId, payload, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('RegressionId', sql.Int, regressionId)
    .input('PointId', sql.Int, toDbNull(payload.point_id))
    .input('Direction', sql.VarChar(20), payload.direction)
    .input('XVariable', sql.Decimal(18, 12), payload.x_variable)
    .input('Intercept', sql.Decimal(18, 12), payload.intercept)
    .input('SourceType', sql.VarChar(30), payload.source_type || 'MANUAL')
    .query(`
      UPDATE [dbo].[calibration_regression_inputs]
      SET
        point_id = @PointId,
        direction = @Direction,
        x_variable = @XVariable,
        intercept = @Intercept,
        source_type = @SourceType,
        updated_at = GETDATE()
      WHERE regression_id = @RegressionId
    `);

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function deleteRegressionInput(regressionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('RegressionId', sql.Int, regressionId)
    .query('DELETE FROM [dbo].[calibration_regression_inputs] WHERE regression_id = @RegressionId');

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function getLevelCorrection(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT
        level_correction_id,
        session_id,
        delta_h,
        media_density,
        gravity,
        correction_pascal,
        correction_session_unit,
        session_unit,
        created_at,
        updated_at
      FROM [dbo].[calibration_level_corrections]
      WHERE session_id = @SessionId
    `);

  return result.recordset[0] || null;
}

async function upsertLevelCorrection(sessionId, payload, transaction) {
  const existing = await getLevelCorrection(sessionId, transaction);
  if (!existing) {
    const request = await createRequest(transaction);
    const result = await request
      .input('SessionId', sql.Int, sessionId)
      .input('DeltaH', sql.Decimal(18, 10), payload.delta_h)
      .input('MediaDensity', sql.Decimal(18, 10), payload.media_density)
      .input('Gravity', sql.Decimal(18, 10), payload.gravity)
      .input('CorrectionPascal', sql.Decimal(18, 10), toDbNull(payload.correction_pascal))
      .input(
        'CorrectionSessionUnit',
        sql.Decimal(18, 10),
        toDbNull(payload.correction_session_unit)
      )
      .input('SessionUnit', sql.VarChar(20), payload.session_unit)
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
        OUTPUT INSERTED.level_correction_id
        VALUES
        (
          @SessionId,
          @DeltaH,
          @MediaDensity,
          @Gravity,
          @CorrectionPascal,
          @CorrectionSessionUnit,
          @SessionUnit
        )
      `);

    return result.recordset[0].level_correction_id;
  }

  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('DeltaH', sql.Decimal(18, 10), payload.delta_h)
    .input('MediaDensity', sql.Decimal(18, 10), payload.media_density)
    .input('Gravity', sql.Decimal(18, 10), payload.gravity)
    .input('CorrectionPascal', sql.Decimal(18, 10), toDbNull(payload.correction_pascal))
    .input(
      'CorrectionSessionUnit',
      sql.Decimal(18, 10),
      toDbNull(payload.correction_session_unit)
    )
    .input('SessionUnit', sql.VarChar(20), payload.session_unit)
    .query(`
      UPDATE [dbo].[calibration_level_corrections]
      SET
        delta_h = @DeltaH,
        media_density = @MediaDensity,
        gravity = @Gravity,
        correction_pascal = @CorrectionPascal,
        correction_session_unit = @CorrectionSessionUnit,
        session_unit = @SessionUnit,
        updated_at = GETDATE()
      WHERE session_id = @SessionId
    `);

  return existing.level_correction_id;
}

async function getUncertaintyInputs(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT
        uncertainty_input_id,
        session_id,
        standard_uncertainty,
        metal_rule_uncertainty,
        instrument_resolution,
        indicator_type,
        analog_resolution_factor,
        digital_resolution_factor,
        standard_sensitivity_coefficient,
        metal_rule_sensitivity_coefficient,
        created_at,
        updated_at
      FROM [dbo].[calibration_uncertainty_inputs]
      WHERE session_id = @SessionId
    `);

  return result.recordset[0] || null;
}

async function upsertUncertaintyInputs(sessionId, payload, transaction) {
  const existing = await getUncertaintyInputs(sessionId, transaction);
  if (!existing) {
    const request = await createRequest(transaction);
    const result = await request
      .input('SessionId', sql.Int, sessionId)
      .input('StandardUncertainty', sql.Decimal(18, 10), toDbNull(payload.standard_uncertainty))
      .input('MetalRuleUncertainty', sql.Decimal(18, 10), toDbNull(payload.metal_rule_uncertainty))
      .input('InstrumentResolution', sql.Decimal(18, 10), toDbNull(payload.instrument_resolution))
      .input('IndicatorType', sql.VarChar(20), toDbNull(payload.indicator_type))
      .input(
        'AnalogResolutionFactor',
        sql.Decimal(18, 10),
        payload.analog_resolution_factor === undefined
          ? 0.2
          : payload.analog_resolution_factor
      )
      .input(
        'DigitalResolutionFactor',
        sql.Decimal(18, 10),
        payload.digital_resolution_factor === undefined
          ? 0.5
          : payload.digital_resolution_factor
      )
      .input(
        'StandardSensitivityCoefficient',
        sql.Decimal(18, 10),
        toDbNull(payload.standard_sensitivity_coefficient)
      )
      .input(
        'MetalRuleSensitivityCoefficient',
        sql.Decimal(18, 10),
        toDbNull(payload.metal_rule_sensitivity_coefficient)
      )
      .query(`
        INSERT INTO [dbo].[calibration_uncertainty_inputs]
        (
          session_id,
          standard_uncertainty,
          metal_rule_uncertainty,
          instrument_resolution,
          indicator_type,
          analog_resolution_factor,
          digital_resolution_factor,
          standard_sensitivity_coefficient,
          metal_rule_sensitivity_coefficient
        )
        OUTPUT INSERTED.uncertainty_input_id
        VALUES
        (
          @SessionId,
          @StandardUncertainty,
          @MetalRuleUncertainty,
          @InstrumentResolution,
          @IndicatorType,
          @AnalogResolutionFactor,
          @DigitalResolutionFactor,
          @StandardSensitivityCoefficient,
          @MetalRuleSensitivityCoefficient
        )
      `);

    return result.recordset[0].uncertainty_input_id;
  }

  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('StandardUncertainty', sql.Decimal(18, 10), toDbNull(payload.standard_uncertainty))
    .input('MetalRuleUncertainty', sql.Decimal(18, 10), toDbNull(payload.metal_rule_uncertainty))
    .input('InstrumentResolution', sql.Decimal(18, 10), toDbNull(payload.instrument_resolution))
    .input('IndicatorType', sql.VarChar(20), toDbNull(payload.indicator_type))
    .input(
      'AnalogResolutionFactor',
      sql.Decimal(18, 10),
      payload.analog_resolution_factor === undefined
        ? 0.2
        : payload.analog_resolution_factor
    )
    .input(
      'DigitalResolutionFactor',
      sql.Decimal(18, 10),
      payload.digital_resolution_factor === undefined
        ? 0.5
        : payload.digital_resolution_factor
    )
    .input(
      'StandardSensitivityCoefficient',
      sql.Decimal(18, 10),
      toDbNull(payload.standard_sensitivity_coefficient)
    )
    .input(
      'MetalRuleSensitivityCoefficient',
      sql.Decimal(18, 10),
      toDbNull(payload.metal_rule_sensitivity_coefficient)
    )
    .query(`
      UPDATE [dbo].[calibration_uncertainty_inputs]
      SET
        standard_uncertainty = @StandardUncertainty,
        metal_rule_uncertainty = @MetalRuleUncertainty,
        instrument_resolution = @InstrumentResolution,
        indicator_type = @IndicatorType,
        analog_resolution_factor = @AnalogResolutionFactor,
        digital_resolution_factor = @DigitalResolutionFactor,
        standard_sensitivity_coefficient = @StandardSensitivityCoefficient,
        metal_rule_sensitivity_coefficient = @MetalRuleSensitivityCoefficient,
        updated_at = GETDATE()
      WHERE session_id = @SessionId
    `);

  return existing.uncertainty_input_id;
}

async function deleteDerivedBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[calibration_corrected_readings] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_results] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_uncertainty_components] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[calibration_result_summary] WHERE session_id = @SessionId;
    `);
}

async function insertCorrectedReadings(rows, transaction) {
  for (const row of rows) {
    const request = await createRequest(transaction);
    await request
      .input('SessionId', sql.Int, row.session_id)
      .input('PointId', sql.Int, row.point_id)
      .input('ReadingId', sql.Int, row.reading_id)
      .input('CycleCode', sql.VarChar(10), row.cycle_code)
      .input('Direction', sql.VarChar(20), row.direction)
      .input('UutReading', sql.Decimal(18, 10), toDbNull(row.uut_reading))
      .input(
        'RawStandardReading',
        sql.Decimal(18, 10),
        toDbNull(row.raw_standard_reading)
      )
      .input(
        'CorrectedStandardReading',
        sql.Decimal(18, 10),
        toDbNull(row.corrected_standard_reading)
      )
      .input('XVariable', sql.Decimal(18, 12), toDbNull(row.x_variable))
      .input('Intercept', sql.Decimal(18, 12), toDbNull(row.intercept))
      .query(`
        INSERT INTO [dbo].[calibration_corrected_readings]
        (
          session_id,
          point_id,
          reading_id,
          cycle_code,
          direction,
          uut_reading,
          raw_standard_reading,
          corrected_standard_reading,
          x_variable,
          intercept
        )
        VALUES
        (
          @SessionId,
          @PointId,
          @ReadingId,
          @CycleCode,
          @Direction,
          @UutReading,
          @RawStandardReading,
          @CorrectedStandardReading,
          @XVariable,
          @Intercept
        )
      `);
  }
}

async function insertResults(rows, transaction) {
  for (const row of rows) {
    const request = await createRequest(transaction);
    await request
      .input('SessionId', sql.Int, row.session_id)
      .input('PointId', sql.Int, row.point_id)
      .input('PointOrder', sql.Int, row.point_order)
      .input('NominalValue', sql.Decimal(18, 10), row.nominal_value)
      .input('Unit', sql.VarChar(20), row.unit)
      .input('IncStandardAvg', sql.Decimal(18, 10), toDbNull(row.inc_standard_avg))
      .input('IncUutAvg', sql.Decimal(18, 10), toDbNull(row.inc_uut_avg))
      .input('IncError', sql.Decimal(18, 10), toDbNull(row.inc_error))
      .input('DecStandardAvg', sql.Decimal(18, 10), toDbNull(row.dec_standard_avg))
      .input('DecUutAvg', sql.Decimal(18, 10), toDbNull(row.dec_uut_avg))
      .input('DecError', sql.Decimal(18, 10), toDbNull(row.dec_error))
      .input('Repeatability', sql.Decimal(18, 10), toDbNull(row.repeatability))
      .input('ZeroDeviation', sql.Decimal(18, 10), toDbNull(row.zero_deviation))
      .input('MeanStandard', sql.Decimal(18, 10), toDbNull(row.mean_standard))
      .input('MeanUut', sql.Decimal(18, 10), toDbNull(row.mean_uut))
      .input('LevelCorrection', sql.Decimal(18, 10), toDbNull(row.level_correction))
      .input('FinalError', sql.Decimal(18, 10), toDbNull(row.final_error))
      .query(`
        INSERT INTO [dbo].[calibration_results]
        (
          session_id,
          point_id,
          point_order,
          nominal_value,
          unit,
          inc_standard_avg,
          inc_uut_avg,
          inc_error,
          dec_standard_avg,
          dec_uut_avg,
          dec_error,
          repeatability,
          zero_deviation,
          mean_standard,
          mean_uut,
          level_correction,
          final_error
        )
        VALUES
        (
          @SessionId,
          @PointId,
          @PointOrder,
          @NominalValue,
          @Unit,
          @IncStandardAvg,
          @IncUutAvg,
          @IncError,
          @DecStandardAvg,
          @DecUutAvg,
          @DecError,
          @Repeatability,
          @ZeroDeviation,
          @MeanStandard,
          @MeanUut,
          @LevelCorrection,
          @FinalError
        )
      `);
  }
}

async function insertUncertaintyComponents(rows, transaction) {
  for (const row of rows) {
    const request = await createRequest(transaction);
    await request
      .input('SessionId', sql.Int, row.session_id)
      .input('ComponentOrder', sql.Int, row.component_order)
      .input('ComponentName', sql.VarChar(255), row.component_name)
      .input('Unit', sql.VarChar(20), toDbNull(row.unit))
      .input('UncertaintyType', sql.VarChar(10), toDbNull(row.uncertainty_type))
      .input('Distribution', sql.VarChar(30), toDbNull(row.distribution))
      .input('UValue', sql.Decimal(18, 10), toDbNull(row.u_value))
      .input('Divisor', sql.Decimal(18, 10), toDbNull(row.divisor))
      .input('DegreeFreedom', sql.Decimal(18, 10), toDbNull(row.degree_freedom))
      .input('UiValue', sql.Decimal(18, 10), toDbNull(row.ui_value))
      .input(
        'SensitivityCoefficient',
        sql.Decimal(18, 10),
        toDbNull(row.sensitivity_coefficient)
      )
      .input('Uici', sql.Decimal(18, 10), toDbNull(row.uici))
      .input('UiciSquared', sql.Decimal(18, 10), toDbNull(row.uici_squared))
      .input(
        'UiciFourthOverVi',
        sql.Decimal(18, 10),
        toDbNull(row.uici_fourth_over_vi)
      )
      .input('IsAutoGenerated', sql.Bit, row.is_auto_generated ? 1 : 0)
      .query(`
        INSERT INTO [dbo].[calibration_uncertainty_components]
        (
          session_id,
          component_order,
          component_name,
          unit,
          uncertainty_type,
          distribution,
          u_value,
          divisor,
          degree_freedom,
          ui_value,
          sensitivity_coefficient,
          uici,
          uici_squared,
          uici_fourth_over_vi,
          is_auto_generated
        )
        VALUES
        (
          @SessionId,
          @ComponentOrder,
          @ComponentName,
          @Unit,
          @UncertaintyType,
          @Distribution,
          @UValue,
          @Divisor,
          @DegreeFreedom,
          @UiValue,
          @SensitivityCoefficient,
          @Uici,
          @UiciSquared,
          @UiciFourthOverVi,
          @IsAutoGenerated
        )
      `);
  }
}

async function upsertResultSummary(sessionId, summary, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('CombinedUncertainty', sql.Decimal(18, 10), toDbNull(summary.combined_uncertainty))
    .input(
      'EffectiveDegreeFreedom',
      sql.Decimal(18, 10),
      toDbNull(summary.effective_degree_freedom)
    )
    .input('CoverageFactor', sql.Decimal(18, 10), toDbNull(summary.coverage_factor))
    .input('ExpandedUncertainty', sql.Decimal(18, 10), toDbNull(summary.expanded_uncertainty))
    .query(`
      IF EXISTS (SELECT 1 FROM [dbo].[calibration_result_summary] WHERE session_id = @SessionId)
      BEGIN
        UPDATE [dbo].[calibration_result_summary]
        SET
          combined_uncertainty = @CombinedUncertainty,
          effective_degree_freedom = @EffectiveDegreeFreedom,
          coverage_factor = @CoverageFactor,
          expanded_uncertainty = @ExpandedUncertainty,
          created_at = GETDATE()
        WHERE session_id = @SessionId
      END
      ELSE
      BEGIN
        INSERT INTO [dbo].[calibration_result_summary]
        (
          session_id,
          combined_uncertainty,
          effective_degree_freedom,
          coverage_factor,
          expanded_uncertainty
        )
        VALUES
        (
          @SessionId,
          @CombinedUncertainty,
          @EffectiveDegreeFreedom,
          @CoverageFactor,
          @ExpandedUncertainty
        )
      END
    `);
}

async function getCorrectedReadings(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT
        corrected_id,
        session_id,
        point_id,
        reading_id,
        cycle_code,
        direction,
        uut_reading,
        raw_standard_reading,
        corrected_standard_reading,
        x_variable,
        intercept,
        created_at
      FROM [dbo].[calibration_corrected_readings]
      WHERE session_id = @SessionId
      ORDER BY point_id, cycle_code
    `);
  return result.recordset;
}

async function getResults(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT
        r.result_id,
        r.session_id,
        r.point_id,
        r.point_order,
        r.nominal_value,
        r.unit,
        r.inc_standard_avg,
        r.inc_uut_avg,
        r.inc_error,
        r.dec_standard_avg,
        r.dec_uut_avg,
        r.dec_error,
        r.repeatability,
        r.zero_deviation,
        r.mean_standard,
        r.mean_uut,
        r.level_correction,
        r.final_error,
        r.created_at
      FROM [dbo].[calibration_results] r
      WHERE r.session_id = @SessionId
      ORDER BY r.point_order ASC, r.point_id ASC
    `);
  return result.recordset;
}

async function getSummary(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT
        summary_id,
        session_id,
        combined_uncertainty,
        effective_degree_freedom,
        coverage_factor,
        expanded_uncertainty,
        created_at
      FROM [dbo].[calibration_result_summary]
      WHERE session_id = @SessionId
    `);

  return result.recordset[0] || null;
}

async function getUncertaintyComponents(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT
        component_id,
        session_id,
        component_order,
        component_name,
        unit,
        uncertainty_type,
        distribution,
        u_value,
        divisor,
        degree_freedom,
        ui_value,
        sensitivity_coefficient,
        uici,
        uici_squared,
        uici_fourth_over_vi,
        is_auto_generated,
        created_at
      FROM [dbo].[calibration_uncertainty_components]
      WHERE session_id = @SessionId
      ORDER BY component_order ASC
    `);
  return result.recordset;
}

async function insertAuditLog(payload, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, toDbNull(payload.session_id))
    .input('EntityName', sql.VarChar(100), payload.entity_name)
    .input('EntityId', sql.Int, toDbNull(payload.entity_id))
    .input('ActionType', sql.VarChar(20), payload.action_type)
    .input('OldValue', sql.VarChar(sql.MAX), toDbNull(payload.old_value))
    .input('NewValue', sql.VarChar(sql.MAX), toDbNull(payload.new_value))
    .input('ChangedBy', sql.VarChar(100), toDbNull(payload.changed_by))
    .query(`
      INSERT INTO [dbo].[calibration_audit_logs]
      (
        session_id,
        entity_name,
        entity_id,
        action_type,
        old_value,
        new_value,
        changed_by
      )
      VALUES
      (
        @SessionId,
        @EntityName,
        @EntityId,
        @ActionType,
        @OldValue,
        @NewValue,
        @ChangedBy
      )
    `);
}

async function listPressureConversions(transaction) {
  const request = await createRequest(transaction);
  const result = await request.query(`
    SELECT
      conversion_id,
      from_unit,
      to_unit,
      factor,
      created_at
    FROM [dbo].[pressure_conversion_factors]
    ORDER BY from_unit ASC, to_unit ASC
  `);

  return result.recordset;
}

async function createPressureConversion(payload, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('FromUnit', sql.VarChar(20), payload.from_unit)
    .input('ToUnit', sql.VarChar(20), payload.to_unit)
    .input('Factor', sql.Decimal(24, 12), payload.factor)
    .query(`
      INSERT INTO [dbo].[pressure_conversion_factors] (from_unit, to_unit, factor)
      OUTPUT INSERTED.conversion_id
      VALUES (@FromUnit, @ToUnit, @Factor)
    `);

  return result.recordset[0].conversion_id;
}

async function updatePressureConversion(conversionId, payload, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('ConversionId', sql.Int, conversionId)
    .input('FromUnit', sql.VarChar(20), payload.from_unit)
    .input('ToUnit', sql.VarChar(20), payload.to_unit)
    .input('Factor', sql.Decimal(24, 12), payload.factor)
    .query(`
      UPDATE [dbo].[pressure_conversion_factors]
      SET
        from_unit = @FromUnit,
        to_unit = @ToUnit,
        factor = @Factor
      WHERE conversion_id = @ConversionId
    `);

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function deletePressureConversion(conversionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('ConversionId', sql.Int, conversionId)
    .query('DELETE FROM [dbo].[pressure_conversion_factors] WHERE conversion_id = @ConversionId');

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function listTemplateHeaders(transaction) {
  const request = await createRequest(transaction);
  const result = await request.query(`
    SELECT template_id, template_code, template_name, unit_mode, created_at
    FROM [dbo].[calibration_point_templates]
    ORDER BY template_code
  `);
  return result.recordset;
}

async function getTemplateByCode(templateCode, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('TemplateCode', sql.VarChar(100), templateCode)
    .query(`
      SELECT template_id, template_code, template_name, unit_mode, created_at
      FROM [dbo].[calibration_point_templates]
      WHERE template_code = @TemplateCode
    `);
  return result.recordset[0] || null;
}

async function upsertTemplate(template, transaction) {
  const existing = await getTemplateByCode(template.template_code, transaction);
  if (existing) {
    const request = await createRequest(transaction);
    await request
      .input('TemplateId', sql.Int, existing.template_id)
      .input('TemplateName', sql.VarChar(255), template.template_name)
      .input('UnitMode', sql.VarChar(20), template.unit_mode)
      .query(`
        UPDATE [dbo].[calibration_point_templates]
        SET template_name = @TemplateName, unit_mode = @UnitMode
        WHERE template_id = @TemplateId
      `);
    return existing.template_id;
  }

  const request = await createRequest(transaction);
  const result = await request
    .input('TemplateCode', sql.VarChar(100), template.template_code)
    .input('TemplateName', sql.VarChar(255), template.template_name)
    .input('UnitMode', sql.VarChar(20), template.unit_mode)
    .query(`
      INSERT INTO [dbo].[calibration_point_templates]
      (template_code, template_name, unit_mode)
      OUTPUT INSERTED.template_id
      VALUES (@TemplateCode, @TemplateName, @UnitMode)
    `);
  return result.recordset[0].template_id;
}

async function replaceTemplateItems(templateId, items, transaction) {
  const deleteRequest = await createRequest(transaction);
  await deleteRequest
    .input('TemplateId', sql.Int, templateId)
    .query('DELETE FROM [dbo].[calibration_point_template_items] WHERE template_id = @TemplateId');

  for (const item of items) {
    const request = await createRequest(transaction);
    await request
      .input('TemplateId', sql.Int, templateId)
      .input('PointOrder', sql.Int, item.point_order)
      .input('NominalValue', sql.Decimal(18, 10), item.nominal_value)
      .query(`
        INSERT INTO [dbo].[calibration_point_template_items]
        (template_id, point_order, nominal_value)
        VALUES (@TemplateId, @PointOrder, @NominalValue)
      `);
  }
}

async function listTekananDaCandidates(filters = {}, transaction) {
  const request = await createRequest(transaction);
  const where = ["A.Parameter_Sertifikasi = 'Tekanan'"];

  if (filters.qa_id) {
    request.input('QaId', sql.VarChar(50), filters.qa_id);
    where.push('A.QA_ID = @QaId');
  } else {
    if (filters.instrument_code) {
      request.input('InstrumentCode', sql.VarChar(255), filters.instrument_code);
      where.push(`
        (
          A.Assm_No_identitas_Istrumen = @InstrumentCode
          OR A.Assm_No_identitas_kalibrasi = @InstrumentCode
        )
      `);
    }
    if (filters.instrument_name) {
      request.input('InstrumentName', sql.VarChar(255), filters.instrument_name);
      where.push('A.Assm_nama_instrumen = @InstrumentName');
    }
  }

  const result = await request.query(`
    SELECT TOP 20
      A.QA_ID,
      A.Jenis_kalibrasi,
      A.Parameter_Sertifikasi,
      A.Assm_nama_instrumen,
      A.Assm_No_identitas_Istrumen,
      A.Assm_No_identitas_kalibrasi,
      A.Group_Da_Dept,
      A.Assm_Kapasitas,
      A.Parameter_Kalibrasi,
      A.Assm_Lokasi,
      A.Parameter_Interval,
      A.Catatan
    FROM T_Kalibrasi_DA_Bagian AS A
    WHERE ${where.join('\n      AND ')}
    ORDER BY A.QA_ID ASC
  `);

  return result.recordset;
}

async function getDaBagianByQaId(qaId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('QaId', sql.VarChar(50), qaId)
    .query(`
      SELECT TOP 1
        QA_ID,
        Jenis_kalibrasi,
        Parameter_Sertifikasi,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        Tgl_kalibrasi,
        Parameter_Interval,
        Kalibrasi_selanjutnya,
        Catatan
      FROM T_Kalibrasi_DA_Bagian
      WHERE QA_ID = @QaId
    `);

  return result.recordset[0] || null;
}

async function upsertDaBagian(payload, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('QaId', sql.VarChar(50), payload.qa_id)
    .input('JenisKalibrasi', sql.VarChar(50), toDbNull(payload.jenis_kalibrasi))
    .input('ParameterSertifikasi', sql.VarChar(100), toDbNull(payload.parameter_sertifikasi))
    .input('AssmNamaInstrumen', sql.VarChar(255), toDbNull(payload.assm_nama_instrumen))
    .input('AssmNoIdentitasIstrumen', sql.VarChar(255), toDbNull(payload.assm_no_identitas_istrumen))
    .input('AssmNoIdentitasKalibrasi', sql.VarChar(255), toDbNull(payload.assm_no_identitas_kalibrasi))
    .input('GroupDaDept', sql.VarChar(255), toDbNull(payload.group_da_dept))
    .input('AssmKapasitas', sql.VarChar(255), toDbNull(payload.assm_kapasitas))
    .input('ParameterKalibrasi', sql.VarChar(255), toDbNull(payload.parameter_kalibrasi))
    .input('AssmLokasi', sql.VarChar(255), toDbNull(payload.assm_lokasi))
    .input('TglKalibrasi', sql.DateTime, toDbNull(payload.tgl_kalibrasi))
    .input('ParameterIntervalInt', sql.Int, toDbNull(payload.parameter_interval_int))
    .input('ParameterIntervalText', sql.VarChar(50), toDbNull(payload.parameter_interval_text))
    .input('Catatan', sql.VarChar(1000), toDbNull(payload.catatan))
    .input('UserId', sql.VarChar(100), toDbNull(payload.user_id))
    .input('DelegatedTo', sql.VarChar(100), toDbNull(payload.delegated_to))
    .query(`
      IF EXISTS (SELECT 1 FROM T_Kalibrasi_DA_Bagian WHERE QA_ID = @QaId)
      BEGIN
        UPDATE T_Kalibrasi_DA_Bagian
        SET
          Jenis_kalibrasi = @JenisKalibrasi,
          Parameter_Sertifikasi = @ParameterSertifikasi,
          Assm_nama_instrumen = @AssmNamaInstrumen,
          Assm_No_identitas_Istrumen = @AssmNoIdentitasIstrumen,
          Assm_No_identitas_kalibrasi = @AssmNoIdentitasKalibrasi,
          Group_Da_Dept = @GroupDaDept,
          Assm_Kapasitas = @AssmKapasitas,
          Parameter_Kalibrasi = @ParameterKalibrasi,
          Assm_Lokasi = @AssmLokasi,
          Tgl_kalibrasi = @TglKalibrasi,
          Parameter_Interval = @ParameterIntervalText,
          Kalibrasi_selanjutnya = DATEADD(MONTH, @ParameterIntervalInt, @TglKalibrasi),
          Catatan = @Catatan,
          UserID = @UserId,
          Delegated_To = @DelegatedTo,
          Process_date = GETDATE()
        WHERE QA_ID = @QaId
      END
      ELSE
      BEGIN
        INSERT INTO T_Kalibrasi_DA_Bagian
        (
          QA_ID,
          Jenis_kalibrasi,
          Parameter_Sertifikasi,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Assm_Lokasi,
          Tgl_kalibrasi,
          Parameter_Interval,
          Kalibrasi_selanjutnya,
          Catatan,
          UserID,
          Delegated_To,
          Process_date
        )
        VALUES
        (
          @QaId,
          @JenisKalibrasi,
          @ParameterSertifikasi,
          @AssmNamaInstrumen,
          @AssmNoIdentitasIstrumen,
          @AssmNoIdentitasKalibrasi,
          @GroupDaDept,
          @AssmKapasitas,
          @ParameterKalibrasi,
          @AssmLokasi,
          @TglKalibrasi,
          @ParameterIntervalText,
          DATEADD(MONTH, @ParameterIntervalInt, @TglKalibrasi),
          @Catatan,
          @UserId,
          @DelegatedTo,
          GETDATE()
        )
      END
    `);
}

async function deleteDaBagianStatusByQaId(qaId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('QaId', sql.VarChar(50), qaId)
    .query(`
      DELETE FROM T_Kalibrasi_DA_Bagian_status
      WHERE QA_ID = @QaId
    `);
}

async function getApproverIdentity(applicationCode, approverNo, userId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('ApplicationCode', sql.VarChar(100), applicationCode)
    .input('ApproverNo', sql.Int, approverNo)
    .input('UserId', sql.VarChar(100), userId)
    .query(`
      SELECT TOP 1 Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE @ApplicationCode
        AND Appr_No = @ApproverNo
        AND Appr_ID = @UserId
    `);

  return result.recordset[0]?.Appr_Identity || null;
}

async function insertDaBagianStatus(payload, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('QaId', sql.VarChar(50), payload.qa_id)
    .input('ApproverNo', sql.Int, payload.approver_no)
    .input('IsReject', sql.Bit, payload.is_reject ? 1 : 0)
    .input('ApproverIdentity', sql.VarChar(100), payload.approver_identity)
    .input('UserId', sql.VarChar(100), toDbNull(payload.user_id))
    .input('DelegatedTo', sql.VarChar(100), toDbNull(payload.delegated_to))
    .query(`
      INSERT INTO T_Kalibrasi_DA_Bagian_status
      (
        QA_ID,
        Approver_No,
        isReject,
        Approver_Identity,
        Process_Date,
        User_ID,
        Delegated_To,
        flag_update
      )
      VALUES
      (
        @QaId,
        @ApproverNo,
        @IsReject,
        @ApproverIdentity,
        GETDATE(),
        @UserId,
        @DelegatedTo,
        NULL
      )
    `);
}

async function getSertifikatBagianHeader(qaId, idNoSertifikat, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('QaId', sql.VarChar(50), qaId)
    .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
    .query(`
      SELECT TOP 1
        QA_ID,
        ID_No_Sertifikat,
        Assm_nama_instrumen,
        Assm_No_identitas_kalibrasi,
        Assm_Merk,
        SERIAL_NUMBER,
        Assm_Kapasitas,
        Assm_Lokasi,
        Nama,
        No_Ident_No_batch,
        No_Sertifikat,
        Tertelusur_melalui,
        Rekalibrasi,
        Tgl_kalibrasi,
        Interval,
        Metode_kalibrasi,
        Suhu_Kelembaban,
        Catatan
      FROM T_Kalibrasi_Sertifikat_Bagian
      WHERE QA_ID = @QaId
        AND ID_No_Sertifikat = @IdNoSertifikat
    `);

  return result.recordset[0] || null;
}

async function getNextTekananCertificateNumber(transaction) {
  // Dipertahankan untuk pemanggil lama (modul Tekanan). Setara getNextCertificateNumberByCode('P').
  return getNextCertificateNumberByCode('P', transaction);
}

/**
 * Generate nomor sertifikat berikutnya sesuai KODE parameter kalibrasi.
 * Memanggil fungsi SQL dbo.fnGetKal_Ser_<KODE>_No_ID() yang sesuai
 * (mis. 'R' utk Timer, 'M' utk Timbangan, 'P' utk Tekanan).
 *
 * Acuan kode: src/constants/certificateTypeCodes.js
 *
 * @param {string} code - kode huruf parameter (mis. 'R', 'M', 'P')
 * @param {object} [transaction]
 * @returns {Promise<string|null>}
 */
async function getNextCertificateNumberByCode(code, transaction) {
  const normalized = String(code || '').toUpperCase().trim();
  if (!hasCertificateGenerator(normalized)) {
    const err = new Error(
      `Belum tersedia generator nomor sertifikat untuk kode "${normalized || '(kosong)'}". ` +
        'Hubungi tim DB untuk menambahkan fungsi dbo.fnGetKal_Ser_' +
        `${normalized || 'X'}_No_ID().`
    );
    err.statusCode = 500;
    throw err;
  }
  // `normalized` sudah ter-whitelist (hanya A-Z dari daftar kode), aman diinterpolasi.
  const request = await createRequest(transaction);
  try {
    const result = await request.query(`
      SELECT dbo.fnGetKal_Ser_${normalized}_No_ID() AS id_no_sertifikat
    `);
    return result.recordset[0]?.id_no_sertifikat || null;
  } catch (err) {
    const message = err?.message || String(err);
    if (/conversion failed.*nvarchar.*int/i.test(message)) {
      const wrapped = new Error(
        `Generator nomor sertifikat dbo.fnGetKal_Ser_${normalized}_No_ID() gagal karena konversi data di SQL Server. ` +
          `Kemungkinan: kolom Group_Da_Dept / kode departemen pada T_Kalibrasi_DA_Bagian mengandung nilai non-numerik (mis. 'Q00') ` +
          `sedang fungsi SQL mencoba mengubahnya ke INT. Periksa dan perbaiki definisi fungsi SQL, atau isi id_no_sertifikat manual lewat request.`
      );
      wrapped.statusCode = 500;
      wrapped.originalError = err;
      throw wrapped;
    }
    throw err;
  }
}

async function createSertifikatBagianDraftFromDa(
  qaId,
  idNoSertifikat,
  userId,
  delegatedTo,
  transaction
) {
  const request = await createRequest(transaction);
  const result = await request
    .input('QaId', sql.VarChar(50), qaId)
    .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
    .input('UserId', sql.VarChar(100), toDbNull(userId))
    .input('DelegatedTo', sql.VarChar(100), toDbNull(delegatedTo))
    .query(`
      INSERT INTO T_Kalibrasi_Sertifikat_Bagian
        (
          QA_ID,
          ID_No_sertifikat,
          Jenis_kalibrasi,
          parameter_sertifikasi,
          isSert_Manual,
          Tgl,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Assm_Kapasitas,
          Assm_Lokasi,
          Group_Da_Dept,
          Parameter_Kalibrasi,
          UserID,
          Delegated_To,
          Process_date
        )
      SELECT
        QA_ID,
        @IdNoSertifikat AS ID_No_sertifikat,
        Jenis_kalibrasi,
        parameter_sertifikasi,
        1,
        GETDATE() AS Tgl,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Assm_Kapasitas,
        Assm_Lokasi,
        Group_Da_Dept,
        Parameter_Kalibrasi,
        @UserId AS UserID,
        @DelegatedTo AS Delegated_To,
        GETDATE() AS Process_date
      FROM T_Kalibrasi_DA_Bagian
      WHERE QA_ID = @QaId
        AND Parameter_Sertifikasi = 'Tekanan'
    `);

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function updateSertifikatBagianHeader(payload, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('QaId', sql.VarChar(50), payload.qa_id)
    .input('IdNoSertifikat', sql.VarChar(50), payload.id_no_sertifikat)
    .input('AssmNamaInstrumen', sql.VarChar(255), toDbNull(payload.assm_nama_instrumen))
    .input('AssmNoIdentitasKalibrasi', sql.VarChar(255), toDbNull(payload.assm_no_identitas_kalibrasi))
    .input('AssmKapasitas', sql.VarChar(255), toDbNull(payload.assm_kapasitas))
    .input('AssmLokasi', sql.VarChar(255), toDbNull(payload.assm_lokasi))
    .input('Nama', sql.VarChar(255), toDbNull(payload.nama))
    .input('NoIdentNoBatch', sql.VarChar(255), toDbNull(payload.no_ident_no_batch))
    .input('NoSertifikat', sql.VarChar(255), toDbNull(payload.no_sertifikat))
    .input('TertelusurMelalui', sql.VarChar(255), toDbNull(payload.tertelusur_melalui))
    .input('Rekalibrasi', sql.VarChar(255), toDbNull(payload.rekalibrasi))
    .input('TglKalibrasi', sql.DateTime, toDbNull(payload.tgl_kalibrasi))
    .input('IntervalValue', sql.Int, toDbNull(payload.interval))
    .input('MetodeKalibrasi', sql.VarChar(255), toDbNull(payload.metode_kalibrasi))
    .input('SuhuKelembaban', sql.VarChar(255), toDbNull(payload.suhu_kelembaban))
    .input('Catatan', sql.VarChar(1000), toDbNull(payload.catatan))
    .input('UserId', sql.VarChar(100), toDbNull(payload.user_id))
    .input('DelegatedTo', sql.VarChar(100), toDbNull(payload.delegated_to))
    .query(`
      UPDATE T_Kalibrasi_Sertifikat_Bagian
      SET
        Assm_nama_instrumen = @AssmNamaInstrumen,
        Assm_No_identitas_kalibrasi = @AssmNoIdentitasKalibrasi,
        Assm_Kapasitas = @AssmKapasitas,
        Assm_Lokasi = @AssmLokasi,
        Nama = @Nama,
        No_Ident_No_batch = @NoIdentNoBatch,
        No_Sertifikat = @NoSertifikat,
        Tertelusur_melalui = @TertelusurMelalui,
        Rekalibrasi = @Rekalibrasi,
        Tgl_kalibrasi = @TglKalibrasi,
        Interval = @IntervalValue,
        Metode_kalibrasi = @MetodeKalibrasi,
        Suhu_Kelembaban = @SuhuKelembaban,
        Catatan = @Catatan,
        UserID = @UserId,
        Delegated_To = @DelegatedTo,
        Process_date = GETDATE()
      WHERE QA_ID = @QaId
        AND ID_No_Sertifikat = @IdNoSertifikat
    `);

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function replaceSertifikatBagianHasilKalRows(
  qaId,
  idNoSertifikat,
  rows,
  userId,
  delegatedTo,
  transaction
) {
  const deleteRequest = await createRequest(transaction);
  await deleteRequest
    .input('QaId', sql.VarChar(50), qaId)
    .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
    .query(`
      DELETE FROM T_Kalibrasi_Sertifikat_Bagian_Hasil_Kal
      WHERE QA_ID = @QaId
        AND ID_No_Sertifikat = @IdNoSertifikat
    `);

  for (const row of rows) {
    const request = await createRequest(transaction);
    await request
      .input('QaId', sql.VarChar(50), qaId)
      .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
      .input('SeqId', sql.Int, row.seq_id)
      .input('PembacaanAlat', sql.Decimal(18, 10), row.pembacaan_alat)
      .input('PembacaanStandar', sql.Decimal(18, 10), row.pembacaan_standar)
      .input('ErrorValue', sql.Decimal(18, 10), row.error)
      .input('Ketidakpastian', sql.Decimal(18, 10), row.ketidakpastian)
      .input('UserId', sql.VarChar(100), toDbNull(userId))
      .input('DelegatedTo', sql.VarChar(100), toDbNull(delegatedTo))
      .query(`
        INSERT INTO T_Kalibrasi_Sertifikat_Bagian_Hasil_Kal
          (
            QA_ID,
            ID_No_Sertifikat,
            Seq_ID,
            Pembacaan_Alat,
            Pembacaan_standar,
            Error,
            Ketidakpastian,
            UserID,
            Delegated_To,
            Process_date
          )
        VALUES
          (
            @QaId,
            @IdNoSertifikat,
            @SeqId,
            @PembacaanAlat,
            @PembacaanStandar,
            @ErrorValue,
            @Ketidakpastian,
            @UserId,
            @DelegatedTo,
            GETDATE()
          )
      `);
  }
}

module.exports = {
  getPool,
  createRequest,
  listSessions,
  getSessionById,
  createSession,
  updateSession,
  updateSessionStatus,
  updateSessionApproval,
  clearSessionApprovals,
  resetSessionApprovals,
  updateEvaluationResult,
  deleteSessionHard,
  deleteSessionGraph,
  listPoints,
  getPointById,
  createPoint,
  updatePoint,
  deactivatePoint,
  listReadings,
  getReadingById,
  createReading,
  updateReading,
  deleteReading,
  findReadingBySessionPointCycle,
  bulkUpsertReadings,
  listRegressionInputs,
  getRegressionInputById,
  createRegressionInput,
  updateRegressionInput,
  deleteRegressionInput,
  getLevelCorrection,
  upsertLevelCorrection,
  getUncertaintyInputs,
  upsertUncertaintyInputs,
  deleteDerivedBySession,
  insertCorrectedReadings,
  insertResults,
  insertUncertaintyComponents,
  upsertResultSummary,
  getCorrectedReadings,
  getResults,
  getSummary,
  getUncertaintyComponents,
  insertAuditLog,
  listPressureConversions,
  createPressureConversion,
  updatePressureConversion,
  deletePressureConversion,
  listTemplateHeaders,
  getTemplateByCode,
  upsertTemplate,
  replaceTemplateItems,
  listTekananDaCandidates,
  getDaBagianByQaId,
  upsertDaBagian,
  deleteDaBagianStatusByQaId,
  getApproverIdentity,
  insertDaBagianStatus,
  getSertifikatBagianHeader,
  getNextTekananCertificateNumber,
  getNextCertificateNumberByCode,
  createSertifikatBagianDraftFromDa,
  updateSertifikatBagianHeader,
  replaceSertifikatBagianHasilKalRows,
};
