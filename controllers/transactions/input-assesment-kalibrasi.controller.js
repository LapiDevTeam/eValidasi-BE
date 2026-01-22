const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');
const { uploadFileToFTP, downloadFileFromFTP, formatFileName, getFileExtension } = require('../../helpers/ftp.helper');
const fs = require('fs');
const path = require('path');

/**
 * Search Permohonan for Assessment (cmd_Cari_Pemohon_Click)
 * Search for permohonan kalibrasi that have been approved by Approver 1 but not yet by Approver 2
 * Uses req.query for search parameter
 */
const searchPermohonanAssesment = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { search } = req.query;

    const searchTerm = search || '';

    // Query matches the VBA cmd_Cari_Pemohon_Click function
    const query = `
      SELECT
        A.No_Permohonan,
        A.tanggal,
        A.kategori_permohonan,
        A.pemohon,
        A.bagian,
        A.Assm_nama_instrumen,
        A.Assm_No_identitas_Istrumen,
        A.Assm_No_identitas_kalibrasi,
        A.Assm_Alat_ukur_kalibrasi,
        A.Assm_Merk,
        A.Assm_Kapasitas,
        A.Jumlah,
        A.fungsi,
        A.Titik_pengukuran_kalibrasi,
        A.Assm_Lokasi,
        A.tgl_butuh,
        A.no_sertifikat_terakhir,
        A.RENCANA_EKSEKUSI,
        A.Jenis_kalibrasi,
        A.Jenis_External,
        A.Program_verifikasi,
        A.Pelaksana_Verifikasi,
        A.Titik_verifikasi,
        A.Titik_pengukuran_kalibrasi,
        A.Keterangan,
        A.Group_DA,
        A.Group_Da_Dept,
        A.Parameter_Sertifikasi,
        C.User_ID,
        C.Process_Date
      FROM T_Kalibrasi_Permohonan AS A
      RIGHT OUTER JOIN (
        SELECT No_Permohonan, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, flag_update
        FROM t_Kalibrasi_Status
        WHERE Approver_No = 1
      ) AS B ON A.No_Permohonan = B.No_Permohonan AND B.Approver_No = 1
      LEFT JOIN (
        SELECT * FROM t_Kalibrasi_Status WHERE Approver_No = 2
      ) AS C ON A.No_Permohonan = C.No_Permohonan
      WHERE A.No_Permohonan LIKE :search
        AND C.Approver_Identity IS NULL
      ORDER BY A.tanggal DESC
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { search: `%${searchTerm}%` },
      type: Sequelize.QueryTypes.SELECT,
    });

    // Format dates
    const formattedResults = results.map(row => ({
      ...row,
      tanggal: row.tanggal ? moment(row.tanggal).format('DD-MMM-YYYY') : '',
      tgl_butuh: row.tgl_butuh ? moment(row.tgl_butuh).format('DD-MMM-YYYY') : '',
      RENCANA_EKSEKUSI: row.RENCANA_EKSEKUSI ? moment(row.RENCANA_EKSEKUSI).format('DD-MMM-YYYY') : '',
      Process_Date: row.Process_Date ? moment(row.Process_Date).format('DD-MMM-YYYY HH:mm:ss') : ''
    }));

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: formattedResults,
      count: formattedResults.length
    });

  } catch (error) {
    console.error('Error in searchPermohonanAssesment:', error);
    next(error);
  }
};

/**
 * Get Permohonan Detail for Assessment (sb_Isi_Data)
 * Retrieve detailed information for a specific permohonan
 * Uses req.query for no_permohonan parameter
 */
const getPermohonanAssesmentDetail = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.query;

    if (!no_permohonan) {
      return res.status(400).json({
        success: false,
        message: 'no_permohonan is required'
      });
    }

    // Query matches the VBA sb_Isi_Data function
    const query = `
      SELECT
        No_Permohonan,
        kategori_permohonan,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Assm_Alat_ukur_kalibrasi,
        Assm_Merk,
        Assm_Kapasitas,
        Assm_Lokasi,
        RENCANA_EKSEKUSI,
        ISNULL(Jenis_kalibrasi, 0) as Jenis_kalibrasi,
        Jenis_External,
        ISNULL(Program_verifikasi, 0) as Program_verifikasi,
        Pelaksana_Verifikasi,
        Titik_verifikasi,
        Titik_pengukuran_kalibrasi,
        Keterangan,
        Group_DA,
        Group_Da_Dept,
        Parameter_Sertifikasi,
        Parameter_Kalibrasi,
        Parameter_No_id_anak_timbang,
        Parameter_Interval,
        Parameter_kriteria,
        ISNULL(file_name, '') as file_name
      FROM T_Kalibrasi_Permohonan
      WHERE No_Permohonan = :no_permohonan
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Permohonan not found'
      });
    }

    const data = results[0];

    // Format RENCANA_EKSEKUSI date
    if (data.RENCANA_EKSEKUSI) {
      data.RENCANA_EKSEKUSI = moment(data.RENCANA_EKSEKUSI).format('DD-MMM-YYYY');
    }

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: data
    });

  } catch (error) {
    console.error('Error in getPermohonanAssesmentDetail:', error);
    next(error);
  }
};

