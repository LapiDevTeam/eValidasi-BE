const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { getDateTime, getEmployeeName } = require('../../helpers/kalibrasi.helper');
const { uploadFileToFTP, downloadFileFromFTP, getFileExtension } = require('../../helpers/ftp.helper');

/**
 * Get DA Thermohygro List
 * Based on VBA sb_Show_Grid function
 * Route: GET /api/kalibrasi/da-thermohygro/list
 */
const getDAThermohygroList = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

    const query = `
      SELECT
        A.QA_ID,
        CASE WHEN ISNULL(Jenis_Kalibrasi, 1) = 1 THEN 'Internal' ELSE 'External' END AS Jenis_Kalibrasi,
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
      FROM T_Kalibrasi_DA_Thermohygro AS A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_DA_Thermohygro_status WHERE approver_no = 1
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
    console.error('Error in getDAThermohygroList:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching DA Thermohygro list',
      error: error.message,
    });
  }
};

/**
 * Get DA Thermohygro Detail
 * Based on VBA grid_Header_Click function
 * Route: GET /api/kalibrasi/da-thermohygro/detail
 */
const getDAThermohygroDetail = async (req, res, next) => {
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
        Catatan
      FROM T_Kalibrasi_DA_Thermohygro
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
    console.error('Error in getDAThermohygroDetail:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching DA Thermohygro detail',
      error: error.message,
    });
  }
};

/**
 * Get DA Thermohygro For Export
 * Based on VBA cmdExcel_Click function
 * Route: GET /api/kalibrasi/da-thermohygro/export
 */
const getDAThermohygroForExport = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

    // Query based on VBA gStrListerTag from cmdExcel_Click
    const query = `
      SELECT
        A.QA_ID,
        CASE WHEN ISNULL(Jenis_Kalibrasi, 1) = 1 THEN 'Internal' ELSE 'External' END AS Jenis_Kalibrasi,
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
      FROM T_Kalibrasi_DA_Thermohygro AS A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_DA_Thermohygro_status WHERE approver_no = 1
      ) AS B ON A.QA_ID = B.QA_id
      ORDER BY A.QA_ID ASC
    `;

    const results = await sequelizeMSQL.query(query, {
      type: Sequelize.QueryTypes.SELECT,
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('DA Thermohygro');

    // Get current date for filename and report header
    const currentDate = moment().utcOffset(7).format('DD-MMM-YYYY');
    const currentDateTime = moment().utcOffset(7).format('DD-MMM-YYYY HH:mm:ss');

    // Add report header
    worksheet.addRow(['DA Thermohygro Export Report']);
    worksheet.addRow([`Exported on ${currentDateTime}`]);
    worksheet.addRow([`Exported by ${nama_user || user_id}`]);
    worksheet.addRow([]);

    // Define column headers based on VBA query
    const headers = [
      'QA_ID',
      'Jenis_Kalibrasi',
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
      'f_fileName'
    ];

    // Add header row with styling
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 20;

    // Set column widths
    worksheet.columns = [
      { width: 15 },  // QA_ID
      { width: 15 },  // Jenis_Kalibrasi
      { width: 30 },  // Assm_nama_instrumen
      { width: 25 },  // Assm_No_identitas_Istrumen
      { width: 25 },  // Assm_No_identitas_kalibrasi
      { width: 20 },  // Group_Da_Dept
      { width: 35 },  // Assm_Kapasitas
      { width: 20 },  // Parameter_Kalibrasi
      { width: 20 },  // Assm_Lokasi
      { width: 15 },  // Tgl_kalibrasi
      { width: 15 },  // Kalibrasi_selanjutnya
      { width: 30 },  // Catatan
      { width: 15 },  // user_ID
      { width: 20 },  // Process_date
      { width: 30 }   // f_fileName
    ];

    // Add data rows
    results.forEach((row) => {
      const dataRow = worksheet.addRow([
        row.QA_ID || '',
        row.Jenis_Kalibrasi || '',
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
        row.f_fileName || ''
      ]);

      // Apply borders to data cells
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Apply borders to header row
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Generate Excel file buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set response headers for file download
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="DA-Thermohygro-${currentDate}.xlsx"`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    return res.send(buffer);
  } catch (error) {
    console.error('Error in getDAThermohygroForExport:', error);
    return res.status(500).json({
      success: false,
      message: 'Error exporting DA Thermohygro to Excel',
      error: error.message,
    });
  }
};

