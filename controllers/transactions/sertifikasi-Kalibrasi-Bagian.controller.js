const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');
const {
  getDateTime,
  getEmployeeName,
  getApproverIdentity,
  isAllowInputBagian,
  getAutoHasilKalBagianID,
  isInputTglKalibrasiBAGIAN,
} = require('../../helpers/kalibrasi.helper');
const {
  formatResultRows,
  normalizeCalculationNumbers,
  normalizeCertificateQuery,
  parseDotDecimal,
} = require('../../helpers/calibration-number-format.helper');

const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
};

const WORKBOOK_CERTIFICATE_CONFIGS = [
  {
    key: 'torque-meter',
    label: 'Torque Meter',
    prefixes: ['TQ'],
    table: 'dbo.T_Kalibrasi_TorqueMeter_Workbook_Session',
    printRoute: '/PrintTorqueMeter',
    sessionRoute: '/torque-meter-calibration',
  },
  {
    key: 'dissolution-tester',
    label: 'Dissolution Tester',
    prefixes: ['DT'],
    table: 'dbo.T_Kalibrasi_DissolutionTester_Workbook_Session',
    printRoute: '/PrintDissolutionTester',
    sessionRoute: '/dissolution-tester-calibration',
  },
  {
    key: 'enclosures',
    label: 'Enclosures',
    prefixes: ['E'],
    table: 'dbo.T_Kalibrasi_Enclosures_Workbook_Session',
    printRoute: '/PrintEnclosures',
    sessionRoute: '/enclosures-calibration',
  },
  {
    key: 'friability',
    label: 'Friability',
    prefixes: ['FT'],
    table: 'dbo.T_Kalibrasi_Friability_Workbook_Session',
    printRoute: '/PrintFriabilityTester',
    sessionRoute: '/friability-calibration',
  },
  {
    key: 'hardness-tester',
    label: 'Hardness Tester',
    prefixes: ['HT'],
    table: 'dbo.T_Kalibrasi_HardnessTester_Workbook_Session',
    printRoute: '/PrintHardnessTester',
    sessionRoute: '/hardness-tester-calibration',
  },
  {
    key: 'leak-test',
    label: 'Leak Test',
    prefixes: ['LT'],
    table: 'dbo.T_Kalibrasi_LeakTest_Workbook_Session',
    printRoute: '/PrintLeakTest',
    sessionRoute: '/leak-test-calibration',
  },
  {
    key: 'moisture',
    label: 'Moisture',
    prefixes: ['MA'],
    table: 'dbo.T_Kalibrasi_Moisture_Workbook_Session',
    printRoute: '/PrintMoisture',
    sessionRoute: '/moisture-calibration',
  },
  {
    key: 'temperature-control',
    label: 'Temperature Control',
    prefixes: ['TC'],
    table: 'dbo.T_Kalibrasi_TemperatureControl_Workbook_Session',
    printRoute: '/PrintTemperatureControl',
    sessionRoute: '/temperature-control-calibration',
  },
];

const WORKBOOK_CERTIFICATE_CONFIG_BY_PREFIX = WORKBOOK_CERTIFICATE_CONFIGS.reduce(
  (map, config) => {
    config.prefixes.forEach((prefix) => {
      map.set(prefix, config);
    });
    return map;
  },
  new Map()
);

