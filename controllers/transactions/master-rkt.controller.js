'use strict';

const ExcelJS = require('exceljs');
const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');

const MONTH_HEADERS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parseYear = (year) => {
  const selectedYear = Number(year);
  if (!Number.isInteger(selectedYear) || selectedYear < 1900 || selectedYear > 3000) {
    return null;
  }
  return selectedYear;
};

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
  const query = `
    SELECT
      QA_ID,
      Tgl_kalibrasi AS Real_Date
    FROM (
      SELECT DISTINCT QA_ID, Tgl_kalibrasi
      FROM T_Kalibrasi_DA_Thermohygro
      WHERE Tgl_kalibrasi IS NOT NULL

      UNION ALL

      SELECT DISTINCT QA_ID, Tgl_kalibrasi
      FROM T_Kalibrasi_DA_Anak_Timbangan
      WHERE Tgl_kalibrasi IS NOT NULL

      UNION ALL

      SELECT DISTINCT QA_ID, Tgl_kalibrasi
      FROM T_Kalibrasi_DA_Timbangan
      WHERE Tgl_kalibrasi IS NOT NULL

      UNION ALL

      SELECT DISTINCT QA_ID, Tgl_kalibrasi
      FROM T_Kalibrasi_DA_Bagian
      WHERE Tgl_kalibrasi IS NOT NULL
    ) AS A
    WHERE YEAR(Tgl_kalibrasi) = :year
    ORDER BY QA_ID, Tgl_kalibrasi
  `;

  return sequelizeMSQL.query(query, {
    replacements: { year: selectedYear },
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
      parameter_interval: Number.isFinite(interval) ? interval : 0,
      plan_date: dueDate || null,
      real_date: null,
      plan_dates: planDates.map(formatDateKey).filter(Boolean),
      real_dates: [],
      plan_month: planMonth,
      real_month: null,
      plan_months: planMonths,
      real_months: createMonthFlags(),
      revision_status: item.revision_status || 'UNCHANGED',
      source_table: item.Source_Table || item.source_table || null,
      source_key: item.Source_Key || item.source_key || item.QA_ID || null,
    };
  });

const mapSnapshotDetailData = (details) =>
  details.map((item, index) => {
    const planDatesFromJson = parseJsonArray(item.Plan_Dates_JSON);
    const realDatesFromJson = parseJsonArray(item.Real_Dates_JSON);
    const planMonth = Number(item.Plan_Month);
    const realMonth = Number(item.Real_Month);

    let planMonths = createMonthsFromJson(item.Plan_Months_JSON);
    let realMonths = createMonthsFromJson(item.Real_Months_JSON);

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
      kalibrasi_selanjutnya: item.Due_Date || null,
      parameter_interval: item.Parameter_Interval ?? 0,
      plan_date: item.Plan_Date || item.Due_Date || null,
      real_date: item.Real_Date || null,
      plan_dates: planDatesFromJson,
      real_dates: realDatesFromJson,
      plan_month: planMonth || null,
      real_month: realMonth || null,
      plan_months: planMonths,
      real_months: realMonths,
      revision_status: item.Revision_Status || 'UNCHANGED',
      source_table: item.Source_Table || null,
      source_key: item.Source_Key || null,
    };
  });

