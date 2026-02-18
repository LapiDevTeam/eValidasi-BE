const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');
const moment = require('moment');
const { getDateTime, getEmployeeName } = require('../../helpers/kalibrasi.helper');

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

module.exports = {
  searchSertifikatTimbangan,
  getSertifikatByQAID,
  getSertifikatTimbangan,
  getPreAdjData,
  getDayaUlangData,
  getPenyimpanganData,
  getPusatPanData,
  searchResertifikasiTimbangan,
  searchDATimbangan,
};
