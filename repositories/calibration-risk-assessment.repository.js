'use strict';

/**
 * Repository: RA_CalibrationAssessment
 *
 * Uses the raw `mssql` package with named parameterized queries.
 * Compatible with MSSQL Server 2008.
 * No ORM, no JSON SQL functions.
 */

const sql = require('mssql');
const { configMssql } = require('../config/configMssql');

// ──────────────────────────────────────────────────────────────
// Pool helper — reuses a single global pool per process
// ──────────────────────────────────────────────────────────────
let _pool = null;

async function getPool() {
  if (!_pool) {
    _pool = await sql.connect(configMssql);
  }
  return _pool;
}

// ──────────────────────────────────────────────────────────────
// CREATE
// ──────────────────────────────────────────────────────────────
async function create(data) {
  const pool = await getPool();
  const request = pool.request();

  request.input('InstrumentName',           sql.NVarChar(255),       data.instrumentName);
  request.input('InstrumentCode',           sql.NVarChar(100),       data.instrumentCode           || null);
  request.input('Location',                 sql.NVarChar(255),       data.location                 || null);
  request.input('FunctionDescription',      sql.NVarChar(sql.MAX),   data.functionDescription      || null);
  request.input('Area',                     sql.NVarChar(255),       data.area                     || null);
  request.input('ImpactsProductQualityCQA', sql.Bit,                 data.impactsProductQualityCQA ? 1 : 0);
  request.input('UsedForCPP',               sql.Bit,                 data.usedForCPP               ? 1 : 0);
  request.input('UsedForGxPEnvironment',    sql.Bit,                 data.usedForGxPEnvironment    ? 1 : 0);
  request.input('UsedForBatchRelease',      sql.Bit,                 data.usedForBatchRelease      ? 1 : 0);
  request.input('ImpactsSafety',            sql.Bit,                 data.impactsSafety            ? 1 : 0);
  request.input('IsImpactCritical',         sql.Bit,                 data.isImpactCritical         ? 1 : 0);
  request.input('Severity',                 sql.Int,                 data.severity                 ?? null);
  request.input('Probability',              sql.Int,                 data.probability              ?? null);
  request.input('Detectability',            sql.Int,                 data.detectability            ?? null);
  request.input('RPN',                      sql.Int,                 data.rpn                      ?? null);
  request.input('RiskCategory',             sql.NVarChar(50),        data.riskCategory             || null);
  request.input('SeverityNote',             sql.NVarChar(sql.MAX),   data.severityNote             || null);
  request.input('ProbabilityNote',          sql.NVarChar(sql.MAX),   data.probabilityNote          || null);
  request.input('DetectabilityNote',        sql.NVarChar(sql.MAX),   data.detectabilityNote        || null);
  request.input('CalibrationDecision',      sql.NVarChar(255),       data.calibrationDecision);
  request.input('DecisionReason',           sql.NVarChar(sql.MAX),   data.decisionReason           || null);
  request.input('Status',                      sql.NVarChar(50),        data.status                      || 'Draft');
  request.input('CreatedBy',                   sql.NVarChar(100),       data.createdBy                   || null);
  request.input('QA_ID',                       sql.NVarChar(50),        data.qaId                        || null);
  request.input('Assm_No_identitas_kalibrasi', sql.NVarChar(100),       data.assmNoIdentitasKalibrasi    || null);
  request.input('Group_Da_Dept',               sql.NVarChar(50),        data.groupDaDept                 || null);
  request.input('Assm_Kapasitas',              sql.NVarChar(100),       data.assmKapasitas               || null);
  request.input('Parameter_Kalibrasi',         sql.NVarChar(100),       data.parameterKalibrasi          || null);
  request.input('No_Permohonan',               sql.NVarChar(50),        data.noPermohonan                || null);

  const result = await request.query(`
    INSERT INTO RA_CalibrationAssessment (
      InstrumentName, InstrumentCode, Location, FunctionDescription, Area,
      ImpactsProductQualityCQA, UsedForCPP, UsedForGxPEnvironment,
      UsedForBatchRelease, ImpactsSafety, IsImpactCritical,
      Severity, Probability, Detectability, RPN,
      RiskCategory, SeverityNote, ProbabilityNote, DetectabilityNote,
      CalibrationDecision, DecisionReason,
      Status, IsDeleted, CreatedBy, CreatedAt,
      QA_ID, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi,
      No_Permohonan
    )
    VALUES (
      @InstrumentName, @InstrumentCode, @Location, @FunctionDescription, @Area,
      @ImpactsProductQualityCQA, @UsedForCPP, @UsedForGxPEnvironment,
      @UsedForBatchRelease, @ImpactsSafety, @IsImpactCritical,
      @Severity, @Probability, @Detectability, @RPN,
      @RiskCategory, @SeverityNote, @ProbabilityNote, @DetectabilityNote,
      @CalibrationDecision, @DecisionReason,
      @Status, 0, @CreatedBy, GETDATE(),
      @QA_ID, @Assm_No_identitas_kalibrasi, @Group_Da_Dept, @Assm_Kapasitas, @Parameter_Kalibrasi,
      @No_Permohonan
    );
    SELECT SCOPE_IDENTITY() AS AssessmentID;
  `);

  return result.recordset[0].AssessmentID;
}

