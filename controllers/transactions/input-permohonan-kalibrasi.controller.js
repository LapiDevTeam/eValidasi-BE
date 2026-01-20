const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');


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
        pemohon,
        bagian,
        tanggal,
        kategori_permohonan,
        QA_ID_rekalibrasi,
        Ket_Rekalibrasi,
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
        no_sertifikat_terakhir
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

    const query = `
      SELECT * FROM (
        SELECT DISTINCT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Assm_Lokasi
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
          Assm_Lokasi
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
          Assm_Lokasi
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
          Assm_Lokasi
        FROM T_Kalibrasi_DA_Bagian
      ) AS A
      WHERE (
        QA_ID LIKE :search OR
        Assm_nama_instrumen LIKE :search OR
        Assm_No_identitas_Istrumen LIKE :search OR
        Assm_No_identitas_kalibrasi LIKE :search
      )
      ORDER BY 1
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { search: `%${search}%` },
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

    if (jumRow === 0 && isAllowed) {
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

module.exports = {
  getPermohonanKalibrasiList,
  getPermohonanDetail,
  searchInstrumen,
  checkApproveButton,
  checkIsApproved,
  getFileDownload
};

