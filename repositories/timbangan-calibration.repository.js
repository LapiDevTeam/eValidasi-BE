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
  temperature, humidity,
  std_nama, std_no_identitas, std_no_sertifikat, std_tertelusur, std_rekalibrasi,
  qa_id, id_no_sertifikat, status, pic, conclusion, evaluation_result,
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
      temperature, humidity,
      std_nama, std_no_identitas, std_no_sertifikat, std_tertelusur, std_rekalibrasi,
      qa_id, status, pic, evaluation_result, created_by
    )
    OUTPUT INSERTED.session_id
    VALUES
    (
      @SessionCode, @InstrumentId, @InstrumentCode, @InstrumentName,
      @MerkTipe, @NoSeri, @KapasitasUkur, @KapasitasAlat, @Unit, @Resolusi, @KapasitasResolusi,
      @Lokasi, @CalibrationDate, @IntervalBulan, @MetodeKalibrasi, @Keterangan,
      @Temperature, @Humidity,
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
      temperature = @Temperature, humidity = @Humidity,
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
      A.QA_ID, A.Jenis_kalibrasi, A.Parameter_Sertifikasi, A.Assm_nama_instrumen,
      A.Assm_No_identitas_Istrumen, A.Assm_No_identitas_kalibrasi, A.Group_Da_Dept,
      A.Assm_Kapasitas, A.Parameter_Kalibrasi, A.Assm_Lokasi, A.Parameter_Interval, A.Catatan
    FROM T_Kalibrasi_DA_Bagian AS A
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

module.exports = {
  getPool,
  createRequest,
  // sessions
  listSessions,
  getSessionById,
  createSession,
  updateSession,
  updateSessionStatus,
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
};
