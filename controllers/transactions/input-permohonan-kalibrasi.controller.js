const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');
const { uploadFileToFTP, downloadFileFromFTP, deleteFileFromFTP, formatFileName, getFileExtension } = require('../../helpers/ftp.helper');
const fs = require('fs');
const path = require('path');
const { validateAssessmentBody } = require('../../validators/calibration-risk-assessment.validator');
const { calculateDecision } = require('../../services/calibration-risk-assessment.service');

const riskAssessmentSelectColumns = `
  AssessmentID, InstrumentName, InstrumentCode, Location,
  FunctionDescription, Area,
  ImpactsProductQualityCQA, UsedForCPP, UsedForGxPEnvironment,
  UsedForBatchRelease, ImpactsSafety, IsImpactCritical,
  Severity, Probability, Detectability, RPN,
  RiskCategory, SeverityNote, ProbabilityNote, DetectabilityNote, KeteranganKhusus,
  CalibrationDecision, DecisionReason,
  Status, IsDeleted, CreatedBy, CreatedAt, UpdatedBy, UpdatedAt,
  QA_ID, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas,
  Parameter_Kalibrasi, No_Permohonan
`;

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isAllQueryValue(value) {
  return String(value || '').trim().toUpperCase() === 'ALL';
}

function parsePeriodNumber(value, min, max) {
  if (value === undefined || value === null || String(value).trim() === '' || isAllQueryValue(value)) {
    return null;
  }

  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    return null;
  }

  return number;
}

function getDashboardPeriodFilter(query = {}) {
  return {
    year: parsePeriodNumber(query.year ?? query.tahun, 1900, 9999),
    month: parsePeriodNumber(query.month ?? query.bulan, 1, 12),
  };
}

function buildLatestDateFilter(periodFilter, columnName = 'latest_date', keyword = 'WHERE') {
  const conditions = [];
  const replacements = {};

  if (periodFilter.year) {
    conditions.push(`YEAR(${columnName}) = :year`);
    replacements.year = periodFilter.year;
  }

  if (periodFilter.month) {
    conditions.push(`MONTH(${columnName}) = :month`);
    replacements.month = periodFilter.month;
  }

  return {
    clause: conditions.length ? `${keyword} ${conditions.join(' AND ')}` : '',
    replacements,
  };
}

function validatePermohonanPayload(body) {
  const { kategori_permohonan, ket_rekalibrasi, tgl_butuh } = body;

  if (!kategori_permohonan || kategori_permohonan.trim() === '') {
    throw createHttpError(400, 'Kategori Permohonan harus di isi');
  }

  if (!tgl_butuh || String(tgl_butuh).trim() === '') {
    throw createHttpError(400, 'Tanggal butuh harus diisi');
  }

  if (kategori_permohonan === 'Re-Kalibrasi' && (!ket_rekalibrasi || ket_rekalibrasi.trim() === '')) {
    throw createHttpError(400, 'Keterangan Re-Kalibrasi harus di isi!');
  }
}

