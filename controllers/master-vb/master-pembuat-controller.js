const sql = require("mssql");
const { configMssql } = require("../../config/configMssql");
const MyError = require("../../helpers/errors");
const ExcelJS = require("exceljs");
class MasterPembuatController {
  static async fetchMasterPembuat(req, res, next) {
    try {
      const pool = await sql.connect(configMssql);
      const queryCode = `
        SELECT Prc_ID AS ID , Prc_Name AS "Nama Principle", Prc_ContactPerson AS "Contact Person" , Prc_Address AS Address , Prc_Phone AS Phone FROM m_Principle mp 
      WHERE ISNUMERIC(Prc_ID) = 1 ORDER BY Prc_ID ASC;
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
  static async createOrUpdateMasterPembuat(req, res, next) {
    try {
      const { Prc_ID, Prc_Name } = req.body;
      // const { user_id, delegated_to } = req.user;

      const pool = await sql.connect(configMssql);
      const queryCode = `
      IF EXISTS (SELECT 1 FROM m_Principle mp  WHERE Prc_ID = @Prc_ID)
        UPDATE m_Principle
        SET Prc_Name = @Prc_Name, Process_Date = GETDATE(), User_ID = @User_ID , Delegated_To = @Delegated_To
        WHERE Prc_ID = @Prc_ID
      ELSE
          INSERT INTO m_Principle (Prc_ID, Prc_Name , Prc_ContactPerson, Prc_Address , Prc_Phone, Process_Date ,User_ID , Delegated_To ,isActive) 
      VALUES (@Prc_ID, @Prc_Name, '','','' , GETDATE() , @User_ID , @Delegated_To , 1);
      `;
      const request = pool.request();
      const result1 = await request
        .input("Prc_ID", sql.NVarChar(50), Prc_ID)
        .input("User_ID", sql.NVarChar(50), "TEST")
        .input("Delegated_To", sql.NVarChar(50), "TEST")
        .input("Prc_Name", sql.NVarChar(250), Prc_Name)
        .query(queryCode);

      console.log(result1);
      res.status(200).json({ message: "Data has been saved" });
    } catch (error) {
      next(error);
    }
  }
  static async downloadExcelAuditProductBriefHist(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const pool = await sql.connect(configMssql);
      const queryCode = `
        SELECT Prc_ID AS ID , Prc_Name AS "Nama Principle", Prc_ContactPerson AS "Contact Person" , Prc_Address AS Address , Prc_Phone AS Phone FROM m_Principle mp 
      WHERE ISNUMERIC(Prc_ID) = 1 ORDER BY Prc_ID ASC;
      `;
      const request = pool.request();
      const result1 = await request.query(queryCode);

      const dataAudit = result1.recordset;

      const headers = Object.keys(dataAudit[0] || {});
      const currentDate = new Date().toLocaleDateString("en-GB");

      worksheet.addRow(["Excel Report"]);
      worksheet.addRow([`Printed on ${currentDate}`]);
      worksheet.addRow([]);

      headers.forEach((header, index) => {
        const cell = worksheet.getRow(4).getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        headers.forEach((header, colIndex) => {
          worksheet.getRow(rowNumber).getCell(colIndex + 1).value = row[header];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="product-brief-(${currentDate}).xlsx"`
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

module.exports = MasterPembuatController;
