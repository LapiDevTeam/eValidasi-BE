'use strict';

const sql = require('mssql');
const workbookRepo = require('./calibration-workbook.repository');

const { getPool, createRequest } = workbookRepo;

function toDbNull(value) {
  return value === undefined ? null : value;
}

const SESSION_COLUMNS = `
  session_id, session_code, instrument_id, instrument_code, instrument_name,
  merk_tipe, no_seri, kapasitas, resolusi, lokasi, calibration_date,
  interval_bulan, metode_kalibrasi, keterangan, tolerance_accuracy,
  temperature, humidity, std_nama, std_no_identitas, std_no_sertifikat,
  std_tertelusur, std_rekalibrasi, qa_id, id_no_sertifikat, status,
  pic, conclusion, evaluation_result,
  approved_by_admin, approved_by_admin_date,
  approved_by_officer, approved_by_officer_date,
  approved_by_manager, approved_by_manager_date,
  rejected_by, rejected_reason, rejected_at,
  created_by, updated_by, created_at, updated_at
`;

async function listSessions(filters = {}) {
  const request = await createRequest();
  const where = [];
  if (filters.status) {
    request.input('Status', sql.VarChar(30), String(filters.status).toUpperCase());
    where.push('s.status = @Status');
  }
  let query = `
    SELECT
      s.session_id, s.session_code, s.instrument_code, s.instrument_name,
      s.calibration_date, s.status, s.pic, s.conclusion, s.evaluation_result,
      s.qa_id, s.id_no_sertifikat, s.created_at, s.updated_at
    FROM [dbo].[rpm_sessions] s
  `;
  if (where.length) query += `\nWHERE ${where.join('\n  AND ')}`;
  query += '\nORDER BY s.session_id DESC';
  const result = await request.query(query);
  return result.recordset;
}

async function getSessionById(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`SELECT ${SESSION_COLUMNS} FROM [dbo].[rpm_sessions] WHERE session_id = @SessionId`);
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
    .input('ToleranceAccuracy', sql.Decimal(18, 10), toDbNull(payload.tolerance_accuracy))
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
    INSERT INTO [dbo].[rpm_sessions]
    (
      session_code, instrument_id, instrument_code, instrument_name,
      merk_tipe, no_seri, kapasitas, resolusi, lokasi, calibration_date,
      interval_bulan, metode_kalibrasi, keterangan, tolerance_accuracy,
      temperature, humidity, std_nama, std_no_identitas, std_no_sertifikat,
      std_tertelusur, std_rekalibrasi, qa_id, status, pic, evaluation_result, created_by
    )
    VALUES
    (
      @SessionCode, @InstrumentId, @InstrumentCode, @InstrumentName,
      @MerkTipe, @NoSeri, @Kapasitas, @Resolusi, @Lokasi, @CalibrationDate,
      @IntervalBulan, @MetodeKalibrasi, @Keterangan, @ToleranceAccuracy,
      @Temperature, @Humidity, @StdNama, @StdNoIdentitas, @StdNoSertifikat,
      @StdTertelusur, @StdRekalibrasi, @QaId, @Status, @Pic, @EvaluationResult, @CreatedBy
    );
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS session_id;
  `);
  return result.recordset[0].session_id;
}

async function updateSession(sessionId, payload, transaction) {
  const request = await createRequest(transaction);
  bindSessionInputs(request, payload)
    .input('SessionId', sql.Int, sessionId)
    .input('UpdatedBy', sql.VarChar(100), toDbNull(payload.updated_by));
  const result = await request.query(`
    UPDATE [dbo].[rpm_sessions] SET
      session_code = @SessionCode,
      instrument_id = @InstrumentId,
      instrument_code = @InstrumentCode,
      instrument_name = @InstrumentName,
      merk_tipe = @MerkTipe,
      no_seri = @NoSeri,
      kapasitas = @Kapasitas,
      resolusi = @Resolusi,
      lokasi = @Lokasi,
      calibration_date = @CalibrationDate,
      interval_bulan = @IntervalBulan,
      metode_kalibrasi = @MetodeKalibrasi,
      keterangan = @Keterangan,
      tolerance_accuracy = @ToleranceAccuracy,
      temperature = @Temperature,
      humidity = @Humidity,
      std_nama = @StdNama,
      std_no_identitas = @StdNoIdentitas,
      std_no_sertifikat = @StdNoSertifikat,
      std_tertelusur = @StdTertelusur,
      std_rekalibrasi = @StdRekalibrasi,
      qa_id = @QaId,
      pic = @Pic,
      evaluation_result = @EvaluationResult,
      updated_by = @UpdatedBy,
      updated_at = GETDATE()
    WHERE session_id = @SessionId
  `);
  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function updateSessionStatus(sessionId, status, updatedBy, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('Status', sql.VarChar(30), status)
    .input('UpdatedBy', sql.VarChar(100), toDbNull(updatedBy))
    .query(`
      UPDATE [dbo].[rpm_sessions]
      SET status = @Status, updated_by = @UpdatedBy, updated_at = GETDATE()
      WHERE session_id = @SessionId
    `);
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
      UPDATE [dbo].[rpm_sessions]
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
      UPDATE [dbo].[rpm_sessions]
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
      UPDATE [dbo].[rpm_sessions]
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
    .query('UPDATE [dbo].[rpm_sessions] SET conclusion = @Conclusion WHERE session_id = @SessionId');
}

async function updateSessionCertificate(sessionId, idNoSertifikat, qaId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('IdNoSertifikat', sql.VarChar(50), toDbNull(idNoSertifikat))
    .input('QaId', sql.VarChar(50), toDbNull(qaId))
    .query(`
      UPDATE [dbo].[rpm_sessions]
      SET id_no_sertifikat = @IdNoSertifikat, qa_id = @QaId, updated_at = GETDATE()
      WHERE session_id = @SessionId
    `);
}

async function deleteWorkbookBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[rpm_results] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[rpm_result_summary] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[rpm_readings] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[rpm_points] WHERE session_id = @SessionId;
    `);
}