/**
 * Get Assessment List (sb_Show_Grid)
 * Retrieve list of approved permohonan (Approver_No = 2)
 * Uses req.query for tahun and optional department filtering
 */
const getAssesmentList = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { tahun } = req.query;

    // Determine department filter - if VN, show all
    let vDept = '';
    if (bagian_user !== 'VN') {
      vDept = bagian_user;
    }

    const yearFilter = tahun || '';

    // Query matches the VBA sb_Show_Grid function
    const query = `
      SELECT
        A.No_Permohonan,
        tanggal,
        kategori_permohonan,
        bagian,
        REPLACE(CONVERT(CHAR(11), CAST(A.RENCANA_EKSEKUSI as datetime), 106), ' ', '-') as RENCANA_EKSEKUSI,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Assm_Merk,
        Assm_Kapasitas,
        Assm_Lokasi,
        CASE
          WHEN ISNULL(jenis_kalibrasi, 0) = 1 THEN 'Internal'
          WHEN ISNULL(jenis_kalibrasi, 0) = 2 THEN 'External'
          ELSE ''
        END as jenis_kalibrasi,
        Jenis_External,
        CASE
          WHEN ISNULL(Program_verifikasi, 0) = 1 THEN 'Ya'
          WHEN ISNULL(Program_verifikasi, 0) = 2 THEN 'Tidak'
          ELSE ''
        END as Program_verifikasi,
        Titik_verifikasi,
        Titik_pengukuran_kalibrasi,
        Group_DA,
        Group_Da_Dept,
        parameter_sertifikasi,
        Parameter_Kalibrasi,
        Parameter_No_id_anak_timbang,
        Parameter_Interval,
        Parameter_kriteria,
        Keterangan,
        QA_ID,
        ID_No_Sertifikat,
        dbo.fnGetNamaKaryawan(B.User_ID) as UserAppr2,
        CONVERT(varchar(20), B.Process_Date, 13) as Appr2Date
      FROM T_Kalibrasi_Permohonan as A
      RIGHT JOIN (
        SELECT * FROM T_Kalibrasi_Status WHERE Approver_No = 2
      ) as B ON A.No_Permohonan = B.No_Permohonan
      WHERE bagian LIKE :bagian
        AND YEAR(A.tanggal) LIKE :tahun
      ORDER BY A.tanggal DESC
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        bagian: `%${vDept}%`,
        tahun: `%${yearFilter}%`
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    // Format tanggal
    const formattedResults = results.map(row => ({
      ...row,
      tanggal: row.tanggal ? moment(row.tanggal).format('DD-MMM-YYYY') : ''
    }));

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: formattedResults,
      count: formattedResults.length
    });

  } catch (error) {
    console.error('Error in getAssesmentList:', error);
    next(error);
  }
};

/**
 * Check if Permohonan is Approved (fn_IS_approve)
 * Check if permohonan has been approved by Approver_No = 2
 * Uses req.query for no_permohonan parameter
 */
const checkIsApproved = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.query;

    if (!no_permohonan) {
      return res.status(400).json({
        success: false,
        message: 'no_permohonan is required'
      });
    }

    // Query matches the VBA fn_IS_approve function
    const query = `
      SELECT *
      FROM t_Kalibrasi_Status
      WHERE No_Permohonan = :no_permohonan
        AND Approver_No = 2
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    const isApproved = results.length > 0;

    return res.status(200).json({
      success: true,
      message: 'Check completed',
      data: {
        no_permohonan,
        is_approved: isApproved
      }
    });

  } catch (error) {
    console.error('Error in checkIsApproved:', error);
    next(error);
  }
};

/**
 * Get Approver Identity (fnApprIdentity)
 * Retrieve approver identity for a specific user and approver number
 * Uses req.query for approver_no parameter (defaults to 2 for assessment)
 */
const getApproverIdentity = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { approver_no } = req.query;

    const vAppr_No = approver_no || '2'; // Default to 2 for assessment
    const vAppr_ApplicationCode = 'KAL_Permohonan';

    // Query matches the VBA fnApprIdentity function
    const query = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE :applicationCode
        AND Appr_ID = :userId
        AND Appr_No = :approverNo
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        applicationCode: vAppr_ApplicationCode,
        userId: user_id,
        approverNo: vAppr_No
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    const apprIdentity = results.length > 0 ? results[0].Appr_Identity : 0;

    return res.status(200).json({
      success: true,
      message: 'Approver identity fetched successfully',
      data: {
        approver_identity: apprIdentity,
        user_id: user_id,
        approver_no: vAppr_No
      }
    });

  } catch (error) {
    console.error('Error in getApproverIdentity:', error);
    next(error);
  }
};

