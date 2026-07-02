'use strict';

const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');

const getUnitConditions = async (req, res, next) => {
  try {
    const rows = await sequelizeMSQL.query(
      `
        WITH InstrumentRows AS (
          SELECT
            QA_ID,
            Assm_nama_instrumen,
            Assm_No_identitas_Istrumen,
            Assm_No_identitas_kalibrasi,
            Group_Da_Dept,
            Assm_Lokasi,
            Parameter_Kalibrasi,
            Tgl_kalibrasi,
            Kalibrasi_selanjutnya,
            CAST(ISNULL(Parameter_Interval, 0) AS INT) AS Parameter_Interval,
            CAST('Thermo' AS VARCHAR(50)) AS Source_Type
          FROM T_Kalibrasi_DA_Thermohygro

          UNION ALL

          SELECT
            QA_ID,
            Assm_nama_instrumen,
            Assm_No_identitas_Istrumen,
            Assm_No_identitas_kalibrasi,
            Group_Da_Dept,
            Assm_Lokasi,
            Parameter_Kalibrasi,
            Tgl_kalibrasi,
            Kalibrasi_selanjutnya,
            CAST(ISNULL(Parameter_Interval, 0) AS INT) AS Parameter_Interval,
            CAST('Anak Timbang' AS VARCHAR(50)) AS Source_Type
          FROM T_Kalibrasi_DA_Anak_Timbangan

          UNION ALL

          SELECT
            QA_ID,
            Assm_nama_instrumen,
            Assm_No_identitas_Istrumen,
            Assm_No_identitas_kalibrasi,
            Group_Da_Dept,
            Assm_Lokasi,
            Parameter_Kalibrasi,
            Tgl_kalibrasi,
            Kalibrasi_selanjutnya,
            CAST(ISNULL([Interval], 0) AS INT) AS Parameter_Interval,
            CAST('Timbangan' AS VARCHAR(50)) AS Source_Type
          FROM T_Kalibrasi_DA_Timbangan

          UNION ALL

          SELECT
            QA_ID,
            Assm_nama_instrumen,
            Assm_No_identitas_Istrumen,
            Assm_No_identitas_kalibrasi,
            Group_Da_Dept,
            Assm_Lokasi,
            Parameter_Kalibrasi,
            Tgl_kalibrasi,
            Kalibrasi_selanjutnya,
            CAST(ISNULL(Parameter_Interval, 0) AS INT) AS Parameter_Interval,
            CAST('Bagian' AS VARCHAR(50)) AS Source_Type
          FROM T_Kalibrasi_DA_Bagian
        ),
        LatestRows AS (
          SELECT
            *,
            ROW_NUMBER() OVER (
              PARTITION BY QA_ID, Assm_No_identitas_Istrumen, Source_Type
              ORDER BY
                ISNULL(Kalibrasi_selanjutnya, '19000101') DESC,
                ISNULL(Tgl_kalibrasi, '19000101') DESC
            ) AS Row_No
          FROM InstrumentRows
        )
        SELECT
          QA_ID,
          Assm_nama_instrumen,
          Assm_No_identitas_Istrumen,
          Assm_No_identitas_kalibrasi,
          Group_Da_Dept,
          Assm_Lokasi,
          Parameter_Kalibrasi,
          Tgl_kalibrasi,
          Kalibrasi_selanjutnya,
          Parameter_Interval,
          Source_Type,
          CASE
            WHEN ISNULL(Parameter_Interval, 0) = 0 THEN 1
            ELSE 0
          END AS Is_Not_Ready,
          CASE
            WHEN ISNULL(Parameter_Interval, 0) = 0 THEN 'Compliant'
            WHEN Kalibrasi_selanjutnya IS NULL THEN 'Overdue'
            WHEN CONVERT(DATE, Kalibrasi_selanjutnya) < CONVERT(DATE, GETDATE()) THEN 'Overdue'
            ELSE 'Compliant'
          END AS Condition_Status
        FROM LatestRows
        WHERE Row_No = 1
        ORDER BY
          CASE
            WHEN ISNULL(Parameter_Interval, 0) = 0 THEN 0
            WHEN Kalibrasi_selanjutnya IS NULL THEN 1
            WHEN CONVERT(DATE, Kalibrasi_selanjutnya) < CONVERT(DATE, GETDATE()) THEN 1
            ELSE 2
          END,
          Kalibrasi_selanjutnya,
          QA_ID
      `,
      {
        type: Sequelize.QueryTypes.SELECT,
      }
    );

    return res.status(200).json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error('Error in getUnitConditions:', error);
    next(error);
  }
};

module.exports = {
  getUnitConditions,
};
