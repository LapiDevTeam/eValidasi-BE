const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');
const { getDateTime, getEmployeeName } = require('../../helpers/kalibrasi.helper');

/**
 * Search Sertifikat Thermohygro
 * Based on VBA cmd_Cari_Sertifikat_Click function
 * Route: GET /api/kalibrasi/sertifikat/search
 */
const searchSertifikat = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { search } = req.query;



    let query = '';

    // Check if department is VN - different query logic
    if (bagian_user === 'VN') {
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
          B.User_ID as ApproverID,
          B.process_date as ApproveDate,
          C.User_ID as Generate_DA_ID,
          C.process_date as Generate_DA_Date,
          isSert_Manual
        FROM T_Kalibrasi_Sertifikat_Thermohygro as A
        LEFT JOIN (
          SELECT * FROM T_Kalibrasi_Sertifikat_Thermohygro_Status WHERE approver_no = 1
        ) as B ON A.QA_ID = B.QA_ID AND A.ID_No_Sertifikat = B.ID_No_Sertifikat
        LEFT JOIN (
          SELECT * FROM T_Kalibrasi_Sertifikat_Thermohygro_Status WHERE approver_no = 2
        ) as C ON A.QA_ID = C.QA_ID AND A.ID_No_Sertifikat = C.ID_No_Sertifikat
        WHERE (
          A.ID_No_Sertifikat LIKE :search
          OR A.QA_ID LIKE :search
          OR Assm_nama_instrumen LIKE :search
          OR Assm_No_identitas_kalibrasi LIKE :search
        )
        ORDER BY tgl DESC
      `;
    } else {
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
          B.User_ID as ApproverID,
          B.process_date as ApproveDate,
          C.User_ID as Generate_DA_ID,
          C.process_date as Generate_DA_Date,
          isSert_Manual
        FROM vw_kal_Last_sert_Thermohygro as Z
        LEFT JOIN T_Kalibrasi_Sertifikat_Thermohygro as A
          ON A.QA_ID = Z.QA_ID AND A.ID_No_Sertifikat = Z.Nomor
        LEFT JOIN (
          SELECT * FROM T_Kalibrasi_Sertifikat_Thermohygro_Status WHERE approver_no = 1
        ) as B ON A.QA_ID = B.QA_ID AND A.ID_No_Sertifikat = B.ID_No_Sertifikat
        LEFT JOIN (
          SELECT * FROM T_Kalibrasi_Sertifikat_Thermohygro_Status WHERE approver_no = 2
        ) as C ON A.QA_ID = C.QA_ID AND A.ID_No_Sertifikat = C.ID_No_Sertifikat
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
      replacements: {
        search: `%${search}%`
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    // Format dates
    const formattedResults = results.map(row => ({
      ...row,
      tgl: row.tgl ? moment(row.tgl).format('DD-MMM-YYYY') : '',
      Tgl_kalibrasi: row.Tgl_kalibrasi ? moment(row.Tgl_kalibrasi).format('DD-MMM-YYYY') : '',
      ApproveDate: row.ApproveDate ? moment(row.ApproveDate).format('DD-MMM-YYYY HH:mm:ss') : '',
      Generate_DA_Date: row.Generate_DA_Date ? moment(row.Generate_DA_Date).format('DD-MMM-YYYY HH:mm:ss') : ''
    }));

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: formattedResults,
      count: formattedResults.length
    });

  } catch (error) {
    console.error('Error in searchSertifikat:', error);
    next(error);
  }
};

/**
 * Get Sertifikat Detail
 * Based on VBA sb_OpenByNo_QA_ID and sb_Isi_Data functions
 * Route: GET /api/kalibrasi/sertifikat/detail
 */
const getSertifikatDetail = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.query;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID and ID_No_Sertifikat are required'
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
      FROM T_Kalibrasi_Sertifikat_Thermohygro
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat LIKE :id_no_sertifikat
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        qa_id,
        id_no_sertifikat: `%${id_no_sertifikat}%`
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data not found'
      });
    }

    const data = results[0];

    // Format date
    const formattedData = {
      ...data,
      tgl: data.tgl ? moment(data.tgl).format('DD-MMM-YYYY') : '',
      Tgl_kalibrasi: data.Tgl_kalibrasi ? moment(data.Tgl_kalibrasi).format('DD-MMM-YYYY') : ''
    };

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: formattedData
    });

  } catch (error) {
    console.error('Error in getSertifikatDetail:', error);
    next(error);
  }
};

/**
 * Get Suhu Grid Data
 * Based on VBA sb_Show_Grid_Suhu function
 * Route: GET /api/kalibrasi/sertifikat/suhu
 */
const getSuhuData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.query;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID and ID_No_Sertifikat are required'
      });
    }

    const query = `
      SELECT
        Seq_ID,
        Pembacaan_Alat,
        Pembacaan_standar,
        Error,
        Ketidakpastian
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Suhu
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
      ORDER BY Seq_ID
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        qa_id,
        id_no_sertifikat
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: results,
      count: results.length
    });

  } catch (error) {
    console.error('Error in getSuhuData:', error);
    next(error);
  }
};

/**
 * Get Kelembaban Grid Data
 * Based on VBA sb_Show_Grid_Kelembaban function
 * Route: GET /api/kalibrasi/sertifikat/kelembaban
 */
