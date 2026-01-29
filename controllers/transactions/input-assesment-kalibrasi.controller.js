const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');
const { uploadFileToFTP, downloadFileFromFTP, formatFileName, getFileExtension } = require('../../helpers/ftp.helper');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const logoPath = path.resolve(__dirname, '../../assets/LapiLogo.jpg');

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

const generatePrint = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.body;

    if (!no_permohonan) {
      return res.status(400).json({
        success: false,
        message: 'no_permohonan is required'
      });
    }

    // Main query matches the VBA generate_Print SQL
    const query = `
      SELECT
        A.bagian,
        A.pemohon,
        A.No_Permohonan,
        A.nama_instrumen,
        A.No_identitas_kalibrasi,
        A.Alat_ukur_kalibrasi,
        A.Merk,
        A.Kapasitas,
        A.Jumlah,
        A.fungsi,
        A.Titik_pengukuran,
        A.Lokasi,
        REPLACE(CONVERT(CHAR(11), CAST(A.tgl_butuh AS datetime), 106), ' ', '-') AS tgl_butuh,
        A.kategori_permohonan,
        A.Ket_Rekalibrasi,
        ISNULL(A.no_sertifikat_terakhir, '') AS no_sertifikat_terakhir,
        A.Assm_nama_instrumen,
        A.Assm_No_identitas_kalibrasi,
        REPLACE(CONVERT(CHAR(11), CAST(A.RENCANA_EKSEKUSI AS datetime), 106), ' ', '-') AS RENCANA_EKSEKUSI,
        A.Jenis_kalibrasi,
        A.Jenis_External,
        A.Program_verifikasi,
        A.Titik_pengukuran_kalibrasi,
        A.Keterangan,
        CONVERT(varchar(20), A.tanggal, 13) AS Pemohon_Date,
        CASE
          WHEN B.MgrDept_UID = B.MgrDept_Delegate THEN 'Approved By: ' + dbo.fnGetNamaKaryawan(B.MgrDept_UID)
          ELSE dbo.fnGetNamaKaryawan(B.MgrDept_Delegate)
        END AS Mgr_Dept_UID,
        CASE
          WHEN B.MgrDept_UID = B.MgrDept_Delegate THEN ' '
          ELSE 'Delegated to: ' + dbo.fnGetNamaKaryawan(B.MgrDept_UID)
        END AS Mgr_Dept_Delegated,
        CONVERT(varchar(20), B.MgrDept_date, 13) AS Mgr_Dept_Date,
        CASE
          WHEN C.MgrQA_UID = C.MgrQA_Delegate THEN 'Approved By: ' + dbo.fnGetNamaKaryawan(C.MgrQA_UID)
          ELSE dbo.fnGetNamaKaryawan(C.MgrQA_Delegate)
        END AS Mgr_QA_UID,
        CASE
          WHEN C.MgrQA_UID = C.MgrQA_Delegate THEN ' '
          ELSE 'Delegated to: ' + dbo.fnGetNamaKaryawan(C.MgrQA_UID)
        END AS Mgr_QA_Delegated,
        CONVERT(varchar(20), C.MgrQA_date, 13) AS Mgr_QA_Date,
        dbo.fnGetNamaKaryawan(A.pemohon) AS Pemohon_Name
      FROM T_Kalibrasi_Permohonan AS A
      LEFT JOIN (
        SELECT
          No_Permohonan,
          USER_ID AS MgrDept_UID,
          Delegated_To AS MgrDept_Delegate,
          Process_Date AS MgrDept_date
        FROM T_Kalibrasi_status
        WHERE Approver_No = 1
      ) AS B ON A.No_Permohonan = B.No_Permohonan
      LEFT JOIN (
        SELECT
          No_Permohonan,
          USER_ID AS MgrQA_UID,
          Delegated_To AS MgrQA_Delegate,
          Process_Date AS MgrQA_date
        FROM T_Kalibrasi_status
        WHERE Approver_No = 2
      ) AS C ON A.No_Permohonan = C.No_Permohonan
      WHERE A.No_Permohonan = :no_permohonan
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

    // Process data based on VBA bookmark logic
    const printData = {
      // Basic Information
      txt_01_bagian: data.bagian || '',
      txt_02_Pemohon: data.Pemohon_Name || '',
      txt_03_No_permohonan: data.No_Permohonan || '',
      txt_04_Nama_mesin: data.nama_instrumen || '',
      txt_05_No_ID_mesin: data.No_identitas_kalibrasi || '',
      txt_06_Alat_ukur_yg: data.Alat_ukur_kalibrasi || '',
      txt_07_Merk_type: data.Merk || '',
      txt_08_Kapasitas_Resolusi: data.Kapasitas || '',
      txt_09_Jumlah: data.Jumlah || '',
      txt_10_Fungsi_tujuan: data.fungsi || '',
      txt_11_Titik_pengukuran: data.Titik_pengukuran || '',
      txt_12_Lokasi: data.Lokasi || '',
      txt_13_Tgl_Dibutuhkan: data.tgl_butuh || '',

      // Kategori permohonan - checkbox values
      txt_14A_chk_Kalibrasi_alat: data.kategori_permohonan === 'Alat Baru' ? 1 : 0,
      txt_14B_chk_Rekalibrasi: data.kategori_permohonan !== 'Alat Baru' ? 1 : 0,

      // Additional Information
      txt_16_Ket_Rekalibrasi: data.Ket_Rekalibrasi || '',

      // Sertifikat kalibrasi - checkbox values
      txt_17A_Sertifikat_kalibrasi_Ada: (data.no_sertifikat_terakhir !== '' && data.no_sertifikat_terakhir !== '-') ? '1' : '0',
      txt_17B_Sertifikat_kalibrasi_Tidak: (data.no_sertifikat_terakhir === '' || data.no_sertifikat_terakhir === '-') ? '1' : '0',

      txt_18_Nama_Alat_ukur: data.Assm_nama_instrumen || '',
      txt_19_ID_kalibrasi: data.Assm_No_identitas_kalibrasi || '',
      txt_20_rencana_eksekusi: data.RENCANA_EKSEKUSI || '',

      // Jenis kalibrasi - checkbox values
      txt_21A_Jenis_kalibrasi: data.Jenis_kalibrasi === 1 ? 1 : 0, // Internal
      txt_21B_Jenis_kalibrasi: data.Jenis_kalibrasi === 2 ? 1 : 0, // External

      // Sub External - checkbox values
      txt_22A_Sub_jenis_kal: data.Jenis_External === 'Insitu' ? 1 : 0,
      txt_22B_Sub_jenis_kal: data.Jenis_External === 'Eksitu' ? 1 : 0,
      txt_22C_Sub_jenis_kal: data.Jenis_External === 'Kontrak Suplier' ? 1 : 0,

      // Program Verifikasi - checkbox values
      txt_23A_Prog_Verifikasi: data.Program_verifikasi === 1 ? 1 : 0, // Ya
      txt_23B_Prog_Verifikasi: data.Program_verifikasi === 2 ? 1 : 0, // Tidak

      txt_24_Titik_pengukuran: data.Titik_pengukuran_kalibrasi || '',
      txt_25_Keterangan: data.Keterangan || '',
      txt_26_TTd_Mgr_bagian: data.bagian || '',

      // Signature sections
      // Pemohon (Requester)
      txt_27_TTd_Pemohon01: data.Pemohon_Name || '',
      txt_27_TTd_Pemohon02: ' ',
      txt_27_TTd_Pemohon03: data.Pemohon_Date || '',

      // Manager Department
      txt_28_TTd_Mgr_Dept01: data.Mgr_Dept_UID || '',
      txt_28_TTd_Mgr_Dept02: data.Mgr_Dept_Delegated || '',
      txt_28_TTd_Mgr_Dept03: data.Mgr_Dept_Date || '',

      // Manager QA
      txt_29_TTd_Mgr_QA01: data.Mgr_QA_UID || '',
      txt_29_TTd_Mgr_QA02: data.Mgr_QA_Delegated || '',
      txt_29_TTd_Mgr_QA03: data.Mgr_QA_Date || '',

      // Raw data for reference
      raw_data: {
        kategori_permohonan: data.kategori_permohonan,
        no_sertifikat_terakhir: data.no_sertifikat_terakhir,
        Jenis_kalibrasi: data.Jenis_kalibrasi,
        Jenis_External: data.Jenis_External,
        Program_verifikasi: data.Program_verifikasi
      }
    };

    return res.status(200).json({
      success: true,
      message: 'Print data generated successfully',
      data: printData
    });

  } catch (error) {
    console.error('Error in generatePrint:', error);
    next(error);
  }
};

/**
 * Helper: Check if permohonan is approved (fn_IS_approve)
 * Check if Approver_No = 2 exists for the given permohonan
 */
const checkIsApprovedForGenerate = async (no_permohonan) => {
  if (!no_permohonan) {
    return false;
  }

  const query = `
    SELECT * FROM t_Kalibrasi_Status
    WHERE No_Permohonan = :no_permohonan
      AND Approver_No = 2
  `;

  const results = await sequelizeMSQL.query(query, {
    replacements: { no_permohonan },
    type: Sequelize.QueryTypes.SELECT,
  });

  return results.length > 0;
};

/**
 * Helper: Execute multiple queries with transaction support
 * Mimics the Execute function from global-helper.vba that handles SQL_Delimiter
 */
const executeMultipleQueries = async (sqlString, transaction = null) => {
  const SQL_DELIMITER = '%%%###$$$';
  const queries = sqlString.split(SQL_DELIMITER).filter(q => q.trim() !== '');

  const shouldManageTransaction = !transaction;
  let t = transaction;

  try {
    if (shouldManageTransaction) {
      t = await sequelizeMSQL.transaction();
    }

    for (const query of queries) {
      if (query.trim()) {
        await sequelizeMSQL.query(query, {
          transaction: t,
          type: Sequelize.QueryTypes.RAW
        });
      }
    }

    if (shouldManageTransaction) {
      await t.commit();
    }

    return { success: true };
  } catch (error) {
    if (shouldManageTransaction && t) {
      await t.rollback();
    }
    throw error;
  }
};

const generateDA = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.body;

    if (!no_permohonan) {
      return res.status(400).json({
        success: false,
        message: 'Harap pilih no Permohonan!'
      });
    }

    // Check if approved
    const isApproved = await checkIsApprovedForGenerate(no_permohonan);
    if (!isApproved) {
      return res.status(400).json({
        success: false,
        message: 'Data belum approve, tidak bisa Generate Sertifikat!'
      });
    }

    // Get Data
    const getDataQuery = `
      SELECT
        kategori_permohonan,
        Group_DA,
        Group_Da_Dept,
        Parameter_Sertifikasi,
        QA_Id,
        ID_no_sertifikat,
        QA_ID_rekalibrasi,
        ISNULL(Jenis_kalibrasi, 1) as Jenis_kalibrasi
      FROM T_Kalibrasi_Permohonan
      WHERE No_Permohonan = :no_permohonan
    `;

    const dataResults = await sequelizeMSQL.query(getDataQuery, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (dataResults.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Permohonan not found'
      });
    }

    const data = dataResults[0];
    const V_kategori_permohonan = data.kategori_permohonan || '';
    const V_Group_DA = data.Group_DA || '';
    const V_Group_Da_Dept = data.Group_Da_Dept || '';
    const V_Parameter_Sertifikasi = data.Parameter_Sertifikasi || '';
    const V_QA_ID = data.QA_Id || '';
    const V_ID_No_sertifikat = data.ID_no_sertifikat || '';
    const V_QA_ID_rekalibrasi = data.QA_ID_rekalibrasi || '';
    const V_Jenis_kalibrasi = data.Jenis_kalibrasi || '1';

    // Check if already generated
    if (V_QA_ID !== '') {
      return res.status(400).json({
        success: false,
        message: `Sudah Generate Sertifikat atau DA ${V_QA_ID}`
      });
    }

    let SQL_Insert = '';
    let SQL_Update = '';
    let Auto_QA_ID = '';
    const SQL_DELIMITER = '%%%###$$$';

    // Process based on kategori_permohonan
    if (V_kategori_permohonan === 'Alat Baru') {
      // ===== ALAT BARU =====

      if (V_Parameter_Sertifikasi === 'Thermohygrometer') {
        // Insert ke DA TH
        const qaIdResult = await sequelizeMSQL.query(
          "SELECT dbo.fnGetKal_DA_TH_No_ID() as QA_ID",
          { type: Sequelize.QueryTypes.SELECT }
        );
        Auto_QA_ID = qaIdResult[0].QA_ID;

        SQL_Insert = `Insert into T_Kalibrasi_DA_Thermohygro (QA_ID,Jenis_kalibrasi,  Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi, Tgl_kalibrasi, Parameter_Interval, Kalibrasi_selanjutnya, Catatan, UserID, Delegated_To, Process_date)
                      SELECT (select dbo.fnGetKal_DA_TH_No_ID()) as QA_ID, Jenis_kalibrasi,
                              Assm_nama_instrumen,
                              Assm_No_identitas_Istrumen,
                              Assm_No_identitas_kalibrasi,
                              Group_Da_Dept,
                              Assm_Kapasitas,
                              Parameter_Kalibrasi,
                              Assm_Lokasi,
                              GETDATE() as tgl_kalibrasi,
                              Parameter_Interval,
                              DATEADD(MONTH,12,GETDATE()) as kalibrasi_selanjutnya,
                              Keterangan as catatan,
                              '${user_id}' as UserID,
                              '${delegated_to}' as Delegated_To,
                              GETDATE() As Process_date
                      From T_Kalibrasi_Permohonan
                      WHERE (No_Permohonan = '${no_permohonan}')`;

        SQL_Update = ` update T_Kalibrasi_Permohonan set QA_ID='${Auto_QA_ID}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date = GETDATE() where No_Permohonan = '${no_permohonan}' `;

      } else if (V_Parameter_Sertifikasi === 'Anak Timbangan') {
        // Insert ke DA AT
        const qaIdResult = await sequelizeMSQL.query(
          "SELECT dbo.fnGetKal_DA_AT_No_ID() as QA_ID",
          { type: Sequelize.QueryTypes.SELECT }
        );
        Auto_QA_ID = qaIdResult[0].QA_ID;

        SQL_Insert = `Insert into T_Kalibrasi_DA_Anak_Timbangan (QA_ID,Jenis_kalibrasi,  Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi, Tgl_kalibrasi, Parameter_Interval, Kalibrasi_selanjutnya, Catatan, UserID, Delegated_To, Process_date)
                      SELECT (select dbo.fnGetKal_DA_AT_No_ID()) as QA_ID, Jenis_kalibrasi,
                              Assm_nama_instrumen,
                              Assm_No_identitas_Istrumen,
                              Assm_No_identitas_kalibrasi,
                              Group_Da_Dept,
                              Assm_Kapasitas,
                              Parameter_Kalibrasi,
                              Assm_Lokasi,
                              GETDATE() as tgl_kalibrasi,
                              Parameter_Interval,
                              DATEADD(MONTH,12,GETDATE()) as kalibrasi_selanjutnya,
                              Keterangan as catatan,
                              '${user_id}' as UserID,
                              '${delegated_to}' as Delegated_To,
                              GETDATE() As Process_date
                      From T_Kalibrasi_Permohonan
                      WHERE (No_Permohonan = '${no_permohonan}')`;

        SQL_Update = ` update T_Kalibrasi_Permohonan set QA_ID='${Auto_QA_ID}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date = GETDATE() where No_Permohonan = '${no_permohonan}' `;

      } else if (V_Parameter_Sertifikasi === 'Timbangan (Massa)') {
        // Insert ke DA TM timbangan
        const qaIdResult = await sequelizeMSQL.query(
          "SELECT dbo.fnGetKal_DA_TM_No_ID() as QA_ID",
          { type: Sequelize.QueryTypes.SELECT }
        );
        Auto_QA_ID = qaIdResult[0].QA_ID;

        SQL_Insert = ` Insert into T_Kalibrasi_DA_Timbangan(QA_ID, Jenis_kalibrasi, Program_verifikasi, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas,
                                Parameter_Kalibrasi, Assm_Lokasi, Tgl_kalibrasi, Interval, Kalibrasi_selanjutnya, Catatan, Parameter_No_id_anak_timbang, Parameter_Interval, Parameter_kriteria,
                                Pelaksana_Verifikasi, Titik_verifikasi,  UserID, Delegated_To, Process_date)
                       Select '${Auto_QA_ID}' as QA_ID, Jenis_kalibrasi, Program_verifikasi, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas,
                                Parameter_Kalibrasi, Assm_Lokasi, getdate() as Tgl_kalibrasi, 12 as Interval,DATEADD(MONTH,12,GETDATE()) as Kalibrasi_selanjutnya, Keterangan as Catatan, Parameter_No_id_anak_timbang, Parameter_Interval, Parameter_kriteria,
                                Pelaksana_Verifikasi, Titik_verifikasi,  '${user_id}' as UserID, '${delegated_to}' as Delegated_To, getdate() as Process_date
                                from T_Kalibrasi_Permohonan where (No_Permohonan = '${no_permohonan}') `;

        SQL_Update = ` update T_Kalibrasi_Permohonan set QA_ID='${Auto_QA_ID}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date = GETDATE() where No_Permohonan = '${no_permohonan}' `;

      } else if (V_Parameter_Sertifikasi === 'Tekanan' || V_Parameter_Sertifikasi === 'Timer' ||
                 V_Parameter_Sertifikasi === 'Temperatur' || V_Parameter_Sertifikasi === 'Volume' ||
                 V_Parameter_Sertifikasi === 'Dimensi' || V_Parameter_Sertifikasi === 'Lain-Lain') {
        // Insert ke DA BA
        const qaIdResult = await sequelizeMSQL.query(
          "SELECT dbo.fnGetKal_DA_BA_No_ID() as QA_ID",
          { type: Sequelize.QueryTypes.SELECT }
        );
        Auto_QA_ID = qaIdResult[0].QA_ID;

        SQL_Insert = `Insert into T_Kalibrasi_DA_Bagian (QA_ID,Jenis_kalibrasi,Parameter_Sertifikasi,  Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi, Tgl_kalibrasi, Parameter_Interval, Kalibrasi_selanjutnya, Catatan, UserID, Delegated_To, Process_date)
                      SELECT (select dbo.fnGetKal_DA_BA_No_ID()) as QA_ID, Jenis_kalibrasi,Parameter_Sertifikasi,
                              Assm_nama_instrumen,
                              Assm_No_identitas_Istrumen,
                              Assm_No_identitas_kalibrasi,
                              Group_Da_Dept,
                              Assm_Kapasitas,
                              Parameter_Kalibrasi,
                              Assm_Lokasi,
                              GETDATE() as tgl_kalibrasi,
                              Parameter_Interval,
                              DATEADD(MONTH,12,GETDATE()) as kalibrasi_selanjutnya,
                              Keterangan as catatan,
                              '${user_id}' as UserID,
                              '${delegated_to}' as Delegated_To,
                              GETDATE() As Process_date
                      From T_Kalibrasi_Permohonan
                      WHERE (No_Permohonan = '${no_permohonan}')`;

        SQL_Update = ` update T_Kalibrasi_Permohonan set QA_ID='${Auto_QA_ID}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date = GETDATE() where No_Permohonan = '${no_permohonan}' `;

      } else {
        return res.status(400).json({
          success: false,
          message: 'Generate lain-lain belum ada function'
        });
      }

    } else if (V_kategori_permohonan === 'Re-Kalibrasi') {
      // ===== RE-KALIBRASI =====

      if (V_Parameter_Sertifikasi === 'Thermohygrometer') {
        // Check if exists in DA TH
        Auto_QA_ID = V_QA_ID_rekalibrasi;
        const checkQuery = `SELECT count(*) as JumRow FROM T_Kalibrasi_DA_Thermohygro WHERE QA_ID = '${V_QA_ID_rekalibrasi}'`;
        const checkResult = await sequelizeMSQL.query(checkQuery, { type: Sequelize.QueryTypes.SELECT });
        const jumRow = checkResult[0].JumRow;

        if (jumRow <= 0) {
          // Insert karena tidak ada
          SQL_Insert = `Insert into T_Kalibrasi_DA_Thermohygro (QA_ID,Jenis_kalibrasi,  Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi, Tgl_kalibrasi, Parameter_Interval, Kalibrasi_selanjutnya, Catatan, UserID, Delegated_To, Process_date)
                        SELECT (select dbo.fnGetKal_DA_TH_No_ID()) as QA_ID, Jenis_kalibrasi,
                                Assm_nama_instrumen,
                                Assm_No_identitas_Istrumen,
                                Assm_No_identitas_kalibrasi,
                                Group_Da_Dept,
                                Assm_Kapasitas,
                                Parameter_Kalibrasi,
                                Assm_Lokasi,
                                GETDATE() as tgl_kalibrasi,
                                Parameter_Interval,
                                DATEADD(MONTH,1,GETDATE()) as kalibrasi_selanjutnya,
                                Keterangan as catatan,
                                '${user_id}' as UserID,
                                '${delegated_to}' as Delegated_To,
                                GETDATE() As Process_date
                        From T_Kalibrasi_Permohonan
                        WHERE (No_Permohonan = '${no_permohonan}')`;
        } else {
          // Update DA jika sudah ada dan rekalibrasi
          SQL_Insert = ` update T_Kalibrasi_DA_Thermohygro set  QA_ID =  A.QA_ID_Rekalibrasi,
                          Jenis_kalibrasi= A.Jenis_kalibrasi,
                          Assm_nama_instrumen= A.Assm_nama_instrumen,
                          Assm_No_identitas_Istrumen= A.Assm_No_identitas_Istrumen,
                          Assm_No_identitas_kalibrasi= A.Assm_No_identitas_kalibrasi,
                          Group_Da_Dept=A.Group_Da_Dept,
                          Assm_Kapasitas=A.Assm_Kapasitas,
                          Parameter_Kalibrasi=A.Parameter_Kalibrasi,
                          Assm_Lokasi=A.Assm_Lokasi,
                          Tgl_kalibrasi=getdate() ,
                          Parameter_Interval=12,
                          Kalibrasi_selanjutnya = DATEADD(month,12,getdate() ),
                          Catatan=A.Keterangan,
                          UserID='${user_id}',
                          Delegated_To='${delegated_to}',
                          Process_date = GETDATE()
                   From T_Kalibrasi_Permohonan as A inner join T_Kalibrasi_DA_Thermohygro as B on A.QA_ID_Rekalibrasi =  B.QA_ID
                                  WHERE (A.No_Permohonan = '${no_permohonan}')  `;
        }

        SQL_Update = ` update T_Kalibrasi_Permohonan set QA_ID='${Auto_QA_ID}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date = GETDATE() where No_Permohonan = '${no_permohonan}' `;

      } else if (V_Parameter_Sertifikasi === 'Anak Timbangan') {
        // Check if exists in DA AT
        Auto_QA_ID = V_QA_ID_rekalibrasi;
        const checkQuery = `SELECT count(*) as JumRow FROM T_Kalibrasi_DA_Anak_Timbangan WHERE QA_ID = '${V_QA_ID_rekalibrasi}'`;
        const checkResult = await sequelizeMSQL.query(checkQuery, { type: Sequelize.QueryTypes.SELECT });
        const jumRow = checkResult[0].JumRow;

        if (jumRow <= 0) {
          // Insert karena tidak ada
          SQL_Insert = `Insert into T_Kalibrasi_DA_Anak_Timbangan (QA_ID,Jenis_kalibrasi,  Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi, Tgl_kalibrasi, Parameter_Interval, Kalibrasi_selanjutnya, Catatan, UserID, Delegated_To, Process_date)
                        SELECT (select dbo.fnGetKal_DA_AT_No_ID()) as QA_ID, Jenis_kalibrasi,
                                Assm_nama_instrumen,
                                Assm_No_identitas_Istrumen,
                                Assm_No_identitas_kalibrasi,
                                Group_Da_Dept,
                                Assm_Kapasitas,
                                Parameter_Kalibrasi,
                                Assm_Lokasi,
                                GETDATE() as tgl_kalibrasi,
                                Parameter_Interval,
                                DATEADD(MONTH,1,GETDATE()) as kalibrasi_selanjutnya,
                                Keterangan as catatan,
                                '${user_id}' as UserID,
                                '${delegated_to}' as Delegated_To,
                                GETDATE() As Process_date
                        From T_Kalibrasi_Permohonan
                        WHERE (No_Permohonan = '${no_permohonan}')`;
        } else {
          // Update DA jika sudah ada dan rekalibrasi
          SQL_Insert = ` update T_Kalibrasi_DA_Anak_Timbangan set  QA_ID =  A.QA_ID_Rekalibrasi,
                          Jenis_kalibrasi= A.Jenis_kalibrasi,
                          Assm_nama_instrumen= A.Assm_nama_instrumen,
                          Assm_No_identitas_Istrumen= A.Assm_No_identitas_Istrumen,
                          Assm_No_identitas_kalibrasi= A.Assm_No_identitas_kalibrasi,
                          Group_Da_Dept=A.Group_Da_Dept,
                          Assm_Kapasitas=A.Assm_Kapasitas,
                          Parameter_Kalibrasi=A.Parameter_Kalibrasi,
                          Assm_Lokasi=A.Assm_Lokasi,
                          Tgl_kalibrasi=getdate() ,
                          Parameter_Interval=12,
                          Kalibrasi_selanjutnya = DATEADD(month,12,getdate() ),
                          Catatan=A.Keterangan,
                          UserID='${user_id}',
                          Delegated_To='${delegated_to}',
                          Process_date = GETDATE()
                   From T_Kalibrasi_Permohonan as A inner join T_Kalibrasi_DA_Anak_Timbangan as B on A.QA_ID_Rekalibrasi =  B.QA_ID
                                  WHERE (A.No_Permohonan = '${no_permohonan}')  `;
        }

        SQL_Update = ` update T_Kalibrasi_Permohonan set QA_ID='${Auto_QA_ID}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date = GETDATE() where No_Permohonan = '${no_permohonan}' `;

      } else if (V_Parameter_Sertifikasi === 'Timbangan (Massa)') {
        // Check if exists in DA TM
        Auto_QA_ID = V_QA_ID_rekalibrasi;
        const checkQuery = `SELECT count(*) as JumRow FROM T_Kalibrasi_DA_Timbangan WHERE QA_ID = '${V_QA_ID_rekalibrasi}'`;
        const checkResult = await sequelizeMSQL.query(checkQuery, { type: Sequelize.QueryTypes.SELECT });
        const jumRow = checkResult[0].JumRow;

        if (jumRow <= 0) {
          // Insert karena tidak ada
          SQL_Insert = ` Insert into T_Kalibrasi_DA_Timbangan(QA_ID, Jenis_kalibrasi, Program_verifikasi, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas,
                                Parameter_Kalibrasi, Assm_Lokasi, Tgl_kalibrasi, Interval, Kalibrasi_selanjutnya, Catatan, Parameter_No_id_anak_timbang, Parameter_Interval, Parameter_kriteria,
                                Pelaksana_Verifikasi, Titik_verifikasi,  UserID, Delegated_To, Process_date)
                         Select '${Auto_QA_ID}' as QA_ID, Jenis_kalibrasi, Program_verifikasi, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas,
                                Parameter_Kalibrasi, Assm_Lokasi, getdate() as Tgl_kalibrasi, 12 as Interval,DATEADD(MONTH,12,GETDATE()) as Kalibrasi_selanjutnya, Keterangan as Catatan, Parameter_No_id_anak_timbang, Parameter_Interval, Parameter_kriteria,
                                Pelaksana_Verifikasi, Titik_verifikasi,  '${user_id}' as UserID, '${delegated_to}' as Delegated_To, getdate() as Process_date
                                from T_Kalibrasi_Permohonan where (No_Permohonan = '${no_permohonan}') `;
        } else {
          // Update DA jika sudah ada dan rekalibrasi
          SQL_Insert = ` update T_Kalibrasi_DA_Timbangan set
                                QA_ID=A.QA_ID_Rekalibrasi,
                                Jenis_kalibrasi=A.Jenis_kalibrasi,
                                Program_verifikasi=A.Program_verifikasi,
                                Assm_nama_instrumen=A.Assm_nama_instrumen,
                                Assm_No_identitas_Istrumen=A.Assm_No_identitas_Istrumen,
                                Assm_No_identitas_kalibrasi=A.Assm_No_identitas_kalibrasi,
                                Group_Da_Dept=A.Group_Da_Dept,
                                Assm_Kapasitas=A.Assm_Kapasitas,
                                Parameter_Kalibrasi=A.Parameter_Kalibrasi,
                                Assm_Lokasi=A.Assm_Lokasi,
                                Tgl_kalibrasi=getdate(),
                                Interval=12,
                                Kalibrasi_selanjutnya=DATEADD(month,12,getdate() ),
                                Catatan=A.Keterangan,
                                Parameter_No_id_anak_timbang=A.Parameter_No_id_anak_timbang,
                                Parameter_Interval=A.Parameter_Interval,
                                Parameter_kriteria=A.Parameter_kriteria,
                                Pelaksana_Verifikasi=A.Pelaksana_Verifikasi,
                                Titik_verifikasi=A.Titik_verifikasi,
                                UserID='${user_id}',
                                Delegated_To='${delegated_to}',
                                Process_date = getdate()
                          FROM  T_Kalibrasi_Permohonan AS A LEFT OUTER JOIN
                                T_Kalibrasi_DA_Timbangan AS B ON A.QA_ID_Rekalibrasi = B.QA_ID WHERE (A.No_Permohonan = '${no_permohonan}')`;
        }

        SQL_Update = ` update T_Kalibrasi_Permohonan set QA_ID='${Auto_QA_ID}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date = GETDATE() where No_Permohonan = '${no_permohonan}' `;

      } else if (V_Parameter_Sertifikasi === 'Tekanan' || V_Parameter_Sertifikasi === 'Timer' ||
                 V_Parameter_Sertifikasi === 'Temperatur' || V_Parameter_Sertifikasi === 'Volume' ||
                 V_Parameter_Sertifikasi === 'Dimensi' || V_Parameter_Sertifikasi === 'Lain-Lain') {
        // Check if exists in DA BA
        Auto_QA_ID = V_QA_ID_rekalibrasi;
        const checkQuery = `SELECT count(*) as JumRow FROM T_Kalibrasi_DA_Bagian WHERE QA_ID = '${V_QA_ID_rekalibrasi}'`;
        const checkResult = await sequelizeMSQL.query(checkQuery, { type: Sequelize.QueryTypes.SELECT });
        const jumRow = checkResult[0].JumRow;

        if (jumRow <= 0) {
          // Insert karena tidak ada
          SQL_Insert = `Insert into [T_Kalibrasi_DA_Bagian] (QA_ID,Jenis_kalibrasi,Parameter_Sertifikasi,  Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi, Tgl_kalibrasi, Parameter_Interval, Kalibrasi_selanjutnya, Catatan, UserID, Delegated_To, Process_date)
                        SELECT (select dbo.fnGetKal_DA_TH_No_ID()) as QA_ID, Jenis_kalibrasi,Parameter_Sertifikasi,
                                Assm_nama_instrumen,
                                Assm_No_identitas_Istrumen,
                                Assm_No_identitas_kalibrasi,
                                Group_Da_Dept,
                                Assm_Kapasitas,
                                Parameter_Kalibrasi,
                                Assm_Lokasi,
                                GETDATE() as tgl_kalibrasi,
                                Parameter_Interval,
                                DATEADD(MONTH,1,GETDATE()) as kalibrasi_selanjutnya,
                                Keterangan as catatan,
                                '${user_id}' as UserID,
                                '${delegated_to}' as Delegated_To,
                                GETDATE() As Process_date
                        From T_Kalibrasi_Permohonan
                        WHERE (No_Permohonan = '${no_permohonan}')`;
        } else {
          // Update DA jika sudah ada dan rekalibrasi
          SQL_Insert = ` update T_Kalibrasi_DA_Bagian set  QA_ID =  A.QA_ID_Rekalibrasi,
                          Jenis_kalibrasi= A.Jenis_kalibrasi,
                          Parameter_Sertifikasi=A.Parameter_Sertifikasi,
                          Assm_nama_instrumen= A.Assm_nama_instrumen,
                          Assm_No_identitas_Istrumen= A.Assm_No_identitas_Istrumen,
                          Assm_No_identitas_kalibrasi= A.Assm_No_identitas_kalibrasi,
                          Group_Da_Dept=A.Group_Da_Dept,
                          Assm_Kapasitas=A.Assm_Kapasitas,
                          Parameter_Kalibrasi=A.Parameter_Kalibrasi,
                          Assm_Lokasi=A.Assm_Lokasi,
                          Tgl_kalibrasi=getdate() ,
                          Parameter_Interval=12,
                          Kalibrasi_selanjutnya = DATEADD(month,12,getdate() ),
                          Catatan=A.Keterangan,
                          UserID='${user_id}',
                          Delegated_To='${delegated_to}',
                          Process_date = GETDATE()
                   From T_Kalibrasi_Permohonan as A inner join T_Kalibrasi_DA_Bagian as B on A.QA_ID_Rekalibrasi =  B.QA_ID
                                  WHERE (A.No_Permohonan = '${no_permohonan}')  `;
        }

        SQL_Update = ` update T_Kalibrasi_Permohonan set QA_ID='${Auto_QA_ID}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date = GETDATE() where No_Permohonan = '${no_permohonan}' `;

      } else {
        return res.status(400).json({
          success: false,
          message: 'Generate lain-lain'
        });
      }
    }

    // Execute the queries
    if (SQL_Insert && SQL_Update) {
      const combinedSQL = SQL_Insert + SQL_DELIMITER + SQL_Update;
      await executeMultipleQueries(combinedSQL);

      return res.status(200).json({
        success: true,
        message: `Sukses Generate DA ${V_Parameter_Sertifikasi}!`,
        data: {
          no_permohonan,
          qa_id: Auto_QA_ID,
          parameter_sertifikasi: V_Parameter_Sertifikasi,
          kategori_permohonan: V_kategori_permohonan
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unable to generate DA queries'
      });
    }

  } catch (error) {
    console.error('Error in generateDA:', error);
    next(error);
  }
};

