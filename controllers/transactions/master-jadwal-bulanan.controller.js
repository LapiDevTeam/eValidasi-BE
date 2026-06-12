'use strict';

const ExcelJS = require('exceljs');
const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const WEEK_LABELS = ['MINGGU 1', 'MINGGU 2', 'MINGGU 3', 'MINGGU 4'];
const CALIBRATION_SCOPE = {
  INTERNAL: 'internal',
  EXTERNAL: 'external',
};
const MONTHLY_SCHEDULE_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SUPERSEDED: 'SUPERSEDED',
};
const EXTERNAL_MONTHLY_SCHEDULE_STATUS = MONTHLY_SCHEDULE_STATUS;
const BUFFER_DAYS = 0;
const CHECKMARK_SYMBOL = 'X';

const parseYear = (year) => {
  const selectedYear = Number(year);
  if (!Number.isInteger(selectedYear) || selectedYear < 1900 || selectedYear > 3000) {
    return null;
  }
  return selectedYear;
};

const parseMonth = (month) => {
  const selectedMonth = Number(month);
  if (!Number.isInteger(selectedMonth) || selectedMonth < 1 || selectedMonth > 12) {
    return null;
  }
  return selectedMonth;
};

const toDateObject = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const toDateOnly = (value) => {
  const date = toDateObject(value);
  if (!date) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const formatDateDisplay = (value) => {
  const date = toDateObject(value);
  if (!date) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

const formatDateISO = (value) => {
  const date = toDateObject(value);
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizePeriodYear = (value) => {
  const parsed = parseYear(value);
  return parsed ? String(parsed) : null;
};

const normalizePeriodMonth = (value) => {
  const parsed = parseMonth(value);
  return parsed ? String(parsed).padStart(2, '0') : null;
};

const getCategory = (identitas) => {
  const normalized = String(identitas || '').toUpperCase();
  if (!normalized) return 'Unlisted';
  if (normalized.includes('TH')) return 'Thermohygrometer';
  if (normalized.includes('TM')) return 'Timbangan';
  if (normalized.includes('IEG') || normalized.includes('EG')) return 'Diff. Pressure Gauge';
  return 'Unlisted';
};

const getWeekNumber = (value) => {
  const date = toDateObject(value);
  if (!date) return 4;
  const day = date.getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
};

const shiftDateByDays = (value, offset) => {
  const date = toDateOnly(value);
  if (!date || !Number.isFinite(offset)) return null;
  date.setDate(date.getDate() + offset);
  return date;
};

const isDateWithinRange = (value, startDate, endDate) => {
  const date = toDateOnly(value);
  if (!date || !startDate || !endDate) return false;
  return date >= startDate && date <= endDate;
};

const getMonthlyWindow = (selectedYear, selectedMonth) => {
  const periodStart = new Date(selectedYear, selectedMonth - 1, 1);
  const periodEnd = new Date(selectedYear, selectedMonth, 0);
  const bufferStart = shiftDateByDays(periodStart, -BUFFER_DAYS);
  const bufferEnd = shiftDateByDays(periodEnd, BUFFER_DAYS);

  return {
    periodStart,
    periodEnd,
    bufferStart,
    bufferEnd,
    periodStartISO: formatDateISO(periodStart),
    periodEndISO: formatDateISO(periodEnd),
    bufferStartISO: formatDateISO(bufferStart),
    bufferEndISO: formatDateISO(bufferEnd),
  };
};

const sortMappedRows = (rows) => {
  rows.sort((a, b) => {
    const dateA = toDateObject(a.source_date || a.plan_due_date || a.tgl_kalibrasi)?.getTime()
      ?? Number.MAX_SAFE_INTEGER;
    const dateB = toDateObject(b.source_date || b.plan_due_date || b.tgl_kalibrasi)?.getTime()
      ?? Number.MAX_SAFE_INTEGER;
    if (dateA !== dateB) return dateA - dateB;

    const dueDateA = toDateObject(a.plan_due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const dueDateB = toDateObject(b.plan_due_date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    if (dueDateA !== dueDateB) return dueDateA - dueDateB;

    const nameA = String(a.assm_nama_instrumen || '').toLowerCase();
    const nameB = String(b.assm_nama_instrumen || '').toLowerCase();
    if (nameA !== nameB) return nameA.localeCompare(nameB);

    return String(a.assm_no_identitas_istrumen || '').localeCompare(
      String(b.assm_no_identitas_istrumen || '')
    );
  });
};

const sortExternalRows = (rows) => {
  rows.sort((a, b) => {
    const dateA = toDateObject(a.jatuh_tempo)?.getTime() || 0;
    const dateB = toDateObject(b.jatuh_tempo)?.getTime() || 0;
    if (dateA !== dateB) return dateA - dateB;

    const nameA = String(a.assm_nama_instrumen || '').toLowerCase();
    const nameB = String(b.assm_nama_instrumen || '').toLowerCase();
    if (nameA !== nameB) return nameA.localeCompare(nameB);

    return String(a.assm_no_identitas_istrumen || '').localeCompare(
      String(b.assm_no_identitas_istrumen || '')
    );
  });
};

const getMonthlyScheduleRowMatchKey = (item = {}) =>
  [
    String(item?.source_key || item?.Source_Key || '').trim().toUpperCase(),
    String(
      item?.assm_no_identitas_istrumen || item?.Instrument_ID || item?.instrument_id || ''
    )
      .trim()
      .toUpperCase(),
  ].join('|');

const createMonthlySchedulePreviousValueMap = (rows = []) => {
  const map = new Map();
  rows.forEach((item) => {
    const key = getMonthlyScheduleRowMatchKey(item);
    if (!key || key === '|') return;
    map.set(key, {
      pic: item?.pic || item?.PIC || '',
      checklist_s: Boolean(item?.checklist_s ?? item?.Checklist_S),
      checklist_d: Boolean(item?.checklist_d ?? item?.Checklist_D),
      checklist_m: Boolean(item?.checklist_m ?? item?.Checklist_M),
    });
  });
  return map;
};

const applyPreviousValuesToMonthlyRows = (rows = [], previousValueMap = new Map()) =>
  rows.map((row) => {
    const key = getMonthlyScheduleRowMatchKey(row);
    const previous = previousValueMap.get(key);
    const hasPrevious = Boolean(previous);

    return {
      ...row,
      pic: hasPrevious ? previous.pic || '' : row.pic || '',
      checklist_s: hasPrevious ? previous.checklist_s : Boolean(row.checklist_s),
      checklist_d: hasPrevious ? previous.checklist_d : Boolean(row.checklist_d),
      checklist_m: hasPrevious ? previous.checklist_m : Boolean(row.checklist_m),
      previous_pic: hasPrevious ? previous.pic || '' : '',
      previous_checklist_s: hasPrevious ? previous.checklist_s : false,
      previous_checklist_d: hasPrevious ? previous.checklist_d : false,
      previous_checklist_m: hasPrevious ? previous.checklist_m : false,
      is_new_row: !hasPrevious,
    };
  });

const getMonthlyCalibrationData = async (
  selectedYear,
  selectedMonth,
  calibrationScope = CALIBRATION_SCOPE.INTERNAL,
  transaction = null
) => {
  const { bufferStartISO, bufferEndISO } = getMonthlyWindow(selectedYear, selectedMonth);
  const scopeCondition =
    calibrationScope === CALIBRATION_SCOPE.EXTERNAL
      ? 'MAX(ISNULL(Jenis_Kalibrasi, 1)) <> 1'
      : 'MAX(ISNULL(Jenis_Kalibrasi, 1)) = 1';

  const query = `
    SELECT
      QA_ID,
      Assm_nama_instrumen,
      Assm_No_identitas_Istrumen,
      Group_Da_Dept,
      Assm_Lokasi,
      MAX(Kalibrasi_selanjutnya) AS Kalibrasi_selanjutnya,
      MAX(Tgl_kalibrasi) AS Tgl_kalibrasi,
      CASE
        WHEN MAX(ISNULL(Jenis_Kalibrasi, 1)) = 1 THEN 'Internal'
        ELSE 'External'
      END AS Jenis_Kalibrasi,
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
        CAST('RA_CalibrationAssessment' AS VARCHAR(128)) AS Source_Table,
        CAST(QA_ID AS VARCHAR(100)) AS Source_Key
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
      (
        (
          MAX(Kalibrasi_selanjutnya) IS NOT NULL
          AND CONVERT(DATE, MAX(Kalibrasi_selanjutnya)) BETWEEN :bufferStart AND :bufferEnd
        )
        OR (
          MAX(Tgl_kalibrasi) IS NOT NULL
          AND CONVERT(DATE, MAX(Tgl_kalibrasi)) BETWEEN :bufferStart AND :bufferEnd
        )
      )
      AND ${scopeCondition}
    ORDER BY
      CASE
        WHEN MAX(Kalibrasi_selanjutnya) IS NOT NULL
          AND CONVERT(DATE, MAX(Kalibrasi_selanjutnya)) BETWEEN :bufferStart AND :bufferEnd
          THEN MAX(Kalibrasi_selanjutnya)
        ELSE MAX(Tgl_kalibrasi)
      END,
      Assm_nama_instrumen
  `;

  return sequelizeMSQL.query(query, {
    replacements: {
      bufferStart: bufferStartISO,
      bufferEnd: bufferEndISO,
    },
    type: Sequelize.QueryTypes.SELECT,
    transaction,
  });
};

const resolveSourceMatch = (dueDate, calibrationDate, window) => {
  const dueInRange = isDateWithinRange(dueDate, window.bufferStart, window.bufferEnd);
  const calibrationInRange = isDateWithinRange(
    calibrationDate,
    window.bufferStart,
    window.bufferEnd
  );
  const dueInPeriod = isDateWithinRange(dueDate, window.periodStart, window.periodEnd);
  const calibrationInPeriod = isDateWithinRange(
    calibrationDate,
    window.periodStart,
    window.periodEnd
  );

  let matchType = 'NONE';
  if (dueInRange && calibrationInRange) matchType = 'BOTH';
  else if (dueInRange) matchType = 'DUE_DATE';
  else if (calibrationInRange) matchType = 'CALIBRATION_DATE';

  return {
    matchType,
    dueInRange,
    calibrationInRange,
    dueInPeriod,
    calibrationInPeriod,
    sourceDate: dueInRange ? dueDate : calibrationInRange ? calibrationDate : dueDate || calibrationDate,
  };
};

const mapMonthlyRows = (results, selectedYear, selectedMonth) => {
  const window = getMonthlyWindow(selectedYear, selectedMonth);
  const mapped = (results || []).map((item, index) => {
    const dueDate = formatDateISO(item?.Kalibrasi_selanjutnya);
    const calibrationDate = formatDateISO(item?.Tgl_kalibrasi);
    const match = resolveSourceMatch(dueDate, calibrationDate, window);

    return {
      row_id: `${item?.QA_ID || 'NA'}-${item?.Assm_No_identitas_Istrumen || 'NA'}-${index + 1}`,
      schedule_detail_id: null,
      no: index + 1,
      qa_id: item?.QA_ID || '',
      assm_nama_instrumen: item?.Assm_nama_instrumen || '',
      assm_no_identitas_istrumen: item?.Assm_No_identitas_Istrumen || '',
      group_da_dept: item?.Group_Da_Dept || '',
      assm_lokasi: item?.Assm_Lokasi || '',
      jenis_kalibrasi: item?.Jenis_Kalibrasi || 'Internal',
      category: getCategory(item?.Assm_No_identitas_Istrumen),
      week: getWeekNumber(match.sourceDate || dueDate || calibrationDate),
      pic: '',
      plan_due_date: dueDate,
      tgl_kalibrasi: calibrationDate,
      realisasi_eksekusi: calibrationDate,
      source_date: formatDateISO(match.sourceDate),
      source_match_type: match.matchType,
      is_due_in_period: match.dueInPeriod,
      is_calibration_in_period: match.calibrationInPeriod,
      checklist_s: false,
      checklist_d: false,
      checklist_m: false,
      source_table: item?.Source_Table || null,
      source_key: item?.Source_Key || null,
    };
  });

  sortMappedRows(mapped);
  return mapped.map((row, idx) => ({
    ...row,
    no: idx + 1,
  }));
};

const mapMonthlyExternalRows = (results) => {
  const mapped = (results || []).map((item, index) => ({
    row_id: `${item?.QA_ID || 'NA'}-${item?.Assm_No_identitas_Istrumen || 'NA'}-${index + 1}`,
    no: index + 1,
    qa_id: item?.QA_ID || '',
    assm_nama_instrumen: item?.Assm_nama_instrumen || '',
    assm_no_identitas_istrumen: item?.Assm_No_identitas_Istrumen || '',
    group_da_dept: item?.Group_Da_Dept || '',
    assm_lokasi: item?.Assm_Lokasi || '',
    jenis_kalibrasi: item?.Jenis_Kalibrasi || 'External',
    jatuh_tempo: formatDateISO(item?.Kalibrasi_selanjutnya),
    tgl_kalibrasi: formatDateISO(item?.Tgl_kalibrasi),
    tgl_eksekusi_insitu: null,
    tgl_penyerahan_alat_oleh_user: null,
    tgl_pengembalian_alat_oleh_vn: null,
    realisasi: formatDateISO(item?.Tgl_kalibrasi),
    keterangan: '',
  }));

  sortExternalRows(mapped);
  return mapped.map((row, idx) => ({ ...row, no: idx + 1 }));
};

const getGroupedData = (rows) => {
  const grouped = {};
  for (let week = 1; week <= 4; week += 1) {
    grouped[week] = {
      week,
      week_label: WEEK_LABELS[week - 1],
      categories: [
        { category: 'Unlisted', items: [] },
        { category: 'Thermohygrometer', items: [] },
        { category: 'Timbangan', items: [] },
        { category: 'Diff. Pressure Gauge', items: [] },
      ],
    };
  }

  for (const row of rows) {
    const week = row?.week || 4;
    const weekObj = grouped[week];
    const categoryObj = weekObj.categories.find((cat) => cat.category === row.category);
    if (categoryObj) categoryObj.items.push(row);
  }

  return Object.values(grouped);
};

const normalizeIncomingRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((item, index) => {
    const category = getCategory(item?.assm_no_identitas_istrumen);
    const planDueDate = formatDateISO(item?.plan_due_date);
    const calibrationDate = formatDateISO(item?.tgl_kalibrasi);
    const sourceDate = formatDateISO(item?.source_date || item?.plan_due_date || item?.tgl_kalibrasi);
    const week = item?.week || getWeekNumber(sourceDate || planDueDate || calibrationDate);

    return {
      row_id: item?.row_id || `ROW-${index + 1}`,
      schedule_detail_id: Number(item?.schedule_detail_id) || null,
      no: Number(item?.no) || index + 1,
      qa_id: item?.qa_id || '',
      assm_nama_instrumen: item?.assm_nama_instrumen || '',
      assm_no_identitas_istrumen: item?.assm_no_identitas_istrumen || '',
      group_da_dept: item?.group_da_dept || '',
      assm_lokasi: item?.assm_lokasi || '',
      pic: String(item?.pic || '').trim(),
      category,
      week: Number(week) >= 1 && Number(week) <= 4 ? Number(week) : 4,
      plan_due_date: planDueDate,
      tgl_kalibrasi: calibrationDate,
      realisasi_eksekusi: formatDateISO(item?.realisasi_eksekusi || item?.tgl_kalibrasi),
      source_date: sourceDate,
      source_match_type: String(item?.source_match_type || 'NONE').toUpperCase(),
      checklist_s: Boolean(item?.checklist_s),
      checklist_d: Boolean(item?.checklist_d),
      checklist_m: Boolean(item?.checklist_m),
      source_table: item?.source_table || null,
      source_key: item?.source_key || null,
    };
  });
};

const normalizeIncomingExternalRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((item, index) => ({
    row_id: item?.row_id || `ROW-EXTERNAL-${index + 1}`,
    no: Number(item?.no) || index + 1,
    assm_nama_instrumen: item?.assm_nama_instrumen || '',
    assm_no_identitas_istrumen: item?.assm_no_identitas_istrumen || '',
    group_da_dept: item?.group_da_dept || '',
    assm_lokasi: item?.assm_lokasi || '',
    jenis_kalibrasi: item?.jenis_kalibrasi || 'External',
    tgl_eksekusi_insitu: formatDateISO(item?.tgl_eksekusi_insitu),
    tgl_penyerahan_alat_oleh_user: formatDateISO(item?.tgl_penyerahan_alat_oleh_user),
    tgl_pengembalian_alat_oleh_vn: formatDateISO(item?.tgl_pengembalian_alat_oleh_vn),
    jatuh_tempo: formatDateISO(item?.jatuh_tempo || item?.plan_due_date),
    tgl_kalibrasi: formatDateISO(item?.tgl_kalibrasi),
    realisasi: formatDateISO(item?.tgl_kalibrasi || item?.realisasi || item?.realisasi_eksekusi),
    keterangan: String(item?.keterangan ?? '').trim(),
  }));
};

const writeTableHeader = (worksheet, startRow) => {
  worksheet.mergeCells(`J${startRow}:L${startRow}`);
  worksheet.getCell(`A${startRow}`).value = 'No';
  worksheet.getCell(`B${startRow}`).value = 'Nama Alat';
  worksheet.getCell(`C${startRow}`).value = 'ID';
  worksheet.getCell(`D${startRow}`).value = 'Bagian';
  worksheet.getCell(`E${startRow}`).value = 'Lokasi';
  worksheet.getCell(`F${startRow}`).value = 'PIC';
  worksheet.getCell(`G${startRow}`).value = 'Plan / Due Date';
  worksheet.getCell(`H${startRow}`).value = 'Tgl Kalibrasi';
  worksheet.getCell(`I${startRow}`).value = 'Source Date';
  worksheet.getCell(`J${startRow}`).value = 'Ket.';

  worksheet.getCell(`J${startRow + 1}`).value = 'S';
  worksheet.getCell(`K${startRow + 1}`).value = 'D';
  worksheet.getCell(`L${startRow + 1}`).value = 'M';

  const headerRows = [startRow, startRow + 1];
  for (const rowNumber of headerRows) {
    for (let col = 1; col <= 12; col += 1) {
      const cell = worksheet.getCell(rowNumber, col);
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF9DC3E6' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
        bottom: { style: 'thin' },
      };
    }
  }

  worksheet.mergeCells(`A${startRow}:A${startRow + 1}`);
  worksheet.mergeCells(`B${startRow}:B${startRow + 1}`);
  worksheet.mergeCells(`C${startRow}:C${startRow + 1}`);
  worksheet.mergeCells(`D${startRow}:D${startRow + 1}`);
  worksheet.mergeCells(`E${startRow}:E${startRow + 1}`);
  worksheet.mergeCells(`F${startRow}:F${startRow + 1}`);
  worksheet.mergeCells(`G${startRow}:G${startRow + 1}`);
  worksheet.mergeCells(`H${startRow}:H${startRow + 1}`);
  worksheet.mergeCells(`I${startRow}:I${startRow + 1}`);
};

const writeExternalTableHeader = (worksheet, startRow) => {
  worksheet.mergeCells(`F${startRow}:H${startRow}`);

  worksheet.getCell(`A${startRow}`).value = 'No';
  worksheet.getCell(`B${startRow}`).value = 'Nama Alat';
  worksheet.getCell(`C${startRow}`).value = 'ID';
  worksheet.getCell(`D${startRow}`).value = 'Bagian';
  worksheet.getCell(`E${startRow}`).value = 'Lokasi';
  worksheet.getCell(`F${startRow}`).value = 'Tanggal Eksekusi';
  worksheet.getCell(`I${startRow}`).value = 'Jatuh Tempo';
  worksheet.getCell(`J${startRow}`).value = 'Realisasi';
  worksheet.getCell(`K${startRow}`).value = 'Keterangan';

  worksheet.getCell(`F${startRow + 1}`).value = 'Insitu*';
  worksheet.getCell(`G${startRow + 1}`).value = 'Penyerahan Alat Oleh User';
  worksheet.getCell(`H${startRow + 1}`).value = 'Pengembalian Alat Oleh VN';

  for (let rowNumber = startRow; rowNumber <= startRow + 1; rowNumber += 1) {
    for (let col = 1; col <= 11; col += 1) {
      const cell = worksheet.getCell(rowNumber, col);
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF4B183' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
        bottom: { style: 'thin' },
      };
    }
  }

  worksheet.mergeCells(`A${startRow}:A${startRow + 1}`);
  worksheet.mergeCells(`B${startRow}:B${startRow + 1}`);
  worksheet.mergeCells(`C${startRow}:C${startRow + 1}`);
  worksheet.mergeCells(`D${startRow}:D${startRow + 1}`);
  worksheet.mergeCells(`E${startRow}:E${startRow + 1}`);
  worksheet.mergeCells(`I${startRow}:I${startRow + 1}`);
  worksheet.mergeCells(`J${startRow}:J${startRow + 1}`);
  worksheet.mergeCells(`K${startRow}:K${startRow + 1}`);
};

const applyRowBorderRange = (worksheet, rowNumber, fromCol, toCol) => {
  for (let col = fromCol; col <= toCol; col += 1) {
    worksheet.getCell(rowNumber, col).border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' },
      bottom: { style: 'thin' },
    };
  }
};