const getKelembabanData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.query;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID and ID_No_Sertifikat are required'
      });
    }

    const query = `
      SELECT
        Seq_ID,
        Pembacaan_Alat,
        Pembacaan_standar,
        Error,
        Ketidakpastian
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Kelembaban
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
      ORDER BY Seq_ID
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        qa_id,
        id_no_sertifikat
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: results,
      count: results.length
    });

  } catch (error) {
    console.error('Error in getKelembabanData:', error);
    next(error);
  }
};

/**
 * Check if approved at specific level
 * Based on VBA fn_IS_approve function
 * Route: GET /api/kalibrasi/sertifikat/is-approved
 */
const checkIsApproved = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat, approver_level } = req.query;

    if (!qa_id || !id_no_sertifikat || !approver_level) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID, ID_No_Sertifikat, and approver_level are required'
      });
    }

    const query = `
      SELECT *
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = :approver_level
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        qa_id,
        id_no_sertifikat,
        approver_level
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      message: 'Status checked successfully',
      isApproved: results.length > 0,
      data: results.length > 0 ? results[0] : null
    });

  } catch (error) {
    console.error('Error in checkIsApproved:', error);
    next(error);
  }
};

/**
 * Get Approver Identity
 * Based on VBA fnApprIdentity function
 * Route: GET /api/kalibrasi/sertifikat/approver-identity
 */
const getApproverIdentity = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { approver_id, approver_no } = req.query;

    if (!approver_id || !approver_no) {
      return res.status(400).json({
        success: false,
        message: 'approver_id and approver_no are required'
      });
    }

    const query = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Sert_Thermo'
        AND Appr_ID = :approver_id
        AND Appr_No = :approver_no
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        approver_id,
        approver_no
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      message: 'Approver identity fetched successfully',
      identity: results.length > 0 ? results[0].Appr_Identity : 0
    });

  } catch (error) {
    console.error('Error in getApproverIdentity:', error);
    next(error);
  }
};

/**
 * Check if Tanggal Kalibrasi is input
 * Based on VBA fnIsInputTglKalibrasi function
 * Route: GET /api/kalibrasi/sertifikat/check-tgl-kalibrasi
 */
const checkTglKalibrasi = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.query;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID and ID_No_Sertifikat are required'
      });
    }

    const query = `
      SELECT Tgl_kalibrasi
      FROM T_Kalibrasi_Sertifikat_Thermohygro
      WHERE QA_id = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        qa_id,
        id_no_sertifikat
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    const tglKalibrasi = results.length > 0 ? results[0].Tgl_kalibrasi : null;
    const isInput = tglKalibrasi !== null && tglKalibrasi !== '';

    return res.status(200).json({
      success: true,
      message: 'Status checked successfully',
      isInput: isInput,
      tglKalibrasi: tglKalibrasi ? moment(tglKalibrasi).format('DD-MMM-YYYY') : null
    });

  } catch (error) {
    console.error('Error in checkTglKalibrasi:', error);
    next(error);
  }
};

/**
 * Check if user is allowed to input
 * Based on VBA fnIsAllowInput function
 * Route: GET /api/kalibrasi/sertifikat/check-allow-input
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
      replacements: {
        user_id
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    const jumRow = results[0]?.jumRow || 0;

    return res.status(200).json({
      success: true,
      message: 'Permission checked successfully',
      allowInput: jumRow > 0,
      count: jumRow
    });

  } catch (error) {
    console.error('Error in checkAllowInput:', error);
    next(error);
  }
};

/**
 * Search Data for Re-Sertifikasi
 * Based on VBA cmd_ReSertifikasi_Click function
 * Route: GET /api/kalibrasi/sertifikat/search-resertifikasi
 */
const searchResertifikasi = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { search } = req.query;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: 'Search parameter is required'
      });
    }

    // First query - certificates not in vw_kal_Thermo_Not
    const query1 = `
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
        B.User_ID as Appr_ID,
        B.Process_date as Appr_Date
      FROM T_Kalibrasi_Sertifikat_Thermohygro as A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_Sertifikat_Thermohygro_status WHERE approver_no = 1
      ) as B ON A.QA_ID = B.QA_ID AND A.ID_No_Sertifikat = B.ID_No_Sertifikat
      WHERE A.ID_No_Sertifikat NOT IN (
        SELECT ID_No_Sertifikat FROM vw_kal_Thermo_Not
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
        B.User_ID as Appr_ID,
        B.Process_date as Appr_Date
      FROM T_Kalibrasi_Sertifikat_Thermohygro as A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_Sertifikat_Thermohygro_status WHERE approver_no = 1
      ) as B ON A.QA_ID = B.QA_ID AND A.ID_No_Sertifikat = B.ID_No_Sertifikat
      WHERE A.isSert_Manual = 1
        AND B.QA_ID IS NOT NULL
        AND B.User_ID IS NOT NULL
        AND (
          A.QA_ID LIKE :search
          OR A.ID_No_Sertifikat LIKE :search
          OR Nama LIKE :search
        )
    `;

    const results = await sequelizeMSQL.query(query1, {
      replacements: {
        search: `%${search}%`
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    // Format dates
    const formattedResults = results.map(row => ({
      ...row,
      tgl: row.tgl ? moment(row.tgl).format('DD-MMM-YYYY') : '',
      Tgl_kalibrasi: row.Tgl_kalibrasi ? moment(row.Tgl_kalibrasi).format('DD-MMM-YYYY') : '',
      Appr_Date: row.Appr_Date ? moment(row.Appr_Date).format('DD-MMM-YYYY HH:mm:ss') : ''
    }));

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: formattedResults,
      count: formattedResults.length
    });

  } catch (error) {
    console.error('Error in searchResertifikasi:', error);
    next(error);
  }
};

/**
 * Search DA Thermohygro for New Certificate
 * Based on VBA cmd_New_Click function
 * Route: GET /api/kalibrasi/sertifikat/search-da
 */
const searchDAThermo = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { search } = req.query;

    if (!search) {
      return res.status(400).json({
        success: false,
        message: 'Search parameter is required'
      });
    }

    const query = `
      SELECT
        A.QA_ID,
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
        Catatan
      FROM T_Kalibrasi_DA_Thermohygro as A
      LEFT JOIN (
        SELECT QA_ID FROM T_Kalibrasi_Permohonan WHERE QA_ID IS NOT NULL
      ) as D ON D.QA_ID = A.QA_ID
      WHERE (
        A.QA_ID LIKE :search
        OR Assm_nama_instrumen LIKE :search
        OR Assm_No_identitas_Istrumen LIKE :search
      )
      ORDER BY Assm_nama_instrumen
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        search: `%${search}%`
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    // Format dates
    const formattedResults = results.map(row => ({
      ...row,
      Tgl_kalibrasi: row.Tgl_kalibrasi ? moment(row.Tgl_kalibrasi).format('DD-MMM-YYYY') : '',
      Kalibrasi_selanjutnya: row.Kalibrasi_selanjutnya ? moment(row.Kalibrasi_selanjutnya).format('DD-MMM-YYYY') : ''
    }));

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: formattedResults,
      count: formattedResults.length
    });

  } catch (error) {
    console.error('Error in searchDAThermo:', error);
    next(error);
  }
};