/**
 * Check if DA Thermohygro is approved
 * Based on VBA fn_IS_approve function
 * Route: GET /api/kalibrasi/da-thermohygro/is-approved
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

    const appr_level = approver_level || '1';

    const query = `
      SELECT *
      FROM T_Kalibrasi_DA_Thermohygro_status
      WHERE QA_ID = :qa_id
        AND Approver_No = :appr_level
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { qa_id, appr_level },
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
 * Check approve button status
 * Based on VBA sb_approve_button function
 * Route: GET /api/kalibrasi/da-thermohygro/check-approve
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

    // Check if user is in approver list
    const approverQuery = `
      SELECT *
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode = 'KAL_DA_Thermo'
        AND Appr_No = 1
        AND Appr_ID = :user_id
    `;

    const approverResults = await sequelizeMSQL.query(approverQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const isApprover = approverResults.length > 0;

    // Check approval status
    const approvalStatusQuery = `
      SELECT COUNT(*) AS jumRow
      FROM T_Kalibrasi_DA_Thermohygro_status
      WHERE QA_ID = :qa_id
        AND approver_no = 1
    `;

    const statusResults = await sequelizeMSQL.query(approvalStatusQuery, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const approvalCount = statusResults[0]?.jumRow || 0;

    // Check if user is allowed to input
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

    const isAllowInput = (allowInputResults[0]?.jumRow || 0) > 0;

    return res.status(200).json({
      success: true,
      canApprove: approvalCount === 0 && isApprover,
      canReject: approvalCount === 1 && isApprover,
      canSave: isAllowInput,
      canUpload: isAllowInput,
      canDelete: isAllowInput,
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
 * Based on VBA fnApprIdentity function
 * Route: GET /api/kalibrasi/da-thermohygro/approver-identity
 */
const getApproverIdentity = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { approver_id, approver_no } = req.query;

    const appr_id = approver_id || user_id;
    const appr_no = approver_no || '1';
    const applicationCode = 'KAL_DA_Thermo';

    const query = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE :applicationCode
        AND Appr_ID = :appr_id
        AND Appr_No = :appr_no
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { applicationCode, appr_id, appr_no },
      type: Sequelize.QueryTypes.SELECT,
    });

    const identity = results[0]?.Appr_Identity || '0';

    return res.status(200).json({
      success: true,
      identity,
    });
  } catch (error) {
    console.error('Error in getApproverIdentity:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching approver identity',
      error: error.message,
    });
  }
};

/**
 * Get file information
 * Based on VBA sbTampil_FIle_name function
 * Route: GET /api/kalibrasi/da-thermohygro/file
 */
const getFileInfo = async (req, res, next) => {
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
      FROM T_Kalibrasi_DA_Thermohygro
      WHERE QA_ID = :qa_id
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const fileName = results[0]?.f_Filename || '';

    return res.status(200).json({
      success: true,
      fileName,
    });
  } catch (error) {
    console.error('Error in getFileInfo:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching file information',
      error: error.message,
    });
  }
};

/**
 * Get DA Thermohygro Print Data
 * Based on VBA generate_DA_Thermo function (for print/export to Word)
 * Route: GET /api/kalibrasi/da-thermohygro/print-data
 */