/**
 * Generate Sertifikat (cmd_Generate_Ser_Click)
 * Generates calibration certificate based on Parameter_Sertifikasi type
 * Based on VBA cmd_Generate_Ser_Click function
 */
const generateSertifikat = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.body;

    if (!no_permohonan) {
      return res.status(400).json({
        success: false,
        message: 'Harap pilih no Permohonan!'
      });
    }

    // Check if approved - matches fn_IS_approve()
    const checkApproveQuery = `
      SELECT * FROM t_Kalibrasi_Status
      WHERE No_Permohonan = :no_permohonan AND Approver_No = 2
    `;

    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { no_permohonan },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approveResults.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Data belum approve, tidak bisa Generate Sertifikat!'
      });
    }

    // Get Data - matches VBA query
    const query = `
      SELECT kategori_permohonan, Group_DA, Group_Da_Dept, Parameter_Sertifikasi,
             QA_Id, ID_no_sertifikat, QA_ID_rekalibrasi, Jenis_kalibrasi
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
    const V_kategori_permohonan = data.kategori_permohonan || '';
    const V_Group_DA = data.Group_DA || '';
    const V_Group_Da_Dept = data.Group_Da_Dept || '';
    const V_Parameter_Sertifikasi = data.Parameter_Sertifikasi || '';
    const V_QA_ID = data.QA_Id || '';
    const V_ID_No_sertifikat = data.ID_no_sertifikat || '';
    const V_QA_ID_rekalibrasi = data.QA_ID_Rekalibrasi || '';
    const V_Jenis_kalibrasi = data.Jenis_kalibrasi ? data.Jenis_kalibrasi.toString() : '';

    // BLOCK GENERATE SERTIFIKAT - matches VBA conditions
    if (V_Jenis_kalibrasi === '' || V_Jenis_kalibrasi === '2') {
      return res.status(400).json({
        success: false,
        message: 'Hanya Jenis kalibrasi internal yang dapat Generate sertifikat!'
      });
    }

    if (V_Parameter_Sertifikasi === 'Anak Timbangan' || V_Parameter_Sertifikasi === 'Volume' || V_Parameter_Sertifikasi === 'Dimensi') {
      return res.status(400).json({
        success: false,
        message: `Parameter Sertifikasi untuk ${V_Parameter_Sertifikasi}, tidak bisa generate Sertifikat`
      });
    }

    // Check if already generated
    if (V_QA_ID !== '') {
      return res.status(400).json({
        success: false,
        message: `Sudah Generate Sertifikat atau DA : ${V_ID_No_sertifikat}`
      });
    }

    let SQL_Insert = '';
    let SQL_Update = '';
    let Auto_QA_ID = '';
    let Auto_ID_No_sertifikat = '';

    // 2A# Alat Baru
    if (V_kategori_permohonan === 'Alat Baru') {

      if (V_Parameter_Sertifikasi === 'Thermohygrometer') {
        // Insert ke Sertifikat TH THERMOHYGRO NEW
        const qaIdResult = await sequelizeMSQL.query('SELECT dbo.fnGetKal_DA_TH_No_ID() as QA_ID', {
          type: Sequelize.QueryTypes.SELECT,
        });
        Auto_QA_ID = qaIdResult[0].QA_ID || '';

        const sertifikatIdResult = await sequelizeMSQL.query('SELECT dbo.fnGetKal_Ser_L_No_ID() as ID_No_sertifikat', {
          type: Sequelize.QueryTypes.SELECT,
        });
        Auto_ID_No_sertifikat = sertifikatIdResult[0].ID_No_sertifikat || '';

        SQL_Insert = `INSERT INTO T_Kalibrasi_Sertifikat_Thermohygro (QA_ID, ID_No_sertifikat, Jenis_kalibrasi, Tgl, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk, Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi, UserID, Delegated_To, Process_date)
                      SELECT '${Auto_QA_ID}' as QA_ID, '${Auto_ID_No_sertifikat}' as ID_No_sertifikat, Jenis_kalibrasi,
                             GETDATE() as Tgl, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk, Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi,
                             '${user_id}' as UserID, '${delegated_to}' as Delegated_To, GETDATE() as Process_date
                      FROM T_Kalibrasi_Permohonan WHERE No_Permohonan = '${no_permohonan}'`;

        SQL_Update = `UPDATE T_Kalibrasi_Permohonan SET QA_ID='${Auto_QA_ID}', ID_No_Sertifikat='${Auto_ID_No_sertifikat}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date=GETDATE() WHERE No_Permohonan='${no_permohonan}'`;

      } else if (V_Parameter_Sertifikasi === 'Timbangan (Massa)') {
        // Insert ke Sertifikat Timbangan (Massa)
        const qaIdResult = await sequelizeMSQL.query('SELECT dbo.fnGetKal_DA_TM_No_ID() as QA_ID', {
          type: Sequelize.QueryTypes.SELECT,
        });
        Auto_QA_ID = qaIdResult[0].QA_ID || '';

        const sertifikatIdResult = await sequelizeMSQL.query('SELECT dbo.fnGetKal_Ser_M_No_ID() as ID_No_sertifikat', {
          type: Sequelize.QueryTypes.SELECT,
        });
        Auto_ID_No_sertifikat = sertifikatIdResult[0].ID_No_sertifikat || '';

        SQL_Insert = `INSERT INTO T_Kalibrasi_Sertifikat_Timbangan (QA_ID, ID_No_sertifikat, Jenis_kalibrasi, Program_verifikasi, Tgl, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk, Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi, Parameter_No_id_anak_timbang, Parameter_Interval, Parameter_kriteria, Pelaksana_Verifikasi, Titik_verifikasi, UserID, Delegated_To, Process_date)
                      SELECT '${Auto_QA_ID}' as QA_ID, '${Auto_ID_No_sertifikat}' as ID_No_sertifikat, Jenis_kalibrasi, Program_verifikasi,
                             GETDATE() as Tgl, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk, Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi, Parameter_No_id_anak_timbang, Parameter_Interval, Parameter_kriteria, Pelaksana_Verifikasi, Titik_verifikasi,
                             '${user_id}' as UserID, '${delegated_to}' as Delegated_To, GETDATE() as Process_date
                      FROM T_Kalibrasi_Permohonan WHERE No_Permohonan = '${no_permohonan}'`;

        SQL_Update = `UPDATE T_Kalibrasi_Permohonan SET QA_ID='${Auto_QA_ID}', ID_No_Sertifikat='${Auto_ID_No_sertifikat}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date=GETDATE() WHERE No_Permohonan='${no_permohonan}'`;

      } else if (V_Parameter_Sertifikasi === 'Tekanan' || V_Parameter_Sertifikasi === 'Timer' || V_Parameter_Sertifikasi === 'Temperatur') {
        // Insert ke Sertifikat Bagian
        const qaIdResult = await sequelizeMSQL.query('SELECT dbo.fnGetKal_DA_BA_No_ID() as QA_ID', {
          type: Sequelize.QueryTypes.SELECT,
        });
        Auto_QA_ID = qaIdResult[0].QA_ID || '';

        let sertifikatQuery = '';
        if (V_Parameter_Sertifikasi === 'Tekanan') {
          sertifikatQuery = 'SELECT dbo.fnGetKal_Ser_P_No_ID() as ID_No_sertifikat';
        } else if (V_Parameter_Sertifikasi === 'Timer') {
          sertifikatQuery = 'SELECT dbo.fnGetKal_Ser_R_No_ID() as ID_No_sertifikat';
        } else if (V_Parameter_Sertifikasi === 'Temperatur') {
          sertifikatQuery = 'SELECT dbo.fnGetKal_Ser_T_No_ID() as ID_No_sertifikat';
        }

        const sertifikatIdResult = await sequelizeMSQL.query(sertifikatQuery, {
          type: Sequelize.QueryTypes.SELECT,
        });
        Auto_ID_No_sertifikat = sertifikatIdResult[0].ID_No_sertifikat || '';

        SQL_Insert = `INSERT INTO T_Kalibrasi_Sertifikat_Bagian (QA_ID, ID_No_sertifikat, Jenis_kalibrasi, parameter_sertifikasi, Tgl, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk, Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi, UserID, Delegated_To, Process_date)
                      SELECT '${Auto_QA_ID}' as QA_ID, '${Auto_ID_No_sertifikat}' as ID_No_sertifikat, Jenis_kalibrasi, parameter_sertifikasi,
                             GETDATE() as Tgl, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk, Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi,
                             '${user_id}' as UserID, '${delegated_to}' as Delegated_To, GETDATE() as Process_date
                      FROM T_Kalibrasi_Permohonan WHERE No_Permohonan = '${no_permohonan}'`;

        SQL_Update = `UPDATE T_Kalibrasi_Permohonan SET QA_ID='${Auto_QA_ID}', ID_No_Sertifikat='${Auto_ID_No_sertifikat}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date=GETDATE() WHERE No_Permohonan='${no_permohonan}'`;

      } else {
        return res.status(400).json({
          success: false,
          message: `Tidak dapat generate Sertifikat untuk Parameter Sertifikasi : ${V_Parameter_Sertifikasi}`
        });
      }

    // 2B# Re-Kalibrasi
    } else if (V_kategori_permohonan === 'Re-Kalibrasi') {

      if (V_Parameter_Sertifikasi === 'Thermohygrometer') {
        // Insert ke Sertifikat TH rekalibrasi
        Auto_QA_ID = V_QA_ID_rekalibrasi;

        const sertifikatIdResult = await sequelizeMSQL.query('SELECT dbo.fnGetKal_Ser_L_No_ID() as ID_No_sertifikat', {
          type: Sequelize.QueryTypes.SELECT,
        });
        Auto_ID_No_sertifikat = sertifikatIdResult[0].ID_No_sertifikat || '';

        SQL_Insert = `INSERT INTO T_Kalibrasi_Sertifikat_Thermohygro (QA_ID, ID_No_sertifikat, Jenis_kalibrasi, Tgl, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk, Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi, UserID, Delegated_To, Process_date)
                      SELECT '${Auto_QA_ID}' as QA_ID, '${Auto_ID_No_sertifikat}' as ID_No_sertifikat, Jenis_kalibrasi,
                             GETDATE() as Tgl, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk, Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi,
                             '${user_id}' as UserID, '${delegated_to}' as Delegated_To, GETDATE() as Process_date
                      FROM T_Kalibrasi_Permohonan WHERE No_Permohonan = '${no_permohonan}'`;

        SQL_Update = `UPDATE T_Kalibrasi_Permohonan SET QA_ID='${Auto_QA_ID}', ID_No_Sertifikat='${Auto_ID_No_sertifikat}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date=GETDATE() WHERE No_Permohonan='${no_permohonan}'`;

      } else if (V_Parameter_Sertifikasi === 'Timbangan (Massa)') {
        // Insert ke Sertifikat TM rekalibrasi
        Auto_QA_ID = V_QA_ID_rekalibrasi;

        const sertifikatIdResult = await sequelizeMSQL.query('SELECT dbo.fnGetKal_Ser_M_No_ID() as ID_No_sertifikat', {
          type: Sequelize.QueryTypes.SELECT,
        });
        Auto_ID_No_sertifikat = sertifikatIdResult[0].ID_No_sertifikat || '';

        SQL_Insert = `INSERT INTO T_Kalibrasi_Sertifikat_Timbangan (QA_ID, ID_No_sertifikat, Jenis_kalibrasi, Program_verifikasi, Tgl, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk, Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi, Parameter_No_id_anak_timbang, Parameter_Interval, Parameter_kriteria, Pelaksana_Verifikasi, Titik_verifikasi, UserID, Delegated_To, Process_date)
                      SELECT '${Auto_QA_ID}' as QA_ID, '${Auto_ID_No_sertifikat}' as ID_No_sertifikat, Jenis_kalibrasi, Program_verifikasi,
                             GETDATE() as Tgl, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk, Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi, Parameter_No_id_anak_timbang, Parameter_Interval, Parameter_kriteria, Pelaksana_Verifikasi, Titik_verifikasi,
                             '${user_id}' as UserID, '${delegated_to}' as Delegated_To, GETDATE() as Process_date
                      FROM T_Kalibrasi_Permohonan WHERE No_Permohonan = '${no_permohonan}'`;

        SQL_Update = `UPDATE T_Kalibrasi_Permohonan SET QA_ID='${Auto_QA_ID}', ID_No_Sertifikat='${Auto_ID_No_sertifikat}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date=GETDATE() WHERE No_Permohonan='${no_permohonan}'`;

      } else if (V_Parameter_Sertifikasi === 'Tekanan' || V_Parameter_Sertifikasi === 'Timer' || V_Parameter_Sertifikasi === 'Temperatur') {
        // Insert ke Sertifikat Bagian rekalibrasi
        const qaIdResult = await sequelizeMSQL.query('SELECT dbo.fnGetKal_DA_BA_No_ID() as QA_ID', {
          type: Sequelize.QueryTypes.SELECT,
        });
        Auto_QA_ID = qaIdResult[0].QA_ID || '';

        let sertifikatQuery = '';
        if (V_Parameter_Sertifikasi === 'Tekanan') {
          sertifikatQuery = 'SELECT dbo.fnGetKal_Ser_P_No_ID() as ID_No_sertifikat';
        } else if (V_Parameter_Sertifikasi === 'Timer') {
          sertifikatQuery = 'SELECT dbo.fnGetKal_Ser_R_No_ID() as ID_No_sertifikat';
        } else if (V_Parameter_Sertifikasi === 'Temperatur') {
          sertifikatQuery = 'SELECT dbo.fnGetKal_Ser_T_No_ID() as ID_No_sertifikat';
        } else if (V_Parameter_Sertifikasi === 'Volume') {
          sertifikatQuery = 'SELECT dbo.fnGetKal_Ser_V_No_ID() as ID_No_sertifikat';
        } else if (V_Parameter_Sertifikasi === 'Dimensi') {
          sertifikatQuery = 'SELECT dbo.fnGetKal_Ser_D_No_ID() as ID_No_sertifikat';
        }

        const sertifikatIdResult = await sequelizeMSQL.query(sertifikatQuery, {
          type: Sequelize.QueryTypes.SELECT,
        });
        Auto_ID_No_sertifikat = sertifikatIdResult[0].ID_No_sertifikat || '';

        SQL_Insert = `INSERT INTO T_Kalibrasi_Sertifikat_Bagian (QA_ID, ID_No_sertifikat, Jenis_kalibrasi, parameter_sertifikasi, Tgl, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk, Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi, UserID, Delegated_To, Process_date)
                      SELECT '${Auto_QA_ID}' as QA_ID, '${Auto_ID_No_sertifikat}' as ID_No_sertifikat, Jenis_kalibrasi, parameter_sertifikasi,
                             GETDATE() as Tgl, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk, Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi,
                             '${user_id}' as UserID, '${delegated_to}' as Delegated_To, GETDATE() as Process_date
                      FROM T_Kalibrasi_Permohonan WHERE No_Permohonan = '${no_permohonan}'`;

        SQL_Update = `UPDATE T_Kalibrasi_Permohonan SET QA_ID='${Auto_QA_ID}', ID_No_Sertifikat='${Auto_ID_No_sertifikat}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date=GETDATE() WHERE No_Permohonan='${no_permohonan}'`;

      } else {
        return res.status(400).json({
          success: false,
          message: `Tidak dapat generate Sertifikat untuk Parameter Sertifikasi : ${V_Parameter_Sertifikasi}`
        });
      }
    }

    // Execute queries in transaction - matches VBA Execute with SQL_Delimiter
    const transaction = await sequelizeMSQL.transaction();

    try {
      await sequelizeMSQL.query(SQL_Insert, {
        transaction,
        type: Sequelize.QueryTypes.INSERT
      });

      await sequelizeMSQL.query(SQL_Update, {
        transaction,
        type: Sequelize.QueryTypes.UPDATE
      });

      await transaction.commit();

      return res.status(200).json({
        success: true,
        message: `Sukses Generate Data Sertifikat ${V_Parameter_Sertifikasi}!`,
        data: {
          qa_id: Auto_QA_ID,
          id_no_sertifikat: Auto_ID_No_sertifikat
        }
      });

    } catch (error) {
      await transaction.rollback();
      console.error('Error executing generate sertifikat:', error);
      return res.status(500).json({
        success: false,
        message: 'Error Insert Data'
      });
    }

  } catch (error) {
    console.error('Error in generateSertifikat:', error);
    next(error);
  }
};