async function savePermohonanRecord(user, body, transaction) {
  const { user_id, delegated_to, bagian_user } = user;
  const {
    no_permohonan,
    kategori_permohonan,
    qa_id_rekalibrasi,
    ket_rekalibrasi,
    nama_instrumen,
    no_identitas_istrumen,
    no_identitas_kalibrasi,
    alat_ukur_kalibrasi,
    merk,
    kapasitas,
    jumlah,
    fungsi,
    titik_pengukuran,
    lokasi,
    tgl_butuh,
    no_sertifikat_terakhir,
    file_name
  } = body;

  validatePermohonanPayload(body);

  const formattedTglButuh = moment(tgl_butuh).format('YYYY/MM/DD');
  const isNew = !no_permohonan || no_permohonan === 'Auto' || no_permohonan === '';

  if (isNew) {
    const autoNumResults = await sequelizeMSQL.query(
      `SELECT dbo.fnGet_NO_Kal_mohon(:bagian_user) as autoNum`,
      {
        replacements: { bagian_user },
        type: Sequelize.QueryTypes.SELECT,
        transaction,
      }
    );

    const autoNum = autoNumResults[0].autoNum;
    let v_file_name = '';
    if (file_name && file_name.trim() !== '') {
      const fileNameCleaned = autoNum.replace(/\//g, '_');
      v_file_name = file_name.includes('.') ? file_name : `${fileNameCleaned}.${file_name}`;
    }

    await sequelizeMSQL.query(`
      INSERT INTO T_Kalibrasi_Permohonan(
        No_Permohonan, tanggal, kategori_permohonan, QA_ID_rekalibrasi,
        Ket_Rekalibrasi, pemohon, bagian, nama_instrumen,
        No_identitas_Istrumen, No_identitas_kalibrasi, Alat_ukur_kalibrasi,
        Merk, Kapasitas, Jumlah, fungsi, Titik_pengukuran, Lokasi,
        tgl_butuh, no_sertifikat_terakhir, Assm_nama_instrumen,
        Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi,
        Assm_Alat_ukur_kalibrasi, Assm_Merk, Assm_Kapasitas, Assm_Lokasi,
        Titik_pengukuran_kalibrasi, Group_Da_Dept, FILE_NAME, UserID,
        Delegated_To, Process_date
      )
      VALUES(
        :no_permohonan, GETDATE(), :kategori_permohonan, :qa_id_rekalibrasi,
        :ket_rekalibrasi, :user_id, :bagian_user, :nama_instrumen,
        :no_identitas_istrumen, :no_identitas_kalibrasi, :alat_ukur_kalibrasi,
        :merk, :kapasitas, :jumlah, :fungsi, :titik_pengukuran, :lokasi,
        :tgl_butuh, :no_sertifikat_terakhir, :nama_instrumen,
        :no_identitas_istrumen, :no_identitas_kalibrasi,
        :alat_ukur_kalibrasi, :merk, :kapasitas, :lokasi,
        :titik_pengukuran, :bagian_user, :file_name, :user_id,
        :delegated_to, GETDATE()
      )
    `, {
      replacements: {
        no_permohonan: autoNum,
        kategori_permohonan: kategori_permohonan || '',
        qa_id_rekalibrasi: qa_id_rekalibrasi || '',
        ket_rekalibrasi: ket_rekalibrasi || '',
        user_id,
        bagian_user,
        nama_instrumen: nama_instrumen || '',
        no_identitas_istrumen: no_identitas_istrumen || '',
        no_identitas_kalibrasi: no_identitas_kalibrasi || '',
        alat_ukur_kalibrasi: alat_ukur_kalibrasi || '',
        merk: merk || '',
        kapasitas: kapasitas || '',
        jumlah: jumlah || '',
        fungsi: fungsi || '',
        titik_pengukuran: titik_pengukuran || '',
        lokasi: lokasi || '',
        tgl_butuh: formattedTglButuh,
        no_sertifikat_terakhir: no_sertifikat_terakhir || '',
        file_name: v_file_name,
        delegated_to
      },
      type: Sequelize.QueryTypes.INSERT,
      transaction,
    });

    return { no_permohonan: autoNum, isNew: true };
  }

  const approvedResults = await sequelizeMSQL.query(`
    SELECT *
    FROM t_Kalibrasi_Status
    WHERE No_Permohonan = :no_permohonan
      AND Approver_No = 1
  `, {
    replacements: { no_permohonan },
    type: Sequelize.QueryTypes.SELECT,
    transaction,
  });

  if (approvedResults.length > 0) {
    throw createHttpError(400, 'Data sudah approve, tidak bisa diupdate!');
  }

  let fileNameClause = '';
  let v_file_name = '';
  if (file_name && file_name.trim() !== '') {
    const fileNameCleaned = no_permohonan.replace(/\//g, '_');
    v_file_name = file_name.includes('.') ? file_name : `${fileNameCleaned}.${file_name}`;
    fileNameClause = `, FILE_NAME = :file_name`;
  }

  await sequelizeMSQL.query(`
    UPDATE T_Kalibrasi_Permohonan
    SET
      QA_ID_rekalibrasi = :qa_id_rekalibrasi,
      Ket_Rekalibrasi = :ket_rekalibrasi,
      nama_instrumen = :nama_instrumen,
      No_identitas_Istrumen = :no_identitas_istrumen,
      No_identitas_kalibrasi = :no_identitas_kalibrasi,
      Alat_ukur_kalibrasi = :alat_ukur_kalibrasi,
      Merk = :merk,
      Kapasitas = :kapasitas,
      Jumlah = :jumlah,
      fungsi = :fungsi,
      Titik_pengukuran = :titik_pengukuran,
      Lokasi = :lokasi,
      tgl_butuh = :tgl_butuh,
      no_sertifikat_terakhir = :no_sertifikat_terakhir,
      Assm_nama_instrumen = :nama_instrumen,
      Assm_No_identitas_Istrumen = :no_identitas_istrumen,
      Assm_No_identitas_kalibrasi = :no_identitas_kalibrasi,
      Assm_Alat_ukur_kalibrasi = :alat_ukur_kalibrasi,
      Assm_Merk = :merk,
      Assm_Kapasitas = :kapasitas,
      Assm_Lokasi = :lokasi,
      Titik_pengukuran_kalibrasi = :titik_pengukuran${fileNameClause},
      reject_remark = NULL,
      UserID = :user_id,
      Delegated_To = :delegated_to,
      Process_date = GETDATE()
    WHERE No_Permohonan = :no_permohonan
  `, {
    replacements: {
      no_permohonan,
      qa_id_rekalibrasi: qa_id_rekalibrasi || '',
      ket_rekalibrasi: ket_rekalibrasi || '',
      nama_instrumen: nama_instrumen || '',
      no_identitas_istrumen: no_identitas_istrumen || '',
      no_identitas_kalibrasi: no_identitas_kalibrasi || '',
      alat_ukur_kalibrasi: alat_ukur_kalibrasi || '',
      merk: merk || '',
      kapasitas: kapasitas || '',
      jumlah: jumlah || '',
      fungsi: fungsi || '',
      titik_pengukuran: titik_pengukuran || '',
      lokasi: lokasi || '',
      tgl_butuh: formattedTglButuh,
      no_sertifikat_terakhir: no_sertifikat_terakhir || '',
      file_name: v_file_name,
      user_id,
      delegated_to
    },
    type: Sequelize.QueryTypes.UPDATE,
    transaction,
  });

  return { no_permohonan, isNew: false };
}

function buildRiskAssessmentPayload(body, decision, noPermohonan, userId) {
  return {
    instrumentName: body.instrumentName,
    instrumentCode: body.instrumentCode || null,
    location: body.location || null,
    functionDescription: body.functionDescription || null,
    area: body.area || null,
    impactsProductQualityCQA: body.impactAssessment.impactsProductQualityCQA ? 1 : 0,
    usedForCPP: body.impactAssessment.usedForCPP ? 1 : 0,
    usedForGxPEnvironment: body.impactAssessment.usedForGxPEnvironment ? 1 : 0,
    usedForBatchRelease: body.impactAssessment.usedForBatchRelease ? 1 : 0,
    impactsSafety: body.impactAssessment.impactsSafety ? 1 : 0,
    isImpactCritical: decision.isImpactCritical ? 1 : 0,
    severity: decision.isImpactCritical ? null : Number(body.severity),
    probability: decision.isImpactCritical ? null : Number(body.probability),
    detectability: decision.isImpactCritical ? null : Number(body.detectability),
    severityNote: decision.isImpactCritical ? null : (body.severityNote || null),
    probabilityNote: decision.isImpactCritical ? null : (body.probabilityNote || null),
    detectabilityNote: decision.isImpactCritical ? null : (body.detectabilityNote || null),
    keteranganKhusus: decision.riskCategory === 'Sedang' ? (body.keteranganKhusus || null) : null,
    rpn: decision.rpn,
    riskCategory: decision.riskCategory,
    calibrationDecision: decision.calibrationDecision,
    decisionReason: decision.decisionReason,
    status: body.status || 'Draft',
    userId,
    qaId: body.qaId || null,
    assmNoIdentitasKalibrasi: body.assmNoIdentitasKalibrasi || null,
    groupDaDept: body.groupDaDept || null,
    assmKapasitas: body.assmKapasitas || null,
    parameterKalibrasi: body.parameterKalibrasi || null,
    noPermohonan,
  };
}

async function getRiskAssessmentById(assessmentId, transaction) {
  const rows = await sequelizeMSQL.query(`
    SELECT ${riskAssessmentSelectColumns}
    FROM RA_CalibrationAssessment
    WHERE AssessmentID = :assessmentId
      AND IsDeleted = 0
  `, {
    replacements: { assessmentId },
    type: Sequelize.QueryTypes.SELECT,
    transaction,
  });

  return rows[0] || null;
}

async function saveRiskAssessmentRecord(user, body, noPermohonan, transaction) {
  const assessmentId = Number(body.assessmentId || body.AssessmentID || 0);
  const errors = validateAssessmentBody(body);
  if (errors.length > 0) {
    throw createHttpError(400, errors.join(' '));
  }

  const decision = calculateDecision({
    impactAssessment: body.impactAssessment,
    severity: body.severity,
    probability: body.probability,
    detectability: body.detectability,
  });

  const payload = buildRiskAssessmentPayload(body, decision, noPermohonan, user.user_id);
  const replacements = {
    InstrumentName: payload.instrumentName,
    InstrumentCode: payload.instrumentCode,
    Location: payload.location,
    FunctionDescription: payload.functionDescription,
    Area: payload.area,
    ImpactsProductQualityCQA: payload.impactsProductQualityCQA,
    UsedForCPP: payload.usedForCPP,
    UsedForGxPEnvironment: payload.usedForGxPEnvironment,
    UsedForBatchRelease: payload.usedForBatchRelease,
    ImpactsSafety: payload.impactsSafety,
    IsImpactCritical: payload.isImpactCritical,
    Severity: payload.severity,
    Probability: payload.probability,
    Detectability: payload.detectability,
    RPN: payload.rpn,
    RiskCategory: payload.riskCategory,
    SeverityNote: payload.severityNote,
    ProbabilityNote: payload.probabilityNote,
    DetectabilityNote: payload.detectabilityNote,
    KeteranganKhusus: payload.keteranganKhusus,
    CalibrationDecision: payload.calibrationDecision,
    DecisionReason: payload.decisionReason,
    Status: payload.status,
    UserId: payload.userId,
    QA_ID: payload.qaId,
    Assm_No_identitas_kalibrasi: payload.assmNoIdentitasKalibrasi,
    Group_Da_Dept: payload.groupDaDept,
    Assm_Kapasitas: payload.assmKapasitas,
    Parameter_Kalibrasi: payload.parameterKalibrasi,
    No_Permohonan: payload.noPermohonan,
  };

  if (assessmentId > 0) {
    const existing = await getRiskAssessmentById(assessmentId, transaction);
    if (!existing) {
      throw createHttpError(404, 'Assessment not found.');
    }

    await sequelizeMSQL.query(`
      UPDATE RA_CalibrationAssessment
      SET
        InstrumentName = :InstrumentName,
        InstrumentCode = :InstrumentCode,
        Location = :Location,
        FunctionDescription = :FunctionDescription,
        Area = :Area,
        ImpactsProductQualityCQA = :ImpactsProductQualityCQA,
        UsedForCPP = :UsedForCPP,
        UsedForGxPEnvironment = :UsedForGxPEnvironment,
        UsedForBatchRelease = :UsedForBatchRelease,
        ImpactsSafety = :ImpactsSafety,
        IsImpactCritical = :IsImpactCritical,
        Severity = :Severity,
        Probability = :Probability,
        Detectability = :Detectability,
        RPN = :RPN,
        RiskCategory = :RiskCategory,
        SeverityNote = :SeverityNote,
        ProbabilityNote = :ProbabilityNote,
        DetectabilityNote = :DetectabilityNote,
        KeteranganKhusus = :KeteranganKhusus,
        CalibrationDecision = :CalibrationDecision,
        DecisionReason = :DecisionReason,
        QA_ID = :QA_ID,
        Assm_No_identitas_kalibrasi = :Assm_No_identitas_kalibrasi,
        Group_Da_Dept = :Group_Da_Dept,
        Assm_Kapasitas = :Assm_Kapasitas,
        Parameter_Kalibrasi = :Parameter_Kalibrasi,
        No_Permohonan = :No_Permohonan,
        UpdatedBy = :UserId,
        UpdatedAt = GETDATE()
      WHERE AssessmentID = :AssessmentID
        AND IsDeleted = 0
    `, {
      replacements: { ...replacements, AssessmentID: assessmentId },
      type: Sequelize.QueryTypes.UPDATE,
      transaction,
    });

    return getRiskAssessmentById(assessmentId, transaction);
  }

  const insertResult = await sequelizeMSQL.query(`
    INSERT INTO RA_CalibrationAssessment (
      InstrumentName, InstrumentCode, Location, FunctionDescription, Area,
      ImpactsProductQualityCQA, UsedForCPP, UsedForGxPEnvironment,
      UsedForBatchRelease, ImpactsSafety, IsImpactCritical,
      Severity, Probability, Detectability, RPN,
      RiskCategory, SeverityNote, ProbabilityNote, DetectabilityNote, KeteranganKhusus,
      CalibrationDecision, DecisionReason,
      Status, IsDeleted, CreatedBy, CreatedAt,
      QA_ID, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas,
      Parameter_Kalibrasi, No_Permohonan
    )
    VALUES (
      :InstrumentName, :InstrumentCode, :Location, :FunctionDescription, :Area,
      :ImpactsProductQualityCQA, :UsedForCPP, :UsedForGxPEnvironment,
      :UsedForBatchRelease, :ImpactsSafety, :IsImpactCritical,
      :Severity, :Probability, :Detectability, :RPN,
      :RiskCategory, :SeverityNote, :ProbabilityNote, :DetectabilityNote, :KeteranganKhusus,
      :CalibrationDecision, :DecisionReason,
      :Status, 0, :UserId, GETDATE(),
      :QA_ID, :Assm_No_identitas_kalibrasi, :Group_Da_Dept, :Assm_Kapasitas,
      :Parameter_Kalibrasi, :No_Permohonan
    );
    SELECT CAST(SCOPE_IDENTITY() AS INT) AS AssessmentID;
  `, {
    replacements,
    type: Sequelize.QueryTypes.SELECT,
    transaction,
  });

  return getRiskAssessmentById(insertResult[0].AssessmentID, transaction);
}


const getPermohonanKalibrasiList = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { tahun, bagian } = req.query;
    const userDepartment = req.user?.bagian_user || '';

    // Build the SQL query matching the VBA logic exactly
    let query = `
      SELECT
        A.No_Permohonan,
        pemohon,
        bagian,
        CONVERT(varchar(20), tanggal, 13) as tanggal,
        kategori_permohonan,
        nama_instrumen,
        No_identitas_Istrumen,
        No_identitas_kalibrasi,
        Alat_ukur_kalibrasi,
        Merk,
        Kapasitas,
        Jumlah,
        fungsi,
        Titik_pengukuran,
        Lokasi,
        tgl_butuh,
        no_sertifikat_terakhir,
        ISNULL(A.reject_remark, '') as reject_remark,
        dbo.fnGetNamaKaryawan(B.USER_ID) as Approver_Identity,
        CONVERT(varchar(20), B.Process_Date, 13) as Process_Date,
        dbo.fnGetNamaKaryawan(C.USER_ID) as Approver_MgrQA,
        CONVERT(varchar(20), C.Process_Date, 13) as Approver_MgrQADate,
        A.QA_ID,
        A.ID_No_Sertifikat
      FROM T_Kalibrasi_Permohonan as A
      LEFT JOIN (
        SELECT * FROM t_Kalibrasi_Status WHERE Approver_No = 1
      ) as B ON A.No_Permohonan = B.No_Permohonan
      LEFT JOIN (
        SELECT * FROM t_Kalibrasi_Status WHERE Approver_No = 2
      ) as C ON A.No_Permohonan = C.No_Permohonan
      WHERE YEAR(tanggal) LIKE :tahun
        AND 1=1
    `;

    // Apply department filter - same logic as VBA
    // If department is not 'VN', filter by department
    const deptToFilter = bagian || userDepartment;
    if (deptToFilter && deptToFilter !== 'VN') {
      query += ` AND bagian = :bagian`;
    }

    query += ` ORDER BY A.tanggal DESC`;

    const replacements = {
      tahun: tahun ? `%${tahun}%` : '%%',
      bagian: deptToFilter
    };

    const results = await sequelizeMSQL.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });

    // Format the date fields for tgl_butuh to match VBA format (dd-MMM-yyyy)
    const formattedResults = results.map(row => ({
      ...row,
      tgl_butuh: row.tgl_butuh ? moment(row.tgl_butuh).format('DD-MMM-YYYY') : ''
    }));

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: formattedResults,
      count: formattedResults.length
    });

  } catch (error) {
    console.error('Error in getPermohonanKalibrasiList:', error);
    next(error);
  }
};

