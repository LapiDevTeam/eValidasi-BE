const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment-timezone');
const ExcelJS = require('exceljs');
const { getDateTime, getEmployeeName, getApproverIdentity } = require('../../helpers/kalibrasi.helper');
const { uploadFileToFTP, downloadFileFromFTP, deleteFileFromFTP, getFileExtension } = require('../../helpers/ftp.helper');
const fs = require('fs');
const path = require('path');

/**
 * Get DA Bagian List
 * Based on VBA sb_Show_Grid function
 * Route: GET /api/kalibrasi/da-bagian/list
 */
const getDaBagianList = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

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
        Catatan,
        B.user_ID,
        CONVERT(VARCHAR(20), B.Process_date, 13) AS Process_date,
        ISNULL(f_fileName, '') AS f_fileName
      FROM T_Kalibrasi_DA_Bagian AS A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_DA_Bagian_status WHERE approver_no = 1
      ) AS B ON A.QA_ID = B.QA_id
      ORDER BY A.QA_ID ASC
    `;

    const results = await sequelizeMSQL.query(query, {
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in getDaBagianList:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching DA Bagian list',
      error: error.message,
    });
  }
};

/**
 * Get DA Bagian Detail by QA_ID
 * Based on VBA grid_Header_Click function
 * Route: GET /api/kalibrasi/da-bagian/detail
 */
const getDaBagianDetail = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.query;

    if (!qa_id) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID is required',
      });
    }

    const query = `
      SELECT
        QA_ID,
        CASE WHEN ISNULL(Jenis_Kalibrasi, 1) = 1 THEN 'Internal' ELSE 'External' END AS Jenis_Kalibrasi,
        Parameter_Sertifikasi,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        Tgl_kalibrasi,
        Parameter_Interval,
        Kalibrasi_selanjutnya,
        Catatan
      FROM T_Kalibrasi_DA_Bagian
      WHERE QA_ID = :qa_id
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { qa_id },
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
    console.error('Error in getDaBagianDetail:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching DA Bagian detail',
      error: error.message,
    });
  }
};

/**
 * Get DA Bagian for Excel Export
 * Based on VBA cmdExcel_Click function (gStrListerTag query)
 * Route: GET /api/kalibrasi/da-bagian/export
 */
