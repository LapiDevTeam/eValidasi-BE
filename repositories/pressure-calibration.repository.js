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
 * Returns one row per source instrument (takes the latest date fields when a
 * source has duplicate QA_ID rows).
 * Output columns: instrument_type, source_id, qa_id, jenis_kalibrasi_value,
 *                 parameter_sertifikasi, instrument_name, instrument_code,
 *                 calibration_id, department, capacity, parameter, location,
 *                 calibration_date, parameter_interval, next_calibration_date,
 *                 note, file_name, user_id, process_date
 */
const INSTRUMENT_UNION_SQL = `
  SELECT
    instrument_type,
    source_id,
    qa_id,
    MAX(jenis_kalibrasi_value) AS jenis_kalibrasi_value,
    parameter_sertifikasi,
    instrument_name,
    instrument_code,
    calibration_id,
    department,
    capacity,
    parameter,
    location,
    MAX(calibration_date) AS calibration_date,
    MAX(parameter_interval) AS parameter_interval,
    MAX(next_calibration_date) AS next_calibration_date,
    MAX(note) AS note,
    MAX(file_name) AS file_name,
    MAX(user_id) AS user_id,
    MAX(process_date) AS process_date
  FROM (
    SELECT DISTINCT
      CAST('Thermohygro' AS VARCHAR(50)) AS instrument_type,
      QA_ID AS source_id,
      QA_ID AS qa_id,
      COALESCE(NULLIF(LTRIM(RTRIM(Jenis_kalibrasi)), ''), '1') AS jenis_kalibrasi_value,
      CAST('Thermohygrometer' AS NVARCHAR(100)) AS parameter_sertifikasi,
      Assm_nama_instrumen AS instrument_name,
      Assm_No_identitas_Istrumen AS instrument_code,
      Assm_No_identitas_kalibrasi AS calibration_id,
      Group_Da_Dept AS department,
      Assm_Kapasitas AS capacity,
      Parameter_Kalibrasi AS parameter,
      Assm_Lokasi AS location,
      Tgl_kalibrasi AS calibration_date,
      Parameter_Interval AS parameter_interval,
      Kalibrasi_selanjutnya AS next_calibration_date,
      Catatan AS note,
      f_fileName AS file_name,
      UserID AS user_id,
      Process_date AS process_date
    FROM T_Kalibrasi_DA_Thermohygro
    UNION ALL
    SELECT DISTINCT
      CAST('Anak_Timbangan' AS VARCHAR(50)) AS instrument_type,
      QA_ID AS source_id,
      QA_ID AS qa_id,
      COALESCE(NULLIF(LTRIM(RTRIM(Jenis_kalibrasi)), ''), '1') AS jenis_kalibrasi_value,
      CAST('Anak Timbangan' AS NVARCHAR(100)) AS parameter_sertifikasi,
      Assm_nama_instrumen AS instrument_name,
      Assm_No_identitas_Istrumen AS instrument_code,
      Assm_No_identitas_kalibrasi AS calibration_id,
      Group_Da_Dept AS department,
      Assm_Kapasitas AS capacity,
      Parameter_Kalibrasi AS parameter,
      Assm_Lokasi AS location,
      Tgl_kalibrasi AS calibration_date,
      Parameter_Interval AS parameter_interval,
      Kalibrasi_selanjutnya AS next_calibration_date,
      Catatan AS note,
      f_fileName AS file_name,
      UserID AS user_id,
      Process_date AS process_date
    FROM T_Kalibrasi_DA_Anak_Timbangan
    UNION ALL
    SELECT DISTINCT
      CAST('Timbangan' AS VARCHAR(50)) AS instrument_type,
      QA_ID AS source_id,
      QA_ID AS qa_id,
      COALESCE(NULLIF(LTRIM(RTRIM(Jenis_kalibrasi)), ''), '1') AS jenis_kalibrasi_value,
      CAST('Timbangan (Massa)' AS NVARCHAR(100)) AS parameter_sertifikasi,
      Assm_nama_instrumen AS instrument_name,
      Assm_No_identitas_Istrumen AS instrument_code,
      Assm_No_identitas_kalibrasi AS calibration_id,
      Group_Da_Dept AS department,
      Assm_Kapasitas AS capacity,
      Parameter_Kalibrasi AS parameter,
      Assm_Lokasi AS location,
      Tgl_kalibrasi AS calibration_date,
      CAST(Interval AS NVARCHAR(20)) AS parameter_interval,
      Kalibrasi_selanjutnya AS next_calibration_date,
      Catatan AS note,
      f_fileName AS file_name,
      UserID AS user_id,
      Process_date AS process_date
    FROM T_Kalibrasi_DA_Timbangan
    UNION ALL
    SELECT DISTINCT
      CAST('Bagian' AS VARCHAR(50)) AS instrument_type,
      QA_ID AS source_id,
      QA_ID AS qa_id,
      COALESCE(NULLIF(LTRIM(RTRIM(Jenis_kalibrasi)), ''), '1') AS jenis_kalibrasi_value,
      Parameter_Sertifikasi AS parameter_sertifikasi,
      Assm_nama_instrumen AS instrument_name,
      Assm_No_identitas_Istrumen AS instrument_code,
      Assm_No_identitas_kalibrasi AS calibration_id,
      Group_Da_Dept AS department,
      Assm_Kapasitas AS capacity,
      Parameter_Kalibrasi AS parameter,
      Assm_Lokasi AS location,
      Tgl_kalibrasi AS calibration_date,
      Parameter_Interval AS parameter_interval,
      Kalibrasi_selanjutnya AS next_calibration_date,
      Catatan AS note,
      f_fileName AS file_name,
      UserID AS user_id,
      Process_date AS process_date
    FROM T_Kalibrasi_DA_Bagian
    UNION ALL
    SELECT DISTINCT
      CAST('Risk_Assessment' AS VARCHAR(50)) AS instrument_type,
      CAST(AssessmentID AS NVARCHAR(50)) AS source_id,
      QA_ID AS qa_id,
      CAST('1' AS NVARCHAR(10)) AS jenis_kalibrasi_value,
      CAST('Risk Assessment' AS NVARCHAR(100)) AS parameter_sertifikasi,
      InstrumentName AS instrument_name,
      InstrumentCode AS instrument_code,
      Assm_No_identitas_kalibrasi AS calibration_id,
      Group_Da_Dept AS department,
      Assm_Kapasitas AS capacity,
      Parameter_Kalibrasi AS parameter,
      Location AS location,
      CAST(NULL AS DATETIME) AS calibration_date,
      CAST(NULL AS NVARCHAR(100)) AS parameter_interval,
      CAST(NULL AS DATETIME) AS next_calibration_date,
      DecisionReason AS note,
      CAST(NULL AS NVARCHAR(255)) AS file_name,
      CreatedBy AS user_id,
      COALESCE(UpdatedAt, CreatedAt) AS process_date
    FROM RA_CalibrationAssessment
    WHERE IsDeleted = 0
  ) AS src
  GROUP BY
    instrument_type, source_id, qa_id, parameter_sertifikasi, instrument_name,
    instrument_code, calibration_id, department, capacity, parameter, location
`;