/**
 * Get Permohonan Kalibrasi Detail (grid_Head_DblClick)
 * Retrieves single calibration request detail by No_Permohonan
 * Based on VBA grid_Head_DblClick function
 */
const getPermohonanDetail = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.query;

    if (!no_permohonan) {
      return res.status(400).json({
        success: false,
        message: 'no_permohonan is required'
      });
    }

    const query = `
      SELECT
        A.pemohon,
        A.bagian,
        A.tanggal,
        A.kategori_permohonan,
        A.QA_ID_rekalibrasi,
        A.Ket_Rekalibrasi,
        A.nama_instrumen,
        A.No_identitas_Istrumen,
        A.No_identitas_kalibrasi,
        A.Alat_ukur_kalibrasi,
        A.Merk,
        A.Kapasitas,
        A.Jumlah,
        A.fungsi,
        A.Titik_pengukuran,
        A.Lokasi,
        A.tgl_butuh,
        A.no_sertifikat_terakhir,
        ISNULL(A.reject_remark, '') as reject_remark,
        RA.AssessmentID as RiskAssessmentID,
        RA.InstrumentName as RiskInstrumentName,
        RA.InstrumentCode as RiskInstrumentCode,
        RA.Location as RiskLocation,
        RA.FunctionDescription as RiskFunctionDescription,
        RA.Area as RiskArea,
        RA.ImpactsProductQualityCQA,
        RA.UsedForCPP,
        RA.UsedForGxPEnvironment,
        RA.UsedForBatchRelease,
        RA.ImpactsSafety,
        RA.IsImpactCritical,
        RA.Severity,
        RA.Probability,
        RA.Detectability,
        RA.RPN,
        RA.RiskCategory,
        RA.SeverityNote,
        RA.ProbabilityNote,
        RA.DetectabilityNote,
        RA.KeteranganKhusus,
        RA.CalibrationDecision,
        RA.DecisionReason,
        RA.Status as RiskStatus,
        RA.QA_ID as RiskQA_ID,
        RA.Assm_No_identitas_kalibrasi as RiskAssm_No_identitas_kalibrasi,
        RA.Group_Da_Dept as RiskGroup_Da_Dept,
        RA.Assm_Kapasitas as RiskAssm_Kapasitas,
        RA.Parameter_Kalibrasi as RiskParameter_Kalibrasi
      FROM T_Kalibrasi_Permohonan A
      LEFT JOIN RA_CalibrationAssessment RA
        ON RA.No_Permohonan = A.No_Permohonan
       AND RA.IsDeleted = 0
      WHERE A.No_Permohonan = :no_permohonan
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data not found'
      });
    }

    const data = results[0];

    // Format dates
    const formattedData = {
      ...data,
      tanggal: data.tanggal ? moment(data.tanggal).format('DD-MMM-YYYY') : '',
      tgl_butuh: data.tgl_butuh ? moment(data.tgl_butuh).format('DD-MMM-YYYY') : ''
    };

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: formattedData
    });

  } catch (error) {
    console.error('Error in getPermohonanDetail:', error);
    next(error);
  }
};

/**
 * Search Instrumen (cmdCari_Nama_Click)
 * Searches instruments across multiple kalibrasi tables
 * Based on VBA cmdCari_Nama_Click function
 */
const searchInstrumen = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { search } = req.query;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: 'search parameter is required'
      });
    }

    const periodFilter = getDashboardPeriodFilter(req.query);
    const dateFilter = buildLatestDateFilter(
      periodFilter,
      'MAX(Kalibrasi_selanjutnya)',
      'HAVING'
    );

    const query = `
      SELECT
        QA_ID,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        MAX(Kalibrasi_selanjutnya) AS Kalibrasi_selanjutnya,
        CASE
          WHEN MAX(ISNULL(Jenis_Kalibrasi, 1)) = 1 THEN 'Internal'
          ELSE 'External'
        END AS Jenis_Kalibrasi,
        CASE
          WHEN MAX(Kalibrasi_selanjutnya) IS NULL THEN 'Unknown'
          WHEN MAX(Kalibrasi_selanjutnya) < GETDATE() THEN 'Overdue'
          WHEN MAX(Kalibrasi_selanjutnya) <= DATEADD(DAY, 30, GETDATE()) THEN 'Due Soon'
          ELSE 'Compliant'
        END AS status
      FROM (
        SELECT DISTINCT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Assm_Lokasi,
          ISNULL(Jenis_Kalibrasi, 1) AS Jenis_Kalibrasi,
          Kalibrasi_selanjutnya
        FROM T_Kalibrasi_DA_Thermohygro

        UNION ALL

        SELECT DISTINCT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Assm_Lokasi,
          ISNULL(Jenis_Kalibrasi, 1) AS Jenis_Kalibrasi,
          Kalibrasi_selanjutnya
        FROM T_Kalibrasi_DA_Anak_Timbangan

        UNION ALL

        SELECT DISTINCT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Assm_Lokasi,
          ISNULL(Jenis_Kalibrasi, 1) AS Jenis_Kalibrasi,
          Kalibrasi_selanjutnya
        FROM T_Kalibrasi_DA_Timbangan

        UNION ALL

        SELECT DISTINCT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Assm_Lokasi,
          ISNULL(Jenis_Kalibrasi, 1) AS Jenis_Kalibrasi,
          Kalibrasi_selanjutnya
        FROM T_Kalibrasi_DA_Bagian

        UNION ALL

        SELECT DISTINCT
          QA_ID,
          InstrumentName AS Assm_nama_instrumen,
          InstrumentCode AS Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Location AS Assm_Lokasi,
          CAST(1 AS INT) AS Jenis_Kalibrasi,
          NULL AS Kalibrasi_selanjutnya
        FROM RA_CalibrationAssessment
        WHERE IsDeleted = 0
      ) AS A
      WHERE (
        QA_ID LIKE :search OR
        Assm_nama_instrumen LIKE :search OR
        Assm_No_identitas_Istrumen LIKE :search OR
        Assm_No_identitas_kalibrasi LIKE :search
      )
      GROUP BY
        QA_ID,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi
      ${dateFilter.clause}
      ORDER BY 1
    `;


    const results = await sequelizeMSQL.query(query, {
      replacements: { search: `%${search}%`, ...dateFilter.replacements },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: results,
      count: results.length
    });

  } catch (error) {
    console.error('Error in searchInstrumen:', error);
    next(error);
  }
};

/**
 * Dashboard Summary
 * Returns Total Alat, Due Soon, Overdue, and Compliant counts
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const periodFilter = getDashboardPeriodFilter(req.query);
    const dateFilter = buildLatestDateFilter(periodFilter);
    const totalQuery = `
      SELECT COUNT(*) as total FROM (
        SELECT *
        FROM (
          SELECT QA_ID, MAX(Kalibrasi_selanjutnya) AS latest_date
          FROM (
            SELECT QA_ID, Kalibrasi_selanjutnya FROM T_Kalibrasi_DA_Thermohygro WHERE Kalibrasi_selanjutnya IS NOT NULL
            UNION ALL
            SELECT QA_ID, Kalibrasi_selanjutnya FROM T_Kalibrasi_DA_Anak_Timbangan WHERE Kalibrasi_selanjutnya IS NOT NULL
            UNION ALL
            SELECT QA_ID, Kalibrasi_selanjutnya FROM T_Kalibrasi_DA_Timbangan WHERE Kalibrasi_selanjutnya IS NOT NULL
            UNION ALL
            SELECT QA_ID, Kalibrasi_selanjutnya FROM T_Kalibrasi_DA_Bagian WHERE Kalibrasi_selanjutnya IS NOT NULL
          ) AS all_dates
          GROUP BY QA_ID
        ) AS latest_per_instrument
        ${dateFilter.clause}
      ) AS filtered_latest
    `;

    const statusQuery = `
      SELECT
        SUM(CASE WHEN latest_date < GETDATE() THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN latest_date >= GETDATE() AND latest_date <= DATEADD(DAY, 30, GETDATE()) THEN 1 ELSE 0 END) AS due_soon,
        SUM(CASE WHEN latest_date > DATEADD(DAY, 30, GETDATE()) THEN 1 ELSE 0 END) AS compliant
      FROM (
        SELECT *
        FROM (
          SELECT QA_ID, MAX(Kalibrasi_selanjutnya) AS latest_date
          FROM (
            SELECT QA_ID, Kalibrasi_selanjutnya FROM T_Kalibrasi_DA_Thermohygro WHERE Kalibrasi_selanjutnya IS NOT NULL
            UNION ALL
            SELECT QA_ID, Kalibrasi_selanjutnya FROM T_Kalibrasi_DA_Anak_Timbangan WHERE Kalibrasi_selanjutnya IS NOT NULL
            UNION ALL
            SELECT QA_ID, Kalibrasi_selanjutnya FROM T_Kalibrasi_DA_Timbangan WHERE Kalibrasi_selanjutnya IS NOT NULL
            UNION ALL
            SELECT QA_ID, Kalibrasi_selanjutnya FROM T_Kalibrasi_DA_Bagian WHERE Kalibrasi_selanjutnya IS NOT NULL
          ) AS all_dates
          GROUP BY QA_ID
        ) AS latest_per_instrument
        ${dateFilter.clause}
      ) AS filtered_latest
    `;

    const [totalResults, statusResults] = await Promise.all([
      sequelizeMSQL.query(totalQuery, {
        type: Sequelize.QueryTypes.SELECT,
        replacements: dateFilter.replacements,
      }),
      sequelizeMSQL.query(statusQuery, {
        type: Sequelize.QueryTypes.SELECT,
        replacements: dateFilter.replacements,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Data fetched successfully",
      data: {
        total_alat: totalResults[0]?.total || 0,
        due_soon: statusResults[0]?.due_soon || 0,
        overdue: statusResults[0]?.overdue || 0,
        compliant: statusResults[0]?.compliant || 0,
      },
    });

  } catch (error) {
    console.error("Error in getDashboardSummary:", error);
    next(error);
  }
};

/**
 * Count Instrumen
 * Returns total count of instruments across all kalibrasi tables
 */
const countInstrumen = async (req, res, next) => {
  try {
    const query = `
      SELECT COUNT(*) as total FROM (
        SELECT DISTINCT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi
        FROM T_Kalibrasi_DA_Thermohygro
        UNION ALL
        SELECT DISTINCT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi
        FROM T_Kalibrasi_DA_Anak_Timbangan
        UNION ALL
        SELECT DISTINCT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi
        FROM T_Kalibrasi_DA_Timbangan
        UNION ALL
        SELECT DISTINCT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi
        FROM T_Kalibrasi_DA_Bagian
        UNION ALL
        SELECT DISTINCT
          QA_ID,
          InstrumentName          AS Assm_nama_instrumen,
          InstrumentCode          AS Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi
        FROM RA_CalibrationAssessment
        WHERE IsDeleted = 0
      ) AS A
    `;

    const results = await sequelizeMSQL.query(query, {
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: {
        total: results[0].total
      }
    });

  } catch (error) {
    console.error('Error in countInstrumen:', error);
    next(error);
  }
};

/**
 * Check Approve Button (sb_approve_button)
 * Checks if user can approve and approval status
 * Based on VBA sb_approve_button function
 */
const checkApproveButton = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan, bagian } = req.query;

    if (!no_permohonan || no_permohonan === 'Auto' || no_permohonan === '') {
      return res.status(200).json({
        success: true,
        data: {
          can_approve: false,
          can_print: false,
          message: 'No permohonan is empty or Auto'
        }
      });
    }

    let canApprove = false;
    let canPrint = false;

    // Check if user is in approver list
    const approverQuery = `
      SELECT *
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode = 'Kal_permohonan'
        AND Appr_No = 1
        AND Appr_ID = :user_id
        AND Appr_DeptID = :bagian
    `;

    const approverResults = await sequelizeMSQL.query(approverQuery, {
      replacements: { user_id, bagian: bagian || bagian_user },
      type: Sequelize.QueryTypes.SELECT,
    });

    const isAllowed = approverResults.length > 0;

    // Check if already approved
    const statusQuery = `
      SELECT COUNT(*) as JumRow
      FROM t_Kalibrasi_Status
      WHERE no_permohonan = :no_permohonan
        AND approver_no = 1
    `;

    const statusResults = await sequelizeMSQL.query(statusQuery, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    const jumRow = statusResults[0].JumRow;

    // Gate departemen: Approve-1 Permohonan Kalibrasi hanya untuk departemen VN.
    const isVN = (bagian || bagian_user) === 'VN';

    if (jumRow === 0 && isAllowed && isVN) {
      canApprove = true;
    }

    // Check if can print (already approved)
    if (jumRow > 0) {
      canPrint = true;
    }

    return res.status(200).json({
      success: true,
      data: {
        can_approve: canApprove,
        can_print: canPrint,
        is_allowed_approver: isAllowed,
        is_vn: isVN,
        approval_count: jumRow
      }
    });

  } catch (error) {
    console.error('Error in checkApproveButton:', error);
    next(error);
  }
};

/**
 * Check Is Approved (fn_IS_approve)
 * Checks if permohonan is already approved
 * Based on VBA fn_IS_approve function
 */
const checkIsApproved = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.query;

    if (!no_permohonan || no_permohonan === 'Auto' || no_permohonan === '') {
      return res.status(200).json({
        success: true,
        data: {
          is_approved: false
        }
      });
    }

    const query = `
      SELECT *
      FROM t_Kalibrasi_Status
      WHERE No_Permohonan = :no_permohonan
        AND Approver_No = 1
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    const isApproved = results.length > 0;

    return res.status(200).json({
      success: true,
      data: {
        is_approved: isApproved,
        approval_data: isApproved ? results[0] : null
      }
    });

  } catch (error) {
    console.error('Error in checkIsApproved:', error);
    next(error);
  }
};

