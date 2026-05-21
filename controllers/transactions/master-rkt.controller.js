'use strict';

const ExcelJS = require('exceljs');
const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { Sequelize } = require('../../models');

const MONTH_HEADERS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

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

const mapPreviewData = (results) =>
  results.map((item, index) => {
    const months = MONTH_HEADERS.reduce((acc, _, monthIndex) => {
      acc[monthIndex + 1] = false;
      return acc;
    }, {});

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
      kalibrasi_selanjutnya: item.Kalibrasi_selanjutnya || null,
      due_month: month,
      months,
    };
  });

const getMasterRKTPreview = async (req, res, next) => {
  try {
    const selectedYear = parseYear(req.query.year);

    if (!selectedYear) {
      return res.status(400).json({
        success: false,
        message: 'Valid year query parameter is required',
      });
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

const exportMasterRKT = async (req, res, next) => {
  try {
    const selectedYear = parseYear(req.query.year);

    if (!selectedYear) {
      return res.status(400).json({
        success: false,
        message: 'Valid year query parameter is required',
      });
    }

    const results = await getRKTDataByYear(selectedYear);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`RKT${selectedYear}`);
    worksheet.views = [{ state: 'frozen', ySplit: 3 }];

    worksheet.columns = [
      { width: 6 },  // No
      { width: 52 }, // Nama Alat
      { width: 18 }, // ID
      { width: 12 }, // Bagian
      { width: 38 }, // Lokasi
      { width: 7 },  // Jan
      { width: 7 },  // Feb
      { width: 7 },  // Mar
      { width: 7 },  // Apr
      { width: 7 },  // Mei
      { width: 7 },  // Jun
      { width: 7 },  // Jul
      { width: 7 },  // Ags
      { width: 7 },  // Sep
      { width: 7 },  // Okt
      { width: 7 },  // Nov
      { width: 7 },  // Des
    ];

    worksheet.mergeCells('A1:Q1');
    worksheet.getCell('A1').value = `RENCANA KALIBRASI TAHUN ${selectedYear}`;
    worksheet.getCell('A1').font = { bold: true, size: 14 };
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

    worksheet.mergeCells('F2:Q2');

    worksheet.getCell('A2').value = 'No';
    worksheet.getCell('B2').value = 'Nama Alat';
    worksheet.getCell('C2').value = 'ID';
    worksheet.getCell('D2').value = 'Bagian';
    worksheet.getCell('E2').value = 'Lokasi';
    worksheet.getCell('F2').value = 'BULAN';

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
    // Nama Alat / ID / Bagian / Lokasi reliably without selecting range manually.
    worksheet.autoFilter = `A2:E${tableBottomRow}`;

    const signatureLabelRow = tableBottomRow + 3;
    const signatureNameRow = signatureLabelRow + 4;

    worksheet.mergeCells(`A${signatureLabelRow}:H${signatureLabelRow}`);
    worksheet.mergeCells(`J${signatureLabelRow}:Q${signatureLabelRow}`);
    worksheet.getCell(`A${signatureLabelRow}`).value = 'Disusun Oleh,';
    worksheet.getCell(`J${signatureLabelRow}`).value = 'Disetujui Oleh,';

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

module.exports = {
  getMasterRKTPreview,
  exportMasterRKT,
};