const DA_COMMON_FIELDS = [
  {
    column: 'Jenis_kalibrasi',
    param: 'JenisKalibrasi',
    type: sql.NVarChar(10),
    aliases: ['jenis_kalibrasi', 'jenisKalibrasi', 'Jenis_Kalibrasi'],
    defaultValue: '1',
    normalize: normalizeJenisKalibrasiValue,
  },
  {
    column: 'Assm_nama_instrumen',
    param: 'InstrumentName',
    type: sql.NVarChar(255),
    aliases: ['instrument_name', 'instrumentName', 'assm_nama_instrumen', 'Assm_nama_instrumen'],
    requiredOnCreate: true,
    defaultValue: '',
  },
  {
    column: 'Assm_No_identitas_Istrumen',
    param: 'InstrumentCode',
    type: sql.NVarChar(100),
    aliases: [
      'instrument_code',
      'instrumentCode',
      'assm_no_identitas_istrumen',
      'assm_no_identitas_instrumen',
      'Assm_No_identitas_Istrumen',
    ],
    defaultValue: '',
  },
  {
    column: 'Assm_No_identitas_kalibrasi',
    param: 'CalibrationId',
    type: sql.NVarChar(100),
    aliases: [
      'calibration_id',
      'calibrationId',
      'assm_no_identitas_kalibrasi',
      'Assm_No_identitas_kalibrasi',
    ],
    defaultValue: '',
  },
  {
    column: 'Group_Da_Dept',
    param: 'Department',
    type: sql.NVarChar(50),
    aliases: ['department', 'group_da_dept', 'groupDaDept', 'Group_Da_Dept'],
    defaultValue: '',
  },
  {
    column: 'Assm_Kapasitas',
    param: 'Capacity',
    type: sql.NVarChar(100),
    aliases: ['capacity', 'assm_kapasitas', 'assmKapasitas', 'Assm_Kapasitas'],
    defaultValue: '',
  },
  {
    column: 'Parameter_Kalibrasi',
    param: 'ParameterKalibrasi',
    type: sql.NVarChar(100),
    aliases: ['parameter', 'parameter_kalibrasi', 'parameterKalibrasi', 'Parameter_Kalibrasi'],
    defaultValue: '',
  },
  {
    column: 'Assm_Lokasi',
    param: 'Location',
    type: sql.NVarChar(255),
    aliases: ['location', 'assm_lokasi', 'assmLokasi', 'Assm_Lokasi'],
    defaultValue: '',
  },
  {
    column: 'Tgl_kalibrasi',
    param: 'TglKalibrasi',
    type: sql.DateTime,
    aliases: ['calibration_date', 'calibrationDate', 'tgl_kalibrasi', 'Tgl_kalibrasi'],
    defaultValue: null,
    normalize: normalizeDateValue,
  },
  {
    column: 'Parameter_Interval',
    param: 'ParameterInterval',
    type: sql.NVarChar(100),
    aliases: ['parameter_interval', 'parameterInterval', 'Parameter_Interval'],
    defaultValue: null,
    normalize: (v) => (v == null || v === '') ? null : String(v),
  },
  {
    column: 'Catatan',
    param: 'Catatan',
    type: sql.NVarChar(sql.MAX),
    aliases: ['note', 'catatan', 'Catatan'],
    defaultValue: '',
  },
];

