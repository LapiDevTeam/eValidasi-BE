'use strict';

const ExcelJS = require('exceljs');
const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');

const MONTH_HEADERS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PREVIEW_SOURCES = ['live', 'requested', 'snapshot', 'scan', 'previous'];
const AWP_WORKFLOW_VIEWS = {
  START: 'start',
  END: 'end',
};

const parseYear = (year) => {
  const selectedYear = Number(year);
  if (!Number.isInteger(selectedYear) || selectedYear < 1900 || selectedYear > 3000) {
    return null;
  }
  return selectedYear;
};

const parseWorkflowView = (value, fallback = AWP_WORKFLOW_VIEWS.START) => {
  if (value === AWP_WORKFLOW_VIEWS.START) return AWP_WORKFLOW_VIEWS.START;
  if (value === AWP_WORKFLOW_VIEWS.END) return AWP_WORKFLOW_VIEWS.END;
  return fallback;
};

const getCertificateYearPattern = (selectedYear) =>
  `%.${String(selectedYear).slice(-2)}`;

const getUserJobLevel = (user = {}) =>
  Number(
    user?.delegatedTo?.Job_LevelID ??
      user?.delegatedTo?.emp_JobLevelID ??
      user?.delegatedTo?.joblevel_id_user ??
      user?.user?.Job_LevelID ??
      user?.user?.emp_JobLevelID ??
      user?.user?.joblevel_id_user ??
      user?.Job_LevelID ??
      user?.emp_JobLevelID ??
      user?.joblevel_id_user ??
      user?.jabatan_user ??
      0
  );

const getUserDepartment = (user = {}) =>
  String(
    user?.delegatedTo?.emp_DeptID ??
      user?.delegatedTo?.DeptID ??
      user?.delegatedTo?.bagian_user ??
      user?.user?.emp_DeptID ??
      user?.user?.DeptID ??
      user?.user?.bagian_user ??
      user?.emp_DeptID ??
      user?.DeptID ??
      user?.bagian_user ??
      ''
  )
    .trim()
    .toUpperCase();

const canApproveOrRejectAWP = (user = {}) =>
  getUserJobLevel(user) === 3 && getUserDepartment(user) === 'VN';

const getRKTDataByYear = async (selectedYear) => {
  const query = `
    SELECT
      QA_ID,
      Assm_nama_instrumen,
      Assm_No_identitas_Istrumen,
      Group_Da_Dept,
      Assm_Lokasi,
      MAX(Tgl_kalibrasi) AS Tgl_kalibrasi,
      MAX(Kalibrasi_selanjutnya) AS Kalibrasi_selanjutnya
    FROM (
      SELECT DISTINCT
        QA_ID,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        ISNULL(Jenis_Kalibrasi, 1) AS Jenis_Kalibrasi,
        Tgl_kalibrasi,
        Kalibrasi_selanjutnya
      FROM T_Kalibrasi_DA_Thermohygro
      WHERE CAST(ISNULL(Parameter_Interval, 0) AS INT) > 0

      UNION ALL

      SELECT DISTINCT
        QA_ID,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        ISNULL(Jenis_Kalibrasi, 1) AS Jenis_Kalibrasi,
        Tgl_kalibrasi,
        Kalibrasi_selanjutnya
      FROM T_Kalibrasi_DA_Anak_Timbangan
      WHERE CAST(ISNULL(Parameter_Interval, 0) AS INT) > 0

      UNION ALL

      SELECT DISTINCT
        QA_ID,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        ISNULL(Jenis_Kalibrasi, 1) AS Jenis_Kalibrasi,
        Tgl_kalibrasi,
        Kalibrasi_selanjutnya
      FROM T_Kalibrasi_DA_Timbangan
      WHERE CAST(ISNULL([Interval], 0) AS INT) > 0

      UNION ALL

      SELECT DISTINCT
        QA_ID,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        ISNULL(Jenis_Kalibrasi, 1) AS Jenis_Kalibrasi,
        Tgl_kalibrasi,
        Kalibrasi_selanjutnya
      FROM T_Kalibrasi_DA_Bagian
      WHERE CAST(ISNULL(Parameter_Interval, 0) AS INT) > 0

      UNION ALL

      SELECT DISTINCT
        QA_ID,
        InstrumentName AS Assm_nama_instrumen,
        InstrumentCode AS Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Location AS Assm_Lokasi,
        CAST(1 AS INT) AS Jenis_Kalibrasi,
        NULL AS Tgl_kalibrasi,
        NULL AS Kalibrasi_selanjutnya
      FROM RA_CalibrationAssessment
      WHERE IsDeleted = 0
    ) AS A
    GROUP BY
      QA_ID,
      Assm_nama_instrumen,
      Assm_No_identitas_Istrumen,
      Group_Da_Dept,
      Assm_Lokasi
    HAVING
      MAX(Kalibrasi_selanjutnya) IS NOT NULL
      AND YEAR(MAX(Kalibrasi_selanjutnya)) = :year
    ORDER BY
      MONTH(MAX(Kalibrasi_selanjutnya)),
      DAY(MAX(Kalibrasi_selanjutnya)),
      Assm_nama_instrumen
  `;

  return sequelizeMSQL.query(query, {
    replacements: { year: selectedYear },
    type: Sequelize.QueryTypes.SELECT,
  });
};

const getRKTDoubleChecklistDataByYear = async (selectedYear, transaction = null) => {
  const query = `
    SELECT
      QA_ID,
      MAX(Assm_nama_instrumen) AS Assm_nama_instrumen,
      MAX(Assm_No_identitas_Istrumen) AS Assm_No_identitas_Istrumen,
      MAX(Group_Da_Dept) AS Group_Da_Dept,
      MAX(Assm_Lokasi) AS Assm_Lokasi,
      MAX(Tgl_kalibrasi) AS Tgl_kalibrasi,
      MAX(Kalibrasi_selanjutnya) AS Kalibrasi_selanjutnya,
      MAX(Parameter_Interval) AS Parameter_Interval,
      MAX(Source_Table) AS Source_Table,
      MAX(Source_Key) AS Source_Key
    FROM (
      SELECT DISTINCT
        QA_ID,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        ISNULL(Jenis_Kalibrasi, 1) AS Jenis_Kalibrasi,
        Tgl_kalibrasi,
        Kalibrasi_selanjutnya,
        CAST(ISNULL(Parameter_Interval, 0) AS INT) AS Parameter_Interval,
        CAST('T_Kalibrasi_DA_Thermohygro' AS VARCHAR(128)) AS Source_Table,
        CAST(QA_ID AS VARCHAR(100)) AS Source_Key
      FROM T_Kalibrasi_DA_Thermohygro
      WHERE CAST(ISNULL(Parameter_Interval, 0) AS INT) > 0

      UNION ALL

      SELECT DISTINCT
        QA_ID,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        ISNULL(Jenis_Kalibrasi, 1) AS Jenis_Kalibrasi,
        Tgl_kalibrasi,
        Kalibrasi_selanjutnya,
        CAST(ISNULL(Parameter_Interval, 0) AS INT) AS Parameter_Interval,
        CAST('T_Kalibrasi_DA_Anak_Timbangan' AS VARCHAR(128)) AS Source_Table,
        CAST(QA_ID AS VARCHAR(100)) AS Source_Key
      FROM T_Kalibrasi_DA_Anak_Timbangan
      WHERE CAST(ISNULL(Parameter_Interval, 0) AS INT) > 0

      UNION ALL

      SELECT DISTINCT
        QA_ID,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        ISNULL(Jenis_Kalibrasi, 1) AS Jenis_Kalibrasi,
        Tgl_kalibrasi,
        Kalibrasi_selanjutnya,
        CAST(ISNULL([Interval], 0) AS INT) AS Parameter_Interval,
        CAST('T_Kalibrasi_DA_Timbangan' AS VARCHAR(128)) AS Source_Table,
        CAST(QA_ID AS VARCHAR(100)) AS Source_Key
      FROM T_Kalibrasi_DA_Timbangan
      WHERE CAST(ISNULL([Interval], 0) AS INT) > 0

      UNION ALL

      SELECT DISTINCT
        QA_ID,
        Assm_nama_instrumen,
        Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Assm_Lokasi,
        ISNULL(Jenis_Kalibrasi, 1) AS Jenis_Kalibrasi,
        Tgl_kalibrasi,
        Kalibrasi_selanjutnya,
        CAST(ISNULL(Parameter_Interval, 0) AS INT) AS Parameter_Interval,
        CAST('T_Kalibrasi_DA_Bagian' AS VARCHAR(128)) AS Source_Table,
        CAST(QA_ID AS VARCHAR(100)) AS Source_Key
      FROM T_Kalibrasi_DA_Bagian
      WHERE CAST(ISNULL(Parameter_Interval, 0) AS INT) > 0

      UNION ALL

      SELECT DISTINCT
        QA_ID,
        InstrumentName AS Assm_nama_instrumen,
        InstrumentCode AS Assm_No_identitas_Istrumen,
        Assm_No_identitas_kalibrasi,
        Group_Da_Dept,
        Assm_Kapasitas,
        Parameter_Kalibrasi,
        Location AS Assm_Lokasi,
        CAST(1 AS INT) AS Jenis_Kalibrasi,
        NULL AS Tgl_kalibrasi,
        NULL AS Kalibrasi_selanjutnya,
        CAST(0 AS INT) AS Parameter_Interval,
        CAST('RA_CalibrationAssessment' AS VARCHAR(128)) AS Source_Table,
        CAST(QA_ID AS VARCHAR(100)) AS Source_Key
      FROM RA_CalibrationAssessment
      WHERE IsDeleted = 0
    ) AS A
    GROUP BY
      QA_ID
    HAVING
      MAX(Kalibrasi_selanjutnya) IS NOT NULL
      AND YEAR(MAX(Kalibrasi_selanjutnya)) = :year
    ORDER BY
      MAX(Kalibrasi_selanjutnya),
      MAX(Assm_nama_instrumen)
  `;

  return sequelizeMSQL.query(query, {
    replacements: { year: selectedYear },
    type: Sequelize.QueryTypes.SELECT,
    transaction,
  });
};

