'use strict';

const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');
const {
  assertWorkbookApproval,
  getActorApprovalRole,
  resolveTargetApprovalRole,
} = require('../../services/calibrationWorkbookApproval.service');
const {
  finalizeManagerCalibrationApproval,
} = require('../../services/calibrationManagerFinalization.service');
const {
  normalizeCalculationNumbers,
  parseDotDecimal,
} = require('../../helpers/calibration-number-format.helper');

const SESSION_TABLE = 'dbo.T_Kalibrasi_Thermohygro_Workbook_Session';

function normalizeSearch(search) {
  const text = String(search || '').trim();
  return text && text !== '%' ? `%${text}%` : '%';
}

function formatDate(value, format = 'DD-MMM-YYYY') {
  if (!value) return '';
  return moment(value).format(format);
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function sessionTableExists() {
  const result = await sequelizeMSQL.query(
    `SELECT OBJECT_ID(:tableName, 'U') AS object_id`,
    {
      replacements: { tableName: SESSION_TABLE },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  return Boolean(result[0]?.object_id);
}

async function getPermissionState({ qaId, idNoSertifikat, userId }) {
  const allowInputQuery = `
    SELECT COUNT(*) AS jumRow
    FROM m_approver_lines
    WHERE isActive = 1
      AND Appr_ApplicationCode IN ('KAL_Allow_Input')
      AND Appr_ID = :userId
  `;

  const [allowInputResult] = await sequelizeMSQL.query(allowInputQuery, {
    replacements: { userId },
    type: Sequelize.QueryTypes.SELECT,
  });

  const approvalQuery = `
    SELECT
      Approver_No,
      isReject,
      Approver_Identity,
      User_ID,
      Delegated_To,
      Process_Date
    FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
    WHERE QA_ID = :qaId
      AND ID_No_Sertifikat = :idNoSertifikat
  `;

  const approvalRows = await sequelizeMSQL.query(approvalQuery, {
    replacements: { qaId, idNoSertifikat },
    type: Sequelize.QueryTypes.SELECT,
  });

  const approverQuery = `
    SELECT COUNT(*) AS jumRow
    FROM m_approver_lines
    WHERE isActive = 1
      AND Appr_ApplicationCode LIKE 'KAL_Sert_Thermo'
      AND Appr_No = 1
      AND Appr_ID = :userId
  `;

  const [approverResult] = await sequelizeMSQL.query(approverQuery, {
    replacements: { userId },
    type: Sequelize.QueryTypes.SELECT,
  });

  const level1Approval = approvalRows.find(
    (row) => Number(row.Approver_No) === 1
  );
  const level2Approval = approvalRows.find(
    (row) => Number(row.Approver_No) === 2
  );
  const allowInput = Number(allowInputResult?.jumRow || 0) > 0;
  const isApprover = Number(approverResult?.jumRow || 0) > 0;
  const isApproved = Boolean(level1Approval);

  return {
    allowInput,
    isApproved,
    isApprover,
    canEdit: allowInput && !isApproved,
    canApprove: isApprover && !isApproved,
    canReject: isApprover && isApproved,
    canSaveSession: allowInput && !isApproved,
    canRecalculate: true,
    level1Approval: level1Approval || null,
    level2Approval: level2Approval || null,
  };
}

function formatCertificateRow(row) {
  return {
    ...row,
    tgl: formatDate(row.tgl, 'DD-MMM-YYYY HH:mm:ss'),
    Tgl_kalibrasi: formatDate(row.Tgl_kalibrasi),
    ApproveDate: formatDate(row.ApproveDate, 'DD-MMM-YYYY HH:mm:ss'),
    Generate_DA_Date: formatDate(row.Generate_DA_Date, 'DD-MMM-YYYY HH:mm:ss'),
  };
}

async function getLatestSession(qaId, idNoSertifikat) {
  if (!(await sessionTableExists())) return null;

  const rows = await sequelizeMSQL.query(
    `
      SELECT TOP 1
        Session_ID,
        QA_ID,
        ID_No_Sertifikat,
        Include_RH,
        Suhu_Repeat_Count,
        RH_Repeat_Count,
        Suhu_Unit,
        RH_Unit,
        Suhu_Coefficient_Mode,
        RH_Coefficient_Mode,
        Evaluation_Result,
        Status,
        ApprovedByAdmin,
        ApprovedByAdminDate,
        ApprovedByOfficer,
        ApprovedByOfficerDate,
        ApprovedByManager,
        ApprovedByManagerDate,
        UserID,
        Delegated_To,
        Process_Date,
        Update_Date
      FROM ${SESSION_TABLE}
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
      ORDER BY ISNULL(Update_Date, Process_Date) DESC, Session_ID DESC
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  return rows[0] || null;
}

async function fetchWorkbookHeaderData(qaId, idNoSertifikat, userId) {
  const rows = await sequelizeMSQL.query(
    `
      SELECT TOP 1
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
        Catatan,
        isSert_Manual
      FROM T_Kalibrasi_Sertifikat_Thermohygro
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  if (!rows.length) return null;

  const permissions = await getPermissionState({
    qaId,
    idNoSertifikat,
    userId,
  });
  const latestSession = await getLatestSession(qaId, idNoSertifikat);

  return {
    header: formatCertificateRow(rows[0]),
    permissions,
    latestSession,
  };
}

function pickValue(source, ...keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined) return source[key];
  }
  return undefined;
}

function textValue(value) {
  return value === undefined || value === null ? '' : String(value);
}

function parseNumberValue(value) {
  return parseDotDecimal(value);
}

function certificateCellValue(value) {
  const parsedValue = parseNumberValue(value);
  if (Number.isFinite(parsedValue)) return parsedValue;
  return textValue(value).trim();
}

function formatThermoCertificateNumber(value, { prefix = '', unit = '' } = {}) {
  const parsedValue = parseNumberValue(value);
  if (!Number.isFinite(parsedValue)) return textValue(value);

  const absoluteText = Math.abs(parsedValue).toFixed(3);
  let signPrefix = '';

  if (prefix === '+') {
    signPrefix = parsedValue > 0 ? '+' : parsedValue < 0 ? '-' : '';
  } else if (prefix === '\u00B1') {
    signPrefix = '\u00B1';
  } else {
    signPrefix = parsedValue < 0 ? '-' : prefix;
  }

  return `${signPrefix}${absoluteText}${unit ? ` ${unit}` : ''}`;
}

function parseCalibrationDate(value) {
  if (!value) return null;
  const parsed = moment(
    value,
    ['YYYY-MM-DD', 'DD-MMM-YYYY', 'DD-MMM-YYYY HH:mm:ss', moment.ISO_8601],
    true
  );

  if (parsed.isValid()) return parsed;

  const fallback = moment(value);
  return fallback.isValid() ? fallback : null;
}

function normalizeHeaderPayload(body) {
  const source = { ...(body || {}), ...(body?.header || {}) };

  return {
    qaId: pickValue(source, 'qa_id', 'qaId', 'QA_ID'),
    idNoSertifikat: pickValue(
      source,
      'id_no_sertifikat',
      'idNoSertifikat',
      'ID_No_Sertifikat'
    ),
    assmNamaInstrumen: pickValue(
      source,
      'assm_nama_instrumen',
      'Assm_nama_instrumen'
    ),
    assmNoIdentitasKalibrasi: pickValue(
      source,
      'assm_no_identitas_kalibrasi',
      'Assm_No_identitas_kalibrasi'
    ),
    assmMerk: pickValue(source, 'assm_merk', 'Assm_Merk'),
    serialNumber: pickValue(source, 'serial_number', 'SERIAL_NUMBER'),
    assmKapasitas: pickValue(source, 'assm_kapasitas', 'Assm_Kapasitas'),
    assmLokasi: pickValue(source, 'assm_lokasi', 'Assm_Lokasi'),
    nama: pickValue(source, 'nama', 'Nama'),
    noIdentNoBatch: pickValue(source, 'no_ident_no_batch', 'No_Ident_No_batch'),
    noSertifikat: pickValue(source, 'no_sertifikat', 'No_Sertifikat'),
    tertelusurMelalui: pickValue(
      source,
      'tertelusur_melalui',
      'Tertelusur_melalui'
    ),
    rekalibrasi: pickValue(source, 'rekalibrasi', 'Rekalibrasi'),
    tglKalibrasi: pickValue(source, 'tgl_kalibrasi', 'Tgl_kalibrasi'),
    interval: pickValue(source, 'interval', 'Interval'),
    metodeKalibrasi: pickValue(source, 'metode_kalibrasi', 'Metode_kalibrasi'),
    suhuKelembaban: pickValue(source, 'suhu_kelembaban', 'Suhu_Kelembaban'),
    catatan: pickValue(source, 'catatan', 'Catatan'),
  };
}

function normalizeRepeatCount(value, fallback = 3) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(12, Math.max(1, Math.trunc(number)));
}

function normalizeMode(value) {
  return value === 'per-row' ? 'per-row' : 'global';
}

function normalizeStatus(value, hasResult) {
  const status = textValue(value || (hasResult ? 'CALCULATED' : 'DRAFT'))
    .trim()
    .toUpperCase();
  return (status || 'DRAFT').slice(0, 20);
}

function normalizeEvaluationResult(value) {
  const text = textValue(value).trim();
  const allowed = [
    'Layak digunakan',
    'Tidak layak digunakan',
    'Penggunaan faktor koreksi',
  ];
  return allowed.includes(text) ? text : '';
}

const APPROVAL_ROLES = {
  admin: {
    key: 'admin',
    label: 'Admin',
    column: 'ApprovedByAdmin',
    dateColumn: 'ApprovedByAdminDate',
    status: 'APPROVED_ADMIN',
    rank: 1,
  },
  officer: {
    key: 'officer',
    label: 'Officer/Supervisor',
    column: 'ApprovedByOfficer',
    dateColumn: 'ApprovedByOfficerDate',
    status: 'APPROVED_OFFICER',
    rank: 2,
  },
  manager: {
    key: 'manager',
    label: 'Manager',
    column: 'ApprovedByManager',
    dateColumn: 'ApprovedByManagerDate',
    status: 'APPROVED',
    rank: 3,
  },
};

function getWorkbookApprovalRole(req) {
  const jobLevel = Number(
    req?.user?.joblevel_id_user ??
      req?.body?.job_level_id ??
      req?.body?.jobLevelId ??
      req?.body?.Job_LevelID
  );

  if (jobLevel > 6) return APPROVAL_ROLES.admin;
  if (jobLevel === 5 || jobLevel === 6) return APPROVAL_ROLES.officer;
  if (jobLevel === 3) return APPROVAL_ROLES.manager;

  return null;
}

function getPendingRole(session) {
  if (!session?.ApprovedByAdmin) return APPROVAL_ROLES.admin;
  if (!session?.ApprovedByOfficer) return APPROVAL_ROLES.officer;
  if (!session?.ApprovedByManager) return APPROVAL_ROLES.manager;
  return null;
}

function canApproveRole(userRole, pendingRole) {
  if (!userRole || !pendingRole) return false;
  return userRole.rank >= pendingRole.rank;
}

function assertWorkbookApprovalOrder(session, role, jobLevel) {
  if (!role) {
    return `User tidak memiliki role approval workbook (job level terdeteksi: ${jobLevel || '-'}).`;
  }

  if (!session?.calculationResult) {
    return 'Lakukan perhitungan dan simpan workbook terlebih dahulu';
  }

  const pending = getPendingRole(session);
  if (!pending) return 'Workbook sudah fully approved';

  if (!canApproveRole(role, pending)) {
    return `Role ${role.label} tidak bisa melakukan approval ${pending.label}`;
  }

  return '';
}

function buildThermoResultRows(channelResult = {}) {
  const points = Array.isArray(channelResult?.points) ? channelResult.points : [];
  return points.map((point, index) => ({
    seqId: index + 1,
    pembacaanAlat: certificateCellValue(point.uutAverage),
    pembacaanStandar: certificateCellValue(point.actualStd),
    error: certificateCellValue(point.error),
    ketidakpastian: certificateCellValue(point.u95),
  }));
}

async function getNextThermoCertificateNumber(transaction) {
  const rows = await sequelizeMSQL.query(
    'SELECT dbo.fnGetKal_Ser_L_No_ID() as ID_No_sertifikat',
    {
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );
  return rows[0]?.ID_No_sertifikat || '';
}

async function thermoCertificateHeaderExists(qaId, idNoSertifikat, transaction) {
  const rows = await sequelizeMSQL.query(
    `
      SELECT TOP 1 QA_ID, ID_No_Sertifikat
      FROM T_Kalibrasi_Sertifikat_Thermohygro
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );
  return Boolean(rows.length);
}

async function ensureThermoCertificateHeader({ qaId, idNoSertifikat, userId, delegatedTo, transaction }) {
  if (await thermoCertificateHeaderExists(qaId, idNoSertifikat, transaction)) return true;

  await sequelizeMSQL.query(
    `
      INSERT INTO T_Kalibrasi_Sertifikat_Thermohygro
      (
        QA_ID,
        ID_no_sertifikat,
        Jenis_kalibrasi,
        isSert_manual,
        tgl,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        Tgl_kalibrasi,
        Interval,
        Catatan,
        UserID,
        Delegated_To,
        Process_date
      )
      SELECT
        QA_ID,
        :idNoSertifikat AS ID_no_sertifikat,
        Jenis_kalibrasi,
        1 AS isSert_manual,
        GETDATE() AS Tgl,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        Tgl_kalibrasi,
        Parameter_Interval,
        Catatan,
        :userId AS UserID,
        :delegatedTo AS Delegated_To,
        GETDATE() AS Process_date
      FROM T_Kalibrasi_DA_Thermohygro
      WHERE QA_ID = :qaId
    `,
    {
      replacements: { qaId, idNoSertifikat, userId, delegatedTo },
      type: Sequelize.QueryTypes.INSERT,
      transaction,
    }
  );

  return thermoCertificateHeaderExists(qaId, idNoSertifikat, transaction);
}

async function updateThermoCertificateHeader({ qaId, idNoSertifikat, header, userId, delegatedTo, transaction }) {
  const normalized = normalizeHeaderPayload({
    ...header,
    QA_ID: qaId,
    ID_No_Sertifikat: idNoSertifikat,
  });
  const parsedDate = parseCalibrationDate(normalized.tglKalibrasi);
  const sqlDate = parsedDate ? parsedDate.utcOffset(7).format('YYYY-MM-DD') : null;

  await sequelizeMSQL.query(
    `
      UPDATE T_Kalibrasi_Sertifikat_Thermohygro
      SET
        Assm_nama_instrumen = COALESCE(NULLIF(:assm_nama_instrumen, ''), Assm_nama_instrumen),
        Assm_No_identitas_kalibrasi = COALESCE(NULLIF(:assm_no_identitas_kalibrasi, ''), Assm_No_identitas_kalibrasi),
        Assm_Merk = COALESCE(NULLIF(:assm_merk, ''), Assm_Merk),
        SERIAL_NUMBER = COALESCE(NULLIF(:serial_number, ''), SERIAL_NUMBER),
        Assm_Kapasitas = COALESCE(NULLIF(:assm_kapasitas, ''), Assm_Kapasitas),
        Assm_Lokasi = COALESCE(NULLIF(:assm_lokasi, ''), Assm_Lokasi),
        Nama = COALESCE(NULLIF(:nama, ''), Nama),
        No_Ident_No_batch = COALESCE(NULLIF(:no_ident_no_batch, ''), No_Ident_No_batch),
        No_Sertifikat = COALESCE(NULLIF(:no_sertifikat, ''), No_Sertifikat),
        Tertelusur_melalui = COALESCE(NULLIF(:tertelusur_melalui, ''), Tertelusur_melalui),
        Rekalibrasi = COALESCE(NULLIF(:rekalibrasi, ''), Rekalibrasi),
        Tgl_kalibrasi = COALESCE(:tgl_kalibrasi, Tgl_kalibrasi),
        Interval = COALESCE(NULLIF(:interval, ''), Interval),
        Metode_kalibrasi = COALESCE(NULLIF(:metode_kalibrasi, ''), Metode_kalibrasi),
        Suhu_Kelembaban = COALESCE(NULLIF(:suhu_kelembaban, ''), Suhu_Kelembaban),
        Catatan = COALESCE(NULLIF(:catatan, ''), Catatan),
        UserID = :user_id,
        Delegated_To = :delegated_to,
        Process_date = GETDATE()
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `,
    {
      replacements: {
        qa_id: qaId,
        id_no_sertifikat: idNoSertifikat,
        assm_nama_instrumen: textValue(normalized.assmNamaInstrumen),
        assm_no_identitas_kalibrasi: textValue(normalized.assmNoIdentitasKalibrasi),
        assm_merk: textValue(normalized.assmMerk),
        serial_number: textValue(normalized.serialNumber),
        assm_kapasitas: textValue(normalized.assmKapasitas),
        assm_lokasi: textValue(normalized.assmLokasi),
        nama: textValue(normalized.nama),
        no_ident_no_batch: textValue(normalized.noIdentNoBatch),
        no_sertifikat: textValue(normalized.noSertifikat),
        tertelusur_melalui: textValue(normalized.tertelusurMelalui),
        rekalibrasi: textValue(normalized.rekalibrasi),
        tgl_kalibrasi: sqlDate,
        interval: textValue(normalized.interval),
        metode_kalibrasi: textValue(normalized.metodeKalibrasi),
        suhu_kelembaban: textValue(normalized.suhuKelembaban),
        catatan: textValue(normalized.catatan),
        user_id: userId,
        delegated_to: delegatedTo,
      },
      type: Sequelize.QueryTypes.UPDATE,
      transaction,
    }
  );
}

async function replaceThermoCertificateRows({ tableName, qaId, idNoSertifikat, rows, userId, delegatedTo, transaction }) {
  const resolvedTable = tableName === 'rh'
    ? 'T_Kalibrasi_Sertifikat_Thermohygro_Kelembaban'
    : 'T_Kalibrasi_Sertifikat_Thermohygro_Suhu';
  const displayUnit = tableName === 'rh' ? '%' : '\u00B0C';

  await sequelizeMSQL.query(
    `
      DELETE FROM ${resolvedTable}
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `,
    {
      replacements: { qaId, idNoSertifikat },
      type: Sequelize.QueryTypes.DELETE,
      transaction,
    }
  );

  for (const row of rows) {
    const pembacaanAlat = formatThermoCertificateNumber(row.pembacaanAlat, {
      unit: displayUnit,
    });
    const pembacaanStandar = formatThermoCertificateNumber(
      row.pembacaanStandar,
      { unit: displayUnit }
    );
    const error = formatThermoCertificateNumber(row.error, {
      prefix: '+',
      unit: displayUnit,
    });
    const ketidakpastian = formatThermoCertificateNumber(row.ketidakpastian, {
      prefix: '\u00B1',
      unit: displayUnit,
    });

    await sequelizeMSQL.query(
      `
        INSERT INTO ${resolvedTable}
        (
          QA_ID,
          ID_No_Sertifikat,
          Seq_ID,
          Pembacaan_Alat,
          Pembacaan_standar,
          Error,
          Ketidakpastian,
          UserID,
          Delegated_To,
          Process_date
        )
        VALUES
        (
          :qaId,
          :idNoSertifikat,
          :seqId,
          :pembacaanAlat,
          :pembacaanStandar,
          :error,
          :ketidakpastian,
          :userId,
          :delegatedTo,
          GETDATE()
        )
      `,
      {
        replacements: {
          qaId,
          idNoSertifikat,
          seqId: row.seqId,
          pembacaanAlat,
          pembacaanStandar,
          error,
          ketidakpastian,
          userId,
          delegatedTo,
        },
        type: Sequelize.QueryTypes.INSERT,
        transaction,
      }
      );
  }
}

async function syncThermoCertificateResultRows({
  qaId,
  idNoSertifikat,
  calculationResult,
  userId,
  delegatedTo,
  transaction,
}) {
  const hasCertificateIdentity = Boolean(
    textValue(qaId).trim() && textValue(idNoSertifikat).trim()
  );
  const hasCalculatedResults = Boolean(
    calculationResult?.suhu || calculationResult?.rh
  );

  if (!hasCertificateIdentity || !hasCalculatedResults) {
    return { synced: false, suhuRowCount: 0, rhRowCount: 0 };
  }

  const suhuRows = buildThermoResultRows(calculationResult.suhu);
  const rhRows = buildThermoResultRows(calculationResult.rh);

  await replaceThermoCertificateRows({
    tableName: 'suhu',
    qaId,
    idNoSertifikat,
    rows: suhuRows,
    userId,
    delegatedTo,
    transaction,
  });

  await replaceThermoCertificateRows({
    tableName: 'rh',
    qaId,
    idNoSertifikat,
    rows: rhRows,
    userId,
    delegatedTo,
    transaction,
  });

  return { synced: true, suhuRowCount: suhuRows.length, rhRowCount: rhRows.length };
}

async function fetchSessionById(sessionId) {
  const rows = await sequelizeMSQL.query(
    `
      SELECT TOP 1 *
      FROM ${SESSION_TABLE}
      WHERE Session_ID = :sessionId
    `,
    {
      replacements: { sessionId },
      type: Sequelize.QueryTypes.SELECT,
    }
  );

  if (!rows.length) return null;

  const row = rows[0];
  return {
    ...row,
    workbookPayload: parseJson(row.Workbook_Payload_JSON, null),
    calculationResult: normalizeCalculationNumbers(parseJson(row.Calculation_Result_JSON, null)),
  };
}

const searchCertificates = async (req, res, next) => {
  try {
    const { bagian_user } = req.user;
    const search = normalizeSearch(req.query.search);
    const sourceFrom = bagian_user === 'VN'
      ? 'T_Kalibrasi_Sertifikat_Thermohygro AS A'
      : `vw_kal_Last_sert_Thermohygro AS Z
         LEFT JOIN T_Kalibrasi_Sertifikat_Thermohygro AS A
           ON A.QA_ID = Z.QA_ID AND A.ID_No_Sertifikat = Z.Nomor`;

    const rows = await sequelizeMSQL.query(
      `
        SELECT TOP 50
          A.QA_ID,
          A.ID_No_Sertifikat,
          A.tgl,
          A.Assm_nama_instrumen,
          A.Assm_No_identitas_kalibrasi,
          A.Assm_Merk,
          A.SERIAL_NUMBER,
          A.Assm_Kapasitas,
          A.Assm_Lokasi,
          A.Nama,
          A.No_Ident_No_batch,
          A.No_Sertifikat,
          A.Tertelusur_melalui,
          A.Rekalibrasi,
          A.Tgl_kalibrasi,
          A.Interval,
          A.Metode_kalibrasi,
          A.Suhu_Kelembaban,
          A.Catatan,
          B.User_ID AS ApproverID,
          B.Process_date AS ApproveDate,
          C.User_ID AS Generate_DA_ID,
          C.Process_date AS Generate_DA_Date,
          A.isSert_Manual
        FROM ${sourceFrom}
        LEFT JOIN (
          SELECT * FROM T_Kalibrasi_Sertifikat_Thermohygro_Status WHERE approver_no = 1
        ) AS B ON A.QA_ID = B.QA_ID AND A.ID_No_Sertifikat = B.ID_No_Sertifikat
        LEFT JOIN (
          SELECT * FROM T_Kalibrasi_Sertifikat_Thermohygro_Status WHERE approver_no = 2
        ) AS C ON A.QA_ID = C.QA_ID AND A.ID_No_Sertifikat = C.ID_No_Sertifikat
        WHERE (
          A.ID_No_Sertifikat LIKE :search
          OR A.QA_ID LIKE :search
          OR A.Assm_nama_instrumen LIKE :search
          OR A.Assm_No_identitas_kalibrasi LIKE :search
          OR A.Nama LIKE :search
        )
        ORDER BY A.tgl DESC
      `,
      {
        replacements: { search },
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    return res.status(200).json({
      success: true,
      data: rows.map(formatCertificateRow),
      count: rows.length,
    });
  } catch (error) {
    console.error('Error in thermohygrometer searchCertificates:', error);
    next(error);
  }
};

const getWorkbookHeader = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const { qa_id: qaId, id_no_sertifikat: idNoSertifikat } = req.query;

    if (!qaId || !idNoSertifikat) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID and ID_No_Sertifikat are required',
      });
    }

    const data = await fetchWorkbookHeaderData(qaId, idNoSertifikat, user_id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Data not found',
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in thermohygrometer getWorkbookHeader:', error);
    next(error);
  }
};

const saveWorkbookHeader = async (req, res, next) => {
  try {
    const { user_id, delegated_to } = req.user;
    const header = normalizeHeaderPayload(req.body);
    const {
      qaId,
      idNoSertifikat,
      tglKalibrasi,
      interval,
    } = header;

    if (!qaId || !idNoSertifikat) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID and ID_No_Sertifikat are required',
      });
    }

    if (!tglKalibrasi || !interval) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal Kalibrasi dan interval harus di isi',
      });
    }

    const current = await fetchWorkbookHeaderData(qaId, idNoSertifikat, user_id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: 'Data not found',
      });
    }

    if (!current.permissions?.canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Tidak bisa update sertifikat karena sudah approve atau user tidak memiliki akses input',
      });
    }

    const parsedDate = parseCalibrationDate(tglKalibrasi);
    if (!parsedDate) {
      return res.status(400).json({
        success: false,
        message: 'Format Tanggal Kalibrasi tidak valid',
      });
    }

    const updateQuery = `
      UPDATE T_Kalibrasi_Sertifikat_Thermohygro
      SET
        Assm_nama_instrumen = :assm_nama_instrumen,
        Assm_No_identitas_kalibrasi = :assm_no_identitas_kalibrasi,
        Assm_Merk = :assm_merk,
        SERIAL_NUMBER = :serial_number,
        Assm_Kapasitas = :assm_kapasitas,
        Assm_Lokasi = :assm_lokasi,
        Nama = :nama,
        No_Ident_No_batch = :no_ident_no_batch,
        No_Sertifikat = :no_sertifikat,
        Tertelusur_melalui = :tertelusur_melalui,
        Rekalibrasi = :rekalibrasi,
        Tgl_kalibrasi = :tgl_kalibrasi,
        Interval = :interval,
        Metode_kalibrasi = :metode_kalibrasi,
        Suhu_Kelembaban = :suhu_kelembaban,
        Catatan = :catatan,
        UserID = :user_id,
        Delegated_To = :delegated_to,
        Process_date = GETDATE()
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;

    await sequelizeMSQL.query(updateQuery, {
      replacements: {
        assm_nama_instrumen: textValue(header.assmNamaInstrumen),
        assm_no_identitas_kalibrasi: textValue(header.assmNoIdentitasKalibrasi),
        assm_merk: textValue(header.assmMerk),
        serial_number: textValue(header.serialNumber),
        assm_kapasitas: textValue(header.assmKapasitas),
        assm_lokasi: textValue(header.assmLokasi),
        nama: textValue(header.nama),
        no_ident_no_batch: textValue(header.noIdentNoBatch),
        no_sertifikat: textValue(header.noSertifikat),
        tertelusur_melalui: textValue(header.tertelusurMelalui),
        rekalibrasi: textValue(header.rekalibrasi),
        tgl_kalibrasi: parsedDate.utcOffset(7).format('YYYY-MM-DD'),
        interval: textValue(interval),
        metode_kalibrasi: textValue(header.metodeKalibrasi),
        suhu_kelembaban: textValue(header.suhuKelembaban),
        catatan: textValue(header.catatan),
        user_id,
        delegated_to,
        qa_id: qaId,
        id_no_sertifikat: idNoSertifikat,
      },
      type: Sequelize.QueryTypes.UPDATE,
    });

    const data = await fetchWorkbookHeaderData(qaId, idNoSertifikat, user_id);

    return res.status(200).json({
      success: true,
      message: 'Workbook header saved successfully',
      data,
    });
  } catch (error) {
    console.error('Error in thermohygrometer saveWorkbookHeader:', error);
    next(error);
  }
};

const saveSession = async (req, res, next) => {
  let transaction = null;
  try {
    const { user_id, delegated_to } = req.user;
    const body = req.body || {};
    const sessionId = Number(req.params.sessionId || body.sessionId || body.Session_ID || 0);
    const qaId = textValue(pickValue(body, 'qa_id', 'qaId', 'QA_ID'));
    const idNoSertifikat = textValue(pickValue(
      body,
      'id_no_sertifikat',
      'idNoSertifikat',
      'ID_No_Sertifikat'
    ));

    if (sessionId && (!Number.isInteger(sessionId) || sessionId <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'sessionId must be a positive integer',
      });
    }

    if (!(await sessionTableExists())) {
      return res.status(500).json({
        success: false,
        message: 'Thermohygrometer session table has not been created. Run seeders/createThermohygrometerCalibrationTables.js first.',
      });
    }

    const evaluationResult = normalizeEvaluationResult(pickValue(
      body,
      'evaluation_result',
      'evaluationResult',
      'Evaluation_Result'
    ));

    const workbookPayload = body.workbookPayload || {
      header: body.header || null,
      includeRh: Boolean(body.includeRh),
      channels: body.channels || {},
    };
    const channels = workbookPayload.channels || body.channels || {};
    const suhuChannel = channels.suhu || {};
    const rhChannel = channels.rh || {};
    const calculationResult = normalizeCalculationNumbers(body.calculationResult || null);
    const includeRh = Boolean(workbookPayload.includeRh ?? body.includeRh);

    const replacements = {
      qaId,
      idNoSertifikat,
      includeRh: includeRh ? 1 : 0,
      suhuRepeatCount: normalizeRepeatCount(suhuChannel.repeatCount, 3),
      rhRepeatCount: includeRh ? normalizeRepeatCount(rhChannel.repeatCount, 3) : null,
      suhuUnit: textValue(suhuChannel.unit || `${String.fromCharCode(176)}C`),
      rhUnit: includeRh ? textValue(rhChannel.unit || '%rH') : null,
      suhuCoefficientMode: normalizeMode(suhuChannel.coefficientMode),
      rhCoefficientMode: includeRh ? normalizeMode(rhChannel.coefficientMode) : null,
      workbookPayloadJson: JSON.stringify(workbookPayload),
      calculationResultJson: calculationResult ? JSON.stringify(calculationResult) : null,
      evaluationResult,
      status: normalizeStatus(body.status, Boolean(calculationResult)),
      userId: user_id,
      delegatedTo: delegated_to,
    };

    let savedSessionId = sessionId;

    if (sessionId) {
      const existing = await fetchSessionById(sessionId);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Session not found',
        });
      }

      if (
        existing.ApprovedByManager
      ) {
        return res.status(403).json({
          success: false,
          message: 'Tidak bisa simpan workbook karena sudah approve Manager',
        });
      }
    }

    transaction = await sequelizeMSQL.transaction();

    if (sessionId) {
      await sequelizeMSQL.query(
        `
          UPDATE ${SESSION_TABLE}
          SET
            QA_ID = :qaId,
            ID_No_Sertifikat = :idNoSertifikat,
            Include_RH = :includeRh,
            Suhu_Repeat_Count = :suhuRepeatCount,
            RH_Repeat_Count = :rhRepeatCount,
            Suhu_Unit = :suhuUnit,
            RH_Unit = :rhUnit,
            Suhu_Coefficient_Mode = :suhuCoefficientMode,
            RH_Coefficient_Mode = :rhCoefficientMode,
            Workbook_Payload_JSON = :workbookPayloadJson,
            Calculation_Result_JSON = :calculationResultJson,
            Evaluation_Result = :evaluationResult,
            Status = :status,
            UserID = :userId,
            Delegated_To = :delegatedTo,
            Update_Date = GETDATE()
          WHERE Session_ID = :sessionId
        `,
        {
          replacements: { ...replacements, sessionId },
          type: Sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );
    } else {
      const inserted = await sequelizeMSQL.query(
        `
          DECLARE @InsertedSession TABLE (Session_ID BIGINT);

          INSERT INTO ${SESSION_TABLE}
          (
            QA_ID,
            ID_No_Sertifikat,
            Include_RH,
            Suhu_Repeat_Count,
            RH_Repeat_Count,
            Suhu_Unit,
            RH_Unit,
            Suhu_Coefficient_Mode,
            RH_Coefficient_Mode,
            Workbook_Payload_JSON,
            Calculation_Result_JSON,
            Evaluation_Result,
            Status,
            UserID,
            Delegated_To,
            Process_Date
          )
          OUTPUT INSERTED.Session_ID INTO @InsertedSession
          VALUES
          (
            :qaId,
            :idNoSertifikat,
            :includeRh,
            :suhuRepeatCount,
            :rhRepeatCount,
            :suhuUnit,
            :rhUnit,
            :suhuCoefficientMode,
            :rhCoefficientMode,
            :workbookPayloadJson,
            :calculationResultJson,
            :evaluationResult,
            :status,
            :userId,
            :delegatedTo,
            GETDATE()
          )

          SELECT Session_ID FROM @InsertedSession
        `,
        {
          replacements,
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      savedSessionId = Number(inserted[0]?.Session_ID);
    }

    await syncThermoCertificateResultRows({
      qaId,
      idNoSertifikat,
      calculationResult,
      userId: user_id,
      delegatedTo: delegated_to,
      transaction,
    });

    await transaction.commit();
    transaction = null;

    const session = await fetchSessionById(savedSessionId);

    return res.status(200).json({
      success: true,
      message: 'Workbook session saved successfully',
      data: session,
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back thermohygrometer saveSession:', rollbackError);
      }
    }
    console.error('Error in thermohygrometer saveSession:', error);
    next(error);
  }
};

const listSessions = async (req, res, next) => {
  try {
    const { qa_id: qaId, id_no_sertifikat: idNoSertifikat } = req.query;
    const searchText = String(req.query.search || '').trim();
    const search = normalizeSearch(searchText);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

    if (!(await sessionTableExists())) {
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        tableReady: false,
      });
    }

    const whereParts = [];
    const replacements = {};

    if (qaId) {
      whereParts.push('S.QA_ID = :qaId');
      replacements.qaId = qaId;
    }

    if (idNoSertifikat) {
      whereParts.push('S.ID_No_Sertifikat = :idNoSertifikat');
      replacements.idNoSertifikat = idNoSertifikat;
    }

    if (searchText) {
      whereParts.push(`
        (
          CAST(S.Session_ID AS NVARCHAR(30)) LIKE :search
          OR S.QA_ID LIKE :search
          OR S.ID_No_Sertifikat LIKE :search
          OR S.Status LIKE :search
          OR S.Evaluation_Result LIKE :search
          OR S.UserID LIKE :search
          OR C.Assm_nama_instrumen LIKE :search
          OR C.Assm_No_identitas_kalibrasi LIKE :search
          OR C.No_Sertifikat LIKE :search
          OR C.Assm_Lokasi LIKE :search
        )
      `);
      replacements.search = search;
    }

    const whereClause = whereParts.length
      ? `WHERE ${whereParts.join(' AND ')}`
      : '';

    const rows = await sequelizeMSQL.query(
      `
        SELECT TOP ${limit}
          S.Session_ID,
          S.QA_ID,
          S.ID_No_Sertifikat,
          S.Include_RH,
          S.Suhu_Repeat_Count,
          S.RH_Repeat_Count,
          S.Suhu_Unit,
          S.RH_Unit,
          S.Suhu_Coefficient_Mode,
          S.RH_Coefficient_Mode,
          S.Evaluation_Result,
          S.Status,
          S.ApprovedByAdmin,
          S.ApprovedByAdminDate,
          S.ApprovedByOfficer,
          S.ApprovedByOfficerDate,
          S.ApprovedByManager,
          S.ApprovedByManagerDate,
          S.UserID,
          S.Delegated_To,
          S.Process_Date,
          S.Update_Date,
          C.Assm_nama_instrumen,
          C.Assm_No_identitas_kalibrasi,
          C.Assm_Lokasi,
          C.No_Sertifikat,
          C.Tgl_kalibrasi
        FROM ${SESSION_TABLE} AS S
        LEFT JOIN T_Kalibrasi_Sertifikat_Thermohygro AS C
          ON C.QA_ID = S.QA_ID
         AND C.ID_No_Sertifikat = S.ID_No_Sertifikat
        ${whereClause}
        ORDER BY ISNULL(S.Update_Date, S.Process_Date) DESC, S.Session_ID DESC
      `,
      {
        replacements,
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    return res.status(200).json({
      success: true,
      data: rows,
      count: rows.length,
      tableReady: true,
    });
  } catch (error) {
    console.error('Error in thermohygrometer listSessions:', error);
    next(error);
  }
};

const getSession = async (req, res, next) => {
  try {
    const sessionId = Number(req.params.sessionId);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'sessionId must be a positive integer',
      });
    }

    if (!(await sessionTableExists())) {
      return res.status(404).json({
        success: false,
        message: 'Thermohygrometer session table has not been created',
      });
    }

    const session = await fetchSessionById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error in thermohygrometer getSession:', error);
    next(error);
  }
};

