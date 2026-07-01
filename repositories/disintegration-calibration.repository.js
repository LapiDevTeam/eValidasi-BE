'use strict';

const sql = require('mssql');
const workbookRepo = require('./calibration-workbook.repository');

const { getPool, createRequest } = workbookRepo;

function toDbNull(value) {
  return value === undefined ? null : value;
}

const SESSION_COLUMNS = `
  session_id, session_code, instrument_id, instrument_code, instrument_name,
  merk_tipe, no_seri, kapasitas, resolusi, lokasi, calibration_date, interval_bulan,
  metode_kalibrasi, keterangan, paddle_count, timer_tolerance_sec,
  temperature_setting, temperature_tolerance, temperature, humidity,
  std_nama, std_no_identitas, std_no_sertifikat, std_tertelusur, std_rekalibrasi,
  qa_id, id_no_sertifikat, status, pic, conclusion, evaluation_result,
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
      s.calibration_date, s.paddle_count, s.status, s.pic, s.conclusion, s.evaluation_result,
      s.qa_id, s.id_no_sertifikat, s.created_at, s.updated_at
    FROM [dbo].[disintegration_sessions] s
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
    .query(`SELECT ${SESSION_COLUMNS} FROM [dbo].[disintegration_sessions] WHERE session_id = @SessionId`);
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
    .input('PaddleCount', sql.Int, payload.paddle_count || 1)
    .input('TimerToleranceSec', sql.Decimal(18, 6), toDbNull(payload.timer_tolerance_sec))
    .input('TemperatureSetting', sql.Decimal(18, 6), toDbNull(payload.temperature_setting))
    .input('TemperatureTolerance', sql.Decimal(18, 6), toDbNull(payload.temperature_tolerance))
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
    INSERT INTO [dbo].[disintegration_sessions]
    (
      session_code, instrument_id, instrument_code, instrument_name,
      merk_tipe, no_seri, kapasitas, resolusi, lokasi, calibration_date, interval_bulan,
      metode_kalibrasi, keterangan, paddle_count, timer_tolerance_sec,
      temperature_setting, temperature_tolerance, temperature, humidity,
      std_nama, std_no_identitas, std_no_sertifikat, std_tertelusur, std_rekalibrasi,
      qa_id, status, pic, evaluation_result, created_by
    )
    VALUES
    (
      @SessionCode, @InstrumentId, @InstrumentCode, @InstrumentName,
      @MerkTipe, @NoSeri, @Kapasitas, @Resolusi, @Lokasi, @CalibrationDate, @IntervalBulan,
      @MetodeKalibrasi, @Keterangan, @PaddleCount, @TimerToleranceSec,
      @TemperatureSetting, @TemperatureTolerance, @Temperature, @Humidity,
      @StdNama, @StdNoIdentitas, @StdNoSertifikat, @StdTertelusur, @StdRekalibrasi,
      @QaId, @Status, @Pic, @EvaluationResult, @CreatedBy
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
    UPDATE [dbo].[disintegration_sessions] SET
      session_code = @SessionCode, instrument_id = @InstrumentId,
      instrument_code = @InstrumentCode, instrument_name = @InstrumentName,
      merk_tipe = @MerkTipe, no_seri = @NoSeri, kapasitas = @Kapasitas,
      resolusi = @Resolusi, lokasi = @Lokasi, calibration_date = @CalibrationDate,
      interval_bulan = @IntervalBulan, metode_kalibrasi = @MetodeKalibrasi,
      keterangan = @Keterangan, paddle_count = @PaddleCount,
      timer_tolerance_sec = @TimerToleranceSec,
      temperature_setting = @TemperatureSetting, temperature_tolerance = @TemperatureTolerance,
      temperature = @Temperature, humidity = @Humidity,
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
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('Status', sql.VarChar(30), status)
    .input('UpdatedBy', sql.VarChar(100), toDbNull(updatedBy))
    .query(`
      UPDATE [dbo].[disintegration_sessions]
      SET status = @Status, updated_by = @UpdatedBy, updated_at = GETDATE()
      WHERE session_id = @SessionId
    `);
}

async function updateSessionConclusion(sessionId, conclusion, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('Conclusion', sql.VarChar(50), toDbNull(conclusion))
    .query('UPDATE [dbo].[disintegration_sessions] SET conclusion = @Conclusion WHERE session_id = @SessionId');
}

async function updateSessionCertificate(sessionId, idNoSertifikat, qaId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('IdNoSertifikat', sql.VarChar(50), toDbNull(idNoSertifikat))
    .input('QaId', sql.VarChar(50), toDbNull(qaId))
    .query(`
      UPDATE [dbo].[disintegration_sessions]
      SET id_no_sertifikat = @IdNoSertifikat, qa_id = @QaId, updated_at = GETDATE()
      WHERE session_id = @SessionId
    `);
}

async function deleteSessionGraph(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[disintegration_results] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[disintegration_result_summary] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[disintegration_timer_readings] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[disintegration_distance_rows] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[disintegration_stroke_rows] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[disintegration_temperature_inputs] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[disintegration_temperature_readings] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[disintegration_sessions] WHERE session_id = @SessionId;
    `);
  return (result.rowsAffected && result.rowsAffected.some((n) => n > 0)) || false;
}