/**
 * Download File from FTP (cmd_download_Click)
 * Downloads calibration assessment file from FTP server
 * Based on VBA cmd_download_Click function
 */
const downloadFileAssesment = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { no_permohonan } = req.query;

    if (!no_permohonan) {
      return res.status(400).json({
        success: false,
        message: 'no_permohonan is required'
      });
    }

    // Get file_name from T_Kalibrasi_Permohonan - matches VBA txt_file_download.Text
    const query = `
      SELECT ISNULL(file_name, '') as file_name
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

    const fileName = results[0].file_name;

    // Check if file exists - matches VBA condition: If txt_file_download.Text = ""
    if (!fileName || fileName === '') {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Create temporary local path for download
    const tempDir = path.join(__dirname, '../../tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const localFilePath = path.join(tempDir, fileName);

    // Download file from FTP
    // Matches VBA: Inet1.Execute , "GET " & """" & ftp_subFolder & "/" & txt_file_download.Text & """" & " " & """" & f_GMP1_dlg.filename & """"
    const downloadResult = await downloadFileFromFTP(fileName, localFilePath);

    if (!downloadResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Fail download data',
        error: downloadResult.message
      });
    }

    // Check if file was actually downloaded
    if (!fs.existsSync(localFilePath)) {
      return res.status(500).json({
        success: false,
        message: 'Fail download data'
      });
    }

    // Send file to client
    res.download(localFilePath, fileName, (err) => {
      // Clean up temporary file after download
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
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
    console.error('Error in downloadFileAssesment:', error);
    next(error);
  }
};

function getBase64Image(filePath) {
  const image = fs.readFileSync(filePath);
  return `data:image/jpeg;base64,${image.toString('base64')}`;
}

 const  printHeader = async (req, res, next) => {
  const { link, noDoc, tanggal, revisi, judul, landscape = "", } = req.query;

  let browser;
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const logoBase64 = getBase64Image(logoPath);

    // await page.setExtraHTTPHeaders({
    //   'authentication': token
    // });

    await page.goto(link, { waitUntil: 'networkidle0' });

    await page.addStyleTag({
      content: `
        * {
          font-size: ${!landscape ? `10px` : `13px`} !important;
 font-family: Verdana, sans-serif;        }

        table {
          margin-top: ${!landscape ? `10px` : `13px`} !important; /* Ensures margin applies to all tables */
        }
      `,
    });
    let headerLandscape = `
