'use strict';

/**
 * timer-calibration.repository.js
 *
 * Data access for the Timer (Stopwatch) Calibration module (timer_* tables).
 *
 * The certificate / DA publishing flow reuses the generic helpers already
 * implemented in calibration-workbook.repository.js. Timer candidate lookup
 * is based on instrument identity and does not assume a Parameter_Sertifikasi.
 */

const sql = require('mssql');
const workbookRepo = require('./calibration-workbook.repository');

const { getPool, createRequest } = workbookRepo;

function toDbNull(value) {
  if (value === undefined || value === null || value === '') return null;
  return value;
}

function boolBit(value, fallback = 1) {
  if (value === undefined || value === null) return fallback;
  return value ? 1 : 0;
}

// ---------------------------------------------------------------------------
// SESSIONS
// ---------------------------------------------------------------------------

async function listSessions(filters = {}) {
  const request = await createRequest();
  const where = [];

  if (filters.status) {
    request.input('Status', sql.VarChar(30), String(filters.status).toUpperCase());
    where.push('s.status = @Status');
  }
  if (filters.unitMode) {
    request.input('UnitMode', sql.VarChar(20), String(filters.unitMode).toUpperCase());
    where.push('s.unit_mode = @UnitMode');
  }

  let query = `
    SELECT
      s.session_id,
      s.session_code,
      s.instrument_id,
      s.instrument_code,
      s.instrument_name,
      s.calibration_date,
      s.unit_mode,
      s.indicator_type,
      s.status,
      s.pic,
      s.conclusion,
      s.evaluation_result,
      s.created_at,
      s.updated_at,
      (SELECT COUNT(1) FROM [dbo].[timer_points] p
         WHERE p.session_id = s.session_id AND p.is_active = 1) AS active_point_count
    FROM [dbo].[timer_sessions] s
  `;
  if (where.length) query += `\nWHERE ${where.join('\n  AND ')}`;
  query += '\nORDER BY s.session_id DESC';

  const result = await request.query(query);
  return result.recordset;
}

const SESSION_COLUMNS = `
  session_id, session_code, instrument_id, instrument_code, instrument_name,
  merk_tipe, no_seri, kapasitas, resolusi, lokasi, calibration_date, interval_bulan,
  metode_kalibrasi, keterangan, unit_mode, indicator_type, tolerance,
  digital_resolution, analog_resolution, temperature, humidity,
  std_nama, std_no_identitas, std_no_sertifikat, std_tertelusur, std_rekalibrasi,
  qa_id, id_no_sertifikat, status, pic, conclusion, evaluation_result,
  approved_by_admin, approved_by_admin_date,
  approved_by_officer, approved_by_officer_date,
  approved_by_manager, approved_by_manager_date,
  rejected_by, rejected_reason, rejected_at,
  created_by, updated_by, created_at, updated_at
`;

async function getSessionById(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`SELECT ${SESSION_COLUMNS} FROM [dbo].[timer_sessions] WHERE session_id = @SessionId`);
  return result.recordset[0] || null;
}