const INSTRUMENT_TYPE_CONFIG = {
  Thermohygro: {
    instrumentType: 'Thermohygro',
    table: 'T_Kalibrasi_DA_Thermohygro',
    statusTable: 'T_Kalibrasi_DA_Thermohygro_status',
    idFunction: 'dbo.fnGetKal_DA_TH_No_ID()',
    keyColumn: 'QA_ID',
    fields: DA_COMMON_FIELDS,
    nextCalibrationIntervalColumn: 'Parameter_Interval',
  },
  Anak_Timbangan: {
    instrumentType: 'Anak_Timbangan',
    table: 'T_Kalibrasi_DA_Anak_Timbangan',
    statusTable: 'T_Kalibrasi_DA_Anak_Timbangan_status',
    idFunction: 'dbo.fnGetKal_DA_AT_No_ID()',
    keyColumn: 'QA_ID',
    fields: DA_COMMON_FIELDS,
    nextCalibrationIntervalColumn: 'Parameter_Interval',
  },
  Timbangan: {
    instrumentType: 'Timbangan',
    table: 'T_Kalibrasi_DA_Timbangan',
    statusTable: 'T_Kalibrasi_DA_Timbangan_status',
    idFunction: 'dbo.fnGetKal_DA_TM_No_ID()',
    keyColumn: 'QA_ID',
    fields: [
      DA_COMMON_FIELDS[0],
      {
        column: 'Program_verifikasi',
        param: 'ProgramVerifikasi',
        type: sql.NVarChar(10),
        aliases: ['program_verifikasi', 'programVerifikasi', 'Program_verifikasi'],
        defaultValue: '2',
        normalize: normalizeProgramVerifikasiValue,
      },
      ...DA_COMMON_FIELDS.slice(1, 8),
      {
        column: 'Tgl_kalibrasi',
        param: 'TglKalibrasi',
        type: sql.DateTime,
        aliases: ['calibration_date', 'calibrationDate', 'tgl_kalibrasi', 'Tgl_kalibrasi'],
        defaultValue: null,
        normalize: normalizeDateValue,
      },
      {
        column: 'Interval',
        param: 'Interval',
        type: sql.Int,
        aliases: ['interval', 'interval_bulan', 'calibrationIntervalMonths', 'Interval'],
        defaultValue: null,
        normalize: normalizeIntegerValue,
      },
      DA_COMMON_FIELDS[10],
      {
        column: 'Parameter_No_id_anak_timbang',
        param: 'ParameterNoIdAnakTimbang',
        type: sql.NVarChar(100),
        aliases: [
          'parameter_no_id_anak_timbang',
          'parameterNoIdAnakTimbang',
          'Parameter_No_id_anak_timbang',
        ],
        defaultValue: '',
      },
      {
        column: 'Parameter_Interval',
        param: 'ParameterInterval',
        type: sql.NVarChar(100),
        aliases: ['parameter_interval', 'parameterInterval', 'Parameter_Interval'],
        defaultValue: '',
      },
      {
        column: 'Parameter_kriteria',
        param: 'ParameterKriteria',
        type: sql.NVarChar(100),
        aliases: ['parameter_kriteria', 'parameterKriteria', 'Parameter_kriteria'],
        defaultValue: '',
      },
      {
        column: 'Pelaksana_Verifikasi',
        param: 'PelaksanaVerifikasi',
        type: sql.NVarChar(100),
        aliases: ['pelaksana_verifikasi', 'pelaksanaVerifikasi', 'Pelaksana_Verifikasi'],
        defaultValue: '',
      },
      {
        column: 'Titik_verifikasi',
        param: 'TitikVerifikasi',
        type: sql.NVarChar(255),
        aliases: ['titik_verifikasi', 'titikVerifikasi', 'Titik_verifikasi'],
        defaultValue: '',
      },
    ],
    nextCalibrationIntervalColumn: 'Interval',
  },
  Bagian: {
    instrumentType: 'Bagian',
    table: 'T_Kalibrasi_DA_Bagian',
    statusTable: 'T_Kalibrasi_DA_Bagian_status',
    idFunction: 'dbo.fnGetKal_DA_BA_No_ID()',
    keyColumn: 'QA_ID',
    fields: [
      DA_COMMON_FIELDS[0],
      {
        column: 'Parameter_Sertifikasi',
        param: 'ParameterSertifikasi',
        type: sql.NVarChar(100),
        aliases: [
          'parameter_sertifikasi',
          'parameterSertifikasi',
          'Parameter_Sertifikasi',
          'calibrationType',
        ],
        requiredOnCreate: true,
        defaultValue: '',
      },
      ...DA_COMMON_FIELDS.slice(1),
    ],
    nextCalibrationIntervalColumn: 'Parameter_Interval',
  },
  Risk_Assessment: {
    instrumentType: 'Risk_Assessment',
    table: 'RA_CalibrationAssessment',
    keyColumn: 'AssessmentID',
    softDelete: true,
    fields: [
      {
        column: 'InstrumentName',
        param: 'InstrumentName',
        type: sql.NVarChar(255),
        aliases: ['instrument_name', 'instrumentName', 'InstrumentName'],
        requiredOnCreate: true,
      },
      {
        column: 'InstrumentCode',
        param: 'InstrumentCode',
        type: sql.NVarChar(100),
        aliases: ['instrument_code', 'instrumentCode', 'InstrumentCode'],
      },
      {
        column: 'Location',
        param: 'Location',
        type: sql.NVarChar(255),
        aliases: ['location', 'Location'],
      },
      {
        column: 'FunctionDescription',
        param: 'FunctionDescription',
        type: sql.NVarChar(sql.MAX),
        aliases: ['functionDescription', 'function_description', 'FunctionDescription'],
      },
      {
        column: 'Area',
        param: 'Area',
        type: sql.NVarChar(255),
        aliases: ['area', 'Area'],
      },
      {
        column: 'ImpactsProductQualityCQA',
        param: 'ImpactsProductQualityCQA',
        type: sql.Bit,
        aliases: [
          'impactsProductQualityCQA',
          'impactAssessment.impactsProductQualityCQA',
          'ImpactsProductQualityCQA',
        ],
        defaultValue: false,
        normalize: normalizeBitValue,
      },
      {
        column: 'UsedForCPP',
        param: 'UsedForCPP',
        type: sql.Bit,
        aliases: ['usedForCPP', 'impactAssessment.usedForCPP', 'UsedForCPP'],
        defaultValue: false,
        normalize: normalizeBitValue,
      },
      {
        column: 'UsedForGxPEnvironment',
        param: 'UsedForGxPEnvironment',
        type: sql.Bit,
        aliases: ['usedForGxPEnvironment', 'impactAssessment.usedForGxPEnvironment', 'UsedForGxPEnvironment'],
        defaultValue: false,
        normalize: normalizeBitValue,
      },
      {
        column: 'UsedForBatchRelease',
        param: 'UsedForBatchRelease',
        type: sql.Bit,
        aliases: ['usedForBatchRelease', 'impactAssessment.usedForBatchRelease', 'UsedForBatchRelease'],
        defaultValue: false,
        normalize: normalizeBitValue,
      },
      {
        column: 'ImpactsSafety',
        param: 'ImpactsSafety',
        type: sql.Bit,
        aliases: ['impactsSafety', 'impactAssessment.impactsSafety', 'ImpactsSafety'],
        defaultValue: false,
        normalize: normalizeBitValue,
      },
      {
        column: 'IsImpactCritical',
        param: 'IsImpactCritical',
        type: sql.Bit,
        aliases: ['isImpactCritical', 'IsImpactCritical'],
        defaultValue: false,
        normalize: normalizeBitValue,
      },
      {
        column: 'Severity',
        param: 'Severity',
        type: sql.Int,
        aliases: ['severity', 'Severity'],
        normalize: normalizeIntegerValue,
      },
      {
        column: 'Probability',
        param: 'Probability',
        type: sql.Int,
        aliases: ['probability', 'Probability'],
        normalize: normalizeIntegerValue,
      },
      {
        column: 'Detectability',
        param: 'Detectability',
        type: sql.Int,
        aliases: ['detectability', 'Detectability'],
        normalize: normalizeIntegerValue,
      },
      {
        column: 'RPN',
        param: 'RPN',
        type: sql.Int,
        aliases: ['rpn', 'RPN'],
        normalize: normalizeIntegerValue,
      },
      {
        column: 'RiskCategory',
        param: 'RiskCategory',
        type: sql.NVarChar(50),
        aliases: ['riskCategory', 'risk_category', 'RiskCategory'],
      },
      {
        column: 'SeverityNote',
        param: 'SeverityNote',
        type: sql.NVarChar(sql.MAX),
        aliases: ['severityNote', 'severity_note', 'SeverityNote'],
      },
      {
        column: 'ProbabilityNote',
        param: 'ProbabilityNote',
        type: sql.NVarChar(sql.MAX),
        aliases: ['probabilityNote', 'probability_note', 'ProbabilityNote'],
      },
      {
        column: 'DetectabilityNote',
        param: 'DetectabilityNote',
        type: sql.NVarChar(sql.MAX),
        aliases: ['detectabilityNote', 'detectability_note', 'DetectabilityNote'],
      },
      {
        column: 'CalibrationDecision',
        param: 'CalibrationDecision',
        type: sql.NVarChar(255),
        aliases: ['calibrationDecision', 'calibration_decision', 'CalibrationDecision'],
      },
      {
        column: 'DecisionReason',
        param: 'DecisionReason',
        type: sql.NVarChar(sql.MAX),
        aliases: ['decisionReason', 'decision_reason', 'note', 'DecisionReason'],
      },
      {
        column: 'Status',
        param: 'Status',
        type: sql.NVarChar(50),
        aliases: ['status', 'Status'],
        defaultValue: 'Draft',
      },
      {
        column: 'QA_ID',
        param: 'QaId',
        type: sql.NVarChar(50),
        aliases: ['qa_id', 'qaId', 'QA_ID'],
      },
      {
        column: 'Assm_No_identitas_kalibrasi',
        param: 'CalibrationId',
        type: sql.NVarChar(100),
        aliases: ['calibration_id', 'calibrationId', 'assm_no_identitas_kalibrasi'],
      },
      {
        column: 'Group_Da_Dept',
        param: 'Department',
        type: sql.NVarChar(50),
        aliases: ['department', 'group_da_dept', 'groupDaDept'],
      },
      {
        column: 'Assm_Kapasitas',
        param: 'Capacity',
        type: sql.NVarChar(100),
        aliases: ['capacity', 'assm_kapasitas', 'assmKapasitas'],
      },
      {
        column: 'Parameter_Kalibrasi',
        param: 'ParameterKalibrasi',
        type: sql.NVarChar(100),
        aliases: ['parameter', 'parameter_kalibrasi', 'parameterKalibrasi'],
      },
    ],
  },
};

