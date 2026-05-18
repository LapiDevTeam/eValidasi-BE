'use strict';

/**
 * pressure-calibration.repository.js
 *
 * All MSSQL queries for the pressure calibration module.
 * Uses raw `mssql` package with named parameterized inputs.
 * Compatible with SQL Server 2008+.
 * No string-interpolated user input anywhere in this file.
 *
 * INSTRUMENT SOURCE
 * -----------------
 * Instruments are spread across multiple existing calibration DA tables,
 * unified by QA_ID (nvarchar 50). The same UNION query used by
 * searchInstrumen in input-permohonan-kalibrasi.controller.js is reused
 * here so that listInstruments/getInstrumentById always reflect the same
 * instrument universe.
 *
 * Tables: T_Kalibrasi_DA_Thermohygro, T_Kalibrasi_DA_Anak_Timbangan,
 *         T_Kalibrasi_DA_Timbangan, T_Kalibrasi_DA_Bagian,
 *         RA_CalibrationAssessment
 */

const sql = require('mssql');
const { configMssql } = require('../config/configMssql');

// Shared connection pool
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

// =============================================================================
// INSTRUMENT  (read-only – unified view across all DA calibration tables)
// =============================================================================

/**
 * The canonical UNION subquery that combines all instrument sources.
 * Returns one row per unique QA_ID (takes the latest Kalibrasi_selanjutnya).
 * Output columns: qa_id, instrument_name, instrument_code, calibration_id,
 *                 department, capacity, parameter, location, next_calibration_date
 */
const INSTRUMENT_UNION_SQL = `
  SELECT
    QA_ID                        AS qa_id,
    Assm_nama_instrumen          AS instrument_name,
    Assm_No_identitas_Istrumen   AS instrument_code,
    Assm_No_identitas_kalibrasi  AS calibration_id,
    Group_Da_Dept                AS department,
    Assm_Kapasitas               AS capacity,
    Parameter_Kalibrasi          AS parameter,
    Assm_Lokasi                  AS location,
    MAX(Kalibrasi_selanjutnya)   AS next_calibration_date
  FROM (
    SELECT DISTINCT QA_ID, Assm_nama_instrumen, Assm_No_identitas_Istrumen,
      Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas,
      Parameter_Kalibrasi, Assm_Lokasi, Kalibrasi_selanjutnya
    FROM T_Kalibrasi_DA_Thermohygro
    UNION ALL
    SELECT DISTINCT QA_ID, Assm_nama_instrumen, Assm_No_identitas_Istrumen,
      Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas,
      Parameter_Kalibrasi, Assm_Lokasi, Kalibrasi_selanjutnya
    FROM T_Kalibrasi_DA_Anak_Timbangan
    UNION ALL
    SELECT DISTINCT QA_ID, Assm_nama_instrumen, Assm_No_identitas_Istrumen,
      Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas,
      Parameter_Kalibrasi, Assm_Lokasi, Kalibrasi_selanjutnya
    FROM T_Kalibrasi_DA_Timbangan
    UNION ALL
    SELECT DISTINCT QA_ID, Assm_nama_instrumen, Assm_No_identitas_Istrumen,
      Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas,
      Parameter_Kalibrasi, Assm_Lokasi, Kalibrasi_selanjutnya
    FROM T_Kalibrasi_DA_Bagian
    UNION ALL
    SELECT DISTINCT
      QA_ID,
      InstrumentName         AS Assm_nama_instrumen,
      InstrumentCode         AS Assm_No_identitas_Istrumen,
      Assm_No_identitas_kalibrasi,
      Group_Da_Dept,
      Assm_Kapasitas,
      Parameter_Kalibrasi,
      Location               AS Assm_Lokasi,
      NULL                   AS Kalibrasi_selanjutnya
    FROM RA_CalibrationAssessment
    WHERE IsDeleted = 0
  ) AS src
  GROUP BY
    QA_ID, Assm_nama_instrumen, Assm_No_identitas_Istrumen,
    Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas,
    Parameter_Kalibrasi, Assm_Lokasi
`;

/**
 * List all instruments.
 * Supports optional text search (qa_id / name / code / calibration_id).
 *
 * @param {string} [search] - optional search string
 * @returns {Promise<Array>}
 */
async function listInstruments(search) {
  const pool = await getPool();

  let query = `SELECT * FROM (${INSTRUMENT_UNION_SQL}) AS instruments`;

  const request = pool.request();
  if (search) {
    request.input('Search', sql.NVarChar(100), `%${search}%`);
    query += `
      WHERE qa_id           LIKE @Search
         OR instrument_name LIKE @Search
         OR instrument_code LIKE @Search
         OR calibration_id  LIKE @Search`;
  }
  query += ` ORDER BY instrument_name`;

  const result = await request.query(query);
  return result.recordset;
}