const SORTED_WORKBOOK_PREFIXES = [...WORKBOOK_CERTIFICATE_CONFIG_BY_PREFIX.keys()].sort(
  (a, b) => b.length - a.length
);

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function textValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function parseNumberValue(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

function displayNumber(value, { signed = false, uncertainty = false, decimals = 3 } = {}) {
  const number = parseNumberValue(value);
  if (number === null) {
    const text = textValue(value);
    return uncertainty && text && !text.startsWith('\u00B1') ? `\u00B1${text}` : text;
  }

  const safeNumber = Math.abs(number) < 0.5 * 10 ** -decimals ? 0 : number;
  const absolute = uncertainty ? Math.abs(safeNumber) : safeNumber;
  const fixed = absolute.toFixed(decimals);
  const cleanFixed = fixed === '-0.000' ? '0.000' : fixed;

  if (uncertainty) return `\u00B1${cleanFixed}`;
  if (signed && safeNumber > 0) return `+${cleanFixed}`;
  return cleanFixed;
}

function getCertificateWorkbookPrefix(idNoSertifikat) {
  const text = textValue(idNoSertifikat).toUpperCase();
  return SORTED_WORKBOOK_PREFIXES.find((prefix) => text.startsWith(prefix)) || '';
}

function getWorkbookCertificateConfig(idNoSertifikat) {
  const prefix = getCertificateWorkbookPrefix(idNoSertifikat);
  return prefix ? WORKBOOK_CERTIFICATE_CONFIG_BY_PREFIX.get(prefix) : null;
}

function column(field, headerName, minWidth = 130) {
  return { field, headerName, minWidth, flex: 1 };
}

function genericWorkbookRows(calculationResult = {}) {
  const rows = Array.isArray(calculationResult?.certificateRows)
    ? calculationResult.certificateRows
    : Array.isArray(calculationResult?.rows)
      ? calculationResult.rows
      : Array.isArray(calculationResult?.points)
        ? calculationResult.points
        : [];

  return rows.map((row, index) => ({
    No: index + 1,
    Setting: displayNumber(row.setting ?? row.Setting ?? row.setPoint),
    Pembacaan_Alat: displayNumber(
      row.pembacaanAlat ?? row.Pembacaan_Alat ?? row.indicator ?? row.avgUut
    ),
    Pembacaan_standar: displayNumber(
      row.pembacaanStandar ?? row.Pembacaan_standar ?? row.reference ?? row.avgStd
    ),
    Error: displayNumber(row.error ?? row.ERROR ?? row.avgError, { signed: true }),
    Ketidakpastian: displayNumber(
      row.ketidakpastian ?? row.Ketidakpastian ?? row.uncertainty?.expanded,
      { uncertainty: true }
    ),
  }));
}

function buildTorqueWorkbookGrid(calculationResult = {}) {
  const directionLabels = {
    clockwise: 'Pembacaan Searah Jarum Jam',
    anticlockwise: 'Pembacaan Berlawanan Arah Jarum Jam',
  };
  const rows = (Array.isArray(calculationResult?.tables) ? calculationResult.tables : []).map(
    (table, index) => ({
      No: index + 1,
      Arah: directionLabels[table.directionKey] || textValue(table.directionLabel),
      Nilai_Standar: displayNumber(table.avgStandard),
      Pembacaan_Alat: displayNumber(table.avgUut),
      Error: displayNumber(table.avgError, { signed: true }),
      Ketidakpastian: displayNumber(table.uExpanded, { uncertainty: true }),
    })
  );

  return {
    columns: [
      column('Arah', 'Arah', 220),
      column('Nilai_Standar', 'Nilai Standar'),
      column('Pembacaan_Alat', 'Pembacaan Alat'),
      column('Error', 'Error'),
      column('Ketidakpastian', 'Ketidakpastian'),
    ],
    rows,
  };
}

function buildEnclosuresWorkbookGrid(calculationResult = {}) {
  const temperatureRows = Array.isArray(calculationResult?.temperature)
    ? calculationResult.temperature
    : [];
  const humidityRows = Array.isArray(calculationResult?.humidity)
    ? calculationResult.humidity
    : [];
  const hasHumidity = humidityRows.length > 0;
  const rows = [
    ...temperatureRows.map((point, index) => ({
      No: index + 1,
      Parameter: 'Suhu',
      Setting_Alat: displayNumber(point.setPoint ?? point.setting),
      Penunjukan_Alat: displayNumber(point.indicatorValue ?? point.pembacaanAlat),
      Hasil_Terukur: displayNumber(point.measurementValue ?? point.pembacaanStandar),
      Error: displayNumber(point.error, { signed: true }),
      Ketidakpastian: displayNumber(point.uncertainty?.expanded ?? point.ketidakpastian),
      Variasi_Spasial: displayNumber(point.spatialVariation),
      Variasi_Temporal: displayNumber(point.temporalVariation),
      Variasi_Total: displayNumber(point.totalVariation),
    })),
    ...humidityRows.map((point, index) => ({
      No: temperatureRows.length + index + 1,
      Parameter: 'rH',
      Setting_Alat: displayNumber(point.setPoint ?? point.setting),
      Penunjukan_Alat: displayNumber(point.indicatorValue ?? point.pembacaanAlat),
      Hasil_Terukur: displayNumber(point.measurementValue ?? point.pembacaanStandar),
      Error: displayNumber(point.error, { signed: true }),
      Ketidakpastian: displayNumber(point.uncertainty?.expanded ?? point.ketidakpastian),
      Variasi_Spasial: displayNumber(point.spatialVariation),
      Variasi_Temporal: displayNumber(point.temporalVariation),
      Variasi_Total: displayNumber(point.totalVariation),
    })),
  ];

  return {
    columns: [
      ...(hasHumidity ? [column('Parameter', 'Parameter', 100)] : []),
      column('Setting_Alat', 'Setting Alat'),
      column('Penunjukan_Alat', 'Penunjukan Alat'),
      column('Hasil_Terukur', 'Hasil Terukur'),
      column('Error', 'Error'),
      column('Ketidakpastian', 'Ketidakpastian', 155),
      column('Variasi_Spasial', 'Variasi Spasial'),
      column('Variasi_Temporal', 'Variasi Temporal'),
      column('Variasi_Total', 'Variasi Total'),
    ],
    rows,
  };
}

function buildDissolutionWorkbookGrid(calculationResult = {}) {
  const rows = (Array.isArray(calculationResult?.vesselRows)
    ? calculationResult.vesselRows
    : []
  ).map((row, index) => ({
    Vessel: row.vessel || index + 1,
    Shaft_Wobble: displayNumber(row.shaftWobble),
    Baskets_Wobble: displayNumber(row.basketsWobble ?? row.basketWobble),
    Paddle_Wobble: displayNumber(row.paddleWobble),
    Rot_Spd_1: displayNumber(row.rotSpd1),
    Rot_Spd_2: displayNumber(row.rotSpd2),
    Rot_Spd_3: displayNumber(row.rotSpd3),
    Basket: displayNumber(row.basket ?? row.basketHeight),
    Paddle: displayNumber(row.paddle ?? row.paddleHeight),
    Temp_Vessel: displayNumber(row.tempVessel ?? row.temperatureVessel),
  }));

  return {
    columns: [
      column('Vessel', 'Vessel', 90),
      column('Shaft_Wobble', 'Shaft Wobble'),
      column('Baskets_Wobble', 'Baskets Wobble'),
      column('Paddle_Wobble', 'Paddle Wobble'),
      column('Rot_Spd_1', 'Rot Spd 1'),
      column('Rot_Spd_2', 'Rot Spd 2'),
      column('Rot_Spd_3', 'Rot Spd 3'),
      column('Basket', 'Basket'),
      column('Paddle', 'Paddle'),
      column('Temp_Vessel', 'Temp Vessel'),
    ],
    rows,
  };
}

function buildFriabilityWorkbookGrid(calculationResult = {}) {
  const rows = (Array.isArray(calculationResult?.rows) ? calculationResult.rows : []).map(
    (row, index) => ({
      No: index + 1,
      Time: displayNumber(row.time ?? row.tOneRotation),
      RPM: displayNumber(row.rpm),
      Pembacaan_Alat: displayNumber(row.rpm),
      Pembacaan_standar: displayNumber(25),
      Error: displayNumber(parseNumberValue(row.rpm) === null ? null : parseNumberValue(row.rpm) - 25, {
        signed: true,
      }),
      Ketidakpastian: displayNumber(row.ketidakpastian, { uncertainty: true }),
      Keterangan: textValue(row.ket),
    })
  );

  return {
    columns: [
      column('No', 'No', 80),
      column('Time', 'Time'),
      column('RPM', 'RPM'),
      column('Error', 'Error'),
      column('Ketidakpastian', 'Ketidakpastian'),
      column('Keterangan', 'Keterangan'),
    ],
    rows,
  };
}

function buildMoistureWorkbookGrid(calculationResult = {}) {
  const massRows = Array.isArray(calculationResult?.massRows)
    ? calculationResult.massRows.map((row, index) => ({
        No: index + 1,
        Type: 'Mass',
        Setting: '',
        Pembacaan_Alat: displayNumber(row.r),
        Pembacaan_standar: displayNumber(row.conventionalMass),
        Error: displayNumber(row.error, { signed: true }),
        Ketidakpastian: displayNumber(row.ketidakpastian, { uncertainty: true }),
      }))
    : [];
  const temperatureRows = Array.isArray(calculationResult?.temperatureRows)
    ? calculationResult.temperatureRows.map((row, index) => ({
        No: massRows.length + index + 1,
        Type: 'Temperature',
        Setting: displayNumber(row.setting),
        Pembacaan_Alat: displayNumber(row.afterUut),
        Pembacaan_standar: displayNumber(row.afterStandard),
        Error: displayNumber(row.afterError, { signed: true }),
        Ketidakpastian: displayNumber(row.ketidakpastian, { uncertainty: true }),
      }))
    : [];

  return {
    columns: [
      column('Type', 'Type', 120),
      column('Setting', 'Setting'),
      column('Pembacaan_Alat', 'Pembacaan Alat'),
      column('Pembacaan_standar', 'Pembacaan Standard'),
      column('Error', 'Error'),
      column('Ketidakpastian', 'Ketidakpastian'),
    ],
    rows: [...massRows, ...temperatureRows],
  };
}

function buildHardnessWorkbookGrid(calculationResult = {}) {
  const labels = {
    hardness: 'Hardness',
    thickness: 'Thickness',
    diameter: 'Diameter',
  };
  const activeKeys = Array.isArray(calculationResult?.activeKeys) && calculationResult.activeKeys.length
    ? calculationResult.activeKeys
    : ['hardness', 'thickness', 'diameter'].filter((key) => calculationResult?.[key]?.enabled);
  const rows = [];

  activeKeys.forEach((key) => {
    const test = calculationResult?.[key] || {};
    const unit = test?.setup?.unit || '';
    (test.points || []).forEach((point) => {
      rows.push({
        Parameter: labels[key] || key,
        Setting: displayNumber(point.setting),
        Unit: textValue(point.unit || unit),
        Pembacaan_Alat: displayNumber(key === 'hardness' ? point.result : point.avgUut),
        Pembacaan_standar: displayNumber(
          key === 'hardness' ? point.convertedStandard : point.avgStd
        ),
        Error: displayNumber(key === 'hardness' ? point.error : point.avgError, {
          signed: true,
        }),
        Ketidakpastian: displayNumber(point.expandedUncertainty, { uncertainty: true }),
      });
    });
  });

  return {
    columns: [
      column('Parameter', 'Parameter', 120),
      column('Setting', 'Setting'),
      column('Unit', 'Unit', 90),
      column('Pembacaan_Alat', 'Pembacaan Alat'),
      column('Pembacaan_standar', 'Pembacaan Standard'),
      column('Error', 'Error'),
      column('Ketidakpastian', 'Ketidakpastian'),
    ],
    rows,
  };
}

function buildLeakTestWorkbookGrid(calculationResult = {}) {
  const pressureRows = (Array.isArray(calculationResult?.points)
    ? calculationResult.points
    : []
  ).map((point, index) => ({
    No: index + 1,
    Parameter: 'Vacuum',
    Setting: displayNumber(point.setting),
    Pembacaan_Alat: displayNumber(point.avgUut),
    Pembacaan_standar: displayNumber(point.avgStd),
    Error: displayNumber(point.avgError, { signed: true }),
    Ketidakpastian: '',
    Keterangan:
      point.passed === null || point.passed === undefined
        ? ''
        : point.passed
          ? 'MS'
          : 'TMS',
  }));
  const timerEnabled = Boolean(
    calculationResult?.timer?.enabled || calculationResult?.timer?.hasData
  );
  const timerRows = (Array.isArray(calculationResult?.timer?.points)
    ? calculationResult.timer.points
    : []
  )
    .filter((point) => timerEnabled && Number(point?.enteredCount || 0) > 0)
    .map((point, index) => ({
      No: pressureRows.length + index + 1,
      Parameter: 'Timer',
      Setting: displayNumber(point.setting),
      Pembacaan_Alat: '',
      Pembacaan_standar: displayNumber(point.meanStdSec),
      Error: displayNumber(point.meanErrorSec, { signed: true }),
      Ketidakpastian: displayNumber(point.uExpandedSec, { uncertainty: true }),
      Keterangan: '',
    }));

  return {
    columns: [
      column('Parameter', 'Parameter', 120),
      column('Setting', 'Setting'),
      column('Pembacaan_Alat', 'Pembacaan Alat'),
      column('Pembacaan_standar', 'Pembacaan Standard'),
      column('Error', 'Error'),
      column('Ketidakpastian', 'Ketidakpastian'),
      column('Keterangan', 'Keterangan', 110),
    ],
    rows: [...pressureRows, ...timerRows],
  };
}

function buildTemperatureControlWorkbookGrid(calculationResult = {}) {
  const rows = (Array.isArray(calculationResult?.points)
    ? calculationResult.points
    : []
  ).map((point, index) => ({
    No: index + 1,
    Setting: displayNumber(point.setting),
    Pembacaan_Alat: displayNumber(point.selected?.indicator),
    Pembacaan_standar: displayNumber(point.selected?.reference),
    Error: displayNumber(point.selected?.error, { signed: true }),
    Ketidakpastian: displayNumber(point.uncertainty?.expanded, {
      uncertainty: true,
    }),
    Toleransi: displayNumber(point.tolerance),
    Keterangan:
      point.passed === null || point.passed === undefined
        ? ''
        : point.passed
          ? 'MS'
          : 'TMS',
  }));

  return {
    columns: [
      column('Setting', 'Setting'),
      column('Pembacaan_Alat', 'Pembacaan Alat'),
      column('Pembacaan_standar', 'Pembacaan Standard'),
      column('Error', 'Error'),
      column('Ketidakpastian', 'Ketidakpastian'),
      column('Toleransi', 'Toleransi'),
      column('Keterangan', 'Keterangan', 110),
    ],
    rows,
  };
}

function buildWorkbookGridData(config, calculationResult = {}) {
  if (config.key === 'torque-meter') return buildTorqueWorkbookGrid(calculationResult);
  if (config.key === 'dissolution-tester') return buildDissolutionWorkbookGrid(calculationResult);
  if (config.key === 'enclosures') return buildEnclosuresWorkbookGrid(calculationResult);
  if (config.key === 'friability') return buildFriabilityWorkbookGrid(calculationResult);
  if (config.key === 'moisture') return buildMoistureWorkbookGrid(calculationResult);
  if (config.key === 'hardness-tester') return buildHardnessWorkbookGrid(calculationResult);
  if (config.key === 'leak-test') return buildLeakTestWorkbookGrid(calculationResult);
  if (config.key === 'temperature-control') {
    return buildTemperatureControlWorkbookGrid(calculationResult);
  }

  return {
    columns: [
      column('Setting', 'Setting'),
      column('Pembacaan_Alat', 'Pembacaan Alat'),
      column('Pembacaan_standar', 'Pembacaan Standard'),
      column('Error', 'Error'),
      column('Ketidakpastian', 'Ketidakpastian'),
    ],
    rows: genericWorkbookRows(calculationResult),
  };
}

async function workbookSessionTableExists(tableName) {
  const result = await sequelizeMSQL.query(
    `SELECT OBJECT_ID(:tableName, 'U') AS object_id`,
    {
      replacements: { tableName },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  return Boolean(result[0]?.object_id);
}

async function fetchWorkbookSessionByCertificate(config, qaId, idNoSertifikat) {
  if (!config || !(await workbookSessionTableExists(config.table))) return null;

  const qaFilter = qaId ? 'AND QA_ID = :qaId' : '';
  const replacements = qaId ? { qaId, idNoSertifikat } : { idNoSertifikat };

  const rows = await sequelizeMSQL.query(
    `
      SELECT TOP 1
        Session_ID,
        QA_ID,
        ID_No_Sertifikat,
        Workbook_Payload_JSON,
        Calculation_Result_JSON,
        Evaluation_Result,
        Status,
        Process_Date,
        Update_Date
      FROM ${config.table}
      WHERE ID_No_Sertifikat = :idNoSertifikat
        ${qaFilter}
      ORDER BY ISNULL(Update_Date, Process_Date) DESC, Session_ID DESC
    `,
    {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  return rows[0] || null;
}

// ============================================================
// SEARCH / LIST
// ============================================================

/**
 * Search Sertifikat Kalibrasi Bagian
 * Based on VBA cmd_Cari_Sertifikat_Click function
 * VN dept uses direct T_Kalibrasi_Sertifikat_Bagian table;
 * others use vw_kal_Last_sert_bagian view.
 * Route: GET /sertifikat-bagian/search
 */
const searchSertifikatBagian = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { search } = req.query;

    const likeSearch = `%${search || ''}%`;

    let query = '';

    if (bagian_user === 'VN') {
      // VN department: query directly on T_Kalibrasi_Sertifikat_Bagian
      query = `
        SELECT
          A.QA_ID,
          A.ID_No_Sertifikat,
          tgl,
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
          Catatan,
          B.User_ID AS ApproverID,
          B.process_date AS ApproveDate,
          C.User_ID AS Generate_DA_ID,
          C.process_date AS Generate_DA_Date,
          isSert_Manual
        FROM T_Kalibrasi_Sertifikat_Bagian AS A
        LEFT JOIN (
          SELECT * FROM T_Kalibrasi_Sertifikat_Bagian_Status WHERE approver_no = 1
        ) AS B ON A.QA_ID = B.QA_ID AND A.ID_No_Sertifikat = B.ID_No_Sertifikat
        LEFT JOIN (
          SELECT * FROM T_Kalibrasi_Sertifikat_Bagian_Status WHERE approver_no = 2
        ) AS C ON A.QA_ID = C.QA_ID AND A.ID_No_Sertifikat = C.ID_No_Sertifikat
        WHERE (
          A.ID_No_Sertifikat LIKE :search
          OR A.QA_ID LIKE :search
          OR Assm_nama_instrumen LIKE :search
          OR Assm_No_identitas_kalibrasi LIKE :search
        )
        ORDER BY tgl DESC
      `;
    } else {
      // Non-VN: use vw_kal_Last_sert_bagian view to get only latest sertifikat
      query = `
        SELECT
          A.QA_ID,
          A.ID_No_Sertifikat,
          tgl,
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
          Catatan,
          B.User_ID AS ApproverID,
          B.process_date AS ApproveDate,
          C.User_ID AS Generate_DA_ID,
          C.process_date AS Generate_DA_Date,
          isSert_Manual
        FROM vw_kal_Last_sert_bagian AS Z
        LEFT JOIN T_Kalibrasi_Sertifikat_Bagian AS A
          ON A.QA_ID = Z.QA_ID AND A.ID_No_Sertifikat = Z.Nomor
        LEFT JOIN (
          SELECT * FROM T_Kalibrasi_Sertifikat_Bagian_Status WHERE approver_no = 1
        ) AS B ON A.QA_ID = B.QA_ID AND A.ID_No_Sertifikat = B.ID_No_Sertifikat
        LEFT JOIN (
          SELECT * FROM T_Kalibrasi_Sertifikat_Bagian_Status WHERE approver_no = 2
        ) AS C ON A.QA_ID = C.QA_ID AND A.ID_No_Sertifikat = C.ID_No_Sertifikat
        WHERE (
          A.ID_No_Sertifikat LIKE :search
          OR A.QA_ID LIKE :search
          OR Assm_nama_instrumen LIKE :search
          OR Assm_No_identitas_kalibrasi LIKE :search
        )
        ORDER BY tgl DESC
      `;
    }

    const results = await sequelizeMSQL.query(query, {
      replacements: { search: likeSearch },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in searchSertifikatBagian:', error);
    next(error);
  }
};

/**
 * Search Sertifikat Kalibrasi Bagian by QA_ID or ID_No_Sertifikat
 * Based on VBA sb_OpenByNo_QA_ID function
 * Route: GET /sertifikat-bagian/search-by-qa-id
 */
const searchByQAID = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { search } = req.query;

    const likeSearch = `%${search || ''}%`;

    const query = `
      SELECT
        A.QA_ID,
        A.ID_No_Sertifikat,
        tgl,
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
        Catatan,
        B.User_ID AS ApproverID,
        B.process_date AS ApproveDate
      FROM T_Kalibrasi_Sertifikat_Bagian AS A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_Sertifikat_Bagian_Status WHERE approver_no = 1
      ) AS B ON A.QA_ID = B.QA_ID AND A.ID_No_Sertifikat = B.ID_No_Sertifikat
      WHERE (
        A.ID_No_Sertifikat LIKE :search
        OR A.QA_ID LIKE :search
      )
      ORDER BY tgl DESC
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { search: likeSearch },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in searchByQAID:', error);
    next(error);
  }
};

// ============================================================
// DETAIL
// ============================================================

/**
 * Get Sertifikat Kalibrasi Bagian Detail
 * Based on VBA sb_Isi_Data function
 * Route: GET /sertifikat-bagian/detail
 */
const getSertifikatBagianDetail = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = normalizeCertificateQuery(req.query);

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('qa_id and id_no_sertifikat are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const query = `
      SELECT
        QA_ID,
        ID_No_Sertifikat,
        tgl,
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
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat LIKE :id_no_sertifikat
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        qa_id,
        id_no_sertifikat: `%${id_no_sertifikat}%`,
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (results.length === 0) {
      const err = new Error('Data not found');
      err.statusCode = 404;
      res.status(404).json({ success: false, message: err.message });
      next(err);
      return;
    }

    return res.status(200).json({
      success: true,
      data: results[0],
    });
  } catch (error) {
    console.error('Error in getSertifikatBagianDetail:', error);
    next(error);
  }
};

// ============================================================
// HASIL KALIBRASI (Suhu grid)
// ============================================================

/**
 * Get Hasil Kalibrasi data for a sertifikat
 * Based on VBA sb_Show_Grid_Suhu function
 * Route: GET /sertifikat-bagian/hasil-kal
 */
const getHasilKalData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = normalizeCertificateQuery(req.query);

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('qa_id and id_no_sertifikat are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const query = `
      SELECT
        Seq_ID,
        Pembacaan_Alat,
        Pembacaan_standar,
        Error,
        Ketidakpastian
      FROM T_Kalibrasi_Sertifikat_Bagian_Hasil_Kal
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
      ORDER BY Seq_ID
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: formatResultRows(results),
    });
  } catch (error) {
    console.error('Error in getHasilKalData:', error);
    next(error);
  }
};