const INSTRUMENT_TYPE_ALIASES = {
  thermohygro: 'Thermohygro',
  thermohygrometer: 'Thermohygro',
  th: 'Thermohygro',
  anak_timbangan: 'Anak_Timbangan',
  anak_timbang: 'Anak_Timbangan',
  anaktimbangan: 'Anak_Timbangan',
  'anak timbangan': 'Anak_Timbangan',
  at: 'Anak_Timbangan',
  timbangan: 'Timbangan',
  timbangan_massa: 'Timbangan',
  'timbangan massa': 'Timbangan',
  tm: 'Timbangan',
  bagian: 'Bagian',
  ba: 'Bagian',
  risk_assessment: 'Risk_Assessment',
  riskassessment: 'Risk_Assessment',
  'risk assessment': 'Risk_Assessment',
  ra_calibrationassessment: 'Risk_Assessment',
  ra: 'Risk_Assessment',
};

function createRepositoryError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

function normalizeInstrumentType(instrumentType) {
  if (!instrumentType) return null;
  const raw = String(instrumentType).trim();
  if (INSTRUMENT_TYPE_CONFIG[raw]) return raw;

  const key = raw
    .replace(/-/g, '_')
    .replace(/\s+/g, ' ')
    .toLowerCase();

  return INSTRUMENT_TYPE_ALIASES[key] || null;
}

function resolveInstrumentConfig(instrumentType) {
  const normalizedType = normalizeInstrumentType(instrumentType);
  if (!normalizedType) {
    throw createRepositoryError(
      `instrument_type must be one of: ${Object.keys(INSTRUMENT_TYPE_CONFIG).join(', ')}.`
    );
  }
  return INSTRUMENT_TYPE_CONFIG[normalizedType];
}

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function getFieldMessageName(field) {
  const rawName = field?.aliases?.[0] || field?.column || 'field';
  return String(rawName).split('.').pop();
}

function getFieldSqlTypeName(field) {
  return field?.type?.type?.name || field?.type?.name || null;
}

function getFieldMaxLength(field) {
  const sqlTypeName = getFieldSqlTypeName(field);
  if (!['VarChar', 'NVarChar', 'Char', 'NChar'].includes(sqlTypeName)) {
    return null;
  }

  const length = field?.type?.length;
  if (!Number.isFinite(length) || length <= 0 || length === sql.MAX) {
    return null;
  }

  return length;
}

function readPath(obj, path) {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (!current || typeof current !== 'object' || !hasOwn(current, part)) {
      return { found: false, value: undefined };
    }
    current = current[part];
  }

  return { found: true, value: current };
}

function readPayloadValue(payload, aliases) {
  for (const alias of aliases) {
    const result = alias.includes('.')
      ? readPath(payload, alias)
      : {
          found: payload && typeof payload === 'object' && hasOwn(payload, alias),
          value: payload ? payload[alias] : undefined,
        };

    if (result.found) {
      return result;
    }
  }

  return { found: false, value: undefined };
}

function normalizeDateValue(value, field = null) {
  if (isBlank(value)) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw createRepositoryError(`${getFieldMessageName(field)} must be a valid date.`);
  }
  return d;
}

function normalizeIntegerValue(value, field = null) {
  if (isBlank(value)) return null;
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw createRepositoryError(`${getFieldMessageName(field)} must contain a whole number.`);
  }
  return n;
}

function normalizeBitValue(value, field = null) {
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;

  const normalized = String(value || '').trim().toLowerCase();
  if (['true', 'yes', 'on', 'ya'].includes(normalized)) return 1;
  if (['false', 'no', 'off', 'tidak', ''].includes(normalized)) return 0;

  throw createRepositoryError(`${getFieldMessageName(field)} must be true or false.`);
}

function normalizeJenisKalibrasiValue(value, field = null) {
  if (isBlank(value)) return '1';
  if (value === 1 || value === true) return '1';
  if (value === 2 || value === false) return '2';

  const normalized = String(value).trim().toLowerCase();
  if (normalized === '1' || normalized === 'internal') return '1';
  if (normalized === '2' || normalized === 'external') return '2';

  throw createRepositoryError(`${getFieldMessageName(field)} must be Internal or External.`);
}

function normalizeProgramVerifikasiValue(value, field = null) {
  if (isBlank(value)) return '2';
  if (value === 1 || value === true) return '1';
  if (value === 2 || value === false) return '2';

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'ya', 'yes', 'true', 'on'].includes(normalized)) return '1';
  if (['2', 'tidak', 'no', 'false', 'off'].includes(normalized)) return '2';

  throw createRepositoryError(`${getFieldMessageName(field)} must be Ya/Tidak or 1/2.`);
}

function normalizeFieldValue(field, value) {
  if (field.normalize) return field.normalize(value, field);
  if (isBlank(value)) return null;
  return value;
}

function validateFieldValue(field, value) {
  if (value === undefined || value === null) return value;

  const maxLength = getFieldMaxLength(field);
  if (maxLength == null) return value;

  const stringValue = String(value);
  if (stringValue.length > maxLength) {
    throw createRepositoryError(
      `${getFieldMessageName(field)} cannot exceed ${maxLength} characters.`
    );
  }

  return value;
}

function defaultFieldValue(field) {
  return typeof field.defaultValue === 'function'
    ? field.defaultValue()
    : field.defaultValue;
}

