const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment-timezone');
const { getDateTime, getEmployeeName, getApproverIdentity } = require('../../helpers/kalibrasi.helper');

/**
 * Get DA Anak Timbangan List
 * Based on VBA sb_Show_Grid function
 * Route: GET /api/kalibrasi/da-anak-timbangan/list
 */
const getDaAnakTimbanganList = async (req, res, next) => {
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
        REPLACE(CONVERT(CHAR(11), Kalibrasi_selanjutnya, 106), ' ', '/') AS Kalibrasi_selanjutnya,
        Catatan,
        B.user_ID,
        CONVERT(VARCHAR(20), B.Process_date, 13) AS Process_date,
        ISNULL(f_fileName, '') AS f_fileName
      FROM T_Kalibrasi_DA_Anak_Timbangan AS A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_DA_Anak_Timbangan_status WHERE approver_no = 1
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
    console.error('Error in getDaAnakTimbanganList:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching DA Anak Timbangan list',
      error: error.message,
    });
  }
};

/**
 * Get DA Anak Timbangan Detail
 * Based on VBA grid_Header_Click function
 * Route: GET /api/kalibrasi/da-anak-timbangan/detail
 */
const getDaAnakTimbanganDetail = async (req, res, next) => {
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
      FROM T_Kalibrasi_DA_Anak_Timbangan
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
    console.error('Error in getDaAnakTimbanganDetail:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching DA Anak Timbangan detail',
      error: error.message,
    });
  }
};

/**
 * Get DA Anak Timbangan for Excel Export
 * Based on VBA cmdExcel_Click function
 * Route: GET /api/kalibrasi/da-anak-timbangan/export
 */
const getDaAnakTimbanganForExport = async (req, res, next) => {
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
      FROM T_Kalibrasi_DA_Anak_Timbangan AS A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_DA_Anak_Timbangan_status WHERE approver_no = 1
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
    console.error('Error in getDaAnakTimbanganForExport:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching DA Anak Timbangan export data',
      error: error.message,
    });
  }
};

/**
 * Get Departments List
 * Based on VBA sbIsi_Combo_Dept function
 * Route: GET /api/kalibrasi/da-anak-timbangan/departments
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
 * Check if record is approved
 * Based on VBA fn_IS_approve function
 * Route: GET /api/kalibrasi/da-anak-timbangan/is-approved
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
      FROM T_Kalibrasi_DA_Anak_Timbangan_status
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
 * Route: GET /api/kalibrasi/da-anak-timbangan/check-approve-button
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
        AND Appr_ApplicationCode = 'KAL_DA_Anak_Timbang'
        AND Appr_No = 1
        AND Appr_ID = :user_id
    `;

    const approverResults = await sequelizeMSQL.query(approverQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const isApprover = approverResults.length > 0;

    // Check if already approved
    const statusQuery = `
      SELECT COUNT(*) as JumRow
      FROM T_Kalibrasi_DA_Anak_Timbangan_status
      WHERE QA_ID = :qa_id
        AND approver_no = 1
    `;

    const statusResults = await sequelizeMSQL.query(statusQuery, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const isAlreadyApproved = statusResults[0].JumRow > 0;

    // Check allow input permission
    const allowInputQuery = `
      SELECT COUNT(*) as jumRow
      FROM m_approver_lines
      WHERE isActive = 1
        AND Appr_ApplicationCode IN ('KAL_Allow_Input')
        AND Appr_ID = :user_id
    `;

    const allowInputResults = await sequelizeMSQL.query(allowInputQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const hasInputPermission = allowInputResults[0].jumRow > 0;

    return res.status(200).json({
      success: true,
      canApprove: !isAlreadyApproved && isApprover && hasInputPermission,
      canReject: isAlreadyApproved && isApprover && hasInputPermission,
      isApprover,
      isAlreadyApproved,
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
 * Based on VBA fnApprIdentity function
 * Route: GET /api/kalibrasi/da-anak-timbangan/approver-identity
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
        AND Appr_ApplicationCode LIKE 'KAL_DA_Anak_Timbang'
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
 * Get File Name
 * Based on VBA sbTampil_FIle_name function
 * Route: GET /api/kalibrasi/da-anak-timbangan/file-name
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
      FROM T_Kalibrasi_DA_Anak_Timbangan
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
 * Route: GET /api/kalibrasi/da-anak-timbangan/next-calibration
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
      FROM T_Kalibrasi_DA_Anak_Timbangan
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
 * Check if user has input permission
 * Based on VBA fnIsAllowInput function
 * Route: GET /api/kalibrasi/da-anak-timbangan/check-allow-input
 */
