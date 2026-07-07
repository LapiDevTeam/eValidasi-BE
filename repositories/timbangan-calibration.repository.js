'use strict';

/**
 * timbangan-calibration.repository.js
 *
 * Data access for the Timbangan (electronic balance) calibration module
 * (timbangan_* tables). The certificate publish flow reuses the generic
 * Sertifikat-Bagian helpers from calibration-workbook.repository.js.
 */

const sql = require('mssql');
const workbookRepo = require('./calibration-workbook.repository');

const { getPool, createRequest } = workbookRepo;

function toDbNull(value) {
  return value === undefined ? null : value;
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

  let query = `
    SELECT
      s.session_id, s.session_code, s.instrument_id, s.instrument_code, s.instrument_name,
      s.kapasitas_resolusi, s.calibration_date, s.status, s.pic, s.conclusion, s.evaluation_result,
      s.created_at, s.updated_at,
      (SELECT COUNT(1) FROM [dbo].[timbangan_points] p
         WHERE p.session_id = s.session_id AND p.is_active = 1) AS active_point_count
    FROM [dbo].[timbangan_sessions] s
  `;
  if (where.length) query += `\nWHERE ${where.join('\n  AND ')}`;
  query += '\nORDER BY s.session_id DESC';

  const result = await request.query(query);
  return result.recordset;
}

const SESSION_COLUMNS = `
  session_id, session_code, instrument_id, instrument_code, instrument_name,
  merk_tipe, no_seri, kapasitas_ukur, kapasitas_alat, unit, resolusi, kapasitas_resolusi,
  lokasi, calibration_date, interval_bulan, metode_kalibrasi, keterangan,
  temperature, humidity, eccentricity_nominal_mass,
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
    .query(`SELECT ${SESSION_COLUMNS} FROM [dbo].[timbangan_sessions] WHERE session_id = @SessionId`);
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
    .input('KapasitasUkur', sql.Decimal(18, 6), toDbNull(payload.kapasitas_ukur))
    .input('KapasitasAlat', sql.Decimal(18, 6), toDbNull(payload.kapasitas_alat))
    .input('Unit', sql.VarChar(10), payload.unit || 'kg')
    .input('Resolusi', sql.Decimal(18, 10), toDbNull(payload.resolusi))
    .input('KapasitasResolusi', sql.VarChar(100), toDbNull(payload.kapasitas_resolusi))
    .input('Lokasi', sql.VarChar(255), toDbNull(payload.lokasi))
    .input('CalibrationDate', sql.Date, toDbNull(payload.calibration_date))
    .input('IntervalBulan', sql.VarChar(50), toDbNull(payload.interval_bulan))
    .input('MetodeKalibrasi', sql.VarChar(255), toDbNull(payload.metode_kalibrasi))
    .input('Keterangan', sql.VarChar(1000), toDbNull(payload.keterangan))
    .input('Temperature', sql.Decimal(18, 6), toDbNull(payload.temperature))
    .input('Humidity', sql.Decimal(18, 6), toDbNull(payload.humidity))
    .input('EccentricityNominalMass', sql.Decimal(18, 6), toDbNull(payload.eccentricity_nominal_mass))
    .input('StdNama', sql.VarChar(255), toDbNull(payload.std_nama))
    .input('StdNoIdentitas', sql.VarChar(500), toDbNull(payload.std_no_identitas))
    .input('StdNoSertifikat', sql.VarChar(1000), toDbNull(payload.std_no_sertifikat))
    .input('StdTertelusur', sql.VarChar(500), toDbNull(payload.std_tertelusur))
    .input('StdRekalibrasi', sql.VarChar(500), toDbNull(payload.std_rekalibrasi))
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
    INSERT INTO [dbo].[timbangan_sessions]
    (
      session_code, instrument_id, instrument_code, instrument_name,
      merk_tipe, no_seri, kapasitas_ukur, kapasitas_alat, unit, resolusi, kapasitas_resolusi,
      lokasi, calibration_date, interval_bulan, metode_kalibrasi, keterangan,
      temperature, humidity, eccentricity_nominal_mass,
      std_nama, std_no_identitas, std_no_sertifikat, std_tertelusur, std_rekalibrasi,
      qa_id, status, pic, evaluation_result, created_by
    )
    OUTPUT INSERTED.session_id
    VALUES
    (
      @SessionCode, @InstrumentId, @InstrumentCode, @InstrumentName,
      @MerkTipe, @NoSeri, @KapasitasUkur, @KapasitasAlat, @Unit, @Resolusi, @KapasitasResolusi,
      @Lokasi, @CalibrationDate, @IntervalBulan, @MetodeKalibrasi, @Keterangan,
      @Temperature, @Humidity, @EccentricityNominalMass,
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
    UPDATE [dbo].[timbangan_sessions] SET
      session_code = @SessionCode, instrument_id = @InstrumentId,
      instrument_code = @InstrumentCode, instrument_name = @InstrumentName,
      merk_tipe = @MerkTipe, no_seri = @NoSeri, kapasitas_ukur = @KapasitasUkur,
      kapasitas_alat = @KapasitasAlat, unit = @Unit, resolusi = @Resolusi,
      kapasitas_resolusi = @KapasitasResolusi, lokasi = @Lokasi, calibration_date = @CalibrationDate,
      interval_bulan = @IntervalBulan, metode_kalibrasi = @MetodeKalibrasi, keterangan = @Keterangan,
      temperature = @Temperature, humidity = @Humidity, eccentricity_nominal_mass = @EccentricityNominalMass,
      std_nama = @StdNama, std_no_identitas = @StdNoIdentitas, std_no_sertifikat = @StdNoSertifikat,
      std_tertelusur = @StdTertelusur, std_rekalibrasi = @StdRekalibrasi,
      qa_id = @QaId, pic = @Pic, evaluation_result = @EvaluationResult,
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
      UPDATE [dbo].[timbangan_sessions]
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
      UPDATE [dbo].[timbangan_sessions]
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
      UPDATE [dbo].[timbangan_sessions]
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
      UPDATE [dbo].[timbangan_sessions]
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
    .input('Conclusion', sql.VarChar(80), toDbNull(conclusion))
    .query(`UPDATE [dbo].[timbangan_sessions] SET conclusion = @Conclusion WHERE session_id = @SessionId`);
}

async function updateSessionCertificate(sessionId, idNoSertifikat, qaId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('IdNoSertifikat', sql.VarChar(50), toDbNull(idNoSertifikat))
    .input('QaId', sql.VarChar(50), toDbNull(qaId))
    .query(`
      UPDATE [dbo].[timbangan_sessions]
      SET id_no_sertifikat = @IdNoSertifikat, qa_id = @QaId, updated_at = GETDATE()
      WHERE session_id = @SessionId
    `);
}

async function deleteSessionGraph(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[timbangan_results] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timbangan_result_summary] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timbangan_point_standards] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timbangan_points] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timbangan_preadjust_rows] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timbangan_repeatability] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timbangan_eccentricity] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timbangan_hysteresis] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timbangan_sessions] WHERE session_id = @SessionId;
    `);
  return (result.rowsAffected && result.rowsAffected.some((n) => n > 0)) || false;
}