function bindSessionInputs(request, payload) {
  return request
    .input('SessionCode', sql.VarChar(50), toDbNull(payload.session_code))
    .input('InstrumentId', sql.VarChar(50), toDbNull(payload.instrument_id))
    .input('InstrumentCode', sql.VarChar(100), toDbNull(payload.instrument_code))
    .input('InstrumentName', sql.VarChar(255), toDbNull(payload.instrument_name))
    .input('MerkTipe', sql.VarChar(255), toDbNull(payload.merk_tipe))
    .input('NoSeri', sql.VarChar(255), toDbNull(payload.no_seri))
    .input('Kapasitas', sql.VarChar(255), toDbNull(payload.kapasitas))
    .input('Resolusi', sql.VarChar(100), toDbNull(payload.resolusi))
    .input('Lokasi', sql.VarChar(255), toDbNull(payload.lokasi))
    .input('CalibrationDate', sql.Date, toDbNull(payload.calibration_date))
    .input('IntervalBulan', sql.VarChar(50), toDbNull(payload.interval_bulan))
    .input('MetodeKalibrasi', sql.VarChar(255), toDbNull(payload.metode_kalibrasi))
    .input('Keterangan', sql.VarChar(1000), toDbNull(payload.keterangan))
    .input('UnitMode', sql.VarChar(20), payload.unit_mode || 'DETIK')
    .input('IndicatorType', sql.VarChar(20), payload.indicator_type || 'DIGITAL')
    .input('Tolerance', sql.Decimal(18, 6), toDbNull(payload.tolerance))
    .input('DigitalResolution', sql.Decimal(18, 10), toDbNull(payload.digital_resolution))
    .input('AnalogResolution', sql.Decimal(18, 10), toDbNull(payload.analog_resolution))
    .input('Temperature', sql.Decimal(18, 6), toDbNull(payload.temperature))
    .input('Humidity', sql.Decimal(18, 6), toDbNull(payload.humidity))
    .input('StdNama', sql.VarChar(255), toDbNull(payload.std_nama))
    .input('StdNoIdentitas', sql.VarChar(255), toDbNull(payload.std_no_identitas))
    .input('StdNoSertifikat', sql.VarChar(255), toDbNull(payload.std_no_sertifikat))
    .input('StdTertelusur', sql.VarChar(255), toDbNull(payload.std_tertelusur))
    .input('StdRekalibrasi', sql.VarChar(255), toDbNull(payload.std_rekalibrasi))
    .input('QaId', sql.VarChar(50), toDbNull(payload.qa_id))
    .input('Pic', sql.VarChar(100), toDbNull(payload.pic))
    .input('EvaluationResult', sql.VarChar(100), toDbNull(payload.evaluation_result));
}

async function createSession(payload, transaction) {
  const request = await createRequest(transaction);
  bindSessionInputs(request, payload)
    .input('Status', sql.VarChar(30), payload.status || 'DRAFT')
    .input('CreatedBy', sql.VarChar(100), toDbNull(payload.created_by));

  const result = await request.query(`
    INSERT INTO [dbo].[timer_sessions]
    (
      session_code, instrument_id, instrument_code, instrument_name,
      merk_tipe, no_seri, kapasitas, resolusi, lokasi, calibration_date, interval_bulan,
      metode_kalibrasi, keterangan, unit_mode, indicator_type, tolerance,
      digital_resolution, analog_resolution, temperature, humidity,
      std_nama, std_no_identitas, std_no_sertifikat, std_tertelusur, std_rekalibrasi,
      qa_id, status, pic, evaluation_result, created_by
    )
    OUTPUT INSERTED.session_id
    VALUES
    (
      @SessionCode, @InstrumentId, @InstrumentCode, @InstrumentName,
      @MerkTipe, @NoSeri, @Kapasitas, @Resolusi, @Lokasi, @CalibrationDate, @IntervalBulan,
      @MetodeKalibrasi, @Keterangan, @UnitMode, @IndicatorType, @Tolerance,
      @DigitalResolution, @AnalogResolution, @Temperature, @Humidity,
      @StdNama, @StdNoIdentitas, @StdNoSertifikat, @StdTertelusur, @StdRekalibrasi,
      @QaId, @Status, @Pic, @EvaluationResult, @CreatedBy
    )
  `);
  return result.recordset[0].session_id;
}

