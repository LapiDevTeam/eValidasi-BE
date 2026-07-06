const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');
const {
  getDateTime,
  getEmployeeName,
  getAutoPreAdjID,
  getAutoDayaUlangID,
  getAutoMassaStandardID,
  getAutoPusatPanID,
} = require('../../helpers/kalibrasi.helper');

/**
 * Search Sertifikat Timbangan
 * Based on VBA cmd_Cari_Sertifikat_Click function
 * Route: GET /api/kalibrasi/sertifikat-timbangan/search
 */
const searchSertifikatTimbangan = async (req, res, next) => {
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
          C.User_ID as GenerateDA_ID,
          C.process_date as GenerateDA_Date,
          A.isSert_manual
        FROM T_Kalibrasi_Sertifikat_Timbangan as A
        LEFT JOIN (
          SELECT * FROM T_Kalibrasi_Sertifikat_Timbangan_Status WHERE approver_no = 1
        ) as B ON A.QA_ID = B.QA_ID AND A.ID_No_Sertifikat = B.ID_No_Sertifikat
        LEFT JOIN (
          SELECT * FROM T_Kalibrasi_Sertifikat_Timbangan_Status WHERE approver_no = 2
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
          C.User_ID as GenerateDA_ID,
          C.process_date as GenerateDA_Date,
          A.isSert_manual
        FROM vw_kal_Last_sert_Timbangan as Z
        LEFT JOIN T_Kalibrasi_Sertifikat_Timbangan as A
          ON A.QA_ID = Z.QA_ID AND A.ID_No_Sertifikat = Z.Nomor
        LEFT JOIN (
          SELECT * FROM T_Kalibrasi_Sertifikat_Timbangan_Status WHERE approver_no = 1
        ) as B ON A.QA_ID = B.QA_ID AND A.ID_No_Sertifikat = B.ID_No_Sertifikat
        LEFT JOIN (
          SELECT * FROM T_Kalibrasi_Sertifikat_Timbangan_Status WHERE approver_no = 2
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
      replacements: { search: `%${search || ''}%` },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in searchSertifikatTimbangan:', error);
    next(error);
  }
};

/**
 * Get Sertifikat Timbangan By QA_ID
 * Based on VBA sb_OpenByNo_QA_ID function
 * Route: GET /api/kalibrasi/sertifikat-timbangan/by-qa-id
 */
const getSertifikatByQAID = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { search } = req.query;

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
        B.User_ID as ApproverID,
        B.process_date as ApproveDate
      FROM T_Kalibrasi_Sertifikat_Timbangan as A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_Sertifikat_Timbangan_Status WHERE approver_no = 1
      ) as B ON A.QA_ID = B.QA_ID AND A.ID_No_Sertifikat = B.ID_No_Sertifikat
      WHERE (
        A.ID_No_Sertifikat LIKE :search
        OR A.QA_ID LIKE :search
      )
      ORDER BY tgl DESC
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { search: `%${search || ''}%` },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in getSertifikatByQAID:', error);
    next(error);
  }
};

/**
 * Get Sertifikat Timbangan Detail
 * Based on VBA sb_Isi_Data function
 * Route: GET /api/kalibrasi/sertifikat-timbangan/detail
 */
const getSertifikatTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.query;

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
        Catatan,
        BATAS_UNJUK_KERJA
      FROM T_Kalibrasi_Sertifikat_Timbangan
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat LIKE :id_no_sertifikat
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        qa_id: qa_id || '',
        id_no_sertifikat: `%${id_no_sertifikat || ''}%`,
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (results.length === 0) {
      const err = new Error('Data not found');
      err.statusCode = 404;
      res.status(404).json({
        success: false,
        message: err.message,
      });
      next(err);
      return;
    }

    return res.status(200).json({
      success: true,
      data: results[0],
    });
  } catch (error) {
    console.error('Error in getSertifikatTimbangan:', error);
    next(error);
  }
};

/**
 * Get Pre-Adjustment Data (Suhu)
 * Based on VBA sb_Show_Grid_Pre_Adj function
 * Route: GET /api/kalibrasi/sertifikat-timbangan/pre-adj
 */
const getPreAdjData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.query;

    const query = `
      SELECT
        Seq_ID,
        Pembacaan_standar,
        Pembacaan_Alat,
        Error
      FROM T_Kalibrasi_Sertifikat_Timbangan_Pre_Adj
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
      ORDER BY Seq_ID
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        qa_id: qa_id || '',
        id_no_sertifikat: id_no_sertifikat || '',
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in getPreAdjData:', error);
    next(error);
  }
};

/**
 * Get Daya Ulang Data (Kelembaban)
 * Based on VBA sb_Show_Grid_Daya_Ulang function
 * Route: GET /api/kalibrasi/sertifikat-timbangan/daya-ulang
 */
const getDayaUlangData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.query;

    const query = `
      SELECT
        Seq_ID,
        Massa_standar,
        Standar_deviasi
      FROM T_Kalibrasi_Sertifikat_Timbangan_Daya_Ulang
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
      ORDER BY Seq_ID
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        qa_id: qa_id || '',
        id_no_sertifikat: id_no_sertifikat || '',
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in getDayaUlangData:', error);
    next(error);
  }
};

/**
 * Get Penyimpangan Data (Massa Standard)
 * Based on VBA sb_Show_Grid_Penyimpangan function
 * Route: GET /api/kalibrasi/sertifikat-timbangan/penyimpangan
 */
const getPenyimpanganData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.query;

    const query = `
      SELECT
        Seq_ID,
        Konvensional_standar,
        Pembacaan_Alat,
        Error,
        Ketidakpastian
      FROM T_Kalibrasi_Sertifikat_Timbangan_Massa_Std
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
      ORDER BY Seq_ID
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        qa_id: qa_id || '',
        id_no_sertifikat: id_no_sertifikat || '',
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in getPenyimpanganData:', error);
    next(error);
  }
};

/**
 * Get Pusat Pan Data
 * Based on VBA sb_Show_Grid_Pusat_Pan function
 * Route: GET /api/kalibrasi/sertifikat-timbangan/pusat-pan
 */
const getPusatPanData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.query;

    const query = `
      SELECT
        Seq_ID,
        Massa,
        Massa_0,
        Massa_1,
        Massa_2,
        Massa_3,
        Massa_4,
        Perbedaan_Max
      FROM T_Kalibrasi_Sertifikat_Timbangan_Pusat_Pan
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
      ORDER BY Seq_ID
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: {
        qa_id: qa_id || '',
        id_no_sertifikat: id_no_sertifikat || '',
      },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in getPusatPanData:', error);
    next(error);
  }
};

/**
 * Search for Re-Sertifikasi Timbangan
 * Based on VBA cmd_ReSertifikasi_Click function
 * Route: GET /api/kalibrasi/sertifikat-timbangan/search-resertifikasi
 */
const searchResertifikasiTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { search } = req.query;

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
        B.User_ID as Appr_ID,
        B.Process_date as Appr_Date
      FROM T_Kalibrasi_Sertifikat_Timbangan as A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_Sertifikat_Timbangan_Status WHERE approver_no = 1
      ) as B ON A.QA_ID = B.QA_ID AND A.ID_No_Sertifikat = B.ID_No_Sertifikat
      WHERE A.ID_No_Sertifikat NOT IN (
        SELECT ID_No_Sertifikat FROM vw_kal_Timbangan_Not
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
      FROM T_Kalibrasi_Sertifikat_Timbangan as A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_Sertifikat_Timbangan_Status WHERE approver_no = 1
      ) as B ON A.QA_ID = B.QA_ID AND A.ID_No_Sertifikat = B.ID_No_Sertifikat
      WHERE A.isSert_Manual = 1
        AND B.QA_ID IS NOT NULL
        AND (
          A.QA_ID LIKE :search
          OR A.ID_No_Sertifikat LIKE :search
          OR Nama LIKE :search
        )
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { search: `%${search || ''}%` },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in searchResertifikasiTimbangan:', error);
    next(error);
  }
};

/**
 * Search DA Timbangan for New Certificate
 * Based on VBA cmd_New_Click function
 * Route: GET /api/kalibrasi/sertifikat-timbangan/search-da
 */
const searchDATimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { search } = req.query;

    const query = `
      SELECT
        A.QA_ID,
        CASE WHEN ISNULL(Jenis_Kalibrasi, 1) = 1 THEN 'Internal' ELSE 'External' END as Jenis_Kalibrasi,
        CASE WHEN ISNULL(Program_verifikasi, 0) = 1 THEN 'Ya' ELSE 'Tidak' END as Program_verifikasi,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        REPLACE(CONVERT(CHAR(11), Tgl_kalibrasi, 106), ' ', '-') as Tgl_kalibrasi,
        CAST(interval as VARCHAR) + ' Bulan' as interval,
        REPLACE(CONVERT(CHAR(11), Kalibrasi_selanjutnya, 106), ' ', '/') as Kalibrasi_selanjutnya,
        Catatan,
        A.Parameter_No_id_anak_timbang,
        A.Parameter_Interval,
        A.parameter_kriteria,
        A.Pelaksana_Verifikasi,
        A.Titik_verifikasi
      FROM T_Kalibrasi_DA_Timbangan as A
      LEFT JOIN (
        SELECT * FROM T_Kalibrasi_DA_Timbangan_status WHERE approver_no = 1
      ) as B ON A.QA_ID = B.QA_id
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
      replacements: { search: `%${search || ''}%` },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in searchDATimbangan:', error);
    next(error);
  }
};

// ===================================================================
// HELPER / CHECK ENDPOINTS
// ===================================================================

/**
 * Check if Sertifikat Timbangan is approved at a given level
 * VBA equivalent: fn_IS_approve
 * Route: GET /api/kalibrasi/sertifikat-timbangan/is-approved
 */
const checkIsApprovedTimbangan = async (req, res, next) => {
  try {
    const { qa_id, id_no_sertifikat, approver_no } = req.query;

    if (!qa_id || !id_no_sertifikat || !approver_no) {
      const err = new Error('qa_id, id_no_sertifikat, approver_no are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const query = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
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
      is_approved: (results[0]?.jumRow || 0) > 0,
      count: results[0]?.jumRow || 0,
    });
  } catch (error) {
    console.error('Error in checkIsApprovedTimbangan:', error);
    next(error);
  }
};

/**
 * Check if Tgl Kalibrasi has been saved
 * VBA equivalent: fnIsInputTglKalibrasi
 * Route: GET /api/kalibrasi/sertifikat-timbangan/check-tgl-kalibrasi
 */
const checkTglKalibrasiTimbangan = async (req, res, next) => {
  try {
    const { qa_id, id_no_sertifikat } = req.query;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('qa_id and id_no_sertifikat are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const query = `
      SELECT Tgl_kalibrasi
      FROM T_Kalibrasi_Sertifikat_Timbangan
      WHERE QA_id = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    const tglKalibrasi = results[0]?.Tgl_kalibrasi;
    const hasInputTgl = tglKalibrasi !== null && tglKalibrasi !== undefined && tglKalibrasi !== '';

    return res.status(200).json({
      success: true,
      has_input_tgl: hasInputTgl,
    });
  } catch (error) {
    console.error('Error in checkTglKalibrasiTimbangan:', error);
    next(error);
  }
};

/**
 * Check if user is allowed to input
 * VBA equivalent: fnIsAllowInput with KAL_Allow_Input
 * Route: GET /api/kalibrasi/sertifikat-timbangan/check-allow-input
 */
const checkAllowInputTimbangan = async (req, res, next) => {
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
      allow_input: parseInt(results[0]?.jumRow || 0) > 0,
      count: parseInt(results[0]?.jumRow || 0),
    });
  } catch (error) {
    console.error('Error in checkAllowInputTimbangan:', error);
    next(error);
  }
};

/**
 * Get Approver Identity for Timbangan
 * VBA equivalent: fnApprIdentity with 'KAL_Sert_Timbangan'
 * Route: GET /api/kalibrasi/sertifikat-timbangan/approver-identity
 */
const getApproverIdentityTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { approver_no } = req.query;

    const query = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Sert_Timbangan'
        AND Appr_ID = :user_id
        AND Appr_No = :approver_no
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements: { user_id, approver_no: approver_no || 1 },
      type: Sequelize.QueryTypes.SELECT,
    });

    return res.status(200).json({
      success: true,
      identity: results[0]?.Appr_Identity || 0,
    });
  } catch (error) {
    console.error('Error in getApproverIdentityTimbangan:', error);
    next(error);
  }
};

/**
 * Check Approve Button state
 * VBA equivalent: sb_approve_button
 * Route: GET /api/kalibrasi/sertifikat-timbangan/check-approve-button
 */
const checkApproveButtonTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.query;

    if (!qa_id || !id_no_sertifikat) {
      return res.status(200).json({ success: true, can_approve: false, can_reject: false });
    }

    // Check if user is in approver lines
    const approverQuery = `
      SELECT COUNT(*) as jumRow
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode = 'KAL_Sert_Timbangan'
        AND Appr_No = 1
        AND Appr_ID = :user_id
    `;

    const approverResults = await sequelizeMSQL.query(approverQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    const isApprover = (approverResults[0]?.jumRow || 0) > 0;

    // Check current approval status
    const statusQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND approver_no = 1
    `;

    const statusResults = await sequelizeMSQL.query(statusQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    const isApproved = (statusResults[0]?.jumRow || 0) > 0;
    const canApprove = !isApproved && isApprover;
    const canReject = isApproved && isApprover;

    return res.status(200).json({
      success: true,
      can_approve: canApprove,
      can_reject: canReject,
      is_approved: isApproved,
    });
  } catch (error) {
    console.error('Error in checkApproveButtonTimbangan:', error);
    next(error);
  }
};

/**
 * Get Print Data for Sertifikat Timbangan
 * VBA equivalent: generate_Sert_Thermo (data fetch portion only)
 * Route: GET /api/kalibrasi/sertifikat-timbangan/print-data
 */
const getPrintDataTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.query;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('qa_id and id_no_sertifikat are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) === 0) {
      const err = new Error('Tidak print sertifikat karena belum approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Header data
    const headerQuery = `
      SELECT
        Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk,
        SERIAL_NUMBER, Assm_Kapasitas, Assm_Lokasi, Nama, No_Ident_No_batch, No_Sertifikat,
        Tertelusur_melalui, Rekalibrasi,
        REPLACE(CONVERT(CHAR(11), Tgl_kalibrasi, 106), ' ', '-') as Tgl_kalibrasi,
        Interval,
        Metode_kalibrasi, Suhu_Kelembaban, Catatan, Group_Da_Dept, Parameter_Kalibrasi,
        Parameter_No_id_anak_timbang, Parameter_Interval, Parameter_kriteria,
        Pelaksana_Verifikasi, Titik_verifikasi, BATAS_UNJUK_KERJA
      FROM T_Kalibrasi_Sertifikat_Timbangan
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;

    // Pre-Adjustment data
    const preAdjQuery = `
      SELECT Pembacaan_standar, Pembacaan_Alat, Error
      FROM T_Kalibrasi_Sertifikat_Timbangan_Pre_Adj
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
      ORDER BY Seq_ID
    `;

    // Daya Ulang data
    const dayaUlangQuery = `
      SELECT Massa_standar, Standar_deviasi
      FROM T_Kalibrasi_Sertifikat_Timbangan_Daya_Ulang
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
      ORDER BY Seq_ID
    `;

    // Massa Standard (Penyimpangan) data
    const massaStdQuery = `
      SELECT Konvensional_standar, Pembacaan_Alat, Error, Ketidakpastian
      FROM T_Kalibrasi_Sertifikat_Timbangan_Massa_Std
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
      ORDER BY Seq_ID
    `;

    // Pusat Pan data
    const pusatPanQuery = `
      SELECT Massa, Massa_0, Massa_1, Massa_2, Massa_3, Massa_4, Perbedaan_Max
      FROM T_Kalibrasi_Sertifikat_Timbangan_Pusat_Pan
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
      ORDER BY Seq_ID
    `;

    // Approver data
    const approverQuery = `
      SELECT
        CASE WHEN User_ID = Delegated_To
          THEN 'Approved By :' + dbo.fnGetNamaKaryawan(User_ID)
          ELSE dbo.fnGetNamaKaryawan(Delegated_To)
        END as apprID,
        CASE WHEN User_ID = Delegated_To
          THEN ''
          ELSE 'Delegated as ' + dbo.fnGetNamaKaryawan(User_ID)
        END as apprDelegated,
        CONVERT(VARCHAR(20), Process_Date, 13) as apprDate
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;

    const replacements = { qa_id, id_no_sertifikat };

    const [header, preAdj, dayaUlang, massaStd, pusatPan, approver] = await Promise.all([
      sequelizeMSQL.query(headerQuery, { replacements, type: Sequelize.QueryTypes.SELECT }),
      sequelizeMSQL.query(preAdjQuery, { replacements, type: Sequelize.QueryTypes.SELECT }),
      sequelizeMSQL.query(dayaUlangQuery, { replacements, type: Sequelize.QueryTypes.SELECT }),
      sequelizeMSQL.query(massaStdQuery, { replacements, type: Sequelize.QueryTypes.SELECT }),
      sequelizeMSQL.query(pusatPanQuery, { replacements, type: Sequelize.QueryTypes.SELECT }),
      sequelizeMSQL.query(approverQuery, { replacements, type: Sequelize.QueryTypes.SELECT }),
    ]);

    if (header.length === 0) {
      const err = new Error('Data not found');
      err.statusCode = 404;
      res.status(404).json({ success: false, message: err.message });
      next(err);
      return;
    }

    return res.status(200).json({
      success: true,
      data: {
        id_no_sertifikat,
        qa_id,
        header: header[0],
        pre_adj: preAdj,
        daya_ulang: dayaUlang,
        massa_std: massaStd,
        pusat_pan: pusatPan,
        approver: approver[0] || null,
      },
    });
  } catch (error) {
    console.error('Error in getPrintDataTimbangan:', error);
    next(error);
  }
};

// ===================================================================
// POST / WRITE OPERATIONS
// ===================================================================

/**
 * Save/Update Sertifikat Timbangan Header
 * VBA equivalent: cmd_Save_Click
 * Route: POST /api/kalibrasi/sertifikat-timbangan/save
 */
const saveSertifikatTimbanganHeader = async (req, res, next) => {
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
      catatan,
      batas_unjuk_kerja,
    } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('QA_ID and ID_No_Sertifikat are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    if (!tgl_kalibrasi || !interval) {
      const err = new Error('Tanggal Kalibrasi dan interval harus di isi');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if already approved (fn_IS_approve level 1)
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) > 0) {
      const err = new Error('Tidak bisa update sertifikat karena sudah approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Format tgl_kalibrasi (UTC+7)
    const formattedTglKalibrasi = tgl_kalibrasi
      ? moment(tgl_kalibrasi).utcOffset(7).format('YYYY-MM-DD')
      : null;

    const updateQuery = `
      UPDATE T_Kalibrasi_Sertifikat_Timbangan
      SET
        Assm_nama_instrumen        = :assm_nama_instrumen,
        Assm_No_identitas_kalibrasi= :assm_no_identitas_kalibrasi,
        Assm_Merk                  = :assm_merk,
        SERIAL_NUMBER              = :serial_number,
        Assm_Kapasitas             = :assm_kapasitas,
        Assm_Lokasi                = :assm_lokasi,
        Nama                       = :nama,
        No_Ident_No_batch          = :no_ident_no_batch,
        No_Sertifikat              = :no_sertifikat,
        Tertelusur_melalui         = :tertelusur_melalui,
        Rekalibrasi                = :rekalibrasi,
        Tgl_kalibrasi              = :tgl_kalibrasi,
        Interval                   = :interval,
        Metode_kalibrasi           = :metode_kalibrasi,
        Suhu_Kelembaban            = :suhu_kelembaban,
        Catatan                    = :catatan,
        BATAS_UNJUK_KERJA          = :batas_unjuk_kerja,
        UserID                     = :user_id,
        Delegated_To               = :delegated_to,
        Process_date               = GETDATE()
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
        batas_unjuk_kerja: batas_unjuk_kerja || '',
        user_id,
        delegated_to,
        qa_id,
        id_no_sertifikat,
      },
      type: Sequelize.QueryTypes.UPDATE,
    });

    return res.status(200).json({ success: true, message: 'Data has been saved successfully' });
  } catch (error) {
    console.error('Error in saveSertifikatTimbanganHeader:', error);
    next(error);
  }
};

/**
 * Save/Update Pre-Adjustment Data
 * VBA equivalent: Command3_Click (frm_Suhu save button)
 * Route: POST /api/kalibrasi/sertifikat-timbangan/pre-adj/save
 */