function buildFieldInput(request, payload, fields, { isCreate }) {
  const columns = [];
  const params = [];
  const assignments = [];
  const valuesByColumn = {};
  let hasChanges = false;

  for (const field of fields) {
    const { found, value } = readPayloadValue(payload, field.aliases);

    if (!found && !isCreate) continue;

    let normalizedValue;
    if (found) {
      normalizedValue = normalizeFieldValue(field, value);
    } else if (field.requiredOnCreate) {
      throw createRepositoryError(`${getFieldMessageName(field)} is required.`);
    } else {
      normalizedValue = defaultFieldValue(field);
      if (normalizedValue === undefined) normalizedValue = null;
      normalizedValue = normalizeFieldValue(field, normalizedValue);
    }

    if (field.requiredOnCreate && isBlank(normalizedValue)) {
      throw createRepositoryError(`${getFieldMessageName(field)} is required.`);
    }

    validateFieldValue(field, normalizedValue);
    request.input(field.param, field.type, normalizedValue);
    columns.push(field.column);
    params.push(`@${field.param}`);
    assignments.push(`${field.column} = @${field.param}`);
    valuesByColumn[field.column] = normalizedValue;
    hasChanges = true;
  }

  return { columns, params, assignments, valuesByColumn, hasChanges };
}

function addMonths(dateValue, monthValue) {
  if (isBlank(dateValue) || isBlank(monthValue)) return null;

  const months = Number(monthValue);
  if (!Number.isInteger(months)) return null;

  const d = dateValue instanceof Date ? new Date(dateValue.getTime()) : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;

  const originalDay = d.getDate();
  d.setMonth(d.getMonth() + months);

  if (d.getDate() !== originalDay) {
    d.setDate(0);
  }

  return d;
}

function resolveNextCalibrationDate(config, payload, valuesByColumn, existing = null) {
  const explicit = readPayloadValue(payload, [
    'next_calibration_date',
    'nextCalibrationDate',
    'kalibrasi_selanjutnya',
    'Kalibrasi_selanjutnya',
  ]);

  if (explicit.found) {
    return normalizeDateValue(explicit.value, { aliases: ['nextCalibrationDate'] });
  }

  const calibrationDate = valuesByColumn.Tgl_kalibrasi !== undefined
    ? valuesByColumn.Tgl_kalibrasi
    : existing?.Tgl_kalibrasi;

  const interval = valuesByColumn[config.nextCalibrationIntervalColumn] !== undefined
    ? valuesByColumn[config.nextCalibrationIntervalColumn]
    : existing?.[config.nextCalibrationIntervalColumn];

  return addMonths(calibrationDate, interval);
}

function shouldTouchNextCalibration(config, payload, valuesByColumn) {
  const explicit = readPayloadValue(payload, [
    'next_calibration_date',
    'nextCalibrationDate',
    'kalibrasi_selanjutnya',
    'Kalibrasi_selanjutnya',
  ]);

  return explicit.found
    || valuesByColumn.Tgl_kalibrasi !== undefined
    || valuesByColumn[config.nextCalibrationIntervalColumn] !== undefined;
}

function getPayloadQaId(payload) {
  const { found, value } = readPayloadValue(payload, ['qa_id', 'qaId', 'QA_ID']);
  if (!found || isBlank(value)) return null;

  const normalizedValue = String(value).trim();
  if (normalizedValue.length > 50) {
    throw createRepositoryError('qa_id cannot exceed 50 characters.');
  }

  return normalizedValue;
}

function getMetaUserId(meta = {}, payload = {}) {
  const fromPayload = readPayloadValue(payload, ['user_id', 'userId', 'UserID']);
  const rawValue = meta.userId || (fromPayload.found ? fromPayload.value : null) || null;
  if (isBlank(rawValue)) return null;

  const normalizedValue = String(rawValue).trim();
  if (normalizedValue.length > 100) {
    throw createRepositoryError('user_id cannot exceed 100 characters.');
  }

  return normalizedValue;
}

function getMetaDelegatedTo(meta = {}, payload = {}) {
  const fromPayload = readPayloadValue(payload, ['delegated_to', 'delegatedTo', 'Delegated_To']);
  const rawValue = meta.delegatedTo || (fromPayload.found ? fromPayload.value : null) || null;
  if (isBlank(rawValue)) return null;

  const normalizedValue = String(rawValue).trim();
  if (normalizedValue.length > 100) {
    throw createRepositoryError('delegated_to cannot exceed 100 characters.');
  }

  return normalizedValue;
}

async function getGeneratedQaId(request, idFunction) {
  const result = await request.query(`SELECT ${idFunction} AS QA_ID`);
  return result.recordset[0]?.QA_ID;
}

async function getDaRawByQaId(config, qaId, transaction = null) {
  const request = await createRequest(transaction);
  const result = await request
    .input('QaId', sql.NVarChar(50), qaId)
    .query(`
      SELECT TOP 1 *
      FROM ${config.table}
      WHERE ${config.keyColumn} = @QaId
    `);

  return result.recordset[0] || null;
}

async function hasDaApproval(config, qaId, transaction = null) {
  if (!config.statusTable) return false;

  const request = await createRequest(transaction);
  const result = await request
    .input('QaId', sql.NVarChar(50), qaId)
    .query(`
      SELECT TOP 1 1 AS found
      FROM ${config.statusTable}
      WHERE QA_ID = @QaId
        AND Approver_No = '1'
    `);

  return result.recordset.length > 0;
}

async function getDaBagianHistoryByQaId(qaId) {
  const request = await createRequest();
  const qaIdLike = `${String(qaId).trim()}%`;

  const result = await request
    .input('QaIdLike', sql.NVarChar(100), qaIdLike)
    .query(`
      SELECT TOP 2 tkdbh.*
      FROM lapifactory.dbo.T_Kalibrasi_DA_Bagian_Hist AS tkdbh
      WHERE tkdbh.QA_ID LIKE @QaIdLike
      ORDER BY tkdbh.deleteDate DESC
    `);

  return result.recordset;
}

/**
 * List instruments with a unified shape across all instrument sources.
 *
 * @param {object|string} [filters] - filter object or backward-compatible search string
 * @param {string} [filters.search] - text search across key instrument fields
 * @param {string} [filters.department] - optional department filter
 * @param {string} [filters.parameter] - optional calibration parameter filter
 * @param {string} [filters.location] - optional location filter
 * @param {'Internal'|'External'} [filters.jenisKalibrasi] - optional exact calibration type filter
 * @param {boolean} [filters.includeExternal=true] - include External rows in default listing
 *
 * @returns {Promise<Array>}
 */