const getRKTRealizationDataByYear = async (selectedYear, transaction = null) => {
  const certificateYearPattern = getCertificateYearPattern(selectedYear);
  const query = `
    WITH CertificateRows AS (
      SELECT
        A.QA_ID,
        A.ID_No_Sertifikat,
        A.No_Sertifikat,
        A.tgl AS Certificate_Date,
        A.Tgl_kalibrasi AS Calibration_Date,
        A.is_tidak_dapat,
        A.tanggal_label_OOC
      FROM T_Kalibrasi_Sertifikat_Thermohygro AS A

      UNION ALL

      SELECT
        A.QA_ID,
        A.ID_No_Sertifikat,
        A.No_Sertifikat,
        A.tgl AS Certificate_Date,
        A.Tgl_kalibrasi AS Calibration_Date,
        A.is_tidak_dapat,
        A.tanggal_label_OOC
      FROM T_Kalibrasi_Sertifikat_Bagian AS A

      UNION ALL

      SELECT
        A.QA_ID,
        A.ID_No_Sertifikat,
        A.No_Sertifikat,
        A.tgl AS Certificate_Date,
        A.Tgl_kalibrasi AS Calibration_Date,
        A.is_tidak_dapat,
        A.tanggal_label_OOC
      FROM T_Kalibrasi_Sertifikat_Timbangan AS A
    ),
    PeriodCertificateRows AS (
      SELECT *
      FROM CertificateRows
      WHERE
        (Certificate_Date IS NOT NULL AND YEAR(Certificate_Date) = :year)
        OR (Calibration_Date IS NOT NULL AND YEAR(Calibration_Date) = :year)
        OR ISNULL(ID_No_Sertifikat, '') LIKE :certificateYearPattern
        OR ISNULL(No_Sertifikat, '') LIKE :certificateYearPattern
    )
    SELECT
      QA_ID,
      Real_Date,
      Is_OOC
    FROM (
      SELECT DISTINCT QA_ID, Tgl_kalibrasi AS Real_Date, CAST(0 AS BIT) AS Is_OOC
      FROM T_Kalibrasi_DA_Thermohygro
      WHERE Tgl_kalibrasi IS NOT NULL

      UNION ALL

      SELECT DISTINCT QA_ID, Tgl_kalibrasi AS Real_Date, CAST(0 AS BIT) AS Is_OOC
      FROM T_Kalibrasi_DA_Anak_Timbangan
      WHERE Tgl_kalibrasi IS NOT NULL

      UNION ALL

      SELECT DISTINCT QA_ID, Tgl_kalibrasi AS Real_Date, CAST(0 AS BIT) AS Is_OOC
      FROM T_Kalibrasi_DA_Timbangan
      WHERE Tgl_kalibrasi IS NOT NULL

      UNION ALL

      SELECT DISTINCT QA_ID, Tgl_kalibrasi AS Real_Date, CAST(0 AS BIT) AS Is_OOC
      FROM T_Kalibrasi_DA_Bagian
      WHERE Tgl_kalibrasi IS NOT NULL

      UNION ALL

      SELECT DISTINCT QA_ID, Real_Date, CAST(0 AS BIT) AS Is_OOC
      FROM T_AWP_Realization_History
      WHERE Real_Date IS NOT NULL

      UNION ALL

      SELECT DISTINCT QA_ID, Calibration_Date AS Real_Date, CAST(0 AS BIT) AS Is_OOC
      FROM PeriodCertificateRows
      WHERE Calibration_Date IS NOT NULL

      UNION ALL

      SELECT DISTINCT QA_ID, tanggal_label_OOC AS Real_Date, CAST(1 AS BIT) AS Is_OOC
      FROM PeriodCertificateRows
      WHERE ISNULL(is_tidak_dapat, 0) = 1
        AND tanggal_label_OOC IS NOT NULL
    ) AS A
    WHERE Real_Date IS NOT NULL
      AND YEAR(Real_Date) = :year
    ORDER BY QA_ID, Real_Date
  `;

  return sequelizeMSQL.query(query, {
    replacements: { year: selectedYear, certificateYearPattern },
    type: Sequelize.QueryTypes.SELECT,
    transaction,
  });
};

const toValidDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDateYear = (value) => {
  const date = toValidDate(value);
  return date ? date.getFullYear() : null;
};

const getDateMonth = (value) => {
  const date = toValidDate(value);
  return date ? date.getMonth() + 1 : null;
};

const shiftDateByMonths = (value, monthOffset) => {
  const date = toValidDate(value);
  if (!date || !Number.isFinite(monthOffset)) return null;

  const shiftedDate = new Date(date);
  const originalDay = shiftedDate.getDate();
  shiftedDate.setDate(1);
  shiftedDate.setMonth(shiftedDate.getMonth() + monthOffset);

  const lastDayOfTargetMonth = new Date(
    shiftedDate.getFullYear(),
    shiftedDate.getMonth() + 1,
    0
  ).getDate();
  shiftedDate.setDate(Math.min(originalDay, lastDayOfTargetMonth));

  return shiftedDate;
};

