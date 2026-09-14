'use strict';

const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');

/**
 * CMS Dashboard — Kondisi Unit Overdue / Compliant
 *
 * Aturan:
 *   Overdue   : Tgl_kalibrasi IS NULL dan tidak sedang ditandai Tidak Siap / OOC.
 *   Compliant : selain Overdue.
 *   Not Ready : unit tidak bisa dikalibrasi sama sekali (is_tidak_dapat = 1,
 *               diisi manual FA lewat controller tidak-dapat-internal).
 *   OOC       : unit sudah dikalibrasi tapi hasilnya gagal/di luar toleransi
 *               (is_ooc = 1, di-set otomatis saat approval Manager / sertifikat
 *               publish dari evaluation_result = 'Tidak layak digunakan').
 *               Scope: Bagian + Timbangan + Thermohygro.
 *   Not Ready dan OOC adalah dua kondisi terpisah dan bisa saling lepas —
 *   lihat catatan Process/2026-07-14-arsitektur-penyimpanan-ooc-tidak-siap.md.
 *
 * Hak akses:
 *   - Departemen VN : super user, lihat semua unit.
 *   - Lainnya       : hanya unit dengan Group_Da_Dept = dept user;
 *                     unit yang sedang Not Ready atau OOC tetap ditampilkan
 *                     meski DA-nya belum di-approve manager VN.
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

    const notReadyWhere = `
      EXISTS (
        SELECT 1
        FROM T_Kalibrasi_Sertifikat_Bagian s
        WHERE s.QA_ID = A.QA_ID AND s.is_tidak_dapat = 1
      )
      OR EXISTS (
        SELECT 1
        FROM T_Kalibrasi_Sertifikat_Thermohygro s
        WHERE s.QA_ID = A.QA_ID AND s.is_tidak_dapat = 1
      )
      OR EXISTS (
        SELECT 1
        FROM T_Kalibrasi_Sertifikat_Timbangan s
        WHERE s.QA_ID = A.QA_ID AND s.is_tidak_dapat = 1
      )
    `;

    const oocWhere = `
      EXISTS (
        SELECT 1
        FROM T_Kalibrasi_Sertifikat_Bagian s
        WHERE s.QA_ID = A.QA_ID AND s.is_ooc = 1
      )
      OR EXISTS (
        SELECT 1
        FROM T_Kalibrasi_Sertifikat_Timbangan s
        WHERE s.QA_ID = A.QA_ID AND s.is_ooc = 1
      )
      OR EXISTS (
        SELECT 1
        FROM T_Kalibrasi_Sertifikat_Thermohygro s
        WHERE s.QA_ID = A.QA_ID AND s.is_ooc = 1
      )
    `;

    const accessWhere = isVN
      ? '1 = 1'
      : `A.Group_Da_Dept = :dept
        AND (
          ${vnApprovalWhere}
          OR ${notReadyWhere}
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
                 WHERE s.QA_ID = A.QA_ID AND (s.is_tidak_dapat = 1 OR s.is_ooc = 1)
               )
               AND NOT EXISTS (
                 SELECT 1
                 FROM T_Kalibrasi_Sertifikat_Thermohygro s
                 WHERE s.QA_ID = A.QA_ID AND s.is_tidak_dapat = 1
               )
               AND NOT EXISTS (
                 SELECT 1
                 FROM T_Kalibrasi_Sertifikat_Timbangan s
                 WHERE s.QA_ID = A.QA_ID AND (s.is_tidak_dapat = 1 OR s.is_ooc = 1)
               )
            THEN 'Overdue'
          ELSE 'Compliant'
        END AS Condition_Status,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Bagian s
            WHERE s.QA_ID = A.QA_ID AND s.is_tidak_dapat = 1
          )
          OR EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Thermohygro s
            WHERE s.QA_ID = A.QA_ID AND s.is_tidak_dapat = 1
          )
          OR EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Timbangan s
            WHERE s.QA_ID = A.QA_ID AND s.is_tidak_dapat = 1
          )
            THEN 1
          ELSE 0
        END AS Is_Not_Ready,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Bagian s
            WHERE s.QA_ID = A.QA_ID AND s.is_tidak_dapat = 1
          )
            THEN 'Bagian'
          WHEN EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Thermohygro s
            WHERE s.QA_ID = A.QA_ID AND s.is_tidak_dapat = 1
          )
            THEN 'Thermohygro'
          WHEN EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Timbangan s
            WHERE s.QA_ID = A.QA_ID AND s.is_tidak_dapat = 1
          )
            THEN 'Timbangan'
          ELSE NULL
        END AS Not_Ready_Source,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Bagian s
            WHERE s.QA_ID = A.QA_ID AND s.is_ooc = 1
          )
          OR EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Timbangan s
            WHERE s.QA_ID = A.QA_ID AND s.is_ooc = 1
          )
          OR EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Thermohygro s
            WHERE s.QA_ID = A.QA_ID AND s.is_ooc = 1
          )
            THEN 1
          ELSE 0
        END AS Is_OOC,
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Bagian s
            WHERE s.QA_ID = A.QA_ID AND s.is_ooc = 1
          )
            THEN 'Bagian'
          WHEN EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Timbangan s
            WHERE s.QA_ID = A.QA_ID AND s.is_ooc = 1
          )
            THEN 'Timbangan'
          WHEN EXISTS (
            SELECT 1
            FROM T_Kalibrasi_Sertifikat_Thermohygro s
            WHERE s.QA_ID = A.QA_ID AND s.is_ooc = 1
          )
            THEN 'Thermohygro'
          ELSE NULL
        END AS OOC_Source
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
    const ooc = results.filter((r) => r.Is_OOC === 1);

    return res.status(200).json({
      success: true,
      meta: {
        total: results.length,
        overdue_count: overdue.length,
        compliant_count: compliant.length,
        not_ready_count: notReady.length,
        ooc_count: ooc.length,
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

/**
 * CMS Dashboard — Ringkasan Bulanan (basis MAP Plan)
 *
 * GET /cms/dashboard/monthly-summary?year=2026&month=09[&include_anak_timbang=0]
 *   month = 01..12 atau ALL (dijumlah per bulan untuk tahun tsb).
 *
 * Aturan (per periode bulan, otomatis "reset" ke 0 tiap bulan baru karena
 * semua bukti status harus jatuh di dalam bulan periode baris tsb):
 *   Total Instruments = count preview MAP Internal (view=plan)
 *                     + count preview MAP External (view=plan)
 *                     — sumber & resolusi identik dengan endpoint
 *                       /master/jadwal-bulanan(-external)/preview.
 *   Tidak Siap  : Internal -> sertifikat is_tidak_dapat = 1, tanggal_label_OOC di bulan periode
 *                 External -> T_Kalibrasi_Eksternal.is_tidak_dapat = 1 pada detail MAP periode tsb
 *   OOC         : Internal -> sertifikat is_ooc = 1 ('Tidak layak digunakan'),
 *                             tanggal_ooc (fallback Tgl_kalibrasi) di bulan periode
 *                 External -> hasil_kalibrasi = 'tidak memenuhi syarat' pada detail MAP periode tsb
 *   Terkalibrasi: Internal -> sertifikat Tgl_kalibrasi di bulan periode + DA sudah digenerate
 *                             (status Approver_No = 2), bukan tidak dapat
 *                 External -> status APPROVED / LABEL_TEMPEL pada detail MAP periode tsb
 *   Prioritas (satu baris hanya masuk satu kategori): Tidak Siap > OOC > Terkalibrasi.
 *   Overdue belum diubah (masih dari logika lama di FE).
 *
 * Hak akses: non-VN hanya melihat baris dengan group_da_dept = dept user.
 */