const getWorkbookPrintData = async (req, res, next) => {
  try {
    const { qa_id, id_no_sertifikat } = normalizeCertificateQuery(req.query);

    if (!id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'id_no_sertifikat is required',
      });
    }

    const config = getWorkbookCertificateConfig(id_no_sertifikat);
    if (!config) {
      return res.status(200).json({
        success: true,
        data: {
          registered: false,
          printDataPresent: false,
          reason: 'certificate prefix is not managed by a workbook',
        },
      });
    }

    const session = await fetchWorkbookSessionByCertificate(
      config,
      qa_id,
      id_no_sertifikat
    );

    if (!session) {
      return res.status(200).json({
        success: true,
        data: {
          registered: false,
          printDataPresent: false,
          workbook: {
            key: config.key,
            label: config.label,
            printRoute: config.printRoute,
            sessionRoute: config.sessionRoute,
          },
        },
      });
    }

    const workbookPayload = parseJson(session.Workbook_Payload_JSON, null);
    const calculationResult = normalizeCalculationNumbers(
      parseJson(session.Calculation_Result_JSON, null)
    );
    const grid = buildWorkbookGridData(config, calculationResult || {});

    return res.status(200).json({
      success: true,
      data: {
        registered: true,
        printDataPresent: Boolean(calculationResult && grid.rows.length),
        workbook: {
          key: config.key,
          label: config.label,
          printRoute: config.printRoute,
          sessionRoute: config.sessionRoute,
        },
        session: {
          Session_ID: session.Session_ID,
          QA_ID: session.QA_ID,
          ID_No_Sertifikat: session.ID_No_Sertifikat,
          Evaluation_Result: session.Evaluation_Result,
          Status: session.Status,
          Process_Date: session.Process_Date,
          Update_Date: session.Update_Date,
        },
        workbookPayload,
        calculation: calculationResult,
        columns: grid.columns,
        rows: grid.rows,
      },
    });
  } catch (error) {
    console.error('Error in getWorkbookPrintData:', error);
    next(error);
  }
};