const getDaBagianForExport = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

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
        LEFT(CONVERT(NVARCHAR(20), Tgl_kalibrasi, 112), 4) + '-' +
          SUBSTRING(CONVERT(NVARCHAR(20), Tgl_kalibrasi, 112), 5, 2) + '-' +
          RIGHT(CONVERT(NVARCHAR(20), Tgl_kalibrasi, 112), 2) AS Tgl_kalibrasi,
        LEFT(CONVERT(NVARCHAR(20), Kalibrasi_selanjutnya, 112), 4) + '-' +
          SUBSTRING(CONVERT(NVARCHAR(20), Kalibrasi_selanjutnya, 112), 5, 2) + '-' +
          RIGHT(CONVERT(NVARCHAR(20), Kalibrasi_selanjutnya, 112), 2) AS Kalibrasi_selanjutnya,
        Catatan,
        B.user_ID,
        CONVERT(VARCHAR(20), B.Process_date, 13) AS Process_date,
        ISNULL(f_fileName, '') AS f_fileName
      FROM T_Kalibrasi_DA_Bagian AS A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_DA_Bagian_status WHERE approver_no = 1
      ) AS B ON A.QA_ID = B.QA_id
      ORDER BY A.QA_ID ASC
    `;

    const results = await sequelizeMSQL.query(query, {
      type: Sequelize.QueryTypes.SELECT,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('DA Bagian');

    const currentDate = moment().utcOffset(7).format('DD-MMM-YYYY');
    const currentDateTime = moment().utcOffset(7).format('DD-MMM-YYYY HH:mm:ss');

    worksheet.addRow(['DA Bagian Export Report']);
    worksheet.addRow([`Exported on ${currentDateTime}`]);
    worksheet.addRow([`Exported by ${nama_user || user_id}`]);
    worksheet.addRow([]);

    const headers = [
      'QA_ID',
      'Jenis_Kalibrasi',
      'Parameter_Sertifikasi',
      'Assm_nama_instrumen',
      'Assm_No_identitas_Istrumen',
      'Assm_No_identitas_kalibrasi',
      'Group_Da_Dept',
      'Assm_Kapasitas',
      'Parameter_Kalibrasi',
      'Assm_Lokasi',
      'Tgl_kalibrasi',
      'Kalibrasi_selanjutnya',
      'Catatan',
      'user_ID',
      'Process_date',
      'f_fileName',
    ];

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    worksheet.columns = [
      { width: 15 },
      { width: 15 },
      { width: 20 },
      { width: 30 },
      { width: 25 },
      { width: 25 },
      { width: 20 },
      { width: 30 },
      { width: 20 },
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 30 },
      { width: 15 },
      { width: 20 },
      { width: 30 },
    ];

    results.forEach((row) => {
      const dataRow = worksheet.addRow([
        row.QA_ID || '',
        row.Jenis_Kalibrasi || '',
        row.Parameter_Sertifikasi || '',
        row.Assm_nama_instrumen || '',
        row.Assm_No_identitas_Istrumen || '',
        row.Assm_No_identitas_kalibrasi || '',
        row.Group_Da_Dept || '',
        row.Assm_Kapasitas || '',
        row.Parameter_Kalibrasi || '',
        row.Assm_Lokasi || '',
        row.Tgl_kalibrasi || '',
        row.Kalibrasi_selanjutnya || '',
        row.Catatan || '',
        row.user_ID || '',
        row.Process_date || '',
        row.f_fileName || '',
      ]);

      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="DA-Bagian-${currentDate}.xlsx"`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    return res.send(buffer);
  } catch (error) {
    console.error('Error in getDaBagianForExport:', error);
    return res.status(500).json({
      success: false,
      message: 'Error exporting DA Bagian to Excel',
      error: error.message,
    });
  }
};

/**
 * Get Print Data for DA Bagian document
 * Based on VBA generate_DA_Thermo query (filtered by Group_Da_Dept)
 * Route: GET /api/kalibrasi/da-bagian/print-data
 */
const getPrintData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { bagian } = req.query;

    if (!bagian) {
      return res.status(400).json({
        success: false,
        message: 'Bagian is required',
      });
    }

    const query = `
      SELECT
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        CAST(Parameter_Interval AS VARCHAR) + ' Bulan' AS Parameter_Interval,
        CONVERT(NVARCHAR(11), Kalibrasi_selanjutnya, 113) AS Kalibrasi_selanjutnya,
        Catatan
      FROM T_Kalibrasi_DA_Bagian
      WHERE Group_Da_Dept = :bagian
      ORDER BY QA_ID
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { bagian },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in getPrintData:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching print data',
      error: error.message,
    });
  }
};

/**
 * Get Label Terkalibrasi Data
 * Based on VBA PrintLabelTerkalibrasi_Besar / PrintLabelTerkalibrasi_Kecil query
 * Route: GET /api/kalibrasi/da-bagian/label-data
 */
const getLabelData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.query;

    if (!qa_id) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID is required',
      });
    }

    const query = `
      SELECT
        QA_ID,
        CASE WHEN ISNULL(Jenis_Kalibrasi, 1) = 1 THEN 'Internal' ELSE 'External' END AS Jenis_Kalibrasi,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        Tgl_kalibrasi,
        Parameter_Interval,
        Kalibrasi_selanjutnya,
        Catatan,
        Print_LabelDate,
        Print_LabelUserID,
        Print_LabelDelegatedTo
      FROM T_Kalibrasi_DA_Bagian
      WHERE QA_ID = :qa_id
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { qa_id },
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
    console.error('Error in getLabelData:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching label data',
      error: error.message,
    });
  }
};