/**
 * Check approve button state
 * Based on VBA sb_approve_button function
 * Route: GET /api/kalibrasi/sertifikat/check-approve-button
 */
const checkApproveButton = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.query;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID and ID_No_Sertifikat are required'
      });
    }

    // Check if user is in approver list
    const approverQuery = `
      SELECT *
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode = 'KAL_Sert_Thermo'
        AND Appr_No = 1
        AND Appr_ID = :user_id
    `;

    const approverResults = await sequelizeMSQL.query(approverQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const isApprover = approverResults.length > 0;

    // Check approval status
    const statusQuery = `
      SELECT COUNT(*) as JumRow
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND approver_no = 1
    `;

    const statusResults = await sequelizeMSQL.query(statusQuery, {
      replacements: {
        qa_id,
        id_no_sertifikat
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    const jumRow = statusResults[0]?.JumRow || 0;

    return res.status(200).json({
      success: true,
      message: 'Button state checked successfully',
      canApprove: jumRow === 0 && isApprover,
      canReject: jumRow === 1 && isApprover,
      isApprover: isApprover,
      isApproved: jumRow > 0
    });

  } catch (error) {
    console.error('Error in checkApproveButton:', error);
    next(error);
  }
};

/**
 * Save/Update Sertifikat Header
 * Based on VBA cmd_Save_Click function
 * Route: POST /api/kalibrasi/sertifikat/save
 */
const saveSertifikatHeader = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
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
      catatan
    } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID and ID_No_Sertifikat are required'
      });
    }

    // Validate required fields
    if (!tgl_kalibrasi || !interval) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal Kalibrasi dan interval harus di isi'
      });
    }

    // Check if already approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;

    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approveResults[0]?.jumRow > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa update sertifikat karena sudah approve'
      });
    }

    // Format tgl_kalibrasi for SQL (UTC+7)
    const formattedTglKalibrasi = moment(tgl_kalibrasi).utcOffset(7).format('YYYY-MM-DD');

    const updateQuery = `
      UPDATE T_Kalibrasi_Sertifikat_Thermohygro
      SET
        Assm_nama_instrumen = :assm_nama_instrumen,
        Assm_No_identitas_kalibrasi = :assm_no_identitas_kalibrasi,
        Assm_Merk = :assm_merk,
        SERIAL_NUMBER = :serial_number,
        Assm_Kapasitas = :assm_kapasitas,
        Assm_Lokasi = :assm_lokasi,
        Nama = :nama,
        No_Ident_No_batch = :no_ident_no_batch,
        No_Sertifikat = :no_sertifikat,
        Tertelusur_melalui = :tertelusur_melalui,
        Rekalibrasi = :rekalibrasi,
        Tgl_kalibrasi = :tgl_kalibrasi,
        Interval = :interval,
        Metode_kalibrasi = :metode_kalibrasi,
        Suhu_Kelembaban = :suhu_kelembaban,
        Catatan = :catatan,
        UserID = :user_id,
        Delegated_To = :delegated_to,
        Process_date = GETDATE()
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;

    await sequelizeMSQL.query(updateQuery, {
      replacements: {
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
        tgl_kalibrasi: formattedTglKalibrasi,
        interval: interval || '',
        metode_kalibrasi: metode_kalibrasi || '',
        suhu_kelembaban: suhu_kelembaban || '',
        catatan: catatan || '',
        user_id,
        delegated_to,
        qa_id,
        id_no_sertifikat
      },
      type: Sequelize.QueryTypes.UPDATE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been saved successfully'
    });

  } catch (error) {
    console.error('Error in saveSertifikatHeader:', error);
    next(error);
  }
};

/**
 * Save/Update Suhu Data
 * Based on VBA Command3_Click function
 * Route: POST /api/kalibrasi/sertifikat/suhu/save
 */
const saveSuhuData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const {
      qa_id,
      id_no_sertifikat,
      seq_id,
      pembacaan_alat,
      pembacaan_standar,
      error,
      ketidakpastian
    } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID and ID_No_Sertifikat are required'
      });
    }

    // Validate required fields
    if (!pembacaan_alat || !pembacaan_standar || !error || !ketidakpastian) {
      return res.status(400).json({
        success: false,
        message: 'Data harap di isi semua'
      });
    }

    // Check if already approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;

    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approveResults[0]?.jumRow > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa update sertifikat karena sudah approve'
      });
    }

    // Check if this is new data or update
    if (!seq_id || seq_id === '') {
      // Insert new data - get auto sequence
      const getSeqQuery = `
        SELECT ISNULL(MAX(Seq_ID), 0) + 1 as autoNumSuhu
        FROM T_Kalibrasi_Sertifikat_Thermohygro_Suhu
        WHERE QA_ID = :qa_id
          AND ID_No_Sertifikat = :id_no_sertifikat
      `;

      const seqResults = await sequelizeMSQL.query(getSeqQuery, {
        replacements: { qa_id, id_no_sertifikat },
        type: Sequelize.QueryTypes.SELECT,
      });

      const newSeqId = seqResults[0]?.autoNumSuhu || 1;

      const insertQuery = `
        INSERT INTO T_Kalibrasi_Sertifikat_Thermohygro_Suhu
        (QA_ID, ID_No_Sertifikat, Seq_ID, Pembacaan_Alat, Pembacaan_standar, Error, Ketidakpastian, UserID, Delegated_To, Process_date)
        VALUES
        (:qa_id, :id_no_sertifikat, :seq_id, :pembacaan_alat, :pembacaan_standar, :error, :ketidakpastian, :user_id, :delegated_to, GETDATE())
      `;

      await sequelizeMSQL.query(insertQuery, {
        replacements: {
          qa_id,
          id_no_sertifikat,
          seq_id: newSeqId,
          pembacaan_alat,
          pembacaan_standar,
          error,
          ketidakpastian,
          user_id,
          delegated_to
        },
        type: Sequelize.QueryTypes.INSERT,
      });

      return res.status(200).json({
        success: true,
        message: 'Data has been saved successfully',
        seq_id: newSeqId
      });

    } else {
      // Update existing data
      const updateQuery = `
        UPDATE T_Kalibrasi_Sertifikat_Thermohygro_Suhu
        SET
          Pembacaan_Alat = :pembacaan_alat,
          Pembacaan_standar = :pembacaan_standar,
          Error = :error,
          Ketidakpastian = :ketidakpastian,
          UserID = :user_id,
          Delegated_To = :delegated_to,
          Process_date = GETDATE()
        WHERE QA_ID = :qa_id
          AND ID_No_Sertifikat = :id_no_sertifikat
          AND Seq_ID = :seq_id
      `;

      await sequelizeMSQL.query(updateQuery, {
        replacements: {
          pembacaan_alat,
          pembacaan_standar,
          error,
          ketidakpastian,
          user_id,
          delegated_to,
          qa_id,
          id_no_sertifikat,
          seq_id
        },
        type: Sequelize.QueryTypes.UPDATE,
      });

      return res.status(200).json({
        success: true,
        message: 'Data has been updated successfully'
      });
    }

  } catch (error) {
    console.error('Error in saveSuhuData:', error);
    next(error);
  }
};

/**
 * Save/Update Kelembaban Data
 * Based on VBA cmd_Save_kelembaban_Click function
 * Route: POST /api/kalibrasi/sertifikat/kelembaban/save
 */
const saveKelembabanData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const {
      qa_id,
      id_no_sertifikat,
      seq_id,
      pembacaan_alat,
      pembacaan_standar,
      error,
      ketidakpastian
    } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID and ID_No_Sertifikat are required'
      });
    }

    // Validate required fields
    if (!pembacaan_alat || !pembacaan_standar || !error || !ketidakpastian) {
      return res.status(400).json({
        success: false,
        message: 'Data harap di isi semua'
      });
    }

    // Check if already approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;

    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approveResults[0]?.jumRow > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa update sertifikat karena sudah approve'
      });
    }

    // Check if this is new data or update
    if (!seq_id || seq_id === '') {
      // Insert new data - get auto sequence
      const getSeqQuery = `
        SELECT ISNULL(MAX(Seq_ID), 0) + 1 as autoNumKelembaban
        FROM T_Kalibrasi_Sertifikat_Thermohygro_Kelembaban
        WHERE QA_ID = :qa_id
          AND ID_No_Sertifikat = :id_no_sertifikat
      `;

      const seqResults = await sequelizeMSQL.query(getSeqQuery, {
        replacements: { qa_id, id_no_sertifikat },
        type: Sequelize.QueryTypes.SELECT,
      });

      const newSeqId = seqResults[0]?.autoNumKelembaban || 1;

      const insertQuery = `
        INSERT INTO T_Kalibrasi_Sertifikat_Thermohygro_Kelembaban
        (QA_ID, ID_No_Sertifikat, Seq_ID, Pembacaan_Alat, Pembacaan_standar, Error, Ketidakpastian, UserID, Delegated_To, Process_date)
        VALUES
        (:qa_id, :id_no_sertifikat, :seq_id, :pembacaan_alat, :pembacaan_standar, :error, :ketidakpastian, :user_id, :delegated_to, GETDATE())
      `;

      await sequelizeMSQL.query(insertQuery, {
        replacements: {
          qa_id,
          id_no_sertifikat,
          seq_id: newSeqId,
          pembacaan_alat,
          pembacaan_standar,
          error,
          ketidakpastian,
          user_id,
          delegated_to
        },
        type: Sequelize.QueryTypes.INSERT,
      });

      return res.status(200).json({
        success: true,
        message: 'Data has been saved successfully',
        seq_id: newSeqId
      });

    } else {
      // Update existing data
      const updateQuery = `
        UPDATE T_Kalibrasi_Sertifikat_Thermohygro_Kelembaban
        SET
          Pembacaan_Alat = :pembacaan_alat,
          Pembacaan_standar = :pembacaan_standar,
          Error = :error,
          Ketidakpastian = :ketidakpastian,
          UserID = :user_id,
          Delegated_To = :delegated_to,
          Process_date = GETDATE()
        WHERE QA_ID = :qa_id
          AND ID_No_Sertifikat = :id_no_sertifikat
          AND Seq_ID = :seq_id
      `;

      await sequelizeMSQL.query(updateQuery, {
        replacements: {
          pembacaan_alat,
          pembacaan_standar,
          error,
          ketidakpastian,
          user_id,
          delegated_to,
          qa_id,
          id_no_sertifikat,
          seq_id
        },
        type: Sequelize.QueryTypes.UPDATE,
      });

      return res.status(200).json({
        success: true,
        message: 'Data has been updated successfully'
      });
    }

  } catch (error) {
    console.error('Error in saveKelembabanData:', error);
    next(error);
  }
};

/**
 * Delete Suhu Data
 * Based on VBA Command4_Click function
 * Route: DELETE /api/kalibrasi/sertifikat/suhu/delete
 */
const deleteSuhuData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat, seq_id } = req.query;

    if (!qa_id || !id_no_sertifikat || !seq_id) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID, ID_No_Sertifikat, and Seq_ID are required'
      });
    }

    // Check if already approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;

    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approveResults[0]?.jumRow > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa update sertifikat karena sudah approve'
      });
    }

    const deleteQuery = `
      DELETE FROM T_Kalibrasi_Sertifikat_Thermohygro_Suhu
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Seq_ID = :seq_id
    `;

    await sequelizeMSQL.query(deleteQuery, {
      replacements: {
        qa_id,
        id_no_sertifikat,
        seq_id
      },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteSuhuData:', error);
    next(error);
  }
};

/**
 * Delete Kelembaban Data
 * Based on VBA Command5_Click function
 * Route: DELETE /api/kalibrasi/sertifikat/kelembaban/delete
 */
const deleteKelembabanData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat, seq_id } = req.query;

    if (!qa_id || !id_no_sertifikat || !seq_id) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID, ID_No_Sertifikat, and Seq_ID are required'
      });
    }

    // Check if already approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;

    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approveResults[0]?.jumRow > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa update sertifikat karena sudah approve'
      });
    }

    const deleteQuery = `
      DELETE FROM T_Kalibrasi_Sertifikat_Thermohygro_Kelembaban
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Seq_ID = :seq_id
    `;

    await sequelizeMSQL.query(deleteQuery, {
      replacements: {
        qa_id,
        id_no_sertifikat,
        seq_id
      },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteKelembabanData:', error);
    next(error);
  }
};

/**
 * Approve Sertifikat
 * Based on VBA cmd_Approve_Click function
 * Route: POST /api/kalibrasi/sertifikat/approve
 */
const approveSertifikat = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'Data belum di pilih'
      });
    }

    // Check if tanggal kalibrasi is input
    const checkTglQuery = `
      SELECT Tgl_kalibrasi, Interval
      FROM T_Kalibrasi_Sertifikat_Thermohygro
      WHERE QA_id = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;

    const tglResults = await sequelizeMSQL.query(checkTglQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (tglResults.length === 0 || !tglResults[0].Tgl_kalibrasi) {
      return res.status(400).json({
        success: false,
        message: 'Belum simpan tanggal kalibrasi, save tanggal'
      });
    }

    if (!tglResults[0].Interval) {
      return res.status(400).json({
        success: false,
        message: 'Harap isi interval'
      });
    }

    // Check if already approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;

    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approveResults[0]?.jumRow > 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa update sertifikat karena sudah approve'
      });
    }

    // Get approver identity
    const getIdentityQuery = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Sert_Thermo'
        AND Appr_ID = :user_id
        AND Appr_No = 1
    `;

    const identityResults = await sequelizeMSQL.query(getIdentityQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const apprIdentity = identityResults.length > 0 ? identityResults[0].Appr_Identity : 0;

    // Insert approval record
    const insertQuery = `
      INSERT INTO T_Kalibrasi_Sertifikat_Thermohygro_Status
      (QA_ID, ID_No_Sertifikat, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, flag_update)
      VALUES
      (:qa_id, :id_no_sertifikat, 1, 0, :appr_identity, GETDATE(), :user_id, :delegated_to, NULL)
    `;

    await sequelizeMSQL.query(insertQuery, {
      replacements: {
        qa_id,
        id_no_sertifikat,
        appr_identity: apprIdentity,
        user_id,
        delegated_to
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been approved successfully'
    });

  } catch (error) {
    console.error('Error in approveSertifikat:', error);
    next(error);
  }
};

/**
 * Reject Sertifikat
 * Based on VBA cmd_reject_Click function
 * Route: POST /api/kalibrasi/sertifikat/reject
 */
const rejectSertifikat = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'Data belum di pilih'
      });
    }

    // Check if approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;

    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approveResults[0]?.jumRow === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa reject, data belum approve'
      });
    }

    const deleteQuery = `
      DELETE FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;

    await sequelizeMSQL.query(deleteQuery, {
      replacements: {
        qa_id,
        id_no_sertifikat
      },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({
      success: true,
      message: 'Data has been rejected successfully'
    });

  } catch (error) {
    console.error('Error in rejectSertifikat:', error);
    next(error);
  }
};