const applyRowBorder = (worksheet, rowNumber) => {
  applyRowBorderRange(worksheet, rowNumber, 1, 12);
};

const getLatestMonthlyScheduleHeaderByStatus = async (
  selectedYear,
  selectedMonth,
  status,
  transaction = null
) => {
  const rows = await sequelizeMSQL.query(
    `
      SELECT TOP 1
        Schedule_Header_ID,
        Period_Year,
        Period_Month,
        Revision_No,
        [Status],
        Is_Locked,
        Period_Start,
        Period_End,
        Buffer_Start,
        Buffer_End,
        Requested_By,
        Requested_Date,
        Approved_By,
        Approved_Date,
        Rejected_By,
        Rejected_Date,
        Remarks,
        Created_By,
        Created_Date,
        Updated_By,
        Updated_Date
      FROM T_Monthly_Schedule_Header
      WHERE Period_Year = :year
        AND Period_Month = :month
        AND [Status] = :status
      ORDER BY Revision_No DESC, Schedule_Header_ID DESC
    `,
    {
      replacements: {
        year: normalizePeriodYear(selectedYear),
        month: normalizePeriodMonth(selectedMonth),
        status,
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return rows[0] || null;
};

const getLatestApprovedMonthlyScheduleHeader = (selectedYear, selectedMonth, transaction = null) =>
  getLatestMonthlyScheduleHeaderByStatus(
    selectedYear,
    selectedMonth,
    MONTHLY_SCHEDULE_STATUS.APPROVED,
    transaction
  );

const getLatestRequestedMonthlyScheduleHeader = (selectedYear, selectedMonth, transaction = null) =>
  getLatestMonthlyScheduleHeaderByStatus(
    selectedYear,
    selectedMonth,
    MONTHLY_SCHEDULE_STATUS.REQUESTED,
    transaction
  );

const getMonthlyScheduleHeaderById = async (scheduleHeaderId, transaction = null) => {
  const rows = await sequelizeMSQL.query(
    `
      SELECT
        Schedule_Header_ID,
        Period_Year,
        Period_Month,
        Revision_No,
        [Status],
        Is_Locked,
        Period_Start,
        Period_End,
        Buffer_Start,
        Buffer_End,
        Requested_By,
        Requested_Date,
        Approved_By,
        Approved_Date,
        Rejected_By,
        Rejected_Date,
        Remarks,
        Created_By,
        Created_Date,
        Updated_By,
        Updated_Date
      FROM T_Monthly_Schedule_Header
      WHERE Schedule_Header_ID = :scheduleHeaderId
    `,
    {
      replacements: { scheduleHeaderId },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return rows[0] || null;
};

const getMonthlyScheduleDetails = async (scheduleHeaderId, transaction = null) =>
  sequelizeMSQL.query(
    `
      SELECT
        Schedule_Detail_ID,
        Schedule_Header_ID,
        Line_No,
        QA_ID,
        Instrument_Name,
        Instrument_ID,
        Department,
        [Location],
        Due_Date,
        Tgl_Kalibrasi,
        Source_Date,
        Source_Match_Type,
        PIC,
        Checklist_S,
        Checklist_D,
        Checklist_M,
        Source_Table,
        Source_Key,
        Created_By,
        Created_Date,
        Updated_By,
        Updated_Date
      FROM T_Monthly_Schedule_Detail
      WHERE Schedule_Header_ID = :scheduleHeaderId
      ORDER BY Line_No, Schedule_Detail_ID
    `,
    {
      replacements: { scheduleHeaderId },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

const mapMonthlyScheduleRevisionInfo = (header) => {
  if (!header) return null;

  return {
    schedule_header_id: header.Schedule_Header_ID,
    year: header.Period_Year,
    month: header.Period_Month,
    revision_no: header.Revision_No,
    status: header.Status,
    is_locked: Boolean(header.Is_Locked),
    period_start: header.Period_Start,
    period_end: header.Period_End,
    buffer_start: header.Buffer_Start,
    buffer_end: header.Buffer_End,
    requested_by: header.Requested_By,
    requested_date: header.Requested_Date,
    approved_by: header.Approved_By,
    approved_date: header.Approved_Date,
    rejected_by: header.Rejected_By,
    rejected_date: header.Rejected_Date,
    remarks: header.Remarks,
    created_by: header.Created_By,
    created_date: header.Created_Date,
    updated_by: header.Updated_By,
    updated_date: header.Updated_Date,
  };
};

const getMonthlyScheduleRevisionState = async (selectedYear, selectedMonth, transaction = null) => {
  const currentHeader = await getLatestApprovedMonthlyScheduleHeader(
    selectedYear,
    selectedMonth,
    transaction
  );
  const requestedHeader = await getLatestRequestedMonthlyScheduleHeader(
    selectedYear,
    selectedMonth,
    transaction
  );

  return {
    currentHeader,
    requestedHeader,
    revisions: {
      current: mapMonthlyScheduleRevisionInfo(currentHeader),
      requested: mapMonthlyScheduleRevisionInfo(requestedHeader),
    },
  };
};

const mapMonthlyScheduleDetailRows = (details) => {
  const mapped = (details || []).map((item, index) => ({
    row_id: `DETAIL-${item.Schedule_Detail_ID || index + 1}`,
    schedule_detail_id: item.Schedule_Detail_ID,
    no: item.Line_No || index + 1,
    qa_id: item.QA_ID || '',
    assm_nama_instrumen: item.Instrument_Name || '',
    assm_no_identitas_istrumen: item.Instrument_ID || '',
    group_da_dept: item.Department || '',
    assm_lokasi: item.Location || '',
    category: getCategory(item.Instrument_ID),
    week: getWeekNumber(item.Source_Date || item.Due_Date || item.Tgl_Kalibrasi),
    pic: item.PIC || '',
    plan_due_date: item.Due_Date || null,
    tgl_kalibrasi: item.Tgl_Kalibrasi || null,
    realisasi_eksekusi: item.Tgl_Kalibrasi || null,
    source_date: item.Source_Date || null,
    source_match_type: item.Source_Match_Type || 'NONE',
    checklist_s: Boolean(item.Checklist_S),
    checklist_d: Boolean(item.Checklist_D),
    checklist_m: Boolean(item.Checklist_M),
    source_table: item.Source_Table || null,
    source_key: item.Source_Key || null,
    previous_pic: '',
    previous_checklist_s: false,
    previous_checklist_d: false,
    previous_checklist_m: false,
    is_new_row: false,
  }));

  sortMappedRows(mapped);
  return mapped.map((row, idx) => ({
    ...row,
    no: idx + 1,
  }));
};

const buildMonthlyScheduleSnapshotPayload = async (header, transaction = null) => {
  if (!header?.Schedule_Header_ID) return null;

  const details = await getMonthlyScheduleDetails(header.Schedule_Header_ID, transaction);
  let data = mapMonthlyScheduleDetailRows(details);
  const { revisions } = await getMonthlyScheduleRevisionState(
    header.Period_Year,
    header.Period_Month,
    transaction
  );

  if (header.Status === MONTHLY_SCHEDULE_STATUS.REQUESTED && revisions?.current?.schedule_header_id) {
    const approvedDetails = await getMonthlyScheduleDetails(
      revisions.current.schedule_header_id,
      transaction
    );
    const previousValueMap = createMonthlySchedulePreviousValueMap(
      mapMonthlyScheduleDetailRows(approvedDetails)
    );
    data = applyPreviousValuesToMonthlyRows(data, previousValueMap);
  }

  return {
    success: true,
    message: 'Revision fetched successfully',
    year: header.Period_Year,
    month: header.Period_Month,
    period_label: `${MONTH_NAMES_ID[header.Period_Month - 1]} ${header.Period_Year}`,
    buffer_days: BUFFER_DAYS,
    source_window: {
      period_start: header.Period_Start,
      period_end: header.Period_End,
      buffer_start: header.Buffer_Start,
      buffer_end: header.Buffer_End,
    },
    count: data.length,
    source: header.Status === MONTHLY_SCHEDULE_STATUS.REQUESTED ? 'requested' : 'snapshot',
    editable: header.Status === MONTHLY_SCHEDULE_STATUS.REQUESTED && !header.Is_Locked,
    snapshot: mapMonthlyScheduleRevisionInfo(header),
    revisions,
    rows: data,
  };
};

const buildMonthlyScheduleLivePayload = async (selectedYear, selectedMonth, transaction = null) => {
  const rawResults = await getMonthlyCalibrationData(
    selectedYear,
    selectedMonth,
    CALIBRATION_SCOPE.INTERNAL,
    transaction
  );
  let rows = mapMonthlyRows(rawResults, selectedYear, selectedMonth);
  const grouped = getGroupedData(rows);
  const { revisions } = await getMonthlyScheduleRevisionState(
    selectedYear,
    selectedMonth,
    transaction
  );
  const window = getMonthlyWindow(selectedYear, selectedMonth);

  if (revisions?.current?.schedule_header_id) {
    const approvedDetails = await getMonthlyScheduleDetails(
      revisions.current.schedule_header_id,
      transaction
    );
    const previousValueMap = createMonthlySchedulePreviousValueMap(
      mapMonthlyScheduleDetailRows(approvedDetails)
    );
    rows = applyPreviousValuesToMonthlyRows(rows, previousValueMap);
  }

  return {
    success: true,
    message: 'Data fetched successfully',
    year: selectedYear,
    month: selectedMonth,
    period_label: `${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear}`,
    buffer_days: BUFFER_DAYS,
    source_window: {
      period_start: window.periodStartISO,
      period_end: window.periodEndISO,
      buffer_start: window.bufferStartISO,
      buffer_end: window.bufferEndISO,
    },
    count: rows.length,
    source: 'live',
    editable: false,
    snapshot: null,
    revisions,
    rows,
    grouped,
  };
};

const insertMonthlyScheduleDetails = async (scheduleHeaderId, rows, userId, transaction) => {
  for (const item of rows) {
    await sequelizeMSQL.query(
      `
        INSERT INTO T_Monthly_Schedule_Detail
          (
            Schedule_Header_ID,
            Line_No,
            QA_ID,
            Instrument_Name,
            Instrument_ID,
            Department,
            [Location],
            Due_Date,
            Tgl_Kalibrasi,
            Source_Date,
            Source_Match_Type,
            PIC,
            Checklist_S,
            Checklist_D,
            Checklist_M,
            Source_Table,
            Source_Key,
            Created_By,
            Created_Date,
            Updated_By,
            Updated_Date
          )
        VALUES
          (
            :scheduleHeaderId,
            :lineNo,
            :qaId,
            :instrumentName,
            :instrumentId,
            :department,
            :location,
            :dueDate,
            :tglKalibrasi,
            :sourceDate,
            :sourceMatchType,
            :pic,
            :checklistS,
            :checklistD,
            :checklistM,
            :sourceTable,
            :sourceKey,
            :userId,
            GETDATE(),
            :userId,
            GETDATE()
          )
      `,
      {
        replacements: {
          scheduleHeaderId,
          lineNo: item.no,
          qaId: item.qa_id || null,
          instrumentName: item.assm_nama_instrumen || null,
          instrumentId: item.assm_no_identitas_istrumen || null,
          department: item.group_da_dept || null,
          location: item.assm_lokasi || null,
          dueDate: item.plan_due_date || null,
          tglKalibrasi: item.tgl_kalibrasi || null,
          sourceDate: item.source_date || item.plan_due_date || item.tgl_kalibrasi || null,
          sourceMatchType: item.source_match_type || 'NONE',
          pic: item.pic || null,
          checklistS: item.checklist_s ? 1 : 0,
          checklistD: item.checklist_d ? 1 : 0,
          checklistM: item.checklist_m ? 1 : 0,
          sourceTable: item.source_table || null,
          sourceKey: item.source_key || null,
          userId,
        },
        type: Sequelize.QueryTypes.INSERT,
        transaction,
      }
    );
  }
};

const getMasterJadwalBulananPreview = async (req, res, next) => {
  try {
    const selectedYear = parseYear(req.query.year);
    const selectedMonth = parseMonth(req.query.month);
    const source = ['live', 'requested', 'snapshot'].includes(req.query.source)
      ? req.query.source
      : 'snapshot';

    if (!selectedYear || !selectedMonth) {
      return res.status(400).json({
        success: false,
        message: 'Valid year and month query parameters are required',
      });
    }

    if (source === 'requested') {
      const requestedHeader = await getLatestRequestedMonthlyScheduleHeader(
        selectedYear,
        selectedMonth
      );
      if (requestedHeader) {
        const requestedPayload = await buildMonthlyScheduleSnapshotPayload(requestedHeader);
        return res.status(200).json(requestedPayload);
      }
    } else if (source !== 'live') {
      const currentHeader = await getLatestApprovedMonthlyScheduleHeader(
        selectedYear,
        selectedMonth
      );
      if (currentHeader) {
        const currentPayload = await buildMonthlyScheduleSnapshotPayload(currentHeader);
        return res.status(200).json(currentPayload);
      }

      const requestedHeader = await getLatestRequestedMonthlyScheduleHeader(
        selectedYear,
        selectedMonth
      );
      if (requestedHeader) {
        const requestedPayload = await buildMonthlyScheduleSnapshotPayload(requestedHeader);
        return res.status(200).json(requestedPayload);
      }
    }

    const livePayload = await buildMonthlyScheduleLivePayload(selectedYear, selectedMonth);
    return res.status(200).json(livePayload);
  } catch (error) {
    console.error('Error in getMasterJadwalBulananPreview:', error);
    next(error);
  }
};

const saveMasterJadwalBulanan = async (req, res, next) => {
  try {
    const scheduleHeaderId = Number(req.body?.schedule_header_id || req.query?.schedule_header_id);
    const selectedYear = parseYear(req.body?.year || req.query?.year);
    const selectedMonth = parseMonth(req.body?.month || req.query?.month);
    const incomingRows = normalizeIncomingRows(req.body?.rows);
    const { user_id } = req.user || {};

    if (!scheduleHeaderId && (!selectedYear || !selectedMonth)) {
      return res.status(400).json({
        success: false,
        message: 'Schedule header ID or valid year and month are required',
      });
    }

    if (!incomingRows.length) {
      return res.status(400).json({
        success: false,
        message: 'No schedule rows were provided.',
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
      if (scheduleHeaderId) {
        header = await getMonthlyScheduleHeaderById(scheduleHeaderId, transaction);
      } else {
        header = await getLatestRequestedMonthlyScheduleHeader(
          selectedYear,
          selectedMonth,
          transaction
        );
      }

      if (!header) {
        const error = new Error('No requested monthly schedule revision is available to save.');
        error.status = 404;
        throw error;
      }

      if (
        header.Status !== MONTHLY_SCHEDULE_STATUS.REQUESTED
        || Boolean(header.Is_Locked)
      ) {
        const error = new Error('The selected monthly schedule period is locked and cannot be edited.');
        error.status = 409;
        throw error;
      }

      for (const item of incomingRows) {
        await sequelizeMSQL.query(
          `
            UPDATE T_Monthly_Schedule_Detail
            SET
              PIC = :pic,
              Checklist_S = :checklistS,
              Checklist_D = :checklistD,
              Checklist_M = :checklistM,
              Updated_By = :userId,
              Updated_Date = GETDATE()
            WHERE Schedule_Header_ID = :scheduleHeaderId
              AND (
                Schedule_Detail_ID = :scheduleDetailId
                OR (
                  :scheduleDetailId IS NULL
                  AND ISNULL(Source_Key, '') = ISNULL(:sourceKey, '')
                  AND ISNULL(Instrument_ID, '') = ISNULL(:instrumentId, '')
                )
              )
          `,
          {
            replacements: {
              scheduleHeaderId: header.Schedule_Header_ID,
              scheduleDetailId: item.schedule_detail_id,
              sourceKey: item.source_key || null,
              instrumentId: item.assm_no_identitas_istrumen || null,
              pic: item.pic || null,
              checklistS: item.checklist_s ? 1 : 0,
              checklistD: item.checklist_d ? 1 : 0,
              checklistM: item.checklist_m ? 1 : 0,
              userId: user_id,
            },
            type: Sequelize.QueryTypes.UPDATE,
            transaction,
          }
        );
      }

      await sequelizeMSQL.query(
        `
          UPDATE T_Monthly_Schedule_Header
          SET
            Updated_By = :userId,
            Updated_Date = GETDATE()
          WHERE Schedule_Header_ID = :scheduleHeaderId
        `,
        {
          replacements: {
            scheduleHeaderId: header.Schedule_Header_ID,
            userId: user_id,
          },
          type: Sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );

      const refreshedHeader = await getMonthlyScheduleHeaderById(
        header.Schedule_Header_ID,
        transaction
      );
      return buildMonthlyScheduleSnapshotPayload(refreshedHeader, transaction);
    });

    return res.status(200).json({
      ...payload,
      message: 'Monthly schedule draft has been saved.',
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    console.error('Error in saveMasterJadwalBulanan:', error);
    next(error);
  }
};

const requestMasterJadwalBulananApproval = async (req, res, next) => {
  try {
    const selectedYear = parseYear(req.body?.year || req.query?.year);
    const selectedMonth = parseMonth(req.body?.month || req.query?.month);
    const remarks = req.body?.remarks || null;
    const { user_id } = req.user || {};

    if (!selectedYear || !selectedMonth) {
      return res.status(400).json({
        success: false,
        message: 'Valid year and month are required',
      });
    }

    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: 'User is not authenticated',
      });
    }

    const livePayload = await buildMonthlyScheduleLivePayload(selectedYear, selectedMonth);
    if (!livePayload.rows.length) {
      return res.status(400).json({
        success: false,
        message: 'No monthly schedule data is available to request approval.',
      });
    }

    const snapshotPayload = await sequelizeMSQL.transaction(async (transaction) => {
      const existingRequested = await sequelizeMSQL.query(
        `
          SELECT TOP 1 Schedule_Header_ID
          FROM T_Monthly_Schedule_Header WITH (UPDLOCK, HOLDLOCK)
          WHERE Period_Year = :year
            AND Period_Month = :month
            AND [Status] = 'REQUESTED'
          ORDER BY Revision_No DESC, Schedule_Header_ID DESC
        `,
        {
          replacements: {
            year: normalizePeriodYear(selectedYear),
            month: normalizePeriodMonth(selectedMonth),
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      if (existingRequested.length) {
        const error = new Error('A monthly schedule revision is already waiting for approval.');
        error.status = 409;
        throw error;
      }

      await sequelizeMSQL.query(
        `
          DELETE FROM T_Monthly_Schedule_Header
          WHERE Period_Year = :year
            AND Period_Month = :month
            AND [Status] IN ('REJECTED', 'SUPERSEDED')
        `,
        {
          replacements: {
            year: normalizePeriodYear(selectedYear),
            month: normalizePeriodMonth(selectedMonth),
          },
          type: Sequelize.QueryTypes.DELETE,
          transaction,
        }
      );

      const revisionRows = await sequelizeMSQL.query(
        `
          SELECT ISNULL(MAX(Revision_No), 0) + 1 AS NextRevision
          FROM T_Monthly_Schedule_Header WITH (UPDLOCK, HOLDLOCK)
          WHERE Period_Year = :year
            AND Period_Month = :month
            AND [Status] = 'APPROVED'
        `,
        {
          replacements: {
            year: normalizePeriodYear(selectedYear),
            month: normalizePeriodMonth(selectedMonth),
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const revisionNo = revisionRows[0]?.NextRevision || 1;
      const window = getMonthlyWindow(selectedYear, selectedMonth);
      const headerRows = await sequelizeMSQL.query(
        `
          DECLARE @InsertedHeader TABLE
          (
            Schedule_Header_ID INT,
            Period_Year INT,
            Period_Month INT,
            Revision_No INT,
            [Status] VARCHAR(20),
            Is_Locked BIT,
            Period_Start DATE,
            Period_End DATE,
            Buffer_Start DATE,
            Buffer_End DATE,
            Requested_By NVARCHAR(50),
            Requested_Date DATETIME2(0),
            Approved_By NVARCHAR(50),
            Approved_Date DATETIME2(0),
            Rejected_By NVARCHAR(50),
            Rejected_Date DATETIME2(0),
            Remarks NVARCHAR(MAX),
            Created_By NVARCHAR(50),
            Created_Date DATETIME2(0),
            Updated_By NVARCHAR(50),
            Updated_Date DATETIME2(0)
          );

          INSERT INTO T_Monthly_Schedule_Header
            (
              Period_Year,
              Period_Month,
              Revision_No,
              [Status],
              Is_Locked,
              Period_Start,
              Period_End,
              Buffer_Start,
              Buffer_End,
              Requested_By,
              Requested_Date,
              Remarks,
              Created_By,
              Created_Date,
              Updated_By,
              Updated_Date
            )
          OUTPUT
            INSERTED.Schedule_Header_ID,
            INSERTED.Period_Year,
            INSERTED.Period_Month,
            INSERTED.Revision_No,
            INSERTED.[Status],
            INSERTED.Is_Locked,
            INSERTED.Period_Start,
            INSERTED.Period_End,
            INSERTED.Buffer_Start,
            INSERTED.Buffer_End,
            INSERTED.Requested_By,
            INSERTED.Requested_Date,
            INSERTED.Approved_By,
            INSERTED.Approved_Date,
            INSERTED.Rejected_By,
            INSERTED.Rejected_Date,
            INSERTED.Remarks,
            INSERTED.Created_By,
            INSERTED.Created_Date,
            INSERTED.Updated_By,
            INSERTED.Updated_Date
          INTO @InsertedHeader
          VALUES
            (
              :year,
              :month,
              :revisionNo,
              'REQUESTED',
              0,
              :periodStart,
              :periodEnd,
              :bufferStart,
              :bufferEnd,
              :userId,
              GETDATE(),
              :remarks,
              :userId,
              GETDATE(),
              :userId,
              GETDATE()
            );

          SELECT
            Schedule_Header_ID,
            Period_Year,
            Period_Month,
            Revision_No,
            [Status],
            Is_Locked,
            Period_Start,
            Period_End,
            Buffer_Start,
            Buffer_End,
            Requested_By,
            Requested_Date,
            Approved_By,
            Approved_Date,
            Rejected_By,
            Rejected_Date,
            Remarks,
            Created_By,
            Created_Date,
            Updated_By,
            Updated_Date
          FROM @InsertedHeader;
        `,
        {
          replacements: {
            year: normalizePeriodYear(selectedYear),
            month: normalizePeriodMonth(selectedMonth),
            revisionNo,
            periodStart: window.periodStartISO,
            periodEnd: window.periodEndISO,
            bufferStart: window.bufferStartISO,
            bufferEnd: window.bufferEndISO,
            userId: user_id,
            remarks,
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );

      const header = headerRows[0];
      await insertMonthlyScheduleDetails(header.Schedule_Header_ID, livePayload.rows, user_id, transaction);
      return buildMonthlyScheduleSnapshotPayload(header, transaction);
    });

    return res.status(201).json({
      ...snapshotPayload,
      message: 'Monthly schedule revision has been submitted for approval.',
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    console.error('Error in requestMasterJadwalBulananApproval:', error);
    next(error);
  }
};

const approveMasterJadwalBulanan = async (req, res, next) => {
  try {
    const scheduleHeaderId = Number(req.body?.schedule_header_id || req.query?.schedule_header_id);
    const selectedYear = parseYear(req.body?.year || req.query?.year);
    const selectedMonth = parseMonth(req.body?.month || req.query?.month);
    const remarks = req.body?.remarks || null;
    const { user_id } = req.user || {};

    if (!scheduleHeaderId && (!selectedYear || !selectedMonth)) {
      return res.status(400).json({
        success: false,
        message: 'Schedule header ID or valid year and month are required',
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
      if (scheduleHeaderId) {
        header = await getMonthlyScheduleHeaderById(scheduleHeaderId, transaction);
      } else {
        header = await getLatestRequestedMonthlyScheduleHeader(
          selectedYear,
          selectedMonth,
          transaction
        );
      }

      if (!header) {
        const error = new Error('No monthly schedule revision is waiting for approval.');
        error.status = 404;
        throw error;
      }

      if (header.Status !== MONTHLY_SCHEDULE_STATUS.REQUESTED) {
        const error = new Error('Only requested monthly schedule revisions can be approved.');
        error.status = 400;
        throw error;
      }

      await sequelizeMSQL.query(
        `
          UPDATE T_Monthly_Schedule_Header
          SET
            [Status] = 'SUPERSEDED',
            Is_Locked = 1,
            Updated_By = :userId,
            Updated_Date = GETDATE()
          WHERE Period_Year = :year
            AND Period_Month = :month
            AND [Status] = 'APPROVED'
            AND Schedule_Header_ID <> :scheduleHeaderId
        `,
        {
          replacements: {
            year: header.Period_Year,
            month: header.Period_Month,
            scheduleHeaderId: header.Schedule_Header_ID,
            userId: user_id,
          },
          type: Sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );

      await sequelizeMSQL.query(
        `
          UPDATE T_Monthly_Schedule_Header
          SET
            [Status] = 'APPROVED',
            Is_Locked = 1,
            Approved_By = :userId,
            Approved_Date = GETDATE(),
            Remarks = COALESCE(:remarks, Remarks),
            Updated_By = :userId,
            Updated_Date = GETDATE()
          WHERE Schedule_Header_ID = :scheduleHeaderId
        `,
        {
          replacements: {
            scheduleHeaderId: header.Schedule_Header_ID,
            userId: user_id,
            remarks,
          },
          type: Sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );

      const approvedHeader = await getMonthlyScheduleHeaderById(
        header.Schedule_Header_ID,
        transaction
      );
      return buildMonthlyScheduleSnapshotPayload(approvedHeader, transaction);
    });

    return res.status(200).json({
      ...payload,
      message: 'Monthly schedule has been approved.',
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    console.error('Error in approveMasterJadwalBulanan:', error);
    next(error);
  }
};

const rejectMasterJadwalBulanan = async (req, res, next) => {
  try {
    const scheduleHeaderId = Number(req.body?.schedule_header_id || req.query?.schedule_header_id);
    const selectedYear = parseYear(req.body?.year || req.query?.year);
    const selectedMonth = parseMonth(req.body?.month || req.query?.month);
    const remarks = req.body?.remarks || null;
    const { user_id } = req.user || {};

    if (!scheduleHeaderId && (!selectedYear || !selectedMonth)) {
      return res.status(400).json({
        success: false,
        message: 'Schedule header ID or valid year and month are required',
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
      if (scheduleHeaderId) {
        header = await getMonthlyScheduleHeaderById(scheduleHeaderId, transaction);
      } else {
        header = await getLatestRequestedMonthlyScheduleHeader(
          selectedYear,
          selectedMonth,
          transaction
        );
      }

      if (!header) {
        const error = new Error('No monthly schedule revision is waiting for approval.');
        error.status = 404;
        throw error;
      }

      if (header.Status !== MONTHLY_SCHEDULE_STATUS.REQUESTED) {
        const error = new Error('Only requested monthly schedule revisions can be rejected.');
        error.status = 400;
        throw error;
      }

      await sequelizeMSQL.query(
        `
          UPDATE T_Monthly_Schedule_Header
          SET
            [Status] = 'REJECTED',
            Is_Locked = 0,
            Rejected_By = :userId,
            Rejected_Date = GETDATE(),
            Remarks = COALESCE(:remarks, Remarks),
            Updated_By = :userId,
            Updated_Date = GETDATE()
          WHERE Schedule_Header_ID = :scheduleHeaderId
        `,
        {
          replacements: {
            scheduleHeaderId: header.Schedule_Header_ID,
            userId: user_id,
            remarks,
          },
          type: Sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );

      await sequelizeMSQL.query(
        `
          DELETE FROM T_Monthly_Schedule_Header
          WHERE Schedule_Header_ID = :scheduleHeaderId
        `,
        {
          replacements: {
            scheduleHeaderId: header.Schedule_Header_ID,
          },
          type: Sequelize.QueryTypes.DELETE,
          transaction,
        }
      );

      const currentHeader = await getLatestApprovedMonthlyScheduleHeader(
        header.Period_Year,
        header.Period_Month,
        transaction
      );
      if (currentHeader) {
        return buildMonthlyScheduleSnapshotPayload(currentHeader, transaction);
      }

      return buildMonthlyScheduleLivePayload(
        header.Period_Year,
        header.Period_Month,
        transaction
      );
    });

    return res.status(200).json({
      ...payload,
      message: 'Monthly schedule revision has been rejected.',
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    console.error('Error in rejectMasterJadwalBulanan:', error);
    next(error);
  }
};

const exportMasterJadwalBulanan = async (req, res, next) => {
  try {
    const yearParam = req.body?.year ?? req.query?.year;
    const monthParam = req.body?.month ?? req.query?.month;
    const source = ['live', 'requested', 'snapshot'].includes(req.body?.source || req.query?.source)
      ? (req.body?.source || req.query?.source)
      : 'snapshot';

    const selectedYear = parseYear(yearParam);
    const selectedMonth = parseMonth(monthParam);

    if (!selectedYear || !selectedMonth) {
      return res.status(400).json({
        success: false,
        message: 'Valid year and month are required',
      });
    }

    let rows = normalizeIncomingRows(req.body?.rows);
    let snapshotHeader = null;

    if (!rows.length) {
      if (source === 'requested') {
        snapshotHeader = await getLatestRequestedMonthlyScheduleHeader(selectedYear, selectedMonth);
      } else if (source !== 'live') {
        snapshotHeader = await getLatestApprovedMonthlyScheduleHeader(selectedYear, selectedMonth);
        if (!snapshotHeader) {
          snapshotHeader = await getLatestRequestedMonthlyScheduleHeader(selectedYear, selectedMonth);
        }
      }

      if (snapshotHeader) {
        const details = await getMonthlyScheduleDetails(snapshotHeader.Schedule_Header_ID);
        rows = mapMonthlyScheduleDetailRows(details);
      } else {
        const rawResults = await getMonthlyCalibrationData(
          selectedYear,
          selectedMonth,
          CALIBRATION_SCOPE.INTERNAL
        );
        rows = mapMonthlyRows(rawResults, selectedYear, selectedMonth);
      }
    }

    sortMappedRows(rows);
    rows = rows.map((row, idx) => ({ ...row, no: idx + 1 }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Jadwal-${selectedMonth}-${selectedYear}`);

    worksheet.columns = [
      { width: 6 },  // No
      { width: 48 }, // Nama Alat
      { width: 14 }, // ID
      { width: 14 }, // Bagian
      { width: 34 }, // Lokasi
      { width: 14 }, // PIC
      { width: 16 }, // Due Date
      { width: 16 }, // Tgl Kalibrasi
      { width: 16 }, // Source Date
      { width: 4 },  // S
      { width: 4 },  // D
      { width: 4 },  // M
    ];

    worksheet.mergeCells('A1:L1');
    worksheet.getCell('A1').value = snapshotHeader
      ? `JADWAL BULANAN KALIBRASI - ${MONTH_NAMES_ID[selectedMonth - 1].toUpperCase()} ${selectedYear} REV ${snapshotHeader.Revision_No} (${snapshotHeader.Status})`
      : `JADWAL BULANAN KALIBRASI - ${MONTH_NAMES_ID[selectedMonth - 1].toUpperCase()} ${selectedYear}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    writeTableHeader(worksheet, 2);
    worksheet.views = [{ state: 'frozen', ySplit: 3 }];

    let currentRow = 4;
    for (const rowItem of rows) {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = rowItem.no;
      row.getCell(2).value = rowItem.assm_nama_instrumen || '';
      row.getCell(3).value = rowItem.assm_no_identitas_istrumen || '';
      row.getCell(4).value = rowItem.group_da_dept || '';
      row.getCell(5).value = rowItem.assm_lokasi || '';
      row.getCell(6).value = rowItem.pic || '';
      row.getCell(7).value = formatDateDisplay(rowItem.plan_due_date);
      row.getCell(8).value = formatDateDisplay(rowItem.tgl_kalibrasi);
      row.getCell(9).value = formatDateDisplay(rowItem.source_date);
      row.getCell(10).value = rowItem.checklist_s ? CHECKMARK_SYMBOL : '';
      row.getCell(11).value = rowItem.checklist_d ? CHECKMARK_SYMBOL : '';
      row.getCell(12).value = rowItem.checklist_m ? CHECKMARK_SYMBOL : '';

      row.height = 20;
      row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      applyRowBorder(worksheet, currentRow);
      currentRow += 1;
    }

    const lastRow = Math.max(currentRow - 1, 3);
    worksheet.autoFilter = `A2:I${lastRow}`;

    const fileName = `Master-Jadwal-Bulanan-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (error) {
    console.error('Error in exportMasterJadwalBulanan:', error);
    next(error);
  }
};

const getNextPeriodConfig = (selectedYear, selectedMonth) => {
  const isDecember = Number(selectedMonth) === 12;
  return {
    year: isDecember ? Number(selectedYear) + 1 : Number(selectedYear),
    month: isDecember ? 1 : Number(selectedMonth) + 1,
  };
};

const getExternalPeriodKey = (year, month) =>
  `${normalizePeriodYear(year)}-${normalizePeriodMonth(month)}`;

const mapExternalLiveRowsForPeriod = (results, year, month, periodLabel) => {
  const rows = mapMonthlyExternalRows(results);
  return rows.map((row, index) => ({
    ...row,
    schedule_detail_id: null,
    no: index + 1,
    row_id: `${getExternalPeriodKey(year, month)}-${row.row_id || index + 1}`,
    due_date: row.jatuh_tempo || null,
    calibration_date: row.tgl_kalibrasi || null,
    insitu_date: row.tgl_eksekusi_insitu || null,
    user_equipment_handover_date: row.tgl_penyerahan_alat_oleh_user || null,
    equipment_return_by_vendor_date: row.tgl_pengembalian_alat_oleh_vn || null,
    realization_date: row.realisasi || null,
    remarks: row.keterangan || '',
    _period_key: getExternalPeriodKey(year, month),
    _period_year: normalizePeriodYear(year),
    _period_month: normalizePeriodMonth(month),
    _period_label: periodLabel,
  }));
};

const getLatestExternalHeaderByStatus = async (
  selectedYear,
  selectedMonth,
  status,
  transaction = null
) => {
  const rows = await sequelizeMSQL.query(
    `
      SELECT TOP 1
        Schedule_External_Header_ID,
        Base_Period_Year,
        Base_Period_Month,
        Revision_No,
        [Status],
        Is_Locked,
        Requested_By,
        Requested_Date,
        Approved_By,
        Approved_Date,
        Rejected_By,
        Rejected_Date,
        Remarks,
        Created_By,
        Created_Date,
        Updated_By,
        Updated_Date
      FROM T_Monthly_Schedule_External_Header
      WHERE Base_Period_Year = :year
        AND Base_Period_Month = :month
        AND [Status] = :status
      ORDER BY Revision_No DESC, Schedule_External_Header_ID DESC
    `,
    {
      replacements: {
        year: normalizePeriodYear(selectedYear),
        month: normalizePeriodMonth(selectedMonth),
        status,
      },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

  return rows[0] || null;
};

const getLatestApprovedExternalHeader = (selectedYear, selectedMonth, transaction = null) =>
  getLatestExternalHeaderByStatus(
    selectedYear,
    selectedMonth,
    EXTERNAL_MONTHLY_SCHEDULE_STATUS.APPROVED,
    transaction
  );

const getLatestRequestedExternalHeader = (selectedYear, selectedMonth, transaction = null) =>
  getLatestExternalHeaderByStatus(
    selectedYear,
    selectedMonth,
    EXTERNAL_MONTHLY_SCHEDULE_STATUS.REQUESTED,
    transaction
  );

const getExternalHeaderById = async (scheduleHeaderId, transaction = null) => {
  const rows = await sequelizeMSQL.query(
    `
      SELECT
        Schedule_External_Header_ID,
        Base_Period_Year,
        Base_Period_Month,
        Revision_No,
        [Status],
        Is_Locked,
        Requested_By,
        Requested_Date,
        Approved_By,
        Approved_Date,
        Rejected_By,
        Rejected_Date,
        Remarks,
        Created_By,
        Created_Date,
        Updated_By,
        Updated_Date
      FROM T_Monthly_Schedule_External_Header
      WHERE Schedule_External_Header_ID = :scheduleHeaderId
    `,
    {
      replacements: { scheduleHeaderId },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );
  return rows[0] || null;
};

const getExternalDetails = async (scheduleHeaderId, transaction = null) =>
  sequelizeMSQL.query(
    `
      SELECT
        Schedule_External_Detail_ID,
        Schedule_External_Header_ID,
        Line_No,
        Schedule_Period_Year,
        Schedule_Period_Month,
        QA_ID,
        Instrument_Name,
        Instrument_ID,
        Department,
        [Location],
        Due_Date,
        Calibration_Date,
        Insitu_Date,
        User_Equipment_Handover_Date,
        Equipment_Return_By_Vendor_Date,
        Realization_Date,
        Remarks,
        Source_Table,
        Source_Key
      FROM T_Monthly_Schedule_External_Detail
      WHERE Schedule_External_Header_ID = :scheduleHeaderId
      ORDER BY Schedule_Period_Year, Schedule_Period_Month, Line_No, Schedule_External_Detail_ID
    `,
    {
      replacements: { scheduleHeaderId },
      type: Sequelize.QueryTypes.SELECT,
      transaction,
    }
  );

const mapExternalRevisionInfo = (header) => {
  if (!header) return null;
  return {
    schedule_header_id: header.Schedule_External_Header_ID,
    year: header.Base_Period_Year,
    month: header.Base_Period_Month,
    revision_no: header.Revision_No,
    status: header.Status,
    is_locked: Boolean(header.Is_Locked),
    requested_by: header.Requested_By,
    requested_date: header.Requested_Date,
    approved_by: header.Approved_By,
    approved_date: header.Approved_Date,
    rejected_by: header.Rejected_By,
    rejected_date: header.Rejected_Date,
    remarks: header.Remarks,
    created_by: header.Created_By,
    created_date: header.Created_Date,
    updated_by: header.Updated_By,
    updated_date: header.Updated_Date,
  };
};

const getExternalRevisionState = async (selectedYear, selectedMonth, transaction = null) => {
  const currentHeader = await getLatestApprovedExternalHeader(
    selectedYear,
    selectedMonth,
    transaction
  );
  const requestedHeader = await getLatestRequestedExternalHeader(
    selectedYear,
    selectedMonth,
    transaction
  );

  return {
    currentHeader,
    requestedHeader,
    revisions: {
      current: mapExternalRevisionInfo(currentHeader),
      requested: mapExternalRevisionInfo(requestedHeader),
    },
  };
};

const mapExternalSnapshotRows = (details = [], baseYear, baseMonth) => {
  const baseKey = getExternalPeriodKey(baseYear, baseMonth);
  const nextPeriod = getNextPeriodConfig(baseYear, Number(baseMonth));
  const nextKey = getExternalPeriodKey(nextPeriod.year, nextPeriod.month);

  return details.map((item, index) => {
    const periodYear = item.Schedule_Period_Year || normalizePeriodYear(baseYear);
    const periodMonth = item.Schedule_Period_Month || normalizePeriodMonth(baseMonth);
    const periodKey = `${periodYear}-${periodMonth}`;
    const periodLabel = `${MONTH_NAMES_ID[Number(periodMonth) - 1]} ${periodYear}`;

    return {
      row_id: `${periodKey}-DETAIL-${item.Schedule_External_Detail_ID || index + 1}`,
      schedule_detail_id: item.Schedule_External_Detail_ID,
      no: item.Line_No || index + 1,
      qa_id: item.QA_ID || '',
      assm_nama_instrumen: item.Instrument_Name || '',
      assm_no_identitas_istrumen: item.Instrument_ID || '',
      group_da_dept: item.Department || '',
      assm_lokasi: item.Location || '',
      due_date: item.Due_Date || null,
      calibration_date: item.Calibration_Date || null,
      insitu_date: item.Insitu_Date || null,
      user_equipment_handover_date: item.User_Equipment_Handover_Date || null,
      equipment_return_by_vendor_date: item.Equipment_Return_By_Vendor_Date || null,
      realization_date: item.Realization_Date || null,
      remarks: item.Remarks || '',
      source_table: item.Source_Table || null,
      source_key: item.Source_Key || null,
      _period_key: periodKey,
      _period_year: periodYear,
      _period_month: periodMonth,
      _period_label: periodLabel,
      _is_current_period: periodKey === baseKey,
      _is_next_period: periodKey === nextKey,
    };
  });
};

const buildExternalLivePayload = async (selectedYear, selectedMonth, transaction = null) => {
  const nextPeriod = getNextPeriodConfig(selectedYear, selectedMonth);
  const currentResults = await getMonthlyCalibrationData(
    selectedYear,
    selectedMonth,
    CALIBRATION_SCOPE.EXTERNAL,
    transaction
  );
  const nextResults = await getMonthlyCalibrationData(
    nextPeriod.year,
    nextPeriod.month,
    CALIBRATION_SCOPE.EXTERNAL,
    transaction
  );

  const currentLabel = `${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear}`;
  const nextLabel = `${MONTH_NAMES_ID[nextPeriod.month - 1]} ${nextPeriod.year}`;
  const currentRows = mapExternalLiveRowsForPeriod(
    currentResults,
    selectedYear,
    selectedMonth,
    currentLabel
  );
  const nextRows = mapExternalLiveRowsForPeriod(
    nextResults,
    nextPeriod.year,
    nextPeriod.month,
    nextLabel
  );
  const rows = [...currentRows, ...nextRows];
  const { revisions } = await getExternalRevisionState(
    selectedYear,
    selectedMonth,
    transaction
  );

  return {
    success: true,
    message: 'External monthly schedule data fetched successfully',
    year: normalizePeriodYear(selectedYear),
    month: normalizePeriodMonth(selectedMonth),
    period_label: currentLabel,
    next_period_label: nextLabel,
    count: rows.length,
    source: 'live',
    editable: false,
    snapshot: null,
    revisions,
    rows,
  };
};

const buildExternalSnapshotPayload = async (header, transaction = null) => {
  if (!header?.Schedule_External_Header_ID) return null;
  const details = await getExternalDetails(header.Schedule_External_Header_ID, transaction);
  const rows = mapExternalSnapshotRows(
    details,
    header.Base_Period_Year,
    header.Base_Period_Month
  );
  const { revisions } = await getExternalRevisionState(
    header.Base_Period_Year,
    header.Base_Period_Month,
    transaction
  );
  const nextPeriod = getNextPeriodConfig(
    Number(header.Base_Period_Year),
    Number(header.Base_Period_Month)
  );

  return {
    success: true,
    message: 'External monthly schedule revision fetched successfully',
    year: header.Base_Period_Year,
    month: header.Base_Period_Month,
    period_label: `${MONTH_NAMES_ID[Number(header.Base_Period_Month) - 1]} ${header.Base_Period_Year}`,
    next_period_label: `${MONTH_NAMES_ID[nextPeriod.month - 1]} ${nextPeriod.year}`,
    count: rows.length,
    source: header.Status === 'REQUESTED' ? 'requested' : 'snapshot',
    editable: header.Status === 'REQUESTED' && !header.Is_Locked,
    snapshot: mapExternalRevisionInfo(header),
    revisions,
    rows,
  };
};

const getMasterJadwalBulananExternalPreview = async (req, res, next) => {
  try {
    const selectedYear = parseYear(req.query.year);
    const selectedMonth = parseMonth(req.query.month);
    const source = ['live', 'requested', 'snapshot'].includes(req.query.source)
      ? req.query.source
      : 'snapshot';

    if (!selectedYear || !selectedMonth) {
      return res.status(400).json({
        success: false,
        message: 'Valid year and month query parameters are required',
      });
    }

    if (source === 'requested') {
      const requestedHeader = await getLatestRequestedExternalHeader(
        selectedYear,
        selectedMonth
      );
      if (requestedHeader) {
        return res.status(200).json(
          await buildExternalSnapshotPayload(requestedHeader)
        );
      }
    } else if (source !== 'live') {
      const currentHeader = await getLatestApprovedExternalHeader(
        selectedYear,
        selectedMonth
      );
      if (currentHeader) {
        return res.status(200).json(
          await buildExternalSnapshotPayload(currentHeader)
        );
      }

      const requestedHeader = await getLatestRequestedExternalHeader(
        selectedYear,
        selectedMonth
      );
      if (requestedHeader) {
        return res.status(200).json(
          await buildExternalSnapshotPayload(requestedHeader)
        );
      }
    }

    return res
      .status(200)
      .json(await buildExternalLivePayload(selectedYear, selectedMonth));
  } catch (error) {
    console.error('Error in getMasterJadwalBulananExternalPreview:', error);
    next(error);
  }
};

const normalizeIncomingExternalWorkflowRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((item, index) => ({
    row_id: item?.row_id || `ROW-EXTERNAL-${index + 1}`,
    schedule_detail_id: Number(item?.schedule_detail_id) || null,
    no: Number(item?.no) || index + 1,
    qa_id: item?.qa_id || '',
    assm_nama_instrumen: item?.assm_nama_instrumen || '',
    assm_no_identitas_istrumen: item?.assm_no_identitas_istrumen || '',
    group_da_dept: item?.group_da_dept || '',
    assm_lokasi: item?.assm_lokasi || '',
    due_date: formatDateISO(item?.due_date || item?.jatuh_tempo || item?.plan_due_date),
    calibration_date: formatDateISO(item?.calibration_date || item?.tgl_kalibrasi),
    insitu_date: formatDateISO(item?.insitu_date || item?.tgl_eksekusi_insitu),
    user_equipment_handover_date: formatDateISO(
      item?.user_equipment_handover_date || item?.tgl_penyerahan_alat_oleh_user
    ),
    equipment_return_by_vendor_date: formatDateISO(
      item?.equipment_return_by_vendor_date || item?.tgl_pengembalian_alat_oleh_vn
    ),
    realization_date: formatDateISO(item?.realization_date || item?.realisasi),
    remarks: String(item?.remarks ?? item?.keterangan ?? '').trim(),
    source_table: item?.source_table || null,
    source_key: item?.source_key || null,
    _period_key: item?._period_key || null,
    _period_year: item?._period_year || null,
    _period_month: item?._period_month || null,
    _period_label: item?._period_label || null,
  }));
};

const saveMasterJadwalBulananExternal = async (req, res, next) => {
  try {
    const scheduleHeaderId = Number(req.body?.schedule_header_id || req.query?.schedule_header_id);
    const selectedYear = parseYear(req.body?.year || req.query?.year);
    const selectedMonth = parseMonth(req.body?.month || req.query?.month);
    const incomingRows = normalizeIncomingExternalWorkflowRows(req.body?.rows);
    const { user_id } = req.user || {};

    if (!scheduleHeaderId && (!selectedYear || !selectedMonth)) {
      return res.status(400).json({
        success: false,
        message: 'Schedule header ID or valid year and month are required',
      });
    }
    if (!incomingRows.length) {
      return res.status(400).json({
        success: false,
        message: 'No external schedule rows were provided.',
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
      if (scheduleHeaderId) {
        header = await getExternalHeaderById(scheduleHeaderId, transaction);
      } else {
        header = await getLatestRequestedExternalHeader(
          selectedYear,
          selectedMonth,
          transaction
        );
      }
      if (!header) {
        const error = new Error('No requested external monthly schedule revision is available to save.');
        error.status = 404;
        throw error;
      }
      if (header.Status !== 'REQUESTED' || Boolean(header.Is_Locked)) {
        const error = new Error('The selected external monthly schedule period is locked and cannot be edited.');
        error.status = 409;
        throw error;
      }

      for (const item of incomingRows) {
        await sequelizeMSQL.query(
          `
            UPDATE T_Monthly_Schedule_External_Detail
            SET
              Insitu_Date = :insituDate,
              User_Equipment_Handover_Date = :userEquipmentHandoverDate,
              Equipment_Return_By_Vendor_Date = :equipmentReturnByVendorDate,
              Remarks = :remarks,
              Updated_By = :userId,
              Updated_Date = GETDATE()
            WHERE Schedule_External_Header_ID = :scheduleHeaderId
              AND (
                Schedule_External_Detail_ID = :scheduleDetailId
                OR (
                  :scheduleDetailId IS NULL
                  AND ISNULL(Source_Key, '') = ISNULL(:sourceKey, '')
                  AND ISNULL(Instrument_ID, '') = ISNULL(:instrumentId, '')
                  AND ISNULL(Schedule_Period_Year, '') = ISNULL(:periodYear, '')
                  AND ISNULL(Schedule_Period_Month, '') = ISNULL(:periodMonth, '')
                )
              )
          `,
          {
            replacements: {
              scheduleHeaderId: header.Schedule_External_Header_ID,
              scheduleDetailId: item.schedule_detail_id,
              sourceKey: item.source_key || null,
              instrumentId: item.assm_no_identitas_istrumen || null,
              periodYear: item._period_year || null,
              periodMonth: item._period_month || null,
              insituDate: item.insitu_date || null,
              userEquipmentHandoverDate: item.user_equipment_handover_date || null,
              equipmentReturnByVendorDate: item.equipment_return_by_vendor_date || null,
              remarks: item.remarks || null,
              userId: user_id,
            },
            type: Sequelize.QueryTypes.UPDATE,
            transaction,
          }
        );
      }

      const refreshedHeader = await getExternalHeaderById(
        header.Schedule_External_Header_ID,
        transaction
      );
      return buildExternalSnapshotPayload(refreshedHeader, transaction);
    });

    return res.status(200).json({
      ...payload,
      message: 'External monthly schedule draft has been saved.',
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Error in saveMasterJadwalBulananExternal:', error);
    next(error);
  }
};

const requestMasterJadwalBulananExternalApproval = async (req, res, next) => {
  try {
    const selectedYear = parseYear(req.body?.year || req.query?.year);
    const selectedMonth = parseMonth(req.body?.month || req.query?.month);
    const remarks = req.body?.remarks || null;
    const { user_id } = req.user || {};

    if (!selectedYear || !selectedMonth) {
      return res.status(400).json({
        success: false,
        message: 'Valid year and month are required',
      });
    }
    if (!user_id) {
      return res.status(401).json({
        success: false,
        message: 'User is not authenticated',
      });
    }

    const livePayload = await buildExternalLivePayload(selectedYear, selectedMonth);
    if (!livePayload.rows.length) {
      return res.status(400).json({
        success: false,
        message: 'No external monthly schedule data is available to request approval.',
      });
    }

    const payload = await sequelizeMSQL.transaction(async (transaction) => {
      const existingRequested = await sequelizeMSQL.query(
        `
          SELECT TOP 1 Schedule_External_Header_ID
          FROM T_Monthly_Schedule_External_Header WITH (UPDLOCK, HOLDLOCK)
          WHERE Base_Period_Year = :year
            AND Base_Period_Month = :month
            AND [Status] = 'REQUESTED'
        `,
        {
          replacements: {
            year: normalizePeriodYear(selectedYear),
            month: normalizePeriodMonth(selectedMonth),
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );
      if (existingRequested.length) {
        const error = new Error('An external monthly schedule revision is already waiting for approval.');
        error.status = 409;
        throw error;
      }

      await sequelizeMSQL.query(
        `
          DELETE FROM T_Monthly_Schedule_External_Header
          WHERE Base_Period_Year = :year
            AND Base_Period_Month = :month
            AND [Status] IN ('REJECTED', 'SUPERSEDED')
        `,
        {
          replacements: {
            year: normalizePeriodYear(selectedYear),
            month: normalizePeriodMonth(selectedMonth),
          },
          type: Sequelize.QueryTypes.DELETE,
          transaction,
        }
      );

      const revisionRows = await sequelizeMSQL.query(
        `
          SELECT ISNULL(MAX(Revision_No), 0) + 1 AS NextRevision
          FROM T_Monthly_Schedule_External_Header WITH (UPDLOCK, HOLDLOCK)
          WHERE Base_Period_Year = :year
            AND Base_Period_Month = :month
            AND [Status] = 'APPROVED'
        `,
        {
          replacements: {
            year: normalizePeriodYear(selectedYear),
            month: normalizePeriodMonth(selectedMonth),
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );
      const revisionNo = revisionRows[0]?.NextRevision || 1;
      const headerRows = await sequelizeMSQL.query(
        `
          DECLARE @InsertedHeader TABLE
          (
            Schedule_External_Header_ID INT,
            Base_Period_Year NVARCHAR(10),
            Base_Period_Month NVARCHAR(10),
            Revision_No INT,
            [Status] VARCHAR(20),
            Is_Locked BIT,
            Requested_By NVARCHAR(50),
            Requested_Date DATETIME2(0),
            Approved_By NVARCHAR(50),
            Approved_Date DATETIME2(0),
            Rejected_By NVARCHAR(50),
            Rejected_Date DATETIME2(0),
            Remarks NVARCHAR(MAX),
            Created_By NVARCHAR(50),
            Created_Date DATETIME2(0),
            Updated_By NVARCHAR(50),
            Updated_Date DATETIME2(0)
          );

          INSERT INTO T_Monthly_Schedule_External_Header
            (
              Base_Period_Year,
              Base_Period_Month,
              Revision_No,
              [Status],
              Is_Locked,
              Requested_By,
              Requested_Date,
              Remarks,
              Created_By,
              Created_Date,
              Updated_By,
              Updated_Date
            )
          OUTPUT
            INSERTED.Schedule_External_Header_ID,
            INSERTED.Base_Period_Year,
            INSERTED.Base_Period_Month,
            INSERTED.Revision_No,
            INSERTED.[Status],
            INSERTED.Is_Locked,
            INSERTED.Requested_By,
            INSERTED.Requested_Date,
            INSERTED.Approved_By,
            INSERTED.Approved_Date,
            INSERTED.Rejected_By,
            INSERTED.Rejected_Date,
            INSERTED.Remarks,
            INSERTED.Created_By,
            INSERTED.Created_Date,
            INSERTED.Updated_By,
            INSERTED.Updated_Date
          INTO @InsertedHeader
          VALUES
            (
              :year,
              :month,
              :revisionNo,
              'REQUESTED',
              0,
              :userId,
              GETDATE(),
              :remarks,
              :userId,
              GETDATE(),
              :userId,
              GETDATE()
            );

          SELECT * FROM @InsertedHeader;
        `,
        {
          replacements: {
            year: normalizePeriodYear(selectedYear),
            month: normalizePeriodMonth(selectedMonth),
            revisionNo,
            userId: user_id,
            remarks,
          },
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        }
      );
      const header = headerRows[0];

      for (const item of livePayload.rows) {
        await sequelizeMSQL.query(
          `
            INSERT INTO T_Monthly_Schedule_External_Detail
              (
                Schedule_External_Header_ID,
                Line_No,
                Schedule_Period_Year,
                Schedule_Period_Month,
                QA_ID,
                Instrument_Name,
                Instrument_ID,
                Department,
                [Location],
                Due_Date,
                Calibration_Date,
                Insitu_Date,
                User_Equipment_Handover_Date,
                Equipment_Return_By_Vendor_Date,
                Realization_Date,
                Remarks,
                Source_Table,
                Source_Key,
                Created_By,
                Created_Date,
                Updated_By,
                Updated_Date
              )
            VALUES
              (
                :headerId,
                :lineNo,
                :periodYear,
                :periodMonth,
                :qaId,
                :instrumentName,
                :instrumentId,
                :department,
                :location,
                :dueDate,
                :calibrationDate,
                :insituDate,
                :userEquipmentHandoverDate,
                :equipmentReturnByVendorDate,
                :realizationDate,
                :remarks,
                :sourceTable,
                :sourceKey,
                :userId,
                GETDATE(),
                :userId,
                GETDATE()
              )
          `,
          {
            replacements: {
              headerId: header.Schedule_External_Header_ID,
              lineNo: item.no,
              periodYear: item._period_year,
              periodMonth: item._period_month,
              qaId: item.qa_id || null,
              instrumentName: item.assm_nama_instrumen || null,
              instrumentId: item.assm_no_identitas_istrumen || null,
              department: item.group_da_dept || null,
              location: item.assm_lokasi || null,
              dueDate: item.due_date || null,
              calibrationDate: item.calibration_date || null,
              insituDate: item.insitu_date || null,
              userEquipmentHandoverDate: item.user_equipment_handover_date || null,
              equipmentReturnByVendorDate: item.equipment_return_by_vendor_date || null,
              realizationDate: item.realization_date || null,
              remarks: item.remarks || null,
              sourceTable: item.source_table || null,
              sourceKey: item.source_key || null,
              userId: user_id,
            },
            type: Sequelize.QueryTypes.INSERT,
            transaction,
          }
        );
      }

      return buildExternalSnapshotPayload(header, transaction);
    });

    return res.status(201).json({
      ...payload,
      message: 'External monthly schedule revision has been submitted for approval.',
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Error in requestMasterJadwalBulananExternalApproval:', error);
    next(error);
  }
};

const approveMasterJadwalBulananExternal = async (req, res, next) => {
  try {
    const scheduleHeaderId = Number(req.body?.schedule_header_id || req.query?.schedule_header_id);
    const selectedYear = parseYear(req.body?.year || req.query?.year);
    const selectedMonth = parseMonth(req.body?.month || req.query?.month);
    const remarks = req.body?.remarks || null;
    const { user_id } = req.user || {};

    if (!scheduleHeaderId && (!selectedYear || !selectedMonth)) {
      return res.status(400).json({ success: false, message: 'Schedule header ID or valid year and month are required' });
    }
    if (!user_id) {
      return res.status(401).json({ success: false, message: 'User is not authenticated' });
    }

    const payload = await sequelizeMSQL.transaction(async (transaction) => {
      const header = scheduleHeaderId
        ? await getExternalHeaderById(scheduleHeaderId, transaction)
        : await getLatestRequestedExternalHeader(selectedYear, selectedMonth, transaction);
      if (!header) {
        const error = new Error('No external monthly schedule revision is waiting for approval.');
        error.status = 404;
        throw error;
      }
      if (header.Status !== 'REQUESTED') {
        const error = new Error('Only requested external monthly schedule revisions can be approved.');
        error.status = 400;
        throw error;
      }

      await sequelizeMSQL.query(
        `
          UPDATE T_Monthly_Schedule_External_Header
          SET
            [Status] = 'SUPERSEDED',
            Is_Locked = 1,
            Updated_By = :userId,
            Updated_Date = GETDATE()
          WHERE Base_Period_Year = :year
            AND Base_Period_Month = :month
            AND [Status] = 'APPROVED'
            AND Schedule_External_Header_ID <> :headerId
        `,
        {
          replacements: {
            year: header.Base_Period_Year,
            month: header.Base_Period_Month,
            headerId: header.Schedule_External_Header_ID,
            userId: user_id,
          },
          type: Sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );

      await sequelizeMSQL.query(
        `
          UPDATE T_Monthly_Schedule_External_Header
          SET
            [Status] = 'APPROVED',
            Is_Locked = 1,
            Approved_By = :userId,
            Approved_Date = GETDATE(),
            Remarks = COALESCE(:remarks, Remarks),
            Updated_By = :userId,
            Updated_Date = GETDATE()
          WHERE Schedule_External_Header_ID = :headerId
        `,
        {
          replacements: {
            headerId: header.Schedule_External_Header_ID,
            userId: user_id,
            remarks,
          },
          type: Sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );

      const approvedHeader = await getExternalHeaderById(
        header.Schedule_External_Header_ID,
        transaction
      );
      return buildExternalSnapshotPayload(approvedHeader, transaction);
    });

    return res.status(200).json({
      ...payload,
      message: 'External monthly schedule has been approved.',
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Error in approveMasterJadwalBulananExternal:', error);
    next(error);
  }
};

const rejectMasterJadwalBulananExternal = async (req, res, next) => {
  try {
    const scheduleHeaderId = Number(req.body?.schedule_header_id || req.query?.schedule_header_id);
    const selectedYear = parseYear(req.body?.year || req.query?.year);
    const selectedMonth = parseMonth(req.body?.month || req.query?.month);
    const remarks = req.body?.remarks || null;
    const { user_id } = req.user || {};

    if (!scheduleHeaderId && (!selectedYear || !selectedMonth)) {
      return res.status(400).json({ success: false, message: 'Schedule header ID or valid year and month are required' });
    }
    if (!user_id) {
      return res.status(401).json({ success: false, message: 'User is not authenticated' });
    }

    const payload = await sequelizeMSQL.transaction(async (transaction) => {
      const header = scheduleHeaderId
        ? await getExternalHeaderById(scheduleHeaderId, transaction)
        : await getLatestRequestedExternalHeader(selectedYear, selectedMonth, transaction);
      if (!header) {
        const error = new Error('No external monthly schedule revision is waiting for approval.');
        error.status = 404;
        throw error;
      }
      if (header.Status !== 'REQUESTED') {
        const error = new Error('Only requested external monthly schedule revisions can be rejected.');
        error.status = 400;
        throw error;
      }

      await sequelizeMSQL.query(
        `
          UPDATE T_Monthly_Schedule_External_Header
          SET
            [Status] = 'REJECTED',
            Is_Locked = 0,
            Rejected_By = :userId,
            Rejected_Date = GETDATE(),
            Remarks = COALESCE(:remarks, Remarks),
            Updated_By = :userId,
            Updated_Date = GETDATE()
          WHERE Schedule_External_Header_ID = :headerId
        `,
        {
          replacements: {
            headerId: header.Schedule_External_Header_ID,
            userId: user_id,
            remarks,
          },
          type: Sequelize.QueryTypes.UPDATE,
          transaction,
        }
      );

      await sequelizeMSQL.query(
        `
          DELETE FROM T_Monthly_Schedule_External_Header
          WHERE Schedule_External_Header_ID = :headerId
        `,
        {
          replacements: {
            headerId: header.Schedule_External_Header_ID,
          },
          type: Sequelize.QueryTypes.DELETE,
          transaction,
        }
      );

      const currentHeader = await getLatestApprovedExternalHeader(
        header.Base_Period_Year,
        header.Base_Period_Month,
        transaction
      );
      if (currentHeader) {
        return buildExternalSnapshotPayload(currentHeader, transaction);
      }

      return buildExternalLivePayload(
        Number(header.Base_Period_Year),
        Number(header.Base_Period_Month),
        transaction
      );
    });

    return res.status(200).json({
      ...payload,
      message: 'External monthly schedule revision has been rejected.',
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ success: false, message: error.message });
    }
    console.error('Error in rejectMasterJadwalBulananExternal:', error);
    next(error);
  }
};

const exportMasterJadwalBulananExternal = async (req, res, next) => {
  try {
    const yearParam = req.body?.year ?? req.query?.year;
    const monthParam = req.body?.month ?? req.query?.month;
    const source = ['live', 'requested', 'snapshot'].includes(req.body?.source || req.query?.source)
      ? (req.body?.source || req.query?.source)
      : 'snapshot';

    const selectedYear = parseYear(yearParam);
    const selectedMonth = parseMonth(monthParam);

    if (!selectedYear || !selectedMonth) {
      return res.status(400).json({
        success: false,
        message: 'Valid year and month are required',
      });
    }

    let rows = normalizeIncomingExternalWorkflowRows(req.body?.rows);
    let snapshotHeader = null;
    if (!rows.length) {
      if (source === 'requested') {
        snapshotHeader = await getLatestRequestedExternalHeader(selectedYear, selectedMonth);
      } else if (source !== 'live') {
        snapshotHeader = await getLatestApprovedExternalHeader(selectedYear, selectedMonth);
        if (!snapshotHeader) {
          snapshotHeader = await getLatestRequestedExternalHeader(selectedYear, selectedMonth);
        }
      }

      if (snapshotHeader) {
        const details = await getExternalDetails(snapshotHeader.Schedule_External_Header_ID);
        rows = mapExternalSnapshotRows(details, snapshotHeader.Base_Period_Year, snapshotHeader.Base_Period_Month);
      } else {
        const livePayload = await buildExternalLivePayload(selectedYear, selectedMonth);
        rows = livePayload.rows;
      }
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`External-${selectedMonth}-${selectedYear}`);
    worksheet.columns = [
      { width: 6 },
      { width: 48 },
      { width: 14 },
      { width: 10 },
      { width: 34 },
      { width: 12 },
      { width: 20 },
      { width: 22 },
      { width: 12 },
      { width: 12 },
      { width: 26 },
    ];

    worksheet.mergeCells('A1:K1');
    worksheet.getCell('A1').value = snapshotHeader
      ? `EXTERNAL MONTHLY CALIBRATION SCHEDULE - ${MONTH_NAMES_ID[selectedMonth - 1].toUpperCase()} ${selectedYear} REV ${snapshotHeader.Revision_No} (${snapshotHeader.Status})`
      : `EXTERNAL MONTHLY CALIBRATION SCHEDULE - ${MONTH_NAMES_ID[selectedMonth - 1].toUpperCase()} ${selectedYear}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    writeExternalTableHeader(worksheet, 2);
    worksheet.views = [{ state: 'frozen', ySplit: 3 }];

    let currentRow = 4;
    const groupedByPeriod = rows.reduce((acc, row) => {
      const key = row._period_key || `${normalizePeriodYear(selectedYear)}-${normalizePeriodMonth(selectedMonth)}`;
      if (!acc[key]) acc[key] = { label: row._period_label || key, rows: [] };
      acc[key].rows.push(row);
      return acc;
    }, {});

    Object.values(groupedByPeriod).forEach((periodGroup) => {
      worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = periodGroup.label;
      applyRowBorderRange(worksheet, currentRow, 1, 11);
      currentRow += 1;

      periodGroup.rows.forEach((rowItem, index) => {
        const row = worksheet.getRow(currentRow);
        row.getCell(1).value = index + 1;
        row.getCell(2).value = rowItem.assm_nama_instrumen || '';
        row.getCell(3).value = rowItem.assm_no_identitas_istrumen || '';
        row.getCell(4).value = rowItem.group_da_dept || '';
        row.getCell(5).value = rowItem.assm_lokasi || '';
        row.getCell(6).value = formatDateDisplay(rowItem.insitu_date);
        row.getCell(7).value = formatDateDisplay(rowItem.user_equipment_handover_date);
        row.getCell(8).value = formatDateDisplay(rowItem.equipment_return_by_vendor_date);
        row.getCell(9).value = formatDateDisplay(rowItem.due_date);
        row.getCell(10).value = formatDateDisplay(rowItem.realization_date);
        row.getCell(11).value = rowItem.remarks || '';
        applyRowBorderRange(worksheet, currentRow, 1, 11);
        currentRow += 1;
      });
    });

    const lastRow = Math.max(currentRow - 1, 3);
    worksheet.autoFilter = `A2:K${lastRow}`;

    const fileName = `Master-Jadwal-Bulanan-External-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (error) {
    console.error('Error in exportMasterJadwalBulananExternal:', error);
    next(error);
  }
};

module.exports = {
  getMasterJadwalBulananPreview,
  saveMasterJadwalBulanan,
  exportMasterJadwalBulanan,
  requestMasterJadwalBulananApproval,
  approveMasterJadwalBulanan,
  rejectMasterJadwalBulanan,
  getMasterJadwalBulananExternalPreview,
  saveMasterJadwalBulananExternal,
  exportMasterJadwalBulananExternal,
  requestMasterJadwalBulananExternalApproval,
  approveMasterJadwalBulananExternal,
  rejectMasterJadwalBulananExternal,
};