async function listInstruments(filters = {}) {
  const pool = await getPool();
  const normalized = typeof filters === 'string'
    ? { search: filters }
    : (filters || {});

  const search = normalized.search || null;
  const department = normalized.department || null;
  const parameter = normalized.parameter || null;
  const location = normalized.location || null;
  const jenisKalibrasi = normalized.jenisKalibrasi || null;
  const includeExternal = normalized.includeExternal === undefined
    || normalized.includeExternal === null
    || normalized.includeExternal === ''
    ? true
    : normalized.includeExternal === true
      || ['1', 'true', 'yes', 'on'].includes(String(normalized.includeExternal).trim().toLowerCase());

  const request = pool.request();
  const whereClauses = [];

  if (search) {
    request.input('Search', sql.NVarChar(100), `%${search}%`);
    whereClauses.push(`
      (
        A.source_id LIKE @Search
        OR A.qa_id LIKE @Search
        OR A.instrument_type LIKE @Search
        OR A.parameter_sertifikasi LIKE @Search
        OR A.instrument_name LIKE @Search
        OR A.instrument_code LIKE @Search
        OR A.calibration_id LIKE @Search
        OR A.department LIKE @Search
        OR A.parameter LIKE @Search
        OR A.location LIKE @Search
      )
    `);
  }

  if (department) {
    request.input('Department', sql.NVarChar(100), `%${department}%`);
    whereClauses.push('A.department LIKE @Department');
  }

  if (parameter) {
    request.input('ParameterFilter', sql.NVarChar(100), `%${parameter}%`);
    whereClauses.push('A.parameter LIKE @ParameterFilter');
  }

  if (location) {
    request.input('LocationFilter', sql.NVarChar(100), `%${location}%`);
    whereClauses.push('A.location LIKE @LocationFilter');
  }

  if (jenisKalibrasi === 'Internal') {
    whereClauses.push("COALESCE(NULLIF(LTRIM(RTRIM(A.jenis_kalibrasi_value)), ''), '1') = '1'");
  } else if (jenisKalibrasi === 'External') {
    whereClauses.push("COALESCE(NULLIF(LTRIM(RTRIM(A.jenis_kalibrasi_value)), ''), '1') <> '1'");
  } else if (!includeExternal) {
    // Backward-compatible instrument picker behavior when explicitly requested.
    whereClauses.push("COALESCE(NULLIF(LTRIM(RTRIM(A.jenis_kalibrasi_value)), ''), '1') = '1'");
  }

  let query = `
    SELECT
      A.qa_id AS QA_ID,
      A.instrument_type,
      A.source_id,
      CASE
        WHEN COALESCE(NULLIF(LTRIM(RTRIM(A.jenis_kalibrasi_value)), ''), '1') = '1' THEN 'Internal'
        ELSE 'External'
      END AS Jenis_Kalibrasi,
      A.parameter_sertifikasi AS Parameter_Sertifikasi,
      A.instrument_name AS Assm_nama_instrumen,
      A.instrument_code AS Assm_No_identitas_Istrumen,
      A.calibration_id AS Assm_No_identitas_kalibrasi,
      A.department AS Group_Da_Dept,
      A.capacity AS Assm_Kapasitas,
      A.parameter AS Parameter_Kalibrasi,
      A.location AS Assm_Lokasi,
      REPLACE(CONVERT(CHAR(11), A.calibration_date, 106), ' ', '-') AS Tgl_kalibrasi,
      CASE
        WHEN A.parameter_interval IS NULL THEN NULL
        WHEN LTRIM(RTRIM(CAST(A.parameter_interval AS NVARCHAR(50)))) = '' THEN NULL
        ELSE CAST(A.parameter_interval AS VARCHAR(50)) + ' Bulan'
      END AS Parameter_Interval,
      REPLACE(CONVERT(CHAR(11), A.next_calibration_date, 106), ' ', '-') AS Kalibrasi_selanjutnya,
      A.note AS Catatan,
      A.user_id AS user_ID,
      CONVERT(VARCHAR(20), A.process_date, 13) AS Process_date,
      ISNULL(A.file_name, '') AS f_fileName,
      CASE
        WHEN A.next_calibration_date IS NULL THEN 'Unknown'
        WHEN A.next_calibration_date < GETDATE() THEN 'Overdue'
        WHEN A.next_calibration_date <= DATEADD(DAY, 30, GETDATE()) THEN 'Due Soon'
        ELSE 'Compliant'
      END AS status,

      -- backward-compatible aliases used by pressure-calibration consumers
      A.qa_id,
      A.instrument_name,
      A.instrument_code,
      A.calibration_id,
      A.department,
      A.capacity,
      A.parameter,
      A.location,
      A.next_calibration_date
    FROM (${INSTRUMENT_UNION_SQL}) AS A
  `;

  if (whereClauses.length > 0) {
    query += `\n WHERE ${whereClauses.join('\n   AND ')}`;
  }

  query += `\n ORDER BY A.instrument_type ASC, A.qa_id ASC`;

  const result = await request.query(query);
  return result.recordset;
}

async function getInstrumentByTypeAndId(instrumentType, sourceId) {
  const config = resolveInstrumentConfig(instrumentType);
  const pool = await getPool();

  const result = await pool.request()
    .input('InstrumentType', sql.VarChar(50), config.instrumentType)
    .input('SourceId', sql.NVarChar(50), String(sourceId))
    .query(`
      SELECT *
      FROM (${INSTRUMENT_UNION_SQL}) AS instruments
      WHERE instrument_type = @InstrumentType
        AND source_id = @SourceId
    `);

  return result.recordset[0] || null;
}

async function createInstrument(instrumentType, payload = {}, meta = {}) {
  const config = resolveInstrumentConfig(instrumentType);

  if (config.softDelete) {
    return createRiskAssessmentInstrument(config, payload, meta);
  }

  return createDaInstrument(config, payload, meta);
}

async function createDaInstrument(config, payload, meta) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const idRequest = new sql.Request(transaction);
    const suppliedQaId = getPayloadQaId(payload);
    const qaId = suppliedQaId || await getGeneratedQaId(idRequest, config.idFunction);

    if (isBlank(qaId)) {
      throw createRepositoryError(`Unable to generate QA_ID for ${config.instrumentType}.`, 500);
    }

    const existing = await getDaRawByQaId(config, qaId, transaction);
    if (existing) {
      throw createRepositoryError(`${config.instrumentType} ${qaId} already exists.`, 409);
    }

    const request = new sql.Request(transaction);
    const fieldInput = buildFieldInput(request, payload, config.fields, { isCreate: true });
    const nextCalibrationDate = resolveNextCalibrationDate(
      config,
      payload,
      fieldInput.valuesByColumn
    );

    request.input('QaId', sql.NVarChar(50), qaId);
    request.input('NextCalibrationDate', sql.DateTime, nextCalibrationDate);
    request.input('UserId', sql.NVarChar(100), getMetaUserId(meta, payload));
    request.input('DelegatedTo', sql.NVarChar(100), getMetaDelegatedTo(meta, payload));

    const columns = [
      config.keyColumn,
      ...fieldInput.columns,
      'Kalibrasi_selanjutnya',
      'UserID',
      'Delegated_To',
      'Process_date',
    ];

    const params = [
      '@QaId',
      ...fieldInput.params,
      '@NextCalibrationDate',
      '@UserId',
      '@DelegatedTo',
      'GETDATE()',
    ];

    await request.query(`
      INSERT INTO ${config.table} (${columns.join(', ')})
      VALUES (${params.join(', ')})
    `);

    await transaction.commit();
    return getInstrumentByTypeAndId(config.instrumentType, qaId);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