/**
 * Generate DA from Sertifikat
 * Based on VBA cmd_Generate_DA_Click function
 * Route: POST /api/kalibrasi/sertifikat/generate-da
 */
const generateDASertifikat = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'Data belum di pilih'
      });
    }

    // Check if approved at level 1
    const checkApprove1Query = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;

    const approve1Results = await sequelizeMSQL.query(checkApprove1Query, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approve1Results[0]?.jumRow === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa generate DA karena belum approve'
      });
    }

    // Check if already generated DA (approved at level 2)
    const checkApprove2Query = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 2
    `;

    const approve2Results = await sequelizeMSQL.query(checkApprove2Query, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approve2Results[0]?.jumRow > 0) {
      return res.status(400).json({
        success: false,
        message: 'Sudah generate DA!'
      });
    }

    // Check interval
    const checkIntervalQuery = `
      SELECT Interval
      FROM T_Kalibrasi_Sertifikat_Thermohygro
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;

    const intervalResults = await sequelizeMSQL.query(checkIntervalQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (!intervalResults[0]?.Interval || intervalResults[0].Interval === 0) {
      return res.status(400).json({
        success: false,
        message: 'Interval tidak boleh nol'
      });
    }

    // Check if DA record exists
    const checkDAQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_DA_Thermohygro
      WHERE QA_ID = :qa_id
    `;

    const daResults = await sequelizeMSQL.query(checkDAQuery, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    let sqlGenerate = '';

    if (daResults[0]?.jumRow === 0) {
      // Insert new DA record
      sqlGenerate = `
        INSERT INTO T_Kalibrasi_DA_Thermohygro
        (QA_ID, Jenis_kalibrasi, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi, Tgl_kalibrasi, Parameter_Interval, Kalibrasi_selanjutnya, Catatan, UserID, Delegated_To, Process_date)
        SELECT
          QA_ID, Jenis_kalibrasi, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi,
          Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi,
          Assm_Lokasi, Tgl_kalibrasi, Interval,
          DATEADD(MONTH, Interval, Tgl_kalibrasi) as kalibrasi_selanjutnya,
          Catatan, :user_id as UserID, :delegated_to as Delegated_To, GETDATE() as Process_date
        FROM T_Kalibrasi_Sertifikat_Thermohygro
        WHERE QA_ID = :qa_id
          AND ID_No_Sertifikat = :id_no_sertifikat
      `;
    } else {
      // Update existing DA record
      sqlGenerate = `
        UPDATE T_Kalibrasi_DA_Thermohygro
        SET
          Assm_nama_instrumen = A.Assm_nama_instrumen,
          Jenis_kalibrasi = A.Jenis_kalibrasi,
          Assm_No_identitas_Istrumen = A.Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi = A.Assm_No_identitas_kalibrasi,
          Group_Da_Dept = A.Group_Da_Dept,
          Assm_Kapasitas = A.Assm_Kapasitas,
          Parameter_Kalibrasi = A.Parameter_Kalibrasi,
          Assm_Lokasi = A.Assm_Lokasi,
          Tgl_kalibrasi = A.Tgl_kalibrasi,
          Parameter_Interval = A.Interval,
          Kalibrasi_selanjutnya = DATEADD(MONTH, A.Interval, A.Tgl_kalibrasi),
          Catatan = A.Catatan,
          UserID = :user_id,
          Delegated_To = :delegated_to,
          Process_date = GETDATE()
        FROM T_Kalibrasi_Sertifikat_Thermohygro as A
        LEFT JOIN T_Kalibrasi_DA_Thermohygro as B ON A.QA_ID = B.QA_ID
        WHERE A.QA_ID = :qa_id
          AND A.ID_No_Sertifikat = :id_no_sertifikat;

        DELETE FROM T_Kalibrasi_DA_Thermohygro_status
        WHERE QA_ID = :qa_id;
      `;
    }

    // Get approver identity for level 2
    const getIdentityQuery = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Sert_Thermo'
        AND Appr_ID = :user_id
        AND Appr_No = 2
    `;

    const identityResults = await sequelizeMSQL.query(getIdentityQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const apprIdentity = identityResults.length > 0 ? identityResults[0].Appr_Identity : 0;

    // Add status insert
    sqlGenerate += `
      INSERT INTO T_Kalibrasi_Sertifikat_Thermohygro_Status
      (QA_ID, ID_No_Sertifikat, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, flag_update)
      VALUES
      (:qa_id, :id_no_sertifikat, 2, 0, :appr_identity, GETDATE(), :user_id, :delegated_to, NULL)
    `;

    // Execute all queries
    await sequelizeMSQL.query(sqlGenerate, {
      replacements: {
        qa_id,
        id_no_sertifikat,
        user_id,
        delegated_to,
        appr_identity: apprIdentity
      },
      type: Sequelize.QueryTypes.RAW,
    });

    return res.status(200).json({
      success: true,
      message: `Sukses Generate DA No: ${qa_id}`
    });

  } catch (error) {
    console.error('Error in generateDASertifikat:', error);
    next(error);
  }
};

