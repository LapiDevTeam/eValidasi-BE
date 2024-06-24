const { t_productbrief_hist } = require("../models/index");
const ExcelJS = require("exceljs");

class ControllerAuditTrail {
  static async downloadExcelAuditProductBrief(req, res, next) {
    try {
      //   const { productId, productName } = req.query;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      //   let queryFillter = {};

      //   if (productId) queryFillter.productId = { [Op.iLike]: `%${productId}%` };
      //   if (productName)
      //     queryFillter.productName = { [Op.iLike]: `%${productName}%` };

      const dataAudit = await t_productbrief_hist.findAll({
        order: [["id", "DESC"]],
      });

      dataAudit.forEach((el) => {
        el.tanggal = el?.tanggal
          .toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.createdAt = el?.createdAt
          .toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.updatedAt = el?.updatedAt
          .toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        el.changeDate = el?.changeDate
          .toISOString()
          .replace(/T/, " ")
          .replace(/\..+/, "");
        return el;
      });

      const headers = Object.keys(dataAudit[0]);
      const arr = ["Excel Report", `print on ${"21/01/2024"}`, ""];

      for (let i = 0; i < 3; i++) {
        worksheet.addRow([arr[i]]);
      }

      headers.forEach((header, index) => {
        const cell = worksheet.getCell(4, index + 1);
        cell.value = header;
        cell.style = { font: { bold: true } };
        worksheet.getColumn(index + 1).width = 20;
      });

      dataAudit.forEach((row, rowIndex) => {
        const rowNumber = rowIndex + 5;
        Object.keys(row).forEach((key, colIndex) => {
          worksheet.getCell(rowNumber, colIndex + 1).value = row[key];
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      // res.attachment(`auditTrail-minor-hist-(${formatDateIndonesia}).xlsx`);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="auditTrail-ijin-hist-(${"21/01/2024"}).xlsx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      // Send the Excel file as download
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ControllerAuditTrail;