const approveSession = async (req, res, next) => {
  try {
    const { user_id } = req.user;
    const sessionId = Number(req.params.sessionId);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'sessionId must be a positive integer',
      });
    }

    if (!(await sessionTableExists())) {
      return res.status(404).json({
        success: false,
        message: 'Thermohygrometer session table has not been created',
      });
    }

    const session = await fetchSessionById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (!session.calculationResult) {
      return res.status(400).json({
        success: false,
        message: 'Lakukan perhitungan dan simpan workbook terlebih dahulu',
      });
    }

    if (!normalizeEvaluationResult(session.Evaluation_Result)) {
      return res.status(400).json({
        success: false,
        message: 'Pilih hasil evaluasi workbook terlebih dahulu',
      });
    }

    const actorRole = getActorApprovalRole(req);
    const role = resolveTargetApprovalRole(req);
    const orderMessage = assertWorkbookApproval({
      session,
      actorRole,
      targetRole: role,
      certificateApprovedByManager: true,
    });
    if (orderMessage) {
      return res.status(403).json({
        success: false,
        message: orderMessage,
      });
    }

    await sequelizeMSQL.transaction(async (transaction) => {
      if (role.key === 'manager') {
        await finalizeManagerCalibrationApproval({
          certificateType: 'thermo',
          session,
          user: req.user,
          transaction,
        });
      }

      await sequelizeMSQL.query(
        `
          UPDATE ${SESSION_TABLE}
          SET
            ${role.column} = :userId,
            ${role.dateColumn} = GETDATE(),
            Status = :status,
            Update_Date = GETDATE()
          WHERE Session_ID = :sessionId
        `,
        {
          replacements: {
            userId: user_id,
            status: role.status,
            sessionId,
          },
          type: Sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );
    });

    const data = await fetchSessionById(sessionId);
    return res.status(200).json({
      success: true,
      message: `Workbook approved by ${role.label}`,
      data,
    });
  } catch (error) {
    console.error('Error in thermohygrometer approveSession:', error);
    next(error);
  }
};