const savePreAdjData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const {
      qa_id,
      id_no_sertifikat,
      seq_id,
      pembacaan_standar,
      pembacaan_alat,
      error,
    } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('QA_ID and ID_No_Sertifikat are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    if (pembacaan_standar === undefined || pembacaan_standar === null || pembacaan_alat === undefined || error === undefined) {
      const err = new Error('Data harap di isi semua');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if already approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) > 0) {
      const err = new Error('Tidak bisa update sertifikat karena sudah approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    let sql, message;

    if (!seq_id) {
      // Insert new — get auto seq_id
      const autoSeqId = await getAutoPreAdjID(qa_id, id_no_sertifikat);

      sql = `
        INSERT INTO T_Kalibrasi_Sertifikat_Timbangan_Pre_Adj
          (QA_ID, ID_No_Sertifikat, Seq_ID, Pembacaan_standar, Pembacaan_Alat, Error, UserID, Delegated_To, Process_date)
        VALUES
          (:qa_id, :id_no_sertifikat, :seq_id, :pembacaan_standar, :pembacaan_alat, :error, :user_id, :delegated_to, GETDATE())
      `;
      message = 'Sukses insert data!';
      await sequelizeMSQL.query(sql, {
        replacements: {
          qa_id, id_no_sertifikat,
          seq_id: autoSeqId,
          pembacaan_standar: pembacaan_standar || '',
          pembacaan_alat: pembacaan_alat || '',
          error: error || '',
          user_id, delegated_to,
        },
        type: Sequelize.QueryTypes.INSERT,
      });
    } else {
      // Update existing
      sql = `
        UPDATE T_Kalibrasi_Sertifikat_Timbangan_Pre_Adj
        SET
          Pembacaan_standar = :pembacaan_standar,
          Pembacaan_Alat    = :pembacaan_alat,
          Error             = :error,
          UserID            = :user_id,
          Delegated_To      = :delegated_to,
          Process_date      = GETDATE()
        WHERE QA_ID = :qa_id
          AND ID_No_Sertifikat = :id_no_sertifikat
          AND Seq_ID = :seq_id
      `;
      message = 'Sukses update data!';
      await sequelizeMSQL.query(sql, {
        replacements: {
          qa_id, id_no_sertifikat, seq_id,
          pembacaan_standar: pembacaan_standar || '',
          pembacaan_alat: pembacaan_alat || '',
          error: error || '',
          user_id, delegated_to,
        },
        type: Sequelize.QueryTypes.UPDATE,
      });
    }

    return res.status(200).json({ success: true, message });
  } catch (error) {
    console.error('Error in savePreAdjData:', error);
    next(error);
  }
};

/**
 * Save/Update Daya Ulang Data (Massa Standar / Standar Deviasi)
 * VBA equivalent: cmd_Save_kelembaban_Click
 * Route: POST /api/kalibrasi/sertifikat-timbangan/daya-ulang/save
 */
const saveDayaUlangData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const {
      qa_id,
      id_no_sertifikat,
      seq_id,
      massa_standar,
      standar_deviasi,
    } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('QA_ID and ID_No_Sertifikat are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    if (massa_standar === undefined || massa_standar === null || standar_deviasi === undefined) {
      const err = new Error('Data harap di isi semua');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if already approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) > 0) {
      const err = new Error('Tidak bisa update sertifikat karena sudah approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    let message;

    if (!seq_id) {
      // Insert new — auto seq_id mapped from fnGetAuto_KelembabanID (Timbangan version)
      const autoSeqId = await getAutoDayaUlangID(qa_id, id_no_sertifikat);

      await sequelizeMSQL.query(`
        INSERT INTO T_Kalibrasi_Sertifikat_Timbangan_Daya_Ulang
          (QA_ID, ID_No_Sertifikat, Seq_ID, Massa_standar, Standar_deviasi, UserID, Delegated_To, Process_date)
        VALUES
          (:qa_id, :id_no_sertifikat, :seq_id, :massa_standar, :standar_deviasi, :user_id, :delegated_to, GETDATE())
      `, {
        replacements: {
          qa_id, id_no_sertifikat,
          seq_id: autoSeqId,
          massa_standar: massa_standar || '',
          standar_deviasi: standar_deviasi || '',
          user_id, delegated_to,
        },
        type: Sequelize.QueryTypes.INSERT,
      });
      message = 'Sukses insert data!';
    } else {
      // Update existing
      await sequelizeMSQL.query(`
        UPDATE T_Kalibrasi_Sertifikat_Timbangan_Daya_Ulang
        SET
          Massa_standar  = :massa_standar,
          Standar_deviasi = :standar_deviasi,
          UserID         = :user_id,
          Delegated_To   = :delegated_to,
          Process_date   = GETDATE()
        WHERE QA_ID = :qa_id
          AND ID_No_Sertifikat = :id_no_sertifikat
          AND Seq_ID = :seq_id
      `, {
        replacements: {
          qa_id, id_no_sertifikat, seq_id,
          massa_standar: massa_standar || '',
          standar_deviasi: standar_deviasi || '',
          user_id, delegated_to,
        },
        type: Sequelize.QueryTypes.UPDATE,
      });
      message = 'Sukses update data!';
    }

    return res.status(200).json({ success: true, message });
  } catch (error) {
    console.error('Error in saveDayaUlangData:', error);
    next(error);
  }
};

/**
 * Save/Update Massa Std Data (Penyimpangan dari Konvensional)
 * VBA equivalent: cmd_grid3_save_Click
 * Route: POST /api/kalibrasi/sertifikat-timbangan/massa-std/save
 */
const saveMassaStdData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const {
      qa_id,
      id_no_sertifikat,
      seq_id,
      konvensional_standar,
      pembacaan_alat,
      error,
      ketidakpastian,
    } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('QA_ID and ID_No_Sertifikat are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    if (konvensional_standar === undefined || konvensional_standar === null ||
        pembacaan_alat === undefined || error === undefined || ketidakpastian === undefined) {
      const err = new Error('Data harap di isi semua');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if already approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) > 0) {
      const err = new Error('Tidak bisa update sertifikat karena sudah approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    let message;

    if (!seq_id) {
      // Insert new
      const autoSeqId = await getAutoMassaStandardID(qa_id, id_no_sertifikat);

      await sequelizeMSQL.query(`
        INSERT INTO T_Kalibrasi_Sertifikat_Timbangan_Massa_Std
          (QA_ID, ID_No_Sertifikat, Seq_ID, Konvensional_standar, Pembacaan_Alat, Error, Ketidakpastian, UserID, Delegated_To, Process_date)
        VALUES
          (:qa_id, :id_no_sertifikat, :seq_id, :konvensional_standar, :pembacaan_alat, :error, :ketidakpastian, :user_id, :delegated_to, GETDATE())
      `, {
        replacements: {
          qa_id, id_no_sertifikat,
          seq_id: autoSeqId,
          konvensional_standar: konvensional_standar || '',
          pembacaan_alat: pembacaan_alat || '',
          error: error || '',
          ketidakpastian: ketidakpastian || '',
          user_id, delegated_to,
        },
        type: Sequelize.QueryTypes.INSERT,
      });
      message = 'Sukses insert data!';
    } else {
      // Update existing
      await sequelizeMSQL.query(`
        UPDATE T_Kalibrasi_Sertifikat_Timbangan_Massa_Std
        SET
          Konvensional_standar = :konvensional_standar,
          Pembacaan_Alat       = :pembacaan_alat,
          Error                = :error,
          Ketidakpastian       = :ketidakpastian,
          UserID               = :user_id,
          Delegated_To         = :delegated_to,
          Process_date         = GETDATE()
        WHERE QA_ID = :qa_id
          AND ID_No_Sertifikat = :id_no_sertifikat
          AND Seq_ID = :seq_id
      `, {
        replacements: {
          qa_id, id_no_sertifikat, seq_id,
          konvensional_standar: konvensional_standar || '',
          pembacaan_alat: pembacaan_alat || '',
          error: error || '',
          ketidakpastian: ketidakpastian || '',
          user_id, delegated_to,
        },
        type: Sequelize.QueryTypes.UPDATE,
      });
      message = 'Sukses update data!';
    }

    return res.status(200).json({ success: true, message });
  } catch (error) {
    console.error('Error in saveMassaStdData:', error);
    next(error);
  }
};

