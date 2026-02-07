const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');
const ExcelJS = require('exceljs');
const { getDateTime, getEmployeeName } = require('../../helpers/kalibrasi.helper');

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
};