async function updateInstrument(instrumentType, sourceId, payload = {}, meta = {}) {
  const config = resolveInstrumentConfig(instrumentType);

  if (config.softDelete) {
    return updateRiskAssessmentInstrument(config, sourceId, payload, meta);
  }

  return updateDaInstrument(config, sourceId, payload, meta);
}

async function updateDaInstrument(config, qaId, payload, meta) {
  if (isBlank(qaId)) {
    throw createRepositoryError('Instrument id is required.');
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const existing = await getDaRawByQaId(config, qaId, transaction);
    if (!existing) {
      await transaction.commit();
      return null;
    }

    if (await hasDaApproval(config, qaId, transaction)) {
      throw createRepositoryError('Tidak bisa simpan, karena data sudah approve!');
    }

    const request = new sql.Request(transaction);
    const fieldInput = buildFieldInput(request, payload, config.fields, { isCreate: false });
    const assignments = [...fieldInput.assignments];

    if (shouldTouchNextCalibration(config, payload, fieldInput.valuesByColumn)) {
      request.input(
        'NextCalibrationDate',
        sql.DateTime,
        resolveNextCalibrationDate(config, payload, fieldInput.valuesByColumn, existing)
      );
      assignments.push('Kalibrasi_selanjutnya = @NextCalibrationDate');
    }

    const userId = getMetaUserId(meta, payload);
    const delegatedTo = getMetaDelegatedTo(meta, payload);

    if (!isBlank(userId)) {
      request.input('UserId', sql.NVarChar(100), userId);
      assignments.push('UserID = @UserId');
    }

    if (!isBlank(delegatedTo)) {
      request.input('DelegatedTo', sql.NVarChar(100), delegatedTo);
      assignments.push('Delegated_To = @DelegatedTo');
    }

    if (assignments.length === 0) {
      await transaction.commit();
      return getInstrumentByTypeAndId(config.instrumentType, qaId);
    }

    assignments.push('Process_date = GETDATE()');
    request.input('QaId', sql.NVarChar(50), qaId);

    await request.query(`
      UPDATE ${config.table}
      SET ${assignments.join(',\n          ')}
      WHERE ${config.keyColumn} = @QaId
    `);

    await transaction.commit();
    return getInstrumentByTypeAndId(config.instrumentType, qaId);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

function normalizeRiskAssessmentId(sourceId) {
  const id = normalizeIntegerValue(sourceId);
  if (!id) {
    throw createRepositoryError('Risk_Assessment update/delete requires AssessmentID as source_id.');
  }
  return id;
}

async function getRiskAssessmentRawById(config, sourceId, transaction = null) {
  const request = await createRequest(transaction);
  const result = await request
    .input('SourceId', sql.Int, normalizeRiskAssessmentId(sourceId))
    .query(`
      SELECT TOP 1 *
      FROM ${config.table}
      WHERE ${config.keyColumn} = @SourceId
        AND IsDeleted = 0
    `);

  return result.recordset[0] || null;
}

async function createRiskAssessmentInstrument(config, payload, meta) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const request = new sql.Request(transaction);
    const fieldInput = buildFieldInput(request, payload, config.fields, { isCreate: true });
    request.input('CreatedBy', sql.NVarChar(100), getMetaUserId(meta, payload));

    const columns = [
      ...fieldInput.columns,
      'IsDeleted',
      'CreatedBy',
      'CreatedAt',
    ];

    const params = [
      ...fieldInput.params,
      '0',
      '@CreatedBy',
      'GETDATE()',
    ];

    const result = await request.query(`
      INSERT INTO ${config.table} (${columns.join(', ')})
      VALUES (${params.join(', ')});
      SELECT SCOPE_IDENTITY() AS source_id;
    `);

    const sourceId = result.recordset[0]?.source_id;
    await transaction.commit();
    return getInstrumentByTypeAndId(config.instrumentType, sourceId);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

async function updateRiskAssessmentInstrument(config, sourceId, payload, meta) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const normalizedSourceId = normalizeRiskAssessmentId(sourceId);
    const existing = await getRiskAssessmentRawById(config, normalizedSourceId, transaction);
    if (!existing) {
      await transaction.commit();
      return null;
    }

    const request = new sql.Request(transaction);
    const fieldInput = buildFieldInput(request, payload, config.fields, { isCreate: false });
    const assignments = [...fieldInput.assignments];
    const userId = getMetaUserId(meta, payload);

    if (!isBlank(userId)) {
      request.input('UpdatedBy', sql.NVarChar(100), userId);
      assignments.push('UpdatedBy = @UpdatedBy');
    }

    if (assignments.length === 0) {
      await transaction.commit();
      return getInstrumentByTypeAndId(config.instrumentType, normalizedSourceId);
    }

    assignments.push('UpdatedAt = GETDATE()');
    request.input('SourceId', sql.Int, normalizedSourceId);

    await request.query(`
      UPDATE ${config.table}
      SET ${assignments.join(',\n          ')}
      WHERE ${config.keyColumn} = @SourceId
        AND IsDeleted = 0
    `);

    await transaction.commit();
    return getInstrumentByTypeAndId(config.instrumentType, normalizedSourceId);
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

async function deleteInstrument(instrumentType, sourceId, meta = {}) {
  const config = resolveInstrumentConfig(instrumentType);

  if (config.softDelete) {
    return deleteRiskAssessmentInstrument(config, sourceId, meta);
  }

  return deleteDaInstrument(config, sourceId);
}

async function deleteDaInstrument(config, qaId) {
  if (isBlank(qaId)) {
    throw createRepositoryError('Instrument id is required.');
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const existing = await getDaRawByQaId(config, qaId, transaction);
    if (!existing) {
      await transaction.commit();
      return false;
    }

    const statusRequest = new sql.Request(transaction);
    await statusRequest
      .input('QaId', sql.NVarChar(50), qaId)
      .query(`DELETE FROM ${config.statusTable} WHERE QA_ID = @QaId`);

    const request = new sql.Request(transaction);
    const result = await request
      .input('QaId', sql.NVarChar(50), qaId)
      .query(`DELETE FROM ${config.table} WHERE ${config.keyColumn} = @QaId`);

    await transaction.commit();
    return result.rowsAffected[0] > 0;
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

async function deleteRiskAssessmentInstrument(config, sourceId, meta) {
  const normalizedSourceId = normalizeRiskAssessmentId(sourceId);
  const pool = await getPool();
  const request = pool.request()
    .input('SourceId', sql.Int, normalizedSourceId)
    .input('UpdatedBy', sql.NVarChar(100), getMetaUserId(meta));

  const result = await request.query(`
    UPDATE ${config.table}
    SET
      IsDeleted = 1,
      UpdatedBy = @UpdatedBy,
      UpdatedAt = GETDATE()
    WHERE ${config.keyColumn} = @SourceId
      AND IsDeleted = 0
  `);

  return result.rowsAffected[0] > 0;
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
    .input('IntervalBulan',   sql.VarChar(50),   data.intervalBulan   || null)
    .input('MetodeKalibrasi', sql.VarChar(500),  data.metodeKalibrasi || null)
    .input('Temperature',     sql.Decimal(10,2), data.temperature     ?? null)
    .input('Humidity',        sql.Decimal(10,2), data.humidity        ?? null)
    .input('Pic',             sql.VarChar(100),  data.pic             || null)
    .input('UutUnit',         sql.VarChar(20),   data.uutUnit         || null)
    .input('StandardUnit',    sql.VarChar(20),   data.standardUnit    || null)
    .input('IndicatorType',   sql.VarChar(20),   data.indicatorType   || 'Digital')
    .input('Resolution',      sql.Decimal(18,8), data.resolution      ?? 1)
    .input('StandardUncertainty', sql.Decimal(18,8), data.standardUncertainty ?? null)
    .input('MetalRuleUncertainty', sql.Decimal(18,8), data.metalRuleUncertainty ?? null)
    .input('DeltaH',          sql.Decimal(18,8), data.deltaH          ?? 0)
    .input('MediaDensity',    sql.Decimal(18,8), data.mediaDensity    ?? 1.2)
    .input('Gravity',         sql.Decimal(18,8), data.gravity         ?? 9.78)
    .input('CreatedBy',       sql.VarChar(100),  data.createdBy       || null)
    .query(`
      INSERT INTO [dbo].[calibration_sessions]
        (instrument_id, standard_id, calibration_date, interval_bulan, metode_kalibrasi,
         temperature, humidity,
         pic, uut_unit, standard_unit, indicator_type, resolution,
         standard_uncertainty, metal_rule_uncertainty,
         delta_h, media_density, gravity,
         status, created_by)
      VALUES
        (@InstrumentId, @StandardId, @CalibrationDate, @IntervalBulan, @MetodeKalibrasi,
         @Temperature, @Humidity,
         @Pic, @UutUnit, @StandardUnit, @IndicatorType, @Resolution,
         @StandardUncertainty, @MetalRuleUncertainty,
         @DeltaH, @MediaDensity, @Gravity,
         'DRAFT', @CreatedBy);
      SELECT CAST(SCOPE_IDENTITY() AS INT) AS session_id;
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
        cs.interval_bulan,
        cs.metode_kalibrasi,
        cs.pic,
        cs.uut_unit,
        cs.standard_unit,
        cs.indicator_type,
        cs.resolution,
        cs.standard_uncertainty,
        cs.metal_rule_uncertainty,
        cs.status,
        cs.evaluation_result,
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
        interval_bulan, metode_kalibrasi,
        temperature, humidity, pic, uut_unit, standard_unit,
        indicator_type, resolution,
        standard_uncertainty, metal_rule_uncertainty,
        delta_h, media_density, gravity, status, evaluation_result, created_by, created_at,
        approved_by_admin, approved_by_admin_date,
        approved_by_officer, approved_by_officer_date,
        approved_by_manager, approved_by_manager_date
      FROM [dbo].[calibration_sessions]
      WHERE session_id = @SessionId AND is_deleted = 0
    `);
  return result.recordset[0] || null;
}

/**
 * Update the editable calibration header fields of a session.
 * Only Tanggal Kalibrasi / Interval / Metode Kalibrasi are writable here —
 * mirrors the Thermohygrometer workbook header, which stays editable after the
 * session row exists. Any field left undefined is not touched (COALESCE guard),
 * so existing data is preserved.
 */
async function updateSessionHeader(sessionId, data = {}) {
  const pool = await getPool();
  const result = await pool.request()
    .input('SessionId',       sql.Int,          sessionId)
    .input('CalibrationDate', sql.Date,         data.calibrationDate === undefined ? null : data.calibrationDate)
    .input('IntervalBulan',   sql.VarChar(50),  data.intervalBulan   === undefined ? null : (data.intervalBulan   || null))
    .input('MetodeKalibrasi', sql.VarChar(500), data.metodeKalibrasi === undefined ? null : (data.metodeKalibrasi || null))
    .input('TouchDate',       sql.Bit,          data.calibrationDate === undefined ? 0 : 1)
    .input('TouchInterval',   sql.Bit,          data.intervalBulan   === undefined ? 0 : 1)
    .input('TouchMetode',     sql.Bit,          data.metodeKalibrasi === undefined ? 0 : 1)
    .query(`
      UPDATE [dbo].[calibration_sessions]
      SET
        calibration_date = CASE WHEN @TouchDate     = 1 THEN @CalibrationDate ELSE calibration_date END,
        interval_bulan   = CASE WHEN @TouchInterval = 1 THEN @IntervalBulan   ELSE interval_bulan   END,
        metode_kalibrasi = CASE WHEN @TouchMetode   = 1 THEN @MetodeKalibrasi ELSE metode_kalibrasi END
      WHERE session_id = @SessionId AND is_deleted = 0
    `);
  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
}

async function updateSessionManualUncertainties(
  sessionId,
  standardUncertainty,
  metalRuleUncertainty
) {
  const pool = await getPool();
  await pool.request()
    .input('SessionId', sql.Int, sessionId)
    .input('StandardUncertainty', sql.Decimal(18,8), standardUncertainty ?? null)
    .input('MetalRuleUncertainty', sql.Decimal(18,8), metalRuleUncertainty ?? null)
    .query(`
      UPDATE [dbo].[calibration_sessions]
      SET
        standard_uncertainty = @StandardUncertainty,
        metal_rule_uncertainty = @MetalRuleUncertainty
      WHERE session_id = @SessionId
    `);
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

// Manual verdict (Kesimpulan) — picked by the technician on the Evaluation tab.
async function updateSessionEvaluationResult(sessionId, evaluationResult) {
  const pool = await getPool();
  const result = await pool.request()
    .input('SessionId', sql.Int, sessionId)
    .input('EvaluationResult', sql.VarChar(100), evaluationResult || null)
    .query(`
      UPDATE [dbo].[calibration_sessions]
      SET evaluation_result = @EvaluationResult
      WHERE session_id = @SessionId AND is_deleted = 0
    `);
  return (result.rowsAffected && result.rowsAffected[0] > 0) || false;
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
  // instruments
  listInstruments,
  getDaBagianHistoryByQaId,
  getInstrumentById,
  getInstrumentByTypeAndId,
  createInstrument,
  updateInstrument,
  deleteInstrument,
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
  updateSessionManualUncertainties,
  updateSessionStatus,
  updateSessionEvaluationResult,
  updateSessionHeader,
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