/**
 * Save/Update Pusat Pan Data (Hasil Pengukuran Beban)
 * VBA equivalent: cmd4_Save_Click
 * Route: POST /api/kalibrasi/sertifikat-timbangan/pusat-pan/save
 */
const savePusatPanData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const {
      qa_id,
      id_no_sertifikat,
      seq_id,
      massa,
      massa_0,
      massa_1,
      massa_2,
      massa_3,
      massa_4,
      perbedaan_max,
    } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('QA_ID and ID_No_Sertifikat are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    if (massa === undefined || massa === null || massa_0 === undefined ||
        massa_1 === undefined || massa_2 === undefined || massa_3 === undefined ||
        massa_4 === undefined || perbedaan_max === undefined) {
      const err = new Error('Data harap di isi semua');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if already approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) > 0) {
      const err = new Error('Tidak bisa update sertifikat karena sudah approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    let message;

    if (!seq_id) {
      // Insert new
      const autoSeqId = await getAutoPusatPanID(qa_id, id_no_sertifikat);

      await sequelizeMSQL.query(`
        INSERT INTO T_Kalibrasi_Sertifikat_Timbangan_Pusat_Pan
          (QA_ID, ID_No_Sertifikat, Seq_ID, Massa, Massa_0, Massa_1, Massa_2, Massa_3, Massa_4, Perbedaan_Max, UserID, Delegated_To, Process_date)
        VALUES
          (:qa_id, :id_no_sertifikat, :seq_id, :massa, :massa_0, :massa_1, :massa_2, :massa_3, :massa_4, :perbedaan_max, :user_id, :delegated_to, GETDATE())
      `, {
        replacements: {
          qa_id, id_no_sertifikat,
          seq_id: autoSeqId,
          massa: massa || '',
          massa_0: massa_0 || '',
          massa_1: massa_1 || '',
          massa_2: massa_2 || '',
          massa_3: massa_3 || '',
          massa_4: massa_4 || '',
          perbedaan_max: perbedaan_max || '',
          user_id, delegated_to,
        },
        type: Sequelize.QueryTypes.INSERT,
      });
      message = 'Sukses insert data!';
    } else {
      // Update existing — uses txt_Suhu_SeqID from VBA (seq_id)
      await sequelizeMSQL.query(`
        UPDATE T_Kalibrasi_Sertifikat_Timbangan_Pusat_Pan
        SET
          Massa         = :massa,
          Massa_0       = :massa_0,
          Massa_1       = :massa_1,
          Massa_2       = :massa_2,
          Massa_3       = :massa_3,
          Massa_4       = :massa_4,
          Perbedaan_Max = :perbedaan_max,
          UserID        = :user_id,
          Delegated_To  = :delegated_to,
          Process_date  = GETDATE()
        WHERE QA_ID = :qa_id
          AND ID_No_Sertifikat = :id_no_sertifikat
          AND Seq_ID = :seq_id
      `, {
        replacements: {
          qa_id, id_no_sertifikat, seq_id,
          massa: massa || '',
          massa_0: massa_0 || '',
          massa_1: massa_1 || '',
          massa_2: massa_2 || '',
          massa_3: massa_3 || '',
          massa_4: massa_4 || '',
          perbedaan_max: perbedaan_max || '',
          user_id, delegated_to,
        },
        type: Sequelize.QueryTypes.UPDATE,
      });
      message = 'Sukses update data!';
    }

    return res.status(200).json({ success: true, message });
  } catch (error) {
    console.error('Error in savePusatPanData:', error);
    next(error);
  }
};

// ===================================================================
// DELETE OPERATIONS
// ===================================================================

/**
 * Delete Pre-Adjustment Row
 * VBA equivalent: Command4_Click
 * Route: DELETE /api/kalibrasi/sertifikat-timbangan/pre-adj/delete
 */