/**
 * Get File Download (sbFill_FileDownload)
 * Gets filename for download
 * Based on VBA sbFill_FileDownload function
 */
const getFileDownload = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.query;

    if (!no_permohonan) {
      return res.status(400).json({
        success: false,
        message: 'no_permohonan is required'
      });
    }

    const query = `
      SELECT TOP 1 ISNULL(FILE_NAME, '') as fileNama
      FROM T_Kalibrasi_Permohonan
      WHERE No_Permohonan = :no_permohonan
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    const fileName = results.length > 0 ? results[0].fileNama : '';

    return res.status(200).json({
      success: true,
      data: {
        file_name: fileName,
        has_file: fileName !== ''
      }
    });

  } catch (error) {
    console.error('Error in getFileDownload:', error);
    next(error);
  }
};

/**
 * Download File Kalibrasi (cmd_download_Click)
 * Downloads file from FTP server
 * Based on VBA cmd_download_Click function
 */
const downloadFileKalibrasi = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.query;

    if (!no_permohonan) {
      return res.status(400).json({
        success: false,
        message: 'no_permohonan is required'
      });
    }

    // Get filename from database (same as sbFill_FileDownload)
    const query = `
      SELECT TOP 1 ISNULL(FILE_NAME, '') as fileNama
      FROM T_Kalibrasi_Permohonan
      WHERE No_Permohonan = :no_permohonan
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (results.length === 0 || !results[0].fileNama) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const fileName = results[0].fileNama;

    // Download file from FTP
    // Create temporary path for download
    const tempDir = path.join(__dirname, '../../tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const localFilePath = path.join(tempDir, fileName);

    // Download from FTP
    const downloadResult = await downloadFileFromFTP(fileName, localFilePath);

    if (!downloadResult.success) {
      return res.status(500).json({
        success: false,
        message: downloadResult.message || 'Error downloading file from FTP'
      });
    }

    // Send file to client
    res.download(localFilePath, fileName, (err) => {
      // Clean up temporary file after sending
      if (fs.existsSync(localFilePath)) {
        try {
          fs.unlinkSync(localFilePath);
        } catch (unlinkErr) {
          console.error('Error deleting temp file:', unlinkErr);
        }
      }

      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          return res.status(500).json({
            success: false,
            message: 'Error sending file'
          });
        }
      }
    });

  } catch (error) {
    console.error('Error in downloadFileKalibrasi:', error);
    next(error);
  }
};