/**
 * Get one instrument by QA_ID.
 *
 * @param {string} qaId
 * @returns {Promise<object|null>}
 */
async function getInstrumentById(qaId) {
  const pool = await getPool();

  const result = await pool.request()
    .input('QaId', sql.NVarChar(50), qaId)
    .query(`
      SELECT * FROM (${INSTRUMENT_UNION_SQL}) AS instruments
      WHERE qa_id = @QaId
    `);

  return result.recordset[0] || null;
}

// =============================================================================
// CALIBRATION STANDARDS
// =============================================================================

async function listStandards() {
  const request = await createRequest();
  const result = await request.query(`
    SELECT
      s.standard_id, s.standard_code, s.standard_name,
      s.certificate_no, s.traceability, s.recalibration_date, s.unit, s.created_at,
      (
        SELECT COUNT(1)
        FROM [dbo].[calibration_standard_points] p
        WHERE p.standard_id = s.standard_id
      ) AS point_count
    FROM [dbo].[calibration_standards] s
    WHERE s.is_deleted = 0
    ORDER BY standard_name
  `);
  return result.recordset;
}

async function getStandardById(id) {
  const request = await createRequest();
  const result = await request
    .input('Id', sql.Int, id)
    .query(`
      SELECT
        s.standard_id, s.standard_code, s.standard_name,
        s.certificate_no, s.traceability, s.recalibration_date, s.unit, s.created_at,
        (
          SELECT COUNT(1)
          FROM [dbo].[calibration_standard_points] p
          WHERE p.standard_id = s.standard_id
        ) AS point_count
      FROM [dbo].[calibration_standards] s
      WHERE s.standard_id = @Id AND s.is_deleted = 0
    `);
  return result.recordset[0] || null;
}

async function createStandard(data, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('StandardCode',       sql.VarChar(50),  data.standardCode       || null)
    .input('StandardName',       sql.VarChar(255), data.standardName)
    .input('CertificateNo',      sql.VarChar(100), data.certificateNo      || null)
    .input('Traceability',       sql.VarChar(255), data.traceability       || null)
    .input('RecalibrationDate',  sql.Date,         data.recalibrationDate  || null)
    .input('Unit',               sql.VarChar(20),  data.unit               || null)
    .query(`
      INSERT INTO [dbo].[calibration_standards]
        (standard_code, standard_name, certificate_no, traceability, recalibration_date, unit)
      OUTPUT INSERTED.standard_id
      VALUES
        (@StandardCode, @StandardName, @CertificateNo, @Traceability, @RecalibrationDate, @Unit)
    `);
  return result.recordset[0].standard_id;
}

