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
  interval_bulan, metode_kalibrasi, keterangan, nominal_target, lower_limit,
  upper_limit, tolerance_text, temperature, humidity, std_nama, std_no_identitas,
  std_no_sertifikat, std_tertelusur, std_rekalibrasi, qa_id, id_no_sertifikat,
  status, pic, conclusion, evaluation_result, created_by, updated_by, created_at, updated_at
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
    FROM [dbo].[tapped_volumeter_sessions] s
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
    .query(`SELECT ${SESSION_COLUMNS} FROM [dbo].[tapped_volumeter_sessions] WHERE session_id = @SessionId`);
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
    .input('NominalTarget', sql.Decimal(18, 10), toDbNull(payload.nominal_target))
    .input('LowerLimit', sql.Decimal(18, 10), toDbNull(payload.lower_limit))
    .input('UpperLimit', sql.Decimal(18, 10), toDbNull(payload.upper_limit))
    .input('ToleranceText', sql.VarChar(255), toDbNull(payload.tolerance_text))
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
    INSERT INTO [dbo].[tapped_volumeter_sessions]
    (
      session_code, instrument_id, instrument_code, instrument_name,
      merk_tipe, no_seri, kapasitas, resolusi, lokasi, calibration_date,
      interval_bulan, metode_kalibrasi, keterangan, nominal_target, lower_limit,
      upper_limit, tolerance_text, temperature, humidity, std_nama, std_no_identitas,
      std_no_sertifikat, std_tertelusur, std_rekalibrasi, qa_id, status, pic, evaluation_result, created_by
    )
    VALUES
    (
      @SessionCode, @InstrumentId, @InstrumentCode, @InstrumentName,
      @MerkTipe, @NoSeri, @Kapasitas, @Resolusi, @Lokasi, @CalibrationDate,
      @IntervalBulan, @MetodeKalibrasi, @Keterangan, @NominalTarget, @LowerLimit,
      @UpperLimit, @ToleranceText, @Temperature, @Humidity, @StdNama, @StdNoIdentitas,
      @StdNoSertifikat, @StdTertelusur, @StdRekalibrasi, @QaId, @Status, @Pic, @EvaluationResult, @CreatedBy
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
    UPDATE [dbo].[tapped_volumeter_sessions] SET
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
      nominal_target = @NominalTarget,
      lower_limit = @LowerLimit,
      upper_limit = @UpperLimit,
      tolerance_text = @ToleranceText,
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
      UPDATE [dbo].[tapped_volumeter_sessions]
      SET status = @Status, updated_by = @UpdatedBy, updated_at = GETDATE()
      WHERE session_id = @SessionId
    `);
}

async function updateSessionConclusion(sessionId, conclusion, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('Conclusion', sql.VarChar(50), toDbNull(conclusion))
    .query('UPDATE [dbo].[tapped_volumeter_sessions] SET conclusion = @Conclusion WHERE session_id = @SessionId');
}

async function updateSessionCertificate(sessionId, idNoSertifikat, qaId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('IdNoSertifikat', sql.VarChar(50), toDbNull(idNoSertifikat))
    .input('QaId', sql.VarChar(50), toDbNull(qaId))
    .query(`
      UPDATE [dbo].[tapped_volumeter_sessions]
      SET id_no_sertifikat = @IdNoSertifikat, qa_id = @QaId, updated_at = GETDATE()
      WHERE session_id = @SessionId
    `);
}

async function deleteWorkbookBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[tapped_volumeter_results] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[tapped_volumeter_result_summary] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[tapped_volumeter_readings] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[tapped_volumeter_settings] WHERE session_id = @SessionId;
    `);
}