async function deleteSessionGraph(sessionId, transaction) {
  await deleteWorkbookBySession(sessionId, transaction);
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query('DELETE FROM [dbo].[rpm_sessions] WHERE session_id = @SessionId');
  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function insertPoint(sessionId, point, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('PointNo', sql.Int, point.point_no)
    .input('NominalValue', sql.Decimal(18, 10), point.nominal_value || 0)
    .input('Correction', sql.Decimal(18, 10), point.correction || 0)
    .input('Uc', sql.Decimal(18, 10), point.uc || 0)
    .input('DigitalResolution', sql.Decimal(18, 10), point.digital_resolution || 0)
    .input('AnalogResolution', sql.Decimal(18, 10), point.analog_resolution || 0)
    .query(`
      INSERT INTO [dbo].[rpm_points]
        (session_id, point_no, nominal_value, correction, uc, digital_resolution, analog_resolution)
      VALUES
        (@SessionId, @PointNo, @NominalValue, @Correction, @Uc, @DigitalResolution, @AnalogResolution)
    `);
}

async function insertReading(sessionId, row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('PointNo', sql.Int, row.point_no)
    .input('SequenceNo', sql.Int, row.sequence_no)
    .input('StandardValue', sql.Decimal(18, 10), row.standard_value || 0)
    .input('UutValue', sql.Decimal(18, 10), row.uut_value || 0)
    .query(`
      INSERT INTO [dbo].[rpm_readings]
        (session_id, point_no, sequence_no, standard_value, uut_value)
      VALUES (@SessionId, @PointNo, @SequenceNo, @StandardValue, @UutValue)
    `);
}

async function listPoints(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query('SELECT * FROM [dbo].[rpm_points] WHERE session_id = @SessionId ORDER BY point_no');
  return result.recordset;
}

async function listReadings(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query('SELECT * FROM [dbo].[rpm_readings] WHERE session_id = @SessionId ORDER BY point_no, sequence_no');
  return result.recordset;
}

async function deleteResultsBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[rpm_results] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[rpm_result_summary] WHERE session_id = @SessionId;
    `);
}

async function insertResult(row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, row.session_id)
    .input('PointNo', sql.Int, row.point_no)
    .input('NominalValue', sql.Decimal(18, 10), row.nominal_value)
    .input('MeanStandard', sql.Decimal(18, 10), row.mean_standard)
    .input('MeanUut', sql.Decimal(18, 10), row.mean_uut)
    .input('MeanError', sql.Decimal(18, 10), row.mean_error)
    .input('SdValue', sql.Decimal(18, 10), row.sd_value)
    .input('UCombined', sql.Decimal(18, 10), row.u_combined)
    .input('UExpanded', sql.Decimal(18, 10), row.u_expanded)
    .input('Tolerance', sql.Decimal(18, 10), toDbNull(row.tolerance))
    .input('PassFlag', sql.Bit, row.pass_flag === null || row.pass_flag === undefined ? null : (row.pass_flag ? 1 : 0))
    .query(`
      INSERT INTO [dbo].[rpm_results]
        (session_id, point_no, nominal_value, mean_standard, mean_uut, mean_error,
         sd_value, u_combined, u_expanded, tolerance, pass_flag)
      VALUES
        (@SessionId, @PointNo, @NominalValue, @MeanStandard, @MeanUut, @MeanError,
         @SdValue, @UCombined, @UExpanded, @Tolerance, @PassFlag)
    `);
}

async function upsertSummary(sessionId, summary, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('CoverageFactor', sql.Decimal(18, 10), summary.coverage_factor)
    .input('MaxUExpanded', sql.Decimal(18, 10), summary.max_u_expanded)
    .input('Conclusion', sql.VarChar(50), toDbNull(summary.conclusion))
    .query(`
      IF EXISTS (SELECT 1 FROM [dbo].[rpm_result_summary] WHERE session_id = @SessionId)
        UPDATE [dbo].[rpm_result_summary]
        SET coverage_factor = @CoverageFactor,
            max_u_expanded = @MaxUExpanded,
            conclusion = @Conclusion,
            created_at = GETDATE()
        WHERE session_id = @SessionId
      ELSE
        INSERT INTO [dbo].[rpm_result_summary] (session_id, coverage_factor, max_u_expanded, conclusion)
        VALUES (@SessionId, @CoverageFactor, @MaxUExpanded, @Conclusion)
    `);
}

async function getResults(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query('SELECT * FROM [dbo].[rpm_results] WHERE session_id = @SessionId ORDER BY point_no');
  return result.recordset;
}

async function getSummary(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query('SELECT * FROM [dbo].[rpm_result_summary] WHERE session_id = @SessionId');
  return result.recordset[0] || null;
}

async function listRpmStandards(transaction) {
  const request = await createRequest(transaction);
  const result = await request.query('SELECT * FROM [dbo].[rpm_standards] ORDER BY nominal_value');
  return result.recordset;
}

async function listRpmDaCandidates(filters = {}, transaction) {
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
      OR A.Parameter_Sertifikasi LIKE @Search
    )`);
  } else if (filters.qa_id) {
    request.input('QaId', sql.VarChar(50), filters.qa_id);
    where.push('A.QA_ID = @QaId');
  } else if (filters.instrument_code) {
    request.input('InstrumentCode', sql.VarChar(255), filters.instrument_code);
    where.push('(A.Assm_No_identitas_Istrumen = @InstrumentCode OR A.Assm_No_identitas_kalibrasi = @InstrumentCode)');
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

async function createSertifikatBagianDraftFromRpmDa(qaId, idNoSertifikat, userId, delegatedTo, transaction) {
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
  deleteWorkbookBySession,
  deleteSessionGraph,
  insertPoint,
  insertReading,
  listPoints,
  listReadings,
  deleteResultsBySession,
  insertResult,
  upsertSummary,
  getResults,
  getSummary,
  listRpmStandards,
  listRpmDaCandidates,
  createSertifikatBagianDraftFromRpmDa,
  getDaBagianByQaId: workbookRepo.getDaBagianByQaId,
  getNextCertificateNumberByCode: workbookRepo.getNextCertificateNumberByCode,
  getSertifikatBagianHeader: workbookRepo.getSertifikatBagianHeader,
  updateSertifikatBagianHeader: workbookRepo.updateSertifikatBagianHeader,
  replaceSertifikatBagianHasilKalRows: workbookRepo.replaceSertifikatBagianHasilKalRows,
  insertAuditLog: workbookRepo.insertAuditLog,
};