/**
 * Save Permohonan Kalibrasi (cmd_Save_Click)
 * Handles both INSERT (new) and UPDATE operations
 * Based on VBA cmd_Save_Click function
 */
const savePermohonanKalibrasi = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const {
      no_permohonan,
      kategori_permohonan,
      qa_id_rekalibrasi,
      ket_rekalibrasi,
      nama_instrumen,
      no_identitas_istrumen,
      no_identitas_kalibrasi,
      alat_ukur_kalibrasi,
      merk,
      kapasitas,
      jumlah,
      fungsi,
      titik_pengukuran,
      lokasi,
      tgl_butuh,
      no_sertifikat_terakhir,
      file_name
    } = req.body;

    // Validation 1: Kategori Permohonan required
    if (!kategori_permohonan || kategori_permohonan.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Kategori Permohonan harus di isi'
      });
    }

    // Validation 2: Tanggal butuh required
    if (!tgl_butuh || tgl_butuh.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Tanggal butuh harus diisi'
      });
    }

    // Validation 3: If Re-Kalibrasi, keterangan required
    if (kategori_permohonan === 'Re-Kalibrasi' && (!ket_rekalibrasi || ket_rekalibrasi.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Keterangan Re-Kalibrasi harus di isi!'
      });
    }

    // Format tgl_butuh to yyyy/MM/dd
    const formattedTglButuh = moment(tgl_butuh).format('YYYY/MM/DD');

    // Check if this is INSERT (new) or UPDATE
    const isNew = !no_permohonan || no_permohonan === 'Auto' || no_permohonan === '';

    if (isNew) {
      // INSERT NEW RECORD
      // Get auto number using fnGet_NO_Kal_mohon function
      const autoNumQuery = `SELECT dbo.fnGet_NO_Kal_mohon(:bagian_user) as autoNum`;
      const autoNumResults = await sequelizeMSQL.query(autoNumQuery, {
        replacements: { bagian_user },
        type: Sequelize.QueryTypes.SELECT,
      });

      const autoNum = autoNumResults[0].autoNum;

      // Prepare file name if file uploaded
      let v_file_name = '';
      if (file_name && file_name.trim() !== '') {
        // Replace / with _ in auto number and append extension
        const fileNameCleaned = autoNum.replace(/\//g, '_');
        v_file_name = file_name.includes('.') ? file_name : `${fileNameCleaned}.${file_name}`;
      }

      // INSERT query - exact match to VBA
      const insertQuery = `
        INSERT INTO T_Kalibrasi_Permohonan(
          No_Permohonan,
          tanggal,
          kategori_permohonan,
          QA_ID_rekalibrasi,
          Ket_Rekalibrasi,
          pemohon,
          bagian,
          nama_instrumen,
          No_identitas_Istrumen,
          No_identitas_kalibrasi,
          Alat_ukur_kalibrasi,
          Merk,
          Kapasitas,
          Jumlah,
          fungsi,
          Titik_pengukuran,
          Lokasi,
          tgl_butuh,
          no_sertifikat_terakhir,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Assm_Alat_ukur_kalibrasi,
          Assm_Merk,
          Assm_Kapasitas,
          Assm_Lokasi,
          Titik_pengukuran_kalibrasi,
          Group_Da_Dept,
          FILE_NAME,
          UserID,
          Delegated_To,
          Process_date
        )
        VALUES(
          :no_permohonan,
          GETDATE(),
          :kategori_permohonan,
          :qa_id_rekalibrasi,
          :ket_rekalibrasi,
          :user_id,
          :bagian_user,
          :nama_instrumen,
          :no_identitas_istrumen,
          :no_identitas_kalibrasi,
          :alat_ukur_kalibrasi,
          :merk,
          :kapasitas,
          :jumlah,
          :fungsi,
          :titik_pengukuran,
          :lokasi,
          :tgl_butuh,
          :no_sertifikat_terakhir,
          :nama_instrumen,
          :no_identitas_istrumen,
          :no_identitas_kalibrasi,
          :alat_ukur_kalibrasi,
          :merk,
          :kapasitas,
          :lokasi,
          :titik_pengukuran,
          :bagian_user,
          :file_name,
          :user_id,
          :delegated_to,
          GETDATE()
        )
      `;

      await sequelizeMSQL.query(insertQuery, {
        replacements: {
          no_permohonan: autoNum,
          kategori_permohonan: kategori_permohonan || '',
          qa_id_rekalibrasi: qa_id_rekalibrasi || '',
          ket_rekalibrasi: ket_rekalibrasi || '',
          user_id: user_id,
          bagian_user: bagian_user,
          nama_instrumen: nama_instrumen || '',
          no_identitas_istrumen: no_identitas_istrumen || '',
          no_identitas_kalibrasi: no_identitas_kalibrasi || '',
          alat_ukur_kalibrasi: alat_ukur_kalibrasi || '',
          merk: merk || '',
          kapasitas: kapasitas || '',
          jumlah: jumlah || '',
          fungsi: fungsi || '',
          titik_pengukuran: titik_pengukuran || '',
          lokasi: lokasi || '',
          tgl_butuh: formattedTglButuh,
          no_sertifikat_terakhir: no_sertifikat_terakhir || '',
          file_name: v_file_name,
          delegated_to: delegated_to
        },
        type: Sequelize.QueryTypes.INSERT,
      });

      return res.status(201).json({
        success: true,
        message: 'Data has been saved',
        data: {
          no_permohonan: autoNum
        }
      });

    } else {
      // UPDATE EXISTING RECORD
      // Check if already approved - cannot update if approved
      const checkApprovedQuery = `
        SELECT *
        FROM t_Kalibrasi_Status
        WHERE No_Permohonan = :no_permohonan
          AND Approver_No = 1
      `;

      const approvedResults = await sequelizeMSQL.query(checkApprovedQuery, {
        replacements: { no_permohonan },
        type: Sequelize.QueryTypes.SELECT,
      });

      if (approvedResults.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Data sudah approve, tidak bisa diupdate!'
        });
      }

      // Prepare file name update clause
      let fileNameClause = '';
      let v_file_name = '';
      if (file_name && file_name.trim() !== '') {
        const fileNameCleaned = no_permohonan.replace(/\//g, '_');
        v_file_name = file_name.includes('.') ? file_name : `${fileNameCleaned}.${file_name}`;
        fileNameClause = `, FILE_NAME = :file_name`;
      }

      // UPDATE query - exact match to VBA
      const updateQuery = `
        UPDATE T_Kalibrasi_Permohonan
        SET
          QA_ID_rekalibrasi = :qa_id_rekalibrasi,
          Ket_Rekalibrasi = :ket_rekalibrasi,
          nama_instrumen = :nama_instrumen,
          No_identitas_Istrumen = :no_identitas_istrumen,
          No_identitas_kalibrasi = :no_identitas_kalibrasi,
          Alat_ukur_kalibrasi = :alat_ukur_kalibrasi,
          Merk = :merk,
          Kapasitas = :kapasitas,
          Jumlah = :jumlah,
          fungsi = :fungsi,
          Titik_pengukuran = :titik_pengukuran,
          Lokasi = :lokasi,
          tgl_butuh = :tgl_butuh,
          no_sertifikat_terakhir = :no_sertifikat_terakhir,
          Assm_nama_instrumen = :nama_instrumen,
          Assm_No_identitas_Istrumen = :no_identitas_istrumen,
          Assm_No_identitas_kalibrasi = :no_identitas_kalibrasi,
          Assm_Alat_ukur_kalibrasi = :alat_ukur_kalibrasi,
          Assm_Merk = :merk,
          Assm_Kapasitas = :kapasitas,
          Assm_Lokasi = :lokasi,
          Titik_pengukuran_kalibrasi = :titik_pengukuran${fileNameClause},
          reject_remark = NULL,
          UserID = :user_id,
          Delegated_To = :delegated_to,
          Process_date = GETDATE()
        WHERE No_Permohonan = :no_permohonan
      `;

      await sequelizeMSQL.query(updateQuery, {
        replacements: {
          no_permohonan,
          qa_id_rekalibrasi: qa_id_rekalibrasi || '',
          ket_rekalibrasi: ket_rekalibrasi || '',
          nama_instrumen: nama_instrumen || '',
          no_identitas_istrumen: no_identitas_istrumen || '',
          no_identitas_kalibrasi: no_identitas_kalibrasi || '',
          alat_ukur_kalibrasi: alat_ukur_kalibrasi || '',
          merk: merk || '',
          kapasitas: kapasitas || '',
          jumlah: jumlah || '',
          fungsi: fungsi || '',
          titik_pengukuran: titik_pengukuran || '',
          lokasi: lokasi || '',
          tgl_butuh: formattedTglButuh,
          no_sertifikat_terakhir: no_sertifikat_terakhir || '',
          file_name: v_file_name,
          user_id: user_id,
          delegated_to: delegated_to
        },
        type: Sequelize.QueryTypes.UPDATE,
      });

      return res.status(200).json({
        success: true,
        message: 'Data has been updated',
        data: {
          no_permohonan
        }
      });
    }

  } catch (error) {
    console.error('Error in savePermohonanKalibrasi:', error);
    next(error);
  }
};