const generateSertifikatFromSession = async (req, res, next) => {
  const transaction = await sequelizeMSQL.transaction();

  try {
    const { user_id, delegated_to } = req.user;
    const body = req.body || {};
    const sessionId = Number(req.params.sessionId || body.sessionId || 0);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'sessionId must be a positive integer',
      });
    }

    if (!(await sessionTableExists())) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: 'Thermohygrometer session table has not been created. Run seeders/createThermohygrometerCalibrationTables.js first.',
      });
    }

    const session = await fetchSessionById(sessionId);
    if (!session) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    const sessionWorkbookPayload = session.workbookPayload || {};
    const requestWorkbookPayload = body.workbookPayload || {};
    const mergedHeader = {
      ...(sessionWorkbookPayload.header || {}),
      ...(requestWorkbookPayload.header || {}),
      ...(body.header || {}),
    };

    const qaId = textValue(
      pickValue(body, 'qa_id', 'qaId', 'QA_ID') ||
        session.QA_ID ||
        mergedHeader.QA_ID
    ).trim();
    let idNoSertifikat = textValue(
      pickValue(body, 'id_no_sertifikat', 'idNoSertifikat', 'ID_No_Sertifikat') ||
        session.ID_No_Sertifikat ||
        mergedHeader.ID_No_Sertifikat
    ).trim();

    if (!qaId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'QA_ID is required to generate Thermohygrometer certificate',
      });
    }

    if (!idNoSertifikat) {
      idNoSertifikat = await getNextThermoCertificateNumber(transaction);
    }

    if (!idNoSertifikat) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: 'Gagal mengambil nomor otomatis sertifikat Thermohygrometer',
      });
    }

    const headerCreated = await ensureThermoCertificateHeader({
      qaId,
      idNoSertifikat,
      userId: user_id,
      delegatedTo: delegated_to,
      transaction,
    });

    if (!headerCreated) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: `DA Thermohygrometer tidak ditemukan untuk QA_ID ${qaId}`,
      });
    }

    const headerForSave = {
      ...mergedHeader,
      QA_ID: qaId,
      ID_No_Sertifikat: idNoSertifikat,
    };
    await updateThermoCertificateHeader({
      qaId,
      idNoSertifikat,
      header: headerForSave,
      userId: user_id,
      delegatedTo: delegated_to,
      transaction,
    });

    const calculationResult = normalizeCalculationNumbers(
      body.calculationResult || session.calculationResult || {}
    );
    const evaluationResult = normalizeEvaluationResult(
      pickValue(body, 'evaluation_result', 'evaluationResult', 'Evaluation_Result') ||
        session.Evaluation_Result
    );

    if (!evaluationResult) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Pilih hasil evaluasi workbook terlebih dahulu',
      });
    }

    const syncResult = await syncThermoCertificateResultRows({
      qaId,
      idNoSertifikat,
      calculationResult,
      userId: user_id,
      delegatedTo: delegated_to,
      transaction,
    });

    const nextWorkbookPayload = {
      ...sessionWorkbookPayload,
      ...requestWorkbookPayload,
      header: headerForSave,
    };
    const channels = nextWorkbookPayload.channels || {};
    const suhuChannel = channels.suhu || {};
    const rhChannel = channels.rh || {};
    const includeRh = Boolean(nextWorkbookPayload.includeRh ?? session.Include_RH);

    await sequelizeMSQL.query(
      `
        UPDATE ${SESSION_TABLE}
        SET
          QA_ID = :qaId,
          ID_No_Sertifikat = :idNoSertifikat,
          Include_RH = :includeRh,
          Suhu_Repeat_Count = :suhuRepeatCount,
          RH_Repeat_Count = :rhRepeatCount,
          Suhu_Unit = :suhuUnit,
          RH_Unit = :rhUnit,
          Suhu_Coefficient_Mode = :suhuCoefficientMode,
          RH_Coefficient_Mode = :rhCoefficientMode,
          Workbook_Payload_JSON = :workbookPayloadJson,
          Calculation_Result_JSON = :calculationResultJson,
          Evaluation_Result = :evaluationResult,
          Status = :status,
          UserID = :userId,
          Delegated_To = :delegatedTo,
          Update_Date = GETDATE()
        WHERE Session_ID = :sessionId
      `,
      {
        replacements: {
          qaId,
          idNoSertifikat,
          includeRh: includeRh ? 1 : 0,
          suhuRepeatCount: normalizeRepeatCount(suhuChannel.repeatCount, session.Suhu_Repeat_Count || 3),
          rhRepeatCount: includeRh ? normalizeRepeatCount(rhChannel.repeatCount, session.RH_Repeat_Count || 3) : null,
          suhuUnit: textValue(suhuChannel.unit || session.Suhu_Unit || `${String.fromCharCode(176)}C`),
          rhUnit: includeRh ? textValue(rhChannel.unit || session.RH_Unit || '%rH') : null,
          suhuCoefficientMode: normalizeMode(suhuChannel.coefficientMode || session.Suhu_Coefficient_Mode),
          rhCoefficientMode: includeRh ? normalizeMode(rhChannel.coefficientMode || session.RH_Coefficient_Mode) : null,
          workbookPayloadJson: JSON.stringify(nextWorkbookPayload),
          calculationResultJson: calculationResult ? JSON.stringify(calculationResult) : null,
          evaluationResult,
          status: 'PUBLISHED',
          userId: user_id,
          delegatedTo: delegated_to,
          sessionId,
        },
        type: Sequelize.QueryTypes.UPDATE,
        transaction,
      }
    );

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: 'Sukses Generate Data Sertifikat Thermohygrometer!',
      data: {
        qa_id: qaId,
        id_no_sertifikat: idNoSertifikat,
        session_id: sessionId,
        suhu_rows: syncResult.suhuRowCount,
        rh_rows: syncResult.rhRowCount,
      },
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {
      // Keep original error.
    }
    console.error('Error in generateSertifikatFromSession:', error);
    next(error);
  }
};
module.exports = {
  searchCertificates,
  getWorkbookHeader,
  saveWorkbookHeader,
  listSessions,
  getSession,
  saveSession,
  approveSession,
  generateSertifikatFromSession,
};