// ---------------------------------------------------------------------------
// PRE-ADJUSTMENT
// ---------------------------------------------------------------------------

async function listPreadjust(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT row_id, session_id, row_order, at_no_id, konvensional_g, uut_reading, zero_reading
      FROM [dbo].[timbangan_preadjust_rows]
      WHERE session_id = @SessionId ORDER BY row_order ASC, row_id ASC
    `);
  return result.recordset;
}

async function deletePreadjustBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request.input('SessionId', sql.Int, sessionId)
    .query(`DELETE FROM [dbo].[timbangan_preadjust_rows] WHERE session_id = @SessionId`);
}

async function insertPreadjustRow(sessionId, row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('RowOrder', sql.Int, row.row_order)
    .input('AtNoId', sql.VarChar(20), toDbNull(row.at_no_id))
    .input('KonvensionalG', sql.Decimal(18, 6), row.konvensional_g ?? 0)
    .input('UutReading', sql.Decimal(18, 10), row.uut_reading ?? 0)
    .input('ZeroReading', sql.Decimal(18, 10), row.zero_reading ?? 0)
    .query(`
      INSERT INTO [dbo].[timbangan_preadjust_rows]
        (session_id, row_order, at_no_id, konvensional_g, uut_reading, zero_reading)
      VALUES (@SessionId, @RowOrder, @AtNoId, @KonvensionalG, @UutReading, @ZeroReading)
    `);
}

// ---------------------------------------------------------------------------
// REPEATABILITY
// ---------------------------------------------------------------------------

async function listRepeatability(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT rep_id, session_id, row_no, half_zero, half_reading, max_zero, max_reading
      FROM [dbo].[timbangan_repeatability]
      WHERE session_id = @SessionId ORDER BY row_no ASC
    `);
  return result.recordset;
}

async function deleteRepeatabilityBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request.input('SessionId', sql.Int, sessionId)
    .query(`DELETE FROM [dbo].[timbangan_repeatability] WHERE session_id = @SessionId`);
}

async function insertRepeatabilityRow(sessionId, row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('RowNo', sql.Int, row.row_no)
    .input('HalfZero', sql.Decimal(18, 10), row.half_zero ?? 0)
    .input('HalfReading', sql.Decimal(18, 10), row.half_reading ?? 0)
    .input('MaxZero', sql.Decimal(18, 10), row.max_zero ?? 0)
    .input('MaxReading', sql.Decimal(18, 10), row.max_reading ?? 0)
    .query(`
      INSERT INTO [dbo].[timbangan_repeatability]
        (session_id, row_no, half_zero, half_reading, max_zero, max_reading)
      VALUES (@SessionId, @RowNo, @HalfZero, @HalfReading, @MaxZero, @MaxReading)
    `);
}

// ---------------------------------------------------------------------------
// POINTS + POINT STANDARDS
// ---------------------------------------------------------------------------