const savePermohonanKalibrasiWithRiskAssessment = async (req, res, next) => {
  try {
    const { permohonan, riskAssessment } = req.body;

    if (!permohonan || typeof permohonan !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'permohonan payload is required'
      });
    }

    if (!riskAssessment || typeof riskAssessment !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'riskAssessment payload is required'
      });
    }

    const result = await sequelizeMSQL.transaction(async (transaction) => {
      const savedPermohonan = await savePermohonanRecord(req.user, permohonan, transaction);
      const savedRiskAssessment = await saveRiskAssessmentRecord(
        req.user,
        riskAssessment,
        savedPermohonan.no_permohonan,
        transaction
      );

      return {
        no_permohonan: savedPermohonan.no_permohonan,
        risk_assessment: savedRiskAssessment,
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Permohonan kalibrasi and risk assessment have been saved',
      data: result
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    console.error('Error in savePermohonanKalibrasiWithRiskAssessment:', error);
    next(error);
  }
};

/**
 * Delete Permohonan Kalibrasi (cmd_Del_Click)
 * Deletes calibration request if not approved
 * Based on VBA cmd_Del_Click function
 */
const deletePermohonanKalibrasi = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.body;

    // Validation 1: no_permohonan required
    if (!no_permohonan || no_permohonan === 'Auto' || no_permohonan === '') {
      return res.status(400).json({
        success: false,
        message: 'Harap pilih data yang akan dihapus'
      });
    }

    // Validation 2: Check if already approved - cannot delete if approved
    const checkApprovedQuery = `
      SELECT *
      FROM t_Kalibrasi_Status
      WHERE No_Permohonan = :no_permohonan
        AND Approver_No = 1
    `;

    const approvedResults = await sequelizeMSQL.query(checkApprovedQuery, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approvedResults.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Data sudah approve, tidak bisa dihapus!'
      });
    }

    // Delete query - exact match to VBA
    const deleteQuery = `
      DELETE FROM T_Kalibrasi_Permohonan
      WHERE No_Permohonan = :no_permohonan
    `;

    await sequelizeMSQL.query(deleteQuery, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been deleted',
      data: {
        no_permohonan
      }
    });

  } catch (error) {
    console.error('Error in deletePermohonanKalibrasi:', error);
    next(error);
  }
};