const checkAllowInput = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;

    const query = `
      SELECT COUNT(*) as jumRow
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
      allowInput: results[0].jumRow > 0,
      count: results[0].jumRow,
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
 * Get Print Data for DA Anak Timbangan
 * Based on VBA generate_DA_Anak_Timbang function (query part)
 * Route: GET /api/kalibrasi/da-anak-timbangan/print-data
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
      FROM T_Kalibrasi_DA_Anak_Timbangan
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
      FROM T_Kalibrasi_DA_Anak_Timbangan
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

    if (!data.Print_LabelDate) {
      const printDate = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
      const printParafBy = delegated_to;
      const updateQuery = `
        UPDATE T_Kalibrasi_DA_Anak_Timbangan
        SET Print_labeldate = :printDate,
            Print_LabelUserID = :user_id,
            Print_LabelDelegatedTo = :delegated_to
        WHERE QA_ID = :qa_id
      `;

      await sequelizeMSQL.query(updateQuery, {
        replacements: { printDate, user_id, delegated_to, qa_id },
        type: Sequelize.QueryTypes.UPDATE,
      });

      data.Print_LabelDate = printDate;
      data.Print_LabelDelegatedTo = printParafBy;
    }

    const employeeName = await getEmployeeName(data.Print_LabelDelegatedTo);

    return res.status(200).json({
      success: true,
      data: {
        ...data,
        employeeName,
      },
    });
  } catch (error) {
    console.error('Error in getLabelData:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting label data',
      error: error.message,
    });
  }
};

const saveDaAnakTimbangan = async (req, res, next) => {
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

    if (!tgl_kalibrasi || tgl_kalibrasi === '') {
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

    if (qa_id && qa_id !== '') {
      const checkApprovedQuery = `
        SELECT *
        FROM T_Kalibrasi_DA_Anak_Timbangan_status
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

    const formattedTglKalibrasi = moment(tgl_kalibrasi).format('YYYY/MM/DD');

    let jenisKalValue = '1';
    if (jenis_kalibrasi === 'External') {
      jenisKalValue = '2';
    } else if (jenis_kalibrasi === 'Internal') {
      jenisKalValue = '1';
    }

    // Check if this is INSERT (new) or UPDATE
    const isNew = !qa_id || qa_id === '';

    if (isNew) {

      const autoNumQuery = `SELECT dbo.fnGetKal_DA_AT_No_ID() as QA_ID`;
      const autoNumResults = await sequelizeMSQL.query(autoNumQuery, {
        type: Sequelize.QueryTypes.SELECT,
      });

      const autoQaId = autoNumResults[0].QA_ID;

      // INSERT query - exact match to VBA
      const insertQuery = `
        INSERT INTO T_Kalibrasi_DA_Anak_Timbangan (
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
          user_id: user_id,
          delegated_to: delegated_to
        },
        type: Sequelize.QueryTypes.INSERT,
      });

      return res.status(201).json({
        success: true,
        message: 'Data has been saved',
        data: {
          qa_id: autoQaId
        }
      });

    } else {
      // UPDATE EXISTING RECORD
      // UPDATE query - exact match to VBA
      const updateQuery = `
        UPDATE T_Kalibrasi_DA_Anak_Timbangan
        SET
          Jenis_kalibrasi = :jenis_kalibrasi,
          Assm_nama_instrumen = :assm_nama_instrumen,
          Assm_No_identitas_Istrumen = :assm_no_identitas_istrumen,
          Assm_No_identitas_kalibrasi = :assm_no_identitas_kalibrasi,
          Group_Da_Dept = :group_da_dept,
          Assm_Kapasitas = :assm_kapasitas,
          Parameter_Kalibrasi = :parameter_kalibrasi,
          Assm_Lokasi = :assm_lokasi,
          tgl_kalibrasi = :tgl_kalibrasi,
          Parameter_Interval = :parameter_interval,
          Kalibrasi_selanjutnya = DATEADD(MONTH, :parameter_interval, Tgl_kalibrasi),
          Catatan = :catatan
        WHERE QA_ID = :qa_id
      `;

      await sequelizeMSQL.query(updateQuery, {
        replacements: {
          qa_id,
          jenis_kalibrasi: jenisKalValue,
          assm_nama_instrumen: assm_nama_instrumen || '',
          assm_no_identitas_istrumen: assm_no_identitas_istrumen || '',
          assm_no_identitas_kalibrasi: assm_no_identitas_kalibrasi || '',
          group_da_dept: group_da_dept || '',
          assm_kapasitas: assm_kapasitas || '',
          parameter_kalibrasi: parameter_kalibrasi || '',
          assm_lokasi: assm_lokasi || '',
          tgl_kalibrasi: formattedTglKalibrasi,
          parameter_interval: parameter_interval,
          catatan: catatan || ''
        },
        type: Sequelize.QueryTypes.UPDATE,
      });

      return res.status(200).json({
        success: true,
        message: 'Data has been updated',
        data: {
          qa_id
        }
      });
    }

  } catch (error) {
    console.error('Error in saveDaAnakTimbangan:', error);
    return res.status(500).json({
      success: false,
      message: 'Error saving DA Anak Timbangan',
      error: error.message,
    });
  }
};

const approveDaAnakTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    // Validation: qa_id required
    if (!qa_id || qa_id === '') {
      return res.status(400).json({
        success: false,
        message: 'Data belum di pilih',
      });
    }

    // Check if already approved
    const checkApprovedQuery = `
      SELECT *
      FROM T_Kalibrasi_DA_Anak_Timbangan_status
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

    // Get approver identity using fnApprIdentity equivalent
    const approverIdentityQuery = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_DA_Anak_Timbang'
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
      INSERT INTO T_Kalibrasi_DA_Anak_Timbangan_status(
        QA_ID,
        Approver_No,
        isReject,
        Approver_Identity,
        Process_Date,
        User_ID,
        Delegated_To,
        flag_update
      )
      VALUES(
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
        qa_id,
        approver_identity: appr_ident
      }
    });

  } catch (error) {
    console.error('Error in approveDaAnakTimbangan:', error);
    return res.status(500).json({
      success: false,
      message: 'Error approving DA Anak Timbangan',
      error: error.message,
    });
  }
};

const rejectDaAnakTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    // Validation: qa_id required
    if (!qa_id || qa_id === '') {
      return res.status(400).json({
        success: false,
        message: 'Data belum di pilih',
      });
    }

    // Check if approved - must be approved to reject
    const checkApprovedQuery = `
      SELECT *
      FROM T_Kalibrasi_DA_Anak_Timbangan_status
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

    // Delete approval record - exact match to VBA
    const deleteQuery = `
      DELETE FROM T_Kalibrasi_DA_Anak_Timbangan_status
      WHERE QA_ID = :qa_id
    `;

    await sequelizeMSQL.query(deleteQuery, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been rejected',
      data: {
        qa_id
      }
    });

  } catch (error) {
    console.error('Error in rejectDaAnakTimbangan:', error);
    return res.status(500).json({
      success: false,
      message: 'Error rejecting DA Anak Timbangan',
      error: error.message,
    });
  }
};

const uploadFileDaAnakTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, file_name } = req.body;

    // Validation: qa_id required
    if (!qa_id || qa_id === '') {
      return res.status(400).json({
        success: false,
        message: 'DA belum di pilih',
      });
    }

    // Check if already approved - cannot upload if approved
    const checkApprovedQuery = `
      SELECT *
      FROM T_Kalibrasi_DA_Anak_Timbangan_status
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

    // Check if file already exists
    const checkFileQuery = `
      SELECT f_fileName
      FROM T_Kalibrasi_DA_Anak_Timbangan
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

    // Validation: file_name required
    if (!file_name || file_name === '') {
      return res.status(400).json({
        success: false,
        message: 'Harap browse file yang akan di upload!',
      });
    }

    // Update record with file name - exact match to VBA
    const updateQuery = `
      UPDATE T_Kalibrasi_DA_Anak_Timbangan
      SET f_fileName = :file_name,
          f_userName = :user_id,
          f_delegated_to = :delegated_to,
          f_date = GETDATE()
      WHERE QA_ID = :qa_id
    `;

    await sequelizeMSQL.query(updateQuery, {
      replacements: {
        qa_id,
        file_name,
        user_id: user_id,
        delegated_to: delegated_to
      },
      type: Sequelize.QueryTypes.UPDATE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been upload',
      data: {
        qa_id,
        file_name
      }
    });

  } catch (error) {
    console.error('Error in uploadFileDaAnakTimbangan:', error);
    return res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message,
    });
  }
};


const deleteFileDaAnakTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    // Validation: qa_id required
    if (!qa_id || qa_id === '') {
      return res.status(400).json({
        success: false,
        message: 'DA belum di pilih',
      });
    }

    // Check if file exists
    const checkFileQuery = `
      SELECT f_fileName
      FROM T_Kalibrasi_DA_Anak_Timbangan
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

    // Check if already approved - cannot delete if approved
    const checkApprovedQuery = `
      SELECT *
      FROM T_Kalibrasi_DA_Anak_Timbangan_status
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

    // Update record to remove file - exact match to VBA
    const updateQuery = `
      UPDATE T_Kalibrasi_DA_Anak_Timbangan
      SET f_fileName = NULL,
          f_userName = :user_id,
          f_delegated_to = :delegated_to,
          f_date = GETDATE()
      WHERE QA_ID = :qa_id
    `;

    await sequelizeMSQL.query(updateQuery, {
      replacements: {
        qa_id,
        user_id: user_id,
        delegated_to: delegated_to
      },
      type: Sequelize.QueryTypes.UPDATE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been deleted',
      data: {
        qa_id
      }
    });

  } catch (error) {
    console.error('Error in deleteFileDaAnakTimbangan:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting file',
      error: error.message,
    });
  }
};

module.exports = {
  getDaAnakTimbanganList,
  getDaAnakTimbanganDetail,
  getDaAnakTimbanganForExport,
  getDepartments,
  checkIsApproved,
  checkApproveButton,
  getApprIdentity,
  getFileName,
  getNextCalibrationDate,
  checkAllowInput,
  getPrintData,
  getLabelData,
  saveDaAnakTimbangan,
  approveDaAnakTimbangan,
  rejectDaAnakTimbangan,
  uploadFileDaAnakTimbangan,
  deleteFileDaAnakTimbangan,
};
