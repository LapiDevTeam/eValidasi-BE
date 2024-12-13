const { sequelizeMSQL } = require("../../config/config.sequelize.dbmssql");
const { QueryTypes } = require("sequelize");
const MyError = require("../../helpers/errors");
const ExcelJS = require("exceljs");

class MasterItemBahanKemasTemplateController {
  static async fetchItemWithGroupTemplate(req, res, next) {
    try {
      const { kodeOrNamaBahan = "", isActive, groupType } = req.query;
      const sqlCode = `
            select Item_ID, Group_name, Item_Name, Item_Size, Item_Description, item_unit,
        item_group, item_type, item_Currency, Item_Price, Item_MinOrder, Item_LeadTime, 
        item_PackingSize, Item_Localindent, Item_LastPriceCurrency, item_LastPrice, item_lastPriceDate,
        item_status, IsActive,Owner, ishalal, item_bpomgenerik, namagenerik, item_row from vwM_ItemWithGroup_template where item_type = '${groupType}'
         ${
           isActive ? "and IsActive = 1" : ""
         } and item_id + ' ' + item_name like '%${kodeOrNamaBahan}%'`;
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
      });

      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }
  static async fetchItemWithGroupTemplateOther(req, res, next) {
    try {
      const { item_groupID, item_type } = req.query;
      const sqlCode = `
        select Item_ID , Group_name, Item_Name, Item_Size, Item_Description, item_unit, item_group, item_type, item_Currency, Item_Price, Item_MinOrder, Item_LeadTime, item_PackingSize, Item_Localindent, Item_LastPriceCurrency, item_LastPrice, item_lastPriceDate, item_status, IsActive, '1' as SubCode 
      from vwM_ItemWithGroup 
      where item_type like '${item_type}' and item_isPPI = 1  and Item_Group = '${item_groupID}' union all Select '${item_groupID} ' + Group_ID, '' , '' , '' , '' , '' , '' , '' , '' , '' , '' , '' , '' , '' , '' , '' , '' , '' , '', '0'  
      from m_Item_Group where Group_ID <> 'NN' and ISNUMERIC(left(Group_ID,1)) = 0 order by 1;
      `;
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
      });

      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }

  static async downloadExcelExportItemTemplate(req, res, next) {
    try {
      const { itemType } = req.query;

      if (!itemType) throw new MyError(400, "Item Type is required");
      const fileName = `Master Item Template ${itemType}`;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Sheet 1");

      const queryCode = `
        Select Type_Name as TIPE, Item_ID as KODE, Group_Name as MASTER , Item_Name as "NAMA BAHAN" , Item_Size as UKURAN , Item_Description  as DESKRIPSI , Item_Unit as SATUAN , Item_MinOrder as "MIN ORDER" , Item_LeadTime as "LEAD TIME" , Item_PackingSize as "PACKING SIZE" , Item_LocalIndent as "LOCAL/INDENT" , Item_Periode as "Periode" from vwITEM_PRINT_template
      where item_type like '${itemType}' ORDER BY item_Periode , Item_ID;
      `;
      const dataAudit = await sequelizeMSQL.query(queryCode, {
        type: QueryTypes.SELECT,
      });

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

module.exports = MasterItemBahanKemasTemplateController;
