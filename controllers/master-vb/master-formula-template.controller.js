const e = require('cors');
const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { getPagination, getPagingData } = require('../../helpers/pagination');
const { Sequelize } = require('../../models');
const ExcelJS = require("exceljs");
const { QueryTypes } = require('sequelize');
const moment = require('moment');


const createNewMasterFormulaTemplate = async (req, res) => {
  try {
    const { user_id, delegated_to } = req.user;

    let {
      PPI_ID,
      dcoPPI_Description,
      TxtPPI_ProductID = '',
      TxtPPI_BatchSize,
      TXT_rendemen_min,
      txt_pPI_batchsizekemasan,
      TxtPPI_SubID,
      TxtPPI_ProductInit,
      dcoPPI_BatchSizeUnitID,
      TxtPPI_Kemasan,
      txtJumlahLOT,
      Txt_kemas01,
      DataGrid,
      gstrUserName,
      gstrDelegatedTo,
      tag
    } = req.body;

    // Validate required fields
    if (!PPI_ID || !dcoPPI_Description) {
      return res.status(400).json({ message: "Lengkapi Dahulu KODE PRODUK, OLAH/KEMAS, PS/TOLL-IN/TOLL-OUT !!!" });
    }

    if (!TxtPPI_BatchSize || Number(TxtPPI_BatchSize) <= 0) {
      return res.status(400).json({ message: "Batch size harus diisi, tidak boleh kosong." });
    }

    if (isNaN(TXT_rendemen_min) || TXT_rendemen_min > 100) {
      return res.status(400).json({ message: "Rendemen nilai Maximum 100 %." });
    }

    if (isNaN(txt_pPI_batchsizekemasan) || Number(txt_pPI_batchsizekemasan) <= 0) {
      return res.status(400).json({ message: "Besar Bets dalam satuan jual, harus lebih besar dari nol !" });
    }

    // Current date and time
    const currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss');

    // Insert Header
    const headerSQL = `
      INSERT INTO m_PPI_Header_template
      (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_BatchSize,
       PPI_BatchSizeUnitID, PPI_Kemasan, PPI_Status, Process_Date, User_ID,
       Delegated_To, isActive, ppi_lot, pPI_batchsizekemasan, rendemen_min, PPI_Kemasan01)
      VALUES
      (:PPI_ID, :TxtPPI_SubID, :TxtPPI_ProductID, :TxtPPI_ProductInit,
       :TxtPPI_BatchSize, :dcoPPI_BatchSizeUnitID, :TxtPPI_Kemasan, 'A',
       :currentDateTime, :gstrUserName, :gstrDelegatedTo, '1', :txtJumlahLOT,
       :txt_pPI_batchsizekemasan, :TXT_rendemen_min, :Txt_kemas01);
    `;

    // Process DataGrid
    let detailSQL = '';
    if (Array.isArray(DataGrid) && DataGrid.length > 0) {
      detailSQL = DataGrid.map((row, index) => {
        const { ItemID, QTY, UnitID } = row;
        if (!ItemID || ItemID.includes('(NONE)')) return null;

        return `
          INSERT INTO m_PPI_Detail_template
          (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_SeqID,
           PPI_ItemID, PPI_QTY, PPI_UnitID, Process_Date, USER_ID, Delegated_To)
          VALUES
          (:PPI_ID, :TxtPPI_SubID, :TxtPPI_ProductID, :TxtPPI_ProductInit,
           ${index + 1}, :ItemID, :QTY, :UnitID, :currentDateTime, :gstrUserName, :gstrDelegatedTo);
        `;
      }).filter(Boolean).join(' ');
    }

    // Delete Existing Records
    const deleteSQL = `
      DELETE FROM m_PPI_Detail_template
      WHERE ISNULL(item_Periode, '') = '' AND
            CONCAT(PPI_ID, PPI_SUBID, PPI_PRODUCTID, CONVERT(VARCHAR(1), PPI_PRODUCTINIT)) LIKE :tag;

      DELETE FROM m_PPI_Header_template
      WHERE ISNULL(item_Periode, '') = '' AND
            CONCAT(PPI_ID, PPI_SUBID, PPI_PRODUCTID, CONVERT(VARCHAR(1), PPI_PRODUCTINIT)) LIKE :tag;
    `;

    // Combine all SQL
    // const combinedSQL = `${deleteSQL} ${headerSQL} ${detailSQL}`;
    const combinedSQL = `${headerSQL} ${detailSQL}`;

    // Execute SQL
    await sequelizeMSQL.query(combinedSQL, {
      replacements: {
        PPI_ID,
        TxtPPI_SubID,
        TxtPPI_ProductID,
        TxtPPI_ProductInit,
        TxtPPI_BatchSize: parseFloat(TxtPPI_BatchSize).toFixed(3),
        dcoPPI_BatchSizeUnitID,
        TxtPPI_Kemasan,
        currentDateTime,
        gstrUserName: gstrUserName || user_id,
        gstrDelegatedTo: gstrDelegatedTo || delegated_to,
        txtJumlahLOT,
        txt_pPI_batchsizekemasan,
        TXT_rendemen_min,
        Txt_kemas01,
        tag
      },
      type: QueryTypes.INSERT
    });

    return res.status(200).json({ message: "Data has been saved successfully." });
  } catch (error) {
    console.error({ error });
    return res.status(500).json({ message: "Error while creating new master formula template", details: error.message });
  }
};