async function updateSession(sessionId, payload, transaction) {
  const request = await createRequest(transaction);
  bindSessionInputs(request, payload)
    .input('SessionId', sql.Int, sessionId)
    .input('UpdatedBy', sql.VarChar(100), toDbNull(payload.updated_by));

  const result = await request.query(`
    UPDATE [dbo].[timer_sessions] SET
      session_code = @SessionCode, instrument_id = @InstrumentId,
      instrument_code = @InstrumentCode, instrument_name = @InstrumentName,
      merk_tipe = @MerkTipe, no_seri = @NoSeri, kapasitas = @Kapasitas,
      resolusi = @Resolusi, lokasi = @Lokasi, calibration_date = @CalibrationDate,
      interval_bulan = @IntervalBulan, metode_kalibrasi = @MetodeKalibrasi,
      keterangan = @Keterangan, unit_mode = @UnitMode, indicator_type = @IndicatorType,
      tolerance = @Tolerance, digital_resolution = @DigitalResolution,
      analog_resolution = @AnalogResolution, temperature = @Temperature, humidity = @Humidity,
      std_nama = @StdNama, std_no_identitas = @StdNoIdentitas,
      std_no_sertifikat = @StdNoSertifikat, std_tertelusur = @StdTertelusur,
      std_rekalibrasi = @StdRekalibrasi, qa_id = @QaId, pic = @Pic,
      evaluation_result = @EvaluationResult,
      updated_by = @UpdatedBy, updated_at = GETDATE()
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
      UPDATE [dbo].[timer_sessions]
      SET status = @Status, updated_by = @UpdatedBy, updated_at = GETDATE()
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
      UPDATE [dbo].[timer_sessions]
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
      UPDATE [dbo].[timer_sessions]
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
      UPDATE [dbo].[timer_sessions]
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

async function updateSessionConclusion(sessionId, conclusion, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('Conclusion', sql.VarChar(50), toDbNull(conclusion))
    .query(`UPDATE [dbo].[timer_sessions] SET conclusion = @Conclusion WHERE session_id = @SessionId`);
}

async function updateSessionCertificate(sessionId, idNoSertifikat, qaId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('IdNoSertifikat', sql.VarChar(50), toDbNull(idNoSertifikat))
    .input('QaId', sql.VarChar(50), toDbNull(qaId))
    .query(`
      UPDATE [dbo].[timer_sessions]
      SET id_no_sertifikat = @IdNoSertifikat, qa_id = @QaId, updated_at = GETDATE()
      WHERE session_id = @SessionId
    `);
}

async function deleteSessionGraph(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[timer_results] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timer_result_summary] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timer_readings] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timer_points] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timer_sessions] WHERE session_id = @SessionId;
    `);
  return (result.rowsAffected && result.rowsAffected.some((n) => n > 0)) || false;
}

// ---------------------------------------------------------------------------
// POINTS
// ---------------------------------------------------------------------------

async function listPoints(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT point_id, session_id, point_order, nominal_value, unit,
             correction_std, uc_std, digital_resolution, analog_resolution,
             is_active, created_at, updated_at
      FROM [dbo].[timer_points]
      WHERE session_id = @SessionId AND is_active = 1
      ORDER BY point_order ASC, point_id ASC
    `);
  return result.recordset;
}

async function createPoint(sessionId, payload, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .input('PointOrder', sql.Int, payload.point_order)
    .input('NominalValue', sql.Decimal(18, 6), payload.nominal_value)
    .input('Unit', sql.VarChar(20), payload.unit || 'DETIK')
    .input('CorrectionStd', sql.Decimal(18, 10), payload.correction_std ?? 0)
    .input('UcStd', sql.Decimal(18, 10), payload.uc_std ?? 0)
    .input('DigitalResolution', sql.Decimal(18, 10), toDbNull(payload.digital_resolution))
    .input('AnalogResolution', sql.Decimal(18, 10), toDbNull(payload.analog_resolution))
    .input('IsActive', sql.Bit, boolBit(payload.is_active))
    .query(`
      INSERT INTO [dbo].[timer_points]
        (session_id, point_order, nominal_value, unit, correction_std, uc_std,
         digital_resolution, analog_resolution, is_active)
      OUTPUT INSERTED.point_id
      VALUES (@SessionId, @PointOrder, @NominalValue, @Unit, @CorrectionStd, @UcStd,
              @DigitalResolution, @AnalogResolution, @IsActive)
    `);
  return result.recordset[0].point_id;
}

async function updatePoint(pointId, payload, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('PointId', sql.Int, pointId)
    .input('PointOrder', sql.Int, payload.point_order)
    .input('NominalValue', sql.Decimal(18, 6), payload.nominal_value)
    .input('Unit', sql.VarChar(20), payload.unit || 'DETIK')
    .input('CorrectionStd', sql.Decimal(18, 10), payload.correction_std ?? 0)
    .input('UcStd', sql.Decimal(18, 10), payload.uc_std ?? 0)
    .input('DigitalResolution', sql.Decimal(18, 10), toDbNull(payload.digital_resolution))
    .input('AnalogResolution', sql.Decimal(18, 10), toDbNull(payload.analog_resolution))
    .input('IsActive', sql.Bit, boolBit(payload.is_active))
    .query(`
      UPDATE [dbo].[timer_points] SET
        point_order = @PointOrder, nominal_value = @NominalValue, unit = @Unit,
        correction_std = @CorrectionStd, uc_std = @UcStd,
        digital_resolution = @DigitalResolution, analog_resolution = @AnalogResolution,
        is_active = @IsActive, updated_at = GETDATE()
      WHERE point_id = @PointId
    `);
  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function deletePointsBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[timer_readings] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timer_points] WHERE session_id = @SessionId;
    `);
}

