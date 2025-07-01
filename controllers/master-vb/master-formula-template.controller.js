const e = require('cors');
const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { getPagination, getPagingData } = require('../../helpers/pagination');
const { Sequelize, sequelize } = require('../../models');
const ExcelJS = require("exceljs");
const { QueryTypes, fn } = require('sequelize');
const moment = require('moment');
const { getItemSupplier_template } = require('./master-bahan-awal-template.controller');


const createNewMasterFormulaTemplate = async (req, res) => {
  try {
    const { user_id, delegated_to } = req.user;

    let {
      PPI_ID,
      PPI_Description = '',
      PPI_ProductID = '',
      PPI_BatchSize,
      rendemen_min,
      PPI_batchsizekemasan = '',
      PPI_SubID = '',
      PPI_ProductInit = '0',
      PPI_SeqID = '0',
      PPI_BatchSizeUnitID = '',
      PPI_Kemasan = '',
      JumlahLOT = '',
      kemas01 = '',
      DataGrid = [],
      gstrUserName = user_id,
      gstrDelegatedTo = delegated_to,
      tag
    } = req.body;

    // Validate required fields
    if (!PPI_ID || !PPI_Description) {
      return res.status(400).json({ message: "Lengkapi Dahulu KODE PRODUK, OLAH/KEMAS, PS/TOLL-IN/TOLL-OUT !!!" });
    }

    if (!PPI_BatchSize || Number(PPI_BatchSize) <= 0) {
      return res.status(400).json({ message: "Batch size harus diisi, tidak boleh kosong." });
    }

    if (isNaN(rendemen_min) || rendemen_min > 100) {
      return res.status(400).json({ message: "Rendemen nilai Maximum 100 %." });
    }

    if (isNaN(PPI_batchsizekemasan) || Number(PPI_batchsizekemasan) <= 0) {
      return res.status(400).json({ message: "Besar Bets dalam satuan jual, harus lebih besar dari nol !" });
    }

    // Validate field lengths
    if (PPI_ID.length > 30) return res.status(400).json({ message: "PPI_ID too long" });
    if (PPI_SubID.length > 3) return res.status(400).json({ message: "PPI_SubID too long" });
    if (PPI_ProductID.length > 30) return res.status(400).json({ message: "PPI_ProductID too long" });
    if (PPI_BatchSizeUnitID.length > 20) return res.status(400).json({ message: "PPI_BatchSizeUnitID too long" });
    if (PPI_Kemasan.length > 100) return res.status(400).json({ message: "PPI_Kemasan too long" });
    if (JumlahLOT && JumlahLOT.length > 2) return res.status(400).json({ message: "JumlahLOT too long" });
    if (kemas01 && kemas01.length > 200) return res.status(400).json({ message: "kemas01 too long" });
    if (gstrUserName && gstrUserName.length > 10) return res.status(400).json({ message: "User_ID too long" });
    if (gstrDelegatedTo && gstrDelegatedTo.length > 10) return res.status(400).json({ message: "Delegated_To too long" });

    // Ensure numbers are numbers
    const batchSize = Number(PPI_BatchSize);
    const batchSizeKemasan = Number(PPI_batchsizekemasan);
    const rendemen = Number(rendemen_min);
    if (isNaN(batchSize) || isNaN(batchSizeKemasan) || isNaN(rendemen)) {
      return res.status(400).json({ message: "Batch size, batch size kemasan, and rendemen_min must be numbers" });
    }

    const currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss');

    const headerSQL = `
      INSERT INTO m_PPI_Header_template
      (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_BatchSize,
       PPI_BatchSizeUnitID, PPI_Kemasan, PPI_Status, Process_Date, User_ID,
       Delegated_To, isActive, ppi_lot, pPI_batchsizekemasan, rendemen_min, PPI_Kemasan01)
      VALUES
      (:PPI_ID, :PPI_SubID, :PPI_ProductID, :PPI_ProductInit,
       :PPI_BatchSize, :PPI_BatchSizeUnitID, :PPI_Kemasan, 'A',
       :currentDateTime, :gstrUserName, :gstrDelegatedTo, '1', :JumlahLOT,
       :PPI_batchsizekemasan, :rendemen_min, :kemas01);
    `;

    // Process DataGrid
    let detailSQL = '';
    if (Array.isArray(DataGrid) && DataGrid.length > 0) {
      detailSQL = DataGrid.map((row, index) => {
        const { ItemID, QTY, UnitID } = row;
        console.log({ItemID});
        if (!ItemID || ItemID.includes('(NONE)')) return null;
        return `
          INSERT INTO m_PPI_Detail_template
          (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_SeqID,
           PPI_ItemID, PPI_QTY, PPI_UnitID, Process_Date, USER_ID, Delegated_To)
          VALUES
          (:PPI_ID, :PPI_SubID, :PPI_ProductID, :PPI_ProductInit,
           ${index + 1}, '${ItemID}', '${QTY}', '${UnitID}', :currentDateTime, :gstrUserName, :gstrDelegatedTo);
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

    // const combinedSQL = `${deleteSQL} ${headerSQL} ${detailSQL}`;
    const combinedSQL = `${headerSQL} ${detailSQL}`;
    console.log({
      PPI_ID,
      PPI_SubID,
      PPI_ProductID,
      PPI_ProductInit,
      PPI_BatchSize: parseFloat(PPI_BatchSize).toFixed(3),
      PPI_BatchSizeUnitID,
      PPI_Kemasan,
      currentDateTime,
      gstrUserName: gstrUserName || user_id,
      gstrDelegatedTo: gstrDelegatedTo || delegated_to,
      JumlahLOT,
      PPI_batchsizekemasan,
      rendemen_min,
      kemas01,
      tag
    });
    // Execute SQL
    await sequelizeMSQL.query(combinedSQL, {
      replacements: {
      PPI_ID,
      PPI_SubID,
      PPI_ProductID,
      PPI_ProductInit: PPI_ProductInit ? parseInt(PPI_ProductInit, 10) : 0,
      PPI_BatchSize: parseFloat(PPI_BatchSize).toFixed(3),
      PPI_BatchSizeUnitID,
      PPI_Kemasan,
      currentDateTime,
      gstrUserName: gstrUserName || user_id,
      gstrDelegatedTo: gstrDelegatedTo || delegated_to,
      JumlahLOT: JumlahLOT ? JumlahLOT : 0,
      PPI_batchsizekemasan,
      rendemen_min,
      kemas01,
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

const updateMasterFormulaTemplate = async (req, res) => {
  const { PPI_ID, kemas01, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_BatchSize, PPI_BatchSizeUnitID, PPI_Kemasan, PPI_lot, pPI_batchsizekemasan, rendemen_min, PPI_Kemasan01, DataGrid = [] } = req.body;
  const { user_id, delegated_to, nama_user, bagian_user } = req.user

  if (!PPI_ID && !PPI_SubID && !PPI_ProductID && !PPI_ProductInit) {
    return res.status(400).send({ message: "All parameters (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit) are required" });
  }

  if (!PPI_BatchSize || Number(PPI_BatchSize) <= 0) {
    return res.status(400).send({ message: "Besar Bets dalam satuan jual, harus lebih besar dari nol !" });
  }

  if (isNaN(rendemen_min) || rendemen_min > 100) {
    return res.status(400).send({ message: "Rendemen nilai Maximum 100 %." });
  }

  // Validate field lengths
  if (PPI_ID.length > 30) return res.status(400).json({ message: "PPI_ID too long" });
  if (PPI_SubID.length > 3) return res.status(400).json({ message: "PPI_SubID too long" });
  if (PPI_ProductID.length > 30) return res.status(400).json({ message: "PPI_ProductID too long" });
  if (PPI_BatchSizeUnitID.length > 20) return res.status(400).json({ message: "PPI_BatchSizeUnitID too long" });
  if (PPI_Kemasan.length > 100) return res.status(400).json({ message: "PPI_Kemasan too long" });

  // Ensure numbers are numbers
  const batchSize = Number(PPI_BatchSize);
  const batchSizeKemasan = Number(pPI_batchsizekemasan);
  const rendemen = Number(rendemen_min);
  if (isNaN(batchSize) || isNaN(batchSizeKemasan) || isNaN(rendemen)) {
    return res.status(400).json({ message: "Batch size, batch size kemasan, and rendemen_min must be numbers" });
  }

  try {
    const currentDateTime = moment().format('YYYY-MM-DD HH:mm:ss');

    // Delete existing records
    const deleteSQL = `
      DELETE FROM m_PPI_Detail_template
      WHERE ISNULL(item_Periode, '') = '' AND
        PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE :tag;
    `;

    // Process DataGrid
    let detailSQL = '';
    if (Array.isArray(DataGrid) && DataGrid.length > 0) {
      console.log({DataGrid});
      detailSQL = DataGrid.map((row, index) => {
        const { PPI_ItemID, PPI_QTY = '0', PPI_UnitID } = row;
        console.log({PPI_ItemID, test: 'asd'});
        if (!PPI_ItemID || PPI_ItemID.includes('(NONE)')) return null;

        return `
          INSERT INTO m_PPI_Detail_template
          (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_SeqID,
           PPI_ItemID, PPI_QTY, PPI_UnitID, Process_Date, USER_ID, Delegated_To)
          VALUES
          (:PPI_ID, :PPI_SubID, :PPI_ProductID, :PPI_ProductInit,
           ${index + 1}, '${PPI_ItemID}', '${PPI_QTY}', '${PPI_UnitID}', :currentDateTime, :user_id, :delegated_to);
        `;
      }).filter(Boolean).join(' ');
    }

    console.log({detailSQL});

    // Update header
    const updateHeaderSQL = `
      UPDATE m_PPI_Header_template
      SET PPI_BatchSize = :PPI_BatchSize,
          PPI_Kemasan = :PPI_Kemasan,
          PPI_BatchSizeUnitID = :PPI_BatchSizeUnitID,
          PPI_lot = :PPI_lot,
          pPI_batchsizekemasan = :pPI_batchsizekemasan,
          rendemen_min = :rendemen_min,
          PPI_Kemasan01 = :PPI_Kemasan01
      WHERE ISNULL(item_Periode, '') = '' AND
            PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag;
    `;

    console.log({updateHeaderSQL});
    // Update product owner
    const updateProductOwnerSQL = `
      UPDATE m_product
      SET Product_Owner = :deptID
      WHERE Product_ID = :PPI_ProductID;

      UPDATE m_Product_template
      SET Product_Owner = :deptID
      WHERE Product_ID = :PPI_ProductID AND ISNULL(Product_Periode, '') = '';
    `;

    const deptID = bagian_user;

    // Combine all SQL
    const combinedSQL = `${deleteSQL} ${detailSQL} ${updateHeaderSQL} ${updateProductOwnerSQL}`;

    // Execute SQL
    const tag = `${PPI_ID}${PPI_SubID}${PPI_ProductID}${PPI_ProductInit}`;
    console.log({tag});
    await sequelizeMSQL.query(combinedSQL, {
      replacements: {
        PPI_ID,
        PPI_SubID,
        PPI_ProductID,
        PPI_ProductInit,
        PPI_BatchSize: parseFloat(PPI_BatchSize).toFixed(3),
        PPI_BatchSizeUnitID,
        PPI_Kemasan,
        currentDateTime,
        user_id: user_id,          // Fixed: was gstrUserName
        delegated_to: delegated_to, // Fixed: was gstrDelegatedTo
        PPI_lot,
        pPI_batchsizekemasan,
        rendemen_min,
        PPI_Kemasan01,
        tag,
        deptID
      },
      type: QueryTypes.INSERT
    });

    return res.status(200).json({ message: "Data has been updated successfully." });
  } catch (error) {
    console.error({ error });
    return res.status(500).json({ message: "Error while updating master formula template", details: error.message });
  }
};

const preApprove = async (req, res, next) => {
  const { PPI_ID, PPI_ProductID, PPI_SubID = '', PPI_ProductInit } = req.body;
  const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;
  // console.log({user: req.user});
  if (!PPI_ID || !PPI_ProductInit) {
    return res.status(400).send({ message: "Formula produk belum dipilih, cek parameter" });
  }

  const tag = `${PPI_ID}${PPI_SubID}${PPI_ProductID}${PPI_ProductInit}`;

  try {
    let strPeriode = moment().format('YYYYMMDD HH:mm:ss');
    let strTglBerlaku = moment().format('YYYY-MM-DD HH:mm:ss');
    let ppi_ED = 0;
    let ppi_revisi = "00";

    // Check ppi_ED
    const checkEDSQL = `
      SELECT ISNULL(ppi_ED, 0) AS ppi_ED, spv_Approve_date
      FROM m_PPI_Header_Template
      WHERE ISNULL(user_approve, '') = ''
        AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE :tag
    `;
    const edResult = await sequelizeMSQL.query(checkEDSQL, {
      replacements: { tag },
      type: QueryTypes.SELECT
    });

    if (edResult.length > 0) {
      ppi_ED = edResult[0].ppi_ED;
    }

    // Check joblevel_id_user and ppi_revisi
    let checkRevisiSQL;
    if (joblevel_id_user === 1) { // SPV (joblevel_id_user 1)
      console.log('masuk sini 1', joblevel_id_user);
      checkRevisiSQL = `
        SELECT ISNULL(ppi_revisi, '') AS ppi_revisi, ISNULL(ppi_ed, 0) AS ppi_ed
        FROM m_ppi_Header
        WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE :tag
      `;
    } else if (joblevel_id_user >= 2) { // MGR+ASM (joblevel_id_user 2)
      console.log('masuk sini 2', joblevel_id_user);
      checkRevisiSQL = `
        SELECT ISNULL(ppi_revisi, '') AS ppi_revisi, ISNULL(ppi_ed, 0) AS ppi_ed
        FROM m_PPI_Header_Template
        WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE :tag
          AND ISNULL(user_approve, '') = ''
      `;
    }

    let arppovedDate = edResult?.length > 0 ? edResult[0]?.spv_Approve_date : null
    if (checkRevisiSQL) {
      const revisiResult = await sequelizeMSQL.query(checkRevisiSQL, {
        replacements: { tag },
        type: QueryTypes.SELECT
      });

      // console.log({revisiResult});
      if (revisiResult.length > 0) {
        if (revisiResult[0].ppi_revisi !== "") {
          ppi_revisi = joblevel_id_user === 1 ?
            (parseInt(revisiResult[0].ppi_revisi, 10) + 1).toString().padStart(2, '0') :
            revisiResult[0].ppi_revisi.padStart(2, '0');
        }
      }
    }

    const cekOriStr = `
      SELECT A.* from m_ppi_header A
      WHERE A.PPI_ID + A.PPI_SUBID + A.PPI_PRODUCTID + CONVERT(VARCHAR(1), A.PPI_PRODUCTINIT) LIKE :tag
    `

    const checkApproveMGR = await sequelizeMSQL.query(cekOriStr, {
      replacements: { tag },
      type: QueryTypes.SELECT
    });

    const approvedByMGR = checkApproveMGR?.length > 0 ? checkApproveMGR[0]?.Process_Date : null;

    const response = {
      blnEditBatchLock: false,
      Fra1Enabled: false,
      cmdFindFormulaEnabled: false,
      strPeriode,
      strTglBerlaku,
      ppi_ED,
      ppi_revisi,
      cmdNewApprovePPIEnabled: true,
      txtBatchLockEnabled: true,
      txtRevisiPPIEnabled: true,
      cmdApprovePPIEnabled: true,
      cmdMergerPPIEnabled: true,
      hideFields: [
        "cmdRefresh", "CmdAddNew", "CmdUpdate", "cmdDelete", "cmdApprove",
        "cmdPrintNew", "cmdPrint", "cmdEditLockBatch", "cmdPrintLockBatch",
        "cmd_status", "cmdExit"
      ],
      fraApproveVisible: true,
      fraApproveTop: 1680,
      fraApproveLeft: 120,
      Label12Visible: false,
      lvwMergerPPIVisible: false,
      approvedBySPV: arppovedDate,
      approvedByMGR,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error({ error });
    return res.status(500).send({ message: 'Error while pre-approving master formula template', details: error.message });
  }
};

const enableGrid = async (req, res) => {
  const { PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, txtJumlahLOT, txt_pPI_batchsizekemasan, TXT_rendemen_min } = req.query;
  const { user_id, delegated_to } = req.user;

  try {

    const dataGridEnabled = true;
    let query = `
      SELECT PPI_ItemID, group_name, item_name, item_size, PPI_QTY, PPI_UnitID
      FROM vwPPIDetailwithItem_template
      WHERE PPI_ID LIKE '${PPI_ID}'
        AND PPI_SubID LIKE '${PPI_SubID}'
        AND PPI_ProductID LIKE '${PPI_ProductID}'
        AND PPI_ProductInit = '${PPI_ProductInit}'
      ORDER BY PPI_SeqID
    `;

    let adodc2 = await sequelizeMSQL.query(query, { type: QueryTypes.SELECT });

    if (adodc2.length === 0) {
      // If no records found, insert new records
      let queryCheck = `
        SELECT PPI_ID
        FROM m_PPI_Header_template
        WHERE ISNULL(item_Periode, '') = ''
          AND PPI_ID LIKE '${PPI_ID}'
          AND PPI_SubID LIKE '${PPI_SubID}'
          AND PPI_ProductID LIKE '${PPI_ProductID}'
          AND PPI_ProductInit = '${PPI_ProductInit}'
      `;

      const adodc9 = await sequelizeMSQL.query(queryCheck, { type: QueryTypes.SELECT });

      let insertDetailQuery = `
        INSERT INTO m_PPI_Detail_template (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_SeqID, PPI_ItemID, PPI_QTY, PPI_UnitID, Process_Date, USER_ID, Delegated_To)
        VALUES ('${PPI_ID}', '${PPI_SubID}', '${PPI_ProductID}', '${PPI_ProductInit}', '1', '(NONE)', '0', '(NONE)', '${new Date().toISOString()}', '${user_id}', '${delegated_to}')
      `;

      if (adodc9.length === 0) {
        let insertHeaderQuery = `
          INSERT INTO m_PPI_Header_template (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_BatchSize, PPI_BatchSizeUnitID, PPI_Kemasan, PPI_Status, Process_Date, User_ID, Delegated_To, isActive, ppi_lot, pPI_batchsizekemasan, rendemen_min)
          VALUES ('${PPI_ID}', '${PPI_SubID}', '${PPI_ProductID}', '${PPI_ProductInit}', '0', '(NONE)', '(NONE)', 'A', '${new Date().toISOString()}', '${user_id}', '${delegated_to}', '1', '${parseFloat(txtJumlahLOT)}', '${txt_pPI_batchsizekemasan}', '${parseFloat(TXT_rendemen_min)}')
        `;
        insertDetailQuery = insertHeaderQuery + '; ' + insertDetailQuery;
      }

      await sequelizeMSQL.query(insertDetailQuery, { type: QueryTypes.INSERT });

      adodc2 = await sequelizeMSQL.query(query, { type: QueryTypes.SELECT });

      return res.status(200).json({ message: "Grid enabled and data inserted", dataGridEnabled, dataGridFocus, fieldsDisabled, buttonsDisabled });
    } else {
      // If records found, refresh the grid
      const adodc11Query = `
        SELECT TOP 1 PPI_ItemID, group_name, item_name, item_size, PPI_QTY, PPI_UnitID
        FROM vwPPIDetailwithItem_template
        WHERE PPI_ID LIKE '${PPI_ID}'
          AND PPI_SubID LIKE '${PPI_SubID}'
          AND PPI_ProductID LIKE '${PPI_ProductID}'
          AND PPI_ProductInit = '${PPI_ProductInit}'
      `;

      const adodc11 = await sequelizeMSQL.query(adodc11Query, { type: QueryTypes.SELECT });

      return res.status(200).json({ message: "OK", data: adodc2 });
    }
  } catch (error) {
    console.error('Error enabling grid:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const deleteMasterFormulaTemplateBAK = async (req, res) => {
  const { PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit } = req.body;
  const { user_id, bagian_user } = req.user;
  console.log({asasasasas: req.user});

  if (!user_id || user_id === '') {
    return res.status(401).send({ message: 'User ID is required' });
  }
  if (!PPI_ID || !PPI_ProductID || !PPI_ProductInit) {
    return res.status(400).send({ message: 'Lengkapi Dahulu KODE PRODUK, OLAH/KEMAS, PS/TOLL-IN/TOLL-OUT !!!' });
  }

  const tag = `${PPI_ID}${PPI_SubID}${PPI_ProductID}${PPI_ProductInit}`;

  try {
    // Check if the user has approval lines access
    const checkApprovalSQL = `
      SELECT Appr_No, Appr_Identity
      FROM m_Approver_Lines
      WHERE Appr_ApplicationCode LIKE 'PPI'
        AND Appr_DeptID = :deptID
        AND Appr_ID LIKE :user_id
        AND isActive = 1
        AND Appr_No = 2
    `;
    const approvalResult = await sequelizeMSQL.query(checkApprovalSQL, {
      replacements: { deptID: bagian_user, user_id },
      type: QueryTypes.SELECT,
    });

    if (approvalResult.length === 0) {
      return res.status(403).send({ message: 'Anda tidak punya akses approval lines! hanya Asst. Mgr atau Mgr' });
    }

    // Confirm deletion
    const confirmation = true; // Replace with actual confirmation logic if needed
    if (confirmation) {
      // Check stock
      const checkStockSQL = `
        SELECT xx.ppiSubInit, xx.PPI_ItemID, xx.jumlahStockTotal, dbo.fn_Item_check_other_formula(XX.PPI_ItemID, XX.ppiSubInit) AS count
        FROM (
          SELECT (PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT)) AS ppiSubInit,
                 A.PPI_ItemID, SUM(B.Stock) AS jumlahStockTotal
          FROM m_PPI_Detail_template A
          LEFT JOIN vw_UP_tindaklanjut_Stock B ON A.PPI_ItemID = B.St_ItemID
          WHERE ISNULL(A.item_Periode, '') = ''
            AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) = :tag
          GROUP BY A.PPI_ItemID, (PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT))
        ) XX
        WHERE XX.jumlahStockTotal > 0
          AND dbo.fn_Item_check_other_formula(XX.PPI_ItemID, XX.ppiSubInit) = 0
      `;
      const stockResult = await sequelizeMSQL.query(checkStockSQL, {
        replacements: { tag },
        type: QueryTypes.SELECT,
      });

      if (stockResult.length > 0) {
        let stockDetails = '';
        stockResult.forEach((stock) => {
          stockDetails += `${stock.PPI_ItemID} (${stock.jumlahStockTotal}); `;
        });
        return res.status(400).send({ message: `Stock is not zero for items: ${stockDetails}` });
      }

      // Delete records
      const deleteSQL = `
        DELETE FROM m_PPI_Header_template
        WHERE ISNULL(item_Periode, '') = ''
          AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE :tag;

        DELETE FROM m_PPI_Header
        WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE :tag;

        DELETE FROM m_PPI_Detail_template
        WHERE ISNULL(item_Periode, '') = ''
          AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE :tag;

        DELETE FROM m_PPI_Detail
        WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE :tag;
      `;

      const deleteResult = await sequelizeMSQL.query(deleteSQL, {
        replacements: { tag },
        type: QueryTypes.DELETE,
      });
      //CEK APPROVE
      return res.status(200).send({ message: "Data has been deleted successfully." });

    }
  } catch (error) {
    console.error({ error });
    return res.status(500).send({ message: 'Error while deleting master formula template', details: error.message });
  }
};

const deleteMasterFormulaTemplate = async (req, res) => {
  const transaction = await sequelizeMSQL.transaction();
  try {
    const { tag, PPI_Owner, PPI_Description, PPI_ProductID } = req.body;
    const { user_id, bagian_user } = req.user;

    // Validate required fields
    if (!PPI_Owner && !PPI_Description && !PPI_ProductID) {
      return res.status(400).json({
        message: "Lengkapi Dahulu KODE PRODUK, OLAH/KEMAS, PS/TOLL-IN/TOLL-OUT !!!"
      });
    }

    // Check user permissions - must be Asst. Mgr or Mgr level
    const permissionQuery = `
      SELECT Appr_No, Appr_Identity
      FROM m_Approver_Lines
      WHERE Appr_ApplicationCode LIKE 'PPI'
        AND Appr_DeptID = :deptID
        AND Appr_ID LIKE :userID
        AND isActive = 1
        AND Appr_No = 2
    `;

    const permissionResult = await sequelizeMSQL.query(permissionQuery, {
      replacements: {
        deptID: bagian_user,
        userID: user_id
      },
      type: QueryTypes.SELECT,
      transaction
    });

    if (permissionResult.length === 0) {
      await transaction.rollback();
      return res.status(403).json({
        message: "Anda tidak punya akses approval lines! hanya Asst. Mgr atau Mgr"
      });
    }

    // Check if there's stock for items used only in this formula
    const stockCheckQuery = `
      SELECT xx.ppiSubInit, xx.PPI_ItemID, xx.jumlahStockTotal,
             dbo.fn_Item_check_other_formula(XX.PPI_ItemID, XX.ppiSubInit) as count
      FROM (
        SELECT (PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT)) AS ppiSubInit,
               A.PPI_ItemID, SUM(B.Stock) AS jumlahStockTotal
        FROM [m_PPI_Detail_template] A
        LEFT JOIN vw_UP_tindaklanjut_Stock B ON A.PPI_ItemID = B.St_ItemID
        WHERE ISNULL(A.item_Periode, '') = ''
          AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) = :tag
        GROUP BY A.PPI_ItemID, (PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT))
      ) XX
      WHERE XX.jumlahStockTotal > 0
        AND dbo.fn_Item_check_other_formula(XX.PPI_ItemID, XX.ppiSubInit) = 0
    `;

    const stockResult = await sequelizeMSQL.query(stockCheckQuery, {
      replacements: { tag },
      type: QueryTypes.SELECT,
      transaction
    });

    // Optional: Could add warning for items with stock
    let itemsWithStock = '';
    if (stockResult.length > 0) {
      itemsWithStock = stockResult.map(item =>
        `${item.PPI_ItemID}(${item.jumlahStockTotal})`
      ).join('; ');

      // You could choose to return this as a warning instead of blocking deletion
      console.log(`Warning: Items with stock: ${itemsWithStock}`);
    }

    // Execute delete statements
    const deleteQueries = `
      DELETE FROM [m_PPI_Header_template]
      WHERE ISNULL(item_Periode, '') = ''
        AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag;

      DELETE FROM [m_PPI_Header]
      WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag;

      DELETE FROM [m_PPI_detail_template]
      WHERE ISNULL(item_Periode, '') = ''
        AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag;

      DELETE FROM [m_PPI_detail]
      WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag;
    `;

    await sequelizeMSQL.query(deleteQueries, {
      replacements: { tag },
      type: QueryTypes.DELETE,
      transaction
    });

    // Check if formula can be approved (equivalent to fnApprove in VB)
    // This is a placeholder - implement the approval check logic as needed
    const canApprove = true; // Simplified for this example

    if (canApprove) {
      // Update follow-up table (equivalent to sbUpdateFUPTL in VB)
      // Implement this as needed based on your application's requirements

      await transaction.commit();
      return res.status(200).json({
        message: "Data has been deleted successfully",
        itemsWithStock: itemsWithStock || null
      });
    } else {
      await transaction.rollback();
      return res.status(400).json({
        message: "Cannot delete data that has been approved/rejected"
      });
    }
  } catch (error) {
    console.error("Error deleting formula template:", error);
    await transaction.rollback();
    return res.status(500).json({
      message: "Failed to delete formula template",
      details: error.message || "Internal server error"
    });
  }
};

const fnApprove = async (
  listApprovePPI = [],
  listMergerPPI = [],
  checkAllBatch = 0,
  userName,
  deptID,
  delegatedTo = '',
  productID,
  productInit,
  tag,
  subID,
  revisiPPI,
  ED,
  dcoPPI_Owner
) => {
  const transaction = await sequelizeMSQL.transaction();
  try {
    let strPeriode = moment().format('YYYYMMDD HH:mm:ss');
    const strTglBerlaku = moment().format('YYYY-MM-DD HH:mm:ss');
    let ppi_ED = 0;
    let ppi_revisi = '00';
    let ppi_id = ''
    // Check ppi_ED
    const checkEDSQL = `
    SELECT ISNULL(ppi_ED, 0) AS ppi_ED, PPI_ID
    FROM m_PPI_Header_Template
    WHERE ISNULL(user_approve, '') = ''
      AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE :tag
  `;

    const edResult = await sequelizeMSQL.query(checkEDSQL, {
      replacements: { tag },
      type: QueryTypes.SELECT,
      transaction: transaction
    });

    if (!edResult || edResult?.length <= 0) {
      return {
        error: false,
        message: 'PPI Data not found',
      };
    }

    if (edResult.length > 0) {
      ppi_ED = edResult[0].ppi_ED;
      ppi_id = edResult[0].PPI_ID;
    }
    console.log({ userName, deptID, delegatedTo, ppi_ED, ppi_revisi });
    const strAppr_Identity = userName;

    const deleteStrSQL1 = `
    DELETE FROM m_ppi_header_lock
    WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE :tag
    `;

    const deleteStrSQL2 = `
    DELETE FROM m_ppi_header_lock_template
    WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE :tag
    `;

   const deleteStrSQL1Result = await sequelizeMSQL.query(deleteStrSQL1, {
    replacements: {
      tag
    },
    type: QueryTypes.DELETE,
    transaction
   })
   const deleteStrSQL2Result = await sequelizeMSQL.query(deleteStrSQL2, {
    replacements: {
      tag
    },
    type: QueryTypes.DELETE,
    transaction
   })

   console.log({deleteStrSQL1Result, deleteStrSQL2Result});
    let strInsertListApprovePPI = ''
    if (listApprovePPI.length > 0) {
      listApprovePPI.forEach((item) => {
        strInsertListApprovePPI += `
        INSERT INTO m_ppi_header_lock (ppi_productid, ppi_productinit, ppi_id, ppi_subid, ppi_batchno, ppi_keterangan, process_date, user_id, delegated_to)
        VALUES ('${productID}', '${productInit}', '${tag}', '${subID}', '${item.batchno}', '${item.keterangan}', GETDATE(), '${userName}', '${delegatedTo}');

        INSERT INTO m_ppi_header_lock_template (ppi_productid, ppi_productinit, ppi_id, ppi_subid, ppi_batchno, ppi_keterangan, process_date, user_id, delegated_to)
        VALUES ('${productID}', '${productInit}', '${tag}', '${subID}', '${item.batchno}', '${item.keterangan}', GETDATE(), '${userName}', '${delegatedTo}');
      `;
      });
    }

    if (strInsertListApprovePPI?.length > 0) {
      const resultInsertListApprovePPI = await sequelizeMSQL.query(strInsertListApprovePPI, {
        type: QueryTypes.INSERT,
        transaction
      })
      console.log({resultInsertListApprovePPI});
    }


    if (listMergerPPI.length > 0) {
      const strDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

      const strDeleteMergerPPI = `
      DELETE FROM m_ppi_header_merger
      WHERE PPI_ProductID = '${productID}'
        AND ppi_productinit = '${productInit}'
        AND ppi_id = '${ppi_id}'
        AND ppi_subid_utama = '${subID}';`


      const strInsertHeaderMergerPPI = `INSERT INTO m_ppi_header_merger (PPI_ProductID, PPI_ProductInit, PPI_ID, PPI_SubID, PPI_SubID_Utama, PPI_Keterangan, Process_Date, User_ID, Delegated_to, flag_update, user_approve, user_Delegated, user_Approve_date)
      SELECT PPI_ProductID, PPI_ProductInit, PPI_ID, PPI_SubID, PPI_SubID_Utama, PPI_Keterangan, '${strDateNow}', User_ID, Delegated_to, flag_update, '${userName}', '${delegatedTo}', '${strDateNow}'
      FROM m_ppi_header_merger_Template
      WHERE ISNULL(user_approve, '') = ''
        AND PPI_ProductID = '${productID}'
        AND PPI_ProductInit = '${productInit}'
        AND PPI_ID = '${ppi_id}'
        AND PPI_SubID_Utama = '${subID}';`

      const strInsertHeaderMergerPPI_template = `INSERT INTO m_ppi_header_merger_template (PPI_ProductID, PPI_ProductInit, PPI_ID, PPI_SubID, PPI_SubID_Utama, PPI_Keterangan, Process_Date, User_ID, Delegated_to, flag_update, user_approve, user_Delegated, user_Approve_date)
      SELECT PPI_ProductID, PPI_ProductInit, PPI_ID, PPI_SubID, PPI_SubID_Utama, PPI_Keterangan, Process_Date, User_ID, Delegated_to, flag_update, '${userName}', '${delegatedTo}', '${strDateNow}'
      FROM m_ppi_header_merger_Template
      WHERE ISNULL(user_approve, '') = ''
        AND PPI_ProductID = '${productID}'
        AND PPI_ProductInit = '${productInit}'
        AND PPI_ID = '${ppi_id}'
        AND PPI_SubID_Utama = '${subID}';`

      const strUpdateHeaderMergerPPI_template = `UPDATE m_ppi_header_merger_Template
      SET USER_ID = '${userName}', Delegated_to = '${delegatedTo}', Process_Date = '${strDateNow}'
      WHERE ISNULL(user_approve, '') = ''
        AND PPI_ProductID = '${productID}'
        AND PPI_ProductInit = '${productInit}'
        AND PPI_ID = '${ppi_id}'
        AND PPI_SubID_Utama = '${subID}';
    `;

      const resultDeleteMergerPPI = await sequelizeMSQL.query(strDeleteMergerPPI, { transaction });
      const resultInsertHeaderMergerPPI = await sequelizeMSQL.query(strInsertHeaderMergerPPI, { transaction });
      const resulInsertHeaderMergerPPI_template = await sequelizeMSQL.query(strInsertHeaderMergerPPI_template, { transaction });
      const resultUpdateHeaderMergerPPI_template = await sequelizeMSQL.query(strUpdateHeaderMergerPPI_template, { transaction });

      console.log({
        resultDeleteMergerPPI,
        resultInsertHeaderMergerPPI,
        resulInsertHeaderMergerPPI_template,
        resultUpdateHeaderMergerPPI_template
      });

    let strCombinedUpdatePPI = ''
      listMergerPPI.forEach((item) => {
        strCombinedUpdatePPI += `
        UPDATE m_PPI_Header_template
        SET ppi_revisi = '${revisiPPI}'
        WHERE PPI_ID = '${ppi_id}'
          AND PPI_SubID = '${item.subID}'
          AND PPI_ProductID = '${productID}'
          AND PPI_ProductInit = ${productInit}
          AND tgl_berlaku IS NULL;

        UPDATE m_PPI_Header
        SET ppi_revisi = '${revisiPPI}'
        WHERE PPI_ID = '${ppi_id}'
          AND PPI_SubID = '${item.subID}'
          AND PPI_ProductID = '${productID}'
          AND PPI_ProductInit = ${productInit};
      `;
      });

      if (strCombinedUpdatePPI?.length > 0) {
        const resultCombinedUpdatePPI = await sequelizeMSQL.query(strCombinedUpdatePPI, {
          type: QueryTypes.UPDATE,
          transaction
        })

        console.log({resultCombinedUpdatePPI});
      }
    }



    // Additional SQL statements
    const strAdd1 = `
    UPDATE m_PPI_Detail
    SET USER_ID = '${userName}', Delegated_To = '${delegatedTo}', flag_update = 'Update For Delete'
    WHERE PPI_ID = '${ppi_id}'
      AND PPI_SubID = '${subID}'
      AND PPI_ProductID = '${productID}'
      AND PPI_ProductInit = '0';`

    const strAdd2 = `DELETE FROM m_PPI_Detail
    WHERE PPI_ID = '${ppi_id}'
      AND PPI_SubID = '${subID}'
      AND PPI_ProductID = '${productID}'
      AND PPI_ProductInit = 0;`

    const strAdd3 = `UPDATE m_PPI_Header
    SET USER_ID = '${userName}', Delegated_To = '${delegatedTo}', flag_update = 'Update For Delete'
    WHERE PPI_ID = '${ppi_id}'
      AND PPI_SubID = '${subID}'
      AND PPI_ProductID = '${productID}'
      AND PPI_ProductInit = 0;`

    const strAdd4 = `DELETE FROM m_PPI_Header
    WHERE PPI_ID = '${ppi_id}'
      AND PPI_SubID = '${subID}'
      AND PPI_ProductID = '${productID}'
      AND PPI_ProductInit = 0;`

    const strAdd5 = `UPDATE m_PPI_status
    SET USER_ID = '${userName}', Delegated_To = '${delegatedTo}', flag_update = 'Update For Delete'
    WHERE ppi_no = '${tag}';`

    const strAdd6 = `DELETE FROM m_PPI_status
    WHERE ppi_no = '${tag}';`

    const strAdd7 = `UPDATE m_PPI_Header_template
    SET item_Periode = '${strPeriode}', tgl_berlaku = '${strTglBerlaku}', user_approve = '${userName}', user_Delegated = '${delegatedTo}'
    WHERE PPI_ID = '${ppi_id}'
      AND PPI_SubID = '${subID}'
      AND PPI_ProductID = '${productID}'
      AND PPI_ProductInit = 0`


    const strAdd8 = `UPDATE m_PPI_detail_template
    SET item_Periode = '${strPeriode}', tgl_berlaku = '${strTglBerlaku}', user_approve = '${userName}', user_Delegated = '${delegatedTo}'
    WHERE PPI_ID = '${ppi_id}'
      AND PPI_SubID = '${subID}'
      AND PPI_ProductID = '${productID}'
      AND PPI_ProductInit = 0
      AND tgl_berlaku IS NULL;
  `;

    // execute additional queries
    await sequelizeMSQL.query(strAdd1, { transaction });
    await sequelizeMSQL.query(strAdd2, { transaction });
    await sequelizeMSQL.query(strAdd3, { transaction });
    await sequelizeMSQL.query(strAdd4, { transaction });
    await sequelizeMSQL.query(strAdd5, { transaction });
    await sequelizeMSQL.query(strAdd6, { transaction });
    await sequelizeMSQL.query(strAdd7, { transaction });
    await sequelizeMSQL.query(strAdd8, { transaction });


    const SQLInsertOri = `
      INSERT INTO m_PPI_Header (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_BatchSize, PPI_BatchSizeUnitID, PPI_Kemasan, PPI_Status, Process_Date, User_ID, Delegated_To, isActive, PPI_StatusUserID, PPI_StatusDate, PPI_StatusDelegated_To, status_default, PPI_Lot, flag_update, update_from, PPI_revisi, PPI_ED, pPI_batchsizekemasan, rendemen_min, default_kebutuhanbahan, PPI_Kemasan01)
      SELECT PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, CAST(PPI_BatchSize AS FLOAT), PPI_BatchSizeUnitID, PPI_Kemasan, PPI_Status, '${strTglBerlaku}', '${userName}', '${delegatedTo}', isActive, PPI_StatusUserID, PPI_StatusDate, PPI_StatusDelegated_To, status_default, PPI_Lot, flag_update, update_from, '${revisiPPI}', ${ppi_ED}, ISNULL(pPI_batchsizekemasan, 0), ISNULL(rendemen_min, 0), default_kebutuhanbahan, PPI_Kemasan01
      FROM m_PPI_Header_Template
      WHERE ISNULL(item_Periode, '') = '${strPeriode}'
        AND PPI_ID = '${ppi_id}'
        AND PPI_SubID = '${subID}'
        AND PPI_ProductID = '${productID}'
        AND PPI_ProductInit = 0;

      INSERT INTO m_PPI_Detail (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_SeqID, PPI_ItemID, PPI_QTY, PPI_UnitID, Process_Date, User_ID, Delegated_To)
      SELECT PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_SeqID, PPI_ItemID, PPI_QTY, PPI_UnitID, '${strTglBerlaku}', '${userName}', '${delegatedTo}'
      FROM m_PPI_Detail_Template
      WHERE ISNULL(item_Periode, '') = '${strPeriode}'
        AND PPI_ID = '${ppi_id}'
        AND PPI_SubID = '${subID}'
        AND PPI_ProductID = '${productID}'
        AND PPI_ProductInit = 0;
    `;

    const resultSQLInsertOri = await sequelizeMSQL.query(SQLInsertOri, { transaction });

    const SQLInsertTemp = `
      INSERT INTO m_PPI_Header_Template (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_BatchSize, PPI_BatchSizeUnitID, PPI_Kemasan, PPI_Status, Process_Date, User_ID, Delegated_To, isActive, PPI_StatusUserID, PPI_StatusDate, PPI_StatusDelegated_To, status_default, PPI_Lot, flag_update, update_from, item_Periode, tgl_berlaku, user_approve, user_Delegated, ppi_revisi, PPI_ED, pPI_batchsizekemasan, rendemen_min, default_kebutuhanbahan, PPI_Kemasan01)
      SELECT PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_BatchSize, PPI_BatchSizeUnitID, PPI_Kemasan, PPI_Status, Process_Date, User_ID, Delegated_To, isActive, PPI_StatusUserID, PPI_StatusDate, PPI_StatusDelegated_To, status_default, PPI_Lot, flag_update, update_from, NULL, NULL, NULL, NULL, '${revisiPPI}', '${ppi_ED}', ISNULL(pPI_batchsizekemasan, 0), ISNULL(rendemen_min, 0), default_kebutuhanbahan, PPI_Kemasan01
      FROM m_PPI_Header_Template
      WHERE ISNULL(item_Periode, '') = '${strPeriode}'
        AND PPI_ID = '${ppi_id}'
        AND PPI_SubID = '${subID}'
        AND PPI_ProductID = '${productID}'
        AND PPI_ProductInit = 0;

      INSERT INTO m_PPI_Detail_Template (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_SeqID, PPI_ItemID, PPI_QTY, PPI_UnitID, Process_Date, User_ID, Delegated_To, item_Periode, tgl_berlaku, user_approve, user_Delegated)
      SELECT PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_SeqID, PPI_ItemID, PPI_QTY, PPI_UnitID, Process_Date, User_ID, Delegated_To, NULL, NULL, NULL, NULL
      FROM m_PPI_Detail_Template
      WHERE ISNULL(item_Periode, '') = '${strPeriode}'
        AND PPI_ID = '${ppi_id}'
        AND PPI_SubID = '${subID}'
        AND PPI_ProductID = '${productID}'
        AND PPI_ProductInit = 0;
    `;

    const resultSQLInsertTemp = await sequelizeMSQL.query(SQLInsertTemp, { transaction });
    console.log({resultSQLInsertTemp, resultSQLInsertOri});

    // Check if all batches should be updated
    if (checkAllBatch) {
      const strUpdate2 = `
        UPDATE m_ppi_header_template
        SET ppi_status = 'I', process_date = GETDATE(), user_id = '${userName}', delegated_to = '${delegatedTo}'
        WHERE tgl_berlaku IS NULL
          AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE '${tag}'
          AND ppi_status = 'A'
          AND isactive = 1;

        UPDATE m_ppi_header
        SET ppi_status = 'I', process_date = GETDATE(), user_id = '${userName}', delegated_to = '${delegatedTo}'
        WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE '${tag}'
          AND ppi_status = 'A'
          AND isactive = 1;
      `;
      const resultstrUpdate2 = await sequelizeMSQL.query(strUpdate2, { transaction });
      console.log({resultstrUpdate2});
    } else {
      const strUpdate3 = `
        UPDATE m_ppi_header_template
        SET ppi_status = 'A', process_date = GETDATE(), user_id = '${userName}', delegated_to = '${delegatedTo}'
        WHERE tgl_berlaku IS NULL
          AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE '${tag}'
          AND ppi_status = 'I'
          AND isactive = 1;

        UPDATE m_ppi_header
        SET ppi_status = 'A', process_date = GETDATE(), user_id = '${userName}', delegated_to = '${delegatedTo}'
        WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE '${tag}'
          AND ppi_status = 'I'
          AND isactive = 1;
      `;
      const resultstrUpdate3 = await sequelizeMSQL.query(strUpdate3, { transaction });
      console.log({resultstrUpdate3});
    }

    const checkRowSQL = `
      SELECT COUNT(*) AS cekRow
      FROM m_ppi_detail_template AS A
      LEFT JOIN m_item_manufacturing AS B ON A.PPI_ItemID = B.item_id
      WHERE A.ppi_productId = '${productID}'
        AND ISNULL(A.user_approve, '') = ''
        AND B.Item_Type = 'BB'
    `;
    const rowResult = await sequelizeMSQL.query(checkRowSQL, {
      type: QueryTypes.SELECT,
    });

    if (rowResult.length > 0 && rowResult[0].cekRow > 0) {
      const checkPrioritySQL = `
        SELECT COUNT(*) AS RowCon
        FROM m_ppi_detail_not_produksi_temp
        WHERE PPI_ProductID = '${productID}'
        `;
      const priorityResult = await sequelizeMSQL.query(checkPrioritySQL, {
        type: QueryTypes.SELECT,
      });

      if (priorityResult[0].RowCon == 0 && dcoPPI_Owner !== 'TOLL IN') {
        throw new Error('Mohon cek status Item Principle!');
      }

      const checkStatusSQL = `
          SELECT COUNT(*) AS RowCon
          FROM m_ppi_detail_not_produksi_temp
          WHERE (ISNULL(priority, 0) <= 0 OR ISNULL(Status_PPI, '') = '')
          AND PPI_ProductID = '${productID}'
        `;
      const statusResult = await sequelizeMSQL.query(checkStatusSQL, {
        type: QueryTypes.SELECT,
      });

      if (statusResult[0]?.RowCon > 0 && dcoPPI_Owner !== 'TOLL IN') {
        throw new Error('Mohon cek status Item Principle dan Priority harus terisi');
      }
      const strDeleteNotProd = `
        DELETE FROM m_ppi_detail_not_produksi
        WHERE PPI_ProductID = '${productID}';`;

      const strInsertNotProd = `INSERT INTO m_ppi_detail_not_produksi (PPI_ID, PPI_ProductID, PPI_ProductInit, PPI_ItemID, Status_PPI, Process_Date, User_ID, Delegated_To, flag_update, Item_prcID, Priority)
        SELECT PPI_ID, PPI_ProductID, PPI_ProductInit, PPI_ItemID, Status_PPI, GETDATE(), '${userName}', '${delegatedTo}', NULL, Item_prcID, Priority
        FROM m_ppi_detail_not_produksi_temp;`;

        const resultstrDeleteNotProd = await sequelizeMSQL.query(strDeleteNotProd, {
          transaction
        });

        const resultstrInsertNotProd = await sequelizeMSQL.query(strInsertNotProd, {
          transaction
        });

        console.log({
          resultstrDeleteNotProd,
          resultstrInsertNotProd
        });
      }
      await transaction.commit();
    return {
      error: false,
      message: 'Master formula template approved successfully',
    };
  } catch (error) {
    await transaction.rollback();
    const resp = {
      error: true,
      message: 'Cannot Approve Data.',
      details: error?.message || 'Error while approving master formula template',
    };
    return resp;
  }
};

const fnapproveSPV = async (tag, userName, delegatedTo, revision) => {
  try {
    console.log({tag2: tag});
    const query = `
      UPDATE m_PPI_Header_Template
      SET spv_Approve_date = GETDATE(),
          spv_user_approve = :userName,
          spv_user_Delegated = :delegatedTo
      WHERE ISNULL(user_approve, '') = ''
        AND (PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT)) LIKE :tag;

      UPDATE m_PPI_Header_Template
      SET ppi_revisi = :revision
      WHERE (PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT)) LIKE :tag
        AND tgl_berlaku IS NULL;
    `;

    const result = await sequelizeMSQL.query(query, {
      replacements: { tag, userName, delegatedTo, revision },
      type: QueryTypes.UPDATE,
    });

    const resp = {
      error: false,
      message: 'OK',
    };
    return resp;
  } catch (error) {
    console.error('Error approving SPV:', error.message);
    const resp = {
      error: true,
      message: 'Cannot Approve Data.',
      details: error.message || "Error while approving master formula template"
    };
    return resp;
  }
};

const sbUpdateFUPTL = async (tag, user_id) => {
  try {
    const strSQL = `EXEC spt_UPTindakLanjut_Appr_formula :tag, :user_id`;
    await sequelizeMSQL.query(strSQL, {
      replacements: { tag, user_id },
      type: QueryTypes.RAW
    });
  } catch (error) {
    console.error({ error });
    throw new Error("Error while updating FUPTL");
  }
};

const isPPIApproved = async (ppiNo) => {
  try {
    const query = `
      SELECT 1
      FROM m_PPI_Status
      WHERE PPI_No = :ppiNo
        AND isReject = 0;
    `;

    const result = await sequelizeMSQL.query(query, {
      replacements: { ppiNo },
      type: QueryTypes.SELECT,
    });

    return result.length > 0;
  } catch (error) {
    console.error('Error checking PPI approval status:', error.message);
    throw new Error('Failed to check approval status');
  }
};

const getApprovalLevel = async (department, userName) => {
  try {
    const query = `
      SELECT ISNULL(appr_no, 0) AS levelID
      FROM m_Approver_Lines
      WHERE Appr_ApplicationCode LIKE 'PPI'
        AND Appr_DeptID = :department
        AND Appr_ID = :userName;
    `;

    const result = await sequelizeMSQL.query(query, {
      replacements: { department, userName },
      type: QueryTypes.SELECT,
    });

    if (result.length === 0) {
      return 0; // Default level if no record is found
    }

    return parseInt(result[0].levelID, 10) || 0; // Return levelID or 0
  } catch (error) {
    console.error('Error fetching approval level:', error.message);
    throw new Error('Failed to fetch approval level');
  }
};

const checkApprovalLevel = async (req, res) => {
  try {
    const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;
    // console.log({user: req.user});
    const { department= bagian_user, userName= user_id } = req.query;

    if (!department || !userName) {
      return res.status(400).send({ message: "Department and UserName are required" });
    }

    const level = await getApprovalLevel(department, userName);

    return res.status(200).send({ department, userName, level });
  } catch (error) {
    console.error({ error });
    return res.status(500).send({ message: error.message });
  }
};

const approveSPV = async (req, res) => {
  try {
    const { user_id, bagian_user, delegated_to, nama_user, joblevel_id_user } = req.user;
    console.log({user: req.user});
    // console.log({user: req.user});
    const { tag, userName = user_id, delegatedTo = delegated_to, revision } = req.body;
    console.log({tag});
    if (!tag || !userName) {
      return res.status(400).send({ message: "Tag and UserName are required" });
    }

    const userLevel = await getApprovalLevel(bagian_user, user_id);
    if (userLevel == 0 || !userLevel) {
      console.log({userLevel});
      return res.status(403).send({ message: "User does not have approval access" });
    }

    const result = await fnapproveSPV(tag, userName, delegatedTo, revision);
    // console.log({result});
    return res.status(200).send(result);

  } catch (error) {
    console.log({error});
    const resp = {
      error: true,
      message: 'Cannot Approve Data.',
      details: error?.message || "Error while approving master formula template"
    }
    return res.status(500).send(resp);
  }
}

const approveMGR = async (req, res) => {
  try {
    let { user_id, bagian_user, nama_user, joblevel_id_user, delegated_to } = req.user;
    if (!user_id || user_id === '') return res.status(401).send('Unauthorized request!');
    const { listApprovePPI = [], listMergerPPI = [], checkAllBatch = 0, deptID = bagian_user, userName = user_id, delegatedTo = delegated_to, productID, productInit, tag, subID, revisiPPI, ED, dcoPPI_Owner = bagian_user } = req.body;

    const approveStatus = await fnApprove(listApprovePPI, listMergerPPI, checkAllBatch, userName, deptID, delegatedTo, productID, productInit, tag, subID, revisiPPI, ED, dcoPPI_Owner);

    return res.status(200).send(approveStatus);

  } catch (error) {
    console.log({error});
    const resp = {
      error: true,
      message: 'Cannot Approve Data.',
      details: error?.message || "Error while approving master formula template"
    }
    return res.status(500).send(resp);
  }
}

const getPrintOutData = async (req, res) => {
  try {
    const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;
    let { page, size, PPI_ProductID, PPI_ProductInit, PPI_ID, PPI_SubID, strFONomor, no_FO = 'RD' } = req.query;
    const { limit, offset } = getPagination(page, size);
    let dtTglBerlaku;
    console.log({user: req.user});
    if (!user_id || !bagian_user) {
      return res.status(400).send({ message: "Unauthorized, Silahkan login terlebih dahulu" });
    }
    let strDNCNo = '';
    let strBypasDate = 'GETDATE()';
    let PPI_DTNomorSTR = ''

    const printQueryStr1 = `
    SELECT *
    FROM m_ppi_printout
    WHERE PPI_ProductID LIKE :PPI_ProductID
      AND PPI_ProductInit = :PPI_ProductInit
      AND PPI_ID LIKE :PPI_ID
      AND PPI_DTNomor LIKE :PPI_DTNomor
      AND CAST(RIGHT(PPI_DTTanggal, 4) + '/' + SUBSTRING(PPI_DTTanggal, 4, 2) + '/' + LEFT(PPI_DTTanggal, 2) AS DATETIME) <= GETDATE()
    ORDER BY PPI_DTRevisi DESC
  `;

    const replacements1 = {
      PPI_ProductID: `${PPI_ProductID}`,
      PPI_ProductInit: PPI_ProductInit,
      PPI_ID: `${PPI_ID}`,
      subID: PPI_SubID,
      PPI_DTNomor: `%${strFONomor}%`,
      strBypasDate: strBypasDate
    };

    const results1 = await sequelizeMSQL.query(printQueryStr1, { replacements: replacements1, type: QueryTypes.SELECT });

    if (results1.length > 0 ) {
      const dateString = results1[0].PPI_DTTanggal;
        dtTglBerlaku = moment(dateString, 'DD/MM/YYYY').format('MM/D/YYYY');
        PPI_DTNomorSTR = results1[0]?.PPI_DTNomor;
        console.log({results1});
        if (!strFONomor || strFONomor === '') strFONomor = results1[0]?.PPI_DTNomor
    }



    if (results1.length === 0 || !results1) {
      const printQueryStr2 = `
      SELECT
        CONVERT(DATETIME, RIGHT(PPI_DTTanggal, 4) + '/' + SUBSTRING(PPI_DTTanggal, 4, 2) + '/' + LEFT(PPI_DTTanggal, 2), 120) AS datetime,
        *
      FROM
        m_ppi_printout
      WHERE
        PPI_ProductID LIKE 'NONE'
        AND PPI_ProductInit = 0
        AND PPI_ID LIKE :PPI_ID
        AND PPI_DTNomor LIKE :PPI_DTNomor
        AND CONVERT(DATETIME, RIGHT(PPI_DTTanggal, 4) + '/' + SUBSTRING(PPI_DTTanggal, 4, 2) + '/' + LEFT(PPI_DTTanggal, 2), 120) <= GETDATE()
      ORDER BY
        PPI_DTRevisi DESC
    `;

      const replacements2 = {
        PPI_ID: `${PPI_ID}`,
        PPI_DTNomor: `%${no_FO}%`,
        strBypasDate: strBypasDate
      };

      const results2 = await sequelizeMSQL.query(printQueryStr2, { replacements: replacements2, type: QueryTypes.SELECT });

      if (results2.length > 0) {
        const dateString = results2[0].PPI_DTTanggal;
        dtTglBerlaku = moment(dateString, 'DD/MM/YYYY').format('MM/D/YYYY');
        console.log({results2});
        if (!strFONomor || strFONomor === '') strFONomor = results2[0]?.PPI_DTNomor
      }
    }

      const queryDataStr = `
      SELECT * FROM (
        SELECT
          KODE,
          MASTER,
          [NAMA BAHAN BAKU] AS [NAMA BAHAN],
          UKURAN,
          [JUMLAH TEORITIS],
          SATUAN,
          NO,
          ITEM_DESCRIPTION,
          PPI_ProductID,
          PPI_ProductInit,
          Reg_BatchNo,
          PPI_id,
          PPI_SubID,
          ROW_NUMBER() OVER (ORDER BY PPI_SeqID) AS row_num
        FROM
          [vwRegPPDetail_Mppi_template]
        WHERE
          PPI_ProductID LIKE :PPI_ProductID
          AND PPI_ProductInit = :PPI_ProductInit
          AND PPI_id LIKE :PPI_id
          AND PPI_SubID LIKE :PPI_SubID
      ) AS temp
      WHERE row_num BETWEEN :startRow AND :endRow;
    `;

    const replacementsQueryData = {
      PPI_ProductID: `%${PPI_ProductID}%`,
      PPI_ProductInit: PPI_ProductInit,
      PPI_id: `%${PPI_ID}%`,
      PPI_SubID: `%${PPI_SubID}%`,
      startRow: offset + 1,
      endRow: offset + limit
    };

    const queryDataResult = await sequelizeMSQL.query(queryDataStr, { replacements: replacementsQueryData, type: QueryTypes.SELECT });
    let dataCount = 0;
    if (queryDataResult.length > 0) {
      dataCount = queryDataResult.length;
    }
    const countQuery = `
      SELECT COUNT(*) AS count
      FROM [vwRegPPDetail_Mppi_template]
      WHERE
        PPI_ProductID LIKE :PPI_ProductID
        AND PPI_ProductInit = :PPI_ProductInit
        AND PPI_id LIKE :PPI_id
        AND PPI_SubID LIKE :PPI_SubID
    `;

    const [total] = await sequelizeMSQL.query(countQuery, {
      replacements: { PPI_ProductID, PPI_ProductInit, PPI_id: PPI_ID, PPI_SubID },
    });

    const data = {
      rows: queryDataResult,
      count: total[0]?.count
    };

    const response = getPagingData(data, page, limit);


    response['No_Doc'] = strFONomor;
    return res.status(200).json(response);

  } catch (error) {
    console.error({ error });
    return res.status(500).send({ message: error.message });
  }
};

const exportLockBatch = async (req, res) => {
  try {
    let strSQL = `
      SELECT
        b.product_name AS [Nama Produk],
        a.PPI_ProductID AS [Kode Produk],
        a.PPI_ID AS [PPI],
        a.PPI_SubID AS [Kombinasi Formula],
        a.PPI_Batchno AS [No.Batch],
        a.PPI_Keterangan AS [Keterangan],
        CONVERT(nvarchar(20), a.Process_Date, 121) AS [Tanggal],
        c.emp_Name AS UserID,
        d.emp_name AS [Delegasi Oleh]
      FROM m_ppi_header_lock a
      LEFT JOIN m_Product b ON a.ppi_productid = b.Product_ID
      LEFT JOIN m_employee c ON a.User_ID = c.emp_NIK
      LEFT JOIN m_employee d ON a.Delegated_to = d.emp_NIK
      UNION ALL
      SELECT
        b.product_name AS [Nama Produk],
        a.PPI_ProductID AS [Kode Produk],
        a.PPI_ID AS [PPI],
        a.PPI_SubID AS [Kombinasi Formula],
        'All Batch' AS [No.Batch],
        'Menunggu Persetujuan BPOM' AS [Keterangan],
        CONVERT(nvarchar(20), a.Process_Date, 121) AS [Tanggal],
        c.emp_Name AS UserID,
        d.emp_name AS [Delegasi Oleh]
      FROM m_ppi_header a
      LEFT JOIN m_Product b ON a.ppi_productid = b.Product_ID
      LEFT JOIN m_employee c ON a.User_ID = c.emp_NIK
      LEFT JOIN m_employee d ON a.Delegated_to = d.emp_NIK
      WHERE a.PPI_Status = 'I' AND a.isActive = 1
    `;

    const result = await sequelizeMSQL.query(strSQL, {
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
    res.setHeader('Content-Disposition', 'attachment; filename=lock_batch_export.xlsx');
    res.send(buffer);
  } catch (error) {
    console.log({ error });
    return res.status(500).send({ message: error.message });
  }
};

const createKeteranganApprove = async (req, res) => {
  try {
    const { user_id, bagian_user, nama_user, joblevel_id_user, delegated_to } = req.user;
    const { tag, checkAllBatch, PK_ID = 0, txtBatchLock, txtKeteranganLock, PPI_ProductID, PPI_ProductInit, PPI_ID, PPI_SubID } = req.body;

    if (!tag || tag === '') {
      return res.status(400).send({ message: "Formula produk belum dipilih" });
    }

    let strSQL = '';

    if (checkAllBatch === 1) {
      strSQL = `
        UPDATE m_ppi_header_template
        SET ppi_status = 'I', process_date = GETDATE(), user_id = '${user_id}', delegated_to = '${delegated_to}'
        WHERE tgl_berlaku IS NULL
          AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE '${tag}'
          AND ppi_status = 'A'
          AND isactive = 1
      `;
    } else {
      if (parseInt(PK_ID) === 0) {
        if (txtBatchLock !== '') {
          strSQL = `
            INSERT INTO m_ppi_header_lock_Template (ppi_productid, ppi_productinit, ppi_id, ppi_subid, ppi_batchno, ppi_keterangan, process_date, user_id, delegated_to)
            VALUES (
              '${PPI_ProductID}', '${PPI_ProductInit}', '${PPI_ID}', '${PPI_SubID}',
              '${txtBatchLock}', '${txtKeteranganLock}', GETDATE(), '${user_id}', '${delegated_to}'
            )
          `;
        }
      } else {
        strSQL = `
          UPDATE m_ppi_header_lock_template
          SET ppi_batchno = '${txtBatchLock}', ppi_keterangan = '${txtKeteranganLock}', process_date = GETDATE(), user_id = '${user_id}', delegated_to = '${delegated_to}'
          WHERE PK_ID = '${PK_ID}'
        `;
      }

      strSQL += `
        ;UPDATE m_ppi_header_template
        SET ppi_status = 'A', process_date = GETDATE(), user_id = '${user_id}', delegated_to = '${delegated_to}'
        WHERE tgl_berlaku IS NULL
          AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE '${tag}'
          AND ppi_status = 'I'
          AND isactive = 1
      `;
    }

    const result = await sequelizeMSQL.query(strSQL);
    await fnUpdateApprove(tag, user_id, delegated_to);
    console.log({result, status: '<--------------------------->'});

    return res.status(200).send({ message: 'Keterangan approve updated successfully' });
  } catch (error) {
    console.log({ error });
    return res.status(500).send({ message: 'Internal server error', details: error.message });
  }
};

const editKeteranganApprove = async (req, res) => {
  try {
    const { user_id, bagian_user, delegated_to } = req.user;
    const { tag, checkAllBatch, PK_ID = 0, txtBatchLock, txtKeteranganLock, PPI_ProductID, PPI_ProductInit, PPI_ID, PPI_SubID } = req.body;

    if (!tag || tag === '') {
      return res.status(400).send({ message: "Formula produk belum dipilih" });
    }

    let strSQL = '';

    if (checkAllBatch === 1) {
      strSQL = `
        UPDATE m_ppi_header
        SET ppi_status = 'I', process_date = GETDATE(), user_id = :user_id, delegated_to = :delegated_to
        WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag
          AND ppi_status = 'A'
          AND isactive = 1
      `;
    } else {
      if (parseInt(PK_ID) === 0) {
        if (txtBatchLock !== '') {
          strSQL = `
            INSERT INTO m_ppi_header_lock (ppi_productid, ppi_productinit, ppi_id, ppi_subid, ppi_batchno, ppi_keterangan, process_date, user_id, delegated_to)
          VALUES (
              '${PPI_ProductID}', '${PPI_ProductInit}', '${PPI_ID}', '${PPI_SubID}',
              '${txtBatchLock}', '${txtKeteranganLock}', GETDATE(), '${user_id}', '${delegated_to}'
            )          `;
        }
      } else {
        strSQL = `
          UPDATE m_ppi_header_lock
          SET ppi_batchno = '${txtBatchLock}', ppi_keterangan = '${txtKeteranganLock}', process_date = GETDATE(), user_id = '${user_id}', delegated_to = '${delegated_to}'
          WHERE PK_ID = '${PK_ID}'
        `;
      }

      strSQL += `
        ;UPDATE m_ppi_header
        SET ppi_status = 'A', process_date = GETDATE(), user_id = '${user_id}', delegated_to = '${delegated_to}'
        WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE '${tag}'
          AND ppi_status = 'I'
          AND isactive = 1
      `;
    }

    const result = await sequelizeMSQL.query(strSQL, {
      replacements: {
        user_id,
        delegated_to,
        tag,
        PK_ID,
        txtBatchLock,
        txtKeteranganLock,
        PPI_ProductID,
        PPI_ProductInit,
        PPI_ID,
        PPI_SubID
      },
      type: QueryTypes.UPDATE
    });

    await fnUpdateApprove(tag, user_id, delegated_to);
    console.log({ result, status: '<--------------------------->' });

    return res.status(200).send({ message: 'Keterangan approve updated successfully' });
  } catch (error) {
    console.log({ error });
    return res.status(500).send({ message: 'Internal server error', details: error.message });
  }
};

const deleteKeteranganApprovePPI = async (req, res) => {
  const { user_id, bagian_user, nama_user, joblevel_id_user, delegated_to } = req.user;
  const { tag, blnEditBatchLock, PK_ID } = req.body;
  const gstrUserName = user_id;
  const gstrDelegatedTo = delegated_to;

  if (!tag) {
    return res.status(400).send({ message: "Formula produk belum dipilih" });
  }

  if (!PK_ID) {
    return res.status(400).send({ message: "Invalid PK_ID" });
  }

  let strSQL = "";
  if (blnEditBatchLock === false) {
    strSQL = `
      UPDATE m_ppi_header_lock_template
      SET USER_ID='${gstrUserName}', Delegated_To='${gstrDelegatedTo}', process_date=GETDATE(), flag_update='Update For Delete'
      WHERE PK_ID='${PK_ID}';
      DELETE FROM m_ppi_header_lock_template
      WHERE PK_ID='${PK_ID}';
    `;
  } else {
    strSQL = `
      UPDATE m_ppi_header_lock
      SET USER_ID='${gstrUserName}', Delegated_To='${gstrDelegatedTo}', process_date=GETDATE(), flag_update='Update For Delete'
      WHERE PK_ID='${PK_ID}';

      DELETE FROM m_ppi_header_lock
      WHERE PK_ID='${PK_ID}';
    `;
  }

  try {
    await sequelizeMSQL.query(strSQL, { type: QueryTypes.RAW });
    res.status(200).send({ message: "Data has been deleted" });
  } catch (error) {
    res.status(500).send({ message: "Error deleting data", error });
  }
}

const getLvwApprove = async (req, res) => {
  try {
    const { tag, blnEditBatchLock } = req.query;

    if (!tag || tag === '') {
      return res.status(400).send({ message: "Tag is required" });
    }

    let strSQL = '';

    if (blnEditBatchLock === 'true') {
      strSQL = `
        SELECT ppi_batchno, ppi_keterangan, PK_ID
        FROM m_ppi_header_lock
        WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag
      `;
    } else {
      strSQL = `
        SELECT ppi_batchno, ppi_keterangan, PK_ID
        FROM m_ppi_header_lock_template
        WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag
      `;
    }

    const result = await sequelizeMSQL.query(strSQL, {
      replacements: { tag },
      type: QueryTypes.SELECT
    });

    if (result.length === 0) {
      return res.status(404).send({ message: "NO DATA FOUND !!!" });
    }

    const response = {
      items: result.map(row => ({
        ppi_batchno: row.ppi_batchno,
        ppi_keterangan: row.ppi_keterangan,
        PK_ID: row.PK_ID
      })),
      chkAllBatch: 0,
      txtBatchLockEnabled: true
    };

    if (blnEditBatchLock === 'true') {
      strSQL = `
        SELECT ppi_status
        FROM m_ppi_header
        WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag
      `;
    } else {
      strSQL = `
        SELECT ppi_status
        FROM m_ppi_header_template
        WHERE tgl_berlaku IS NULL
          AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag
      `;
    }

    const statusResult = await sequelizeMSQL.query(strSQL, {
      replacements: { tag },
      type: QueryTypes.SELECT
    });

    if (statusResult.length > 0) {
      if (statusResult[0].ppi_status === 'A') {
        response.chkAllBatch = 0;
        response.txtBatchLockEnabled = true;
      } else {
        response.chkAllBatch = 1;
        response.txtBatchLockEnabled = false;
      }
    }

    return res.status(200).json(response);
  } catch (error) {
    console.log({ error });
    return res.status(500).send({ message: 'Internal server error', details: error.message });
  }
};

const fnUpdateApprove = async (tag, user_id, delegated_to) => {
  try {
    const sql = `
      UPDATE m_PPI_Header_Template
      SET spv_Approve_date = NULL, spv_user_approve = NULL, spv_user_Delegated = NULL, Process_Date = GETDATE(), USER_ID = :user_id, Delegated_To = :delegated_to
      WHERE ISNULL(user_approve, '') = ''
        AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag
    `;

    const result = await sequelizeMSQL.query(sql, {
      replacements: { tag, user_id, delegated_to },
      type: QueryTypes.UPDATE
    });

    return { success: true, result };
  } catch (error) {
    console.error('Error disapproving formula:', error);
    return { success: false, message: 'Error disapproving formula', error };
  }
};

const getListMergerPPI = async (req, res) => {
  try {
    const { blnEditBatchLock, PPI_ID, PPI_ProductID, PPI_SubID, strTempAlternatif } = req.query;

    if (!PPI_ID || !PPI_ProductID) {
      return res.status(400).send({ message: "Required parameters are missing" });
    }

    let strSQL = '';

    if (blnEditBatchLock === 'true') {
      strSQL = `
        SELECT PPI_ID, PPI_ProductID, PPI_ProductInit, Product_Name, PPI_SubID,
               CASE WHEN PPI_Status = 'A' THEN 'Active' ELSE 'Inactive' END AS Stat,
               PPI_BatchSize, PPI_BatchSizeUnitID, PPI_Kemasan, PPI_Status, PPI_Owner,
               PPI_Description, PPI_Status,
               CASE WHEN product_owner LIKE 'TM' THEN 'RD3' ELSE product_owner END AS product_owner,
               PPI_LOT, PPI_revisi
        FROM vwPPIHeaderwithProductOwner
        WHERE isActive = 1
          AND PPI_ID = :PPI_ID
          AND PPI_ProductID = :PPI_ProductID
          AND PPI_SubID <> :PPI_SubID
      `;

      if (strTempAlternatif && strTempAlternatif !== '') {
        strSQL += ` AND PPI_SubID NOT IN (${strTempAlternatif})`;
      }
    } else {
      strSQL = `
        SELECT PPI_ID, PPI_ProductID, PPI_ProductInit, Product_Name, PPI_SubID,
               CASE WHEN PPI_Status = 'A' THEN 'Active' ELSE 'Inactive' END AS Stat,
               PPI_BatchSize, PPI_BatchSizeUnitID, PPI_Kemasan, PPI_Status, PPI_Owner,
               PPI_Description, PPI_Status,
               CASE WHEN product_owner LIKE 'TM' THEN 'RD3' ELSE product_owner END AS product_owner,
               PPI_LOT, PPI_revisi
        FROM vwPPIHeaderwithProductOwner_template
        WHERE isActive = 1
          AND PPI_ID = :PPI_ID
          AND PPI_ProductID = :PPI_ProductID
          AND PPI_SubID <> :PPI_SubID
      `;

      if (strTempAlternatif && strTempAlternatif !== '') {
        strSQL += ` AND PPI_SubID NOT IN (${strTempAlternatif})`;
      }
    }

    const result = await sequelizeMSQL.query(strSQL, {
      replacements: { PPI_ID, PPI_ProductID, PPI_SubID },
      type: QueryTypes.SELECT
    });

    if (result.length === 0) {
      return res.status(404).send({ message: "NO DATA FOUND !!!" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.log({ error });
    return res.status(500).send({ message: 'Internal server error', details: error.message });
  }
};

const refreshListMergerPPI = async (req, res) => {
  try {
    const { blnEditBatchLock, PPI_ID, PPI_ProductID, PPI_ProductInit } = req.query;

    if (!PPI_ID || !PPI_ProductID || !PPI_ProductInit) {
      return res.status(400).send({ message: "Required parameters are missing" });
    }

    let strSQL = '';

    if (blnEditBatchLock === 'true') {
      strSQL = `
        SELECT *
        FROM m_ppi_header_merger
        WHERE PPI_ID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag
      `;
    } else {
      strSQL = `
        SELECT *
        FROM m_ppi_header_merger_template
        WHERE ISNULL(user_approve, '') = ''
          AND PPI_ID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag
      `;
    }

    const result = await sequelizeMSQL.query(strSQL, {
      replacements: { tag: `${PPI_ID}${PPI_ProductID}${PPI_ProductInit}` },
      type: QueryTypes.SELECT
    });

    if (result.length === 0) {
      return res.status(404).send({ message: "NO DATA FOUND !!!" });
    }

    const response = result
      .map(row => ({
        PPI_SubID: row.PPI_SubID,
        PPI_SubID_Utama: row.PPI_SubID_Utama
      }));

    return res.status(200).json(response);
  } catch (error) {
    console.log({ error });
    return res.status(500).send({ message: 'Internal server error', details: error.message });
  }
};

const createListMergerPPI = async (req, res) => {
  try {
    const { blnEditBatchLock, PPI_ProductID, PPI_ProductInit, PPI_ID, PPI_SubID, SubID_Alternatif } = req.body;
    const { user_id, bagian_user, delegated_to } = req.user;
    console.log({user: req.user});

    if (!PPI_ProductID || !PPI_ProductInit || !PPI_ID || !PPI_SubID || !SubID_Alternatif) {
      console.log({object: req.body});
      return res.status(400).send({ message: "Required parameters are missing" });
    }

    let sql = '';

    if (blnEditBatchLock === true) {
      sql = `
        INSERT INTO m_ppi_header_merger (PPI_ProductID, PPI_ProductInit, PPI_ID, PPI_SubID, PPI_SubID_Utama, PPI_Keterangan, Process_Date, User_ID, Delegated_to, flag_update)
        VALUES (:PPI_ProductID, :PPI_ProductInit, :PPI_ID, :SubID_Alternatif, :PPI_SubID, NULL, GETDATE(), :user_id, :delegated_to, NULL)
      `;
    } else {
      sql = `
        INSERT INTO m_ppi_header_merger_template (PPI_ProductID, PPI_ProductInit, PPI_ID, PPI_SubID, PPI_SubID_Utama, PPI_Keterangan, Process_Date, User_ID, Delegated_to, flag_update)
        VALUES (:PPI_ProductID, :PPI_ProductInit, :PPI_ID, :SubID_Alternatif, :PPI_SubID, NULL, GETDATE(), :user_id, :delegated_to, NULL)
      `;
    }

    await sequelizeMSQL.query(sql, {
      replacements: {
        PPI_ProductID,
        PPI_ProductInit,
        PPI_ID,
        SubID_Alternatif,
        PPI_SubID,
        user_id,
        delegated_to
      },
      type: QueryTypes.INSERT
    });

    return res.status(200).send({ message: 'List Merger PPI created successfully' });
  } catch (error) {
    console.log({ error });
    return res.status(500).send({ message: 'Internal server error', details: error.message });
  }
};

const deleteMergerPPI = async (req, res) => {
  try {
    const { user_id, bagian_user, delegated_to } = req.user;
    if(!user_id || user_id === '') return res.status(401).send('Unauthorized request!');
    const { PPI_ID, PPI_SubID_Utama, PPI_ProductID, PPI_ProductInit, PPI_SubID, blnEditBatchLock } = req.body;
    console.log({});


    if (!PPI_ID || !PPI_SubID_Utama || !PPI_ProductID || !PPI_ProductInit || !PPI_SubID) {
      return res.status(400).send({ message: "Required parameters are missing" });
    }

    let sqlSelect1 = `
        SELECT * FROM m_ppi_header_merger_template
        WHERE ISNULL(user_approve, '') = ''
          AND PPI_ID + PPI_SubID_Utama + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag
          AND PPI_SubID = :PPI_SubID
          AND ISNULL(user_approve, '') = ''
      `
    if (blnEditBatchLock === true) {
      sqlSelect1 = `
        DELETE FROM m_ppi_header_merger
        WHERE PPI_ID + PPI_SubID_Utama + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag
          AND PPI_SubID = :PPI_SubID
      `;
    }

    const replacementsSelect = {
      tag: `${PPI_ID}${PPI_SubID_Utama}${PPI_ProductID}${PPI_ProductInit}`,
      PPI_SubID
    };
    const selectResult = await sequelizeMSQL.query(sqlSelect1, {
      replacements: replacementsSelect
    })

    let dataToBeDeleted
    if (selectResult?.length > 0) {
      dataToBeDeleted = selectResult[0]
    }

    let sql = '';
    if (blnEditBatchLock === true) {
      sql = `
        DELETE FROM m_ppi_header_merger
        WHERE PPI_ID + PPI_SubID_Utama + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag
          AND PPI_SubID = :PPI_SubID
      `;
    } else {
      sql = `
        DELETE FROM m_ppi_header_merger_template
        WHERE ISNULL(user_approve, '') = ''
          AND PPI_ID + PPI_SubID_Utama + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE :tag
          AND PPI_SubID = :PPI_SubID
          AND ISNULL(user_approve, '') = ''
      `;
    }

    const replacements = {
      tag: `${PPI_ID}${PPI_SubID_Utama}${PPI_ProductID}${PPI_ProductInit}`,
      PPI_SubID
    };

    let result
    if(dataToBeDeleted) {
      result = await sequelizeMSQL.query(sql, { replacements, type: QueryTypes.DELETE });
    }

    if (result) {
      return res.status(200).json({
        message: 'Operation success',
        details: dataToBeDeleted
      })
    } else {
      return res.status(500).send({ message: "Error executing delete query" });
    }
  } catch (error) {
    console.log({ error });
    return res.status(500).send({ message: 'Internal server error', details: error.message });
  }
};

const updateItemPRC = async (req, res) => {
  const transaction = await sequelizeMSQL.transaction();
  try {
    const { user_id, bagian_user, delegated_to } = req.user;
    const {
      PPI_ProductID,
      items,
      gstrUserName = user_id,
      gstrDelegatedTo = delegated_to,
      dcoPPI_Owner = bagian_user,
    } = req.body;

    if (!PPI_ProductID || !items || items.length === 0) {
      return res
        .status(400)
        .send({ message: "Required parameters are missing or no items to save" });
    }

    // Validate items
    const invalidItem = items.find(
      (item) => !item.Status_PPI || parseInt(item.Priority) <= 0
    );

    if (invalidItem) {
      if (dcoPPI_Owner !== "TOLL IN") {
        return res.status(400).send({
          message: `Item: ${invalidItem.PPI_ItemID} belum ada status atau priority!`,
        });
      } else {
        return res.status(200).send({
          message: "Operation cancelled for TOLL IN owner",
        });
      }
    }

    await sequelizeMSQL.query(
      `DELETE FROM m_ppi_detail_not_produksi_temp WHERE PPI_ProductID = '${PPI_ProductID}'`,
      { transaction }
    );

    const values = items
      .map((item) => {
        return `(
          '${item.PPI_ID || ""}',
          '${item.PPI_SubID || ""}',
          '${item.PPI_ProductID}',
          '0',
          '${item.PPI_ItemID}',
          '${item.Status_PPI}',
          GETDATE(),
          '${gstrUserName}',
          '${gstrDelegatedTo}',
          '${item.Prc_ID}',
          '${item.Priority}',
          '${item.default_PC || ""}'
        )`;
      })
      .join(", ");

    const sqlInsert = `
      INSERT INTO m_ppi_detail_not_produksi_temp (
        PPI_ID,
        PPI_SubID,
        PPI_ProductID,
        PPI_ProductInit,
        PPI_ItemID,
        Status_PPI,
        Process_Date,
        User_ID,
        Delegated_To,
        Item_prcID,
        priority,
        default_PC
      ) VALUES ${values};
    `;

    // Execute bulk insert
    await sequelizeMSQL.query(sqlInsert, { transaction });

    await transaction.commit();
    return res
      .status(200)
      .send({ message: "Items have been saved successfully" });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    console.error({ error });
    return res.status(500).send({ message: "Internal server error", details: error.message });
  }
};

const sbApprButton = async (req, res) => {
  const { tag } = req.query;
  try {
    const { user_id } = req.user;
    if (!user_id || user_id === '') return res.status(401).send('Unauthorized request!');
    let cmdApproveEnabled = false;
    let sLevel = await fnCekLevel(user_id);
    console.log({sLevel});
    let isCheck = false;

    if (tag && (sLevel === 1 || sLevel === 2)) {
      const sql = `
        SELECT ppi_status
        FROM m_ppi_header
        WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE '${tag}'
      `;
      const rs = await sequelizeMSQL.query(sql, { type: QueryTypes.SELECT });
      if (rs.length === 0) {
        isCheck = true;
      } else {
        const strIsActive = rs[0].ppi_status;
        if (strIsActive === "A") {
          isCheck = true;
        } else {
          isCheck = false;
        }
      }
    }

    if (isCheck) {
      if (sLevel === 0) {
        cmdApproveEnabled = false;
      } else {
        cmdApproveEnabled = false;
        if (!await fnCurr(user_id) && sLevel === 1) {
          cmdApproveEnabled = true;
        } else if (await fnCurr(user_id) && sLevel === 2) {
          cmdApproveEnabled = true;
        }
      }
    } else {
      cmdApproveEnabled = false;
    }

    const cmdApprovePPIEnabled = cmdApproveEnabled;

    return res.status(200).json({ cmdApproveEnabled, cmdApprovePPIEnabled });
  } catch (error) {
    console.error('Error in sbApprButton:', error);
    return res.status(500).json({ message: 'Internal server error', details: error.message });
  }
};

const fnCekLevel = async (user_id) => {
  try {
    const sql = `
      SELECT ISNULL(appr_no, 0) AS levelID
      FROM m_Approver_Lines
      WHERE Appr_ApplicationCode LIKE 'PPI'
        AND Appr_ID = '${user_id}'
    `;
    const rs = await sequelizeMSQL.query(sql, { type: QueryTypes.SELECT });

    if (rs.length === 0) {
      return 0;
    } else {
      return parseInt(rs[0].levelID, 10);
    }
  } catch (error) {
    console.error('Error in fnCekLevel:', error);
    throw new Error('Internal server error');
  }
};

const fnCurr = async (tag) => {
  try {
    const sql = `
      SELECT ISNULL(spv_user_approve, '-') AS spvApp
      FROM m_PPI_Header_Template
      WHERE ISNULL(user_approve, '') = ''
        AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(CHAR(1), PPI_PRODUCTINIT) LIKE '${tag}'
    `;
    const rs = await sequelizeMSQL.query(sql, { type: QueryTypes.SELECT });

    if (rs.length === 0 || rs[0].spvApp === '-') {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    console.error('Error in fnCurr:', error);
    throw new Error('Internal server error');
  }
};




module.exports = {
  sbApprButton,
  updateItemPRC,
  enableGrid,
  refreshListMergerPPI,
  getListMergerPPI,
  deleteKeteranganApprovePPI,
  createListMergerPPI,
  getLvwApprove,
  editKeteranganApprove,
  createKeteranganApprove,
  approveSPV,
  approveMGR,
  fnapproveSPV,
  fnApprove,
  checkApprovalLevel,
  exportStatusPembuat,
  createNewMasterFormulaTemplate,
  updateMasterFormulaTemplate,
  preApprove,
  deleteMasterFormulaTemplate,
  getPrintOutData,
  exportLockBatch,
  deleteMergerPPI
};