async function listPoints(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT point_id, session_id, point_order, unit, is_active
      FROM [dbo].[timbangan_points]
      WHERE session_id = @SessionId AND is_active = 1
      ORDER BY point_order ASC, point_id ASC
    `);
  return result.recordset;
}

async function listPointStandards(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT pstd_id, session_id, point_id, row_order, at_no_id,
             konvensional_g, uc_mg, uut_reading, zero_reading
      FROM [dbo].[timbangan_point_standards]
      WHERE session_id = @SessionId
      ORDER BY point_id ASC, row_order ASC
    `);
  return result.recordset;
}

async function deletePointsBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request.input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[timbangan_point_standards] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timbangan_points] WHERE session_id = @SessionId;
    `);
}

async function createPoint(sessionId, payload, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .input('PointOrder', sql.Int, payload.point_order)
    .input('Unit', sql.VarChar(10), payload.unit || 'kg')
    .input('IsActive', sql.Bit, boolBit(payload.is_active))
    .query(`
      INSERT INTO [dbo].[timbangan_points] (session_id, point_order, unit, is_active)
      OUTPUT INSERTED.point_id
      VALUES (@SessionId, @PointOrder, @Unit, @IsActive)
    `);
  return result.recordset[0].point_id;
}

async function insertPointStandard(sessionId, pointId, row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('PointId', sql.Int, pointId)
    .input('RowOrder', sql.Int, row.row_order)
    .input('AtNoId', sql.VarChar(20), toDbNull(row.at_no_id))
    .input('KonvensionalG', sql.Decimal(18, 6), row.konvensional_g ?? 0)
    .input('UcMg', sql.Decimal(18, 6), row.uc_mg ?? 0)
    .input('UutReading', sql.Decimal(18, 10), row.uut_reading ?? 0)
    .input('ZeroReading', sql.Decimal(18, 10), row.zero_reading ?? 0)
    .query(`
      INSERT INTO [dbo].[timbangan_point_standards]
        (session_id, point_id, row_order, at_no_id, konvensional_g, uc_mg, uut_reading, zero_reading)
      VALUES (@SessionId, @PointId, @RowOrder, @AtNoId, @KonvensionalG, @UcMg, @UutReading, @ZeroReading)
    `);
}

// ---------------------------------------------------------------------------
// ECCENTRICITY
// ---------------------------------------------------------------------------

async function listEccentricity(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT ecc_id, session_id, position, baca1, baca2
      FROM [dbo].[timbangan_eccentricity]
      WHERE session_id = @SessionId ORDER BY position ASC
    `);
  return result.recordset;
}

async function deleteEccentricityBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request.input('SessionId', sql.Int, sessionId)
    .query(`DELETE FROM [dbo].[timbangan_eccentricity] WHERE session_id = @SessionId`);
}

async function insertEccentricityRow(sessionId, row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('Position', sql.Int, row.position)
    .input('Baca1', sql.Decimal(18, 10), row.baca1 ?? 0)
    .input('Baca2', sql.Decimal(18, 10), row.baca2 ?? 0)
    .query(`
      INSERT INTO [dbo].[timbangan_eccentricity] (session_id, position, baca1, baca2)
      VALUES (@SessionId, @Position, @Baca1, @Baca2)
    `);
}

// ---------------------------------------------------------------------------
// HYSTERESIS
// ---------------------------------------------------------------------------

async function listHysteresis(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT hys_id, session_id, row_order, label, col1, col2
      FROM [dbo].[timbangan_hysteresis]
      WHERE session_id = @SessionId ORDER BY row_order ASC
    `);
  return result.recordset;
}

async function deleteHysteresisBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request.input('SessionId', sql.Int, sessionId)
    .query(`DELETE FROM [dbo].[timbangan_hysteresis] WHERE session_id = @SessionId`);
}

async function insertHysteresisRow(sessionId, row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('RowOrder', sql.Int, row.row_order)
    .input('Label', sql.VarChar(20), toDbNull(row.label))
    .input('Col1', sql.Decimal(18, 10), toDbNull(row.col1))
    .input('Col2', sql.Decimal(18, 10), toDbNull(row.col2))
    .query(`
      INSERT INTO [dbo].[timbangan_hysteresis] (session_id, row_order, label, col1, col2)
      VALUES (@SessionId, @RowOrder, @Label, @Col1, @Col2)
    `);
}

// ---------------------------------------------------------------------------
// RESULTS + SUMMARY
// ---------------------------------------------------------------------------

async function deleteResultsBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request.input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[timbangan_results] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[timbangan_result_summary] WHERE session_id = @SessionId;
    `);
}

