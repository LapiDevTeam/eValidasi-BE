'use strict';

const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');

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
        Status,
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

function parseCalibrationDate(value) {
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
  try {
    const { user_id, delegated_to } = req.user;
    const body = req.body || {};
    const sessionId = Number(req.params.sessionId || body.sessionId || body.Session_ID || 0);
    const qaId = pickValue(body, 'qa_id', 'qaId', 'QA_ID');
    const idNoSertifikat = pickValue(
      body,
      'id_no_sertifikat',
      'idNoSertifikat',
      'ID_No_Sertifikat'
    );

    if (!qaId || !idNoSertifikat) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID and ID_No_Sertifikat are required',
      });
    }

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

    const current = await fetchWorkbookHeaderData(qaId, idNoSertifikat, user_id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: 'Data not found',
      });
    }

    if (!current.permissions?.canSaveSession) {
      return res.status(403).json({
        success: false,
        message: 'Tidak bisa simpan workbook karena sudah approve atau user tidak memiliki akses input',
      });
    }

    const workbookPayload = body.workbookPayload || {
      header: body.header || null,
      includeRh: Boolean(body.includeRh),
      channels: body.channels || {},
    };
    const channels = workbookPayload.channels || body.channels || {};
    const suhuChannel = channels.suhu || {};
    const rhChannel = channels.rh || {};
    const calculationResult = body.calculationResult || null;
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
      status: normalizeStatus(body.status, Boolean(calculationResult)),
      userId: user_id,
      delegatedTo: delegated_to,
    };

    let savedSessionId = sessionId;

    if (sessionId) {
      const existing = await fetchSessionById(sessionId);
      if (
        !existing ||
        existing.QA_ID !== qaId ||
        existing.ID_No_Sertifikat !== idNoSertifikat
      ) {
        return res.status(404).json({
          success: false,
          message: 'Session not found for this certificate',
        });
      }

      await sequelizeMSQL.query(
        `
          UPDATE ${SESSION_TABLE}
          SET
            Include_RH = :includeRh,
            Suhu_Repeat_Count = :suhuRepeatCount,
            RH_Repeat_Count = :rhRepeatCount,
            Suhu_Unit = :suhuUnit,
            RH_Unit = :rhUnit,
            Suhu_Coefficient_Mode = :suhuCoefficientMode,
            RH_Coefficient_Mode = :rhCoefficientMode,
            Workbook_Payload_JSON = :workbookPayloadJson,
            Calculation_Result_JSON = :calculationResultJson,
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
            Status,
            UserID,
            Delegated_To,
            Process_Date
          )
          OUTPUT INSERTED.Session_ID
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
            :status,
            :userId,
            :delegatedTo,
            GETDATE()
          )
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
      message: 'Workbook session saved successfully',
      data: session,
    });
  } catch (error) {
    console.error('Error in thermohygrometer saveSession:', error);
    next(error);
  }
};

const listSessions = async (req, res, next) => {
  try {
    const { qa_id: qaId, id_no_sertifikat: idNoSertifikat } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

    if (!qaId || !idNoSertifikat) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID and ID_No_Sertifikat are required',
      });
    }

    if (!(await sessionTableExists())) {
      return res.status(200).json({
        success: true,
        data: [],
        count: 0,
        tableReady: false,
      });
    }

    const rows = await sequelizeMSQL.query(
      `
        SELECT TOP ${limit}
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
          Status,
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

module.exports = {
  searchCertificates,
  getWorkbookHeader,
  saveWorkbookHeader,
  listSessions,
  getSession,
  saveSession,
};
