const { sequelizeMSQL } = require("../../config/config.sequelize.dbmssql");
const { QueryTypes } = require("sequelize");
const MyError = require("../../helpers/errors");
const ExcelJS = require("exceljs");

class MasterItemBahanKemasTemplateController {
  static async readPembuatTemplate(req, res, next) {
    try {
      const { prcName } = req.query;
      const sqlCode = `
        Select Prc_Name,Prc_ID from m_Principle_template where isActive=1 and prc_id in (select isnull(prc_id,'') from T_QA_UA_M_Vendor union all Select '00029' as prc_ID ) and Prc_name like :prcName order by prc_name
      `;
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
        replacements: {
          prcName: `%${prcName || ""}%`,
        },
      });
      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }
  static async readPemasokTemplate(req, res, next) {
    try {
      const { suppName } = req.query;
      const sqlCode = `
        select sUPP_NAME, Supp_ID from m_Supplier_template WHERE isActive = 1 and supp_id in (select isnull(supp_id,'') from T_QA_UA_M_Vendor union all Select '00307' as supp_id ) and supp_name like :suppName order by supp_name
      `;
      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
        replacements: {
          suppName: `%${suppName || ""}%`,
        },
      });
      res.status(200).json({ data: _data });
    } catch (error) {
      next(error);
    }
  }
  static async fetchItemWithGroupTemplate(req, res, next) {
    try {
      const { kodeOrNamaBahan = "", isActive, groupType } = req.query;

      // Build the base SQL query matching original VB6 logic
      let sqlCode = `
        select Item_ID, Group_name, Item_Name, Item_Size, Item_Description, item_unit,
        item_group, item_type, item_Currency, Item_Price, Item_MinOrder, Item_LeadTime,
        item_PackingSize, Item_Localindent, Item_LastPriceCurrency, item_LastPrice, item_lastPriceDate,
        item_status, IsActive, Owner, ishalal, item_bpomgenerik, namagenerik, item_row
        from vwM_ItemWithGroup_template
        where item_type like :groupType`;

      // Add isActive filter if specified (matching VB6's conditional logic)
      if (isActive === "1" || isActive === 1 || isActive === true) {
        sqlCode += ` and isActive = 1`;
      }

      // Add search filter matching VB6's concatenated search pattern
      if (kodeOrNamaBahan) {
        sqlCode += ` and item_id + ' ' + item_name like :kodeOrNamaBahan`;
      }

      // Add ORDER BY matching VB6's "order by 1"
      sqlCode += ` order by 1`;

      const _data = await sequelizeMSQL.query(sqlCode, {
        type: QueryTypes.SELECT,
        replacements: {
          groupType: groupType || '%',
          kodeOrNamaBahan: `%${kodeOrNamaBahan}%`,
        },
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
        select Item_ID , Group_Name, Item_Name, Item_Size, Item_Description, item_unit, item_group, item_type, item_Currency, Item_Price, Item_MinOrder, Item_LeadTime, item_PackingSize, Item_Localindent, Item_LastPriceCurrency, item_LastPrice, item_lastPriceDate, item_status, IsActive, '1' as SubCode
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

  static async masterItemBahanTemplateApprover(req, res, next) {
    const transaction = await sequelizeMSQL.transaction();
    try {
      const { user_id, delegated_to } = req.user;
      const { item_groupID } = req.body;

      if (!item_groupID)
        throw new MyError(400, "Group KODE tidak boleh dikosongkan !!!");

      // Periode and dateTime
      const [{ perio: periode, GetNow: dateTime }] = await sequelizeMSQL.query(
        `SELECT REPLACE(CONVERT(VARCHAR(19), GETDATE(), 121), '-', '') AS perio,
                CONVERT(VARCHAR, GETDATE(), 20) AS GetNow`,
        { type: QueryTypes.SELECT }
      );

      // Check Approver line
      const [_isApprove] = await sequelizeMSQL.query(
        `SELECT TOP 1 Appr_Identity
         FROM m_Approver_Lines
         WHERE isactive = 1
           AND Appr_ApplicationCode LIKE 'ITEM'
           AND Appr_ID LIKE :user_id`,
        {
          replacements: { user_id },
          type: QueryTypes.SELECT,
        }
      );
      if (!_isApprove?.Appr_Identity)
        throw new MyError(400, "Approver tidak sesuai");

      const approverId = _isApprove.Appr_Identity;

      // Update Queries (Cleaned Syntax)
      const xSQL1 = `
        UPDATE m_Item_Manufacturing_Supplier_template
        SET item_Periode = :periode, tgl_berlaku = :dateTime, user_approve = :user_id, user_delegated = :delegated_to
        WHERE ISNULL(item_Periode, N'') = ''
          AND Item_ID IN (
            SELECT DISTINCT Item_ID
            FROM m_Item_Manufacturing_template WITH (UPDLOCK, HOLDLOCK)
            WHERE ISNULL(item_Periode, '') = ''
              AND Item_Group = :item_groupID
          );

        UPDATE m_Item_Manufacturing_template
        SET item_Periode = :periode, tgl_berlaku = :dateTime, user_approve = :user_id, user_delegated = :delegated_to
        WHERE ISNULL(item_Periode, N'') = ''
          AND Item_Group = :item_groupID;

        UPDATE m_Item_Manufacturing_Status
        SET USER_ID = :user_id, Delegated_To = :delegated_to, flag_update = 'Update For Delete'
        WHERE Item_ID IN (
          SELECT Item_ID
          FROM m_Item_Manufacturing WITH (UPDLOCK, HOLDLOCK)
          WHERE Item_Group = :item_groupID
        );

        DELETE FROM m_Item_Manufacturing_Status
        WHERE Item_ID IN (
          SELECT Item_ID
          FROM m_Item_Manufacturing WITH (UPDLOCK, HOLDLOCK)
          WHERE Item_Group = :item_groupID
        );
      `;
      await sequelizeMSQL.query(xSQL1, {
        replacements: {
          periode,
          dateTime,
          user_id,
          delegated_to,
          item_groupID,
        },
        type: QueryTypes.UPDATE,
        transaction,
      });

      const xSQL2 = `
        INSERT INTO m_Item_Manufacturing_Status (Item_ID, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To)
        SELECT Item_ID, 1, 0, :approverId, :dateTime, :user_id, :delegated_to
        FROM m_Item_Manufacturing_template
        WHERE ISNULL(item_Periode, '') = :periode
          AND Item_Group = :item_groupID
          AND NOT EXISTS (
            SELECT 1 FROM m_Item_Manufacturing_Status s WHERE s.Item_ID = m_Item_Manufacturing_template.Item_ID
          );
      `;
      await sequelizeMSQL.query(xSQL2, {
        replacements: {
          approverId,
          periode,
          dateTime,
          user_id,
          delegated_to,
          item_groupID,
        },
        type: QueryTypes.UPDATE,
        transaction,
      });

      const zSQL1 = `
        UPDATE m_Item_Manufacturing_Supplier
        SET USER_ID = :user_id, Delegated_To = :delegated_to, flag_update = 'Update For Delete'
        WHERE Item_ID IN (
          SELECT DISTINCT Item_ID
          FROM m_Item_Manufacturing
          WHERE Item_Group = :item_groupID
        );

        DELETE FROM m_Item_Manufacturing_Supplier
        WHERE Item_ID IN (
          SELECT DISTINCT Item_ID
          FROM m_Item_Manufacturing
          WHERE Item_Group = :item_groupID
        );
      `;
      await sequelizeMSQL.query(zSQL1, {
        replacements: { user_id, delegated_to, item_groupID },
        type: QueryTypes.UPDATE,
        transaction,
      });

      const zSQL2 = `
        INSERT INTO m_Item_Manufacturing_Supplier (Item_ID, Item_PrcID, Item_SuppID, Process_Date, User_ID, Delegated_To, isActive, Item_Revision, isDefault, Item_RevisionDate, Item_RevisionUserID, item_ket, input_date, Item_BPOMGenerik, Item_BPOMNegara, Item_isHalal, Lembaga, Nomor_sertifikat, Masa_berlaku_date, Dok_Pendukung)
        SELECT Item_ID, Item_PrcID, Item_SuppID, :dateTime, :user_id, :delegated_to, isActive, Item_Revision, isDefault, Item_RevisionDate, Item_RevisionUserID, item_ket, input_date, Item_BPOMGenerik, Item_BPOMNegara, Item_isHalal, Lembaga, Nomor_sertifikat, Masa_berlaku_date, Dok_Pendukung
        FROM m_Item_Manufacturing_Supplier_template
        WHERE ISNULL(item_Periode, '') = :periode;
      `;
      await sequelizeMSQL.query(zSQL2, {
        replacements: { dateTime, user_id, delegated_to, periode },
        type: QueryTypes.UPDATE,
        transaction,
      });

      const vSQL2 = `
      insert into m_Item_Manufacturing ( PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder,Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, Item_Status, Item_BJ, User_ID, Delegated_To, Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd,Item_LastPriceCurrencyNonIDR, Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row)
      SELECT PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder,   Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, 1 as Item_Status, Item_BJ, :user_id as User_ID, :delegated_to as  Delegated_To, :dateTime as Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd,   Item_LastPriceCurrencyNonIDR , Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row
      From m_Item_Manufacturing_template
      WHERE (ISNULL(item_Periode, N'') =  :periode)
      `;
      await sequelizeMSQL.query(vSQL2, {
        replacements: {
          periode,
          dateTime,
          user_id,
          delegated_to,
        },
        type: QueryTypes.UPDATE,
        transaction,
      });

      const vSQL3 = `
      insert into m_Item_Manufacturing_template (PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder,Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, Item_Status, Item_BJ, User_ID, Delegated_To, Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd, Item_LastPriceCurrencyNonIDR, Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row, item_Periode, tgl_berlaku, user_approve,user_delegated)
      SELECT PK_ID, Item_ID, Item_Name, Item_Group, Item_Type, Item_Size, Item_Description, Item_Currency, Item_Price, Item_Unit, Item_PurchaseUnit, Item_MinOrder,   Item_LeadTime, Item_PackingSize, Item_LocalIndent, Item_LastPurchaseUnit, Item_LastPriceCurrency, Item_LastPrice, Item_LastPriceDate, 1 as Item_Status, Item_BJ,   User_ID, Delegated_To, Process_Date, isActive, Item_MonthUjiUlang, Item_isPPI, Item_Lokasi, Item_MonthLifeTime, Item_PersenAdd,   Item_LastPriceCurrencyNonIDR, Item_LastPriceNonIDR, Item_LastPriceRate, Owner, Item_PackingSizePC, isHalal, Item_BPOMGenerik, item_row,   null as item_Periode, null as tgl_berlaku, null as user_approve, null as user_delegated
      From m_Item_Manufacturing_template
      WHERE (ISNULL(item_Periode, N'') =  :periode)
      `;
      await sequelizeMSQL.query(vSQL3, {
        replacements: {
          periode,
        },
        type: QueryTypes.UPDATE,
        transaction,
      });


      await transaction.commit();
      res.status(200).json({ data: "Data has been approved" });
    } catch (error) {
      await transaction.rollback();
      next(error);
    }
  }
}

module.exports = MasterItemBahanKemasTemplateController;