/**
 * Approve Permohonan Kalibrasi (cmd_Approve_Click)
 * Approves calibration request by inserting approval record
 * Based on VBA cmd_Approve_Click function
 */
const approvePermohonanKalibrasi = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.body;

    // Validation: no_permohonan required
    if (!no_permohonan || no_permohonan === 'Auto' || no_permohonan === '') {
      return res.status(400).json({
        success: false,
        message: 'Harap pilih data yang akan di Approve!'
      });
    }

    // Gate otoritatif: Approve-1 hanya untuk departemen VN yang terdaftar sebagai
    // Approver-1 di m_approver_lines. Mencegah bypass langsung ke endpoint.
    if (bagian_user !== 'VN') {
      return res.status(403).json({
        success: false,
        message: 'Approve hanya dapat dilakukan oleh departemen VN!'
      });
    }

    const approverCheckQuery = `
      SELECT 1
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode = 'Kal_permohonan'
        AND Appr_No = 1
        AND Appr_ID = :user_id
        AND Appr_DeptID = :bagian_user
    `;

    const approverCheck = await sequelizeMSQL.query(approverCheckQuery, {
      replacements: { user_id, bagian_user },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approverCheck.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak terdaftar sebagai Approver-1 untuk departemen VN!'
      });
    }

    // Get approver identity using fnApprIdentity equivalent
    const approverIdentityQuery = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Permohonan'
        AND Appr_ID = :user_id
        AND Appr_No = 1
    `;

    const approverResults = await sequelizeMSQL.query(approverIdentityQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const appr_ident = approverResults.length > 0 ? approverResults[0].Appr_Identity : '0';

    // Insert approval record - exact match to VBA
    const insertApprovalQuery = `
      INSERT INTO t_Kalibrasi_Status(
        No_Permohonan,
        Approver_No,
        isReject,
        Approver_Identity,
        Process_Date,
        User_ID,
        Delegated_To,
        flag_update
      )
      VALUES(
        :no_permohonan,
        1,
        0,
        :approver_identity,
        GETDATE(),
        :user_id,
        :delegated_to,
        NULL
      )
    `;

    await sequelizeMSQL.query(insertApprovalQuery, {
      replacements: {
        no_permohonan,
        approver_identity: appr_ident,
        user_id: user_id,
        delegated_to: delegated_to
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been approved',
      data: {
        no_permohonan,
        approver_identity: appr_ident
      }
    });

  } catch (error) {
    console.error('Error in approvePermohonanKalibrasi:', error);
    next(error);
  }
};

/**
 * Helper function: Get Approver Identity (fnApprIdentity)
 * Gets approver identity from m_approver_lines
 * Based on VBA fnApprIdentity function
 */
const getApproverIdentity = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { approver_no } = req.query;

    const appr_no = approver_no || '1';

    const query = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Permohonan'
        AND Appr_ID = :user_id
        AND Appr_No = :approver_no
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        user_id,
        approver_no: appr_no
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    const approverIdentity = results.length > 0 ? results[0].Appr_Identity : '0';

    return res.status(200).json({
      success: true,
      data: {
        approver_identity: approverIdentity,
        has_approval_right: results.length > 0
      }
    });

  } catch (error) {
    console.error('Error in getApproverIdentity:', error);
    next(error);
  }
};

/**
 * Upload File for Kalibrasi Permohonan (fnUploadFile)
 * Uploads a file to FTP server with formatted filename
 * Based on VBA fnUploadFile function
 */
const uploadFileKalibrasi = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!no_permohonan) {
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'No_Permohonan is required'
      });
    }

    const localFilePath = path.resolve(req.file.path);
    const originalFileName = req.file.originalname;

    console.log('Upload details:', {
      localFilePath,
      exists: fs.existsSync(localFilePath),
      originalFileName,
      no_permohonan
    });

    if (!fs.existsSync(localFilePath)) {
      return res.status(500).json({
        success: false,
        message: 'Uploaded file not found on server'
      });
    }

    const remoteFileName = formatFileName(no_permohonan, originalFileName);

    const uploadResult = await uploadFileToFTP(localFilePath, remoteFileName);

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: uploadResult.message || 'Error uploading file to FTP'
      });
    }

    const updateQuery = `
      UPDATE T_Kalibrasi_Permohonan
      SET FILE_NAME = :fileName
      WHERE No_Permohonan = :no_permohonan
    `;

    await sequelizeMSQL.query(updateQuery, {
      replacements: {
        fileName: remoteFileName,
        no_permohonan
      },
      type: Sequelize.QueryTypes.UPDATE
    });

    return res.status(200).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        file_name: remoteFileName,
        no_permohonan
      }
    });

  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error in uploadFileKalibrasi:', error);
    next(error);
  }
};

const deleteFileKalibrasi = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.body;

    if (!no_permohonan) {
      return res.status(400).json({
        success: false,
        message: 'No_Permohonan is required'
      });
    }

    const checkQuery = `
      SELECT
        FILE_NAME,
        No_Permohonan
      FROM T_Kalibrasi_Permohonan
      WHERE No_Permohonan = :no_permohonan
    `;

    const [permohonan] = await sequelizeMSQL.query(checkQuery, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT
    });

    if (!permohonan) {
      return res.status(404).json({
        success: false,
        message: 'Permohonan not found'
      });
    }

    if (!permohonan.FILE_NAME || permohonan.FILE_NAME === '') {
      return res.status(400).json({
        success: false,
        message: 'File not found'
      });
    }

    const checkApprovalQuery = `
      SELECT *
      FROM t_Kalibrasi_Status
      WHERE No_Permohonan = :no_permohonan
        AND Approver_No = 1
    `;

    const approvalRecords = await sequelizeMSQL.query(checkApprovalQuery, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT
    });

    if (approvalRecords.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Data sudah approve, tidak bisa hapus file!'
      });
    }

    const updateQuery = `
      UPDATE T_Kalibrasi_Permohonan
      SET FILE_NAME = ''
      WHERE No_Permohonan = :no_permohonan
    `;

    await sequelizeMSQL.query(updateQuery, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.UPDATE
    });

    return res.status(200).json({
      success: true,
      message: 'File has been deleted',
      data: {
        no_permohonan,
        file_name: ''
      }
    });

  } catch (error) {
    console.error('Error in deleteFileKalibrasi:', error);
    next(error);
  }
};

module.exports = {
  getPermohonanKalibrasiList,
  getPermohonanDetail,
  searchInstrumen,
  countInstrumen,
  getDashboardSummary,
  checkApproveButton,
  checkIsApproved,
  getFileDownload,
  downloadFileKalibrasi,
  savePermohonanKalibrasi,
  savePermohonanKalibrasiWithRiskAssessment,
  deletePermohonanKalibrasi,
  approvePermohonanKalibrasi,
  getApproverIdentity,
  uploadFileKalibrasi,
  deleteFileKalibrasi
};