async function updateStandard(id, data, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('Id',                 sql.Int,          id)
    .input('StandardCode',       sql.VarChar(50),  data.standardCode       || null)
    .input('StandardName',       sql.VarChar(255), data.standardName)
    .input('CertificateNo',      sql.VarChar(100), data.certificateNo      || null)
    .input('Traceability',       sql.VarChar(255), data.traceability       || null)
    .input('RecalibrationDate',  sql.Date,         data.recalibrationDate  || null)
    .input('Unit',               sql.VarChar(20),  data.unit               || null)
    .query(`
      UPDATE [dbo].[calibration_standards]
      SET
        standard_code      = @StandardCode,
        standard_name      = @StandardName,
        certificate_no     = @CertificateNo,
        traceability       = @Traceability,
        recalibration_date = @RecalibrationDate,
        unit               = @Unit
      WHERE standard_id = @Id
        AND is_deleted = 0
    `);

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function softDeleteStandard(id, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('Id', sql.Int, id)
    .query(`
      UPDATE [dbo].[calibration_standards]
      SET is_deleted = 1
      WHERE standard_id = @Id
        AND is_deleted = 0
    `);

  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

// =============================================================================
// CALIBRATION STANDARD POINTS (certificate correction data)
// =============================================================================

async function getStandardPoints(standardId) {
  const request = await createRequest();
  const result = await request
    .input('StandardId', sql.Int, standardId)
    .query(`
      SELECT
        point_id, standard_id,
        actual_pressure, indicator_increasing, indicator_decreasing,
        uncertainty, unit
      FROM [dbo].[calibration_standard_points]
      WHERE standard_id = @StandardId
      ORDER BY actual_pressure
    `);
  return result.recordset;
}

async function insertStandardPoint(data, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('StandardId',           sql.Int,           data.standardId)
    .input('ActualPressure',       sql.Decimal(18,10), data.actualPressure)
    .input('IndicatorIncreasing',  sql.Decimal(18,10), data.indicatorIncreasing)
    .input('IndicatorDecreasing',  sql.Decimal(18,10), data.indicatorDecreasing)
    .input('Uncertainty',          sql.Decimal(18,10), data.uncertainty        ?? 0)
    .input('Unit',                 sql.VarChar(20),    data.unit               || null)
    .query(`
      INSERT INTO [dbo].[calibration_standard_points]
        (standard_id, actual_pressure, indicator_increasing, indicator_decreasing, uncertainty, unit)
      OUTPUT INSERTED.point_id
      VALUES
        (@StandardId, @ActualPressure, @IndicatorIncreasing, @IndicatorDecreasing, @Uncertainty, @Unit)
    `);
  return result.recordset[0].point_id;
}

async function replaceStandardPoints(standardId, points = [], transaction) {
  const request = await createRequest(transaction);
  await request
    .input('StandardId', sql.Int, standardId)
    .query('DELETE FROM [dbo].[calibration_standard_points] WHERE standard_id = @StandardId');

  for (const point of points) {
    await insertStandardPoint({
      standardId,
      actualPressure:      point.actualPressure,
      indicatorIncreasing: point.indicatorIncreasing,
      indicatorDecreasing: point.indicatorDecreasing,
      uncertainty:         point.uncertainty,
      unit:                point.unit,
    }, transaction);
  }
}

async function createStandardWithPoints(data, points = []) {
  const pool = await getPool();
  const txn  = new sql.Transaction(pool);
  await txn.begin();

  try {
    const standardId = await createStandard(data, txn);
    if (Array.isArray(points) && points.length > 0) {
      await replaceStandardPoints(standardId, points, txn);
    }
    await txn.commit();
    return standardId;
  } catch (err) {
    await txn.rollback();
    throw err;
  }
}

async function updateStandardWithPoints(standardId, data, points) {
  const pool = await getPool();
  const txn  = new sql.Transaction(pool);
  await txn.begin();

  try {
    const updated = await updateStandard(standardId, data, txn);
    if (!updated) {
      await txn.rollback();
      return false;
    }

    if (Array.isArray(points)) {
      await replaceStandardPoints(standardId, points, txn);
    }

    await txn.commit();
    return true;
  } catch (err) {
    await txn.rollback();
    throw err;
  }
}

// =============================================================================
// CALIBRATION SESSIONS
// =============================================================================

async function createSession(data) {
  const pool = await getPool();
  const result = await pool.request()
    .input('InstrumentId',    sql.NVarChar(50),  data.instrumentId)
    .input('StandardId',      sql.Int,           data.standardId)
    .input('CalibrationDate', sql.Date,          data.calibrationDate)
    .input('Temperature',     sql.Decimal(10,2), data.temperature     ?? null)
    .input('Humidity',        sql.Decimal(10,2), data.humidity        ?? null)
    .input('Pic',             sql.VarChar(100),  data.pic             || null)
    .input('UutUnit',         sql.VarChar(20),   data.uutUnit         || null)
    .input('StandardUnit',    sql.VarChar(20),   data.standardUnit    || null)
    .input('IndicatorType',   sql.VarChar(20),   data.indicatorType   || 'Digital')
    .input('Resolution',      sql.Decimal(18,8), data.resolution      ?? 1)
    .input('DeltaH',          sql.Decimal(18,8), data.deltaH          ?? 0)
    .input('MediaDensity',    sql.Decimal(18,8), data.mediaDensity    ?? 1.2)
    .input('Gravity',         sql.Decimal(18,8), data.gravity         ?? 9.78)
    .input('CreatedBy',       sql.VarChar(100),  data.createdBy       || null)
    .query(`
      INSERT INTO [dbo].[calibration_sessions]
        (instrument_id, standard_id, calibration_date, temperature, humidity,
         pic, uut_unit, standard_unit, indicator_type, resolution,
         delta_h, media_density, gravity,
         status, created_by)
      OUTPUT INSERTED.session_id
      VALUES
        (@InstrumentId, @StandardId, @CalibrationDate, @Temperature, @Humidity,
         @Pic, @UutUnit, @StandardUnit, @IndicatorType, @Resolution,
         @DeltaH, @MediaDensity, @Gravity,
         'DRAFT', @CreatedBy)
    `);
  return result.recordset[0].session_id;
}

/**
 * List sessions for the session selector, most-recent first.
 * Joins calibration_standards for the standard name/code display.
 * instrument_id is stored as a string (QA_ID), returned as-is.
 *
 * @param {object} [opts]
 * @param {number} [opts.limit=50]
 */
async function listSessions({ limit = 50 } = {}) {
  const pool   = await getPool();
  const result = await pool.request()
    .input('Limit', sql.Int, limit)
    .query(`
      SELECT TOP (@Limit)
        cs.session_id,
        cs.instrument_id,
        cs.standard_id,
        cs.calibration_date,
        cs.pic,
        cs.uut_unit,
        cs.standard_unit,
        cs.indicator_type,
        cs.resolution,
        cs.status,
        cs.created_by,
        cs.created_at,
        st.standard_code,
        st.standard_name
      FROM [dbo].[calibration_sessions] cs
      LEFT JOIN [dbo].[calibration_standards] st
        ON cs.standard_id = st.standard_id
      WHERE cs.is_deleted = 0
      ORDER BY cs.session_id DESC
    `);
  return result.recordset;
}

async function getSessionById(sessionId) {
  const pool   = await getPool();
  const result = await pool.request()
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT
        session_id, instrument_id, standard_id, calibration_date,
        temperature, humidity, pic, uut_unit, standard_unit,
        indicator_type, resolution,
        delta_h, media_density, gravity, status, created_by, created_at
      FROM [dbo].[calibration_sessions]
      WHERE session_id = @SessionId AND is_deleted = 0
    `);
  return result.recordset[0] || null;
}

async function updateSessionStatus(sessionId, status) {
  const pool = await getPool();
  await pool.request()
    .input('SessionId', sql.Int,        sessionId)
    .input('Status',    sql.VarChar(30), status)
    .query(`
      UPDATE [dbo].[calibration_sessions]
      SET status = @Status
      WHERE session_id = @SessionId
    `);
}

// =============================================================================
// CALIBRATION READINGS
// =============================================================================

/**
 * Insert readings for a session using a transaction.
 * Deletes any previous readings for the session before inserting the new batch.
 *
 * @param {number}  sessionId
 * @param {Array}   readings
 * @param {object}  [transaction]  – Optional external mssql.Transaction
 */
async function upsertReadings(sessionId, readings, transaction) {
  const pool = await getPool();
  const txn  = transaction || new sql.Transaction(pool);
  const ownTxn = !transaction;

  if (ownTxn) await txn.begin();

  try {
    // Clear existing readings for this session
    await new sql.Request(txn)
      .input('SessionId', sql.Int, sessionId)
      .query('DELETE FROM [dbo].[calibration_readings] WHERE session_id = @SessionId');

    // Insert new batch
    for (const r of readings) {
      await new sql.Request(txn)
        .input('SessionId',       sql.Int,           sessionId)
        .input('PointIndex',      sql.Int,           r.pointIndex)
        .input('NominalValue',    sql.Decimal(18,8), r.nominalValue)
        .input('CycleCode',       sql.VarChar(10),   r.cycleCode)
        .input('Direction',       sql.VarChar(20),   r.direction)
        .input('UutReading',      sql.Decimal(18,8), r.uutReading)
        .input('StandardReading', sql.Decimal(18,8), r.standardReading)
        .query(`
          INSERT INTO [dbo].[calibration_readings]
            (session_id, point_index, nominal_value, cycle_code, direction,
             uut_reading, standard_reading)
          VALUES
            (@SessionId, @PointIndex, @NominalValue, @CycleCode, @Direction,
             @UutReading, @StandardReading)
        `);
    }

    if (ownTxn) await txn.commit();
  } catch (err) {
    if (ownTxn) await txn.rollback();
    throw err;
  }
}

async function getReadingsBySession(sessionId) {
  const pool   = await getPool();
  const result = await pool.request()
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT
        reading_id, session_id, point_index, nominal_value,
        cycle_code, direction, uut_reading, standard_reading, corrected_standard
      FROM [dbo].[calibration_readings]
      WHERE session_id = @SessionId
      ORDER BY point_index, cycle_code
    `);
  return result.recordset;
}

/**
 * Persist corrected_standard values back to each reading row.
 */
async function updateCorrectedStandards(correctedRows, transaction) {
  const pool = await getPool();
  const txn  = transaction || new sql.Transaction(pool);
  const ownTxn = !transaction;

  if (ownTxn) await txn.begin();

  try {
    for (const row of correctedRows) {
      await new sql.Request(txn)
        .input('ReadingId',         sql.Int,            row.reading_id)
        .input('CorrectedStandard', sql.Decimal(18,10), row.correctedStandard)
        .query(`
          UPDATE [dbo].[calibration_readings]
          SET corrected_standard = @CorrectedStandard
          WHERE reading_id = @ReadingId
        `);
    }
    if (ownTxn) await txn.commit();
  } catch (err) {
    if (ownTxn) await txn.rollback();
    throw err;
  }
}

// =============================================================================
// CALIBRATION RESULTS
// =============================================================================

/**
 * Replace all result rows for a session (delete + insert in transaction).
 */
async function upsertResults(sessionId, points) {
  const pool = await getPool();
  const txn  = new sql.Transaction(pool);
  await txn.begin();

  try {
    await new sql.Request(txn)
      .input('SessionId', sql.Int, sessionId)
      .query('DELETE FROM [dbo].[calibration_results] WHERE session_id = @SessionId');

    for (const p of points) {
      await new sql.Request(txn)
        .input('SessionId',              sql.Int,            sessionId)
        .input('PointIndex',             sql.Int,            p.pointIndex)
        .input('NominalValue',           sql.Decimal(18,8),  p.nominalValue            ?? null)
        .input('UutMean',                sql.Decimal(18,8),  p.uutMean                 ?? null)
        .input('StandardMean',           sql.Decimal(18,8),  p.standardMean            ?? null)
        .input('LevelCorrection',        sql.Decimal(18,10), p.levelCorrection         ?? null)
        .input('ErrorValue',             sql.Decimal(18,10), p.errorValue              ?? null)
        .input('Repeatability',          sql.Decimal(18,10), p.repeatability           ?? null)
        .input('ZeroDeviation',          sql.Decimal(18,10), p.zeroDeviation           ?? null)
        .input('CombinedUncertainty',    sql.Decimal(18,10), p.combinedUncertainty     ?? null)
        .input('EffectiveDegreeFreedom', sql.Decimal(18,10), p.effectiveDegreeFreedom  ?? null)
        .input('CoverageFactor',         sql.Decimal(18,10), p.coverageFactor          ?? null)
        .input('ExpandedUncertainty',    sql.Decimal(18,10), p.expandedUncertainty     ?? null)
        .input('LowerLimit',             sql.Decimal(18,10), p.lowerLimit              ?? null)
        .input('UpperLimit',             sql.Decimal(18,10), p.upperLimit              ?? null)
        .query(`
          INSERT INTO [dbo].[calibration_results]
            (session_id, point_index, nominal_value, uut_mean, standard_mean,
             level_correction, error_value, repeatability, zero_deviation,
             combined_uncertainty, effective_degree_freedom, coverage_factor,
             expanded_uncertainty, lower_limit, upper_limit)
          VALUES
            (@SessionId, @PointIndex, @NominalValue, @UutMean, @StandardMean,
             @LevelCorrection, @ErrorValue, @Repeatability, @ZeroDeviation,
             @CombinedUncertainty, @EffectiveDegreeFreedom, @CoverageFactor,
             @ExpandedUncertainty, @LowerLimit, @UpperLimit)
        `);
    }

    await txn.commit();
  } catch (err) {
    await txn.rollback();
    throw err;
  }
}

async function getResultsBySession(sessionId) {
  const pool   = await getPool();
  const result = await pool.request()
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT
        result_id, session_id, point_index, nominal_value,
        uut_mean, standard_mean, level_correction, error_value,
        repeatability, zero_deviation, combined_uncertainty,
        effective_degree_freedom, coverage_factor,
        expanded_uncertainty, lower_limit, upper_limit, created_at
      FROM [dbo].[calibration_results]
      WHERE session_id = @SessionId
      ORDER BY point_index
    `);
  return result.recordset;
}

module.exports = {
  // instruments (read-only)
  listInstruments,
  getInstrumentById,
  // standards
  listStandards,
  getStandardById,
  createStandard,
  updateStandard,
  softDeleteStandard,
  createStandardWithPoints,
  updateStandardWithPoints,
  // standard points
  getStandardPoints,
  insertStandardPoint,
  replaceStandardPoints,
  // sessions
  listSessions,
  createSession,
  getSessionById,
  updateSessionStatus,
  // readings
  upsertReadings,
  getReadingsBySession,
  updateCorrectedStandards,
  // results
  upsertResults,
  getResultsBySession,
  // expose pool helper for service-level transactions
  getPool,
};