// ============================================================
// SEARCH DA BAGIAN (for creating new sertifikat)
// ============================================================

/**
 * Search DA Bagian for creating a new sertifikat
 * Based on VBA cmd_New_Click function (the search DA part)
 * Returns DA Bagian records with Parameter_Sertifikasi in (Timer, Tekanan, Temperatur)
 * Route: GET /sertifikat-bagian/search-da
 */
const searchDABagian = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { search } = req.query;

    const likeSearch = `%${search || ''}%`;

    const query = `
      SELECT
        A.QA_ID,
        CASE WHEN ISNULL(Jenis_Kalibrasi, 1) = 1 THEN 'Internal' ELSE 'External' END AS Jenis_Kalibrasi,
        Parameter_Sertifikasi,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        REPLACE(CONVERT(CHAR(11), Tgl_kalibrasi, 106), ' ', '-') AS Tgl_kalibrasi,
        CAST(Parameter_Interval AS VARCHAR) + ' Bulan' AS Parameter_Interval,
        REPLACE(CONVERT(CHAR(11), Kalibrasi_selanjutnya, 106), ' ', '-') AS Kalibrasi_selanjutnya,
        Catatan
      FROM T_Kalibrasi_DA_Bagian AS A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_DA_Bagian_status WHERE approver_no = 1
      ) AS B ON A.QA_ID = B.QA_id
      LEFT JOIN (
        SELECT QA_ID FROM T_Kalibrasi_Permohonan WHERE QA_ID IS NOT NULL
      ) AS D ON D.QA_ID = A.QA_ID
      WHERE A.Parameter_Sertifikasi IN (
        'Tekanan',
        'Volume',
        'Dimensi',
        'Timer',
        'Temperatur',
        'Enclosures',
        'Dissolution Tester',
        'Disintegration Tester',
        'Friability Tester',
        'Moisture Analyzer',
        'RPM',
        'pH, Redoks, dan Conductivity',
        'Indikator Suhu dan Simulasi Kelistrikan',
        'Torque',
        'Hardness Tester',
        'Melting Point',
        'Leak Tester',
        'Tapped Volumeter',
        'Lain-Lain'
      )
        AND (
          A.QA_ID LIKE :search
          OR Assm_nama_instrumen LIKE :search
          OR Assm_No_identitas_Istrumen LIKE :search
          OR Assm_No_identitas_kalibrasi LIKE :search
        )
      ORDER BY A.QA_ID ASC
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { search: likeSearch },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in searchDABagian:', error);
    next(error);
  }
};

// ============================================================
// SEARCH RE-SERTIFIKASI
// ============================================================

/**
 * Search Sertifikat Bagian for re-sertifikasi
 * Based on VBA cmd_ReSertifikasi_Click function (search part)
 * Uses UNION ALL:
 *   Part 1: sertifikat not in vw_kal_Bagian_Not
 *   Part 2: manual sertifikat (isSert_Manual = 1) that are already approved
 * Route: GET /sertifikat-bagian/search-resertifikasi
 */
const searchResertifikasiBagian = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { search } = req.query;

    const likeSearch = `%${search || ''}%`;

    const query = `
      SELECT
        A.QA_ID,
        A.ID_No_Sertifikat,
        tgl,
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
        Catatan,
        B.User_ID AS Appr_ID,
        B.Process_date AS Appr_Date
      FROM T_Kalibrasi_Sertifikat_Bagian AS A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_Sertifikat_Bagian_Status WHERE approver_no = 1
      ) AS B ON A.QA_ID = B.QA_ID AND A.ID_No_Sertifikat = B.ID_No_Sertifikat
      WHERE A.ID_No_Sertifikat NOT IN (
        SELECT ID_No_Sertifikat FROM vw_kal_Bagian_Not
      )
        AND (
          A.QA_ID LIKE :search
          OR A.ID_No_Sertifikat LIKE :search
          OR Nama LIKE :search
        )

      UNION ALL

      SELECT
        A.QA_ID,
        A.ID_No_Sertifikat,
        tgl,
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
        Catatan,
        B.User_ID AS Appr_ID,
        B.Process_date AS Appr_Date
      FROM T_Kalibrasi_Sertifikat_Bagian AS A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_Sertifikat_Bagian_Status WHERE approver_no = 1
      ) AS B ON A.QA_ID = B.QA_ID AND A.ID_No_Sertifikat = B.ID_No_Sertifikat
      WHERE A.isSert_Manual = 1
        AND B.QA_ID IS NOT NULL
        AND (
          A.QA_ID LIKE :search
          OR A.ID_No_Sertifikat LIKE :search
          OR Nama LIKE :search
        )
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { search: likeSearch },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in searchResertifikasiBagian:', error);
    next(error);
  }
};

// ============================================================
// CHECK / HELPER GETs
// ============================================================

/**
 * Check if Sertifikat Bagian is approved at a given approver level
 * Based on VBA fn_IS_approve function
 * Route: GET /sertifikat-bagian/is-approved
 */
const checkIsApproved = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = normalizeCertificateQuery(req.query);
    const { approver_no } = req.query;

    if (!qa_id || !id_no_sertifikat || approver_no === undefined) {
      const err = new Error('qa_id, id_no_sertifikat, and approver_no are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const query = `
      SELECT *
      FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = :approver_no
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { qa_id, id_no_sertifikat, approver_no },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      is_approved: results.length > 0,
      data: results,
    });
  } catch (error) {
    console.error('Error in checkIsApproved:', error);
    next(error);
  }
};

/**
 * Check approve/reject button status for a sertifikat
 * Based on VBA sb_approve_button function
 * Checks if current user is in approver lines (KAL_Sert_Bagian, Appr_No=1)
 * and whether the sertifikat already has an approver_no=1 record.
 * Route: GET /sertifikat-bagian/check-approve-button
 */
const checkApproveButton = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = normalizeCertificateQuery(req.query);

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('qa_id and id_no_sertifikat are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // 1# Check if user is an approver for KAL_Sert_Bagian level 1
    const approverQuery = `
      SELECT *
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode = 'KAL_Sert_Bagian'
        AND Appr_No = 1
        AND Appr_ID = :user_id
    `;
    const approverResult = await sequelizeMSQL.query(approverQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });
    const isApprover = approverResult.length > 0;

    // 2# Check current approval status
    const statusQuery = `
      SELECT COUNT(*) AS JumRow
      FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND approver_no = 1
    `;
    const statusResult = await sequelizeMSQL.query(statusQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });
    const jumRow = parseInt(statusResult[0]?.JumRow || 0);

    // Same logic as VBA sb_approve_button:
    // approve enabled: no existing approval and user is approver
    // reject enabled: existing approval and user is approver
    const canApprove = jumRow === 0 && isApprover;
    const canReject = jumRow === 1 && isApprover;

    return res.status(200).json({
      success: true,
      can_approve: canApprove,
      can_reject: canReject,
      is_approver: isApprover,
      approval_count: jumRow,
    });
  } catch (error) {
    console.error('Error in checkApproveButton:', error);
    next(error);
  }
};

/**
 * Check if Tgl Kalibrasi has been saved for a sertifikat
 * Based on VBA fnIsInputTglKalibrasi function
 * Route: GET /sertifikat-bagian/check-tgl-kalibrasi
 */
const checkTglKalibrasi = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = normalizeCertificateQuery(req.query);

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('qa_id and id_no_sertifikat are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const query = `
      SELECT Tgl_kalibrasi
      FROM T_Kalibrasi_Sertifikat_Bagian
      WHERE QA_id = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    const tglKalibrasi = results[0]?.Tgl_kalibrasi;
    const hasInput = tglKalibrasi !== null && tglKalibrasi !== undefined && tglKalibrasi !== '';

    return res.status(200).json({
      success: true,
      has_tgl_kalibrasi: hasInput,
      tgl_kalibrasi: tglKalibrasi || null,
    });
  } catch (error) {
    console.error('Error in checkTglKalibrasi:', error);
    next(error);
  }
};

/**
 * Check if user is allowed to input data
 * Based on VBA fnIsAllowInput function
 * Route: GET /sertifikat-bagian/check-allow-input
 */