async function deleteWorkbookBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[disintegration_results] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[disintegration_result_summary] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[disintegration_timer_readings] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[disintegration_distance_rows] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[disintegration_stroke_rows] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[disintegration_temperature_inputs] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[disintegration_temperature_readings] WHERE session_id = @SessionId;
    `);
}

async function upsertTemperatureInputs(sessionId, input, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('CorrectionReadout', sql.Decimal(18, 10), input.correction_readout || 0)
    .input('CorrectionThermocouple', sql.Decimal(18, 10), input.correction_thermocouple || 0)
    .input('UcReadout', sql.Decimal(18, 10), input.uc_readout || 0)
    .input('UcThermocouple', sql.Decimal(18, 10), input.uc_thermocouple || 0)
    .input('DigitalResolution', sql.Decimal(18, 10), input.digital_resolution || 0)
    .input('AnalogResolution', sql.Decimal(18, 10), input.analog_resolution || 0)
    .query(`
      INSERT INTO [dbo].[disintegration_temperature_inputs]
        (session_id, correction_readout, correction_thermocouple, uc_readout, uc_thermocouple, digital_resolution, analog_resolution)
      VALUES
        (@SessionId, @CorrectionReadout, @CorrectionThermocouple, @UcReadout, @UcThermocouple, @DigitalResolution, @AnalogResolution)
    `);
}

async function insertTemperatureReading(sessionId, row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('PointNo', sql.Int, row.point_no)
    .input('SequenceNo', sql.Int, row.sequence_no)
    .input('StandardValue', sql.Decimal(18, 10), row.standard_value || 0)
    .input('UutValue', sql.Decimal(18, 10), row.uut_value || 0)
    .query(`
      INSERT INTO [dbo].[disintegration_temperature_readings]
        (session_id, point_no, sequence_no, standard_value, uut_value)
      VALUES (@SessionId, @PointNo, @SequenceNo, @StandardValue, @UutValue)
    `);
}

async function insertStrokeRow(sessionId, row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('PaddleNo', sql.Int, row.paddle_no)
    .input('SequenceNo', sql.Int, row.sequence_no)
    .input('SecondsPerStroke', sql.Decimal(18, 10), row.seconds_per_stroke || 0)
    .query(`
      INSERT INTO [dbo].[disintegration_stroke_rows]
        (session_id, paddle_no, sequence_no, seconds_per_stroke)
      VALUES (@SessionId, @PaddleNo, @SequenceNo, @SecondsPerStroke)
    `);
}

async function insertDistanceRow(sessionId, row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('PaddleNo', sql.Int, row.paddle_no)
    .input('SequenceNo', sql.Int, row.sequence_no)
    .input('DistanceMm', sql.Decimal(18, 10), row.distance_mm || 0)
    .query(`
      INSERT INTO [dbo].[disintegration_distance_rows]
        (session_id, paddle_no, sequence_no, distance_mm)
      VALUES (@SessionId, @PaddleNo, @SequenceNo, @DistanceMm)
    `);
}

async function insertTimerReading(sessionId, row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('PaddleNo', sql.Int, row.paddle_no)
    .input('SequenceNo', sql.Int, row.sequence_no)
    .input('NominalValue', sql.Decimal(18, 10), row.nominal_value || 5)
    .input('Unit', sql.VarChar(20), row.unit || 'Menit')
    .input('StdJam', sql.Decimal(18, 10), row.std_jam || 0)
    .input('StdMenit', sql.Decimal(18, 10), row.std_menit || 0)
    .input('StdDetik', sql.Decimal(18, 10), row.std_detik || 0)
    .input('StdMdetik', sql.Decimal(18, 10), row.std_mdetik || 0)
    .input('UutJam', sql.Decimal(18, 10), row.uut_jam || 0)
    .input('UutMenit', sql.Decimal(18, 10), row.uut_menit || 0)
    .input('UutDetik', sql.Decimal(18, 10), row.uut_detik || 0)
    .input('UutMdetik', sql.Decimal(18, 10), row.uut_mdetik || 0)
    .input('CorrectionStd', sql.Decimal(18, 10), row.correction_std || 0)
    .input('UcStd', sql.Decimal(18, 10), row.uc_std || 0)
    .input('DigitalResolution', sql.Decimal(18, 10), row.digital_resolution || 0)
    .input('AnalogResolution', sql.Decimal(18, 10), row.analog_resolution || 0)
    .query(`
      INSERT INTO [dbo].[disintegration_timer_readings]
        (session_id, paddle_no, sequence_no, nominal_value, unit,
         std_jam, std_menit, std_detik, std_mdetik,
         uut_jam, uut_menit, uut_detik, uut_mdetik,
         correction_std, uc_std, digital_resolution, analog_resolution)
      VALUES
        (@SessionId, @PaddleNo, @SequenceNo, @NominalValue, @Unit,
         @StdJam, @StdMenit, @StdDetik, @StdMdetik,
         @UutJam, @UutMenit, @UutDetik, @UutMdetik,
         @CorrectionStd, @UcStd, @DigitalResolution, @AnalogResolution)
    `);
}

async function listTemperatureInputs(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query('SELECT * FROM [dbo].[disintegration_temperature_inputs] WHERE session_id = @SessionId');
  return result.recordset[0] || null;
}

async function listTable(sessionId, tableName, orderBy, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query(`SELECT * FROM [dbo].[${tableName}] WHERE session_id = @SessionId ORDER BY ${orderBy}`);
  return result.recordset;
}

async function insertResult(row, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, row.session_id)
    .input('ResultType', sql.VarChar(30), row.result_type)
    .input('PointNo', sql.Int, toDbNull(row.point_no))
    .input('PaddleNo', sql.Int, toDbNull(row.paddle_no))
    .input('MeanStandard', sql.Decimal(18, 10), toDbNull(row.mean_standard))
    .input('MeanUut', sql.Decimal(18, 10), toDbNull(row.mean_uut))
    .input('MeanError', sql.Decimal(18, 10), toDbNull(row.mean_error))
    .input('SdValue', sql.Decimal(18, 10), toDbNull(row.sd_value))
    .input('UCombined', sql.Decimal(18, 10), toDbNull(row.u_combined))
    .input('UExpanded', sql.Decimal(18, 10), toDbNull(row.u_expanded))
    .input('UExpandedMin', sql.Decimal(18, 10), toDbNull(row.u_expanded_min))
    .input('UExpandedHour', sql.Decimal(18, 10), toDbNull(row.u_expanded_hour))
    .input('Tolerance', sql.Decimal(18, 10), toDbNull(row.tolerance))
    .input('PassFlag', sql.Bit, row.pass_flag === null || row.pass_flag === undefined ? null : (row.pass_flag ? 1 : 0))
    .query(`
      INSERT INTO [dbo].[disintegration_results]
        (session_id, result_type, point_no, paddle_no, mean_standard, mean_uut, mean_error,
         sd_value, u_combined, u_expanded, u_expanded_min, u_expanded_hour, tolerance, pass_flag)
      VALUES
        (@SessionId, @ResultType, @PointNo, @PaddleNo, @MeanStandard, @MeanUut, @MeanError,
         @SdValue, @UCombined, @UExpanded, @UExpandedMin, @UExpandedHour, @Tolerance, @PassFlag)
    `);
}

async function deleteResultsBySession(sessionId, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .query(`
      DELETE FROM [dbo].[disintegration_results] WHERE session_id = @SessionId;
      DELETE FROM [dbo].[disintegration_result_summary] WHERE session_id = @SessionId;
    `);
}

async function upsertSummary(sessionId, summary, transaction) {
  const request = await createRequest(transaction);
  await request
    .input('SessionId', sql.Int, sessionId)
    .input('CoverageFactor', sql.Decimal(18, 10), toDbNull(summary.coverage_factor))
    .input('MaxTimerUExpandedSec', sql.Decimal(18, 10), toDbNull(summary.max_timer_u_expanded_sec))
    .input('Conclusion', sql.VarChar(50), toDbNull(summary.conclusion))
    .query(`
      IF EXISTS (SELECT 1 FROM [dbo].[disintegration_result_summary] WHERE session_id = @SessionId)
        UPDATE [dbo].[disintegration_result_summary]
        SET coverage_factor = @CoverageFactor,
            max_timer_u_expanded_sec = @MaxTimerUExpandedSec,
            conclusion = @Conclusion,
            created_at = GETDATE()
        WHERE session_id = @SessionId
      ELSE
        INSERT INTO [dbo].[disintegration_result_summary]
          (session_id, coverage_factor, max_timer_u_expanded_sec, conclusion)
        VALUES (@SessionId, @CoverageFactor, @MaxTimerUExpandedSec, @Conclusion)
    `);
}

async function getResults(sessionId, transaction) {
  return listTable(sessionId, 'disintegration_results', 'result_type, paddle_no, point_no, result_id', transaction);
}

async function getSummary(sessionId, transaction) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SessionId', sql.Int, sessionId)
    .query('SELECT * FROM [dbo].[disintegration_result_summary] WHERE session_id = @SessionId');
  return result.recordset[0] || null;
}

async function listDisintegrationDaCandidates(filters = {}, transaction) {
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

async function createSertifikatBagianDraftFromDisintegrationDa(qaId, idNoSertifikat, userId, delegatedTo, transaction) {
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
  deleteSessionGraph,
  deleteWorkbookBySession,
  upsertTemperatureInputs,
  insertTemperatureReading,
  insertStrokeRow,
  insertDistanceRow,
  insertTimerReading,
  listTemperatureInputs,
  listTemperatureReadings: (sessionId, transaction) => listTable(sessionId, 'disintegration_temperature_readings', 'point_no, sequence_no', transaction),
  listStrokeRows: (sessionId, transaction) => listTable(sessionId, 'disintegration_stroke_rows', 'paddle_no, sequence_no', transaction),
  listDistanceRows: (sessionId, transaction) => listTable(sessionId, 'disintegration_distance_rows', 'paddle_no, sequence_no', transaction),
  listTimerReadings: (sessionId, transaction) => listTable(sessionId, 'disintegration_timer_readings', 'paddle_no, sequence_no', transaction),
  deleteResultsBySession,
  insertResult,
  getResults,
  upsertSummary,
  getSummary,
  listDisintegrationDaCandidates,
  createSertifikatBagianDraftFromDisintegrationDa,
  getDaBagianByQaId: workbookRepo.getDaBagianByQaId,
  getNextCertificateNumberByCode: workbookRepo.getNextCertificateNumberByCode,
  getSertifikatBagianHeader: workbookRepo.getSertifikatBagianHeader,
  updateSertifikatBagianHeader: workbookRepo.updateSertifikatBagianHeader,
  replaceSertifikatBagianHasilKalRows: workbookRepo.replaceSertifikatBagianHasilKalRows,
  insertAuditLog: workbookRepo.insertAuditLog,
};