const getPrintData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

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
      FROM T_Kalibrasi_DA_Thermohygro
      ORDER BY QA_ID
    `;

    const results = await sequelizeMSQL.query(query, {
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
 * Get Print Label Data (for Terkalibrasi label)
 * Based on VBA PrintLabelTerkalibrasi_Kecil function
 * Route: GET /api/kalibrasi/da-thermohygro/label-data
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
      FROM T_Kalibrasi_DA_Thermohygro
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

    const data = results[0];

    // Check if it's External calibration
    if (data.Jenis_Kalibrasi !== 'External') {
      return res.status(400).json({
        success: false,
        message: 'Tombol ini khusus Label terkalibrasi External!',
      });
    }

    // If print label date is null, we'll set current date time
    let labelPrintDate = data.Print_LabelDate;
    let labelParafBy = data.Print_LabelDelegatedTo;

    if (!labelPrintDate) {
      labelPrintDate = getDateTime();
      labelParafBy = delegated_to;

      // Update the database with print label info
      const updateQuery = `
        UPDATE T_Kalibrasi_DA_Thermohygro
        SET Print_labeldate = :labelPrintDate,
            Print_LabelUserID = :user_id,
            Print_LabelDelegatedTo = :delegated_to
        WHERE QA_ID = :qa_id
      `;

      await sequelizeMSQL.query(updateQuery, {
        replacements: { labelPrintDate, user_id, delegated_to, qa_id },
        type: Sequelize.QueryTypes.UPDATE,
      });
    } else {
      // Format existing date
      labelPrintDate = moment(labelPrintDate).utcOffset(7).format('DD-MMM-YYYY HH:mm:ss');
    }

    // Get employee name for paraf
    const employeeName = await getEmployeeName(labelParafBy);

    return res.status(200).json({
      success: true,
      data: {
        ...data,
        labelPrintDate,
        labelParafBy,
        employeeName,
      },
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
 * Get distinct department list
 * Based on VBA sbIsi_Combo_Dept function
 * Route: GET /api/kalibrasi/da-thermohygro/departments
 */
const getDepartments = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

    const query = `
      SELECT DISTINCT bagian
      FROM m_karyawan
      WHERE isActive = 1
      ORDER BY 1
    `;

    const results = await sequelizeMSQL.query(query, {
      type: Sequelize.QueryTypes.SELECT,
    });

    const departments = results.map(row => row.bagian);

    return res.status(200).json({
      success: true,
      data: departments,
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
 * Check if user is allowed to input
 * Based on VBA fnIsAllowInput function
 * Route: GET /api/kalibrasi/da-thermohygro/allow-input
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

    const isAllowed = (results[0]?.jumRow || 0) > 0;

    return res.status(200).json({
      success: true,
      isAllowed,
    });
  } catch (error) {
    console.error('Error in checkAllowInput:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking input permission',
      error: error.message,
    });
  }
};

/**
 * Save/Update DA Thermohygro
 * Based on VBA cmd_Save_Click function
 * Route: POST /api/kalibrasi/da-thermohygro/save
 */
const saveDAThermohygro = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const {
      qa_id,
      jenis_kalibrasi,
      assm_nama_instrumen,
      assm_no_identitas_istrumen,
      assm_no_identitas_kalibrasi,
      group_da_dept,
      assm_kapasitas,
      parameter_kalibrasi,
      assm_lokasi,
      tgl_kalibrasi,
      parameter_interval,
      catatan
    } = req.body;

    // Validate required fields
    if (!tgl_kalibrasi) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal kalibrasi harus isi',
      });
    }

    if (!parameter_interval || isNaN(parameter_interval)) {
      return res.status(400).json({
        success: false,
        message: 'Interval harus isi numeric',
      });
    }

    // Check if already approved
    if (qa_id) {
      const approvalCheck = `
        SELECT *
        FROM T_Kalibrasi_DA_Thermohygro_status
        WHERE QA_ID = :qa_id AND Approver_No = '1'
      `;
      const approvalResult = await sequelizeMSQL.query(approvalCheck, {
        replacements: { qa_id },
        type: Sequelize.QueryTypes.SELECT,
      });

      if (approvalResult.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Tidak bisa simpan, karena data sudah approve!',
        });
      }
    }

    let autoQAID = qa_id;
    let sql;

    // Format tanggal kalibrasi
    const formattedTglKalibrasi = moment(tgl_kalibrasi).utcOffset(7).format('YYYY-MM-DD');

    // Convert jenis_kalibrasi to numeric value
    const jenisKalibrasiValue = jenis_kalibrasi === 'Internal' || jenis_kalibrasi === '1' ? '1' : '2';

    if (!qa_id) {
      // NEW INSERT - Get auto QA_ID
      const getAutoIDQuery = `SELECT dbo.fnGetKal_DA_TH_No_ID() as QA_ID`;
      const autoIDResult = await sequelizeMSQL.query(getAutoIDQuery, {
        type: Sequelize.QueryTypes.SELECT,
      });
      autoQAID = autoIDResult[0]?.QA_ID;

      sql = `
        INSERT INTO T_Kalibrasi_DA_Thermohygro (
          QA_ID, Jenis_kalibrasi, Assm_nama_instrumen, Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi,
          Assm_Lokasi, Tgl_kalibrasi, Parameter_Interval, Kalibrasi_selanjutnya,
          Catatan, UserID, Delegated_To, Process_date
        )
        SELECT
          :autoQAID as QA_ID,
          :jenis_kalibrasi as Jenis_kalibrasi,
          :assm_nama_instrumen as Assm_nama_instrumen,
          :assm_no_identitas_istrumen as Assm_No_identitas_Istrumen,
          :assm_no_identitas_kalibrasi as Assm_No_identitas_kalibrasi,
          :group_da_dept as Group_Da_Dept,
          :assm_kapasitas as Assm_Kapasitas,
          :parameter_kalibrasi as Parameter_Kalibrasi,
          :assm_lokasi as Assm_Lokasi,
          :tgl_kalibrasi as Tgl_kalibrasi,
          :parameter_interval as Parameter_Interval,
          DATEADD(MONTH, :parameter_interval, :tgl_kalibrasi) as Kalibrasi_selanjutnya,
          :catatan as Catatan,
          :user_id as UserID,
          :delegated_to as Delegated_To,
          GETDATE() as Process_date
      `;

      await sequelizeMSQL.query(sql, {
        replacements: {
          autoQAID,
          jenis_kalibrasi: jenisKalibrasiValue,
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
          delegated_to
        },
        type: Sequelize.QueryTypes.INSERT,
      });
    } else {
      // UPDATE existing record
      sql = `
        UPDATE T_Kalibrasi_DA_Thermohygro
        SET Jenis_kalibrasi = :jenis_kalibrasi,
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

      await sequelizeMSQL.query(sql, {
        replacements: {
          jenis_kalibrasi: jenisKalibrasiValue,
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
          qa_id
        },
        type: Sequelize.QueryTypes.UPDATE,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Data has been updated',
      qa_id: autoQAID,
    });
  } catch (error) {
    console.error('Error in saveDAThermohygro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error saving DA Thermohygro',
      error: error.message,
    });
  }
};