// ---------------------------------------------------------------------------
// READINGS
// ---------------------------------------------------------------------------

async function listReadings(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT r.reading_id, r.session_id, r.point_id, r.cycle_no,
             r.std_jam, r.std_menit, r.std_detik, r.std_mdetik,
             r.uut_jam, r.uut_menit, r.uut_detik, r.uut_mdetik,
             p.point_order, p.nominal_value, p.unit
      FROM [dbo].[timer_readings] r
      INNER JOIN [dbo].[timer_points] p ON p.point_id = r.point_id
      WHERE r.session_id = @SessionId
      ORDER BY p.point_order ASC, r.cycle_no ASC
    `);
  return result.recordset;
}

async function deleteReadingsBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .query(`DELETE FROM [dbo].[timer_readings] WHERE session_id = @SessionId`);
}

async function insertReading(sessionId, pointId, row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('PointId', sql.Int, pointId)
    .input('CycleNo', sql.Int, row.cycle_no)
    .input('StdJam', sql.Decimal(18, 6), row.std_jam ?? 0)
    .input('StdMenit', sql.Decimal(18, 6), row.std_menit ?? 0)
    .input('StdDetik', sql.Decimal(18, 6), row.std_detik ?? 0)
    .input('StdMdetik', sql.Decimal(18, 6), row.std_mdetik ?? 0)
    .input('UutJam', sql.Decimal(18, 6), row.uut_jam ?? 0)
    .input('UutMenit', sql.Decimal(18, 6), row.uut_menit ?? 0)
    .input('UutDetik', sql.Decimal(18, 6), row.uut_detik ?? 0)
    .input('UutMdetik', sql.Decimal(18, 6), row.uut_mdetik ?? 0)
    .query(`
      INSERT INTO [dbo].[timer_readings]
        (session_id, point_id, cycle_no,
         std_jam, std_menit, std_detik, std_mdetik,
         uut_jam, uut_menit, uut_detik, uut_mdetik)
      VALUES
        (@SessionId, @PointId, @CycleNo,
         @StdJam, @StdMenit, @StdDetik, @StdMdetik,
         @UutJam, @UutMenit, @UutDetik, @UutMdetik)
    `);
}

// ---------------------------------------------------------------------------
// RESULTS
// ---------------------------------------------------------------------------

async function deleteResultsBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[timer_results] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timer_result_summary] WHERE session_id = @SessionId;
    `);
}