/**
 * Get File Name for a record
 * Based on VBA sbTampil_FIle_name function
 * Route: GET /api/kalibrasi/da-bagian/file-name
 */
const getFileName = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.query;

    if (!qa_id) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID is required',
      });
    }

    const query = `
      SELECT f_Filename
      FROM T_Kalibrasi_DA_Bagian
      WHERE QA_ID = :qa_id
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      fileName: results.length > 0 ? (results[0].f_Filename || '') : '',
    });
  } catch (error) {
    console.error('Error in getFileName:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting file name',
      error: error.message,
    });
  }
};

/**
 * Get Next Calibration Date
 * Based on VBA sb_Isi_Kalibrasi_Selanjutnya function
 * Route: GET /api/kalibrasi/da-bagian/next-calibration
 */
const getNextCalibrationDate = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.query;

    if (!qa_id) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID is required',
      });
    }

    const query = `
      SELECT REPLACE(CONVERT(VARCHAR(11), Kalibrasi_selanjutnya, 13), ' ', '-') AS Kalibrasi_selanjutnya
      FROM T_Kalibrasi_DA_Bagian
      WHERE QA_ID = :qa_id
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      nextCalibrationDate: results.length > 0 ? (results[0].Kalibrasi_selanjutnya || '') : '',
    });
  } catch (error) {
    console.error('Error in getNextCalibrationDate:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting next calibration date',
      error: error.message,
    });
  }
};

/**
 * Check if a record is approved at a given approver level
 * Based on VBA fn_IS_approve function
 * Route: GET /api/kalibrasi/da-bagian/is-approved
 */