/**
 * Approve DA Thermohygro
 * Based on VBA cmd_Approve_Click function
 * Route: POST /api/kalibrasi/da-thermohygro/approve
 */
const approveDAThermohygro = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    if (!qa_id) {
      return res.status(400).json({
        success: false,
        message: 'Data belum di pilih',
      });
    }

    // Check if already approved
    const approvalCheck = `
      SELECT *
      FROM T_Kalibrasi_DA_Thermohygro_status
      WHERE QA_ID = :qa_id AND Approver_No = '1'
    `;
    const approvalResult = await sequelizeMSQL.query(approvalCheck, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approvalResult.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa simpan, karena data sudah approve!',
      });
    }

    // Get approver identity
    const apprIdentQuery = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_DA_Thermo'
        AND Appr_ID = :user_id
        AND Appr_No = '1'
    `;
    const apprIdentResult = await sequelizeMSQL.query(apprIdentQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const vApprIdent = apprIdentResult[0]?.Appr_Identity || '';

    // Insert approval record
    const sql = `
      INSERT INTO T_Kalibrasi_DA_Thermohygro_status (
        QA_ID, Approver_No, isReject, Approver_Identity,
        Process_Date, User_ID, Delegated_To, flag_update
      )
      VALUES (
        :qa_id, 1, 0, :vApprIdent,
        GETDATE(), :user_id, :delegated_to, NULL
      )
    `;

    await sequelizeMSQL.query(sql, {
      replacements: {
        qa_id,
        vApprIdent,
        user_id,
        delegated_to
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been approved',
    });
  } catch (error) {
    console.error('Error in approveDAThermohygro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error approving DA Thermohygro',
      error: error.message,
    });
  }
};

/**
 * Reject DA Thermohygro
 * Based on VBA cmd_reject_Click function
 * Route: POST /api/kalibrasi/da-thermohygro/reject
 */
const rejectDAThermohygro = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    if (!qa_id) {
      return res.status(400).json({
        success: false,
        message: 'Data belum di pilih',
      });
    }

    // Check if approved
    const approvalCheck = `
      SELECT *
      FROM T_Kalibrasi_DA_Thermohygro_status
      WHERE QA_ID = :qa_id AND Approver_No = '1'
    `;
    const approvalResult = await sequelizeMSQL.query(approvalCheck, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approvalResult.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa reject karena belum approve!',
      });
    }

    // Delete approval record
    const sql = `
      DELETE FROM T_Kalibrasi_DA_Thermohygro_status
      WHERE QA_ID = :qa_id
    `;

    await sequelizeMSQL.query(sql, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been rejected',
    });
  } catch (error) {
    console.error('Error in rejectDAThermohygro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error rejecting DA Thermohygro',
      error: error.message,
    });
  }
};

/**
 * Upload File for DA Thermohygro
 * Based on VBA f_GMP1_upl_Click function
 * Route: POST /api/kalibrasi/da-thermohygro/upload
 */
const uploadFileDAThermohygro = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    if (!qa_id) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID is required',
      });
    }

    // Check if already approved
    const approvalCheck = `
      SELECT *
      FROM T_Kalibrasi_DA_Thermohygro_status
      WHERE QA_ID = :qa_id AND Approver_No = '1'
    `;
    const approvalResult = await sequelizeMSQL.query(approvalCheck, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approvalResult.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa upload, karena data sudah approve!',
      });
    }

    // Check if file already exists
    const fileCheck = `
      SELECT f_Filename
      FROM T_Kalibrasi_DA_Thermohygro
      WHERE QA_ID = :qa_id
    `;
    const fileResult = await sequelizeMSQL.query(fileCheck, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (fileResult[0]?.f_Filename) {
      return res.status(400).json({
        success: false,
        message: 'Hapus file dahulu jika ingin upload file',
      });
    }

    // Check if file uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Harap browse file yang akan di upload!',
      });
    }

    const localFilePath = path.resolve(req.file.path);
    const originalFileName = req.file.originalname;
    const fileExtension = getFileExtension(originalFileName);

    console.log('Upload details:', {
      localFilePath,
      exists: fs.existsSync(localFilePath),
      originalFileName,
      qa_id,
      fileExtension
    });

    if (!fs.existsSync(localFilePath)) {
      return res.status(500).json({
        success: false,
        message: 'Uploaded file not found on server'
      });
    }

    // Format remote filename: QA_ID.extension (matching VBA logic)
    const remoteFileName = `${qa_id}.${fileExtension}`;

    // Upload to FTP
    const uploadResult = await uploadFileToFTP(localFilePath, remoteFileName);

    // Clean up local file
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: uploadResult.message || 'Error uploading file to FTP'
      });
    }

    // Update database with file name
    const sql = `
      UPDATE T_Kalibrasi_DA_Thermohygro
      SET f_fileName = :fileName,
          f_userName = :user_id,
          f_delegated_to = :delegated_to,
          f_date = GETDATE()
      WHERE QA_ID = :qa_id
    `;

    await sequelizeMSQL.query(sql, {
      replacements: {
        fileName: remoteFileName,
        user_id,
        delegated_to,
        qa_id
      },
      type: Sequelize.QueryTypes.UPDATE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been upload',
      data: {
        qa_id,
        file_name: remoteFileName
      }
    });
  } catch (error) {
    // Clean up local file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error in uploadFileDAThermohygro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message,
    });
  }
};


const downloadFileDAThermohygro = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.query;

    if (!qa_id) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID is required',
      });
    }

    // Get file name from database
    const query = `
      SELECT f_Filename
      FROM T_Kalibrasi_DA_Thermohygro
      WHERE QA_ID = :qa_id
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const fileName = results[0]?.f_Filename;

    if (!fileName) {
      return res.status(404).json({
        success: false,
        message: 'File not found',
      });
    }

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
    console.error('Error in downloadFileDAThermohygro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error downloading file',
      error: error.message,
    });
  }
};