async function deleteSessionGraph(sessionId, transaction) {
  await deleteWorkbookBySession(sessionId, transaction);
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query('DELETE FROM [dbo].[tapped_volumeter_sessions] WHERE session_id = @SessionId');
  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function insertSetting(sessionId, setting, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('SettingNo', sql.Int, setting.setting_no)
    .input('SettingValue', sql.Decimal(18, 10), setting.setting_value || 0)
    .input('ErrorStd', sql.Decimal(18, 10), setting.error_std || 0)
    .query(`
      INSERT INTO [dbo].[tapped_volumeter_settings]
        (session_id, setting_no, setting_value, error_std)
      VALUES (@SessionId, @SettingNo, @SettingValue, @ErrorStd)
    `);
}

async function insertReading(sessionId, row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('SettingNo', sql.Int, row.setting_no)
    .input('SequenceNo', sql.Int, row.sequence_no)
    .input('JumlahKetukan', sql.Decimal(18, 10), row.jumlah_ketukan || 0)
    .input('Waktu', sql.Decimal(18, 10), row.waktu || 0)
    .query(`
      INSERT INTO [dbo].[tapped_volumeter_readings]
        (session_id, setting_no, sequence_no, jumlah_ketukan, waktu)
      VALUES (@SessionId, @SettingNo, @SequenceNo, @JumlahKetukan, @Waktu)
    `);
}

async function listSettings(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query('SELECT * FROM [dbo].[tapped_volumeter_settings] WHERE session_id = @SessionId ORDER BY setting_no');
  return result.recordset;
}

async function listReadings(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query('SELECT * FROM [dbo].[tapped_volumeter_readings] WHERE session_id = @SessionId ORDER BY setting_no, sequence_no');
  return result.recordset;
}

async function deleteResultsBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[tapped_volumeter_results] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[tapped_volumeter_result_summary] WHERE session_id = @SessionId;
    `);
}

async function insertResult(row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, row.session_id)
    .input('SettingNo', sql.Int, row.setting_no)
    .input('SettingValue', sql.Decimal(18, 10), toDbNull(row.setting_value))
    .input('MeanJumlahKetukan', sql.Decimal(18, 10), toDbNull(row.mean_jumlah_ketukan))
    .input('MeanWaktu', sql.Decimal(18, 10), toDbNull(row.mean_waktu))
    .input('MeanWaktuPlusError', sql.Decimal(18, 10), toDbNull(row.mean_waktu_plus_error))
    .input('MeanKetukanPerMenit', sql.Decimal(18, 10), toDbNull(row.mean_ketukan_per_menit))
    .input('MsTms', sql.VarChar(5), toDbNull(row.ms_tms))
    .input('PassFlag', sql.Bit, row.pass_flag === null || row.pass_flag === undefined ? null : (row.pass_flag ? 1 : 0))
    .query(`
      INSERT INTO [dbo].[tapped_volumeter_results]
        (session_id, setting_no, setting_value, mean_jumlah_ketukan, mean_waktu,
         mean_waktu_plus_error, mean_ketukan_per_menit, ms_tms, pass_flag)
      VALUES
        (@SessionId, @SettingNo, @SettingValue, @MeanJumlahKetukan, @MeanWaktu,
         @MeanWaktuPlusError, @MeanKetukanPerMenit, @MsTms, @PassFlag)
    `);
}

async function upsertSummary(sessionId, summary, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('NominalTarget', sql.Decimal(18, 10), toDbNull(summary.nominal_target))
    .input('LowerLimit', sql.Decimal(18, 10), toDbNull(summary.lower_limit))
    .input('UpperLimit', sql.Decimal(18, 10), toDbNull(summary.upper_limit))
    .input('AllMs', sql.Bit, summary.all_ms === null || summary.all_ms === undefined ? null : (summary.all_ms ? 1 : 0))
    .input('Conclusion', sql.VarChar(50), toDbNull(summary.conclusion))
    .query(`
      IF EXISTS (SELECT 1 FROM [dbo].[tapped_volumeter_result_summary] WHERE session_id = @SessionId)
        UPDATE [dbo].[tapped_volumeter_result_summary]
        SET nominal_target = @NominalTarget,
            lower_limit = @LowerLimit,
            upper_limit = @UpperLimit,
            all_ms = @AllMs,
            conclusion = @Conclusion,
            created_at = GETDATE()
        WHERE session_id = @SessionId
      ELSE
        INSERT INTO [dbo].[tapped_volumeter_result_summary]
          (session_id, nominal_target, lower_limit, upper_limit, all_ms, conclusion)
        VALUES (@SessionId, @NominalTarget, @LowerLimit, @UpperLimit, @AllMs, @Conclusion)
    `);
}

async function getResults(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query('SELECT * FROM [dbo].[tapped_volumeter_results] WHERE session_id = @SessionId ORDER BY setting_no');
  return result.recordset;
}

async function getSummary(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query('SELECT * FROM [dbo].[tapped_volumeter_result_summary] WHERE session_id = @SessionId');
  return result.recordset[0] || null;
}

async function listTappedVolumeterDaCandidates(filters = {}, transaction) {
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

async function createSertifikatBagianDraftFromTappedVolumeterDa(qaId, idNoSertifikat, userId, delegatedTo, transaction) {
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
  updateSessionConclusion,
  updateSessionCertificate,
  deleteWorkbookBySession,
  deleteSessionGraph,
  insertSetting,
  insertReading,
  listSettings,
  listReadings,
  deleteResultsBySession,
  insertResult,
  upsertSummary,
  getResults,
  getSummary,
  listTappedVolumeterDaCandidates,
  createSertifikatBagianDraftFromTappedVolumeterDa,
  getDaBagianByQaId: workbookRepo.getDaBagianByQaId,
  getNextCertificateNumberByCode: workbookRepo.getNextCertificateNumberByCode,
  getSertifikatBagianHeader: workbookRepo.getSertifikatBagianHeader,
  updateSertifikatBagianHeader: workbookRepo.updateSertifikatBagianHeader,
  replaceSertifikatBagianHasilKalRows: workbookRepo.replaceSertifikatBagianHasilKalRows,
  insertAuditLog: workbookRepo.insertAuditLog,
};
