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

const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
};

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
    const { qa_id, id_no_sertifikat } = req.query;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'qa_id and id_no_sertifikat are required',
      });
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
      return res.status(404).json({
        success: false,
        message: 'Data not found',
      });
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
    const { qa_id, id_no_sertifikat } = req.query;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'qa_id and id_no_sertifikat are required',
      });
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
      data: results,
    });
  } catch (error) {
    console.error('Error in getHasilKalData:', error);
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
      WHERE A.Parameter_Sertifikasi IN ('Timer', 'Tekanan', 'Temperatur')
        AND (
          A.QA_ID LIKE :search
          OR Assm_nama_instrumen LIKE :search
          OR Assm_No_identitas_Istrumen LIKE :search
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
    const { qa_id, id_no_sertifikat, approver_no } = req.query;

    if (!qa_id || !id_no_sertifikat || approver_no === undefined) {
      return res.status(400).json({
        success: false,
        message: 'qa_id, id_no_sertifikat, and approver_no are required',
      });
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
    const { qa_id, id_no_sertifikat } = req.query;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'qa_id and id_no_sertifikat are required',
      });
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
    const { qa_id, id_no_sertifikat } = req.query;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'qa_id and id_no_sertifikat are required',
      });
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
      return res.status(400).json({
        success: false,
        message: 'approver_id and approver_no are required',
      });
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
    const { qa_id, id_no_sertifikat } = req.query;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'qa_id and id_no_sertifikat are required',
      });
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
      return res.status(404).json({
        success: false,
        message: 'Data not found',
      });
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
    const { qa_id, id_no_sertifikat } = req.query;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'qa_id and id_no_sertifikat are required',
      });
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
      return res.status(404).json({
        success: false,
        message: 'Sertifikat data not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        header: headerResults[0],
        hasil_kal: hasilKalResults,
        approver: approverResults[0] || null,
      },
    });
  } catch (error) {
    console.error('Error in getPrintData:', error);
    next(error);
  }
};

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
      return res.status(400).json({ success: false, message: 'Data belum di pilih' });
    }

    // VBA parity: save is blocked if calibration date or interval is empty.
    if (isEmptyValue(tgl_kalibrasi) || isEmptyValue(interval)) {
      return res.status(400).json({ success: false, message: 'Tanggal Kalibrasi dan interval harus di isi' });
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
      return res.status(400).json({ success: false, message: 'Tidak bisa update sertifikat karena sudah approve' });
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
      return res.status(400).json({ success: false, message: 'Data belum di pilih' });
    }

    if (
      isEmptyValue(pembacaan_alat)
      || isEmptyValue(pembacaan_standar)
      || isEmptyValue(error)
      || isEmptyValue(ketidakpastian)
    ) {
      return res.status(400).json({ success: false, message: 'Data harap di isi semua' });
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
      return res.status(400).json({ success: false, message: 'Tidak bisa update sertifikat karena sudah approve' });
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
        replacements: { qa_id, id_no_sertifikat, seq_id: autoSeqId, pembacaan_alat, pembacaan_standar, error, ketidakpastian, user_id, delegated_to },
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
        replacements: { qa_id, id_no_sertifikat, seq_id, pembacaan_alat, pembacaan_standar, error, ketidakpastian, user_id, delegated_to },
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
    const { qa_id, id_no_sertifikat, seq_id } = req.query;

    if (!qa_id || !id_no_sertifikat || !seq_id) {
      return res.status(400).json({ success: false, message: 'Data belum di pilih' });
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
      return res.status(400).json({ success: false, message: 'Tidak bisa update sertifikat karena sudah approve' });
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
    const { qa_id, id_no_sertifikat, seq_id } = req.query;

    if (!qa_id || !id_no_sertifikat || !seq_id) {
      return res.status(400).json({ success: false, message: 'Data belum di pilih' });
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
      return res.status(400).json({ success: false, message: 'Tidak bisa update sertifikat karena sudah approve' });
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
      return res.status(400).json({ success: false, message: 'Data belum di pilih' });
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
      return res.status(400).json({ success: false, message: 'Belum simpan tanggal kalibrasi, save tanggal' });
    }

    if (!tglResults[0].Interval) {
      return res.status(400).json({ success: false, message: 'Harap isi interval' });
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
      return res.status(400).json({ success: false, message: 'Tidak bisa update sertifikat karena sudah approve' });
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
      return res.status(400).json({ success: false, message: 'Data belum di pilih' });
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
      return res.status(400).json({ success: false, message: 'Tidak bisa reject, data belum approve' });
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
      return res.status(400).json({ success: false, message: 'Data belum di pilih' });
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
      return res.status(400).json({ success: false, message: 'Tidak bisa generate DA karena belum approve' });
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
      return res.status(400).json({ success: false, message: 'Sudah generate DA!' });
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
      return res.status(400).json({ success: false, message: 'Interval tidak boleh nol' });
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
      return res.status(400).json({ success: false, message: 'QA_ID dan parameter_sertifikasi wajib diisi' });
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
      return res.status(400).json({ success: false, message: 'Tidak ada kategori Re-Sertifikasi untuk parameter ini' });
    }

    const noResults = await sequelizeMSQL.query(fnQuery, { type: Sequelize.QueryTypes.SELECT });
    const sNoSertifikat = noResults[0]?.noSertifikat;

    if (!sNoSertifikat) {
      return res.status(500).json({ success: false, message: 'Gagal generate nomor sertifikat baru' });
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
      return res.status(400).json({ success: false, message: 'QA_ID dan ID_No_Sertifikat wajib diisi' });
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
      return res.status(400).json({ success: false, message: 'Tidak bisa Re-Sertifikat karena belum approve' });
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
      return res.status(400).json({ success: false, message: 'Tidak ada kategori Re-Sertifikasi' });
    }

    const noResults = await sequelizeMSQL.query(fnQuery, { type: Sequelize.QueryTypes.SELECT });
    const autoIDNoSertifikat = noResults[0]?.AutoNum;

    if (!autoIDNoSertifikat) {
      return res.status(500).json({ success: false, message: 'Gagal generate nomor sertifikat baru' });
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
      return res.status(400).json({ success: false, message: 'Data belum di pilih' });
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
      return res.status(404).json({ success: false, message: 'Label Terkalibrasi tidak dapat di cetak! Data Sertifikat Kalibrasi belum tersedia' });
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
        paraf_by: `Approved by ${parafNama}`,
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