const deleteFileDAThermohygro = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    if (!qa_id) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID is required',
      });
    }

    // Check if already approved
    const approvalCheck = `
      SELECT *
      FROM T_Kalibrasi_DA_Thermohygro_status
      WHERE QA_ID = :qa_id AND Approver_No = '1'
    `;
    const approvalResult = await sequelizeMSQL.query(approvalCheck, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approvalResult.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa hapus file, karena data sudah approve!',
      });
    }

    // Check if file exists
    const fileCheck = `
      SELECT f_Filename
      FROM T_Kalibrasi_DA_Thermohygro
      WHERE QA_ID = :qa_id
    `;
    const fileResult = await sequelizeMSQL.query(fileCheck, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (!fileResult[0]?.f_Filename) {
      return res.status(400).json({
        success: false,
        message: 'File not found',
      });
    }

    // Update database - set file name to null
    const sql = `
      UPDATE T_Kalibrasi_DA_Thermohygro
      SET f_fileName = NULL,
          f_userName = :user_id,
          f_delegated_to = :delegated_to,
          f_date = GETDATE()
      WHERE QA_ID = :qa_id
    `;

    await sequelizeMSQL.query(sql, {
      replacements: {
        user_id,
        delegated_to,
        qa_id
      },
      type: Sequelize.QueryTypes.UPDATE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been deleted',
    });
  } catch (error) {
    console.error('Error in deleteFileDAThermohygro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message,
    });
  }
};

module.exports = {
  getDAThermohygroList,
  getDAThermohygroDetail,
  getDAThermohygroForExport,
  checkIsApproved,
  checkApproveButton,
  getApproverIdentity,
  getFileInfo,
  getPrintData,
  getLabelData,
  getDepartments,
  checkAllowInput,
  saveDAThermohygro,
  approveDAThermohygro,
  rejectDAThermohygro,
  uploadFileDAThermohygro,
  downloadFileDAThermohygro,
  deleteFileDAThermohygro,
};
