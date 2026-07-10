'use strict';

const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');
const {
  assertWorkbookApproval,
  getActorApprovalRole,
  hasCertificateManagerApproval,
  resolveTargetApprovalRole,
} = require('../../services/calibrationWorkbookApproval.service');

const SESSION_TABLE = 'dbo.T_Kalibrasi_Friability_Workbook_Session';

function textValue(value) {
  return value === undefined || value === null ? '' : String(value);
}

function pickValue(source, ...keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined) return source[key];
  }
  return undefined;
}

function normalizeSearch(search) {
  const text = String(search || '').trim();
  return text && text !== '%' ? `%${text}%` : '%';
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function parseNumberValue(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = typeof value === 'string'
    ? value.replace(',', '.').trim()
    : value;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function parseCalibrationDate(value) {
  if (!value) return null;
  const parsed = moment(
    value,
    ['YYYY-MM-DD', 'DD-MMM-YYYY', 'DD-MMM-YYYY HH:mm:ss', moment.ISO_8601],
    true
  );
  if (parsed.isValid()) return parsed.utcOffset(7).format('YYYY-MM-DD');

  const fallback = moment(value);
  return fallback.isValid() ? fallback.utcOffset(7).format('YYYY-MM-DD') : null;
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

function getWorkbookApprovalRole(req) {
  const jobLevel = Number(
    req?.user?.joblevel_id_user ??
      req?.body?.job_level_id ??
      req?.body?.jobLevelId ??
      req?.body?.Job_LevelID
  );

  if (jobLevel > 6) {
    return {
      key: 'admin',
      label: 'Admin',
      column: 'ApprovedByAdmin',
      dateColumn: 'ApprovedByAdminDate',
      status: 'APPROVED_ADMIN',
    };
  }

  if (jobLevel === 5 || jobLevel === 6) {
    return {
      key: 'officer',
      label: 'Officer/Supervisor',
      column: 'ApprovedByOfficer',
      dateColumn: 'ApprovedByOfficerDate',
      status: 'APPROVED_OFFICER',
    };
  }

  if (jobLevel === 3) {
    return {
      key: 'manager',
      label: 'Manager',
      column: 'ApprovedByManager',
      dateColumn: 'ApprovedByManagerDate',
      status: 'APPROVED',
    };
  }

  return null;
}

function assertWorkbookApprovalOrder(session, role) {
  if (!role) return 'User tidak memiliki role approval workbook';
  if (session?.[role.column]) return `Workbook sudah approve oleh ${role.label}`;

  if (role.key === 'officer' && !session?.ApprovedByAdmin) {
    return 'Admin harus approve workbook terlebih dahulu';
  }

  if (role.key === 'manager') {
    if (!session?.ApprovedByAdmin) return 'Admin harus approve workbook terlebih dahulu';
    if (!session?.ApprovedByOfficer) {
      return 'Officer/Supervisor harus approve workbook terlebih dahulu';
    }
  }

  return '';
}

function normalizeHeaderPayload(source = {}) {
  return {
    qaId: pickValue(source, 'qa_id', 'qaId', 'QA_ID'),
    idNoSertifikat: pickValue(source, 'id_no_sertifikat', 'idNoSertifikat', 'ID_No_Sertifikat'),
    assmNamaInstrumen: pickValue(source, 'assm_nama_instrumen', 'Assm_nama_instrumen'),
    assmNoIdentitasKalibrasi: pickValue(source, 'assm_no_identitas_kalibrasi', 'Assm_No_identitas_kalibrasi'),
    assmMerk: pickValue(source, 'assm_merk', 'Assm_Merk'),
    serialNumber: pickValue(source, 'serial_number', 'SERIAL_NUMBER'),
    assmKapasitas: pickValue(source, 'assm_kapasitas', 'Assm_Kapasitas'),
    assmLokasi: pickValue(source, 'assm_lokasi', 'Assm_Lokasi'),
    nama: pickValue(source, 'nama', 'Nama'),
    noIdentNoBatch: pickValue(source, 'no_ident_no_batch', 'No_Ident_No_batch'),
    noSertifikat: pickValue(source, 'no_sertifikat', 'No_Sertifikat'),
    tertelusurMelalui: pickValue(source, 'tertelusur_melalui', 'Tertelusur_melalui'),
    rekalibrasi: pickValue(source, 'rekalibrasi', 'Rekalibrasi'),
    tglKalibrasi: pickValue(source, 'tgl_kalibrasi', 'Tgl_kalibrasi'),
    interval: pickValue(source, 'interval', 'Interval'),
    metodeKalibrasi: pickValue(source, 'metode_kalibrasi', 'Metode_kalibrasi'),
    suhuKelembaban: pickValue(source, 'suhu_kelembaban', 'Suhu_Kelembaban'),
    catatan: pickValue(source, 'catatan', 'Catatan'),
  };
}

function buildFriabilityResultRows(calculationResult = {}, explicitRows = []) {
  const rows = Array.isArray(explicitRows) && explicitRows.length
    ? explicitRows
    : Array.isArray(calculationResult?.rows)
      ? calculationResult.rows
      : [];
  const nominal = 25;
  const min = 24;
  const max = 26;

  return rows.map((row, index) => {
    const time = parseNumberValue(
      row.time ?? row.tOneRotation ?? row.t_one_rotation ?? row.Pembacaan_Alat
    );
    const rpm = parseNumberValue(row.rpm ?? row.pembacaanAlat ?? row.Pembacaan_standar) ??
      (time !== null && time !== 0 ? 60 / time : null);
    const passed = rpm === null ? null : rpm >= min && rpm <= max;

    return {
      seqId: Number(row.seqId || row.Seq_ID || index + 1),
      no: Number(row.no || row.seqId || index + 1),
      time,
      rpm,
      ket: textValue(row.ket || (passed === null ? '' : passed ? 'MS' : 'TMS')),
      pembacaanAlat: rpm,
      pembacaanStandar: nominal,
      error: rpm === null ? null : rpm - nominal,
      ketidakpastian: parseNumberValue(row.ketidakpastian),
    };
  });
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
    calculationResult: parseJson(row.Calculation_Result_JSON, null),
  };
}

async function fetchLatestSessionByCertificate(qaId, idNoSertifikat) {
  if (!(await sessionTableExists())) return null;

  const rows = await sequelizeMSQL.query(
    `
      SELECT TOP 1 *
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

  if (!rows.length) return null;

  const row = rows[0];
  return {
    ...row,
    workbookPayload: parseJson(row.Workbook_Payload_JSON, null),
    calculationResult: parseJson(row.Calculation_Result_JSON, null),
  };
}

async function getNextFriabilityCertificateNumber(transaction) {
  const rows = await sequelizeMSQL.query(
    'SELECT dbo.fnGetKal_Ser_FT_No_ID() as ID_No_sertifikat',
    {
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return rows[0]?.ID_No_sertifikat || '';
}

async function certificateHeaderExists(qaId, idNoSertifikat, transaction) {
  const rows = await sequelizeMSQL.query(
    `
      SELECT TOP 1 QA_ID, ID_No_Sertifikat
      FROM T_Kalibrasi_Sertifikat_Bagian
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

async function ensureFriabilityCertificateHeader({ qaId, idNoSertifikat, userId, delegatedTo, transaction }) {
  if (await certificateHeaderExists(qaId, idNoSertifikat, transaction)) return true;

  await sequelizeMSQL.query(
    `
      INSERT INTO T_Kalibrasi_Sertifikat_Bagian
      (
        QA_ID,
        ID_No_sertifikat,
        Jenis_kalibrasi,
        parameter_sertifikasi,
        isSert_Manual,
        Tgl,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Assm_Merk,
        Assm_Kapasitas,
        Assm_Lokasi,
        Group_Da_Dept,
        Parameter_Kalibrasi,
        UserID,
        Delegated_To,
        Process_date
      )
      SELECT
        QA_ID,
        :idNoSertifikat AS ID_No_sertifikat,
        Jenis_kalibrasi,
        COALESCE(NULLIF(Parameter_Sertifikasi, ''), 'Friability Tester') AS parameter_sertifikasi,
        1 AS isSert_Manual,
        GETDATE() AS Tgl,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        '' AS Assm_Merk,
        Assm_Kapasitas,
        Assm_Lokasi,
        Group_Da_Dept,
        Parameter_Kalibrasi,
        :userId AS UserID,
        :delegatedTo AS Delegated_To,
        GETDATE() AS Process_date
      FROM T_Kalibrasi_DA_Bagian
      WHERE QA_ID = :qaId
    `,
    {
      replacements: { qaId, idNoSertifikat, userId, delegatedTo },
      type: Sequelize.QueryTypes.INSERT,
      transaction,
    }
  );

  return certificateHeaderExists(qaId, idNoSertifikat, transaction);
}

async function updateFriabilityCertificateHeader({ qaId, idNoSertifikat, header, userId, delegatedTo, transaction }) {
  const normalized = normalizeHeaderPayload({
    ...header,
    QA_ID: qaId,
    ID_No_Sertifikat: idNoSertifikat,
  });
  const parsedDate = parseCalibrationDate(normalized.tglKalibrasi);

  await sequelizeMSQL.query(
    `
      UPDATE T_Kalibrasi_Sertifikat_Bagian
      SET
        parameter_sertifikasi = COALESCE(NULLIF(parameter_sertifikasi, ''), 'Friability Tester'),
        Assm_nama_instrumen = COALESCE(NULLIF(:assmNamaInstrumen, ''), Assm_nama_instrumen),
        Assm_No_identitas_kalibrasi = COALESCE(NULLIF(:assmNoIdentitasKalibrasi, ''), Assm_No_identitas_kalibrasi),
        Assm_Merk = COALESCE(NULLIF(:assmMerk, ''), Assm_Merk),
        SERIAL_NUMBER = COALESCE(NULLIF(:serialNumber, ''), SERIAL_NUMBER),
        Assm_Kapasitas = COALESCE(NULLIF(:assmKapasitas, ''), Assm_Kapasitas),
        Assm_Lokasi = COALESCE(NULLIF(:assmLokasi, ''), Assm_Lokasi),
        Nama = COALESCE(NULLIF(:nama, ''), Nama),
        No_Ident_No_batch = COALESCE(NULLIF(:noIdentNoBatch, ''), No_Ident_No_batch),
        No_Sertifikat = COALESCE(NULLIF(:noSertifikat, ''), No_Sertifikat),
        Tertelusur_melalui = COALESCE(NULLIF(:tertelusurMelalui, ''), Tertelusur_melalui),
        Rekalibrasi = COALESCE(NULLIF(:rekalibrasi, ''), Rekalibrasi),
        Tgl_kalibrasi = COALESCE(:tglKalibrasi, Tgl_kalibrasi),
        Interval = COALESCE(:intervalValue, Interval),
        Metode_kalibrasi = COALESCE(NULLIF(:metodeKalibrasi, ''), Metode_kalibrasi),
        Suhu_Kelembaban = COALESCE(NULLIF(:suhuKelembaban, ''), Suhu_Kelembaban),
        Catatan = COALESCE(NULLIF(:catatan, ''), Catatan),
        UserID = :userId,
        Delegated_To = :delegatedTo,
        Process_date = GETDATE()
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `,
    {
      replacements: {
        qaId,
        idNoSertifikat,
        assmNamaInstrumen: textValue(normalized.assmNamaInstrumen),
        assmNoIdentitasKalibrasi: textValue(normalized.assmNoIdentitasKalibrasi),
        assmMerk: textValue(normalized.assmMerk),
        serialNumber: textValue(normalized.serialNumber),
        assmKapasitas: textValue(normalized.assmKapasitas),
        assmLokasi: textValue(normalized.assmLokasi),
        nama: textValue(normalized.nama),
        noIdentNoBatch: textValue(normalized.noIdentNoBatch),
        noSertifikat: textValue(normalized.noSertifikat),
        tertelusurMelalui: textValue(normalized.tertelusurMelalui),
        rekalibrasi: textValue(normalized.rekalibrasi),
        tglKalibrasi: parsedDate,
        intervalValue: parseNumberValue(normalized.interval),
        metodeKalibrasi: textValue(normalized.metodeKalibrasi),
        suhuKelembaban: textValue(normalized.suhuKelembaban),
        catatan: textValue(normalized.catatan),
        userId,
        delegatedTo,
      },
      type: Sequelize.QueryTypes.UPDATE,
      transaction,
    }
  );
}

async function replaceFriabilityCertificateRows({ qaId, idNoSertifikat, rows, userId, delegatedTo, transaction }) {
  await sequelizeMSQL.query(
    `
      DELETE FROM T_Kalibrasi_Sertifikat_Bagian_Hasil_Kal
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
    await sequelizeMSQL.query(
      `
        INSERT INTO T_Kalibrasi_Sertifikat_Bagian_Hasil_Kal
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
          pembacaanAlat: row.pembacaanAlat,
          pembacaanStandar: row.pembacaanStandar,
          error: row.error,
          ketidakpastian: row.ketidakpastian,
          userId,
          delegatedTo,
        },
        type: Sequelize.QueryTypes.INSERT,
        transaction,
      }
    );
  }
}

function normalizeSessionPayload(body) {
  const qaId = pickValue(body, 'qa_id', 'qaId', 'QA_ID');
  const idNoSertifikat = pickValue(
    body,
    'id_no_sertifikat',
    'idNoSertifikat',
    'ID_No_Sertifikat'
  );
  const workbookPayload = body.workbookPayload || {
    header: body.header || null,
    workbook: body.workbook || null,
  };
  const calculationResult = body.calculationResult || null;

  return {
    qaId: textValue(qaId),
    idNoSertifikat: textValue(idNoSertifikat),
    workbookPayload,
    calculationResult,
    evaluationResult: normalizeEvaluationResult(pickValue(
      body,
      'evaluation_result',
      'evaluationResult',
      'Evaluation_Result'
    )),
    status: normalizeStatus(body.status, Boolean(calculationResult)),
  };
}

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
        LEFT JOIN T_Kalibrasi_Sertifikat_Bagian AS C
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
    console.error('Error in friability listSessions:', error);
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
        message: 'Friability Tester session table has not been created',
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
    console.error('Error in friability getSession:', error);
    next(error);
  }
};