/**
 * Create New Sertifikat from DA
 * Based on VBA cmd_New_Click function
 * Route: POST /api/kalibrasi/sertifikat/create-new
 */
const createNewSertifikat = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    if (!qa_id) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID is required'
      });
    }

    // Get new sertifikat number
    const getNoQuery = `SELECT dbo.fnGetKal_Ser_L_No_ID() as noSertifikat`;
    const noResults = await sequelizeMSQL.query(getNoQuery, {
      type: Sequelize.QueryTypes.SELECT,
    });

    const noSertifikat = noResults[0]?.noSertifikat;

    if (!noSertifikat) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate new certificate number'
      });
    }

    // Insert new sertifikat from DA
    const insertQuery = `
      INSERT INTO T_Kalibrasi_Sertifikat_Thermohygro
      (QA_ID, ID_no_sertifikat, Jenis_kalibrasi, isSert_manual, tgl, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi,
       Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi,
       Assm_Lokasi, Tgl_kalibrasi, Interval,
       Catatan, UserID, Delegated_To, Process_date)
      SELECT
        QA_ID, :no_sertifikat as ID_no_sertifikat, Jenis_kalibrasi, 1, GETDATE() as Tgl,
        Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi,
        Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi,
        Assm_Lokasi, Tgl_kalibrasi, Parameter_Interval,
        Catatan, :user_id as UserID, :delegated_to as Delegated_To, GETDATE() as Process_date
      FROM T_Kalibrasi_DA_Thermohygro
      WHERE QA_ID = :qa_id
    `;

    await sequelizeMSQL.query(insertQuery, {
      replacements: {
        no_sertifikat: noSertifikat,
        qa_id,
        user_id,
        delegated_to
      },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(200).json({
      success: true,
      message: `Sukses buat sertifikat baru dengan nomor: ${noSertifikat}`,
      data: {
        qa_id,
        id_no_sertifikat: noSertifikat
      }
    });

  } catch (error) {
    console.error('Error in createNewSertifikat:', error);
    next(error);
  }
};