async function insertResult(row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, row.session_id)
    .input('PointId', sql.Int, row.point_id)
    .input('PointOrder', sql.Int, row.point_order)
    .input('NominalValue', sql.Decimal(18, 6), row.nominal_value)
    .input('Unit', sql.VarChar(20), row.unit)
    .input('MeanStdSec', sql.Decimal(18, 10), toDbNull(row.mean_std_sec))
    .input('MeanUutSec', sql.Decimal(18, 10), toDbNull(row.mean_uut_sec))
    .input('MeanErrorSec', sql.Decimal(18, 10), toDbNull(row.mean_error_sec))
    .input('SdSec', sql.Decimal(18, 10), toDbNull(row.sd_sec))
    .input('URepeatability', sql.Decimal(18, 10), toDbNull(row.u_repeatability))
    .input('UDigitalRes', sql.Decimal(18, 10), toDbNull(row.u_digital_res))
    .input('UAnalogRes', sql.Decimal(18, 10), toDbNull(row.u_analog_res))
    .input('UCertificate', sql.Decimal(18, 10), toDbNull(row.u_certificate))
    .input('UCombined', sql.Decimal(18, 10), toDbNull(row.u_combined))
    .input('UExpandedSec', sql.Decimal(18, 10), toDbNull(row.u_expanded_sec))
    .input('UExpandedMenit', sql.Decimal(18, 10), toDbNull(row.u_expanded_menit))
    .input('Tolerance', sql.Decimal(18, 6), toDbNull(row.tolerance))
    .input('PassFlag', sql.Bit, row.pass_flag === null || row.pass_flag === undefined ? null : (row.pass_flag ? 1 : 0))
    .query(`
      INSERT INTO [dbo].[timer_results]
        (session_id, point_id, point_order, nominal_value, unit,
         mean_std_sec, mean_uut_sec, mean_error_sec, sd_sec,
         u_repeatability, u_digital_res, u_analog_res, u_certificate,
         u_combined, u_expanded_sec, u_expanded_menit, tolerance, pass_flag)
      VALUES
        (@SessionId, @PointId, @PointOrder, @NominalValue, @Unit,
         @MeanStdSec, @MeanUutSec, @MeanErrorSec, @SdSec,
         @URepeatability, @UDigitalRes, @UAnalogRes, @UCertificate,
         @UCombined, @UExpandedSec, @UExpandedMenit, @Tolerance, @PassFlag)
    `);
}

async function getResults(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT result_id, session_id, point_id, point_order, nominal_value, unit,
             mean_std_sec, mean_uut_sec, mean_error_sec, sd_sec,
             u_repeatability, u_digital_res, u_analog_res, u_certificate,
             u_combined, u_expanded_sec, u_expanded_menit, tolerance, pass_flag, created_at
      FROM [dbo].[timer_results]
      WHERE session_id = @SessionId
      ORDER BY point_order ASC, point_id ASC
    `);
  return result.recordset;
}

async function upsertSummary(sessionId, summary, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('CoverageFactor', sql.Decimal(18, 10), toDbNull(summary.coverage_factor))
    .input('MaxExpandedSec', sql.Decimal(18, 10), toDbNull(summary.max_expanded_sec))
    .input('Conclusion', sql.VarChar(50), toDbNull(summary.conclusion))
    .query(`
      IF EXISTS (SELECT 1 FROM [dbo].[timer_result_summary] WHERE session_id = @SessionId)
        UPDATE [dbo].[timer_result_summary]
        SET coverage_factor = @CoverageFactor, max_expanded_sec = @MaxExpandedSec,
            conclusion = @Conclusion, created_at = GETDATE()
        WHERE session_id = @SessionId
      ELSE
        INSERT INTO [dbo].[timer_result_summary]
          (session_id, coverage_factor, max_expanded_sec, conclusion)
        VALUES (@SessionId, @CoverageFactor, @MaxExpandedSec, @Conclusion)
    `);
}

async function getSummary(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT summary_id, session_id, coverage_factor, max_expanded_sec, conclusion, created_at
      FROM [dbo].[timer_result_summary] WHERE session_id = @SessionId
    `);
  return result.recordset[0] || null;
}

// ---------------------------------------------------------------------------
// DA CANDIDATES (timer parameter) — mirrors listTekananDaCandidates
// ---------------------------------------------------------------------------

