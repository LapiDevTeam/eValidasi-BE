const sql = require("mssql");
const { configMssql } = require("../../config/configMssql");
const MyError = require("../../helpers/errors");
const ExcelJS = require("exceljs");
class MasterItemBahanAwalController {
  static async fetchItemGroup(req, res, next) {
    try {
      const { kodeOrNamaBahan = "", isActive, groupType } = req.query;

      if (!groupType) throw new MyError(400, "groupType is required");
      const pool = await sql.connect(configMssql);
      const queryCode = `
      select Item_ID, Group_name, Item_Name, Item_Size, Item_Description, item_unit,
        item_group, item_type, item_Currency, Item_Price, Item_MinOrder, Item_LeadTime, 
        item_PackingSize, Item_Localindent, Item_LastPriceCurrency, item_LastPrice, item_lastPriceDate,
        item_status, IsActive,Owner, ishalal, item_bpomgenerik, namagenerik, item_row from vwM_ItemWithGroup where item_type = @group_type
         ${
           isActive ? "and IsActive = 1" : ""
         } and item_id + ' ' + item_name like '%${kodeOrNamaBahan}%' order by Process_Date desc`;
      const request = pool.request();
      const result1 = await request
        .input("group_type", sql.NVarChar(5), groupType)
        .query(queryCode);

      const _data = result1.recordset;
      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }

  static async downloadExcelExportItemBahanAwal(req, res, next) {
    try {
      const { itemType } = req.query;

      if (!itemType) throw new MyError(400, "Item Type is required");
      const fileName = "Master Item";
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const pool = await sql.connect(configMssql);
      const queryCode = `
        Select Type_Name as TIPE, Item_ID as KODE, Group_Name as MASTER , Item_Name as "NAMA BAHAN" , Item_Size as UKURAN , Item_Description  as DESKRIPSI , Item_Unit as SATUAN , Item_MinOrder as "MIN ORDER" , Item_LeadTime as "LEAD TIME" , Item_PackingSize as "PACKING SIZE" , Item_LocalIndent as "LOCAL/INDENT" from vwITEM_PRINT
      where item_type like '${itemType}';
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
      worksheet.addRow(["Master Item"]);
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

module.exports = MasterItemBahanAwalController;