const deletePreAdjData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat, seq_id } = req.query;

    if (!qa_id || !id_no_sertifikat || !seq_id) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if already approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) > 0) {
      const err = new Error('Tidak bisa update sertifikat karena sudah approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    await sequelizeMSQL.query(`
      DELETE FROM T_Kalibrasi_Sertifikat_Timbangan_Pre_Adj
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Seq_ID = :seq_id
    `, {
      replacements: { qa_id, id_no_sertifikat, seq_id },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({ success: true, message: 'Sukses delete data!' });
  } catch (error) {
    console.error('Error in deletePreAdjData:', error);
    next(error);
  }
};

/**
 * Delete Daya Ulang Row
 * VBA equivalent: Command5_Click
 * Route: DELETE /api/kalibrasi/sertifikat-timbangan/daya-ulang/delete
 */
const deleteDayaUlangData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat, seq_id } = req.query;

    if (!qa_id || !id_no_sertifikat || !seq_id) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if already approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) > 0) {
      const err = new Error('Tidak bisa update sertifikat karena sudah approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    await sequelizeMSQL.query(`
      DELETE FROM T_Kalibrasi_Sertifikat_Timbangan_Daya_Ulang
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Seq_ID = :seq_id
    `, {
      replacements: { qa_id, id_no_sertifikat, seq_id },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({ success: true, message: 'Sukses delete data!' });
  } catch (error) {
    console.error('Error in deleteDayaUlangData:', error);
    next(error);
  }
};

/**
 * Delete Massa Std Row (Penyimpangan)
 * VBA equivalent: cmd3_Delete_Click
 * Route: DELETE /api/kalibrasi/sertifikat-timbangan/massa-std/delete
 */
const deleteMassaStdData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat, seq_id } = req.query;

    if (!qa_id || !id_no_sertifikat || !seq_id) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if already approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) > 0) {
      const err = new Error('Tidak bisa update sertifikat karena sudah approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    await sequelizeMSQL.query(`
      DELETE FROM T_Kalibrasi_Sertifikat_Timbangan_Massa_Std
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Seq_ID = :seq_id
    `, {
      replacements: { qa_id, id_no_sertifikat, seq_id },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({ success: true, message: 'Sukses delete data!' });
  } catch (error) {
    console.error('Error in deleteMassaStdData:', error);
    next(error);
  }
};

/**
 * Delete Pusat Pan Row
 * VBA equivalent: cmd4_delete_Click
 * Route: DELETE /api/kalibrasi/sertifikat-timbangan/pusat-pan/delete
 */
const deletePusatPanData = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat, seq_id } = req.query;

    if (!qa_id || !id_no_sertifikat || !seq_id) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if already approved
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) > 0) {
      const err = new Error('Tidak bisa update sertifikat karena sudah approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    await sequelizeMSQL.query(`
      DELETE FROM T_Kalibrasi_Sertifikat_Timbangan_Pusat_Pan
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Seq_ID = :seq_id
    `, {
      replacements: { qa_id, id_no_sertifikat, seq_id },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({ success: true, message: 'Sukses delete data!' });
  } catch (error) {
    console.error('Error in deletePusatPanData:', error);
    next(error);
  }
};

// ===================================================================
// APPROVE / REJECT
// ===================================================================

/**
 * Approve Sertifikat Timbangan (Level 1)
 * VBA equivalent: cmd_Approve_Click
 * Route: POST /api/kalibrasi/sertifikat-timbangan/approve
 */
const approveSertifikatTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if tanggal kalibrasi is input (fnIsInputTglKalibrasi)
    const tglQuery = `
      SELECT Tgl_kalibrasi, Interval
      FROM T_Kalibrasi_Sertifikat_Timbangan
      WHERE QA_id = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;
    const tglResults = await sequelizeMSQL.query(tglQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (tglResults.length === 0 || !tglResults[0].Tgl_kalibrasi) {
      const err = new Error('Belum simpan tanggal kalibrasi, save tanggal');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    if (!tglResults[0].Interval) {
      const err = new Error('Harap isi interval');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if already approved (fn_IS_approve level 1)
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) > 0) {
      const err = new Error('Tidak bisa update sertifikat karena sudah approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Get approver identity (fnApprIdentity with KAL_Sert_Timbangan)
    const identityQuery = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Sert_Timbangan'
        AND Appr_ID = :user_id
        AND Appr_No = 1
    `;
    const identityResults = await sequelizeMSQL.query(identityQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });
    const apprIdentity = identityResults.length > 0 ? identityResults[0].Appr_Identity : 0;

    // Insert approval record
    await sequelizeMSQL.query(`
      INSERT INTO T_Kalibrasi_Sertifikat_Timbangan_Status
        (QA_ID, ID_No_Sertifikat, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, flag_update)
      VALUES
        (:qa_id, :id_no_sertifikat, 1, 0, :appr_identity, GETDATE(), :user_id, :delegated_to, NULL)
    `, {
      replacements: { qa_id, id_no_sertifikat, appr_identity: apprIdentity, user_id, delegated_to },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(200).json({ success: true, message: 'Data has been approved successfully' });
  } catch (error) {
    console.error('Error in approveSertifikatTimbangan:', error);
    next(error);
  }
};

/**
 * Reject Sertifikat Timbangan (delete approval status)
 * VBA equivalent: cmd_reject_Click
 * Route: POST /api/kalibrasi/sertifikat-timbangan/reject
 */
const rejectSertifikatTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if approved (fn_IS_approve level 1)
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) === 0) {
      const err = new Error('Tidak bisa reject, data belum approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    await sequelizeMSQL.query(`
      DELETE FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.DELETE,
    });

    return res.status(200).json({ success: true, message: 'Data has been rejected successfully' });
  } catch (error) {
    console.error('Error in rejectSertifikatTimbangan:', error);
    next(error);
  }
};

// ===================================================================
// GENERATE DA
// ===================================================================

/**
 * Generate DA from Sertifikat Timbangan
 * VBA equivalent: cmd_Generate_DA_Click
 * Route: POST /api/kalibrasi/sertifikat-timbangan/generate-da
 */
const generateDASertifikatTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if approved at level 1 (fn_IS_approve(1))
    const checkApprove1Query = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approve1Results = await sequelizeMSQL.query(checkApprove1Query, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approve1Results[0]?.jumRow || 0) === 0) {
      const err = new Error('Tidak bisa generate DA karena belum approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if already generated DA (fn_IS_approve(2))
    const checkApprove2Query = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 2
    `;
    const approve2Results = await sequelizeMSQL.query(checkApprove2Query, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approve2Results[0]?.jumRow || 0) > 0) {
      const err = new Error('Sudah generate DA!');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check interval
    const intervalQuery = `
      SELECT Interval
      FROM T_Kalibrasi_Sertifikat_Timbangan
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;
    const intervalResults = await sequelizeMSQL.query(intervalQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (!intervalResults[0]?.Interval || intervalResults[0].Interval == 0) {
      const err = new Error('Interval tidak boleh nol');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if DA record exists
    const checkDAQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_DA_Timbangan
      WHERE QA_ID = :qa_id
    `;
    const daResults = await sequelizeMSQL.query(checkDAQuery, {
      replacements: { qa_id },
      type: Sequelize.QueryTypes.SELECT,
    });

    // Get approver identity (fnApprIdentity with KAL_Sert_Timbangan, level 2)
    const identityQuery = `
      SELECT Appr_Identity
      FROM m_approver_lines
      WHERE isactive = 1
        AND Appr_ApplicationCode LIKE 'KAL_Sert_Timbangan'
        AND Appr_ID = :user_id
        AND Appr_No = 2
    `;
    const identityResults = await sequelizeMSQL.query(identityQuery, {
      replacements: { user_id },
      type: Sequelize.QueryTypes.SELECT,
    });
    const apprIdentity = identityResults.length > 0 ? identityResults[0].Appr_Identity : 0;

    if ((daResults[0]?.jumRow || 0) === 0) {
      // Insert new DA record
      await sequelizeMSQL.query(`
        INSERT INTO T_Kalibrasi_DA_Timbangan
          (QA_ID, Jenis_kalibrasi, Program_verifikasi, Assm_nama_instrumen, Assm_No_identitas_Istrumen,
           Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi,
           Tgl_kalibrasi, Interval, Kalibrasi_selanjutnya, Catatan, Parameter_No_id_anak_timbang,
           Parameter_Interval, Parameter_kriteria, Pelaksana_Verifikasi, Titik_verifikasi,
           UserID, Delegated_To, Process_date)
        SELECT
          QA_ID, Jenis_kalibrasi, Program_verifikasi, Assm_nama_instrumen, Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi, Group_Da_Dept, Assm_Kapasitas, Parameter_Kalibrasi, Assm_Lokasi,
          Tgl_kalibrasi, Interval, DATEADD(MONTH, Interval, Tgl_kalibrasi) as Kalibrasi_selanjutnya, Catatan,
          Parameter_No_id_anak_timbang, Parameter_Interval, Parameter_kriteria, Pelaksana_Verifikasi, Titik_verifikasi,
          :user_id AS UserID, :delegated_to AS Delegated_To, GETDATE() AS Process_date
        FROM T_Kalibrasi_Sertifikat_Timbangan
        WHERE QA_ID = :qa_id
          AND ID_No_Sertifikat = :id_no_sertifikat
      `, {
        replacements: { qa_id, id_no_sertifikat, user_id, delegated_to },
        type: Sequelize.QueryTypes.INSERT,
      });
    } else {
      // Update existing DA record
      await sequelizeMSQL.query(`
        UPDATE T_Kalibrasi_DA_Timbangan
        SET
          Jenis_kalibrasi                = A.Jenis_kalibrasi,
          Program_verifikasi             = A.Program_verifikasi,
          Assm_nama_instrumen            = A.Assm_nama_instrumen,
          Assm_No_identitas_Istrumen     = A.Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi    = A.Assm_No_identitas_kalibrasi,
          Group_Da_Dept                  = A.Group_Da_Dept,
          Assm_Kapasitas                 = A.Assm_Kapasitas,
          Parameter_Kalibrasi            = A.Parameter_Kalibrasi,
          Assm_Lokasi                    = A.Assm_Lokasi,
          Tgl_kalibrasi                  = A.Tgl_kalibrasi,
          Interval                       = A.Interval,
          Kalibrasi_selanjutnya          = DATEADD(MONTH, A.Interval, A.Tgl_kalibrasi),
          Catatan                        = A.Catatan,
          Parameter_No_id_anak_timbang   = A.Parameter_No_id_anak_timbang,
          Parameter_Interval             = A.Parameter_Interval,
          Parameter_kriteria             = A.Parameter_kriteria,
          Pelaksana_Verifikasi           = A.Pelaksana_Verifikasi,
          Titik_verifikasi               = A.Titik_verifikasi,
          UserID                         = :user_id,
          Delegated_To                   = :delegated_to,
          Process_date                   = GETDATE()
        FROM T_Kalibrasi_Sertifikat_Timbangan as A
        LEFT JOIN T_Kalibrasi_DA_Timbangan as B ON A.QA_ID = B.QA_ID
        WHERE A.QA_ID = :qa_id
          AND A.ID_No_Sertifikat = :id_no_sertifikat
      `, {
        replacements: { qa_id, id_no_sertifikat, user_id, delegated_to },
        type: Sequelize.QueryTypes.UPDATE,
      });

      // Delete old DA status
      await sequelizeMSQL.query(`
        DELETE FROM T_Kalibrasi_DA_Timbangan_status
        WHERE QA_ID = :qa_id
      `, {
        replacements: { qa_id },
        type: Sequelize.QueryTypes.DELETE,
      });
    }

    // Insert status level 2 (Generate DA marker)
    await sequelizeMSQL.query(`
      INSERT INTO T_Kalibrasi_Sertifikat_Timbangan_Status
        (QA_ID, ID_No_Sertifikat, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, flag_update)
      VALUES
        (:qa_id, :id_no_sertifikat, 2, 0, :appr_identity, GETDATE(), :user_id, :delegated_to, NULL)
    `, {
      replacements: { qa_id, id_no_sertifikat, appr_identity: apprIdentity, user_id, delegated_to },
      type: Sequelize.QueryTypes.INSERT,
    });

    return res.status(200).json({ success: true, message: `Sukses Generate DA No: ${qa_id}` });
  } catch (error) {
    console.error('Error in generateDASertifikatTimbangan:', error);
    next(error);
  }
};

// ===================================================================
// CREATE NEW SERTIFIKAT & RE-SERTIFIKASI
// ===================================================================

/**
 * Create New Sertifikat Timbangan from DA
 * VBA equivalent: cmd_New_Click
 * Route: POST /api/kalibrasi/sertifikat-timbangan/create-new
 */
const createNewSertifikatTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id } = req.body;

    if (!qa_id) {
      const err = new Error('QA_ID is required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Get new certificate number (fnGetKal_Ser_M_No_ID for Timbangan)
    const noResults = await sequelizeMSQL.query(
      `SELECT dbo.fnGetKal_Ser_M_No_ID() as noSertifikat`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const sNoSertifikat = noResults[0]?.noSertifikat;
    if (!sNoSertifikat) {
      const err = new Error('Failed to generate new certificate number');
      err.statusCode = 500;
      res.status(500).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Insert new sertifikat from DA Timbangan
    await sequelizeMSQL.query(`
      INSERT INTO T_Kalibrasi_Sertifikat_Timbangan
        (QA_ID, ID_No_sertifikat, Jenis_kalibrasi, Program_verifikasi, isSert_Manual, Tgl,
         Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk,
         Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi, Parameter_No_id_anak_timbang,
         Parameter_Interval, Parameter_kriteria, Pelaksana_Verifikasi, Titik_verifikasi,
         UserID, Delegated_To, Process_date)
      SELECT
        QA_ID, :sNoSertifikat AS ID_No_sertifikat, Jenis_kalibrasi, Program_verifikasi, 1,
        GETDATE() AS Tgl,
        Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi,
        '#Merk' AS Assm_Merk,
        Assm_Kapasitas, Assm_Lokasi, Group_Da_Dept, Parameter_Kalibrasi, Parameter_No_id_anak_timbang,
        Parameter_Interval, Parameter_kriteria, Pelaksana_Verifikasi, Titik_verifikasi,
        :user_id AS UserID, :delegated_to AS Delegated_To, GETDATE() AS Process_date
      FROM T_Kalibrasi_DA_Timbangan
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
    console.error('Error in createNewSertifikatTimbangan:', error);
    next(error);
  }
};

/**
 * Re-Sertifikasi Timbangan — copy existing certificate to new one
 * VBA equivalent: cmd_ReSertifikasi_Click
 * Route: POST /api/kalibrasi/sertifikat-timbangan/resertifikasi
 */
const resertifikasiTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('QA_ID and ID_No_Sertifikat are required');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Check if approved (fn_IS_approve level 1)
    const checkApproveQuery = `
      SELECT COUNT(*) as jumRow
      FROM T_Kalibrasi_Sertifikat_Timbangan_Status
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
        AND Approver_No = 1
    `;
    const approveResults = await sequelizeMSQL.query(checkApproveQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if ((approveResults[0]?.jumRow || 0) === 0) {
      const err = new Error('Tidak bisa Re-Sertifikat karena belum approve');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Get new certificate number (fnGetKal_Ser_M_No_ID for Timbangan)
    const noResults = await sequelizeMSQL.query(
      `SELECT dbo.fnGetKal_Ser_M_No_ID() as AutoNum`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const autoIDNoSertifikat = noResults[0]?.AutoNum;
    if (!autoIDNoSertifikat) {
      const err = new Error('Failed to generate new certificate number');
      err.statusCode = 500;
      res.status(500).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const replacements = { auto_id: autoIDNoSertifikat, qa_id, id_no_sertifikat, user_id, delegated_to };

    // 1# Insert header
    await sequelizeMSQL.query(`
      INSERT INTO T_Kalibrasi_Sertifikat_Timbangan
        (QA_ID, ID_No_Sertifikat, Jenis_kalibrasi, Program_verifikasi, tgl,
         Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk,
         SERIAL_NUMBER, Assm_Kapasitas, Assm_Lokasi, Nama, No_Ident_No_batch, No_Sertifikat,
         Tertelusur_melalui, Rekalibrasi, Tgl_kalibrasi, Interval,
         Metode_kalibrasi, Suhu_Kelembaban, Catatan, Group_Da_Dept, Parameter_Kalibrasi,
         Parameter_No_id_anak_timbang, Parameter_Interval, Parameter_kriteria,
         Pelaksana_Verifikasi, Titik_verifikasi, BATAS_UNJUK_KERJA,
         UserID, Delegated_To, Process_date)
      SELECT
        QA_ID, :auto_id AS ID_No_Sertifikat, Jenis_kalibrasi, Program_verifikasi, GETDATE() AS tgl,
        Assm_nama_instrumen, Assm_No_identitas_Istrumen, Assm_No_identitas_kalibrasi, Assm_Merk,
        SERIAL_NUMBER, Assm_Kapasitas, Assm_Lokasi, Nama, No_Ident_No_batch, No_Sertifikat,
        Tertelusur_melalui, Rekalibrasi, GETDATE() AS Tgl_kalibrasi, Interval,
        Metode_kalibrasi, Suhu_Kelembaban, Catatan, Group_Da_Dept, Parameter_Kalibrasi,
        Parameter_No_id_anak_timbang, Parameter_Interval, Parameter_kriteria,
        Pelaksana_Verifikasi, Titik_verifikasi, BATAS_UNJUK_KERJA,
        :user_id AS UserID, :delegated_to AS Delegated_To, GETDATE() AS Process_date
      FROM T_Kalibrasi_Sertifikat_Timbangan
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `, { replacements, type: Sequelize.QueryTypes.INSERT });

    // detail 1 – Pre-Adjustment
    await sequelizeMSQL.query(`
      INSERT INTO T_Kalibrasi_Sertifikat_Timbangan_Pre_Adj
        (QA_ID, ID_No_Sertifikat, Seq_ID, Pembacaan_standar, Pembacaan_Alat, Error, UserID, Delegated_To, Process_date)
      SELECT
        QA_ID, :auto_id AS ID_No_Sertifikat, Seq_ID, Pembacaan_standar, Pembacaan_Alat, Error,
        :user_id AS UserID, :delegated_to AS Delegated_To, GETDATE() AS Process_date
      FROM T_Kalibrasi_Sertifikat_Timbangan_Pre_Adj
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `, { replacements, type: Sequelize.QueryTypes.INSERT });

    // detail 2 – Daya Ulang
    await sequelizeMSQL.query(`
      INSERT INTO T_Kalibrasi_Sertifikat_Timbangan_Daya_Ulang
        (QA_ID, ID_No_Sertifikat, Seq_ID, Massa_standar, Standar_deviasi, UserID, Delegated_To, Process_date)
      SELECT
        QA_ID, :auto_id AS ID_No_Sertifikat, Seq_ID, Massa_standar, Standar_deviasi,
        :user_id AS UserID, :delegated_to AS Delegated_To, GETDATE() AS Process_date
      FROM T_Kalibrasi_Sertifikat_Timbangan_Daya_Ulang
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `, { replacements, type: Sequelize.QueryTypes.INSERT });

    // detail 3 – Massa Standard
    await sequelizeMSQL.query(`
      INSERT INTO T_Kalibrasi_Sertifikat_Timbangan_Massa_Std
        (QA_ID, ID_No_Sertifikat, Seq_ID, Konvensional_standar, Pembacaan_Alat, Error, Ketidakpastian, UserID, Delegated_To, Process_date)
      SELECT
        QA_ID, :auto_id AS ID_No_Sertifikat, Seq_ID, Konvensional_standar, Pembacaan_Alat, Error, Ketidakpastian,
        :user_id AS UserID, :delegated_to AS Delegated_To, GETDATE() AS Process_date
      FROM T_Kalibrasi_Sertifikat_Timbangan_Massa_Std
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `, { replacements, type: Sequelize.QueryTypes.INSERT });

    // detail 4 – Pusat Pan
    await sequelizeMSQL.query(`
      INSERT INTO T_Kalibrasi_Sertifikat_Timbangan_Pusat_Pan
        (QA_ID, ID_No_Sertifikat, Seq_ID, Massa, Massa_0, Massa_1, Massa_2, Massa_3, Massa_4, Perbedaan_Max, UserID, Delegated_To, Process_date)
      SELECT
        QA_ID, :auto_id AS ID_No_Sertifikat, Seq_ID, Massa, Massa_0, Massa_1, Massa_2, Massa_3, Massa_4, Perbedaan_Max,
        :user_id AS UserID, :delegated_to AS Delegated_To, GETDATE() AS Process_date
      FROM T_Kalibrasi_Sertifikat_Timbangan_Pusat_Pan
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `, { replacements, type: Sequelize.QueryTypes.INSERT });

    return res.status(200).json({
      success: true,
      message: 'Sukses resertifikasi',
      data: {
        qa_id,
        old_id_no_sertifikat: id_no_sertifikat,
        new_id_no_sertifikat: autoIDNoSertifikat,
      },
    });
  } catch (error) {
    console.error('Error in resertifikasiTimbangan:', error);
    next(error);
  }
};

// ===================================================================
// PRINT LABEL TERKALIBRASI
// ===================================================================

/**
 * Print Label Terkalibrasi Timbangan
 * VBA equivalent: cmdLabelTerkalibrasi_Click / PrintLabelTerkalibrasi_Kecil
 * If Print_LabelDate is null, record print date and return label data.
 * Route: POST /api/kalibrasi/sertifikat-timbangan/print-label
 */
const printLabelTerkalibrasiTimbangan = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const { qa_id, id_no_sertifikat } = req.body;

    if (!qa_id || !id_no_sertifikat) {
      const err = new Error('Data belum di pilih');
      err.statusCode = 400;
      res.status(400).json({ success: false, message: err.message });
      next(err);
      return;
    }

    // Read current record
    const dataQuery = `
      SELECT
        QA_ID,
        Assm_No_identitas_kalibrasi,
        Tgl_kalibrasi,
        Interval,
        DATEADD(MONTH, Interval, Tgl_kalibrasi) as kalibrasi_selanjutnya,
        Print_LabelDate,
        Print_LabelUserID,
        Print_LabelDelegatedTo
      FROM T_Kalibrasi_Sertifikat_Timbangan
      WHERE QA_ID = :qa_id
        AND ID_No_Sertifikat = :id_no_sertifikat
    `;

    const dataResults = await sequelizeMSQL.query(dataQuery, {
      replacements: { qa_id, id_no_sertifikat },
      type: Sequelize.QueryTypes.SELECT,
    });

    if (dataResults.length === 0) {
      const err = new Error('Label Terkalibrasi tidak dapat di cetak! Data Sertifikat Kalibrasi belum tersedia');
      err.statusCode = 404;
      res.status(404).json({ success: false, message: err.message });
      next(err);
      return;
    }

    const row = dataResults[0];
    let labelPrintDate = row.Print_LabelDate;
    let labelParafBy = row.Print_LabelDelegatedTo;

    // If Print_LabelDate is null → record first print date and paraf
    if (!labelPrintDate) {
      labelPrintDate = moment().utcOffset(7).format('YYYY-MM-DD HH:mm:ss');
      labelParafBy = delegated_to;

      await sequelizeMSQL.query(`
        UPDATE T_Kalibrasi_Sertifikat_Timbangan
        SET
          Print_labeldate          = :print_labeldate,
          Print_LabelUserID        = :print_label_user_id,
          Print_LabelDelegatedTo   = :print_label_delegated_to
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

    // Get approver name for paraf
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
        print_date: labelPrintDate,
      },
    });
  } catch (error) {
    console.error('Error in printLabelTerkalibrasiTimbangan:', error);
    next(error);
  }
};

module.exports = {
  // Existing GET functions
  searchSertifikatTimbangan,
  getSertifikatByQAID,
  getSertifikatTimbangan,
  getPreAdjData,
  getDayaUlangData,
  getPenyimpanganData,
  getPusatPanData,
  searchResertifikasiTimbangan,
  searchDATimbangan,
  // New check/helper GET functions
  checkIsApprovedTimbangan,
  checkTglKalibrasiTimbangan,
  checkAllowInputTimbangan,
  getApproverIdentityTimbangan,
  checkApproveButtonTimbangan,
  getPrintDataTimbangan,
  // POST save functions
  saveSertifikatTimbanganHeader,
  savePreAdjData,
  saveDayaUlangData,
  saveMassaStdData,
  savePusatPanData,
  // DELETE functions
  deletePreAdjData,
  deleteDayaUlangData,
  deleteMassaStdData,
  deletePusatPanData,
  // Approve / Reject
  approveSertifikatTimbangan,
  rejectSertifikatTimbangan,
  // Generate DA / Create New / Resertifikasi
  generateDASertifikatTimbangan,
  createNewSertifikatTimbangan,
  resertifikasiTimbangan,
  // Print Label
  printLabelTerkalibrasiTimbangan,
};