/**
 * Re-Sertifikasi - Copy existing certificate to new one
 * Based on VBA cmd_ReSertifikasi_Click function
 * Route: POST /api/kalibrasi/sertifikat/resertifikasi
 */
const resertifikasi = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'QA_ID and ID_No_Sertifikat are required'
      });
    }

    // Check if approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;

    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approveResults[0]?.jumRow === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa Re-Sertifikat karena belum approve'
      });
    }

    // Get new sertifikat number
    const getNoQuery = `SELECT dbo.fnGetKal_Ser_L_No_ID() as AutoNum`;
    const noResults = await sequelizeMSQL.query(getNoQuery, {
      type: Sequelize.QueryTypes.SELECT,
    });

    const autoIDNoSertifikat = noResults[0]?.AutoNum;

    if (!autoIDNoSertifikat) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate new certificate number'
      });
    }

    // 1. Insert header
    const sqlHead = `
      INSERT INTO T_Kalibrasi_Sertifikat_Thermohygro
      (QA_ID, ID_No_Sertifikat, Jenis_kalibrasi, isSert_Manual, tgl, Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk, SERIAL_NUMBER, Assm_Kapasitas, Assm_Lokasi, Nama,
       No_Ident_No_batch, No_Sertifikat, Tertelusur_melalui, Rekalibrasi, Tgl_kalibrasi, Interval, Metode_kalibrasi, Suhu_Kelembaban, Catatan, UserID, Delegated_To, Process_date)
      SELECT
        QA_ID, :new_id_no_sertifikat as ID_No_Sertifikat, Jenis_kalibrasi, isSert_Manual, GETDATE() as tgl,
        Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk, SERIAL_NUMBER, Assm_Kapasitas, Assm_Lokasi, Nama,
        No_Ident_No_batch, No_Sertifikat, Tertelusur_melalui, Rekalibrasi, Tgl_kalibrasi, Interval, Metode_kalibrasi, Suhu_Kelembaban, Catatan,
        :user_id as UserID, :delegated_to as Delegated_To, GETDATE() As Process_date
      FROM T_Kalibrasi_Sertifikat_Thermohygro
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat;
    `;

    // 2. Insert Suhu data
    const sqlSuhu = `
      INSERT INTO T_Kalibrasi_Sertifikat_Thermohygro_Suhu
      (QA_ID, ID_No_Sertifikat, Seq_ID, Pembacaan_Alat, Pembacaan_standar, Error, Ketidakpastian, UserID, Delegated_To, Process_date)
      SELECT
        QA_ID, :new_id_no_sertifikat as ID_No_Sertifikat, Seq_ID, Pembacaan_Alat, Pembacaan_standar, Error, Ketidakpastian,
        :user_id as UserID, :delegated_to as Delegated_To, GETDATE() as Process_date
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Suhu
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat;
    `;

    // 3. Insert Kelembaban data
    const sqlKel = `
      INSERT INTO T_Kalibrasi_Sertifikat_Thermohygro_Kelembaban
      (QA_ID, ID_No_Sertifikat, Seq_ID, Pembacaan_Alat, Pembacaan_standar, Error, Ketidakpastian, UserID, Delegated_To, Process_date)
      SELECT
        QA_ID, :new_id_no_sertifikat as ID_No_Sertifikat, Seq_ID, Pembacaan_Alat, Pembacaan_standar, Error, Ketidakpastian,
        :user_id as UserID, :delegated_to as Delegated_To, GETDATE() as Process_date
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Kelembaban
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat;
    `;

    const replacements = {
      new_id_no_sertifikat: autoIDNoSertifikat,
      qa_id,
      id_no_sertifikat,
      user_id,
      delegated_to
    };

    // Execute all inserts
    await sequelizeMSQL.query(sqlHead, {
      replacements,
      type: Sequelize.QueryTypes.INSERT,
    });

    await sequelizeMSQL.query(sqlSuhu, {
      replacements,
      type: Sequelize.QueryTypes.INSERT,
    });

    await sequelizeMSQL.query(sqlKel, {
      replacements,
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(200).json({
      success: true,
      message: 'Sukses resertifikasi',
      data: {
        qa_id,
        old_id_no_sertifikat: id_no_sertifikat,
        new_id_no_sertifikat: autoIDNoSertifikat
      }
    });

  } catch (error) {
    console.error('Error in resertifikasi:', error);
    next(error);
  }
};