const SERTIFIKAT_TABLES = [
  { table: 'T_Kalibrasi_Sertifikat_Bagian', statusTable: 'T_Kalibrasi_Sertifikat_Bagian_Status' },
  { table: 'T_Kalibrasi_Sertifikat_Timbangan', statusTable: 'T_Kalibrasi_Sertifikat_Timbangan_Status' },
  { table: 'T_Kalibrasi_Sertifikat_Thermohygro', statusTable: 'T_Kalibrasi_Sertifikat_Thermohygro_Status' },
];

const pad2 = (value) => String(value).padStart(2, '0');
const toPeriodKey = (year, month) => `${year}-${pad2(month)}`;
const normalizeQaId = (value) => String(value || '').trim().toUpperCase();

const getPeriodRange = (year, month) => {
  const start = `${year}-${pad2(month)}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${pad2(month)}-${pad2(lastDay)}`;
  return { start, end };
};

const toISODate = (value) => {
  if (!value) return null;
  // Event_Date sudah dikonversi ke 'YYYY-MM-DD' di SQL (hindari geser zona waktu tedious).
  if (typeof value === 'string') return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const getStatusBucket = (map, periodKey, qaId) => {
  const key = `${periodKey}|${qaId}`;
  if (!map.has(key)) {
    map.set(key, { calibrated: false, ooc: false, notReady: false });
  }
  return map.get(key);
};

// Ambil semua bukti status (internal + external) untuk rentang tanggal lalu
// kelompokkan per "YYYY-MM|QA_ID".
const getMonthlyStatusMap = async (rangeStart, rangeEnd, periodKeys) => {
  const internalUnions = SERTIFIKAT_TABLES.map(
    ({ table, statusTable }) => `
      SELECT CAST(S.QA_ID AS NVARCHAR(100)) AS QA_ID, 'CALIBRATED' AS Event_Type, CONVERT(VARCHAR(10), S.Tgl_kalibrasi, 120) AS Event_Date
      FROM ${table} S
      WHERE S.Tgl_kalibrasi IS NOT NULL
        AND ISNULL(S.is_tidak_dapat, 0) = 0
        AND CONVERT(DATE, S.Tgl_kalibrasi) BETWEEN :rangeStart AND :rangeEnd
        AND EXISTS (
          SELECT 1 FROM ${statusTable} ST
          WHERE ST.QA_ID = S.QA_ID
            AND ST.ID_No_Sertifikat = S.ID_No_Sertifikat
            AND ST.Approver_No = 2
        )

      UNION ALL

      SELECT CAST(S.QA_ID AS NVARCHAR(100)), 'OOC', CONVERT(VARCHAR(10), ISNULL(S.tanggal_ooc, S.Tgl_kalibrasi), 120)
      FROM ${table} S
      WHERE ISNULL(S.is_ooc, 0) = 1
        AND ISNULL(S.tanggal_ooc, S.Tgl_kalibrasi) IS NOT NULL
        AND CONVERT(DATE, ISNULL(S.tanggal_ooc, S.Tgl_kalibrasi)) BETWEEN :rangeStart AND :rangeEnd

      UNION ALL

      SELECT CAST(S.QA_ID AS NVARCHAR(100)), 'NOT_READY', CONVERT(VARCHAR(10), S.tanggal_label_OOC, 120)
      FROM ${table} S
      WHERE ISNULL(S.is_tidak_dapat, 0) = 1
        AND S.tanggal_label_OOC IS NOT NULL
        AND CONVERT(DATE, S.tanggal_label_OOC) BETWEEN :rangeStart AND :rangeEnd
    `
  ).join('\n      UNION ALL\n');

  const internalEvents = await sequelizeMSQL.query(internalUnions, {
    replacements: { rangeStart, rangeEnd },
    type: Sequelize.QueryTypes.SELECT,
  });

  // External: record eksekusi vendor menempel ke detail MAP External per periode.
  const periodConditions = periodKeys
    .map((_, idx) => `(D.Schedule_Period_Year = :y${idx} AND D.Schedule_Period_Month = :m${idx})`)
    .join(' OR ');
  const periodReplacements = {};
  periodKeys.forEach((key, idx) => {
    const [y, m] = key.split('-');
    periodReplacements[`y${idx}`] = y;
    periodReplacements[`m${idx}`] = m;
  });

  const externalEvents = periodKeys.length
    ? await sequelizeMSQL.query(
        `
          SELECT
            CAST(D.QA_ID AS NVARCHAR(100)) AS QA_ID,
            D.Schedule_Period_Year,
            D.Schedule_Period_Month,
            MAX(CASE WHEN ISNULL(E.is_tidak_dapat, 0) = 1 THEN 1 ELSE 0 END) AS Is_Not_Ready,
            MAX(CASE WHEN E.hasil_kalibrasi = 'tidak memenuhi syarat'
                      AND E.status <> 'REJECTED' THEN 1 ELSE 0 END) AS Is_OOC,
            MAX(CASE WHEN E.status IN ('APPROVED', 'LABEL_TEMPEL')
                      AND ISNULL(E.is_tidak_dapat, 0) = 0 THEN 1 ELSE 0 END) AS Is_Calibrated
          FROM T_Monthly_Schedule_External_Detail D
          INNER JOIN T_Kalibrasi_Eksternal E
            ON E.schedule_detail_id = D.Schedule_External_Detail_ID
          WHERE ${periodConditions}
          GROUP BY D.QA_ID, D.Schedule_Period_Year, D.Schedule_Period_Month
        `,
        {
          replacements: periodReplacements,
          type: Sequelize.QueryTypes.SELECT,
        }
      )
    : [];

  const map = new Map();

  internalEvents.forEach((event) => {
    const iso = toISODate(event.Event_Date);
    const qaId = normalizeQaId(event.QA_ID);
    if (!iso || !qaId) return;
    const bucket = getStatusBucket(map, iso.slice(0, 7), qaId);
    if (event.Event_Type === 'CALIBRATED') bucket.calibrated = true;
    if (event.Event_Type === 'OOC') bucket.ooc = true;
    if (event.Event_Type === 'NOT_READY') bucket.notReady = true;
  });

  externalEvents.forEach((event) => {
    const qaId = normalizeQaId(event.QA_ID);
    if (!qaId) return;
    const periodKey = toPeriodKey(event.Schedule_Period_Year, event.Schedule_Period_Month);
    const bucket = getStatusBucket(map, periodKey, qaId);
    if (Number(event.Is_Calibrated) === 1) bucket.calibrated = true;
    if (Number(event.Is_OOC) === 1) bucket.ooc = true;
    if (Number(event.Is_Not_Ready) === 1) bucket.notReady = true;
  });

  return map;
};

const resolveRowStatus = (flags) => {
  if (flags?.notReady) return 'Tidak Siap';
  if (flags?.ooc) return 'OOC';
  if (flags?.calibrated) return 'Terkalibrasi';
  return 'Belum Terkalibrasi';
};

const getMonthlySummary = async (req, res, next) => {
  try {
    // Lazy require supaya tidak ada siklus require saat boot router.
    const {
      resolveMonthlySchedulePreviewPayload,
      resolveExternalMonthlySchedulePreviewPayload,
    } = require('../transactions/master-jadwal-bulanan.controller');

    const { bagian_user } = req.user || {};
    const isVN = bagian_user === 'VN';
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const rawMonth = String(req.query.month || now.getMonth() + 1).toUpperCase();
    const includeAnakTimbang = ['1', 'true', 'yes'].includes(
      String(req.query.include_anak_timbang || '0').toLowerCase()
    );

    if (year < 2000 || year > 2100) {
      return res.status(400).json({ success: false, message: 'Tahun tidak valid' });
    }

    let months;
    if (rawMonth === 'ALL') {
      months = Array.from({ length: 12 }, (_, i) => i + 1);
    } else {
      const month = Number(rawMonth);
      if (!Number.isInteger(month) || month < 1 || month > 12) {
        return res.status(400).json({ success: false, message: 'Bulan tidak valid' });
      }
      months = [month];
    }

    const periodResults = [];
    for (const month of months) {
      const [internalPayload, externalPayload] = await Promise.all([
        resolveMonthlySchedulePreviewPayload(year, month, {
          view: 'plan',
          includeAnakTimbang,
        }),
        resolveExternalMonthlySchedulePreviewPayload(year, month, { view: 'plan' }).catch(
          (error) => {
            // Preview external melempar error.status (mis. 404) -> anggap kosong.
            if (error?.status) return { rows: [], count: 0 };
            throw error;
          }
        ),
      ]);
      periodResults.push({ year, month, internalPayload, externalPayload });
    }

    const rows = [];
    periodResults.forEach(({ year: pYear, month: pMonth, internalPayload, externalPayload }) => {
      const selectedKey = toPeriodKey(pYear, pMonth);

      (internalPayload?.rows || []).forEach((row) => {
        rows.push({
          ...row,
          calibration_type: 'Internal',
          period_key: selectedKey,
          due_date: row.plan_due_date || null,
        });
      });

      (externalPayload?.rows || []).forEach((row) => {
        // Preview external juga membawa baris bulan BERIKUTNYA (_period_key).
        // Halaman MAP External memisahkannya jadi dua seksi; yang dihitung untuk
        // bulan ini hanya seksi bulan terpilih.
        if (row._period_key && row._period_key !== selectedKey) return;
        rows.push({
          ...row,
          calibration_type: 'External',
          period_key: selectedKey,
          due_date: row.due_date || row.jatuh_tempo || null,
        });
      });
    });

    const periodKeys = Array.from(new Set(rows.map((row) => row.period_key))).sort();
    let statusMap = new Map();
    if (periodKeys.length) {
      const firstKey = periodKeys[0].split('-').map(Number);
      const lastKey = periodKeys[periodKeys.length - 1].split('-').map(Number);
      statusMap = await getMonthlyStatusMap(
        getPeriodRange(firstKey[0], firstKey[1]).start,
        getPeriodRange(lastKey[0], lastKey[1]).end,
        periodKeys
      );
    }

    const decoratedRows = rows
      .filter((row) =>
        isVN
          ? true
          : String(row.group_da_dept || '').trim().toUpperCase() ===
            String(bagian_user || '').trim().toUpperCase()
      )
      .map((row) => {
        const flags = statusMap.get(`${row.period_key}|${normalizeQaId(row.qa_id)}`) || null;
        const dashboardStatus = resolveRowStatus(flags);
        return {
          ...row,
          dashboard_status: dashboardStatus,
          is_not_ready: dashboardStatus === 'Tidak Siap' ? 1 : 0,
          is_ooc: dashboardStatus === 'OOC' ? 1 : 0,
          is_terkalibrasi: dashboardStatus === 'Terkalibrasi' ? 1 : 0,
        };
      });

    const internalCount = decoratedRows.filter((r) => r.calibration_type === 'Internal').length;
    const externalCount = decoratedRows.filter((r) => r.calibration_type === 'External').length;

    return res.status(200).json({
      success: true,
      meta: {
        year,
        month: rawMonth === 'ALL' ? 'ALL' : pad2(months[0]),
        total: decoratedRows.length,
        internal_count: internalCount,
        external_count: externalCount,
        terkalibrasi_count: decoratedRows.filter((r) => r.is_terkalibrasi).length,
        ooc_count: decoratedRows.filter((r) => r.is_ooc).length,
        not_ready_count: decoratedRows.filter((r) => r.is_not_ready).length,
        is_vn: isVN,
        dept: bagian_user,
      },
      data: decoratedRows,
    });
  } catch (error) {
    console.error('Error in getMonthlySummary:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching monthly dashboard summary',
      error: error.message,
    });
  }
};

module.exports = {
  getUnitConditions,
  getMonthlySummary,
};
