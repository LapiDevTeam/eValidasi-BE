const sql = require("mssql");
const { configMssql } = require("../../config/configMssql");
const MyError = require("../../helpers/errors");
const ExcelJS = require("exceljs");
class MasterPemasokController {
  static async fetchMasterPemasok(req, res, next) {
    try {
      const pool = await sql.connect(configMssql);
      const queryCode = `
        SELECT Supp_id, Supp_Name FROM m_Supplier WHERE Supp_id <> '(none)' AND isActive = 1 ORDER BY 1;
      `;
      const request = pool.request();
      const result1 = await request.query(queryCode);
      if (result1.recordset.length === 0)
        throw new MyError(404, "Data tidak ditemukan");
      res.status(200).json({ data: result1.recordset });
    } catch (error) {
      next(error);
    }
  }

  static async downloadExcelMasterPemasok(req, res, next) {
    try {
      const fileName = "Master Pemasok";
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const pool = await sql.connect(configMssql);
      const queryCode = `
        SELECT Supp_id, Supp_Name FROM m_Supplier WHERE Supp_id <> '(none)' AND isActive = 1 ORDER BY 1;
      `;
      const request = pool.request();
      const result1 = await request.query(queryCode);

      const dataAudit = result1.recordset;

      const headers = Object.keys(dataAudit[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");
      const borderTemplate = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      worksheet.addRow(["Master Principle"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.border = borderTemplate;
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          const cell = worksheet.getRow(rowNumber).getCell(colIndex + 1);
          cell.border = borderTemplate;
          cell.value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}.xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      res.send(buffer);
    } catch (error) {
      console.log({ error });
      next(error);
    }
  }
}

module.exports = MasterPemasokController;