const getLatestAWPHeaderByStatus = async (selectedYear, status, transaction = null) => {
  const rows = await sequelizeMSQL.query(
    `
      SELECT TOP 1
        AWP_ID,
        [Year],
        Revision_No,
        Status,
        Requested_By,
        Requested_At,
        Approved_By,
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
        AND Status = :status
      ORDER BY Revision_No DESC, AWP_ID DESC
    `,
    {
      replacements: { year: selectedYear, status },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return rows[0] || null;
};

const getLatestAWPSnapshotHeader = (selectedYear, transaction = null) =>
  getLatestAWPHeaderByStatus(selectedYear, 'APPROVED', transaction);

const getLatestRequestedAWPHeader = (selectedYear, transaction = null) =>
  getLatestAWPHeaderByStatus(selectedYear, 'REQUESTED', transaction);

const getAWPSnapshotHeaderById = async (awpId, transaction = null) => {
  const rows = await sequelizeMSQL.query(
    `
      SELECT
        AWP_ID,
        [Year],
        Revision_No,
        Status,
        Requested_By,
        Requested_At,
        Approved_By,
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
        Tgl_Kalibrasi,
        Parameter_Interval,
        Plan_Month,
        Real_Month,
        Plan_Date,
        Real_Date,
        Plan_Dates_JSON,
        Real_Dates_JSON,
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
    revision_no: header.Revision_No,
    status: header.Status,
    requested_by: header.Requested_By,
    requested_at: header.Requested_At,
    approved_by: header.Approved_By,
    approved_at: header.Approved_At,
    notes: header.Notes,
    created_by: header.Created_By,
    created_at: header.Created_At,
    updated_by: header.Updated_By,
    updated_at: header.Updated_At,
  };
};

const getAWPRevisionState = async (selectedYear, transaction = null) => {
  const currentHeader = await getLatestAWPSnapshotHeader(selectedYear, transaction);
  const requestedHeader = await getLatestRequestedAWPHeader(selectedYear, transaction);

  return {
    currentHeader,
    requestedHeader,
    revisions: {
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
      real_month: null,
      real_months: createMonthFlags(),
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
    real_month: null,
    real_months: createMonthFlags(),
  }));

const getRealizationMapByQaId = async (selectedYear, transaction = null) => {
  const rows = await getRKTRealizationDataByYear(selectedYear, transaction);
  const realizationMap = new Map();

  rows.forEach((row) => {
    const qaId = String(row.QA_ID || '').trim();
    const realDate = toValidDate(row.Real_Date);
    if (!qaId || !realDate) return;

    if (!realizationMap.has(qaId)) {
      realizationMap.set(qaId, []);
    }

    realizationMap.get(qaId).push(realDate);
  });

  realizationMap.forEach((dates, qaId) => {
    const uniqueDates = new Map();
    dates.forEach((date) => uniqueDates.set(formatDateKey(date), date));
    realizationMap.set(
      qaId,
      [...uniqueDates.values()].sort((left, right) => left - right)
    );
  });

  return realizationMap;
};

const applyEndOfYearRealization = async (rows = [], selectedYear, transaction = null) => {
  const realizationMap = await getRealizationMapByQaId(selectedYear, transaction);

  return rows.map((row) => {
    const qaId = getRowCompareKey(row);
    const realDates = realizationMap.get(qaId) || [];
    const latestRealDate = realDates[realDates.length - 1] || null;
    const realMonths = createMonthFlagsFromDates(realDates, selectedYear);

    return {
      ...row,
      tgl_kalibrasi: latestRealDate,
      real_date: latestRealDate,
      real_dates: realDates.map(formatDateKey).filter(Boolean),
      real_month: latestRealDate ? getDateMonth(latestRealDate) : null,
      real_months: realMonths,
    };
  });
};

const buildSnapshotPayload = async (header, selectedYear, viewOrTransaction = 'end', maybeTransaction = null) => {
  if (!header?.AWP_ID) return null;

  const view = typeof viewOrTransaction === 'string' ? viewOrTransaction : 'end';
  const transaction = typeof viewOrTransaction === 'string' ? maybeTransaction : viewOrTransaction;
  const details = await getAWPSnapshotDetails(header.AWP_ID, transaction);
  const snapshotData = mapSnapshotDetailData(details);
  const data =
    view === 'end'
      ? await applyEndOfYearRealization(snapshotData, selectedYear, transaction)
      : stripRealizationData(snapshotData);
  const { revisions } = await getAWPRevisionState(selectedYear, transaction);

  return {
    success: true,
    message: 'Revision fetched successfully',
    year: selectedYear,
    count: data.length,
    months: MONTH_HEADERS,
    mode: 'double-checklist',
    view,
    source: header.Status === 'REQUESTED' ? 'requested' : 'snapshot',
    snapshot: mapAWPRevisionInfo(header),
    revisions,
    data,
  };
};

const buildLiveDoubleChecklistPayload = async (selectedYear, viewOrTransaction = 'start', maybeTransaction = null) => {
  const view = typeof viewOrTransaction === 'string' ? viewOrTransaction : 'start';
  const transaction = typeof viewOrTransaction === 'string' ? maybeTransaction : viewOrTransaction;
  const results = await getRKTDoubleChecklistDataByYear(selectedYear, transaction);
  const liveData = mapDoubleChecklistPreviewData(results, selectedYear);
  const { currentHeader, revisions } = await getAWPRevisionState(selectedYear, transaction);
  let data = liveData;

  if (view === 'start' && currentHeader?.AWP_ID) {
    const currentDetails = await getAWPSnapshotDetails(currentHeader.AWP_ID, transaction);
    data = applyRevisionDiff(liveData, mapSnapshotDetailData(currentDetails));
  } else if (view === 'end') {
    data = await applyEndOfYearRealization(liveData, selectedYear, transaction);
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

const getMasterRKTPreview = async (req, res, next) => {
  try {
    const selectedYear = parseYear(req.query.year);
    const isDoubleChecklist = req.query.mode === 'double-checklist';
    const source = ['live', 'requested', 'snapshot'].includes(req.query.source)
      ? req.query.source
      : 'snapshot';
    const view = ['start', 'end'].includes(req.query.view)
      ? req.query.view
      : source === 'live'
        ? 'start'
        : 'end';

    if (!selectedYear) {
      return res.status(400).json({
        success: false,
        message: 'Valid year query parameter is required',
      });
    }

    if (isDoubleChecklist) {
      if (source === 'requested') {
        const requestedHeader = await getLatestRequestedAWPHeader(selectedYear);
        if (requestedHeader) {
          const requestedPayload = await buildSnapshotPayload(requestedHeader, selectedYear, view);
          return res.status(200).json(requestedPayload);
        }
      } else if (source !== 'live') {
        const currentHeader = await getLatestAWPSnapshotHeader(selectedYear);
        if (currentHeader) {
          const currentPayload = await buildSnapshotPayload(currentHeader, selectedYear, view);
          return res.status(200).json(currentPayload);
        }

        const requestedHeader = await getLatestRequestedAWPHeader(selectedYear);
        if (requestedHeader) {
          const requestedPayload = await buildSnapshotPayload(requestedHeader, selectedYear, view);
          return res.status(200).json(requestedPayload);
        }
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
    console.error('Error in getMasterRKTPreview:', error);
    next(error);
  }
};

const exportMasterRKTDoubleChecklist = async (selectedYear, res, source = 'snapshot', view = 'end') => {
  let data = [];
  let snapshotHeader = null;

  if (source === 'requested') {
    snapshotHeader = await getLatestRequestedAWPHeader(selectedYear);
  } else if (source !== 'live') {
    snapshotHeader = await getLatestAWPSnapshotHeader(selectedYear);
    if (!snapshotHeader) {
      snapshotHeader = await getLatestRequestedAWPHeader(selectedYear);
    }
  }

  if (snapshotHeader) {
    const details = await getAWPSnapshotDetails(snapshotHeader.AWP_ID);
    const snapshotData = mapSnapshotDetailData(details);
    data =
      view === 'end'
        ? await applyEndOfYearRealization(snapshotData, selectedYear)
        : stripRealizationData(snapshotData);
  } else {
    const results = await getRKTDoubleChecklistDataByYear(selectedYear);
    const liveData = mapDoubleChecklistPreviewData(results, selectedYear);
    data =
      view === 'end'
        ? await applyEndOfYearRealization(liveData, selectedYear)
        : liveData;
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
  worksheet.getCell(1, 1).value = snapshotHeader
    ? `AWP ${view === 'end' ? 'END' : 'START'} OF YEAR ${selectedYear} - REV ${snapshotHeader.Revision_No} (${snapshotHeader.Status})`
    : `AWP ${view === 'end' ? 'END' : 'START'} OF YEAR ${selectedYear}`;
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

  data.forEach((item) => {
    const rowData = [
      item.no,
      item.assm_nama_instrumen || '',
      item.assm_no_identitas_istrumen || '',
      item.group_da_dept || '',
      item.assm_lokasi || '',
      formatExcelDate(item.kalibrasi_selanjutnya),
      view === 'end' ? formatExcelDate(item.tgl_kalibrasi) : '',
      item.parameter_interval ?? '',
    ];

    MONTH_HEADERS.forEach((_, index) => {
      const monthNumber = index + 1;
      rowData.push(item.plan_months?.[monthNumber] ? '\u221A' : '');
      rowData.push(view === 'end' && item.real_months?.[monthNumber] ? '\u221A' : '');
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

  worksheet.mergeCells(signatureLabelRow, 1, signatureLabelRow, leftSignatureEnd);
  worksheet.mergeCells(signatureLabelRow, rightSignatureStart, signatureLabelRow, lastColumn);
  worksheet.getCell(signatureLabelRow, 1).value = 'Prepared By,';
  worksheet.getCell(signatureLabelRow, rightSignatureStart).value = 'Approved By,';

  worksheet.mergeCells(signatureNameRow, 1, signatureNameRow, leftSignatureEnd);
  worksheet.mergeCells(signatureNameRow, rightSignatureStart, signatureNameRow, lastColumn);
  worksheet.getCell(signatureNameRow, 1).value = 'Qualification & Calibration Officer';
  worksheet.getCell(signatureNameRow, rightSignatureStart).value = 'VN Manager';

  worksheet.getCell(signatureLabelRow, 1).alignment = { horizontal: 'center' };
  worksheet.getCell(signatureLabelRow, rightSignatureStart).alignment = { horizontal: 'center' };
  worksheet.getCell(signatureNameRow, 1).alignment = { horizontal: 'center' };
  worksheet.getCell(signatureNameRow, rightSignatureStart).alignment = { horizontal: 'center' };
  worksheet.getCell(signatureNameRow, 1).font = { bold: true };
  worksheet.getCell(signatureNameRow, rightSignatureStart).font = { bold: true };

  const fileName = snapshotHeader
    ? `Master-AWP-${view === 'end' ? 'End' : 'Start'}-${selectedYear}-Rev-${snapshotHeader.Revision_No}.xlsx`
    : `Master-AWP-${view === 'end' ? 'End' : 'Start'}-${selectedYear}.xlsx`;
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
    const source = ['live', 'requested', 'snapshot'].includes(req.query.source)
      ? req.query.source
      : 'snapshot';
    const view = ['start', 'end'].includes(req.query.view)
      ? req.query.view
      : source === 'live'
        ? 'start'
        : 'end';

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
    worksheet.getCell('A1').value = `CALIBRATION PLAN YEAR ${selectedYear}`;
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
    console.error('Error in exportMasterRKT:', error);
    next(error);
  }
};

const requestMasterRKTApproval = async (req, res, next) => {
  try {
    const selectedYear = parseYear(req.body?.year || req.query?.year);
    const notes = req.body?.notes || null;
    const { user_id } = req.user || {};

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

    const livePayload = await buildLiveDoubleChecklistPayload(selectedYear, 'start');
    if (!livePayload.data.length) {
      return res.status(400).json({
        success: false,
        message: 'No AWP data is available to request approval.',
      });
    }

    const snapshotPayload = await sequelizeMSQL.transaction(async (transaction) => {
      const existingRequested = await sequelizeMSQL.query(
        `
          SELECT TOP 1 AWP_ID, Revision_No
          FROM T_AWP_Header WITH (UPDLOCK, HOLDLOCK)
          WHERE [Year] = :year
            AND Status = 'REQUESTED'
          ORDER BY Revision_No DESC, AWP_ID DESC
        `,
        {
          replacements: { year: selectedYear },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      if (existingRequested.length) {
        const error = new Error('An AWP revision is already waiting for approval.');
        error.status = 409;
        throw error;
      }

      const revisionRows = await sequelizeMSQL.query(
        `
          SELECT ISNULL(MAX(Revision_No), 0) + 1 AS NextRevision
          FROM T_AWP_Header WITH (UPDLOCK, HOLDLOCK)
          WHERE [Year] = :year
        `,
        {
          replacements: { year: selectedYear },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const revisionNo = revisionRows[0]?.NextRevision || 1;
      const headerRows = await sequelizeMSQL.query(
        `
          DECLARE @InsertedHeader TABLE
          (
            AWP_ID INT,
            [Year] INT,
            Revision_No INT,
            Status VARCHAR(20),
            Requested_By NVARCHAR(50),
            Requested_At DATETIME2(0),
            Approved_By NVARCHAR(50),
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
              Revision_No,
              Status,
              Requested_By,
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
            INSERTED.Revision_No,
            INSERTED.Status,
            INSERTED.Requested_By,
            INSERTED.Requested_At,
            INSERTED.Approved_By,
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
              :revisionNo,
              'REQUESTED',
              :userId,
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
            Revision_No,
            Status,
            Requested_By,
            Requested_At,
            Approved_By,
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
            revisionNo,
            userId: user_id,
            notes,
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const header = headerRows[0];

      for (const item of livePayload.data) {
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
                Tgl_Kalibrasi,
                Parameter_Interval,
                Plan_Month,
                Real_Month,
                Plan_Date,
                Real_Date,
                Plan_Dates_JSON,
                Real_Dates_JSON,
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
                :tglKalibrasi,
                :parameterInterval,
                :planMonth,
                :realMonth,
                :planDate,
                :realDate,
                :planDatesJson,
                :realDatesJson,
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
              tglKalibrasi: null,
              parameterInterval: item.parameter_interval ?? 0,
              planMonth: item.plan_month || null,
              realMonth: null,
              planDate: toValidDate(item.plan_date || item.kalibrasi_selanjutnya),
              realDate: null,
              planDatesJson: stringifyDateArray(item.plan_dates?.length ? item.plan_dates : [item.plan_date || item.kalibrasi_selanjutnya]),
              realDatesJson: JSON.stringify([]),
              planMonthsJson: stringifyMonthFlags(item.plan_months),
              realMonthsJson: JSON.stringify([]),
              revisionStatus: item.revision_status || 'UNCHANGED',
              sourceTable: item.source_table || null,
              sourceKey: item.source_key || null,
            },
            type: Sequelize.QueryTypes.INSERT,
            transaction,
          }
        );
      }

      return buildSnapshotPayload(header, selectedYear, 'start', transaction);
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
    const notes = req.body?.notes || null;
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
              Revision_No,
              Status,
              Requested_By,
              Requested_At,
              Approved_By,
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
              AND Status = 'REQUESTED'
            ORDER BY Revision_No DESC, AWP_ID DESC
          `,
          {
            replacements: { year: selectedYear },
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
            AND Status = 'APPROVED'
            AND AWP_ID <> :awpId
        `,
        {
          replacements: {
            year: header.Year,
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
            notes,
          },
          type: Sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );

      const approvedHeader = await getAWPSnapshotHeaderById(header.AWP_ID, transaction);
      return buildSnapshotPayload(approvedHeader, approvedHeader.Year, 'start', transaction);
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

    const payload = await sequelizeMSQL.transaction(async (transaction) => {
      let header = null;

      if (awpId) {
        header = await getAWPSnapshotHeaderById(awpId, transaction);
      } else {
        header = await getLatestRequestedAWPHeader(selectedYear, transaction);
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

      const currentHeader = await getLatestAWPSnapshotHeader(header.Year, transaction);
      if (currentHeader) {
        return buildSnapshotPayload(currentHeader, currentHeader.Year, 'start', transaction);
      }

      return buildLiveDoubleChecklistPayload(header.Year, 'start', transaction);
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