// ──────────────────────────────────────────────────────────────
// FIND ALL (with optional filters)
// ──────────────────────────────────────────────────────────────
async function findAll({ decision, category, instrumentCode, status, keyword } = {}) {
  const pool = await getPool();
  const request = pool.request();

  const conditions = ['IsDeleted = 0'];

  if (decision) {
    request.input('CalibrationDecision', sql.NVarChar(255), decision);
    conditions.push('CalibrationDecision = @CalibrationDecision');
  }

  if (category) {
    request.input('RiskCategory', sql.NVarChar(50), category);
    conditions.push('RiskCategory = @RiskCategory');
  }

  if (instrumentCode) {
    request.input('InstrumentCode', sql.NVarChar(100), instrumentCode);
    conditions.push('InstrumentCode = @InstrumentCode');
  }

  if (status) {
    request.input('Status', sql.NVarChar(50), status);
    conditions.push('Status = @Status');
  }

  if (keyword) {
    request.input('keyword', sql.NVarChar(255), `%${keyword}%`);
    conditions.push('(InstrumentName LIKE @keyword OR InstrumentCode LIKE @keyword)');
  }

  const whereClause = 'WHERE ' + conditions.join(' AND ');

  const result = await request.query(`
    SELECT
      AssessmentID, InstrumentName, InstrumentCode, Location,
      FunctionDescription, Area,
      ImpactsProductQualityCQA, UsedForCPP, UsedForGxPEnvironment,
      UsedForBatchRelease, ImpactsSafety, IsImpactCritical,
      Severity, Probability, Detectability, RPN,
      RiskCategory, SeverityNote, ProbabilityNote, DetectabilityNote,
      CalibrationDecision, DecisionReason,
      Status, IsDeleted, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt,
      QA_ID, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi,
      No_Permohonan
    FROM RA_CalibrationAssessment
    ${whereClause}
    ORDER BY CreatedAt DESC
  `);

  return result.recordset;
}

// ──────────────────────────────────────────────────────────────
// FIND BY ID
// ──────────────────────────────────────────────────────────────
async function findById(id) {
  const pool = await getPool();
  const request = pool.request();

  request.input('AssessmentID', sql.Int, id);

  const result = await request.query(`
    SELECT
      AssessmentID, InstrumentName, InstrumentCode, Location,
      FunctionDescription, Area,
      ImpactsProductQualityCQA, UsedForCPP, UsedForGxPEnvironment,
      UsedForBatchRelease, ImpactsSafety, IsImpactCritical,
      Severity, Probability, Detectability, RPN,
      RiskCategory, SeverityNote, ProbabilityNote, DetectabilityNote,
      CalibrationDecision, DecisionReason,
      Status, IsDeleted, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt,
      QA_ID, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi,
      No_Permohonan
    FROM RA_CalibrationAssessment
    WHERE AssessmentID = @AssessmentID
      AND IsDeleted = 0
  `);

  return result.recordset[0] || null;
}

