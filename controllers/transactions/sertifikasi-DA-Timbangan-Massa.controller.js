const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment-timezone');
const ExcelJS = require('exceljs');
const { getDateTime, getEmployeeName, getApproverIdentity } = require('../../helpers/kalibrasi.helper');
const { uploadFileToFTP, downloadFileFromFTP, deleteFileFromFTP, getFileExtension } = require('../../helpers/ftp.helper');
const fs = require('fs');
const path = require('path');

// ============================================================
// GETTER FUNCTIONS
// ============================================================

/**
 * Get DA Timbangan List
 * Based on VBA sb_Show_Grid function
 * Route: GET /api/transactions/da-timbangan-massa/list
 */
const getDaTimbangaList = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

    const query = `
      SELECT
        A.QA_ID,
        CASE WHEN ISNULL(Jenis_Kalibrasi, 1) = 1 THEN 'Internal' ELSE 'External' END AS Jenis_Kalibrasi,
        CASE WHEN ISNULL(Program_verifikasi, 0) = 1 THEN 'Ya' ELSE 'Tidak' END AS Program_verifikasi,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        REPLACE(CONVERT(CHAR(11), Tgl_kalibrasi, 106), ' ', '-') AS Tgl_kalibrasi,
        CAST(interval AS VARCHAR) + ' Bulan' AS interval,
        REPLACE(CONVERT(CHAR(11), Kalibrasi_selanjutnya, 106), ' ', '/') AS Kalibrasi_selanjutnya,
        Catatan,
        A.Parameter_No_id_anak_timbang,
        A.Parameter_Interval,
        A.parameter_kriteria,
        A.Pelaksana_Verifikasi,
        A.Titik_verifikasi,
        B.user_ID,
        CONVERT(VARCHAR(20), B.Process_date, 13) AS Process_date,
        ISNULL(f_fileName, '') AS f_fileName
      FROM T_Kalibrasi_DA_Timbangan AS A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_DA_Timbangan_status WHERE approver_no = 1
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
    console.error('Error in getDaTimbangaList:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching DA Timbangan list',
      error: error.message,
    });
  }
};

/**
 * Get DA Timbangan Detail
 * Based on VBA grid_Header_Click function
 * Route: GET /api/transactions/da-timbangan-massa/detail
 */
const getDaTimbangaDetail = async (req, res, next) => {
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
        CASE WHEN ISNULL(Program_verifikasi, 0) = 1 THEN 'Ya' ELSE 'Tidak' END AS Program_verifikasi,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        Tgl_kalibrasi,
        interval,
        Kalibrasi_selanjutnya,
        Catatan,
        Parameter_No_id_anak_timbang,
        Parameter_Interval,
        parameter_kriteria,
        Pelaksana_Verifikasi,
        Titik_verifikasi
      FROM T_Kalibrasi_DA_Timbangan
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
    console.error('Error in getDaTimbangaDetail:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching DA Timbangan detail',
      error: error.message,
    });
  }
};

/**
 * Get DA Timbangan for Excel Export
 * Based on VBA cmdExcel_Click function (gStrListerTag)
 * Route: GET /api/transactions/da-timbangan-massa/export
 */
const getDaTimbangaForExport = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

    const query = `
      SELECT
        A.QA_ID,
        CASE WHEN ISNULL(Jenis_Kalibrasi, 1) = 1 THEN 'Internal' ELSE 'External' END AS Jenis_Kalibrasi,
        CASE WHEN ISNULL(Program_verifikasi, 0) = 1 THEN 'Ya' ELSE 'Tidak' END AS Program_verifikasi,
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
        A.Parameter_No_id_anak_timbang,
        A.Parameter_Interval,
        A.parameter_kriteria,
        A.Pelaksana_Verifikasi,
        A.Titik_verifikasi,
        B.user_ID,
        CONVERT(VARCHAR(20), B.Process_date, 13) AS Process_date,
        ISNULL(f_fileName, '') AS f_fileName
      FROM T_Kalibrasi_DA_Timbangan AS A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_DA_Timbangan_status WHERE approver_no = 1
      ) AS B ON A.QA_ID = B.QA_id
      ORDER BY A.QA_ID ASC
    `;

    const results = await sequelizeMSQL.query(query, {
      type: Sequelize.QueryTypes.SELECT,
    });

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('DA Timbangan');

    const currentDate = moment().utcOffset(7).format('DD-MMM-YYYY');
    const currentDateTime = moment().utcOffset(7).format('DD-MMM-YYYY HH:mm:ss');

    // Report header rows
    worksheet.addRow(['DA Timbangan Export Report']);
    worksheet.addRow([`Exported on ${currentDateTime}`]);
    worksheet.addRow([`Exported by ${nama_user || user_id}`]);
    worksheet.addRow([]);

    const headers = [
      'QA_ID',
      'Jenis_Kalibrasi',
      'Program_verifikasi',
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
      'Parameter_No_id_anak_timbang',
      'Parameter_Interval',
      'parameter_kriteria',
      'Pelaksana_Verifikasi',
      'Titik_verifikasi',
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
      { width: 15 }, // QA_ID
      { width: 15 }, // Jenis_Kalibrasi
      { width: 15 }, // Program_verifikasi
      { width: 30 }, // Assm_nama_instrumen
      { width: 25 }, // Assm_No_identitas_Istrumen
      { width: 25 }, // Assm_No_identitas_kalibrasi
      { width: 20 }, // Group_Da_Dept
      { width: 35 }, // Assm_Kapasitas
      { width: 20 }, // Parameter_Kalibrasi
      { width: 20 }, // Assm_Lokasi
      { width: 15 }, // Tgl_kalibrasi
      { width: 15 }, // Kalibrasi_selanjutnya
      { width: 30 }, // Catatan
      { width: 25 }, // Parameter_No_id_anak_timbang
      { width: 20 }, // Parameter_Interval
      { width: 20 }, // parameter_kriteria
      { width: 25 }, // Pelaksana_Verifikasi
      { width: 25 }, // Titik_verifikasi
      { width: 15 }, // user_ID
      { width: 20 }, // Process_date
      { width: 30 }, // f_fileName
    ];

    results.forEach((row) => {
      const dataRow = worksheet.addRow([
        row.QA_ID || '',
        row.Jenis_Kalibrasi || '',
        row.Program_verifikasi || '',
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
        row.Parameter_No_id_anak_timbang || '',
        row.Parameter_Interval || '',
        row.parameter_kriteria || '',
        row.Pelaksana_Verifikasi || '',
        row.Titik_verifikasi || '',
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
      `attachment; filename="DA-Timbangan-${currentDate}.xlsx"`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    return res.send(buffer);
  } catch (error) {
    console.error('Error in getDaTimbangaForExport:', error);
    return res.status(500).json({
      success: false,
      message: 'Error exporting DA Timbangan to Excel',
      error: error.message,
    });
  }
};

/**
 * Get Print Data for DA (Kalibrasi/Timbangan document)
 * Based on VBA generate_DA_Thermo function
 * Route: GET /api/transactions/da-timbangan-massa/print-data-da
 */
const getPrintDataDA = async (req, res, next) => {
  try {

    const query = `
      SELECT
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        CAST(interval AS VARCHAR) + ' Bulan' AS Parameter_Interval,
        CONVERT(NVARCHAR(11), Kalibrasi_selanjutnya, 113) AS Kalibrasi_selanjutnya,
        Catatan
      FROM T_Kalibrasi_DA_Timbangan
      ORDER BY Group_Da_Dept, Assm_nama_instrumen
    `;

    const results = await sequelizeMSQL.query(query, {
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in getPrintDataDA:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching print data DA',
      error: error.message,
    });
  }
};

/**
 * Get Print Data for DA Verifikasi
 * Based on VBA generate_DA_Verifikasi function
 * Route: GET /api/transactions/da-timbangan-massa/print-data-da-verifikasi
 */
const getPrintDataDAVerifikasi = async (req, res, next) => {
  try {

    const query = `
      SELECT
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        CAST(interval AS VARCHAR) + ' Bulan' AS interval,
        CONVERT(NVARCHAR(11), Kalibrasi_selanjutnya, 113) AS Kalibrasi_selanjutnya,
        Catatan,
        Parameter_Interval,
        Titik_verifikasi,
        Parameter_No_id_anak_timbang,
        parameter_kriteria
      FROM T_Kalibrasi_DA_Timbangan
      WHERE Program_verifikasi = 1
      ORDER BY Group_Da_Dept, Assm_nama_instrumen
    `;

    const results = await sequelizeMSQL.query(query, {
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in getPrintDataDAVerifikasi:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching print data DA Verifikasi',
      error: error.message,
    });
  }
};

/**
 * Get Label Data for Terkalibrasi printing
 * Based on VBA PrintLabelTerkalibrasi_Besar / PrintLabelTerkalibrasi_Kecil functions
 * Route: GET /api/transactions/da-timbangan-massa/label-data
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
      FROM T_Kalibrasi_DA_Timbangan
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

    const record = results[0];

    // VBA: if label date is null, generate it and update the record
    if (!record.Print_LabelDate) {
      const labelPrintDate = moment().utcOffset(7).format('YYYY-MM-DD HH:mm:ss');

      const updateQuery = `
        UPDATE T_Kalibrasi_DA_Timbangan
        SET Print_labeldate = :labelPrintDate,
            Print_LabelUserID = :user_id,
            Print_LabelDelegatedTo = :delegated_to
        WHERE QA_ID = :qa_id
      `;

      await sequelizeMSQL.query(updateQuery, {
        replacements: { labelPrintDate, user_id, delegated_to, qa_id },
        type: Sequelize.QueryTypes.UPDATE,
      });

      record.Print_LabelDate = labelPrintDate;
      record.Print_LabelUserID = user_id;
      record.Print_LabelDelegatedTo = delegated_to;
    }

    // Get employee name for the paraf/approved-by field (VBA: Get_EmployeeName(strLabelParafBy))
    const parafBy = record.Print_LabelDelegatedTo || delegated_to;
    const employeeName = await getEmployeeName(parafBy);

    return res.status(200).json({
      success: true,
      data: {
        ...record,
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
 * Get File Name for a given QA_ID
 * Based on VBA sbTampil_FIle_name function
 * Route: GET /api/transactions/da-timbangan-massa/file-name
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
      FROM T_Kalibrasi_DA_Timbangan
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
      data: {
        f_fileName: results[0].f_Filename || '',
      },
    });
  } catch (error) {
    console.error('Error in getFileName:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching file name',
      error: error.message,
    });
  }
};

/**
 * Get Next Calibration Date
 * Based on VBA sb_Isi_Kalibrasi_Selanjutnya function
 * Route: GET /api/transactions/da-timbangan-massa/next-calibration
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
      FROM T_Kalibrasi_DA_Timbangan
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
      data: {
        Kalibrasi_selanjutnya: results[0].Kalibrasi_selanjutnya || '',
      },
    });
  } catch (error) {
    console.error('Error in getNextCalibrationDate:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching next calibration date',
      error: error.message,
    });
  }
};

/**
 * Check if record is approved
 * Based on VBA fn_IS_approve function
 * Route: GET /api/transactions/da-timbangan-massa/is-approved
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
      FROM T_Kalibrasi_DA_Timbangan_status
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
 * Check approve button status
 * Based on VBA sb_approve_button function
 * Route: GET /api/transactions/da-timbangan-massa/check-approve-button
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

    // 1# Check if user is in approver list
    // VBA: select * from m_approver_lines where isactive = 1 and Appr_ApplicationCode = 'KAL_DA_Timbangan' and Appr_No = 1 and Appr_ID = gstrUserName
    const approverQuery = `
      SELECT *
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode = 'KAL_DA_Timbangan'
        AND Appr_No = 1
        AND Appr_ID = :user_id
    `;

    const approverResults = await sequelizeMSQL.query(approverQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const isAllowedApprover = approverResults.length > 0;

    // 2# Check approval count
    // VBA: select COUNT(*) as JumRow from T_Kalibrasi_DA_Timbangan_status where QA_ID = qa_id and approver_no = 1
    const countQuery = `
      SELECT COUNT(*) AS JumRow
      FROM T_Kalibrasi_DA_Timbangan_status
      WHERE QA_ID = :qa_id
        AND approver_no = 1
    `;

    const countResults = await sequelizeMSQL.query(countQuery, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const jumRow = parseInt(countResults[0]?.JumRow || 0);

    // VBA: If val(rs!jumRow) = 0 And strAllow = True Then cmd_Approve.Enabled = True
    const canApprove = jumRow === 0 && isAllowedApprover;
    // VBA: If val(rs!jumRow) = 1 And strAllow = True Then cmd_Reject.Enabled = True
    const canReject = jumRow === 1 && isAllowedApprover;

    return res.status(200).json({
      success: true,
      data: {
        canApprove,
        canReject,
        isAllowedApprover,
        approvalCount: jumRow,
      },
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
 * Get Departments List
 * Based on VBA sbIsi_Combo_Dept function
 * Route: GET /api/transactions/da-timbangan-massa/departments
 */
const getDepartments = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

    // VBA: select distinct bagian from m_karyawan where isActive = 1 order by 1
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
 * Get Approver Identity
 * Based on VBA fnApprIdentity function
 * Route: GET /api/transactions/da-timbangan-massa/approver-identity
 */
const getApprIdentity = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { appr_id, appr_no } = req.query;

    const apprUserId = appr_id || user_id;
    const apprNo = appr_no || '1';

    // VBA: select Appr_Identity from m_approver_lines where isactive = 1
    //        and Appr_ApplicationCode LIKE 'KAL_DA_Timbangan'
    //        and Appr_ID = VAppr_Id and Appr_No = vAppr_No
    const query = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_DA_Timbangan'
        AND Appr_ID = :apprUserId
        AND Appr_No = :apprNo
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { apprUserId, apprNo },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (results.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          Appr_Identity: 0,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        Appr_Identity: results[0].Appr_Identity || 0,
      },
    });
  } catch (error) {
    console.error('Error in getApprIdentity:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching approver identity',
      error: error.message,
    });
  }
};

/**
 * Check Allow Input
 * Based on VBA fnIsAllowInput function
 * Route: GET /api/transactions/da-timbangan-massa/allow-input
 */
const checkAllowInput = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

    // VBA: select COUNT(*) jumRow from m_approver_lines
    //        where isActive = 1 and Appr_ApplicationCode in ('KAL_Allow_Input')
    //        and Appr_ID = gstrUserName
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
      data: {
        isAllowInput: jumRow > 0,
        count: jumRow,
      },
    });
  } catch (error) {
    console.error('Error in checkAllowInput:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking allow input',
      error: error.message,
    });
  }
};

// ============================================================
// MUTATION FUNCTIONS (Save / Approve / Reject / Upload / Download / Delete)
// ============================================================

/**
 * Save DA Timbangan (Insert or Update)
 * Based on VBA cmd_Save_Click function
 * Route: POST /api/transactions/da-timbangan-massa/save
 */
const saveDaTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const {
      qa_id,
      jenis_kalibrasi,
      program_verifikasi,
      assm_nama_instrumen,
      assm_no_identitas_istrumen,
      assm_no_identitas_kalibrasi,
      group_da_dept,
      assm_kapasitas,
      parameter_kalibrasi,
      assm_lokasi,
      tgl_kalibrasi,
      interval,
      catatan,
      parameter_no_id_anak_timbang,
      parameter_interval,
      parameter_kriteria,
      pelaksana_verifikasi,
      titik_verifikasi,
    } = req.body;

    // VBA: If txt_Tgl_Kalibrasi.Text = "" Then MsgBox "Tanggal kalibrasi harus isi"
    if (!tgl_kalibrasi || tgl_kalibrasi === '') {
      return res.status(400).json({
        success: false,
        message: 'Tanggal kalibrasi harus isi',
      });
    }

    // VBA: If txt_program_Verifikasi.Text = "" Then MsgBox "Program Verifikasi tidak boleh kosong!"
    if (program_verifikasi === undefined || program_verifikasi === null || program_verifikasi === '') {
      return res.status(400).json({
        success: false,
        message: 'Program Verifikasi tidak boleh kosong!',
      });
    }

    // VBA: If txt_Jenis_Kalibrasi.Text = "" Then MsgBox "Jenis Kalibrasi tidak boleh kosong!"
    if (!jenis_kalibrasi || jenis_kalibrasi === '') {
      return res.status(400).json({
        success: false,
        message: 'Jenis Kalibrasi tidak boleh kosong!',
      });
    }

    // VBA: If IsNumeric(txt_Interval.Text) = False Then MsgBox "Interval harus isi numeric"
    if (!interval || isNaN(interval)) {
      return res.status(400).json({
        success: false,
        message: 'Interval harus isi numeric',
      });
    }

    // VBA: If fn_IS_approve(1) = True Then MsgBox "Tidak bisa simpan, karena data sudah approve!"
    if (qa_id && qa_id !== '') {
      const checkApprovedQuery = `
        SELECT *
        FROM T_Kalibrasi_DA_Timbangan_status
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

    // VBA fnComboValue: Internal=1, External=2 (default 2 when not Internal)
    const jenisKalValue = jenis_kalibrasi === 'Internal' ? '1' : '2';

    // VBA fnComboProg_Ver: Ya=1, else=2
    const progVerValue = program_verifikasi === 'Ya' ? '1' : '2';

    // VBA: Format(CDate(txt_Tgl_Kalibrasi.Text), "yyyy/MM/dd")
    const formattedTglKalibrasi = moment(tgl_kalibrasi).utcOffset(7).format('YYYY/MM/DD');

    const isNew = !qa_id || qa_id === '';

    if (isNew) {
      // VBA: Set rs = GetRecordset("select dbo.fnGetKal_DA_TM_No_ID() as QA_ID")
      const autoNumQuery = `SELECT dbo.fnGetKal_DA_TM_No_ID() AS QA_ID`;
      const autoNumResults = await sequelizeMSQL.query(autoNumQuery, {
        type: Sequelize.QueryTypes.SELECT,
      });
      const autoQaId = autoNumResults[0].QA_ID;

      // VBA INSERT - exact match
      const insertQuery = `
        INSERT INTO T_Kalibrasi_DA_Timbangan (
          QA_ID, Jenis_kalibrasi, Program_verifikasi,
          Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi,
          Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi,
          Tgl_kalibrasi, Interval, Kalibrasi_selanjutnya, Catatan,
          Parameter_No_id_anak_timbang, Parameter_Interval, parameter_kriteria,
          Pelaksana_Verifikasi, Titik_verifikasi,
          UserID, Delegated_To, Process_date
        )
        SELECT
          :qa_id AS QA_ID,
          :jenis_kalibrasi AS Jenis_kalibrasi,
          :program_verifikasi AS Program_verifikasi,
          :assm_nama_instrumen AS Assm_nama_instrumen,
          :assm_no_identitas_istrumen AS Assm_No_identitas_Istrumen,
          :assm_no_identitas_kalibrasi AS Assm_No_identitas_kalibrasi,
          :group_da_dept AS Group_Da_Dept,
          :assm_kapasitas AS Assm_Kapasitas,
          :parameter_kalibrasi AS Parameter_Kalibrasi,
          :assm_lokasi AS Assm_Lokasi,
          :tgl_kalibrasi AS Tgl_kalibrasi,
          :interval AS Interval,
          DATEADD(MONTH, :interval, :tgl_kalibrasi) AS Kalibrasi_selanjutnya,
          :catatan AS Catatan,
          :parameter_no_id_anak_timbang AS Parameter_No_id_anak_timbang,
          :parameter_interval AS Parameter_Interval,
          :parameter_kriteria AS parameter_kriteria,
          :pelaksana_verifikasi AS Pelaksana_Verifikasi,
          :titik_verifikasi AS Titik_verifikasi,
          :user_id AS UserID,
          :delegated_to AS Delegated_To,
          GETDATE() AS Process_date
      `;

      await sequelizeMSQL.query(insertQuery, {
        replacements: {
          qa_id: autoQaId,
          jenis_kalibrasi: jenisKalValue,
          program_verifikasi: progVerValue,
          assm_nama_instrumen: assm_nama_instrumen || '',
          assm_no_identitas_istrumen: assm_no_identitas_istrumen || '',
          assm_no_identitas_kalibrasi: assm_no_identitas_kalibrasi || '',
          group_da_dept: group_da_dept || '',
          assm_kapasitas: assm_kapasitas || '',
          parameter_kalibrasi: parameter_kalibrasi || '',
          assm_lokasi: assm_lokasi || '',
          tgl_kalibrasi: formattedTglKalibrasi,
          interval: interval,
          catatan: catatan || '',
          parameter_no_id_anak_timbang: parameter_no_id_anak_timbang || '',
          parameter_interval: parameter_interval || '',
          parameter_kriteria: parameter_kriteria || '',
          pelaksana_verifikasi: pelaksana_verifikasi || '',
          titik_verifikasi: titik_verifikasi || '',
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
      // VBA UPDATE - exact match
      const updateQuery = `
        UPDATE T_Kalibrasi_DA_Timbangan
        SET
          Jenis_kalibrasi = :jenis_kalibrasi,
          Program_verifikasi = :program_verifikasi,
          Assm_nama_instrumen = :assm_nama_instrumen,
          Assm_No_identitas_Istrumen = :assm_no_identitas_istrumen,
          Assm_No_identitas_kalibrasi = :assm_no_identitas_kalibrasi,
          Group_Da_Dept = :group_da_dept,
          Assm_Kapasitas = :assm_kapasitas,
          Parameter_Kalibrasi = :parameter_kalibrasi,
          Assm_Lokasi = :assm_lokasi,
          tgl_kalibrasi = :tgl_kalibrasi,
          Interval = :interval,
          Kalibrasi_selanjutnya = DATEADD(MONTH, :interval, :tgl_kalibrasi),
          Catatan = :catatan,
          Parameter_No_id_anak_timbang = :parameter_no_id_anak_timbang,
          Parameter_Interval = :parameter_interval,
          parameter_kriteria = :parameter_kriteria,
          Pelaksana_Verifikasi = :pelaksana_verifikasi,
          Titik_verifikasi = :titik_verifikasi,
          UserID = :user_id,
          Delegated_To = :delegated_to,
          Process_date = GETDATE()
        WHERE QA_ID = :qa_id
      `;

      await sequelizeMSQL.query(updateQuery, {
        replacements: {
          qa_id,
          jenis_kalibrasi: jenisKalValue,
          program_verifikasi: progVerValue,
          assm_nama_instrumen: assm_nama_instrumen || '',
          assm_no_identitas_istrumen: assm_no_identitas_istrumen || '',
          assm_no_identitas_kalibrasi: assm_no_identitas_kalibrasi || '',
          group_da_dept: group_da_dept || '',
          assm_kapasitas: assm_kapasitas || '',
          parameter_kalibrasi: parameter_kalibrasi || '',
          assm_lokasi: assm_lokasi || '',
          tgl_kalibrasi: formattedTglKalibrasi,
          interval: interval,
          catatan: catatan || '',
          parameter_no_id_anak_timbang: parameter_no_id_anak_timbang || '',
          parameter_interval: parameter_interval || '',
          parameter_kriteria: parameter_kriteria || '',
          pelaksana_verifikasi: pelaksana_verifikasi || '',
          titik_verifikasi: titik_verifikasi || '',
          user_id,
          delegated_to,
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
    console.error('Error in saveDaTimbangan:', error);
    return res.status(500).json({
      success: false,
      message: 'Error saving DA Timbangan',
      error: error.message,
    });
  }
};

/**
 * Approve DA Timbangan
 * Based on VBA cmd_Approve_Click function
 * Route: POST /api/transactions/da-timbangan-massa/approve
 */
const approveDaTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    // VBA: If txt_QA_ID.Text = "" Then MsgBox "Data belum di pilih"
    if (!qa_id || qa_id === '') {
      return res.status(400).json({
        success: false,
        message: 'Data belum di pilih',
      });
    }

    // VBA: If fn_IS_approve(1) = True Then MsgBox "Tidak bisa simpan, karena data sudah approve!"
    const checkApprovedQuery = `
      SELECT *
      FROM T_Kalibrasi_DA_Timbangan_status
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

    // VBA: vAppr_ident = fnApprIdentity(gstrUserName, 1)
    // fnApprIdentity: select Appr_Identity from m_approver_lines
    //   where isactive=1 and Appr_ApplicationCode LIKE 'KAL_DA_Timbangan'
    //   and Appr_ID = VAppr_Id and Appr_No = vAppr_No
    const approverIdentityQuery = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_DA_Timbangan'
        AND Appr_ID = :user_id
        AND Appr_No = 1
    `;
    const approverResults = await sequelizeMSQL.query(approverIdentityQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });
    const apprIdent = approverResults.length > 0 ? approverResults[0].Appr_Identity : '0';

    // VBA INSERT - exact match
    const insertApprovalQuery = `
      INSERT INTO T_Kalibrasi_DA_Timbangan_status (
        QA_ID, Approver_No, isReject, Approver_Identity,
        Process_Date, User_ID, Delegated_To, flag_update
      )
      VALUES (
        :qa_id, 1, 0, :approver_identity,
        GETDATE(), :user_id, :delegated_to, NULL
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
    console.error('Error in approveDaTimbangan:', error);
    return res.status(500).json({
      success: false,
      message: 'Error approving DA Timbangan',
      error: error.message,
    });
  }
};

/**
 * Reject DA Timbangan
 * Based on VBA cmd_reject_Click function
 * Route: POST /api/transactions/da-timbangan-massa/reject
 */
const rejectDaTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    // VBA: If txt_QA_ID.Text = "" Then MsgBox "Data belum di pilih"
    if (!qa_id || qa_id === '') {
      return res.status(400).json({
        success: false,
        message: 'Data belum di pilih',
      });
    }

    // VBA: If fn_IS_approve(1) = False Then MsgBox "Tidak bisa reject karena belum approve!"
    const checkApprovedQuery = `
      SELECT *
      FROM T_Kalibrasi_DA_Timbangan_status
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

    // VBA: DELETE T_Kalibrasi_DA_Timbangan_status where QA_ID = qa_id
    const deleteQuery = `
      DELETE FROM T_Kalibrasi_DA_Timbangan_status
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
    console.error('Error in rejectDaTimbangan:', error);
    return res.status(500).json({
      success: false,
      message: 'Error rejecting DA Timbangan',
      error: error.message,
    });
  }
};

/**
 * Upload File to FTP for DA Timbangan
 * Based on VBA f_GMP1_upl_Click function
 * Route: POST /api/transactions/da-timbangan-massa/upload
 */
const uploadFileDaTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    // VBA: If txt_QA_ID.Text = "" Then MsgBox "DA belum di pilih"
    if (!qa_id || qa_id === '') {
      return res.status(400).json({
        success: false,
        message: 'DA belum di pilih',
      });
    }

    // VBA: If fn_IS_approve(1) = True Then MsgBox "Tidak bisa upload file, karena data sudah approve!"
    const checkApprovedQuery = `
      SELECT *
      FROM T_Kalibrasi_DA_Timbangan_status
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

    // VBA: If f_GMP1_txt.Text <> "" Then MsgBox "Hapus file dahulu jika ingin upload file"
    const checkFileQuery = `
      SELECT f_fileName
      FROM T_Kalibrasi_DA_Timbangan
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

    // VBA: If f_GMP1_dlg.filename = "" Then MsgBox "Harap browse file yang akan di upload!"
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Harap browse file yang akan di upload!',
      });
    }

    const localFilePath = path.resolve(req.file.path);
    const originalFileName = req.file.originalname;
    const fileExtension = getFileExtension(originalFileName);

    if (!fs.existsSync(localFilePath)) {
      return res.status(500).json({
        success: false,
        message: 'Uploaded file not found on server',
      });
    }

    // VBA: PUT ftp_subFolder\QA_ID.ext
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

    // VBA: UPDATE T_Kalibrasi_DA_Timbangan set f_fileName = QA_ID.ext, f_userName=gstrUserName,...
    const updateQuery = `
      UPDATE T_Kalibrasi_DA_Timbangan
      SET f_fileName = :file_name,
          f_userName = :user_id,
          f_delegated_to = :delegated_to,
          f_date = GETDATE()
      WHERE QA_ID = :qa_id
    `;
    await sequelizeMSQL.query(updateQuery, {
      replacements: {
        qa_id,
        file_name: remoteFileName,
        user_id,
        delegated_to,
      },
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
    console.error('Error in uploadFileDaTimbangan:', error);
    return res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message,
    });
  }
};

/**
 * Download File from FTP for DA Timbangan
 * Based on VBA f_GMP1_Dow_Click function
 * Route: GET /api/transactions/da-timbangan-massa/download
 */
const downloadFileDaTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.query;

    // VBA: If f_GMP1_txt.Text = "" Then MsgBox "File not found"
    if (!qa_id || qa_id === '') {
      return res.status(400).json({
        success: false,
        message: 'DA belum di pilih',
      });
    }

    // Get file name from DB
    const checkFileQuery = `
      SELECT f_fileName
      FROM T_Kalibrasi_DA_Timbangan
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

    // Create temp dir if needed
    const tempDir = path.join(__dirname, '../../tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const localFilePath = path.join(tempDir, fileName);

    // VBA: GET ftp_subFolder/filename to local path
    const downloadResult = await downloadFileFromFTP(fileName, localFilePath);

    if (!downloadResult.success) {
      return res.status(500).json({
        success: false,
        message: downloadResult.message || 'Error downloading file from FTP',
      });
    }

    res.download(localFilePath, fileName, (err) => {
      if (fs.existsSync(localFilePath)) {
        try {
          fs.unlinkSync(localFilePath);
        } catch (unlinkErr) {
          console.error('Error deleting temp file:', unlinkErr);
        }
      }
      if (err && !res.headersSent) {
        console.error('Error sending file:', err);
      }
    });

  } catch (error) {
    console.error('Error in downloadFileDaTimbangan:', error);
    return res.status(500).json({
      success: false,
      message: 'Error downloading file',
      error: error.message,
    });
  }
};

/**
 * Delete File reference for DA Timbangan
 * Based on VBA f_GMP1_del_Click function
 * Route: POST /api/transactions/da-timbangan-massa/delete-file
 */
const deleteFileDaTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    // VBA: If f_GMP1_txt.Text = "" Then Exit Sub
    if (!qa_id || qa_id === '') {
      return res.status(400).json({
        success: false,
        message: 'DA belum di pilih',
      });
    }

    // VBA: If fn_IS_approve(1) = True Then MsgBox "Tidak bisa hapus file, karena data sudah approve!"
    // (checked TWICE in VBA - both identical guards)
    const checkApprovedQuery = `
      SELECT *
      FROM T_Kalibrasi_DA_Timbangan_status
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

    // Check file exists in DB
    const checkFileQuery = `
      SELECT f_fileName
      FROM T_Kalibrasi_DA_Timbangan
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

    // VBA: UPDATE T_Kalibrasi_DA_Timbangan set f_fileName = null, f_userName=..., f_delegated_to=..., f_date=GETDATE()
    const updateQuery = `
      UPDATE T_Kalibrasi_DA_Timbangan
      SET f_fileName = NULL,
          f_userName = :user_id,
          f_delegated_to = :delegated_to,
          f_date = GETDATE()
      WHERE QA_ID = :qa_id
    `;
    await sequelizeMSQL.query(updateQuery, {
      replacements: {
        qa_id,
        user_id,
        delegated_to,
      },
      type: Sequelize.QueryTypes.UPDATE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been deleted',
      data: { qa_id },
    });

  } catch (error) {
    console.error('Error in deleteFileDaTimbangan:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message,
    });
  }
};

module.exports = {
  getDaTimbangaList,
  getDaTimbangaDetail,
  getDaTimbangaForExport,
  getPrintDataDA,
  getPrintDataDAVerifikasi,
  getLabelData,
  getFileName,
  getNextCalibrationDate,
  checkIsApproved,
  checkApproveButton,
  getDepartments,
  getApprIdentity,
  checkAllowInput,
  saveDaTimbangan,
  approveDaTimbangan,
  rejectDaTimbangan,
  uploadFileDaTimbangan,
  downloadFileDaTimbangan,
  deleteFileDaTimbangan,
};