async function insertResult(row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, row.session_id)
    .input('PointId', sql.Int, row.point_id)
    .input('PointOrder', sql.Int, row.point_order)
    .input('Unit', sql.VarChar(10), row.unit)
    .input('KonvMass', sql.Decimal(18, 10), toDbNull(row.konv_mass))
    .input('Reading', sql.Decimal(18, 10), toDbNull(row.reading))
    .input('ErrorValue', sql.Decimal(18, 10), toDbNull(row.error))
    .input('URepeatability', sql.Decimal(18, 12), toDbNull(row.u_repeatability))
    .input('UResolusi', sql.Decimal(18, 12), toDbNull(row.u_resolusi))
    .input('USertifikat', sql.Decimal(18, 12), toDbNull(row.u_sertifikat))
    .input('UCombined', sql.Decimal(18, 12), toDbNull(row.u_combined))
    .input('UExpanded', sql.Decimal(18, 12), toDbNull(row.u_expanded))
    .input('Tolerance', sql.Decimal(18, 10), toDbNull(row.tolerance))
    .input('PassFlag', sql.Bit, row.pass_flag === null || row.pass_flag === undefined ? null : (row.pass_flag ? 1 : 0))
    .query(`
      INSERT INTO [dbo].[timbangan_results]
        (session_id, point_id, point_order, unit, konv_mass, reading, error,
         u_repeatability, u_resolusi, u_sertifikat, u_combined, u_expanded, tolerance, pass_flag)
      VALUES
        (@SessionId, @PointId, @PointOrder, @Unit, @KonvMass, @Reading, @ErrorValue,
         @URepeatability, @UResolusi, @USertifikat, @UCombined, @UExpanded, @Tolerance, @PassFlag)
    `);
}