const checkAllowInput = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

    const query = `
      SELECT COUNT(*) AS jumRow
      FROM m_approver_lines
      WHERE isActive = 1
        AND Appr_ApplicationCode IN ('KAL_Allow_Input')
        AND Appr_ID = :user_id
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const jumRow = parseInt(results[0]?.jumRow || 0);

    return res.status(200).json({
      success: true,
      allow_input: jumRow > 0,
      count: jumRow,
    });
  } catch (error) {
    console.error('Error in checkAllowInput:', error);
    next(error);
  }
};

/**
 * Get Approver Identity for sertifikat bagian
 * Based on VBA fnApprIdentity function
 * applicationCode is fixed to 'KAL_Sert_Bagian'
 * Route: GET /sertifikat-bagian/approver-identity
 */
const getApproverIdentityBagian = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { approver_id, approver_no } = req.query;

    if (!approver_id || approver_no === undefined) {
      const err = new Error('approver_id and approver_no are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const query = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Sert_Bagian'
        AND Appr_ID = :approver_id
        AND Appr_No = :approver_no
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { approver_id, approver_no },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      appr_identity: results[0]?.Appr_Identity || 0,
    });
  } catch (error) {
    console.error('Error in getApproverIdentityBagian:', error);
    next(error);
  }
};

// ============================================================
// LABEL DATA
// ============================================================

/**
 * Get label terkalibrasi data for a sertifikat
 * Based on VBA PrintLabelTerkalibrasi_Besar / PrintLabelTerkalibrasi_Kecil functions
 * Both functions use the same SELECT query on T_Kalibrasi_Sertifikat_bagian
 * Route: GET /sertifikat-bagian/label-data
 */
const getLabelData = async (req, res, next) => {
  try {
    const { qa_id, id_no_sertifikat } = normalizeCertificateQuery(req.query);

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('qa_id and id_no_sertifikat are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const query = `
      SELECT
        QA_ID,
        Jenis_kalibrasi,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        Tgl_kalibrasi,
        Interval,
        DATEADD(MONTH, Interval, Tgl_kalibrasi) AS kalibrasi_selanjutnya,
        Catatan,
        Print_LabelDate,
        Print_LabelUserID,
        Print_LabelDelegatedTo
      FROM T_Kalibrasi_Sertifikat_bagian
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (results.length === 0) {
      const err = new Error('Data not found');
      err.statusCode = 404;
      res.status(404).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const labelData = results[0];

    // Format kalibrasi_selanjutnya for display (same as VBA: Format(dtNextKalibrasi, "dd/MM/yy"))
    if (labelData.kalibrasi_selanjutnya) {
      labelData.kalibrasi_selanjutnya_formatted = moment(labelData.kalibrasi_selanjutnya)
        .utcOffset(7)
        .format('DD/MM/YY');
    }

    // Format Print_LabelDate if set
    if (labelData.Print_LabelDate) {
      labelData.print_label_date_formatted = moment(labelData.Print_LabelDate)
        .utcOffset(7)
        .format('DD-MMM-YYYY HH:mm:ss');
    } else {
      labelData.print_label_date_formatted = moment().utcOffset(7).format('DD-MMM-YYYY HH:mm:ss');
    }

    return res.status(200).json({
      success: true,
      data: labelData,
    });
  } catch (error) {
    console.error('Error in getLabelData:', error);
    next(error);
  }
};

// ============================================================
// PRINT DATA
// ============================================================

/**
 * Get print data for generating sertifikat document
 * Based on VBA generate_Sert_Thermo function (the SELECT queries)
 * Fetches header data, hasil kalibrasi rows, and approver TTD info
 * Route: GET /sertifikat-bagian/print-data
 */