<table style="width: ${!landscape ? '90%' : '97.2%'}; margin: 0 auto; font-size: 11px; border: 2px solid black; border-collapse: collapse; font-family: Verdana, sans-serif;">
  <tbody>
    <tr>
      <td style="border: 1px solid black; width: 20%; height: 70px; text-align: center;" rowspan="2">
        <img src="${logoBase64}" alt="lapilogo" width="80%" height="90%" style="object-fit: contain;"/>
      </td>
      <td style="border: 1px solid black;">
        <div style="font-size: 11px; padding-top: 0.1rem; padding-bottom: 0.1rem; text-align: center; display: flex; align-items: center; justify-content: center;">
          <h3 style="font-weight: bold; line-height: 1.1; margin: 0; font-size: 16px;">
            <span>${judul || "PERMOHONAN KALIBRASI INSTRUMEN DAN ALAT UKUR"}</span>
          </h3>
        </div>
      </td>
    </tr>
  </tbody>
</table>
      `;

      let footerLandscape =
      `
        <table style="width: ${!landscape ? '90%' : '97%'}; margin: 0 auto; font-size: 12px; border: 2px solid black; border-collapse: collapse; font-family: Verdana, sans-serif;">
  <tr>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">Nomor</td>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">${noDoc}</td>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">Tanggal</td>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">${tanggal}</td>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">Revisi</td>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">${revisi}</td>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">Halaman</td>
    <td style="border: 1px solid #6b7280; padding: 2px; text-align: center;">
      <span class="pageNumber"></span> dari <span class="totalPages"></span>
    </td>
  </tr>
</table>
`

    // Membuat PDF dalam bentuk buffer
    const pdfBuffer = await page.pdf({
      format: 'A4',
      displayHeaderFooter: true,
      printBackground: true,
      footerTemplate: footerLandscape,
      headerTemplate:headerLandscape,
      margin: { bottom: '60px', top: '200px', left: '18px', right: '17px' },
      landscape: !landscape ? false : true,
    });

    await browser.close();

    // Set Content-Type header so browser displays as PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.end(pdfBuffer);
  } catch (error) {
    console.error('Error during printCatatanTrial:', error);
    if (browser) await browser.close();
    res.status(500).send({ error: 'An error occurred during PDF generation.' });
  }
}

module.exports = {
  searchPermohonanAssesment,
  getPermohonanAssesmentDetail,
  getAssesmentList,
  checkIsApproved,
  getApproverIdentity,
  checkAllowInput,
  approvePermohonanAssesment,
  rejectPermohonanAssesment,
  generatePrint,
  generateDA,
  generateSertifikat,
  downloadFileAssesment,
  printHeader
};