const formatDateKey = (value) => {
  const date = toValidDate(value);
  if (!date) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createMonthFlags = () =>
  MONTH_HEADERS.reduce((acc, _, monthIndex) => {
    acc[monthIndex + 1] = false;
    return acc;
  }, {});

const createChecklistDatesFromDueDate = (dueDateValue, intervalValue, selectedYear) => {
  const dueDate = toValidDate(dueDateValue);
  if (!dueDate || getDateYear(dueDate) !== selectedYear) return [];

  const interval = Number(intervalValue);
  if (!Number.isFinite(interval) || interval <= 0) {
    return [dueDate];
  }

  const datesByKey = new Map();
  const addDate = (value) => {
    const date = toValidDate(value);
    if (date && getDateYear(date) === selectedYear) {
      datesByKey.set(formatDateKey(date), date);
    }
  };

  addDate(dueDate);

  let backwardDate = dueDate;
  for (let index = 0; index < 12; index += 1) {
    backwardDate = shiftDateByMonths(backwardDate, -interval);
    if (!backwardDate || getDateYear(backwardDate) < selectedYear) break;
    addDate(backwardDate);
  }

  let forwardDate = dueDate;
  for (let index = 0; index < 12; index += 1) {
    forwardDate = shiftDateByMonths(forwardDate, interval);
    if (!forwardDate || getDateYear(forwardDate) > selectedYear) break;
    addDate(forwardDate);
  }

  return [...datesByKey.values()].sort((left, right) => left - right);
};

const createMonthFlagsFromDates = (dates = [], selectedYear) => {
  const months = createMonthFlags();

  dates.forEach((value) => {
    const date = toValidDate(value);
    const month = getDateYear(date) === selectedYear ? getDateMonth(date) : null;
    if (month >= 1 && month <= 12) {
      months[month] = true;
    }
  });

  return months;
};

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const stringifyDateArray = (dates = []) =>
  JSON.stringify(
    dates
      .map(formatDateKey)
      .filter(Boolean)
  );

const stringifyMonthFlags = (flags = {}) =>
  JSON.stringify(
    Object.keys(flags)
      .filter((month) => flags[month])
      .map((month) => Number(month))
      .filter((month) => month >= 1 && month <= 12)
      .sort((left, right) => left - right)
  );

const createMonthsFromJson = (value) => {
  const months = createMonthFlags();
  parseJsonArray(value).forEach((month) => {
    const monthNumber = Number(month);
    if (monthNumber >= 1 && monthNumber <= 12) {
      months[monthNumber] = true;
    }
  });
  return months;
};

const mapPreviewData = (results) =>
  results.map((item, index) => {
    const months = createMonthFlags();

    const kalibrasiDate = item.Kalibrasi_selanjutnya ? new Date(item.Kalibrasi_selanjutnya) : null;
    let month = null;
    if (kalibrasiDate && !Number.isNaN(kalibrasiDate.getTime())) {
      month = kalibrasiDate.getMonth() + 1;
      months[month] = true;
    }

    return {
      no: index + 1,
      qa_id: item.QA_ID || '',
      assm_nama_instrumen: item.Assm_nama_instrumen || '',
      assm_no_identitas_istrumen: item.Assm_No_identitas_Istrumen || '',
      group_da_dept: item.Group_Da_Dept || '',
      assm_lokasi: item.Assm_Lokasi || '',
      tgl_kalibrasi: item.Tgl_kalibrasi || null,
      kalibrasi_selanjutnya: item.Kalibrasi_selanjutnya || null,
      due_month: month,
      months,
    };
  });

const mapDoubleChecklistPreviewData = (results, selectedYear) =>
  results.map((item, index) => {
    const dueDate = toValidDate(item.Kalibrasi_selanjutnya);
    const interval = Number(item.Parameter_Interval ?? 0);
    const planDates = createChecklistDatesFromDueDate(dueDate, interval, selectedYear);
    const planMonths = createMonthFlagsFromDates(planDates, selectedYear);
    const planMonth = getDateYear(dueDate) === selectedYear ? getDateMonth(dueDate) : null;

    return {
      no: index + 1,
      qa_id: item.QA_ID || '',
      assm_nama_instrumen: item.Assm_nama_instrumen || '',
      assm_no_identitas_istrumen: item.Assm_No_identitas_Istrumen || '',
      group_da_dept: item.Group_Da_Dept || '',
      assm_lokasi: item.Assm_Lokasi || '',
      tgl_kalibrasi: null,
      kalibrasi_selanjutnya: dueDate || null,
      initial_due_date: dueDate || null,
      parameter_interval: Number.isFinite(interval) ? interval : 0,
      plan_date: dueDate || null,
      real_date: null,
      plan_dates: planDates.map(formatDateKey).filter(Boolean),
      real_dates: [],
      ooc_dates: [],
      plan_month: planMonth,
      real_month: null,
      plan_months: planMonths,
      real_months: createMonthFlags(),
      ooc_months: createMonthFlags(),
      revision_status: item.revision_status || 'UNCHANGED',
      source_table: item.Source_Table || item.source_table || null,
      source_key: item.Source_Key || item.source_key || item.QA_ID || null,
    };
  });

const mapSnapshotDetailData = (details) =>
  details.map((item, index) => {
    const planDatesFromJson = parseJsonArray(item.Plan_Dates_JSON);
    const realDatesFromJson = parseJsonArray(item.Real_Dates_JSON);
    const oocDatesFromJson = parseJsonArray(item.OOC_Dates_JSON);
    const planMonth = Number(item.Plan_Month);
    const realMonth = Number(item.Real_Month);
    const rowYear =
      getDateYear(oocDatesFromJson[0]) ||
      getDateYear(realDatesFromJson[0]) ||
      getDateYear(item.Real_Date || item.Tgl_Kalibrasi || item.Plan_Date || item.Initial_Due_Date || item.Due_Date) ||
      new Date().getFullYear();

    let planMonths = createMonthsFromJson(item.Plan_Months_JSON);
    let realMonths = createMonthsFromJson(item.Real_Months_JSON);
    const oocMonths = createMonthFlagsFromDates(oocDatesFromJson, rowYear);

    if (!parseJsonArray(item.Plan_Months_JSON).length && planMonth >= 1 && planMonth <= 12) {
      planMonths[planMonth] = true;
    }

    if (!parseJsonArray(item.Real_Months_JSON).length && realMonth >= 1 && realMonth <= 12) {
      realMonths[realMonth] = true;
    }

    return {
      no: item.Line_No || index + 1,
      awp_detail_id: item.AWP_Detail_ID,
      qa_id: item.QA_ID || '',
      assm_nama_instrumen: item.Instrument_Name || '',
      assm_no_identitas_istrumen: item.Instrument_ID || '',
      group_da_dept: item.Department || '',
      assm_lokasi: item.Location || '',
      tgl_kalibrasi: item.Tgl_Kalibrasi || null,
      kalibrasi_selanjutnya: item.Initial_Due_Date || item.Due_Date || null,
      initial_due_date: item.Initial_Due_Date || item.Due_Date || null,
      parameter_interval: item.Parameter_Interval ?? 0,
      plan_date: item.Plan_Date || item.Initial_Due_Date || item.Due_Date || null,
      real_date: item.Real_Date || null,
      plan_dates: planDatesFromJson,
      real_dates: realDatesFromJson,
      ooc_dates: oocDatesFromJson,
      plan_month: planMonth || null,
      real_month: realMonth || null,
      plan_months: planMonths,
      real_months: realMonths,
      ooc_months: oocMonths,
      revision_status: item.Revision_Status || 'UNCHANGED',
      source_table: item.Source_Table || null,
      source_key: item.Source_Key || null,
    };
  });

const getLatestAWPHeaderByStatus = async (
  selectedYear,
  status,
  workflowView = AWP_WORKFLOW_VIEWS.START,
  transaction = null
) => {
  const view = parseWorkflowView(workflowView);
  const rows = await sequelizeMSQL.query(
    `
      SELECT TOP 1
        AWP_ID,
        [Year],
        Workflow_View,
        Revision_No,
        Status,
        Requested_By,
        Prepared_By,
        Prepared_By_Name,
        Requested_At,
        Approved_By,
        Approved_By_Name,
        Approved_At,
        Rejected_By,
        Rejected_At,
        Notes,
        Created_By,
        Created_At,
        Updated_By,
        Updated_At
      FROM T_AWP_Header
      WHERE [Year] = :year
        AND Workflow_View = :workflowView
        AND Status = :status
      ORDER BY Revision_No DESC, AWP_ID DESC
    `,
    {
      replacements: { year: selectedYear, status, workflowView: view },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return rows[0] || null;
};

const getLatestAWPSnapshotHeader = (
  selectedYear,
  workflowView = AWP_WORKFLOW_VIEWS.START,
  transaction = null
) => getLatestAWPHeaderByStatus(selectedYear, 'APPROVED', workflowView, transaction);

const getLatestRequestedAWPHeader = (
  selectedYear,
  workflowView = AWP_WORKFLOW_VIEWS.START,
  transaction = null
) => getLatestAWPHeaderByStatus(selectedYear, 'REQUESTED', workflowView, transaction);

const getLatestPreviousAWPHeader = (
  selectedYear,
  workflowView = AWP_WORKFLOW_VIEWS.START,
  transaction = null
) => getLatestAWPHeaderByStatus(selectedYear, 'SUPERSEDED', workflowView, transaction);

const getAWPSnapshotHeaderById = async (awpId, transaction = null) => {
  const rows = await sequelizeMSQL.query(
    `
      SELECT
        AWP_ID,
        [Year],
        Workflow_View,
        Revision_No,
        Status,
        Requested_By,
        Prepared_By,
        Prepared_By_Name,
        Requested_At,
        Approved_By,
        Approved_By_Name,
        Approved_At,
        Rejected_By,
        Rejected_At,
        Notes,
        Created_By,
        Created_At,
        Updated_By,
        Updated_At
      FROM T_AWP_Header
      WHERE AWP_ID = :awpId
    `,
    {
      replacements: { awpId },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return rows[0] || null;
};

const getAWPSnapshotDetails = async (awpId, transaction = null) =>
  sequelizeMSQL.query(
    `
      SELECT
        AWP_Detail_ID,
        AWP_ID,
        Line_No,
        QA_ID,
        Instrument_Name,
        Instrument_ID,
        Department,
        Location,
        Due_Date,
        Initial_Due_Date,
        Tgl_Kalibrasi,
        Parameter_Interval,
        Plan_Month,
        Real_Month,
        Plan_Date,
        Real_Date,
        Plan_Dates_JSON,
        Real_Dates_JSON,
        OOC_Dates_JSON,
        Plan_Months_JSON,
        Real_Months_JSON,
        Revision_Status,
        Source_Table,
        Source_Key
      FROM T_AWP_Detail
      WHERE AWP_ID = :awpId
      ORDER BY Line_No, AWP_Detail_ID
    `,
    {
      replacements: { awpId },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

const mapAWPRevisionInfo = (header) => {
  if (!header) return null;

  return {
    awp_id: header.AWP_ID,
    year: header.Year,
    workflow_view: header.Workflow_View || AWP_WORKFLOW_VIEWS.START,
    revision_no: header.Revision_No,
    status: header.Status,
    requested_by: header.Requested_By,
    prepared_by: header.Prepared_By || header.Requested_By,
    prepared_by_name: header.Prepared_By_Name || header.Prepared_By || header.Requested_By,
    requested_at: header.Requested_At,
    approved_by: header.Approved_By,
    approved_by_name: header.Approved_By_Name || header.Approved_By,
    approved_at: header.Approved_At,
    notes: header.Notes,
    created_by: header.Created_By,
    created_at: header.Created_At,
    updated_by: header.Updated_By,
    updated_at: header.Updated_At,
  };
};

const getAWPRevisionState = async (
  selectedYear,
  workflowView = AWP_WORKFLOW_VIEWS.START,
  transaction = null
) => {
  const view = parseWorkflowView(workflowView);
  const currentHeader = await getLatestAWPSnapshotHeader(selectedYear, view, transaction);
  const requestedHeader = await getLatestRequestedAWPHeader(selectedYear, view, transaction);
  const previousHeader = await getLatestPreviousAWPHeader(selectedYear, view, transaction);

  return {
    currentHeader,
    requestedHeader,
    previousHeader,
    revisions: {
      previous: mapAWPRevisionInfo(previousHeader),
      current: mapAWPRevisionInfo(currentHeader),
      requested: mapAWPRevisionInfo(requestedHeader),
    },
  };
};

const getRowCompareKey = (row = {}) =>
  String(row.qa_id || row.QA_ID || '').trim();

const normalizeComparableText = (value) =>
  String(value || '').trim().toUpperCase();

const hasPlanningChange = (currentRow, liveRow) => {
  if (!currentRow || !liveRow) return false;

  const comparableFields = [
    'assm_nama_instrumen',
    'assm_no_identitas_istrumen',
    'group_da_dept',
    'assm_lokasi',
  ];

  const hasTextChange = comparableFields.some(
    (field) => normalizeComparableText(currentRow[field]) !== normalizeComparableText(liveRow[field])
  );

  return (
    hasTextChange ||
    formatDateKey(currentRow.kalibrasi_selanjutnya) !== formatDateKey(liveRow.kalibrasi_selanjutnya) ||
    Number(currentRow.parameter_interval || 0) !== Number(liveRow.parameter_interval || 0) ||
    JSON.stringify(currentRow.plan_dates || []) !== JSON.stringify(liveRow.plan_dates || [])
  );
};

const applyRevisionDiff = (liveData, currentData) => {
  if (!currentData?.length) {
    return liveData.map((row, index) => ({
      ...row,
      no: index + 1,
      revision_status: 'UNCHANGED',
    }));
  }

  const currentByQaId = new Map();
  currentData.forEach((row) => {
    const key = getRowCompareKey(row);
    if (key) currentByQaId.set(key, row);
  });

  const seenQaIds = new Set();
  const comparedLiveRows = liveData.map((row) => {
    const key = getRowCompareKey(row);
    if (key) seenQaIds.add(key);

    const currentRow = currentByQaId.get(key);
    if (!currentRow) {
      return { ...row, revision_status: 'ADDED' };
    }

    return {
      ...row,
      revision_status: hasPlanningChange(currentRow, row) ? 'CHANGED' : 'UNCHANGED',
    };
  });

  const removedRows = currentData
    .filter((row) => {
      const key = getRowCompareKey(row);
      return key && !seenQaIds.has(key);
    })
    .map((row) => ({
      ...row,
      tgl_kalibrasi: null,
      real_date: null,
      real_dates: [],
      ooc_dates: [],
      real_month: null,
      real_months: createMonthFlags(),
      ooc_months: createMonthFlags(),
      revision_status: 'REMOVED',
    }));

  return [...comparedLiveRows, ...removedRows].map((row, index) => ({
    ...row,
    no: index + 1,
  }));
};

const stripRealizationData = (rows = []) =>
  rows.map((row) => ({
    ...row,
    tgl_kalibrasi: null,
    real_date: null,
    real_dates: [],
    ooc_dates: [],
    real_month: null,
    real_months: createMonthFlags(),
    ooc_months: createMonthFlags(),
  }));

const getRealizationMapByQaId = async (selectedYear, transaction = null) => {
  const rows = await getRKTRealizationDataByYear(selectedYear, transaction);
  const realizationMap = new Map();

  rows.forEach((row) => {
    const qaId = String(row.QA_ID || '').trim();
    const realDate = toValidDate(row.Real_Date);
    if (!qaId || !realDate) return;

    if (!realizationMap.has(qaId)) {
      realizationMap.set(qaId, {
        realDates: [],
        oocDates: [],
      });
    }

    const entry = realizationMap.get(qaId);
    if (row.Is_OOC) {
      entry.oocDates.push(realDate);
    } else {
      entry.realDates.push(realDate);
    }
  });

  realizationMap.forEach((entry, qaId) => {
    const normalizeDates = (dates) => {
      const uniqueDates = new Map();
      dates.forEach((date) => uniqueDates.set(formatDateKey(date), date));
      return [...uniqueDates.values()].sort((left, right) => left - right);
    };

    const realDates = normalizeDates(entry.realDates);
    const oocDates = normalizeDates(entry.oocDates);
    const uniqueDates = new Map();
    [...realDates, ...oocDates].forEach((date) => uniqueDates.set(formatDateKey(date), date));
    realizationMap.set(
      qaId,
      {
        realDates,
        oocDates,
        allDates: [...uniqueDates.values()].sort((left, right) => left - right),
      }
    );
  });

  return realizationMap;
};

const applyEndOfYearRealization = async (rows = [], selectedYear, transaction = null) => {
  const realizationMap = await getRealizationMapByQaId(selectedYear, transaction);

  return rows.map((row) => {
    const qaId = getRowCompareKey(row);
    const realizationEntry = realizationMap.get(qaId) || {};
    const realDates = realizationEntry.allDates || [];
    const oocDates = realizationEntry.oocDates || [];
    const latestRealDate = realDates[realDates.length - 1] || null;
    const realMonths = createMonthFlagsFromDates(realDates, selectedYear);
    const oocMonths = createMonthFlagsFromDates(oocDates, selectedYear);

    return {
      ...row,
      tgl_kalibrasi: latestRealDate,
      real_date: latestRealDate,
      real_dates: realDates.map(formatDateKey).filter(Boolean),
      ooc_dates: oocDates.map(formatDateKey).filter(Boolean),
      real_month: latestRealDate ? getDateMonth(latestRealDate) : null,
      real_months: realMonths,
      ooc_months: oocMonths,
    };
  });
};

const buildSnapshotPayload = async (
  header,
  selectedYear,
  viewOrTransaction = AWP_WORKFLOW_VIEWS.END,
  maybeTransaction = null,
  sourceOverride = null
) => {
  if (!header?.AWP_ID) return null;

  const view = parseWorkflowView(
    typeof viewOrTransaction === 'string'
      ? viewOrTransaction
      : header.Workflow_View,
    header.Workflow_View || AWP_WORKFLOW_VIEWS.END
  );
  const transaction = typeof viewOrTransaction === 'string' ? maybeTransaction : viewOrTransaction;
  const details = await getAWPSnapshotDetails(header.AWP_ID, transaction);
  const snapshotData = mapSnapshotDetailData(details);
  const data = view === AWP_WORKFLOW_VIEWS.END ? snapshotData : stripRealizationData(snapshotData);
  const { revisions } = await getAWPRevisionState(selectedYear, view, transaction);

  return {
    success: true,
    message: 'Revision fetched successfully',
    year: selectedYear,
    count: data.length,
    months: MONTH_HEADERS,
    mode: 'double-checklist',
    view,
    source: sourceOverride || (header.Status === 'REQUESTED'
      ? 'requested'
      : header.Status === 'SUPERSEDED'
        ? 'previous'
        : 'snapshot'),
    snapshot: mapAWPRevisionInfo(header),
    revisions,
    data,
  };
};

const buildLiveDoubleChecklistPayload = async (
  selectedYear,
  viewOrTransaction = AWP_WORKFLOW_VIEWS.START,
  maybeTransaction = null
) => {
  const view = parseWorkflowView(
    typeof viewOrTransaction === 'string' ? viewOrTransaction : AWP_WORKFLOW_VIEWS.START
  );
  const transaction = typeof viewOrTransaction === 'string' ? maybeTransaction : viewOrTransaction;
  const { currentHeader, revisions } = await getAWPRevisionState(selectedYear, view, transaction);
  let data = [];

  if (view === AWP_WORKFLOW_VIEWS.END) {
    const approvedPlanHeader = await getLatestAWPSnapshotHeader(
      selectedYear,
      AWP_WORKFLOW_VIEWS.START,
      transaction
    );
    if (!approvedPlanHeader?.AWP_ID) {
      const error = new Error('Approved AWP Plan is required before opening Realization.');
      error.status = 404;
      throw error;
    }

    const planDetails = await getAWPSnapshotDetails(approvedPlanHeader.AWP_ID, transaction);
    data = await applyEndOfYearRealization(
      stripRealizationData(mapSnapshotDetailData(planDetails)),
      selectedYear,
      transaction
    );
  } else {
    const results = await getRKTDoubleChecklistDataByYear(selectedYear, transaction);
    const liveData = mapDoubleChecklistPreviewData(results, selectedYear);
    data = liveData;

    if (currentHeader?.AWP_ID) {
      const currentDetails = await getAWPSnapshotDetails(currentHeader.AWP_ID, transaction);
      data = applyRevisionDiff(liveData, mapSnapshotDetailData(currentDetails));
    }
  }

  return {
    success: true,
    message: 'Data fetched successfully',
    year: selectedYear,
    count: data.length,
    months: MONTH_HEADERS,
    mode: 'double-checklist',
    view,
    source: 'live',
    snapshot: null,
    revisions,
    data,
  };
};

const normalizeSelectedQaIds = (selectedQaIds) => {
  if (!Array.isArray(selectedQaIds)) return null;

  return new Set(
    selectedQaIds
      .map((qaId) => String(qaId || '').trim())
      .filter(Boolean)
  );
};

const buildScannedDoubleChecklistPayload = async (
  selectedYear,
  selectedNewQaIds = null,
  transaction = null,
  workflowView = AWP_WORKFLOW_VIEWS.START
) => {
  const view = parseWorkflowView(workflowView);

  if (view === AWP_WORKFLOW_VIEWS.END) {
    const approvedPlanHeader = await getLatestAWPSnapshotHeader(
      selectedYear,
      AWP_WORKFLOW_VIEWS.START,
      transaction
    );
    if (!approvedPlanHeader?.AWP_ID) {
      const error = new Error('Approved AWP Plan is required before scanning Realization.');
      error.status = 404;
      throw error;
    }

    const planDetails = await getAWPSnapshotDetails(approvedPlanHeader.AWP_ID, transaction);
    const basePlanData = stripRealizationData(mapSnapshotDetailData(planDetails));
    const data = await applyEndOfYearRealization(basePlanData, selectedYear, transaction);
    const { currentHeader, revisions } = await getAWPRevisionState(selectedYear, view, transaction);

    return {
      success: true,
      message: 'Realization scan fetched successfully',
      year: selectedYear,
      count: data.length,
      new_count: 0,
      selected_new_count: 0,
      months: MONTH_HEADERS,
      mode: 'double-checklist',
      view,
      source: 'scan',
      snapshot: currentHeader ? mapAWPRevisionInfo(currentHeader) : null,
      revisions,
      data,
    };
  }

  const results = await getRKTDoubleChecklistDataByYear(selectedYear, transaction);
  const liveData = mapDoubleChecklistPreviewData(results, selectedYear);
  const { currentHeader, revisions } = await getAWPRevisionState(selectedYear, view, transaction);
  const selectedSet = normalizeSelectedQaIds(selectedNewQaIds);

  let data = liveData.map((row, index) => ({
    ...row,
    no: index + 1,
    revision_status: 'UNCHANGED',
    include_in_revision: true,
  }));
  let newCount = 0;
  let selectedNewCount = 0;

  if (currentHeader?.AWP_ID) {
    const currentDetails = await getAWPSnapshotDetails(currentHeader.AWP_ID, transaction);
    const currentData = stripRealizationData(mapSnapshotDetailData(currentDetails)).map((row) => ({
      ...row,
      revision_status: 'UNCHANGED',
      include_in_revision: true,
    }));

    const currentKeys = new Set(
      currentData.map(getRowCompareKey).filter(Boolean)
    );

    const newRows = liveData
      .filter((row) => {
        const key = getRowCompareKey(row);
        return key && !currentKeys.has(key);
      })
      .map((row) => {
        const key = getRowCompareKey(row);
        const isIncluded = selectedSet ? selectedSet.has(key) : true;
        return {
          ...row,
          revision_status: 'ADDED',
          include_in_revision: isIncluded,
        };
      });

    newCount = newRows.length;
    const includedNewRows = newRows.filter((row) => row.include_in_revision);
    selectedNewCount = includedNewRows.length;
    data = [...currentData, ...includedNewRows].map((row, index) => ({
      ...row,
      no: index + 1,
    }));

    if (!selectedSet) {
      data = [...currentData, ...newRows].map((row, index) => ({
        ...row,
        no: index + 1,
      }));
    }
  }

  return {
    success: true,
    message: 'New instrument scan fetched successfully',
    year: selectedYear,
    count: data.length,
    new_count: newCount,
    selected_new_count: selectedSet ? selectedNewCount : newCount,
    months: MONTH_HEADERS,
    mode: 'double-checklist',
    view,
    source: 'scan',
    snapshot: currentHeader ? mapAWPRevisionInfo(currentHeader) : null,
    revisions,
    data,
  };
};

const getMasterRKTPreview = async (req, res, next) => {
  try {
    const selectedYear = parseYear(req.query.year);
    const isDoubleChecklist = req.query.mode === 'double-checklist';
    const source = PREVIEW_SOURCES.includes(req.query.source)
      ? req.query.source
      : 'snapshot';
    const view = parseWorkflowView(
      req.query.view,
      source === 'live' || source === 'scan'
        ? AWP_WORKFLOW_VIEWS.START
        : AWP_WORKFLOW_VIEWS.END
    );

    if (!selectedYear) {
      return res.status(400).json({
        success: false,
        message: 'Valid year query parameter is required',
      });
    }

    if (isDoubleChecklist) {
      if (source === 'scan') {
        const scanPayload = await buildScannedDoubleChecklistPayload(
          selectedYear,
          null,
          null,
          view
        );
        return res.status(200).json(scanPayload);
      }

      if (source === 'requested') {
        const requestedHeader = await getLatestRequestedAWPHeader(selectedYear, view);
        if (requestedHeader) {
          const requestedPayload = await buildSnapshotPayload(requestedHeader, selectedYear, view);
          return res.status(200).json(requestedPayload);
        }
      } else if (source === 'previous') {
        const previousHeader = await getLatestPreviousAWPHeader(selectedYear, view);
        if (previousHeader) {
          const previousPayload = await buildSnapshotPayload(
            previousHeader,
            selectedYear,
            view,
            null,
            'previous'
          );
          return res.status(200).json(previousPayload);
        }
      } else if (source !== 'live') {
        const currentHeader = await getLatestAWPSnapshotHeader(selectedYear, view);
        if (currentHeader) {
          const currentPayload = await buildSnapshotPayload(currentHeader, selectedYear, view);
          return res.status(200).json(currentPayload);
        }

        const requestedHeader = await getLatestRequestedAWPHeader(selectedYear, view);
        if (requestedHeader) {
          const requestedPayload = await buildSnapshotPayload(requestedHeader, selectedYear, view);
          return res.status(200).json(requestedPayload);
        }
      }

      if (view === AWP_WORKFLOW_VIEWS.END && source !== 'live') {
        const error = new Error('No approved AWP Realization revision is available. Use Scan Realization Data to request approval.');
        error.status = 404;
        throw error;
      }

      const livePayload = await buildLiveDoubleChecklistPayload(selectedYear, view);
      return res.status(200).json(livePayload);
    }

    const results = await getRKTDataByYear(selectedYear);
    const data = mapPreviewData(results);

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      year: selectedYear,
      count: data.length,
      months: MONTH_HEADERS,
      data,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    console.error('Error in getMasterRKTPreview:', error);
    next(error);
  }
};

const exportMasterRKTDoubleChecklist = async (selectedYear, res, source = 'snapshot', view = 'end') => {
  let data = [];
  let snapshotHeader = null;
  const workflowView = parseWorkflowView(view, AWP_WORKFLOW_VIEWS.END);

  if (source === 'scan') {
    const scanPayload = await buildScannedDoubleChecklistPayload(
      selectedYear,
      null,
      null,
      workflowView
    );
    data = scanPayload.data;
    snapshotHeader = await getLatestAWPSnapshotHeader(selectedYear, workflowView);
  } else if (source === 'requested') {
    snapshotHeader = await getLatestRequestedAWPHeader(selectedYear, workflowView);
  } else if (source === 'previous') {
    snapshotHeader = await getLatestPreviousAWPHeader(selectedYear, workflowView);
  } else if (source !== 'live') {
    snapshotHeader = await getLatestAWPSnapshotHeader(selectedYear, workflowView);
    if (!snapshotHeader) {
      snapshotHeader = await getLatestRequestedAWPHeader(selectedYear, workflowView);
    }
  }

  if (source === 'scan' && workflowView === AWP_WORKFLOW_VIEWS.START) {
    data = stripRealizationData(data);
  } else if (snapshotHeader) {
    const details = await getAWPSnapshotDetails(snapshotHeader.AWP_ID);
    const snapshotData = mapSnapshotDetailData(details);
    data = workflowView === AWP_WORKFLOW_VIEWS.END
      ? snapshotData
      : stripRealizationData(snapshotData);
  } else {
    if (workflowView === AWP_WORKFLOW_VIEWS.END) {
      const error = new Error('No saved AWP Realization revision is available to export.');
      error.status = 404;
      throw error;
    }
    const livePayload = await buildLiveDoubleChecklistPayload(selectedYear, workflowView);
    data = livePayload.data;
  }

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`RKT${selectedYear}`);
  worksheet.views = [{ state: 'frozen', ySplit: 3 }];

  worksheet.columns = [
    { width: 6 },
    { width: 52 },
    { width: 18 },
    { width: 12 },
    { width: 38 },
    { width: 13 },
    { width: 13 },
    { width: 10 },
    ...MONTH_HEADERS.flatMap(() => [{ width: 7 }, { width: 7 }]),
  ];

  const lastColumn = 8 + (MONTH_HEADERS.length * 2);
  worksheet.mergeCells(1, 1, 1, lastColumn);
  worksheet.getCell(1, 1).value =
    source === 'scan'
      ? `AWP ${workflowView === 'end' ? 'END' : 'START'} OF YEAR ${selectedYear} - ${workflowView === 'end' ? 'REALIZATION SCAN' : 'NEW INSTRUMENT SCAN'}`
      : snapshotHeader
        ? `AWP ${workflowView === 'end' ? 'END' : 'START'} OF YEAR ${selectedYear} - REV ${snapshotHeader.Revision_No} (${snapshotHeader.Status})`
        : `AWP ${workflowView === 'end' ? 'END' : 'START'} OF YEAR ${selectedYear}`;
  worksheet.getCell(1, 1).font = { bold: true, size: 14 };
  worksheet.getCell(1, 1).alignment = { horizontal: 'center', vertical: 'middle' };

  const fixedHeaders = [
    'No',
    'Instrument Name',
    'ID',
    'Department',
    'Location',
    'Due Date',
    'Realization Date',
    'Interval (Months)',
  ];

  fixedHeaders.forEach((header, index) => {
    const col = index + 1;
    worksheet.mergeCells(2, col, 4, col);
    worksheet.getCell(2, col).value = header;
  });

  worksheet.mergeCells(2, 9, 2, lastColumn);
  worksheet.getCell(2, 9).value = 'MONTH';

  MONTH_HEADERS.forEach((month, index) => {
    const startCol = 9 + (index * 2);
    worksheet.mergeCells(3, startCol, 3, startCol + 1);
    worksheet.getCell(3, startCol).value = month;
    worksheet.getCell(4, startCol).value = 'Plan';
    worksheet.getCell(4, startCol + 1).value = 'Real';
  });

  const headerStyle = {
    bold: true,
    size: 11,
  };

  for (let row = 2; row <= 4; row += 1) {
    for (let col = 1; col <= lastColumn; col += 1) {
      const cell = worksheet.getCell(row, col);
      cell.font = headerStyle;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    }
  }

  const formatExcelDate = (value) => {
    const date = toValidDate(value);
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const formatExcelDateList = (values = []) =>
    values
      .map(formatExcelDate)
      .filter(Boolean)
      .join('\n');

  data.forEach((item) => {
    const realDateValues = item.real_dates?.length
      ? item.real_dates
      : [item.tgl_kalibrasi];
    const rowData = [
      item.no,
      item.assm_nama_instrumen || '',
      item.assm_no_identitas_istrumen || '',
      item.group_da_dept || '',
      item.assm_lokasi || '',
      formatExcelDate(item.kalibrasi_selanjutnya),
      workflowView === 'end' ? formatExcelDateList(realDateValues) : '',
      item.parameter_interval ?? '',
    ];

    MONTH_HEADERS.forEach((_, index) => {
      const monthNumber = index + 1;
      rowData.push(item.plan_months?.[monthNumber] ? '\u221A' : '');
      rowData.push(workflowView === 'end' && item.real_months?.[monthNumber] ? '\u221A' : '');
    });

    const row = worksheet.addRow(rowData);
    row.height = 22;
  });

  const tableTopRow = 2;
  const dataStartRow = 5;
  const lastDataRow = dataStartRow + data.length - 1;
  const tableBottomRow = Math.max(lastDataRow, 4);

  for (let row = tableTopRow; row <= tableBottomRow; row += 1) {
    for (let col = 1; col <= lastColumn; col += 1) {
      const cell = worksheet.getCell(row, col);
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      if (col >= 9 || col === 1 || col === 3 || col === 4 || col === 6 || col === 7 || col === 8) {
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }
    }
  }

  worksheet.autoFilter = `A2:H${tableBottomRow}`;

  const signatureLabelRow = tableBottomRow + 3;
  const signatureNameRow = signatureLabelRow + 4;
  const leftSignatureEnd = Math.floor(lastColumn / 2);
  const rightSignatureStart = leftSignatureEnd + 2;
  const preparedByName =
    snapshotHeader?.Prepared_By_Name ||
    snapshotHeader?.Prepared_By ||
    snapshotHeader?.Requested_By ||
    'Qualification & Calibration Officer';
  const approvedByName =
    snapshotHeader?.Approved_By_Name ||
    snapshotHeader?.Approved_By ||
    'VN Manager';

  worksheet.mergeCells(signatureLabelRow, 1, signatureLabelRow, leftSignatureEnd);
  worksheet.mergeCells(signatureLabelRow, rightSignatureStart, signatureLabelRow, lastColumn);
  worksheet.getCell(signatureLabelRow, 1).value = 'Prepared By,';
  worksheet.getCell(signatureLabelRow, rightSignatureStart).value = 'Approved By,';

  worksheet.mergeCells(signatureNameRow, 1, signatureNameRow, leftSignatureEnd);
  worksheet.mergeCells(signatureNameRow, rightSignatureStart, signatureNameRow, lastColumn);
  worksheet.getCell(signatureNameRow, 1).value = preparedByName;
  worksheet.getCell(signatureNameRow, rightSignatureStart).value = approvedByName;

  worksheet.getCell(signatureLabelRow, 1).alignment = { horizontal: 'center' };
  worksheet.getCell(signatureLabelRow, rightSignatureStart).alignment = { horizontal: 'center' };
  worksheet.getCell(signatureNameRow, 1).alignment = { horizontal: 'center' };
  worksheet.getCell(signatureNameRow, rightSignatureStart).alignment = { horizontal: 'center' };
  worksheet.getCell(signatureNameRow, 1).font = { bold: true };
  worksheet.getCell(signatureNameRow, rightSignatureStart).font = { bold: true };

  const fileName =
    source === 'scan'
      ? `Master-AWP-${workflowView === 'end' ? 'End' : 'Start'}-${selectedYear}-Scan.xlsx`
      : snapshotHeader
        ? `Master-AWP-${workflowView === 'end' ? 'End' : 'Start'}-${selectedYear}-Rev-${snapshotHeader.Revision_No}.xlsx`
        : `Master-AWP-${workflowView === 'end' ? 'End' : 'Start'}-${selectedYear}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${fileName}"`
  );
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  return res.send(buffer);
};

const exportMasterRKT = async (req, res, next) => {
  try {
    const selectedYear = parseYear(req.query.year);
    const isDoubleChecklist = req.query.mode === 'double-checklist';
    const source = PREVIEW_SOURCES.includes(req.query.source)
      ? req.query.source
      : 'snapshot';
    const view = parseWorkflowView(
      req.query.view,
      source === 'live' || source === 'scan'
        ? AWP_WORKFLOW_VIEWS.START
        : AWP_WORKFLOW_VIEWS.END
    );

    if (!selectedYear) {
      return res.status(400).json({
        success: false,
        message: 'Valid year query parameter is required',
      });
    }

    if (isDoubleChecklist) {
      return exportMasterRKTDoubleChecklist(selectedYear, res, source, view);
    }

    const results = await getRKTDataByYear(selectedYear);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`RKT${selectedYear}`);
    worksheet.views = [{ state: 'frozen', ySplit: 3 }];

    worksheet.columns = [
      { width: 6 },  // No
      { width: 52 }, // Instrument Name
      { width: 18 }, // ID
      { width: 12 }, // Department
      { width: 38 }, // Location
      { width: 7 },  // Jan
      { width: 7 },  // Feb
      { width: 7 },  // Mar
      { width: 7 },  // Apr
      { width: 7 },  // May
      { width: 7 },  // Jun
      { width: 7 },  // Jul
      { width: 7 },  // Aug
      { width: 7 },  // Sep
      { width: 7 },  // Oct
      { width: 7 },  // Nov
      { width: 7 },  // Dec
    ];

    worksheet.mergeCells('A1:Q1');
    worksheet.getCell('A1').value = `ANNUAL WORK PLAN ${selectedYear}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('F2:Q2');

    worksheet.getCell('A2').value = 'No';
    worksheet.getCell('B2').value = 'Instrument Name';
    worksheet.getCell('C2').value = 'ID';
    worksheet.getCell('D2').value = 'Department';
    worksheet.getCell('E2').value = 'Location';
    worksheet.getCell('F2').value = 'MONTH';

    MONTH_HEADERS.forEach((month, index) => {
      worksheet.getCell(3, 6 + index).value = month;
    });

    const headerStyle = {
      bold: true,
      size: 11,
    };
    for (let row = 2; row <= 3; row += 1) {
      for (let col = 1; col <= 17; col += 1) {
        const cell = worksheet.getCell(row, col);
        cell.font = headerStyle;
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      }
    }

    const tableTopRow = 2;
    const dataStartRow = 4;

    results.forEach((item, index) => {
      const rowData = [
        index + 1,
        item.Assm_nama_instrumen || '',
        item.Assm_No_identitas_Istrumen || '',
        item.Group_Da_Dept || '',
        item.Assm_Lokasi || '',
        '', '', '', '', '', '', '', '', '', '', '', '',
      ];

      const kalibrasiDate = item.Kalibrasi_selanjutnya ? new Date(item.Kalibrasi_selanjutnya) : null;
      if (kalibrasiDate && !Number.isNaN(kalibrasiDate.getTime())) {
        const monthIndex = kalibrasiDate.getMonth();
        if (monthIndex >= 0 && monthIndex <= 11) {
          rowData[5 + monthIndex] = '√';
        }
      }

      const row = worksheet.addRow(rowData);
      row.height = 22;
    });

    const lastDataRow = dataStartRow + results.length - 1;
    const tableBottomRow = Math.max(lastDataRow, 3);

    for (let row = tableTopRow; row <= tableBottomRow; row += 1) {
      for (let col = 1; col <= 17; col += 1) {
        const cell = worksheet.getCell(row, col);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };

        if (col >= 6) {
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        } else if (col === 2 || col === 5) {
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        }
      }
    }

    // Apply filter on core columns only (A:E) so users can filter by
    // instrument name / ID / department / location without selecting a range manually.
    worksheet.autoFilter = `A2:E${tableBottomRow}`;

    const signatureLabelRow = tableBottomRow + 3;
    const signatureNameRow = signatureLabelRow + 4;

    worksheet.mergeCells(`A${signatureLabelRow}:H${signatureLabelRow}`);
    worksheet.mergeCells(`J${signatureLabelRow}:Q${signatureLabelRow}`);
    worksheet.getCell(`A${signatureLabelRow}`).value = 'Prepared By,';
    worksheet.getCell(`J${signatureLabelRow}`).value = 'Approved By,';

    worksheet.mergeCells(`A${signatureNameRow}:H${signatureNameRow}`);
    worksheet.mergeCells(`J${signatureNameRow}:Q${signatureNameRow}`);
    worksheet.getCell(`A${signatureNameRow}`).value = 'Qualification & Calibration Officer';
    worksheet.getCell(`J${signatureNameRow}`).value = 'VN Manager';

    worksheet.getCell(`A${signatureLabelRow}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`J${signatureLabelRow}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`A${signatureNameRow}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`J${signatureNameRow}`).alignment = { horizontal: 'center' };
    worksheet.getCell(`A${signatureNameRow}`).font = { bold: true };
    worksheet.getCell(`J${signatureNameRow}`).font = { bold: true };

    const fileName = `Master-RKT-${selectedYear}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    return res.send(buffer);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    console.error('Error in exportMasterRKT:', error);
    next(error);
  }
};

const requestMasterRKTApproval = async (req, res, next) => {
  try {
    const selectedYear = parseYear(req.body?.year || req.query?.year);
    const workflowView = parseWorkflowView(req.body?.view || req.query?.view);
    const notes = req.body?.notes || null;
    const selectedNewQaIds = Array.isArray(req.body?.selected_new_qa_ids)
      ? req.body.selected_new_qa_ids
      : null;
    const { user_id, nama_user } = req.user || {};
    const preparedByName = nama_user || user_id;

    if (!selectedYear) {
      return res.status(400).json({
        success: false,
        message: 'Valid year is required',
      });
    }

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: 'User is not authenticated',
      });
    }

    const snapshotPayload = await sequelizeMSQL.transaction(async (transaction) => {
      const existingRequested = await sequelizeMSQL.query(
        `
          SELECT TOP 1 AWP_ID, Revision_No
          FROM T_AWP_Header WITH (UPDLOCK, HOLDLOCK)
          WHERE [Year] = :year
            AND Workflow_View = :workflowView
            AND Status = 'REQUESTED'
          ORDER BY Revision_No DESC, AWP_ID DESC
        `,
        {
          replacements: { year: selectedYear, workflowView },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      if (existingRequested.length) {
        const error = new Error('An AWP revision is already waiting for approval.');
        error.status = 409;
        throw error;
      }

      const revisionPayload = await buildScannedDoubleChecklistPayload(
        selectedYear,
        selectedNewQaIds,
        transaction,
        workflowView
      );

      if (!revisionPayload.data.length) {
        const error = new Error('No AWP data is available to request approval.');
        error.status = 400;
        throw error;
      }

      if (
        workflowView === AWP_WORKFLOW_VIEWS.START &&
        revisionPayload.snapshot &&
        Array.isArray(selectedNewQaIds) &&
        revisionPayload.selected_new_count === 0
      ) {
        const error = new Error('No new instruments were selected for this AWP revision.');
        error.status = 400;
        throw error;
      }

      const revisionRows = await sequelizeMSQL.query(
        `
          SELECT
            CASE
              WHEN COUNT(1) = 0 THEN 0
              ELSE ISNULL(MAX(Revision_No), -1) + 1
            END AS NextRevision
          FROM T_AWP_Header WITH (UPDLOCK, HOLDLOCK)
          WHERE [Year] = :year
            AND Workflow_View = :workflowView
            AND Status IN ('APPROVED', 'SUPERSEDED')
        `,
        {
          replacements: { year: selectedYear, workflowView },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const revisionNo = revisionRows[0]?.NextRevision ?? 0;
      const headerRows = await sequelizeMSQL.query(
        `
          DECLARE @InsertedHeader TABLE
          (
            AWP_ID INT,
            [Year] INT,
            Workflow_View VARCHAR(10),
            Revision_No INT,
            Status VARCHAR(20),
            Requested_By NVARCHAR(50),
            Prepared_By NVARCHAR(50),
            Prepared_By_Name NVARCHAR(255),
            Requested_At DATETIME2(0),
            Approved_By NVARCHAR(50),
            Approved_By_Name NVARCHAR(255),
            Approved_At DATETIME2(0),
            Rejected_By NVARCHAR(50),
            Rejected_At DATETIME2(0),
            Notes NVARCHAR(MAX),
            Created_By NVARCHAR(50),
            Created_At DATETIME2(0),
            Updated_By NVARCHAR(50),
            Updated_At DATETIME2(0)
          );

          INSERT INTO T_AWP_Header
            (
              [Year],
              Workflow_View,
              Revision_No,
              Status,
              Requested_By,
              Prepared_By,
              Prepared_By_Name,
              Requested_At,
              Notes,
              Created_By,
              Created_At,
              Updated_By,
              Updated_At
            )
          OUTPUT
            INSERTED.AWP_ID,
            INSERTED.[Year],
            INSERTED.Workflow_View,
            INSERTED.Revision_No,
            INSERTED.Status,
            INSERTED.Requested_By,
            INSERTED.Prepared_By,
            INSERTED.Prepared_By_Name,
            INSERTED.Requested_At,
            INSERTED.Approved_By,
            INSERTED.Approved_By_Name,
            INSERTED.Approved_At,
            INSERTED.Rejected_By,
            INSERTED.Rejected_At,
            INSERTED.Notes,
            INSERTED.Created_By,
            INSERTED.Created_At,
            INSERTED.Updated_By,
            INSERTED.Updated_At
          INTO @InsertedHeader
          VALUES
            (
              :year,
              :workflowView,
              :revisionNo,
              'REQUESTED',
              :userId,
              :userId,
              :preparedByName,
              GETDATE(),
              :notes,
              :userId,
              GETDATE(),
              :userId,
              GETDATE()
            );

          SELECT
            AWP_ID,
            [Year],
            Workflow_View,
            Revision_No,
            Status,
            Requested_By,
            Prepared_By,
            Prepared_By_Name,
            Requested_At,
            Approved_By,
            Approved_By_Name,
            Approved_At,
            Rejected_By,
            Rejected_At,
            Notes,
            Created_By,
            Created_At,
            Updated_By,
            Updated_At
          FROM @InsertedHeader;
        `,
        {
          replacements: {
            year: selectedYear,
            workflowView,
            revisionNo,
            userId: user_id,
            preparedByName,
            notes,
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const header = headerRows[0];

      for (const item of revisionPayload.data) {
        await sequelizeMSQL.query(
          `
            INSERT INTO T_AWP_Detail
              (
                AWP_ID,
                Line_No,
                QA_ID,
                Instrument_Name,
                Instrument_ID,
                Department,
                Location,
                Due_Date,
                Initial_Due_Date,
                Tgl_Kalibrasi,
                Parameter_Interval,
                Plan_Month,
                Real_Month,
                Plan_Date,
                Real_Date,
                Plan_Dates_JSON,
                Real_Dates_JSON,
                OOC_Dates_JSON,
                Plan_Months_JSON,
                Real_Months_JSON,
                Revision_Status,
                Source_Table,
                Source_Key
              )
            VALUES
              (
                :awpId,
                :lineNo,
                :qaId,
                :instrumentName,
                :instrumentId,
                :department,
                :location,
                :dueDate,
                :initialDueDate,
                :tglKalibrasi,
                :parameterInterval,
                :planMonth,
                :realMonth,
                :planDate,
                :realDate,
                :planDatesJson,
                :realDatesJson,
                :oocDatesJson,
                :planMonthsJson,
                :realMonthsJson,
                :revisionStatus,
                :sourceTable,
                :sourceKey
              )
          `,
          {
            replacements: {
              awpId: header.AWP_ID,
              lineNo: item.no,
              qaId: item.qa_id || null,
              instrumentName: item.assm_nama_instrumen || null,
              instrumentId: item.assm_no_identitas_istrumen || null,
              department: item.group_da_dept || null,
              location: item.assm_lokasi || null,
              dueDate: toValidDate(item.kalibrasi_selanjutnya),
              initialDueDate: toValidDate(item.initial_due_date || item.kalibrasi_selanjutnya),
              tglKalibrasi: workflowView === AWP_WORKFLOW_VIEWS.END
                ? toValidDate(item.tgl_kalibrasi || item.real_date)
                : null,
              parameterInterval: item.parameter_interval ?? 0,
              planMonth: item.plan_month || null,
              realMonth: workflowView === AWP_WORKFLOW_VIEWS.END ? item.real_month || null : null,
              planDate: toValidDate(item.plan_date || item.kalibrasi_selanjutnya),
              realDate: workflowView === AWP_WORKFLOW_VIEWS.END
                ? toValidDate(item.real_date || item.tgl_kalibrasi)
                : null,
              planDatesJson: stringifyDateArray(item.plan_dates?.length ? item.plan_dates : [item.plan_date || item.kalibrasi_selanjutnya]),
              realDatesJson: workflowView === AWP_WORKFLOW_VIEWS.END
                ? stringifyDateArray(item.real_dates || [])
                : JSON.stringify([]),
              oocDatesJson: workflowView === AWP_WORKFLOW_VIEWS.END
                ? stringifyDateArray(item.ooc_dates || [])
                : JSON.stringify([]),
              planMonthsJson: stringifyMonthFlags(item.plan_months),
              realMonthsJson: workflowView === AWP_WORKFLOW_VIEWS.END
                ? stringifyMonthFlags(item.real_months)
                : JSON.stringify([]),
              revisionStatus: item.revision_status || 'UNCHANGED',
              sourceTable: item.source_table || null,
              sourceKey: item.source_key || null,
            },
            type: Sequelize.QueryTypes.INSERT,
            transaction,
          }
        );
      }

      return buildSnapshotPayload(header, selectedYear, workflowView, transaction);
    });

    return res.status(201).json({
      ...snapshotPayload,
      message: 'AWP has been submitted for approval.',
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    console.error('Error in requestMasterRKTApproval:', error);
    next(error);
  }
};

const approveMasterRKT = async (req, res, next) => {
  try {
    const awpId = Number(req.body?.awp_id || req.query?.awp_id);
    const selectedYear = parseYear(req.body?.year || req.query?.year);
    const workflowView = parseWorkflowView(req.body?.view || req.query?.view);
    const notes = req.body?.notes || null;
    const { user_id, nama_user } = req.user || {};
    const approvedByName = nama_user || user_id;

    if (!awpId && !selectedYear) {
      return res.status(400).json({
        success: false,
        message: 'AWP ID or valid year is required',
      });
    }

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: 'User is not authenticated',
      });
    }

    if (!canApproveOrRejectAWP(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only VN Manager can approve AWP revisions.',
      });
    }

    const snapshotPayload = await sequelizeMSQL.transaction(async (transaction) => {
      let header = null;

      if (awpId) {
        header = await getAWPSnapshotHeaderById(awpId, transaction);
      } else {
        const requestedRows = await sequelizeMSQL.query(
          `
            SELECT TOP 1
              AWP_ID,
              [Year],
              Workflow_View,
              Revision_No,
              Status,
              Requested_By,
              Prepared_By,
              Prepared_By_Name,
              Requested_At,
              Approved_By,
              Approved_By_Name,
              Approved_At,
              Rejected_By,
              Rejected_At,
              Notes,
              Created_By,
              Created_At,
              Updated_By,
              Updated_At
            FROM T_AWP_Header WITH (UPDLOCK, HOLDLOCK)
            WHERE [Year] = :year
              AND Workflow_View = :workflowView
              AND Status = 'REQUESTED'
            ORDER BY Revision_No DESC, AWP_ID DESC
          `,
          {
            replacements: { year: selectedYear, workflowView },
            type: Sequelize.QueryTypes.SELECT,
            transaction,
          }
        );
        header = requestedRows[0] || null;
      }

      if (!header) {
        const error = new Error('No AWP revision is waiting for approval.');
        error.status = 404;
        throw error;
      }

      if (header.Status !== 'REQUESTED') {
        const error = new Error('Only AWP revisions waiting for approval can be approved.');
        error.status = 400;
        throw error;
      }

      await sequelizeMSQL.query(
        `
          UPDATE T_AWP_Header
          SET
            Status = 'SUPERSEDED',
            Updated_By = :userId,
            Updated_At = GETDATE()
          WHERE [Year] = :year
            AND Workflow_View = :workflowView
            AND Status = 'APPROVED'
            AND AWP_ID <> :awpId
        `,
        {
          replacements: {
            year: header.Year,
            workflowView: header.Workflow_View || workflowView,
            userId: user_id,
            awpId: header.AWP_ID,
          },
          type: Sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );

      await sequelizeMSQL.query(
        `
          UPDATE T_AWP_Header
          SET
            Status = 'APPROVED',
            Approved_By = :userId,
            Approved_By_Name = :approvedByName,
            Approved_At = GETDATE(),
            Notes = COALESCE(:notes, Notes),
            Updated_By = :userId,
            Updated_At = GETDATE()
          WHERE AWP_ID = :awpId
        `,
        {
          replacements: {
            awpId: header.AWP_ID,
            userId: user_id,
            approvedByName,
            notes,
          },
          type: Sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );

      const approvedHeader = await getAWPSnapshotHeaderById(header.AWP_ID, transaction);
      return buildSnapshotPayload(
        approvedHeader,
        approvedHeader.Year,
        approvedHeader.Workflow_View || workflowView,
        transaction
      );
    });

    return res.status(200).json({
      ...snapshotPayload,
      message: 'AWP has been approved.',
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    console.error('Error in approveMasterRKT:', error);
    next(error);
  }
};

const rejectMasterRKT = async (req, res, next) => {
  try {
    const awpId = Number(req.body?.awp_id || req.query?.awp_id);
    const selectedYear = parseYear(req.body?.year || req.query?.year);
    const workflowView = parseWorkflowView(req.body?.view || req.query?.view);
    const { user_id } = req.user || {};

    if (!awpId && !selectedYear) {
      return res.status(400).json({
        success: false,
        message: 'AWP ID or valid year is required',
      });
    }

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: 'User is not authenticated',
      });
    }

    if (!canApproveOrRejectAWP(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Only VN Manager can reject AWP revisions.',
      });
    }

    const payload = await sequelizeMSQL.transaction(async (transaction) => {
      let header = null;

      if (awpId) {
        header = await getAWPSnapshotHeaderById(awpId, transaction);
      } else {
        header = await getLatestRequestedAWPHeader(selectedYear, workflowView, transaction);
      }

      if (!header) {
        const error = new Error('No AWP revision is waiting for approval.');
        error.status = 404;
        throw error;
      }

      if (header.Status !== 'REQUESTED') {
        const error = new Error('Only AWP revisions waiting for approval can be rejected.');
        error.status = 400;
        throw error;
      }

      await sequelizeMSQL.query(
        `
          UPDATE T_AWP_Header
          SET
            Status = 'REJECTED',
            Rejected_By = :userId,
            Rejected_At = GETDATE(),
            Updated_By = :userId,
            Updated_At = GETDATE()
          WHERE AWP_ID = :awpId
        `,
        {
          replacements: {
            awpId: header.AWP_ID,
            userId: user_id,
          },
          type: Sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );

      const view = header.Workflow_View || workflowView;
      const currentHeader = await getLatestAWPSnapshotHeader(header.Year, view, transaction);
      if (currentHeader) {
        return buildSnapshotPayload(currentHeader, currentHeader.Year, view, transaction);
      }

      return buildLiveDoubleChecklistPayload(header.Year, view, transaction);
    });

    return res.status(200).json({
      ...payload,
      message: 'AWP revision has been rejected.',
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    console.error('Error in rejectMasterRKT:', error);
    next(error);
  }
};

module.exports = {
  getMasterRKTPreview,
  exportMasterRKT,
  requestMasterRKTApproval,
  approveMasterRKT,
  rejectMasterRKT,
};