async function getResults(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      SELECT result_id, session_id, point_id, point_order, unit, konv_mass, reading, error,
             u_repeatability, u_resolusi, u_sertifikat, u_combined, u_expanded, tolerance, pass_flag, created_at
      FROM [dbo].[timbangan_results]
      WHERE session_id = @SessionId ORDER BY point_order ASC, point_id ASC
    `);
  return result.recordset;
}

async function upsertSummary(sessionId, s, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('SrHalf', sql.Decimal(18, 12), toDbNull(s.sr_half))
    .input('SrMax', sql.Decimal(18, 12), toDbNull(s.sr_max))
    .input('Sres', sql.Decimal(18, 12), toDbNull(s.sres))
    .input('KHalf', sql.Decimal(18, 10), toDbNull(s.k_half))
    .input('KMax', sql.Decimal(18, 10), toDbNull(s.k_max))
    .input('AvgHalfZero', sql.Decimal(18, 10), toDbNull(s.avg_half_zero))
    .input('AvgHalfReading', sql.Decimal(18, 10), toDbNull(s.avg_half_reading))
    .input('AvgMaxZero', sql.Decimal(18, 10), toDbNull(s.avg_max_zero))
    .input('AvgMaxReading', sql.Decimal(18, 10), toDbNull(s.avg_max_reading))
    .input('PreadjustResult', sql.Decimal(18, 10), toDbNull(s.preadjust_result))
    .input('PreadjustError', sql.Decimal(18, 10), toDbNull(s.preadjust_error))
    .input('EccentricityMax', sql.Decimal(18, 10), toDbNull(s.eccentricity_max))
    .input('Hysteresis', sql.Decimal(18, 10), toDbNull(s.hysteresis))
    .input('Cmax', sql.Decimal(18, 12), toDbNull(s.cmax))
    .input('UCmax', sql.Decimal(18, 12), toDbNull(s.u_cmax))
    .input('SrMaxUsed', sql.Decimal(18, 12), toDbNull(s.sr_max_used))
    .input('Lop', sql.Decimal(18, 12), toDbNull(s.lop))
    .input('CoverageFactor', sql.Decimal(18, 10), toDbNull(s.coverage_factor))
    .input('MaxExpanded', sql.Decimal(18, 12), toDbNull(s.max_expanded))
    .input('Conclusion', sql.VarChar(80), toDbNull(s.conclusion))
    .query(`
      IF EXISTS (SELECT 1 FROM [dbo].[timbangan_result_summary] WHERE session_id = @SessionId)
        UPDATE [dbo].[timbangan_result_summary] SET
          sr_half=@SrHalf, sr_max=@SrMax, sres=@Sres, k_half=@KHalf, k_max=@KMax,
          avg_half_zero=@AvgHalfZero, avg_half_reading=@AvgHalfReading,
          avg_max_zero=@AvgMaxZero, avg_max_reading=@AvgMaxReading,
          preadjust_result=@PreadjustResult, preadjust_error=@PreadjustError,
          eccentricity_max=@EccentricityMax, hysteresis=@Hysteresis,
          cmax=@Cmax, u_cmax=@UCmax, sr_max_used=@SrMaxUsed, lop=@Lop,
          coverage_factor=@CoverageFactor, max_expanded=@MaxExpanded, conclusion=@Conclusion,
          created_at=GETDATE()
        WHERE session_id = @SessionId
      ELSE
        INSERT INTO [dbo].[timbangan_result_summary]
          (session_id, sr_half, sr_max, sres, k_half, k_max, avg_half_zero, avg_half_reading,
           avg_max_zero, avg_max_reading, preadjust_result, preadjust_error, eccentricity_max,
           hysteresis, cmax, u_cmax, sr_max_used, lop, coverage_factor, max_expanded, conclusion)
        VALUES
          (@SessionId, @SrHalf, @SrMax, @Sres, @KHalf, @KMax, @AvgHalfZero, @AvgHalfReading,
           @AvgMaxZero, @AvgMaxReading, @PreadjustResult, @PreadjustError, @EccentricityMax,
           @Hysteresis, @Cmax, @UCmax, @SrMaxUsed, @Lop, @CoverageFactor, @MaxExpanded, @Conclusion)
    `);
}

async function getSummary(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`SELECT * FROM [dbo].[timbangan_result_summary] WHERE session_id = @SessionId`);
  return result.recordset[0] || null;
}

// ---------------------------------------------------------------------------
// AT MASTER (Anak Timbangan)
// ---------------------------------------------------------------------------

async function listAtStandards(filters = {}, transaction) {
  const request = await createRequest(transaction);
  const where = ['is_active = 1'];
  if (filters.search) {
    request.input('Search', sql.NVarChar(100), `%${filters.search}%`);
    where.push('(no_id LIKE @Search OR no_sertifikat LIKE @Search OR kelas LIKE @Search)');
  }
  const result = await request.query(`
    SELECT TOP 500 at_id, no_id, no_id_label, konvensional_g, uc_mg,
           no_sertifikat, rekalibrasi, tertelusur, kelas
    FROM [dbo].[timbangan_at_standards]
    WHERE ${where.join(' AND ')}
    ORDER BY konvensional_g ASC, no_id ASC
  `);
  return result.recordset;
}

async function getAtByNoId(noId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('NoId', sql.VarChar(20), String(noId).trim())
    .query(`
      SELECT TOP 1 at_id, no_id, no_id_label, konvensional_g, uc_mg,
             no_sertifikat, rekalibrasi, tertelusur, kelas
      FROM [dbo].[timbangan_at_standards]
      WHERE no_id = @NoId AND is_active = 1
    `);
  return result.recordset[0] || null;
}

async function getMetodeKalibrasi(transaction) {
  const request = await createRequest(transaction);
  const result = await request.query(`
    SELECT TOP 1 config_value FROM [dbo].[timbangan_config] WHERE config_key = 'METODE_KALIBRASI'
  `);
  return result.recordset[0]?.config_value || null;
}

// ---------------------------------------------------------------------------
// DA CANDIDATES (search-based browse — no hardcoded parameter filter)
// ---------------------------------------------------------------------------

// Sumber DA yang benar untuk Timbangan adalah T_Kalibrasi_DA_Timbangan (data
// produksi asli, parameter Timbangan) — BUKAN T_Kalibrasi_DA_Bagian (tabel
// generik, cuma berisi baris mock buatan seeder). Publish sertifikat juga
// harus resolve QA_ID dari sini (lihat createTimbanganCertDraftFromDa) supaya
// header Assm_Merk/SERIAL_NUMBER/dll konsisten dengan DA aslinya.
async function listTimbanganDaCandidates(filters = {}, transaction) {
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
    where.push('(A.Assm_No_identitas_Istrumen = @InstrumentCode OR A.Assm_No_identitas_kalibrasi = @InstrumentCode)');
  }

  if (filters.include_external === false) {
    where.push("COALESCE(NULLIF(LTRIM(RTRIM(A.Jenis_kalibrasi)), ''), '1') = '1'");
  }

  const whereSql = where.length ? `WHERE ${where.join('\n      AND ')}` : '';

  const result = await request.query(`
    SELECT TOP 100
      A.QA_ID, A.Jenis_kalibrasi, 'Timbangan' AS Parameter_Sertifikasi, A.Assm_nama_instrumen,
      A.Assm_No_identitas_Istrumen, A.Assm_No_identitas_kalibrasi, A.Group_Da_Dept,
      A.Assm_Kapasitas, A.Parameter_Kalibrasi, A.Assm_Lokasi, A.Parameter_Interval, A.Catatan
    FROM T_Kalibrasi_DA_Timbangan AS A
    ${whereSql}
    ORDER BY A.QA_ID ASC
  `);
  return result.recordset;
}

/** Draft a Sertifikat-Bagian header from a timbangan DA record (no param filter). */
async function createSertifikatBagianDraftFromTimbanganDa(qaId, idNoSertifikat, userId, delegatedTo, transaction) {
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

// ---------------------------------------------------------------------------
// LEGACY CERTIFICATE — T_Kalibrasi_Sertifikat_Timbangan (+ 4 detail tables)
//
// Unlike the generic Sertifikat-Bagian tables, the Timbangan-specific tables
// have dedicated columns for Pre-Adjustment / Daya Ulang / Massa Standar /
// Pusat Pan, matching what PrintMassa.jsx renders. The workbook publish flow
// targets these instead of Sertifikat-Bagian so no calculated section is
// silently dropped.
// ---------------------------------------------------------------------------

/** Look up a Timbangan DA candidate by QA_ID (T_Kalibrasi_DA_Timbangan, not DA_Bagian). */
async function getTimbanganDaByQaId(qaId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('QaId', sql.VarChar(50), qaId)
    .query(`
      SELECT TOP 1 QA_ID, Jenis_kalibrasi, Assm_nama_instrumen, Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi, Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept,
        Parameter_Kalibrasi, Parameter_No_id_anak_timbang, Parameter_Interval,
        Parameter_kriteria, Pelaksana_Verifikasi, Titik_verifikasi, Catatan
      FROM T_Kalibrasi_DA_Timbangan
      WHERE QA_ID = @QaId
    `);
  return result.recordset[0] || null;
}

async function getTimbanganCertHeader(qaId, idNoSertifikat, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('QaId', sql.VarChar(50), qaId)
    .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
    .query(`
      SELECT TOP 1
        QA_ID, ID_No_Sertifikat, Assm_nama_instrumen, Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi, Assm_Merk, SERIAL_NUMBER, Assm_Kapasitas, Assm_Lokasi,
        Nama, No_Ident_No_batch, No_Sertifikat, Tertelusur_melalui, Rekalibrasi,
        Tgl_kalibrasi, Interval, Metode_kalibrasi, Suhu_Kelembaban, Catatan,
        Group_Da_Dept, Parameter_Kalibrasi, BATAS_UNJUK_KERJA
      FROM T_Kalibrasi_Sertifikat_Timbangan
      WHERE QA_ID = @QaId AND ID_No_Sertifikat = @IdNoSertifikat
    `);
  return result.recordset[0] || null;
}

/** Draft a Sertifikat-Timbangan header from a T_Kalibrasi_DA_Timbangan record. */
async function createTimbanganCertDraftFromDa(qaId, idNoSertifikat, userId, delegatedTo, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('QaId', sql.VarChar(50), qaId)
    .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
    .input('UserId', sql.VarChar(100), toDbNull(userId))
    .input('DelegatedTo', sql.VarChar(100), toDbNull(delegatedTo))
    .query(`
      INSERT INTO T_Kalibrasi_Sertifikat_Timbangan
        (QA_ID, ID_No_Sertifikat, Jenis_kalibrasi, isSert_Manual, tgl,
         Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi,
         Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi,
         Parameter_No_id_anak_timbang, Parameter_Interval, Parameter_kriteria,
         Pelaksana_Verifikasi, Titik_verifikasi,
         UserID, Delegated_To, Process_date)
      SELECT
        QA_ID, @IdNoSertifikat, Jenis_kalibrasi, 1, GETDATE(),
        Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi,
        Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi,
        Parameter_No_id_anak_timbang, Parameter_Interval, Parameter_kriteria,
        Pelaksana_Verifikasi, Titik_verifikasi,
        @UserId, @DelegatedTo, GETDATE()
      FROM T_Kalibrasi_DA_Timbangan
      WHERE QA_ID = @QaId
    `);
  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function updateTimbanganCertHeader(payload, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('QaId', sql.VarChar(50), payload.qa_id)
    .input('IdNoSertifikat', sql.VarChar(50), payload.id_no_sertifikat)
    .input('AssmNamaInstrumen', sql.VarChar(2000), toDbNull(payload.assm_nama_instrumen))
    .input('AssmNoIdentitasKalibrasi', sql.VarChar(50), toDbNull(payload.assm_no_identitas_kalibrasi))
    .input('AssmMerk', sql.VarChar(50), toDbNull(payload.assm_merk))
    .input('SerialNumber', sql.VarChar(50), toDbNull(payload.serial_number))
    .input('AssmKapasitas', sql.VarChar(50), toDbNull(payload.assm_kapasitas))
    .input('AssmLokasi', sql.VarChar(2000), toDbNull(payload.assm_lokasi))
    .input('Nama', sql.VarChar(2000), toDbNull(payload.nama))
    .input('NoIdentNoBatch', sql.VarChar(50), toDbNull(payload.no_ident_no_batch))
    .input('NoSertifikat', sql.VarChar(50), toDbNull(payload.no_sertifikat))
    .input('TertelusurMelalui', sql.VarChar(50), toDbNull(payload.tertelusur_melalui))
    .input('Rekalibrasi', sql.VarChar(50), toDbNull(payload.rekalibrasi))
    .input('TglKalibrasi', sql.DateTime, toDbNull(payload.tgl_kalibrasi))
    .input('IntervalValue', sql.Int, toDbNull(payload.interval))
    .input('MetodeKalibrasi', sql.VarChar(50), toDbNull(payload.metode_kalibrasi))
    .input('SuhuKelembaban', sql.VarChar(50), toDbNull(payload.suhu_kelembaban))
    .input('Catatan', sql.VarChar(500), toDbNull(payload.catatan))
    .input('BatasUnjukKerja', sql.VarChar(1000), toDbNull(payload.batas_unjuk_kerja))
    .input('UserId', sql.VarChar(50), toDbNull(payload.user_id))
    .input('DelegatedTo', sql.VarChar(50), toDbNull(payload.delegated_to))
    .query(`
      UPDATE T_Kalibrasi_Sertifikat_Timbangan
      SET
        Assm_nama_instrumen = @AssmNamaInstrumen,
        Assm_No_identitas_kalibrasi = @AssmNoIdentitasKalibrasi,
        Assm_Merk = @AssmMerk,
        SERIAL_NUMBER = @SerialNumber,
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
        BATAS_UNJUK_KERJA = @BatasUnjukKerja,
        UserID = @UserId,
        Delegated_To = @DelegatedTo,
        Process_date = GETDATE()
      WHERE QA_ID = @QaId AND ID_No_Sertifikat = @IdNoSertifikat
    `);
  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function replaceTimbanganPreAdjRows(qaId, idNoSertifikat, rows, userId, delegatedTo, transaction) {
  const del = await createRequest(transaction);
  await del.input('QaId', sql.VarChar(50), qaId)
    .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
    .query(`DELETE FROM T_Kalibrasi_Sertifikat_Timbangan_Pre_Adj WHERE QA_ID = @QaId AND ID_No_Sertifikat = @IdNoSertifikat`);

  for (const row of rows) {
    const request = await createRequest(transaction);
    await request
      .input('QaId', sql.VarChar(50), qaId)
      .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
      .input('SeqId', sql.Int, row.seq_id)
      .input('PembacaanStandar', sql.VarChar(50), row.pembacaan_standar)
      .input('PembacaanAlat', sql.VarChar(50), row.pembacaan_alat)
      .input('ErrorValue', sql.VarChar(50), row.error)
      .input('UserId', sql.VarChar(100), toDbNull(userId))
      .input('DelegatedTo', sql.VarChar(100), toDbNull(delegatedTo))
      .query(`
        INSERT INTO T_Kalibrasi_Sertifikat_Timbangan_Pre_Adj
          (QA_ID, ID_No_Sertifikat, Seq_ID, Pembacaan_standar, Pembacaan_Alat, Error, UserID, Delegated_To, Process_date)
        VALUES
          (@QaId, @IdNoSertifikat, @SeqId, @PembacaanStandar, @PembacaanAlat, @ErrorValue, @UserId, @DelegatedTo, GETDATE())
      `);
  }
}

async function replaceTimbanganDayaUlangRows(qaId, idNoSertifikat, rows, userId, delegatedTo, transaction) {
  const del = await createRequest(transaction);
  await del.input('QaId', sql.VarChar(50), qaId)
    .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
    .query(`DELETE FROM T_Kalibrasi_Sertifikat_Timbangan_Daya_Ulang WHERE QA_ID = @QaId AND ID_No_Sertifikat = @IdNoSertifikat`);

  for (const row of rows) {
    const request = await createRequest(transaction);
    await request
      .input('QaId', sql.VarChar(50), qaId)
      .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
      .input('SeqId', sql.Int, row.seq_id)
      .input('MassaStandar', sql.VarChar(50), row.massa_standar)
      .input('StandarDeviasi', sql.VarChar(50), row.standar_deviasi)
      .input('UserId', sql.VarChar(100), toDbNull(userId))
      .input('DelegatedTo', sql.VarChar(100), toDbNull(delegatedTo))
      .query(`
        INSERT INTO T_Kalibrasi_Sertifikat_Timbangan_Daya_Ulang
          (QA_ID, ID_No_Sertifikat, Seq_ID, Massa_standar, Standar_deviasi, UserID, Delegated_To, Process_date)
        VALUES
          (@QaId, @IdNoSertifikat, @SeqId, @MassaStandar, @StandarDeviasi, @UserId, @DelegatedTo, GETDATE())
      `);
  }
}

async function replaceTimbanganMassaStdRows(qaId, idNoSertifikat, rows, userId, delegatedTo, transaction) {
  const del = await createRequest(transaction);
  await del.input('QaId', sql.VarChar(50), qaId)
    .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
    .query(`DELETE FROM T_Kalibrasi_Sertifikat_Timbangan_Massa_Std WHERE QA_ID = @QaId AND ID_No_Sertifikat = @IdNoSertifikat`);

  for (const row of rows) {
    const request = await createRequest(transaction);
    await request
      .input('QaId', sql.VarChar(50), qaId)
      .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
      .input('SeqId', sql.Int, row.seq_id)
      .input('KonvensionalStandar', sql.VarChar(50), row.konvensional_standar)
      .input('PembacaanAlat', sql.VarChar(50), row.pembacaan_alat)
      .input('ErrorValue', sql.VarChar(50), row.error)
      .input('Ketidakpastian', sql.VarChar(50), row.ketidakpastian)
      .input('UserId', sql.VarChar(100), toDbNull(userId))
      .input('DelegatedTo', sql.VarChar(100), toDbNull(delegatedTo))
      .query(`
        INSERT INTO T_Kalibrasi_Sertifikat_Timbangan_Massa_Std
          (QA_ID, ID_No_Sertifikat, Seq_ID, Konvensional_standar, Pembacaan_Alat, Error, Ketidakpastian, UserID, Delegated_To, Process_date)
        VALUES
          (@QaId, @IdNoSertifikat, @SeqId, @KonvensionalStandar, @PembacaanAlat, @ErrorValue, @Ketidakpastian, @UserId, @DelegatedTo, GETDATE())
      `);
  }
}

async function replaceTimbanganPusatPanRows(qaId, idNoSertifikat, rows, userId, delegatedTo, transaction) {
  const del = await createRequest(transaction);
  await del.input('QaId', sql.VarChar(50), qaId)
    .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
    .query(`DELETE FROM T_Kalibrasi_Sertifikat_Timbangan_Pusat_Pan WHERE QA_ID = @QaId AND ID_No_Sertifikat = @IdNoSertifikat`);

  for (const row of rows) {
    const request = await createRequest(transaction);
    await request
      .input('QaId', sql.VarChar(50), qaId)
      .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
      .input('SeqId', sql.Int, row.seq_id)
      .input('Massa', sql.VarChar(50), row.massa)
      .input('Massa0', sql.VarChar(50), row.massa_0)
      .input('Massa1', sql.VarChar(50), row.massa_1)
      .input('Massa2', sql.VarChar(50), row.massa_2)
      .input('Massa3', sql.VarChar(50), row.massa_3)
      .input('Massa4', sql.VarChar(50), row.massa_4)
      .input('PerbedaanMax', sql.VarChar(50), row.perbedaan_max)
      .input('UserId', sql.VarChar(100), toDbNull(userId))
      .input('DelegatedTo', sql.VarChar(100), toDbNull(delegatedTo))
      .query(`
        INSERT INTO T_Kalibrasi_Sertifikat_Timbangan_Pusat_Pan
          (QA_ID, ID_No_Sertifikat, Seq_ID, Massa, Massa_0, Massa_1, Massa_2, Massa_3, Massa_4, Perbedaan_Max, UserID, Delegated_To, Process_date)
        VALUES
          (@QaId, @IdNoSertifikat, @SeqId, @Massa, @Massa0, @Massa1, @Massa2, @Massa3, @Massa4, @PerbedaanMax, @UserId, @DelegatedTo, GETDATE())
      `);
  }
}

/**
 * Auto-approve the legacy certificate (Approver_No = 1) once the session's
 * role-based approval (admin+officer+manager) is complete. The old print-data
 * endpoint (getPrintDataTimbangan) refuses to serve data without this row —
 * it predates the workbook's admin/officer/manager approval flow, so there is
 * no equivalent approver identity to carry over; Approver_Identity is a
 * required legacy column not surfaced on the certificate, so it is stubbed.
 */
async function ensureTimbanganCertApproved(qaId, idNoSertifikat, userId, delegatedTo, transaction) {
  const check = await createRequest(transaction);
  const existing = await check
    .input('QaId', sql.VarChar(50), qaId)
    .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
    .query(`
      SELECT COUNT(*) AS n FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = @QaId AND ID_No_Sertifikat = @IdNoSertifikat AND Approver_No = 1
    `);
  if (existing.recordset[0]?.n > 0) return false;

  // User_ID/Delegated_To di tabel ini NVARCHAR(10) — dirancang untuk NIK karyawan
  // pendek (mis. "1526", "ASN"), bukan free-text actor ID seperti seeder/sistem.
  const insert = await createRequest(transaction);
  await insert
    .input('QaId', sql.VarChar(50), qaId)
    .input('IdNoSertifikat', sql.VarChar(50), idNoSertifikat)
    .input('UserId', sql.VarChar(10), String(userId || '').slice(0, 10))
    .input('DelegatedTo', sql.VarChar(10), String(delegatedTo || '').slice(0, 10))
    .query(`
      INSERT INTO T_Kalibrasi_Sertifikat_Timbangan_Status
        (QA_ID, ID_No_Sertifikat, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To)
      VALUES
        (@QaId, @IdNoSertifikat, 1, 0, '0', GETDATE(), @UserId, @DelegatedTo)
    `);
  return true;
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
  // pre-adjustment
  listPreadjust,
  deletePreadjustBySession,
  insertPreadjustRow,
  // repeatability
  listRepeatability,
  deleteRepeatabilityBySession,
  insertRepeatabilityRow,
  // points + standards
  listPoints,
  listPointStandards,
  deletePointsBySession,
  createPoint,
  insertPointStandard,
  // eccentricity
  listEccentricity,
  deleteEccentricityBySession,
  insertEccentricityRow,
  // hysteresis
  listHysteresis,
  deleteHysteresisBySession,
  insertHysteresisRow,
  // results / summary
  deleteResultsBySession,
  insertResult,
  getResults,
  upsertSummary,
  getSummary,
  // AT master
  listAtStandards,
  getAtByNoId,
  getMetodeKalibrasi,
  // DA + certificate (reused generic helpers)
  listTimbanganDaCandidates,
  createSertifikatBagianDraftFromTimbanganDa,
  getDaBagianByQaId: workbookRepo.getDaBagianByQaId,
  getNextTekananCertificateNumber: workbookRepo.getNextTekananCertificateNumber,
  getNextCertificateNumberByCode: workbookRepo.getNextCertificateNumberByCode,
  getSertifikatBagianHeader: workbookRepo.getSertifikatBagianHeader,
  updateSertifikatBagianHeader: workbookRepo.updateSertifikatBagianHeader,
  replaceSertifikatBagianHasilKalRows: workbookRepo.replaceSertifikatBagianHasilKalRows,
  insertAuditLog: workbookRepo.insertAuditLog,
  // legacy Sertifikat-Timbangan (Pre-Adj / Daya Ulang / Massa Std / Pusat Pan)
  getTimbanganDaByQaId,
  getTimbanganCertHeader,
  createTimbanganCertDraftFromDa,
  updateTimbanganCertHeader,
  replaceTimbanganPreAdjRows,
  replaceTimbanganDayaUlangRows,
  replaceTimbanganMassaStdRows,
  replaceTimbanganPusatPanRows,
  ensureTimbanganCertApproved,
};