/**
 * Check if User is Allowed to Input (fnIsAllowInput)
 * Check if the current user has permission to input/modify data
 * Uses req.user for user_id
 */
const checkAllowInput = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

    // Query matches the VBA fnIsAllowInput function
    const query = `
      SELECT COUNT(*) as jumRow
      FROM m_approver_lines
      WHERE isActive = 1
        AND Appr_ApplicationCode IN ('KAL_Allow_Input')
        AND Appr_ID = :userId
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { userId: user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const allowCount = results[0].jumRow;
    const isAllowed = allowCount > 0;

    return res.status(200).json({
      success: true,
      message: 'Check completed',
      data: {
        user_id: user_id,
        is_allowed: isAllowed,
        allow_count: allowCount
      }
    });

  } catch (error) {
    console.error('Error in checkAllowInput:', error);
    next(error);
  }
};

/**
 * Approve Permohonan Assessment (cmd_Approve_Click)
 * Insert approval record for Approver_No = 2
 * Uses req.body for no_permohonan
 */
const approvePermohonanAssesment = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.body;

    if (!no_permohonan) {
      return res.status(400).json({
        success: false,
        message: 'no_permohonan is required'
      });
    }

    // Get approver identity
    const approverIdentityQuery = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Permohonan'
        AND Appr_ID = :userId
        AND Appr_No = '2'
    `;

    const approverResults = await sequelizeMSQL.query(approverIdentityQuery, {
      replacements: { userId: user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const vAppr_ident = approverResults.length > 0 ? approverResults[0].Appr_Identity : '';

    // Insert approval record - matches VBA cmd_Approve_Click
    const insertQuery = `
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
        2,
        0,
        :approver_identity,
        GETDATE(),
        :user_id,
        :delegated_to,
        NULL
      )
    `;

    await sequelizeMSQL.query(insertQuery, {
      replacements: {
        no_permohonan,
        approver_identity: vAppr_ident,
        user_id,
        delegated_to
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been approved successfully',
      data: {
        no_permohonan,
        approver_no: 2,
        user_id,
        delegated_to
      }
    });

  } catch (error) {
    console.error('Error in approvePermohonanAssesment:', error);
    next(error);
  }
};

/**
 * Reject Permohonan Assessment (cmd_reject_Click)
 * Insert rejection record for Approver_No = 2
 * Uses req.body for no_permohonan
 */
const rejectPermohonanAssesment = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.body;

    if (!no_permohonan) {
      return res.status(400).json({
        success: false,
        message: 'no_permohonan is required'
      });
    }

    // Check if QA_ID exists (cannot reject if already generated)
    const checkQuery = `
      SELECT ISNULL(QA_Id, '') AS QA_Id
      FROM T_Kalibrasi_Permohonan
      WHERE No_Permohonan = :no_permohonan
    `;

    const checkResults = await sequelizeMSQL.query(checkQuery, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (checkResults.length > 0 && checkResults[0].QA_Id !== '') {
      return res.status(400).json({
        success: false,
        message: 'Cannot reject - QA ID has already been generated'
      });
    }

    // Get approver identity
    const approverIdentityQuery = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Permohonan'
        AND Appr_ID = :userId
        AND Appr_No = '2'
    `;

    const approverResults = await sequelizeMSQL.query(approverIdentityQuery, {
      replacements: { userId: user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const vAppr_ident = approverResults.length > 0 ? approverResults[0].Appr_Identity : '';

    // Insert rejection record
    const insertQuery = `
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
        2,
        1,
        :approver_identity,
        GETDATE(),
        :user_id,
        :delegated_to,
        NULL
      )
    `;

    await sequelizeMSQL.query(insertQuery, {
      replacements: {
        no_permohonan,
        approver_identity: vAppr_ident,
        user_id,
        delegated_to
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been rejected successfully',
      data: {
        no_permohonan,
        approver_no: 2,
        is_reject: true,
        user_id,
        delegated_to
      }
    });

  } catch (error) {
    console.error('Error in rejectPermohonanAssesment:', error);
    next(error);
  }
};

module.exports = {
  searchPermohonanAssesment,
  getPermohonanAssesmentDetail,
  getAssesmentList,
  checkIsApproved,
  getApproverIdentity,
  checkAllowInput,
  approvePermohonanAssesment,
  rejectPermohonanAssesment
};