/**
 * Generate Sertifikat PDF Data (Command2_Click from VBA)
 * Route: POST /api/kalibrasi/sertifikat/generate-pdf
 */
const generateSertifikatPDF = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.body;

    // Validation: Check if data is selected
    if (!qa_id || !id_no_sertifikat) {
      return res.status(400).json({
        success: false,
        message: 'Data belum di pilih'
      });
    }

    // Check if approved (fn_IS_approve(1) = False means not approved)
    const checkApprovalQuery = `
      SELECT *
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;

    const approvalResult = await sequelizeMSQL.query(checkApprovalQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (approvalResult.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak bisa print sertifikat karena belum approve'
      });
    }

    // Get main sertifikat data (Header data)
    const headerQuery = `
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
      FROM T_Kalibrasi_Sertifikat_Thermohygro
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;

    const headerData = await sequelizeMSQL.query(headerQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (headerData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data not found'
      });
    }

    const header = headerData[0];

    // Get Suhu (Temperature) data - Loop suhu table pertama
    const suhuQuery = `
      SELECT Pembacaan_Alat, Pembacaan_standar, ERROR, Ketidakpastian
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Suhu
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
      ORDER BY Process_date ASC
    `;

    const suhuData = await sequelizeMSQL.query(suhuQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    // Get Kelembaban (Humidity) data - Loop row selanjutnya
    const kelembabanQuery = `
      SELECT Pembacaan_Alat, Pembacaan_standar, ERROR, Ketidakpastian
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Kelembaban
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
      ORDER BY Process_date ASC
    `;

    const kelembabanData = await sequelizeMSQL.query(kelembabanQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    // Get approval signature data - isi approve TTD
    const approvalSignatureQuery = `
      SELECT
        CASE
          WHEN USER_ID = Delegated_To THEN 'Approved By :' + dbo.fnGetNamaKaryawan(USER_ID)
          ELSE dbo.fnGetNamaKaryawan(Delegated_To)
        END as apprID,
        CASE
          WHEN USER_ID = Delegated_To THEN ''
          ELSE 'Delegated as ' + dbo.fnGetNamaKaryawan(USER_ID)
        END as apprDelegated,
        CONVERT(varchar(20), Process_Date, 13) as apprDate
      FROM T_Kalibrasi_Sertifikat_Thermohygro_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;

    const approvalSignature = await sequelizeMSQL.query(approvalSignatureQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    // Format dates with UTC+7 offset
    const formattedHeader = {
      ...header,
      tgl: header.tgl ? moment(header.tgl).utcOffset(7).format('DD-MMM-YYYY') : '',
      Tgl_kalibrasi: header.Tgl_kalibrasi ? moment(header.Tgl_kalibrasi).utcOffset(7).format('DD-MMM-YYYY') : ''
    };

    // Return all data needed for PDF generation in JSON format
    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      data: {
        header: formattedHeader,
        suhuData: suhuData,
        kelembabanData: kelembabanData,
        approvalSignature: approvalSignature[0] || {}
      }
    });

  } catch (error) {
    console.error('Error in generateSertifikatPDF:', error);
    next(error);
  }
};

module.exports = {
  searchSertifikat,
  getSertifikatDetail,
  getSuhuData,
  getKelembabanData,
  checkIsApproved,
  getApproverIdentity,
  checkTglKalibrasi,
  checkAllowInput,
  searchResertifikasi,
  searchDAThermo,
  checkApproveButton,
  saveSertifikatHeader,
  saveSuhuData,
  saveKelembabanData,
  deleteSuhuData,
  deleteKelembabanData,
  approveSertifikat,
  rejectSertifikat,
  generateDASertifikat,
  createNewSertifikat,
  resertifikasi,
  generateSertifikatPDF
};
