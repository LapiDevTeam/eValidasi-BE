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

const CATEGORY_ORDER = {
  Unlisted: 0,
  Thermohygrometer: 1,
  Timbangan: 2,
  'Diff. Pressure Gauge': 3,
};

const WEEK_LABELS = ['MINGGU 1', 'MINGGU 2', 'MINGGU 3', 'MINGGU 4'];
const CALIBRATION_SCOPE = {
  INTERNAL: 'internal',
  EXTERNAL: 'external',
};

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

const sortMappedRows = (rows) => {
  rows.sort((a, b) => {
    if (a.week !== b.week) return a.week - b.week;

    const catA = CATEGORY_ORDER[a.category] ?? 99;
    const catB = CATEGORY_ORDER[b.category] ?? 99;
    if (catA !== catB) return catA - catB;

    const dateA = toDateObject(a.plan_due_date)?.getTime() || 0;
    const dateB = toDateObject(b.plan_due_date)?.getTime() || 0;
    if (dateA !== dateB) return dateA - dateB;

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

const mapMonthlyRows = (results) => {
  const mapped = (results || []).map((item, index) => {
    const planDueDate = formatDateISO(item?.Kalibrasi_selanjutnya);
    const category = getCategory(item?.Assm_No_identitas_Istrumen);
    const week = getWeekNumber(item?.Kalibrasi_selanjutnya);

    return {
      row_id: `${item?.QA_ID || 'NA'}-${item?.Assm_No_identitas_Istrumen || 'NA'}-${index + 1}`,
      no: index + 1,
      qa_id: item?.QA_ID || '',
      assm_nama_instrumen: item?.Assm_nama_instrumen || '',
      assm_no_identitas_istrumen: item?.Assm_No_identitas_Istrumen || '',
      group_da_dept: item?.Group_Da_Dept || '',
      assm_lokasi: item?.Assm_Lokasi || '',
      jenis_kalibrasi: item?.Jenis_Kalibrasi || 'Internal',
      category,
      week,
      pic: item?.default_pic || '',
      plan_due_date: planDueDate,
      realisasi_eksekusi: null,
      ket: '',
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
    tgl_eksekusi_insitu: null,
    tgl_penyerahan_alat_oleh_user: null,
    tgl_pengembalian_alat_oleh_vn: null,
    realisasi: null,
  }));

  sortExternalRows(mapped);
  return mapped.map((row, idx) => ({ ...row, no: idx + 1 }));
};

const getMonthlyCalibrationData = async (
  selectedYear,
  selectedMonth,
  calibrationScope = CALIBRATION_SCOPE.INTERNAL
) => {
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
      CASE
        WHEN MAX(ISNULL(Jenis_Kalibrasi, 1)) = 1 THEN 'Internal'
        ELSE 'External'
      END AS Jenis_Kalibrasi
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
      AND MONTH(MAX(Kalibrasi_selanjutnya)) = :month
      AND ${scopeCondition}
    ORDER BY
      DAY(MAX(Kalibrasi_selanjutnya)),
      Assm_nama_instrumen
  `;

  return sequelizeMSQL.query(query, {
    replacements: {
      year: selectedYear,
      month: selectedMonth,
    },
    type: Sequelize.QueryTypes.SELECT,
  });
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
    if (categoryObj) {
      categoryObj.items.push(row);
    }
  }

  return Object.values(grouped);
};

const getMasterJadwalBulananPreview = async (req, res, next) => {
  try {
    const selectedYear = parseYear(req.query.year);
    const selectedMonth = parseMonth(req.query.month);

    if (!selectedYear || !selectedMonth) {
      return res.status(400).json({
        success: false,
        message: 'Valid year and month query parameters are required',
      });
    }

    const rawResults = await getMonthlyCalibrationData(
      selectedYear,
      selectedMonth,
      CALIBRATION_SCOPE.INTERNAL
    );
    const rows = mapMonthlyRows(rawResults);
    const grouped = getGroupedData(rows);

    return res.status(200).json({
      success: true,
      message: 'Data fetched successfully',
      year: selectedYear,
      month: selectedMonth,
      period_label: `${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear}`,
      count: rows.length,
      rows,
      grouped,
    });
  } catch (error) {
    console.error('Error in getMasterJadwalBulananPreview:', error);
    next(error);
  }
};

const normalizeIncomingRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((item, index) => {
    const category = getCategory(item?.assm_no_identitas_istrumen);
    const planDueDate = formatDateISO(item?.plan_due_date);
    const week = item?.week || getWeekNumber(planDueDate);
    const ketValue = String(item?.ket || '').trim().toUpperCase();
    const ket = ['S', 'D', 'M'].includes(ketValue) ? ketValue : '';

    return {
      row_id: item?.row_id || `ROW-${index + 1}`,
      no: Number(item?.no) || index + 1,
      assm_nama_instrumen: item?.assm_nama_instrumen || '',
      assm_no_identitas_istrumen: item?.assm_no_identitas_istrumen || '',
      group_da_dept: item?.group_da_dept || '',
      assm_lokasi: item?.assm_lokasi || '',
      pic: item?.pic || '',
      category,
      week: Number(week) >= 1 && Number(week) <= 4 ? Number(week) : 4,
      plan_due_date: planDueDate,
      realisasi_eksekusi: formatDateISO(item?.realisasi_eksekusi),
      ket,
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
    realisasi: formatDateISO(item?.realisasi || item?.realisasi_eksekusi),
  }));
};

const writeTableHeader = (worksheet, startRow) => {
  worksheet.mergeCells(`I${startRow}:K${startRow}`);
  worksheet.getCell(`A${startRow}`).value = 'No';
  worksheet.getCell(`B${startRow}`).value = 'Nama Alat';
  worksheet.getCell(`C${startRow}`).value = 'ID';
  worksheet.getCell(`D${startRow}`).value = 'Bagian';
  worksheet.getCell(`E${startRow}`).value = 'Lokasi';
  worksheet.getCell(`F${startRow}`).value = 'PIC';
  worksheet.getCell(`G${startRow}`).value = 'Plan / Due Date';
  worksheet.getCell(`H${startRow}`).value = 'Realisasi Eksekusi';
  worksheet.getCell(`I${startRow}`).value = 'Ket.';

  worksheet.getCell(`I${startRow + 1}`).value = 'S';
  worksheet.getCell(`J${startRow + 1}`).value = 'D';
  worksheet.getCell(`K${startRow + 1}`).value = 'M';

  const headerRows = [startRow, startRow + 1];
  for (const rowNumber of headerRows) {
    for (let col = 1; col <= 11; col += 1) {
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

  worksheet.getCell(`F${startRow + 1}`).value = 'Insitu*';
  worksheet.getCell(`G${startRow + 1}`).value = 'Penyerahan Alat Oleh User';
  worksheet.getCell(`H${startRow + 1}`).value = 'Pengembalian Alat Oleh VN';

  for (let rowNumber = startRow; rowNumber <= startRow + 1; rowNumber += 1) {
    for (let col = 1; col <= 10; col += 1) {
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
  applyRowBorderRange(worksheet, rowNumber, 1, 11);
};

const exportMasterJadwalBulanan = async (req, res, next) => {
  try {
    const yearParam = req.body?.year ?? req.query?.year;
    const monthParam = req.body?.month ?? req.query?.month;

    const selectedYear = parseYear(yearParam);
    const selectedMonth = parseMonth(monthParam);

    if (!selectedYear || !selectedMonth) {
      return res.status(400).json({
        success: false,
        message: 'Valid year and month are required',
      });
    }

    let rows = normalizeIncomingRows(req.body?.rows);
    if (!rows.length) {
      const rawResults = await getMonthlyCalibrationData(
        selectedYear,
        selectedMonth,
        CALIBRATION_SCOPE.INTERNAL
      );
      rows = mapMonthlyRows(rawResults);
    }
    sortMappedRows(rows);
    rows = rows.map((row, idx) => ({ ...row, no: idx + 1 }));

    const grouped = getGroupedData(rows);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Jadwal-${selectedMonth}-${selectedYear}`);

    worksheet.columns = [
      { width: 6 },  // No
      { width: 48 }, // Nama Alat
      { width: 14 }, // ID
      { width: 10 }, // Bagian
      { width: 38 }, // Lokasi
      { width: 10 }, // PIC
      { width: 16 }, // Plan/Due Date
      { width: 16 }, // Realisasi Eksekusi
      { width: 4 },  // S
      { width: 4 },  // D
      { width: 4 },  // M
    ];

    worksheet.mergeCells('A1:K1');
    worksheet.getCell('A1').value = `JADWAL BULANAN KALIBRASI - ${MONTH_NAMES_ID[selectedMonth - 1].toUpperCase()} ${selectedYear}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    writeTableHeader(worksheet, 2);
    worksheet.views = [{ state: 'frozen', ySplit: 3 }];

    let currentRow = 4;
    let numberCounter = 1;
    for (const weekGroup of grouped) {
      worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = weekGroup.week_label;
      worksheet.getCell(`A${currentRow}`).font = { bold: true };
      worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getCell(`A${currentRow}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' },
      };
      applyRowBorder(worksheet, currentRow);
      currentRow += 1;

      for (const categoryGroup of weekGroup.categories) {
        if (!categoryGroup.items.length) {
          continue;
        }

        worksheet.mergeCells(`A${currentRow}:K${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = categoryGroup.category;
        worksheet.getCell(`A${currentRow}`).font = { italic: true, bold: true };
        worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
        applyRowBorder(worksheet, currentRow);
        currentRow += 1;

        for (const rowItem of categoryGroup.items) {
          const row = worksheet.getRow(currentRow);
          row.getCell(1).value = numberCounter;
          row.getCell(2).value = rowItem.assm_nama_instrumen || '';
          row.getCell(3).value = rowItem.assm_no_identitas_istrumen || '';
          row.getCell(4).value = rowItem.group_da_dept || '';
          row.getCell(5).value = rowItem.assm_lokasi || '';
          row.getCell(6).value = rowItem.pic || '';
          row.getCell(7).value = formatDateDisplay(rowItem.plan_due_date);
          row.getCell(8).value = formatDateDisplay(rowItem.realisasi_eksekusi);
          row.getCell(9).value = rowItem.ket === 'S' ? '√' : '';
          row.getCell(10).value = rowItem.ket === 'D' ? '√' : '';
          row.getCell(11).value = rowItem.ket === 'M' ? '√' : '';

          row.height = 20;
          row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          applyRowBorder(worksheet, currentRow);
          currentRow += 1;
          numberCounter += 1;
        }
      }
    }

    const lastRow = Math.max(currentRow - 1, 3);
    worksheet.autoFilter = `A2:H${lastRow}`;

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

const getMasterJadwalBulananExternalPreview = async (req, res, next) => {
  try {
    const selectedYear = parseYear(req.query.year);
    const selectedMonth = parseMonth(req.query.month);

    if (!selectedYear || !selectedMonth) {
      return res.status(400).json({
        success: false,
        message: 'Valid year and month query parameters are required',
      });
    }

    const rawResults = await getMonthlyCalibrationData(
      selectedYear,
      selectedMonth,
      CALIBRATION_SCOPE.EXTERNAL
    );
    const rows = mapMonthlyExternalRows(rawResults);

    return res.status(200).json({
      success: true,
      message: 'External data fetched successfully',
      year: selectedYear,
      month: selectedMonth,
      period_label: `${MONTH_NAMES_ID[selectedMonth - 1]} ${selectedYear}`,
      count: rows.length,
      rows,
    });
  } catch (error) {
    console.error('Error in getMasterJadwalBulananExternalPreview:', error);
    next(error);
  }
};

const exportMasterJadwalBulananExternal = async (req, res, next) => {
  try {
    const yearParam = req.body?.year ?? req.query?.year;
    const monthParam = req.body?.month ?? req.query?.month;

    const selectedYear = parseYear(yearParam);
    const selectedMonth = parseMonth(monthParam);

    if (!selectedYear || !selectedMonth) {
      return res.status(400).json({
        success: false,
        message: 'Valid year and month are required',
      });
    }

    let rows = normalizeIncomingExternalRows(req.body?.rows);
    if (!rows.length) {
      const rawResults = await getMonthlyCalibrationData(
        selectedYear,
        selectedMonth,
        CALIBRATION_SCOPE.EXTERNAL
      );
      rows = mapMonthlyExternalRows(rawResults);
    }

    sortExternalRows(rows);
    rows = rows.map((row, idx) => ({ ...row, no: idx + 1 }));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Jadwal-External-${selectedMonth}-${selectedYear}`);

    worksheet.columns = [
      { width: 6 },  // No
      { width: 48 }, // Nama Alat
      { width: 14 }, // ID
      { width: 10 }, // Bagian
      { width: 34 }, // Lokasi
      { width: 12 }, // Insitu
      { width: 20 }, // Penyerahan
      { width: 22 }, // Pengembalian
      { width: 12 }, // Jatuh Tempo
      { width: 12 }, // Realisasi
    ];

    worksheet.mergeCells('A1:J1');
    worksheet.getCell('A1').value =
      `JADWAL BULANAN KALIBRASI EXTERNAL - ${MONTH_NAMES_ID[selectedMonth - 1].toUpperCase()} ${selectedYear}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    writeExternalTableHeader(worksheet, 2);
    worksheet.views = [{ state: 'frozen', ySplit: 3 }];

    let currentRow = 4;
    for (const rowItem of rows) {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = rowItem.no;
      row.getCell(2).value = rowItem.assm_nama_instrumen || '';
      row.getCell(3).value = rowItem.assm_no_identitas_istrumen || '';
      row.getCell(4).value = rowItem.group_da_dept || '';
      row.getCell(5).value = rowItem.assm_lokasi || '';
      row.getCell(6).value = formatDateDisplay(rowItem.tgl_eksekusi_insitu);
      row.getCell(7).value = formatDateDisplay(rowItem.tgl_penyerahan_alat_oleh_user);
      row.getCell(8).value = formatDateDisplay(rowItem.tgl_pengembalian_alat_oleh_vn);
      row.getCell(9).value = formatDateDisplay(rowItem.jatuh_tempo);
      row.getCell(10).value = formatDateDisplay(rowItem.realisasi);

      row.height = 20;
      row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      applyRowBorderRange(worksheet, currentRow, 1, 10);
      currentRow += 1;
    }

    if (!rows.length) {
      worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = 'Tidak ada data external di periode ini.';
      worksheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      applyRowBorderRange(worksheet, currentRow, 1, 10);
    }

    const lastRow = Math.max(currentRow - 1, 3);
    worksheet.autoFilter = `A2:J${lastRow}`;

    const fileName =
      `Master-Jadwal-Bulanan-External-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.xlsx`;
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
  exportMasterJadwalBulanan,
  getMasterJadwalBulananExternalPreview,
  exportMasterJadwalBulananExternal,
};