const checkIsApproved = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, approver_level } = req.query;

    if (!qa_id) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID is required',
      });
    }

    const apprLevel = approver_level || '1';

    const query = `
      SELECT *
      FROM T_Kalibrasi_DA_Bagian_status
      WHERE QA_ID = :qa_id
        AND Approver_No = :apprLevel
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { qa_id, apprLevel },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      isApproved: results.length > 0,
    });
  } catch (error) {
    console.error('Error in checkIsApproved:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking approval status',
      error: error.message,
    });
  }
};

/**
 * Check approve / reject button status
 * Based on VBA sb_approve_button function
 * Route: GET /api/kalibrasi/da-bagian/check-approve-button
 *
 * Logic:
 * 1. Check if user is in m_approver_lines for KAL_DA_Bagian Appr_No = 1
 * 2. Check count of approval records in T_Kalibrasi_DA_Bagian_status for QA_ID + approver_no = 1
 * 3. canApprove = count == 0 AND isApprover AND hasInputPermission
 * 4. canReject  = count == 1 AND isApprover AND hasInputPermission
 */
const checkApproveButton = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.query;

    if (!qa_id) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID is required',
      });
    }

    // 1# Check if user is an approver for KAL_DA_Bagian
    const approverQuery = `
      SELECT *
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode = 'KAL_DA_Bagian'
        AND Appr_No = 1
        AND Appr_ID = :user_id
    `;

    const approverResults = await sequelizeMSQL.query(approverQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const isApprover = approverResults.length > 0;

    // 2# Check how many approval records exist for this QA_ID at level 1
    const statusQuery = `
      SELECT COUNT(*) AS JumRow
      FROM T_Kalibrasi_DA_Bagian_status
      WHERE QA_ID = :qa_id
        AND approver_no = 1
    `;

    const statusResults = await sequelizeMSQL.query(statusQuery, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const jumRow = Number(statusResults[0].JumRow);

    // Check allow input permission
    const allowInputQuery = `
      SELECT COUNT(*) AS jumRow
      FROM m_approver_lines
      WHERE isActive = 1
        AND Appr_ApplicationCode IN ('KAL_Allow_Input')
        AND Appr_ID = :user_id
    `;

    const allowInputResults = await sequelizeMSQL.query(allowInputQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const hasInputPermission = Number(allowInputResults[0].jumRow) > 0;

    return res.status(200).json({
      success: true,
      canApprove: jumRow === 0 && isApprover && hasInputPermission,
      canReject: jumRow === 1 && isApprover && hasInputPermission,
      isApprover,
      isAlreadyApproved: jumRow > 0,
      hasInputPermission,
    });
  } catch (error) {
    console.error('Error in checkApproveButton:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking approve button status',
      error: error.message,
    });
  }
};

/**
 * Get Approver Identity
 * Based on VBA fnApprIdentity function (applicationCode = 'KAL_DA_Bagian')
 * Route: GET /api/kalibrasi/da-bagian/approver-identity
 */
const getApprIdentity = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { approver_id, approver_no } = req.query;

    const apprId = approver_id || user_id;
    const apprNo = approver_no || '1';

    const query = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_DA_Bagian'
        AND Appr_ID = :apprId
        AND Appr_No = :apprNo
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { apprId, apprNo },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      approverIdentity: results.length > 0 ? results[0].Appr_Identity : 0,
    });
  } catch (error) {
    console.error('Error in getApprIdentity:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting approver identity',
      error: error.message,
    });
  }
};

/**
 * Check if user has input permission
 * Based on VBA fnIsAllowInput function
 * Route: GET /api/kalibrasi/da-bagian/allow-input
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

    return res.status(200).json({
      success: true,
      allowInput: Number(results[0].jumRow) > 0,
      count: Number(results[0].jumRow),
    });
  } catch (error) {
    console.error('Error in checkAllowInput:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking allow input permission',
      error: error.message,
    });
  }
};

/**
 * Get departments list from m_karyawan
 * Based on VBA sbIsi_Combo_Dept function
 * Route: GET /api/kalibrasi/da-bagian/departments
 */
const getDepartments = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

    const query = `
      SELECT DISTINCT bagian
      FROM m_karyawan
      WHERE isActive = 1
      ORDER BY bagian
    `;

    const results = await sequelizeMSQL.query(query, {
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in getDepartments:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching departments',
      error: error.message,
    });
  }
};

/**
 * Get distinct Bagian list from T_Kalibrasi_DA_Bagian (for print combo)
 * Based on VBA cmd_print_Click - cbo_Bagian fill query
 * Route: GET /api/kalibrasi/da-bagian/bagian-list
 */
const getBagianList = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

    const query = `
      SELECT DISTINCT Group_Da_Dept AS dept
      FROM T_Kalibrasi_DA_Bagian
      ORDER BY 1
    `;

    const results = await sequelizeMSQL.query(query, {
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in getBagianList:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching bagian list',
      error: error.message,
    });
  }
};

/**
 * Save (Insert or Update) DA Bagian record
 * Based on VBA cmd_Save_Click function
 * fnComboValue: 'Internal' -> 1, else -> 2
 * Route: POST /api/kalibrasi/da-bagian/save
 */
const saveDaBagian = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const {
      qa_id,
      jenis_kalibrasi,
      parameter_sertifikasi,
      assm_nama_instrumen,
      assm_no_identitas_istrumen,
      assm_no_identitas_kalibrasi,
      group_da_dept,
      assm_kapasitas,
      parameter_kalibrasi,
      assm_lokasi,
      tgl_kalibrasi,
      parameter_interval,
      catatan,
    } = req.body;

    // Validate tgl_kalibrasi
    if (!tgl_kalibrasi || tgl_kalibrasi === '') {
      return res.status(400).json({
        success: false,
        message: 'Tanggal kalibrasi harus isi',
      });
    }

    // Validate interval is numeric
    if (parameter_interval === undefined || parameter_interval === null || parameter_interval === '' || isNaN(parameter_interval)) {
      return res.status(400).json({
        success: false,
        message: 'Interval harus isi numeric',
      });
    }

    // If editing existing record, check not already approved
    if (qa_id && qa_id !== '') {
      const checkApprovedQuery = `
        SELECT *
        FROM T_Kalibrasi_DA_Bagian_status
        WHERE QA_ID = :qa_id
          AND Approver_No = 1
      `;
      const approvedResults = await sequelizeMSQL.query(checkApprovedQuery, {
        replacements: { qa_id },
        type: Sequelize.QueryTypes.SELECT,
      });
      if (approvedResults.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tidak bisa simpan, karena data sudah approve!',
        });
      }
    }

    // fnComboValue: Internal -> 1, External (else) -> 2
    const jenisKalValue = jenis_kalibrasi === 'Internal' ? '1' : '2';

    // Format tgl_kalibrasi as yyyy/MM/dd (matching VBA Format(CDate(...),'yyyy/MM/dd'))
    const formattedTglKalibrasi = moment(tgl_kalibrasi).utcOffset(7).format('YYYY/MM/DD');

    const isNew = !qa_id || qa_id === '';

    if (isNew) {
      // Get auto generated QA_ID
      const autoNumQuery = `SELECT dbo.fnGetKal_DA_BA_No_ID() AS QA_ID`;
      const autoNumResults = await sequelizeMSQL.query(autoNumQuery, {
        type: Sequelize.QueryTypes.SELECT,
      });
      const autoQaId = autoNumResults[0].QA_ID;

      // INSERT - exact match to VBA cmd_Save_Click INSERT logic
      const insertQuery = `
        INSERT INTO T_Kalibrasi_DA_Bagian (
          QA_ID,
          Jenis_kalibrasi,
          Parameter_Sertifikasi,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Assm_Lokasi,
          Tgl_kalibrasi,
          Parameter_Interval,
          Kalibrasi_selanjutnya,
          Catatan,
          UserID,
          Delegated_To,
          Process_date
        )
        SELECT
          :qa_id AS QA_ID,
          :jenis_kalibrasi AS Jenis_kalibrasi,
          :parameter_sertifikasi AS Parameter_Sertifikasi,
          :assm_nama_instrumen AS Assm_nama_instrumen,
          :assm_no_identitas_istrumen AS Assm_No_identitas_Istrumen,
          :assm_no_identitas_kalibrasi AS Assm_No_identitas_kalibrasi,
          :group_da_dept AS Group_Da_Dept,
          :assm_kapasitas AS Assm_Kapasitas,
          :parameter_kalibrasi AS Parameter_Kalibrasi,
          :assm_lokasi AS Assm_Lokasi,
          :tgl_kalibrasi AS Tgl_kalibrasi,
          :parameter_interval AS Parameter_Interval,
          DATEADD(MONTH, :parameter_interval, :tgl_kalibrasi) AS Kalibrasi_selanjutnya,
          :catatan AS Catatan,
          :user_id AS UserID,
          :delegated_to AS Delegated_To,
          GETDATE() AS Process_date
      `;

      await sequelizeMSQL.query(insertQuery, {
        replacements: {
          qa_id: autoQaId,
          jenis_kalibrasi: jenisKalValue,
          parameter_sertifikasi: parameter_sertifikasi || '',
          assm_nama_instrumen: assm_nama_instrumen || '',
          assm_no_identitas_istrumen: assm_no_identitas_istrumen || '',
          assm_no_identitas_kalibrasi: assm_no_identitas_kalibrasi || '',
          group_da_dept: group_da_dept || '',
          assm_kapasitas: assm_kapasitas || '',
          parameter_kalibrasi: parameter_kalibrasi || '',
          assm_lokasi: assm_lokasi || '',
          tgl_kalibrasi: formattedTglKalibrasi,
          parameter_interval: parameter_interval,
          catatan: catatan || '',
          user_id,
          delegated_to,
        },
        type: Sequelize.QueryTypes.INSERT,
      });

      return res.status(201).json({
        success: true,
        message: 'Data has been saved',
        data: { qa_id: autoQaId },
      });

    } else {
      // UPDATE - exact match to VBA cmd_Save_Click UPDATE logic
      // Note: Kalibrasi_selanjutnya uses the tgl_kalibrasi from request body (matches VBA)
      const updateQuery = `
        UPDATE T_Kalibrasi_DA_Bagian
        SET
          Jenis_kalibrasi = :jenis_kalibrasi,
          Parameter_Sertifikasi = :parameter_sertifikasi,
          Assm_nama_instrumen = :assm_nama_instrumen,
          Assm_No_identitas_Istrumen = :assm_no_identitas_istrumen,
          Assm_No_identitas_kalibrasi = :assm_no_identitas_kalibrasi,
          Group_Da_Dept = :group_da_dept,
          Assm_Kapasitas = :assm_kapasitas,
          Parameter_Kalibrasi = :parameter_kalibrasi,
          Assm_Lokasi = :assm_lokasi,
          tgl_kalibrasi = :tgl_kalibrasi,
          Parameter_Interval = :parameter_interval,
          Kalibrasi_selanjutnya = DATEADD(MONTH, :parameter_interval, :tgl_kalibrasi),
          Catatan = :catatan
        WHERE QA_ID = :qa_id
      `;

      await sequelizeMSQL.query(updateQuery, {
        replacements: {
          qa_id,
          jenis_kalibrasi: jenisKalValue,
          parameter_sertifikasi: parameter_sertifikasi || '',
          assm_nama_instrumen: assm_nama_instrumen || '',
          assm_no_identitas_istrumen: assm_no_identitas_istrumen || '',
          assm_no_identitas_kalibrasi: assm_no_identitas_kalibrasi || '',
          group_da_dept: group_da_dept || '',
          assm_kapasitas: assm_kapasitas || '',
          parameter_kalibrasi: parameter_kalibrasi || '',
          assm_lokasi: assm_lokasi || '',
          tgl_kalibrasi: formattedTglKalibrasi,
          parameter_interval: parameter_interval,
          catatan: catatan || '',
        },
        type: Sequelize.QueryTypes.UPDATE,
      });

      return res.status(200).json({
        success: true,
        message: 'Data has been updated',
        data: { qa_id },
      });
    }

  } catch (error) {
    console.error('Error in saveDaBagian:', error);
    return res.status(500).json({
      success: false,
      message: 'Error saving DA Bagian',
      error: error.message,
    });
  }
};

/**
 * Approve DA Bagian record
 * Based on VBA cmd_Approve_Click function
 * Route: POST /api/kalibrasi/da-bagian/approve
 */
const approveDaBagian = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    if (!qa_id || qa_id === '') {
      return res.status(400).json({
        success: false,
        message: 'Data belum di pilih',
      });
    }

    // Check if already approved - cannot approve again
    const checkApprovedQuery = `
      SELECT *
      FROM T_Kalibrasi_DA_Bagian_status
      WHERE QA_ID = :qa_id
        AND Approver_No = 1
    `;
    const approvedResults = await sequelizeMSQL.query(checkApprovedQuery, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });
    if (approvedResults.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa simpan, karena data sudah approve!',
      });
    }

    // Get approver identity: fnApprIdentity(gstrUserName, 1) with code 'KAL_DA_Bagian'
    const approverIdentityQuery = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_DA_Bagian'
        AND Appr_ID = :user_id
        AND Appr_No = 1
    `;
    const approverResults = await sequelizeMSQL.query(approverIdentityQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });
    const apprIdent = approverResults.length > 0 ? approverResults[0].Appr_Identity : '0';

    // INSERT approval - exact match to VBA cmd_Approve_Click
    const insertApprovalQuery = `
      INSERT INTO T_Kalibrasi_DA_Bagian_status (
        QA_ID,
        Approver_No,
        isReject,
        Approver_Identity,
        Process_Date,
        User_ID,
        Delegated_To,
        flag_update
      )
      VALUES (
        :qa_id,
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
        qa_id,
        approver_identity: apprIdent,
        user_id,
        delegated_to,
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been approved',
      data: { qa_id, approver_identity: apprIdent },
    });

  } catch (error) {
    console.error('Error in approveDaBagian:', error);
    return res.status(500).json({
      success: false,
      message: 'Error approving DA Bagian',
      error: error.message,
    });
  }
};

/**
 * Reject DA Bagian record (remove approval)
 * Based on VBA cmd_reject_Click function
 * Route: POST /api/kalibrasi/da-bagian/reject
 */
const rejectDaBagian = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    if (!qa_id || qa_id === '') {
      return res.status(400).json({
        success: false,
        message: 'Data belum di pilih',
      });
    }

    // Must be approved to be able to reject
    const checkApprovedQuery = `
      SELECT *
      FROM T_Kalibrasi_DA_Bagian_status
      WHERE QA_ID = :qa_id
        AND Approver_No = 1
    `;
    const approvedResults = await sequelizeMSQL.query(checkApprovedQuery, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });
    if (approvedResults.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa reject karena belum approve!',
      });
    }

    // Delete approval record - exact match to VBA cmd_reject_Click
    const deleteQuery = `
      DELETE FROM T_Kalibrasi_DA_Bagian_status
      WHERE QA_ID = :qa_id
    `;
    await sequelizeMSQL.query(deleteQuery, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been rejected',
      data: { qa_id },
    });

  } catch (error) {
    console.error('Error in rejectDaBagian:', error);
    return res.status(500).json({
      success: false,
      message: 'Error rejecting DA Bagian',
      error: error.message,
    });
  }
};

/**
 * Upload File to FTP for DA Bagian
 * Based on VBA f_GMP1_upl_Click function
 * Remote path: eKalibrasi/{qa_id}.{ext}
 * Route: POST /api/kalibrasi/da-bagian/upload
 */
const uploadFileDaBagian = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    if (!qa_id || qa_id === '') {
      return res.status(400).json({
        success: false,
        message: 'DA belum di pilih',
      });
    }

    // Check not already approved
    const checkApprovedQuery = `
      SELECT *
      FROM T_Kalibrasi_DA_Bagian_status
      WHERE QA_ID = :qa_id
        AND Approver_No = 1
    `;
    const approvedResults = await sequelizeMSQL.query(checkApprovedQuery, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });
    if (approvedResults.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa upload file, karena data sudah approve!',
      });
    }

    // Check no existing file (must delete first)
    const checkFileQuery = `
      SELECT f_fileName
      FROM T_Kalibrasi_DA_Bagian
      WHERE QA_ID = :qa_id
    `;
    const fileResults = await sequelizeMSQL.query(checkFileQuery, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });
    if (fileResults.length > 0 && fileResults[0].f_fileName) {
      return res.status(400).json({
        success: false,
        message: 'Hapus file dahulu jika ingin upload file',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Harap browse file yang akan di upload!',
      });
    }

    const localFilePath = path.resolve(req.file.path);
    const fileExtension = getFileExtension(req.file.originalname);

    // Remote file name: {QA_ID}.{ext}  - exact match to VBA
    const remoteFileName = `${qa_id}.${fileExtension}`;

    const uploadResult = await uploadFileToFTP(localFilePath, remoteFileName);

    // Clean up local temp file
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: uploadResult.message || 'Error uploading file to FTP',
      });
    }

    // Update DB - exact match to VBA f_GMP1_upl_Click
    const updateQuery = `
      UPDATE T_Kalibrasi_DA_Bagian
      SET f_fileName = :file_name,
          f_userName = :user_id,
          f_delegated_to = :delegated_to,
          f_date = GETDATE()
      WHERE QA_ID = :qa_id
    `;
    await sequelizeMSQL.query(updateQuery, {
      replacements: { qa_id, file_name: remoteFileName, user_id, delegated_to },
      type: Sequelize.QueryTypes.UPDATE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been upload',
      data: { qa_id, file_name: remoteFileName },
    });

  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error in uploadFileDaBagian:', error);
    return res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message,
    });
  }
};

/**
 * Download File from FTP for DA Bagian
 * Based on VBA f_GMP1_Dow_Click function
 * Route: GET /api/kalibrasi/da-bagian/download
 */
const downloadFileDaBagian = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.query;

    if (!qa_id || qa_id === '') {
      return res.status(400).json({
        success: false,
        message: 'DA belum di pilih',
      });
    }

    // Get file name from DB
    const checkFileQuery = `
      SELECT f_fileName
      FROM T_Kalibrasi_DA_Bagian
      WHERE QA_ID = :qa_id
    `;
    const fileResults = await sequelizeMSQL.query(checkFileQuery, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (fileResults.length === 0 || !fileResults[0].f_fileName) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

    const fileName = fileResults[0].f_fileName;

    const tempDir = path.join(__dirname, '../../tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const localFilePath = path.join(tempDir, fileName);

    const downloadResult = await downloadFileFromFTP(fileName, localFilePath);
    if (!downloadResult.success) {
      return res.status(500).json({
        success: false,
        message: downloadResult.message || 'Error downloading file from FTP',
      });
    }

    res.download(localFilePath, fileName, (err) => {
      if (fs.existsSync(localFilePath)) {
        try { fs.unlinkSync(localFilePath); } catch (e) { console.error('Error deleting temp file:', e); }
      }
      if (err && !res.headersSent) {
        console.error('Error sending file:', err);
        return res.status(500).json({ success: false, message: 'Error sending file' });
      }
    });

  } catch (error) {
    console.error('Error in downloadFileDaBagian:', error);
    return res.status(500).json({
      success: false,
      message: 'Error downloading file',
      error: error.message,
    });
  }
};

/**
 * Delete File from FTP record for DA Bagian
 * Based on VBA f_GMP1_del_Click function
 * Route: POST /api/kalibrasi/da-bagian/delete-file
 */
const deleteFileDaBagian = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    if (!qa_id || qa_id === '') {
      return res.status(400).json({
        success: false,
        message: 'DA belum di pilih',
      });
    }

    // Check file exists
    const checkFileQuery = `
      SELECT f_fileName
      FROM T_Kalibrasi_DA_Bagian
      WHERE QA_ID = :qa_id
    `;
    const fileResults = await sequelizeMSQL.query(checkFileQuery, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });
    if (fileResults.length === 0 || !fileResults[0].f_fileName) {
      return res.status(400).json({
        success: false,
        message: 'File not found',
      });
    }

    // Check not already approved
    const checkApprovedQuery = `
      SELECT *
      FROM T_Kalibrasi_DA_Bagian_status
      WHERE QA_ID = :qa_id
        AND Approver_No = 1
    `;
    const approvedResults = await sequelizeMSQL.query(checkApprovedQuery, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });
    if (approvedResults.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa hapus file, karena data sudah approve!',
      });
    }

    // Remove file reference from DB - exact match to VBA f_GMP1_del_Click
    const updateQuery = `
      UPDATE T_Kalibrasi_DA_Bagian
      SET f_fileName = NULL,
          f_userName = :user_id,
          f_delegated_to = :delegated_to,
          f_date = GETDATE()
      WHERE QA_ID = :qa_id
    `;
    await sequelizeMSQL.query(updateQuery, {
      replacements: { qa_id, user_id, delegated_to },
      type: Sequelize.QueryTypes.UPDATE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been deleted',
      data: { qa_id },
    });

  } catch (error) {
    console.error('Error in deleteFileDaBagian:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message,
    });
  }
};

module.exports = {
  getDaBagianList,
  getDaBagianDetail,
  getDaBagianForExport,
  getPrintData,
  getLabelData,
  getFileName,
  getNextCalibrationDate,
  checkIsApproved,
  checkApproveButton,
  getApprIdentity,
  checkAllowInput,
  getDepartments,
  getBagianList,
  saveDaBagian,
  approveDaBagian,
  rejectDaBagian,
  uploadFileDaBagian,
  downloadFileDaBagian,
  deleteFileDaBagian,
};