const getPrintData = async (req, res, next) => {
  try {
    const { qa_id: qaId, id_no_sertifikat: idNoSertifikat } = req.query;

    if (!qaId || !idNoSertifikat) {
      return res.status(400).json({
        success: false,
        message: 'qa_id and id_no_sertifikat are required',
      });
    }

    const headerQuery = `
      SELECT
        QA_ID,
        ID_No_Sertifikat,
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
        Interval,
        Metode_kalibrasi,
        Suhu_Kelembaban,
        Catatan
      FROM T_Kalibrasi_Sertifikat_Bagian
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
    `;

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
      WHERE QA_ID = :qaId
        AND ID_No_Sertifikat = :idNoSertifikat
        AND Approver_No = 1
    `;

    const [headerResults, approverResults, latestSession] = await Promise.all([
      sequelizeMSQL.query(headerQuery, {
        replacements: { qaId, idNoSertifikat },
        type: Sequelize.QueryTypes.SELECT,
      }),
      sequelizeMSQL.query(approverQuery, {
        replacements: { qaId, idNoSertifikat },
        type: Sequelize.QueryTypes.SELECT,
      }),
      fetchLatestSessionByCertificate(qaId, idNoSertifikat),
    ]);

    if (!headerResults.length) {
      return res.status(404).json({
        success: false,
        message: 'Friability Tester sertifikat data not found',
      });
    }

    const workbookPayload = latestSession?.workbookPayload || {};
    const rows = buildFriabilityResultRows(latestSession?.calculationResult || {});

    return res.status(200).json({
      success: true,
      data: {
        header: headerResults[0],
        workbook: workbookPayload.workbook || null,
        calculation: latestSession?.calculationResult || null,
        hasil_kal: rows,
        approvalSignature: approverResults[0] || null,
      },
    });
  } catch (error) {
    console.error('Error in friability getPrintData:', error);
    next(error);
  }
};

const saveSession = async (req, res, next) => {
  try {
    const { user_id, delegated_to } = req.user;
    const body = req.body || {};
    const sessionId = Number(req.params.sessionId || body.sessionId || body.Session_ID || 0);

    if (sessionId && (!Number.isInteger(sessionId) || sessionId <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'sessionId must be a positive integer',
      });
    }

    if (!(await sessionTableExists())) {
      return res.status(500).json({
        success: false,
        message: 'Friability Tester session table has not been created. Run sql/create-friability-calibration-tables.sql first.',
      });
    }

    const normalized = normalizeSessionPayload(body);

    const replacements = {
      qaId: normalized.qaId || null,
      idNoSertifikat: normalized.idNoSertifikat || null,
      workbookPayloadJson: JSON.stringify(normalized.workbookPayload || {}),
      calculationResultJson: normalized.calculationResult
        ? JSON.stringify(normalized.calculationResult)
        : null,
      evaluationResult: normalized.evaluationResult,
      status: normalized.status,
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
        existing.ApprovedByAdmin ||
        existing.ApprovedByOfficer ||
        existing.ApprovedByManager
      ) {
        return res.status(403).json({
          success: false,
          message: 'Tidak bisa simpan workbook karena sudah approve',
        });
      }

      await sequelizeMSQL.query(
        `
          UPDATE ${SESSION_TABLE}
          SET
            QA_ID = :qaId,
            ID_No_Sertifikat = :idNoSertifikat,
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
        }
      );

      savedSessionId = Number(inserted[0]?.Session_ID);
    }

    const session = await fetchSessionById(savedSessionId);

    return res.status(200).json({
      success: true,
      message: 'Friability Tester workbook session saved successfully',
      data: session,
    });
  } catch (error) {
    console.error('Error in friability saveSession:', error);
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
        message: 'Friability Tester session table has not been created',
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
    const certificateApprovedByManager =
      role?.key === 'manager'
        ? await hasCertificateManagerApproval({
            qaId: session.QA_ID,
            idNoSertifikat: session.ID_No_Sertifikat,
          })
        : true;
    const orderMessage = assertWorkbookApproval({
      session,
      actorRole,
      targetRole: role,
      certificateApprovedByManager,
    });
    if (orderMessage) {
      return res.status(403).json({
        success: false,
        message: orderMessage,
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
      }
    );

    const data = await fetchSessionById(sessionId);
    return res.status(200).json({
      success: true,
      message: `Workbook approved by ${role.label}`,
      data,
    });
  } catch (error) {
    console.error('Error in friability approveSession:', error);
    next(error);
  }
};