// ──────────────────────────────────────────────────────────────
// UPDATE
// ──────────────────────────────────────────────────────────────
async function update(id, data) {
  const pool = await getPool();
  const request = pool.request();

  request.input('AssessmentID',             sql.Int,                 id);
  request.input('InstrumentName',           sql.NVarChar(255),       data.instrumentName);
  request.input('InstrumentCode',           sql.NVarChar(100),       data.instrumentCode           || null);
  request.input('Location',                 sql.NVarChar(255),       data.location                 || null);
  request.input('FunctionDescription',      sql.NVarChar(sql.MAX),   data.functionDescription      || null);
  request.input('Area',                     sql.NVarChar(255),       data.area                     || null);
  request.input('ImpactsProductQualityCQA', sql.Bit,                 data.impactsProductQualityCQA ? 1 : 0);
  request.input('UsedForCPP',               sql.Bit,                 data.usedForCPP               ? 1 : 0);
  request.input('UsedForGxPEnvironment',    sql.Bit,                 data.usedForGxPEnvironment    ? 1 : 0);
  request.input('UsedForBatchRelease',      sql.Bit,                 data.usedForBatchRelease      ? 1 : 0);
  request.input('ImpactsSafety',            sql.Bit,                 data.impactsSafety            ? 1 : 0);
  request.input('IsImpactCritical',         sql.Bit,                 data.isImpactCritical         ? 1 : 0);
  request.input('Severity',                 sql.Int,                 data.severity                 ?? null);
  request.input('Probability',              sql.Int,                 data.probability              ?? null);
  request.input('Detectability',            sql.Int,                 data.detectability            ?? null);
  request.input('RPN',                      sql.Int,                 data.rpn                      ?? null);
  request.input('RiskCategory',             sql.NVarChar(50),        data.riskCategory             || null);
  request.input('SeverityNote',             sql.NVarChar(sql.MAX),   data.severityNote             || null);
  request.input('ProbabilityNote',          sql.NVarChar(sql.MAX),   data.probabilityNote          || null);
  request.input('DetectabilityNote',        sql.NVarChar(sql.MAX),   data.detectabilityNote        || null);
  request.input('CalibrationDecision',          sql.NVarChar(255),       data.calibrationDecision);
  request.input('DecisionReason',               sql.NVarChar(sql.MAX),   data.decisionReason               || null);
  request.input('UpdatedBy',                    sql.NVarChar(100),       data.updatedBy                    || null);
  request.input('QA_ID',                        sql.NVarChar(50),        data.qaId                         || null);
  request.input('Assm_No_identitas_kalibrasi',  sql.NVarChar(100),       data.assmNoIdentitasKalibrasi     || null);
  request.input('Group_Da_Dept',                sql.NVarChar(50),        data.groupDaDept                  || null);
  request.input('Assm_Kapasitas',               sql.NVarChar(100),       data.assmKapasitas                || null);
  request.input('Parameter_Kalibrasi',          sql.NVarChar(100),       data.parameterKalibrasi           || null);
  request.input('No_Permohonan',                sql.NVarChar(50),        data.noPermohonan                 || null);

  await request.query(`
    UPDATE RA_CalibrationAssessment
    SET
      InstrumentName           = @InstrumentName,
      InstrumentCode           = @InstrumentCode,
      Location                 = @Location,
      FunctionDescription      = @FunctionDescription,
      Area                     = @Area,
      ImpactsProductQualityCQA = @ImpactsProductQualityCQA,
      UsedForCPP               = @UsedForCPP,
      UsedForGxPEnvironment    = @UsedForGxPEnvironment,
      UsedForBatchRelease      = @UsedForBatchRelease,
      ImpactsSafety            = @ImpactsSafety,
      IsImpactCritical         = @IsImpactCritical,
      Severity                 = @Severity,
      Probability              = @Probability,
      Detectability            = @Detectability,
      RPN                      = @RPN,
      RiskCategory             = @RiskCategory,
      SeverityNote             = @SeverityNote,
      ProbabilityNote          = @ProbabilityNote,
      DetectabilityNote        = @DetectabilityNote,
      CalibrationDecision      = @CalibrationDecision,
      DecisionReason           = @DecisionReason,
      QA_ID                    = @QA_ID,
      Assm_No_identitas_kalibrasi = @Assm_No_identitas_kalibrasi,
      Group_Da_Dept            = @Group_Da_Dept,
      Assm_Kapasitas           = @Assm_Kapasitas,
      Parameter_Kalibrasi      = @Parameter_Kalibrasi,
      No_Permohonan            = @No_Permohonan,
      UpdatedBy                = @UpdatedBy,
      UpdatedAt                = GETDATE()
    WHERE AssessmentID = @AssessmentID
      AND IsDeleted = 0
  `);
}

// ──────────────────────────────────────────────────────────────
// SOFT DELETE
// ──────────────────────────────────────────────────────────────
async function softDelete(id) {
  const pool = await getPool();
  const request = pool.request();

  request.input('AssessmentID', sql.Int, id);

  await request.query(`
    UPDATE RA_CalibrationAssessment
    SET IsDeleted = 1
    WHERE AssessmentID = @AssessmentID
  `);
}

// ──────────────────────────────────────────────────────────────
// PATCH STATUS
// ──────────────────────────────────────────────────────────────
async function updateStatus(id, status, updatedBy) {
  const pool = await getPool();
  const request = pool.request();

  request.input('AssessmentID', sql.Int,          id);
  request.input('Status',       sql.NVarChar(50), status);
  request.input('UpdatedBy',    sql.NVarChar(100), updatedBy || null);

  await request.query(`
    UPDATE RA_CalibrationAssessment
    SET
      Status    = @Status,
      UpdatedBy = @UpdatedBy,
      UpdatedAt = GETDATE()
    WHERE AssessmentID = @AssessmentID
      AND IsDeleted = 0
  `);
}

module.exports = {
  create,
  findAll,
  findById,
  update,
  softDelete,
  updateStatus,
};