const exportStatusPembuat = async (req, res) => {
  const { PPI_ProductID } = req.query;

  try {
    let strSQL;

    if (!PPI_ProductID) {
      strSQL = `
        SELECT DISTINCT
          A.PPI_ProductID,
          C.Product_Name,
          A.PPI_ItemID,
          A.Item_Name,
          A.Prc_ID,
          A.Prc_Name,
          CASE
            WHEN ISNULL(B.Status_PPI, '') = '' THEN ''
            ELSE ISNULL(B.Status_PPI, '')
          END AS Status_PPI,
          CASE
            WHEN ISNULL(B.Priority, '') = '' THEN ''
            ELSE ISNULL(B.Priority, '')
          END AS Priority,
          D.PPI_Description
        FROM vw_PPI_Item_PRC_Status_Export_to_David AS A
        LEFT JOIN m_ppi_detail_not_produksi AS B
          ON A.PPI_ProductID = B.PPI_ProductID
          AND A.PPI_ItemID = B.PPI_ItemID
          AND A.Prc_ID = B.Item_prcID
        LEFT JOIN m_product AS C
          ON C.Product_ID = A.PPI_ProductID
        LEFT JOIN m_PPI_Type_Owner AS D
          ON D.PPI_Format = A.PPI_ID
        ORDER BY A.PPI_ProductID, A.PPI_ItemID,
          CASE
            WHEN ISNULL(B.Status_PPI, '') = '' THEN ''
            ELSE ISNULL(B.Status_PPI, '')
          END,
          CASE
            WHEN ISNULL(B.Priority, '') = '' THEN ''
            ELSE ISNULL(B.Priority, '')
          END
      `;
    } else {
      strSQL = `
        SELECT DISTINCT
          A.PPI_ProductID,
          C.Product_Name,
          A.PPI_ItemID,
          A.Item_Name,
          A.Prc_ID,
          A.Prc_Name,
          CASE
            WHEN ISNULL(B.Status_PPI, '') = '' THEN ''
            ELSE ISNULL(B.Status_PPI, '')
          END AS Status_PPI,
          CASE
            WHEN ISNULL(B.Priority, '') = '' THEN ''
            ELSE ISNULL(B.Priority, '')
          END AS Priority,
          D.PPI_Description
        FROM vw_PPI_Item_PRC_Status_Export_to_David AS A
        LEFT JOIN m_ppi_detail_not_produksi AS B
          ON A.PPI_ProductID = B.PPI_ProductID
          AND A.PPI_ItemID = B.PPI_ItemID
          AND A.Prc_ID = B.Item_prcID
        LEFT JOIN m_product AS C
          ON C.Product_ID = A.PPI_ProductID
        LEFT JOIN m_PPI_Type_Owner AS D
          ON D.PPI_Format = A.PPI_ID
        WHERE A.PPI_ProductID = :PPI_ProductID
        ORDER BY A.PPI_ProductID, A.PPI_ItemID,
          CASE
            WHEN ISNULL(B.Status_PPI, '') = '' THEN ''
            ELSE ISNULL(B.Status_PPI, '')
          END,
          CASE
            WHEN ISNULL(B.Priority, '') = '' THEN ''
            ELSE ISNULL(B.Priority, '')
          END
      `;
    }

    const result = await sequelizeMSQL.query(strSQL, {
      replacements: { PPI_ProductID },
      type: QueryTypes.SELECT
    });

    if (result.length === 0) {
      return res.status(404).send({ message: "NO DATA FOUND !!!" });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sheet 1");

    worksheet.addRow(["Excel Report"]);
    worksheet.addRow([`Print On : ${new Date().toLocaleString()}`]);
    worksheet.addRow([``]);

    // Add headers
    const headers = Object.keys(result[0]);
    worksheet.addRow(headers);

    // Add data
    result.forEach((row) => {
      worksheet.addRow(Object.values(row));
    });

    // Format cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.font = { size: 8 };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    worksheet.columns.forEach(column => {
      column.width = column.values.reduce((max, val) => Math.max(max, val.toString().length), 10);
    });

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=ppi_export.xlsx');
    res.send(buffer);
  } catch (error) {
    console.log({ error });
    return res.status(500).send({ message: error.message });
  }
};


module.exports = { exportStatusPembuat, createNewMasterFormulaTemplate };