const generateFriabilitySertifikat = async (req, res, next) => {
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
        message: 'Friability Tester session table has not been created. Run sql/create-friability-calibration-tables.sql first.',
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
        message: 'QA_ID is required to generate Friability Tester certificate',
      });
    }

    if (!idNoSertifikat) {
      idNoSertifikat = await getNextFriabilityCertificateNumber(transaction);
    }

    if (!idNoSertifikat) {
      await transaction.rollback();
      return res.status(500).json({
        success: false,
        message: 'Gagal mengambil nomor otomatis sertifikat Friability Tester',
      });
    }

    const headerCreated = await ensureFriabilityCertificateHeader({
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
        message: `DA Bagian tidak ditemukan untuk QA_ID ${qaId}`,
      });
    }

    const headerForSave = {
      ...mergedHeader,
      QA_ID: qaId,
      ID_No_Sertifikat: idNoSertifikat,
    };
    await updateFriabilityCertificateHeader({
      qaId,
      idNoSertifikat,
      header: headerForSave,
      userId: user_id,
      delegatedTo: delegated_to,
      transaction,
    });

    const calculationResult = body.calculationResult || session.calculationResult || null;
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

    const resultRows = buildFriabilityResultRows(
      calculationResult,
      body.certificateRows || []
    );
    await replaceFriabilityCertificateRows({
      qaId,
      idNoSertifikat,
      rows: resultRows,
      userId: user_id,
      delegatedTo: delegated_to,
      transaction,
    });

    const nextWorkbookPayload = {
      ...sessionWorkbookPayload,
      ...requestWorkbookPayload,
      header: headerForSave,
    };

    await sequelizeMSQL.query(
      `
        UPDATE ${SESSION_TABLE}
        SET
          QA_ID = :qaId,
          ID_No_Sertifikat = :idNoSertifikat,
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
      message: 'Sukses Generate Data Sertifikat Friability Tester!',
      data: {
        qa_id: qaId,
        id_no_sertifikat: idNoSertifikat,
        session_id: sessionId,
        published_rows: resultRows.length,
      },
    });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (_) {
      // Keep original error.
    }
    console.error('Error in generateFriabilitySertifikat:', error);
    next(error);
  }
};

module.exports = {
  listSessions,
  getSession,
  getPrintData,
  saveSession,
  approveSession,
  generateFriabilitySertifikat,
};



