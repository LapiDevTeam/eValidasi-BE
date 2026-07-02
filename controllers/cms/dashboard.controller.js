'use strict';

const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');

/**
 * CMS Dashboard — Kondisi Unit Overdue / Compliant
 *
 * Aturan:
 *   Overdue   : Tgl_kalibrasi IS NULL dan tidak sedang ditandai "tidak siap" (OOC).
 *   Compliant : selain Overdue.
 *   Not Ready : sedang ditandai "tidak siap" (is_tidak_dapat=1 atau tanggal_label_OOC IS NOT NULL).
 *
 * Hak akses:
 *   - Departemen VN : super user, lihat semua unit.
 *   - Lainnya       : hanya unit dengan Group_Da_Dept = dept user;
 *                     unit yang sedang OOC tetap ditampilkan meski DA-nya
 *                     belum di-approve manager VN.
 */
const getUnitConditions = async (req, res, next) => {
  try {
    const { user_id, delegated_to, nama_user, bagian_user } = req.user;
    const isVN = bagian_user === 'VN';

    const replacements = {
      dept: bagian_user || '',
    };

    const vnApprovalWhere = `
      EXISTS (
        SELECT 1
        FROM T_Kalibrasi_DA_Thermohygro_status st
        WHERE st.QA_ID = A.QA_ID AND st.Approver_No = 1 AND st.isReject = 0
      )
      OR EXISTS (
        SELECT 1
        FROM T_Kalibrasi_DA_Timbangan_status st
        WHERE st.QA_ID = A.QA_ID AND st.Approver_No = 1 AND st.isReject = 0
      )
      OR EXISTS (
        SELECT 1
        FROM T_Kalibrasi_DA_Anak_Timbangan_status st
        WHERE st.QA_ID = A.QA_ID AND st.Approver_No = 1 AND st.isReject = 0
      )
      OR EXISTS (
        SELECT 1
        FROM T_Kalibrasi_DA_Bagian_status st
        WHERE st.QA_ID = A.QA_ID AND st.Approver_No = 1 AND st.isReject = 0
      )
    `;

    const oocWhere = `
      EXISTS (
        SELECT 1
        FROM T_Kalibrasi_Sertifikat_Bagian s
        WHERE s.QA_ID = A.QA_ID
          AND (s.is_tidak_dapat = 1 OR s.tanggal_label_OOC IS NOT NULL)
      )
      OR EXISTS (
        SELECT 1
        FROM T_Kalibrasi_Sertifikat_Thermohygro s
        WHERE s.QA_ID = A.QA_ID
          AND (s.is_tidak_dapat = 1 OR s.tanggal_label_OOC IS NOT NULL)
      )
      OR EXISTS (
        SELECT 1
        FROM T_Kalibrasi_Sertifikat_Timbangan s
        WHERE s.QA_ID = A.QA_ID
          AND (s.is_tidak_dapat = 1 OR s.tanggal_label_OOC IS NOT NULL)
      )
    `;

    const accessWhere = isVN
      ? '1 = 1'
      : `A.Group_Da_Dept = :dept
        AND (
          ${vnApprovalWhere}
          OR ${oocWhere}
        )`;

    const query = `
      WITH DA_Units AS (
        SELECT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Assm_Lokasi,
          Tgl_kalibrasi,
          Kalibrasi_selanjutnya,
          CAST('Thermohygro' AS VARCHAR(50)) AS Source_Type,
          CAST('T_Kalibrasi_DA_Thermohygro' AS VARCHAR(128)) AS Source_Table
        FROM T_Kalibrasi_DA_Thermohygro

        UNION ALL

        SELECT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Assm_Lokasi,
          Tgl_kalibrasi,
          Kalibrasi_selanjutnya,
          CAST('Timbangan' AS VARCHAR(50)) AS Source_Type,
          CAST('T_Kalibrasi_DA_Timbangan' AS VARCHAR(128)) AS Source_Table
        FROM T_Kalibrasi_DA_Timbangan

        UNION ALL

        SELECT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Assm_Lokasi,
          Tgl_kalibrasi,
          Kalibrasi_selanjutnya,
          CAST('Anak Timbangan' AS VARCHAR(50)) AS Source_Type,
          CAST('T_Kalibrasi_DA_Anak_Timbangan' AS VARCHAR(128)) AS Source_Table
        FROM T_Kalibrasi_DA_Anak_Timbangan

        UNION ALL

        SELECT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Kapasitas,
          Parameter_Kalibrasi,
          Assm_Lokasi,
          Tgl_kalibrasi,
          Kalibrasi_selanjutnya,
          CAST('Bagian' AS VARCHAR(50)) AS Source_Type,
          CAST('T_Kalibrasi_DA_Bagian' AS VARCHAR(128)) AS Source_Table
        FROM T_Kalibrasi_DA_Bagian
      )
      SELECT
        A.QA_ID,
        A.Assm_nama_instrumen,
        A.Assm_No_identitas_Istrumen,
        A.Assm_No_identitas_kalibrasi,
        A.Group_Da_Dept,
        A.Assm_Kapasitas,
        A.Parameter_Kalibrasi,
        A.Assm_Lokasi,
        A.Tgl_kalibrasi,
        A.Kalibrasi_selanjutnya,
        A.Source_Type,
        A.Source_Table,
        CASE
          WHEN A.Tgl_kalibrasi IS NULL
               AND NOT EXISTS (
                 SELECT 1
                 FROM T_Kalibrasi_Sertifikat_Bagian s
                 WHERE s.QA_ID = A.QA_ID
                   AND (s.is_tidak_dapat = 1 OR s.tanggal_label_OOC IS NOT NULL)
               )
               AND NOT EXISTS (
                 SELECT 1
                 FROM T_Kalibrasi_Sertifikat_Thermohygro s
                 WHERE s.QA_ID = A.QA_ID
                   AND (s.is_tidak_dapat = 1 OR s.tanggal_label_OOC IS NOT NULL)
               )
               AND NOT EXISTS (
                 SELECT 1
                 FROM T_Kalibrasi_Sertifikat_Timbangan s
                 WHERE s.QA_ID = A.QA_ID
                   AND (s.is_tidak_dapat = 1 OR s.tanggal_label_OOC IS NOT NULL)
               )
            THEN 'Overdue'
          ELSE 'Compliant'
        END AS Condition_Status,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Bagian s
            WHERE s.QA_ID = A.QA_ID
              AND (s.is_tidak_dapat = 1 OR s.tanggal_label_OOC IS NOT NULL)
          )
          OR EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Thermohygro s
            WHERE s.QA_ID = A.QA_ID
              AND (s.is_tidak_dapat = 1 OR s.tanggal_label_OOC IS NOT NULL)
          )
          OR EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Timbangan s
            WHERE s.QA_ID = A.QA_ID
              AND (s.is_tidak_dapat = 1 OR s.tanggal_label_OOC IS NOT NULL)
          )
            THEN 1
          ELSE 0
        END AS Is_Not_Ready,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Bagian s
            WHERE s.QA_ID = A.QA_ID
              AND (s.is_tidak_dapat = 1 OR s.tanggal_label_OOC IS NOT NULL)
          )
            THEN 'Bagian'
          WHEN EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Thermohygro s
            WHERE s.QA_ID = A.QA_ID
              AND (s.is_tidak_dapat = 1 OR s.tanggal_label_OOC IS NOT NULL)
          )
            THEN 'Thermohygro'
          WHEN EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Timbangan s
            WHERE s.QA_ID = A.QA_ID
              AND (s.is_tidak_dapat = 1 OR s.tanggal_label_OOC IS NOT NULL)
          )
            THEN 'Timbangan'
          ELSE NULL
        END AS Not_Ready_Source
      FROM DA_Units A
      WHERE ${accessWhere}
      ORDER BY
        A.Group_Da_Dept,
        A.Assm_nama_instrumen,
        A.QA_ID
    `;

    const results = await sequelizeMSQL.query(query, {
      replacements,
      type: Sequelize.QueryTypes.SELECT,
    });

    const overdue = results.filter((r) => r.Condition_Status === 'Overdue');
    const compliant = results.filter((r) => r.Condition_Status === 'Compliant');
    const notReady = results.filter((r) => r.Is_Not_Ready === 1);

    return res.status(200).json({
      success: true,
      meta: {
        total: results.length,
        overdue_count: overdue.length,
        compliant_count: compliant.length,
        not_ready_count: notReady.length,
        is_vn: isVN,
        dept: bagian_user,
      },
      data: results,
    });
  } catch (error) {
    console.error('Error in getUnitConditions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching unit conditions',
      error: error.message,
    });
  }
};

module.exports = {
  getUnitConditions,
};