async function listTimerDaCandidates(filters = {}, transaction) {
  const request = await createRequest(transaction);
  const where = [];

  if (filters.search) {
    request.input('Search', sql.NVarChar(100), `%${filters.search}%`);
    where.push(`(
      A.QA_ID LIKE @Search
      OR A.Assm_nama_instrumen LIKE @Search
      OR A.Assm_No_identitas_Istrumen LIKE @Search
      OR A.Assm_No_identitas_kalibrasi LIKE @Search
      OR A.Group_Da_Dept LIKE @Search
      OR A.Assm_Lokasi LIKE @Search
    )`);
  } else if (filters.qa_id) {
    request.input('QaId', sql.VarChar(50), filters.qa_id);
    where.push('A.QA_ID = @QaId');
  } else if (filters.instrument_code) {
    request.input('InstrumentCode', sql.VarChar(255), filters.instrument_code);
    where.push(`(A.Assm_No_identitas_Istrumen = @InstrumentCode OR A.Assm_No_identitas_kalibrasi = @InstrumentCode)`);
  }

  if (filters.include_external === false) {
    where.push("COALESCE(NULLIF(LTRIM(RTRIM(A.Jenis_kalibrasi)), ''), '1') = '1'");
  }

  const whereSql = where.length ? `WHERE ${where.join('\n      AND ')}` : '';

  const result = await request.query(`
    SELECT TOP 100
      A.QA_ID, A.Jenis_kalibrasi, A.Parameter_Sertifikasi, A.Assm_nama_instrumen,
      A.Assm_No_identitas_Istrumen, A.Assm_No_identitas_kalibrasi, A.Group_Da_Dept,
      A.Assm_Kapasitas, A.Parameter_Kalibrasi, A.Assm_Lokasi, A.Parameter_Interval, A.Catatan
    FROM T_Kalibrasi_DA_Bagian AS A
    ${whereSql}
    ORDER BY A.QA_ID ASC
  `);
  return result.recordset;
}

/** Draft a Sertifikat-Bagian header row from a timer DA record. */
async function createSertifikatBagianDraftFromTimerDa(qaId, idNoSertifikat, userId, delegatedTo, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('QaId', sql.VarChar(50), qaId)
    .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
    .input('UserId', sql.VarChar(100), toDbNull(userId))
    .input('DelegatedTo', sql.VarChar(100), toDbNull(delegatedTo))
    .query(`
      INSERT INTO T_Kalibrasi_Sertifikat_Bagian
        (QA_ID, ID_No_sertifikat, Jenis_kalibrasi, parameter_sertifikasi, isSert_Manual, Tgl,
         Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi,
         Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi,
         UserID, Delegated_To, Process_date)
      SELECT
        QA_ID, @IdNoSertifikat, Jenis_kalibrasi, parameter_sertifikasi, 1, GETDATE(),
        Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi,
        Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi,
        @UserId, @DelegatedTo, GETDATE()
      FROM T_Kalibrasi_DA_Bagian
      WHERE QA_ID = @QaId
    `);
  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

module.exports = {
  getPool,
  createRequest,
  // sessions
  listSessions,
  getSessionById,
  createSession,
  updateSession,
  updateSessionStatus,
  updateSessionApproval,
  clearSessionApprovals,
  resetSessionApprovals,
  updateSessionConclusion,
  updateSessionCertificate,
  deleteSessionGraph,
  // points
  listPoints,
  createPoint,
  updatePoint,
  deletePointsBySession,
  // readings
  listReadings,
  deleteReadingsBySession,
  insertReading,
  // results
  deleteResultsBySession,
  insertResult,
  getResults,
  upsertSummary,
  getSummary,
  // certificate / DA (timer parameter + reused generic helpers)
  listTimerDaCandidates,
  createSertifikatBagianDraftFromTimerDa,
  getDaBagianByQaId: workbookRepo.getDaBagianByQaId,
  getNextTekananCertificateNumber: workbookRepo.getNextTekananCertificateNumber,
  getNextCertificateNumberByCode: workbookRepo.getNextCertificateNumberByCode,
  getSertifikatBagianHeader: workbookRepo.getSertifikatBagianHeader,
  updateSertifikatBagianHeader: workbookRepo.updateSertifikatBagianHeader,
  replaceSertifikatBagianHasilKalRows: workbookRepo.replaceSertifikatBagianHasilKalRows,
  getApproverIdentity: workbookRepo.getApproverIdentity,
  insertDaBagianStatus: workbookRepo.insertDaBagianStatus,
  deleteDaBagianStatusByQaId: workbookRepo.deleteDaBagianStatusByQaId,
  isSertifikatBagianApproved: workbookRepo.isSertifikatBagianApproved,
  insertSertifikatBagianStatus: workbookRepo.insertSertifikatBagianStatus,
  insertAuditLog: workbookRepo.insertAuditLog,
};
