const ExcelJS = require("exceljs");
const {
  t_productBrief_hist,
  t_productBrief_status,
} = require("../models/index");
const sql = require("mssql");
const MyError = require("../helpers/errors");
const { Op } = require("sequelize");
const getPagination = require("../helpers/getPagination");
const { transporter } = require("../config/configNodeMailer");
const { checkStatusProductBrief } = require("../helpers/checkStatus");
const { getStatus } = require("../helpers/statusProductBrief");
const multer = require("multer");
const {
  approverRecordset,
  isApproveValidation,
} = require("../helpers/approver");
const { sequelize } = require("../models/index");
const { log } = require("console");
class ControllerAuditTrail {
  static async downloadExcelAuditProductBrief(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const dataAudit = await sequelize.query(
        `SELECT id , "productBrief" , kode , nama  , kemasan , "bentukSediaan" , "ruangLingkup" ,"bahanAktifDanDosis"  ,"rdSelection" , "statusDokumen" , alasan_reject ,revisi  , user_id ,delegated_to , flag_update ,"createdAt" , "updatedAt" , status  , "changeDate" FROM "t_productBrief_hist"`,
        { type: sequelize.QueryTypes.SELECT }
      );

      dataAudit?.forEach((el) => {
        el.tanggal = el?.tanggal
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          ?.toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
      });

      const headers = Object.keys(dataAudit[0]);
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
      next(error);
    }
  }
}

module.exports = ControllerAuditTrail;