const getPrintData = async (req, res, next) => {
  try {
    const { qa_id, id_no_sertifikat } = normalizeCertificateQuery(req.query);

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('qa_id and id_no_sertifikat are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // 1# Header data (Section A, B, C bookmarks in VBA template)
    const headerQuery = `
      SELECT
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
        REPLACE(CONVERT(CHAR(11), Tgl_kalibrasi, 106), ' ', '-') AS Tgl_kalibrasi,
        Metode_kalibrasi,
        Suhu_Kelembaban,
        Catatan
      FROM T_Kalibrasi_Sertifikat_Bagian
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;

    // 2# Hasil kalibrasi rows (TBL_01_Loop bookmark)
    const hasilKalQuery = `
      SELECT
        Pembacaan_Alat,
        Pembacaan_standar,
        Error,
        Ketidakpastian
      FROM T_Kalibrasi_Sertifikat_Bagian_Hasil_Kal
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
      ORDER BY Seq_ID
    `;

    // 3# Approver TTD info (ttd_Appr, ttd_Delegated, ttd_Date bookmarks)
    const approverQuery = `
      SELECT
        CASE
          WHEN USER_ID = Delegated_To THEN 'Approved By :' + dbo.fnGetNamaKaryawan(USER_ID)
          ELSE dbo.fnGetNamaKaryawan(Delegated_To)
        END AS apprID,
        CASE
          WHEN USER_ID = Delegated_To THEN ''
          ELSE 'Delegated as ' + dbo.fnGetNamaKaryawan(USER_ID)
        END AS apprDelegated,
        CONVERT(VARCHAR(20), Process_Date, 13) AS apprDate
      FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;

    const [headerResults, hasilKalResults, approverResults] = await Promise.all([
      sequelizeMSQL.query(headerQuery, {
        replacements: { qa_id, id_no_sertifikat },
        type: Sequelize.QueryTypes.SELECT,
      }),
      sequelizeMSQL.query(hasilKalQuery, {
        replacements: { qa_id, id_no_sertifikat },
        type: Sequelize.QueryTypes.SELECT,
      }),
      sequelizeMSQL.query(approverQuery, {
        replacements: { qa_id, id_no_sertifikat },
        type: Sequelize.QueryTypes.SELECT,
      }),
    ]);

    if (headerResults.length === 0) {
      const err = new Error('Sertifikat data not found');
      err.statusCode = 404;
      res.status(404).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const disintegration = await getDisintegrationPrintBundle(qa_id, id_no_sertifikat);

    return res.status(200).json({
      success: true,
      data: {
        header: headerResults[0],
        hasil_kal: formatResultRows(hasilKalResults),
        approver: approverResults[0] || null,
        disintegration,
      },
    });
  } catch (error) {
    console.error('Error in getPrintData:', error);
    next(error);
  }
};

/**
 * Disintegration Tester certificates need 4 separate result sections
 * (Temperature / Kayuhan per menit / Jarak naik-turun paddle / Setting Timer)
 * instead of the generic single Hasil_Kal table every other Bagian module uses.
 * The data is already computed and sitting in disintegration_results /
 * disintegration_timer_readings (same MSSQL DB) — no schema changes needed,
 * this just joins it back by qa_id/id_no_sertifikat for the print page.
 * Returns null when the certificate isn't a Disintegration one.
 */
async function getDisintegrationPrintBundle(qa_id, id_no_sertifikat) {
  const sessionRows = await sequelizeMSQL.query(
    `
      SELECT session_id, paddle_count, keterangan
      FROM disintegration_sessions
      WHERE qa_id = :qa_id
        AND id_no_sertifikat = :id_no_sertifikat
    `,
    { replacements: { qa_id, id_no_sertifikat }, type: Sequelize.QueryTypes.SELECT }
  );

  const session = sessionRows[0];
  if (!session) return null;

  const [resultRows, timerNominalRows] = await Promise.all([
    sequelizeMSQL.query(
      `
        SELECT result_type, point_no, paddle_no, mean_standard, mean_uut, mean_error,
               sd_value, u_combined, u_expanded, u_expanded_min, u_expanded_hour, tolerance, pass_flag
        FROM disintegration_results
        WHERE session_id = :session_id
        ORDER BY result_type, point_no, paddle_no
      `,
      { replacements: { session_id: session.session_id }, type: Sequelize.QueryTypes.SELECT }
    ),
    sequelizeMSQL.query(
      `
        SELECT paddle_no, MIN(nominal_value) AS nominal_value, MIN(unit) AS unit
        FROM disintegration_timer_readings
        WHERE session_id = :session_id
        GROUP BY paddle_no
      `,
      { replacements: { session_id: session.session_id }, type: Sequelize.QueryTypes.SELECT }
    ),
  ]);

  const nominalByPaddle = new Map(timerNominalRows.map((row) => [Number(row.paddle_no), row]));
  const byType = (type) => resultRows.filter((row) => row.result_type === type);

  return {
    paddle_count: Number(session.paddle_count) || 1,
    keterangan: session.keterangan || '',
    temperature: formatResultRows(byType('TEMPERATURE').map((row) => ({
      titik_ukur: row.point_no,
      pembacaan_alat: row.mean_uut,
      pembacaan_standar: row.mean_standard,
      error: row.mean_error,
      ketidakpastian: row.u_expanded,
    }))),
    strokeRate: formatResultRows(byType('STROKE_RATE').map((row) => ({
      paddle_no: row.paddle_no,
      t_1_kayuhan_detik: row.mean_standard,
      kayuhan_per_menit: row.mean_uut,
    }))),
    distance: formatResultRows(byType('DISTANCE').map((row) => ({
      paddle_no: row.paddle_no,
      distance_mm: row.mean_standard,
    }))),
    timer: formatResultRows(byType('TIMER').map((row) => ({
      paddle_no: row.paddle_no,
      setting_alat: nominalByPaddle.get(Number(row.paddle_no))?.nominal_value ?? null,
      setting_unit: nominalByPaddle.get(Number(row.paddle_no))?.unit ?? 'Menit',
      pembacaan_alat_sec: row.mean_uut,
      pembacaan_standar_sec: row.mean_standard,
      error_sec: row.mean_error,
      ketidakpastian_menit: row.u_expanded_min,
      ketidakpastian_detik: row.u_expanded,
    }))),
  };
}

// ============================================================
// SAVE HEADER
// ============================================================

/**
 * Save / update sertifikat header fields
 * VBA equivalent: cmd_Save_Click
 * Route: POST /transactions/kalibrasi/sertifikat-bagian/save
 */
const saveSertifikatBagianHeader = async (req, res, next) => {
  try {
    const { user_id, delegated_to } = req.user;
    const {
      qa_id,
      id_no_sertifikat,
      assm_nama_instrumen,
      assm_no_identitas_kalibrasi,
      assm_merk,
      serial_number,
      assm_kapasitas,
      assm_lokasi,
      nama,
      no_ident_no_batch,
      no_sertifikat,
      tertelusur_melalui,
      rekalibrasi,
      tgl_kalibrasi,
      interval,
      metode_kalibrasi,
      suhu_kelembaban,
      catatan,
    } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // VBA parity: save is blocked if calibration date or interval is empty.
    if (isEmptyValue(tgl_kalibrasi) || isEmptyValue(interval)) {
      const err = new Error('Tanggal Kalibrasi dan interval harus di isi');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Guard: blocked when already approved at level 1 (fn_IS_approve(1) = true)
    const checkApproveQuery = `
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) > 0) {
      const err = new Error('Tidak bisa update sertifikat karena sudah approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    await sequelizeMSQL.query(`
      UPDATE T_Kalibrasi_Sertifikat_Bagian SET
        Assm_nama_instrumen       = :assm_nama_instrumen,
        Assm_No_identitas_kalibrasi = :assm_no_identitas_kalibrasi,
        Assm_Merk                 = :assm_merk,
        SERIAL_NUMBER             = :serial_number,
        Assm_Kapasitas            = :assm_kapasitas,
        Assm_Lokasi               = :assm_lokasi,
        Nama                      = :nama,
        No_Ident_No_batch         = :no_ident_no_batch,
        No_Sertifikat             = :no_sertifikat,
        Tertelusur_melalui        = :tertelusur_melalui,
        Rekalibrasi               = :rekalibrasi,
        Tgl_kalibrasi             = :tgl_kalibrasi,
        Interval                  = :interval,
        Metode_kalibrasi          = :metode_kalibrasi,
        Suhu_Kelembaban           = :suhu_kelembaban,
        Catatan                   = :catatan,
        UserID                    = :user_id,
        Delegated_To              = :delegated_to,
        Process_date              = GETDATE()
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `, {
      replacements: {
        qa_id,
        id_no_sertifikat,
        assm_nama_instrumen: assm_nama_instrumen || '',
        assm_no_identitas_kalibrasi: assm_no_identitas_kalibrasi || '',
        assm_merk: assm_merk || '',
        serial_number: serial_number || '',
        assm_kapasitas: assm_kapasitas || '',
        assm_lokasi: assm_lokasi || '',
        nama: nama || '',
        no_ident_no_batch: no_ident_no_batch || '',
        no_sertifikat: no_sertifikat || '',
        tertelusur_melalui: tertelusur_melalui || '',
        rekalibrasi: rekalibrasi || '',
        tgl_kalibrasi: tgl_kalibrasi || null,
        interval: interval || '',
        metode_kalibrasi: metode_kalibrasi || '',
        suhu_kelembaban: suhu_kelembaban || '',
        catatan: catatan || '',
        user_id,
        delegated_to,
      },
      type: Sequelize.QueryTypes.UPDATE,
    });

    return res.status(200).json({ success: true, message: 'Data has been saved successfully' });
  } catch (error) {
    console.error('Error in saveSertifikatBagianHeader:', error);
    next(error);
  }
};

// ============================================================
// HASIL KALIBRASI (Suhu) CRUD
// ============================================================

/**
 * Save (insert or update) hasil kalibrasi row
 * VBA equivalent: Command3_Click
 * Route: POST /transactions/kalibrasi/sertifikat-bagian/hasil-kal/save
 */
const saveHasilKalData = async (req, res, next) => {
  try {
    const { user_id, delegated_to } = req.user;
    const {
      qa_id,
      id_no_sertifikat,
      seq_id,
      pembacaan_alat,
      pembacaan_standar,
      error,
      ketidakpastian,
    } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    if (
      isEmptyValue(pembacaan_alat)
      || isEmptyValue(pembacaan_standar)
      || isEmptyValue(error)
      || isEmptyValue(ketidakpastian)
    ) {
      const err = new Error('Data harap di isi semua');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const numericRow = {
      pembacaan_alat: parseDotDecimal(pembacaan_alat),
      pembacaan_standar: parseDotDecimal(pembacaan_standar),
      error: parseDotDecimal(error),
      ketidakpastian: parseDotDecimal(ketidakpastian),
    };

    if (Object.values(numericRow).some((value) => value === null)) {
      const err = new Error('Angka desimal harus menggunakan titik dan maksimal 3 angka di belakang desimal');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Guard: blocked when already approved at level 1
    const checkApproveQuery = `
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) > 0) {
      const err = new Error('Tidak bisa update sertifikat karena sudah approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    if (!seq_id) {
      // INSERT new row
      const autoSeqId = await getAutoHasilKalBagianID(qa_id, id_no_sertifikat);

      await sequelizeMSQL.query(`
        INSERT INTO T_Kalibrasi_Sertifikat_Bagian_Hasil_Kal
          (QA_ID, ID_No_Sertifikat, Seq_ID, Pembacaan_Alat, Pembacaan_standar, Error, Ketidakpastian, UserID, Delegated_To, Process_date)
        VALUES
          (:qa_id, :id_no_sertifikat, :seq_id, :pembacaan_alat, :pembacaan_standar, :error, :ketidakpastian, :user_id, :delegated_to, GETDATE())
      `, {
        replacements: {
          qa_id,
          id_no_sertifikat,
          seq_id: autoSeqId,
          ...numericRow,
          user_id,
          delegated_to,
        },
        type: Sequelize.QueryTypes.INSERT,
      });

      return res.status(200).json({ success: true, message: 'Sukses insert data suhu!' });
    } else {
      // UPDATE existing row
      await sequelizeMSQL.query(`
        UPDATE T_Kalibrasi_Sertifikat_Bagian_Hasil_Kal SET
          Pembacaan_Alat    = :pembacaan_alat,
          Pembacaan_standar = :pembacaan_standar,
          Error             = :error,
          Ketidakpastian    = :ketidakpastian,
          UserID            = :user_id,
          Delegated_To      = :delegated_to,
          Process_date      = GETDATE()
        WHERE QA_ID = :qa_id
          AND ID_No_Sertifikat = :id_no_sertifikat
          AND Seq_ID = :seq_id
      `, {
        replacements: {
          qa_id,
          id_no_sertifikat,
          seq_id,
          ...numericRow,
          user_id,
          delegated_to,
        },
        type: Sequelize.QueryTypes.UPDATE,
      });

      return res.status(200).json({ success: true, message: 'Sukses update data suhu!' });
    }
  } catch (error) {
    console.error('Error in saveHasilKalData:', error);
    next(error);
  }
};

/**
 * Delete hasil kalibrasi row
 * VBA equivalent: Command4_Click
 * Route: DELETE /transactions/kalibrasi/sertifikat-bagian/hasil-kal/delete
 */
const deleteHasilKalData = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { qa_id, id_no_sertifikat } = normalizeCertificateQuery(req.query);
    const { seq_id } = req.query;

    if (!qa_id || !id_no_sertifikat || !seq_id) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Guard: blocked when already approved at level 1
    const checkApproveQuery = `
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) > 0) {
      const err = new Error('Tidak bisa update sertifikat karena sudah approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    await sequelizeMSQL.query(`
      DELETE FROM T_Kalibrasi_Sertifikat_Bagian_Hasil_Kal
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Seq_ID = :seq_id
    `, {
      replacements: { qa_id, id_no_sertifikat, seq_id },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({ success: true, message: 'Sukses delete data suhu!' });
  } catch (error) {
    console.error('Error in deleteHasilKalData:', error);
    next(error);
  }
};

// ============================================================
// KELEMBABAN CRUD
// ============================================================

/**
 * Delete kelembaban row
 * VBA equivalent: Command5_Click
 * Route: DELETE /transactions/kalibrasi/sertifikat-bagian/kelembaban/delete
 */
const deleteKelembabanData = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { qa_id, id_no_sertifikat } = normalizeCertificateQuery(req.query);
    const { seq_id } = req.query;

    if (!qa_id || !id_no_sertifikat || !seq_id) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Guard: blocked when already approved at level 1
    const checkApproveQuery = `
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) > 0) {
      const err = new Error('Tidak bisa update sertifikat karena sudah approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    await sequelizeMSQL.query(`
      DELETE FROM T_Kalibrasi_Sertifikat_Bagian_Kelembaban
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Seq_ID = :seq_id
    `, {
      replacements: { qa_id, id_no_sertifikat, seq_id },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({ success: true, message: 'Sukses delete data kelembaban!' });
  } catch (error) {
    console.error('Error in deleteKelembabanData:', error);
    next(error);
  }
};

// ============================================================
// APPROVE / REJECT
// ============================================================

/**
 * Approve Sertifikat Bagian (Level 1)
 * VBA equivalent: cmd_Approve_Click
 * Route: POST /transactions/kalibrasi/sertifikat-bagian/approve
 */
const approveSertifikatBagian = async (req, res, next) => {
  try {
    const { user_id, delegated_to } = req.user;
    const { qa_id, id_no_sertifikat } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Guard: fnIsInputTglKalibrasi — tgl_kalibrasi and interval must be filled
    const tglQuery = `
      SELECT Tgl_kalibrasi, Interval
      FROM T_Kalibrasi_Sertifikat_Bagian
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;
    const tglResults = await sequelizeMSQL.query(tglQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (tglResults.length === 0 || !tglResults[0].Tgl_kalibrasi) {
      const err = new Error('Belum simpan tanggal kalibrasi, save tanggal');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    if (!tglResults[0].Interval) {
      const err = new Error('Harap isi interval');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Guard: must NOT already be approved at level 1
    const checkApproveQuery = `
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) > 0) {
      const err = new Error('Tidak bisa update sertifikat karena sudah approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Get approver identity (fnApprIdentity — KAL_Sert_Bagian, level 1)
    const identityResults = await sequelizeMSQL.query(`
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Sert_Bagian'
        AND Appr_ID = :user_id
        AND Appr_No = 1
    `, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });
    const apprIdentity = identityResults.length > 0 ? identityResults[0].Appr_Identity : 0;

    // Insert approval record
    await sequelizeMSQL.query(`
      INSERT INTO T_Kalibrasi_Sertifikat_Bagian_Status
        (QA_ID, ID_No_Sertifikat, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, flag_update)
      VALUES
        (:qa_id, :id_no_sertifikat, 1, 0, :appr_identity, GETDATE(), :user_id, :delegated_to, NULL)
    `, {
      replacements: { qa_id, id_no_sertifikat, appr_identity: apprIdentity, user_id, delegated_to },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(200).json({ success: true, message: 'Data has been approved successfully' });
  } catch (error) {
    console.error('Error in approveSertifikatBagian:', error);
    next(error);
  }
};

/**
 * Reject Sertifikat Bagian (delete all approval status records)
 * VBA equivalent: cmd_reject_Click
 * Route: POST /transactions/kalibrasi/sertifikat-bagian/reject
 */
const rejectSertifikatBagian = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { qa_id, id_no_sertifikat } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Guard: must already be approved at level 1 to allow reject
    const checkApproveQuery = `
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) === 0) {
      const err = new Error('Tidak bisa reject, data belum approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Delete ALL status records for this QA_ID + ID_No_Sertifikat
    await sequelizeMSQL.query(`
      DELETE FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({ success: true, message: 'Data has been rejected successfully' });
  } catch (error) {
    console.error('Error in rejectSertifikatBagian:', error);
    next(error);
  }
};

// ============================================================
// GENERATE DA
// ============================================================

/**
 * Generate DA from Sertifikat Bagian
 * VBA equivalent: cmd_Generate_DA_Click
 * Route: POST /transactions/kalibrasi/sertifikat-bagian/generate-da
 */
const generateDASertifikatBagian = async (req, res, next) => {
  try {
    const { user_id, delegated_to } = req.user;
    const { qa_id, id_no_sertifikat } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Guard: must be approved at level 1
    const checkApprove1Query = `
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approve1Results = await sequelizeMSQL.query(checkApprove1Query, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approve1Results[0]?.jumRow || 0) === 0) {
      const err = new Error('Tidak bisa generate DA karena belum approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Guard: must NOT already have generated DA (level 2)
    const checkApprove2Query = `
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 2
    `;
    const approve2Results = await sequelizeMSQL.query(checkApprove2Query, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approve2Results[0]?.jumRow || 0) > 0) {
      const err = new Error('Sudah generate DA!');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Guard: interval must not be zero
    const intervalResults = await sequelizeMSQL.query(`
      SELECT Interval
      FROM T_Kalibrasi_Sertifikat_Bagian
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (!intervalResults[0]?.Interval || intervalResults[0].Interval == 0) {
      const err = new Error('Interval tidak boleh nol');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if DA record already exists for this QA_ID
    const checkDAResults = await sequelizeMSQL.query(`
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_DA_Bagian
      WHERE QA_ID LIKE :qa_id
    `, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    // Get approver identity (fnApprIdentity — KAL_Sert_Bagian, level 2)
    const identityResults = await sequelizeMSQL.query(`
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Sert_Bagian'
        AND Appr_ID = :user_id
        AND Appr_No = 2
    `, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });
    const apprIdentity = identityResults.length > 0 ? identityResults[0].Appr_Identity : 0;

    await sequelizeMSQL.transaction(async (transaction) => {
      if ((checkDAResults[0]?.jumRow || 0) === 0) {
        // INSERT new DA record from sertifikat
        await sequelizeMSQL.query(`
          INSERT INTO T_Kalibrasi_DA_Bagian
            (QA_ID, Jenis_kalibrasi, Parameter_Sertifikasi, Assm_nama_instrumen, Assm_No_identitas_Istrumen,
             Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi,
             Tgl_kalibrasi, Parameter_Interval, Kalibrasi_selanjutnya, Catatan, UserID, Delegated_To, Process_date)
          SELECT
            QA_ID, Jenis_kalibrasi, Parameter_Sertifikasi, Assm_nama_instrumen, Assm_No_identitas_Istrumen,
            Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi,
            Tgl_kalibrasi, Interval, DATEADD(MONTH, Interval, Tgl_kalibrasi) AS kalibrasi_selanjutnya,
            Catatan, :user_id AS UserID, :delegated_to AS Delegated_To, GETDATE() AS Process_date
          FROM T_Kalibrasi_Sertifikat_Bagian
          WHERE QA_ID = :qa_id
            AND ID_No_Sertifikat = :id_no_sertifikat
        `, {
          replacements: { qa_id, id_no_sertifikat, user_id, delegated_to },
          type: Sequelize.QueryTypes.INSERT,
          transaction,
        });
      } else {
        // UPDATE existing DA record from sertifikat
        await sequelizeMSQL.query(`
          UPDATE T_Kalibrasi_DA_Bagian
          SET
            Assm_nama_instrumen          = A.Assm_nama_instrumen,
            Jenis_kalibrasi              = A.Jenis_kalibrasi,
            Parameter_Sertifikasi        = A.Parameter_Sertifikasi,
            Assm_No_identitas_Istrumen   = A.Assm_No_identitas_Istrumen,
            Assm_No_identitas_kalibrasi  = A.Assm_No_identitas_kalibrasi,
            Group_Da_Dept                = A.Group_Da_Dept,
            Assm_Kapasitas               = A.Assm_Kapasitas,
            Parameter_Kalibrasi          = A.Parameter_Kalibrasi,
            Assm_Lokasi                  = A.Assm_Lokasi,
            Tgl_kalibrasi                = A.Tgl_kalibrasi,
            Parameter_Interval           = A.Interval,
            Kalibrasi_selanjutnya        = DATEADD(MONTH, A.Interval, A.Tgl_kalibrasi),
            Catatan                      = A.Catatan,
            UserID                       = 'ASN',
            Delegated_To                 = 'ASN',
            Process_date                 = GETDATE()
          FROM T_Kalibrasi_Sertifikat_Bagian AS A
          LEFT JOIN T_Kalibrasi_DA_Bagian AS B ON A.QA_ID = B.QA_ID
          WHERE A.QA_ID = :qa_id
            AND A.ID_No_Sertifikat = :id_no_sertifikat
        `, {
          replacements: { qa_id, id_no_sertifikat },
          type: Sequelize.QueryTypes.UPDATE,
          transaction,
        });

        // Delete old DA status
        await sequelizeMSQL.query(`
          DELETE FROM T_Kalibrasi_DA_Bagian_status
          WHERE QA_ID = :qa_id
        `, {
          replacements: { qa_id },
          type: Sequelize.QueryTypes.DELETE,
          transaction,
        });
      }

      // Insert status level 2 (Generate DA marker)
      await sequelizeMSQL.query(`
        INSERT INTO T_Kalibrasi_Sertifikat_Bagian_Status
          (QA_ID, ID_No_Sertifikat, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, flag_update)
        VALUES
          (:qa_id, :id_no_sertifikat, 2, 0, :appr_identity, GETDATE(), :user_id, :delegated_to, NULL)
      `, {
        replacements: { qa_id, id_no_sertifikat, appr_identity: apprIdentity, user_id, delegated_to },
        type: Sequelize.QueryTypes.INSERT,
        transaction,
      });
    });

    return res.status(200).json({ success: true, message: `Sukses Generate DA No: ${qa_id}` });
  } catch (error) {
    console.error('Error in generateDASertifikatBagian:', error);
    next(error);
  }
};

// ============================================================
// CREATE NEW SERTIFIKAT & RE-SERTIFIKASI
// ============================================================

/**
 * Create new sertifikat bagian from DA Bagian
 * VBA equivalent: cmd_New_Click
 * Route: POST /transactions/kalibrasi/sertifikat-bagian/create-new
 */
const createNewSertifikatBagian = async (req, res, next) => {
  try {
    const { user_id, delegated_to } = req.user;
    const { qa_id, parameter_sertifikasi } = req.body;

    if (!qa_id || !parameter_sertifikasi) {
      const err = new Error('QA_ID dan parameter_sertifikasi wajib diisi');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Get new certificate number based on parameter_sertifikasi
    let fnQuery;
    if (parameter_sertifikasi === 'Tekanan') {
      fnQuery = `SELECT dbo.fnGetKal_Ser_P_No_ID() AS noSertifikat`;
    } else if (parameter_sertifikasi === 'Timer') {
      fnQuery = `SELECT dbo.fnGetKal_Ser_R_No_ID() AS noSertifikat`;
    } else if (parameter_sertifikasi === 'Temperatur') {
      fnQuery = `SELECT dbo.fnGetKal_Ser_T_No_ID() AS noSertifikat`;
    } else {
      const err = new Error('Tidak ada kategori Re-Sertifikasi untuk parameter ini');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const noResults = await sequelizeMSQL.query(fnQuery, { type: Sequelize.QueryTypes.SELECT });
    const sNoSertifikat = noResults[0]?.noSertifikat;

    if (!sNoSertifikat) {
      const err = new Error('Gagal generate nomor sertifikat baru');
      err.statusCode = 500;
      res.status(500).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Insert new sertifikat from DA Bagian
    await sequelizeMSQL.query(`
      INSERT INTO T_Kalibrasi_Sertifikat_Bagian
        (QA_ID, ID_No_sertifikat, Jenis_kalibrasi, parameter_sertifikasi, isSert_Manual, Tgl,
         Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk,
         Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi, UserID, Delegated_To, Process_date)
      SELECT
        QA_ID, :sNoSertifikat AS ID_No_sertifikat, Jenis_kalibrasi, parameter_sertifikasi, 1,
        GETDATE() AS Tgl,
        Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi,
        '' AS Assm_Merk,
        Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi,
        :user_id AS UserID, :delegated_to AS Delegated_To, GETDATE() AS Process_date
      FROM T_Kalibrasi_DA_Bagian
      WHERE QA_ID = :qa_id
    `, {
      replacements: { qa_id, sNoSertifikat, user_id, delegated_to },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(200).json({
      success: true,
      message: `Sukses buat sertifikat baru dengan nomor: ${sNoSertifikat}`,
      data: { qa_id, id_no_sertifikat: sNoSertifikat },
    });
  } catch (error) {
    console.error('Error in createNewSertifikatBagian:', error);
    next(error);
  }
};

/**
 * Re-Sertifikasi Bagian — copy existing certificate to a new number
 * VBA equivalent: cmd_ReSertifikasi_Click
 * Route: POST /transactions/kalibrasi/sertifikat-bagian/resertifikasi
 */
const resertifikasiBagian = async (req, res, next) => {
  try {
    const { user_id, delegated_to } = req.user;
    const { qa_id, id_no_sertifikat } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('QA_ID dan ID_No_Sertifikat wajib diisi');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Guard: must be approved at level 1
    const checkApproveResults = await sequelizeMSQL.query(`
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_Sertifikat_Bagian_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((checkApproveResults[0]?.jumRow || 0) === 0) {
      const err = new Error('Tidak bisa Re-Sertifikat karena belum approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Determine auto-number function from first char of id_no_sertifikat (P/R/T)
    const sType = id_no_sertifikat.charAt(0).toUpperCase();
    let fnQuery;
    if (sType === 'P') {
      fnQuery = `SELECT dbo.fnGetKal_Ser_P_No_ID() AS AutoNum`;
    } else if (sType === 'R') {
      fnQuery = `SELECT dbo.fnGetKal_Ser_R_No_ID() AS AutoNum`;
    } else if (sType === 'T') {
      fnQuery = `SELECT dbo.fnGetKal_Ser_T_No_ID() AS AutoNum`;
    } else {
      const err = new Error('Tidak ada kategori Re-Sertifikasi');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const noResults = await sequelizeMSQL.query(fnQuery, { type: Sequelize.QueryTypes.SELECT });
    const autoIDNoSertifikat = noResults[0]?.AutoNum;

    if (!autoIDNoSertifikat) {
      const err = new Error('Gagal generate nomor sertifikat baru');
      err.statusCode = 500;
      res.status(500).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const replacements = { auto_id: autoIDNoSertifikat, qa_id, id_no_sertifikat, user_id, delegated_to };

    await sequelizeMSQL.transaction(async (transaction) => {
      // 1# Insert header
      await sequelizeMSQL.query(`
        INSERT INTO T_Kalibrasi_Sertifikat_Bagian
          (QA_ID, ID_No_Sertifikat, Jenis_kalibrasi, tgl,
           Assm_nama_instrumen, Assm_No_identitas_kalibrasi, Assm_Merk, SERIAL_NUMBER,
           Assm_Kapasitas, Assm_Lokasi, Nama, No_Ident_No_batch, No_Sertifikat,
           Tertelusur_melalui, Rekalibrasi, Tgl_kalibrasi, Interval, Metode_kalibrasi,
           Suhu_Kelembaban, Catatan, UserID, Delegated_To, Process_date)
        SELECT
          QA_ID, :auto_id AS ID_No_Sertifikat, Jenis_kalibrasi, GETDATE() AS tgl,
          Assm_nama_instrumen, Assm_No_identitas_kalibrasi, Assm_Merk, SERIAL_NUMBER,
          Assm_Kapasitas, Assm_Lokasi, Nama, No_Ident_No_batch, No_Sertifikat,
          Tertelusur_melalui, Rekalibrasi, Tgl_kalibrasi, Interval, Metode_kalibrasi,
          Suhu_Kelembaban, Catatan,
          :user_id AS UserID, :delegated_to AS Delegated_To, GETDATE() AS Process_date
        FROM T_Kalibrasi_Sertifikat_Bagian
        WHERE QA_ID = :qa_id
          AND ID_No_Sertifikat = :id_no_sertifikat
      `, { replacements, type: Sequelize.QueryTypes.INSERT, transaction });

      // 2# Insert hasil kalibrasi detail
      await sequelizeMSQL.query(`
        INSERT INTO T_Kalibrasi_Sertifikat_Bagian_Hasil_Kal
          (QA_ID, ID_No_Sertifikat, Seq_ID, Pembacaan_Alat, Pembacaan_standar, Error, Ketidakpastian,
           UserID, Delegated_To, Process_date)
        SELECT
          QA_ID, :auto_id AS ID_No_Sertifikat, Seq_ID, Pembacaan_Alat, Pembacaan_standar, Error, Ketidakpastian,
          :user_id AS UserID, :delegated_to AS Delegated_To, GETDATE() AS Process_date
        FROM T_Kalibrasi_Sertifikat_Bagian_Hasil_Kal
        WHERE QA_ID = :qa_id
          AND ID_No_Sertifikat = :id_no_sertifikat
      `, { replacements, type: Sequelize.QueryTypes.INSERT, transaction });
    });

    return res.status(200).json({
      success: true,
      message: `Sukses Re-Sertifikasi dengan nomor: ${autoIDNoSertifikat}`,
      data: {
        qa_id,
        old_id_no_sertifikat: id_no_sertifikat,
        new_id_no_sertifikat: autoIDNoSertifikat,
      },
    });
  } catch (error) {
    console.error('Error in resertifikasiBagian:', error);
    next(error);
  }
};

// ============================================================
// PRINT LABEL TERKALIBRASI
// ============================================================

/**
 * Print label terkalibrasi — update print date only if not yet printed
 * VBA equivalent: PrintLabelTerkalibrasi_Besar / PrintLabelTerkalibrasi_Kecil
 * Route: POST /transactions/kalibrasi/sertifikat-bagian/print-label
 */
const printLabelTerkalibrasi = async (req, res, next) => {
  try {
    const { user_id, delegated_to } = req.user;
    const { qa_id, id_no_sertifikat } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Read current label state
    const dataResults = await sequelizeMSQL.query(`
      SELECT
        QA_ID,
        Assm_No_identitas_kalibrasi,
        Tgl_kalibrasi,
        Interval,
        DATEADD(MONTH, Interval, Tgl_kalibrasi) AS kalibrasi_selanjutnya,
        Print_LabelDate,
        Print_LabelUserID,
        Print_LabelDelegatedTo
      FROM T_Kalibrasi_Sertifikat_bagian
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (dataResults.length === 0) {
      const err = new Error('Label Terkalibrasi tidak dapat di cetak! Data Sertifikat Kalibrasi belum tersedia');
      err.statusCode = 404;
      res.status(404).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const row = dataResults[0];
    let labelPrintDate = row.Print_LabelDate;
    let labelParafBy = row.Print_LabelDelegatedTo;

    // Update print date only on first print (Print_LabelDate IS NULL)
    if (!labelPrintDate) {
      labelPrintDate = moment().utcOffset(7).format('YYYY-MM-DD HH:mm:ss');
      labelParafBy = delegated_to;

      await sequelizeMSQL.query(`
        UPDATE T_Kalibrasi_Sertifikat_bagian SET
          Print_labeldate        = :print_labeldate,
          Print_LabelUserID      = :print_label_user_id,
          Print_LabelDelegatedTo = :print_label_delegated_to
        WHERE QA_ID = :qa_id
          AND ID_No_Sertifikat = :id_no_sertifikat
      `, {
        replacements: {
          print_labeldate: labelPrintDate,
          print_label_user_id: user_id,
          print_label_delegated_to: delegated_to,
          qa_id,
          id_no_sertifikat,
        },
        type: Sequelize.QueryTypes.UPDATE,
      });
    } else {
      labelPrintDate = moment.utc(labelPrintDate).format('DD-MMM-YYYY HH:mm:ss');
    }

    const parafNama = await getEmployeeName(labelParafBy);

    return res.status(200).json({
      success: true,
      message: 'Label data retrieved successfully',
      data: {
        qa_id,
        id_no_sertifikat,
        no_id: row.Assm_No_identitas_kalibrasi,
        kalibrasi_selanjutnya: row.kalibrasi_selanjutnya
          ? moment.utc(row.kalibrasi_selanjutnya).format('DD/MM/YY')
          : '',
        paraf_by: `${parafNama}`,
        print_label_date: labelPrintDate,
      },
    });
  } catch (error) {
    console.error('Error in printLabelTerkalibrasi:', error);
    next(error);
  }
};

module.exports = {
  searchSertifikatBagian,
  searchByQAID,
  getSertifikatBagianDetail,
  getHasilKalData,
  getWorkbookPrintData,
  searchDABagian,
  searchResertifikasiBagian,
  checkIsApproved,
  checkApproveButton,
  checkTglKalibrasi,
  checkAllowInput,
  getApproverIdentityBagian,
  getLabelData,
  getPrintData,
  // POST / mutation
  saveSertifikatBagianHeader,
  saveHasilKalData,
  deleteHasilKalData,
  deleteKelembabanData,
  approveSertifikatBagian,
  rejectSertifikatBagian,
  generateDASertifikatBagian,
  createNewSertifikatBagian,
  resertifikasiBagian,
  printLabelTerkalibrasi,
};
