const e = require('cors');
const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { getPagination, getPagingData } = require('../../helpers/pagination');
const { Sequelize } = require('../../models');
const ExcelJS = require("exceljs");
const { QueryTypes, fn } = require('sequelize');
const moment = require('moment');


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

    // Execute SQL
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
        gstrUserName: gstrUserName || user_id,
        gstrDelegatedTo: gstrDelegatedTo || delegated_to,
        JumlahLOT,
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
  const { PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_BatchSize, PPI_BatchSizeUnitID, PPI_Kemasan, PPI_lot, pPI_batchsizekemasan, rendemen_min, PPI_Kemasan01, DataGrid = [] } = req.body;
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
      detailSQL = DataGrid.map((row, index) => {
        const { ItemID, QTY, UnitID } = row;
        console.log({ItemID, test: 'asd'});
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
    const tag =  `${PPI_ID}${PPI_SubID}${PPI_ProductID}${PPI_ProductInit}`;
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
        gstrUserName: user_id,
        gstrDelegatedTo: delegated_to,
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
  const { PPI_ID, PPI_SubID, PPI_ProductInit } = req.body;
  const { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;
  // console.log({user: req.user});
  if (!PPI_ID || !PPI_SubID || !PPI_ProductInit) {
    return res.status(400).send({ message: "Formula produk belum dipilih, cek parameter" });
  }

  const tag = `${PPI_ID}${PPI_SubID}${PPI_ProductInit}`;

  try {
    let strPeriode = moment().format('YYYYMMDD HH:mm:ss');
    let strTglBerlaku = moment().format('YYYY-MM-DD HH:mm:ss');
    let ppi_ED = 0;
    let ppi_revisi = "00";

    // Check ppi_ED
    const checkEDSQL = `
      SELECT ISNULL(ppi_ED, 0) AS ppi_ED
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

    if (checkRevisiSQL) {
      const revisiResult = await sequelizeMSQL.query(checkRevisiSQL, {
        replacements: { tag },
        type: QueryTypes.SELECT
      });

      console.log({revisiResult});
      if (revisiResult.length > 0) {
        if (revisiResult[0].ppi_revisi !== "") {
          ppi_revisi = joblevel_id_user === 1 ?
            (parseInt(revisiResult[0].ppi_revisi, 10) + 1).toString().padStart(2, '0') :
            revisiResult[0].ppi_revisi.padStart(2, '0');
        }
      }
    }

    // Enable buttons and fields
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
      lvwMergerPPIVisible: false
    };

    return res.status(200).json(response);
    return next();
  } catch (error) {
    console.error({ error });
    return res.status(500).send({ message: 'Error while pre-approving master formula template', details: error.message });
  }
};

const deleteMasterFormulaTemplate = async (req, res) => {
  const { PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit } = req.body;
  const { user_id, bagian_user } = req.user;
  console.log({asasasasas: req.user});
  if (!PPI_ID || !PPI_SubID || !PPI_ProductID || !PPI_ProductInit) {
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
  // const transaction = await sequelizeMSQL.transaction();
  try {
    const strPeriode = moment().format('YYYYMMDD HH:mm:ss');
    const strTglBerlaku = moment().format('YYYY-MM-DD HH:mm:ss');
    let ppi_ED = 0;
    let ppi_revisi = '00';

    // Check ppi_ED
    const checkEDSQL = `
    SELECT ISNULL(ppi_ED, 0) AS ppi_ED
    FROM m_PPI_Header_Template
    WHERE ISNULL(user_approve, '') = ''
      AND PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE :tag
  `;
    const edResult = await sequelizeMSQL.query(checkEDSQL, {
      replacements: { tag },
      type: QueryTypes.SELECT,
    });

    if (edResult.length > 0) {
      ppi_ED = edResult[0].ppi_ED;
    }
    console.log({ userName, deptID, delegatedTo, ppi_ED, ppi_revisi });
    const strAppr_Identity = userName;

    let strSQL = `
  DELETE FROM m_ppi_header_lock
  WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE :tag;

  DELETE FROM m_ppi_header_lock_template
  WHERE PPI_ID + PPI_SUBID + PPI_PRODUCTID + CONVERT(VARCHAR(1), PPI_PRODUCTINIT) LIKE :tag;
  `;

    if (listApprovePPI.length > 0) {
      listApprovePPI.forEach((item) => {
        strSQL += `
        INSERT INTO m_ppi_header_lock (ppi_productid, ppi_productinit, ppi_id, ppi_subid, ppi_batchno, ppi_keterangan, process_date, user_id, delegated_to)
        VALUES ('${productID}', '${productInit}', '${tag}', '${subID}', '${item.batchno}', '${item.keterangan}', GETDATE(), '${userName}', '${delegatedTo}');

        INSERT INTO m_ppi_header_lock_template (ppi_productid, ppi_productinit, ppi_id, ppi_subid, ppi_batchno, ppi_keterangan, process_date, user_id, delegated_to)
        VALUES ('${productID}', '${productInit}', '${tag}', '${subID}', '${item.batchno}', '${item.keterangan}', GETDATE(), '${userName}', '${delegatedTo}');
      `;
      });
    }

    if (listMergerPPI.length > 0) {
      const strDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
      strSQL += `
      DELETE FROM m_ppi_header_merger
      WHERE PPI_ProductID = '${productID}'
        AND ppi_productinit = '${productInit}'
        AND ppi_id = '${tag}'
        AND ppi_subid_utama = '${subID}';

      INSERT INTO m_ppi_header_merger (PPI_ProductID, PPI_ProductInit, PPI_ID, PPI_SubID, PPI_SubID_Utama, PPI_Keterangan, Process_Date, User_ID, Delegated_to, flag_update, user_approve, user_Delegated, user_Approve_date)
      SELECT PPI_ProductID, PPI_ProductInit, PPI_ID, PPI_SubID, PPI_SubID_Utama, PPI_Keterangan, '${strDateNow}', User_ID, Delegated_to, flag_update, '${userName}', '${delegatedTo}', '${strDateNow}'
      FROM m_ppi_header_merger_Template
      WHERE ISNULL(user_approve, '') = ''
        AND PPI_ProductID = '${productID}'
        AND PPI_ProductInit = '${productInit}'
        AND PPI_ID = '${tag}'
        AND PPI_SubID_Utama = '${subID}';

      INSERT INTO m_ppi_header_merger_template (PPI_ProductID, PPI_ProductInit, PPI_ID, PPI_SubID, PPI_SubID_Utama, PPI_Keterangan, Process_Date, User_ID, Delegated_to, flag_update, user_approve, user_Delegated, user_Approve_date)
      SELECT PPI_ProductID, PPI_ProductInit, PPI_ID, PPI_SubID, PPI_SubID_Utama, PPI_Keterangan, Process_Date, User_ID, Delegated_to, flag_update, '${userName}', '${delegatedTo}', '${strDateNow}'
      FROM m_ppi_header_merger_Template
      WHERE ISNULL(user_approve, '') = ''
        AND PPI_ProductID = '${productID}'
        AND PPI_ProductInit = '${productInit}'
        AND PPI_ID = '${tag}'
        AND PPI_SubID_Utama = '${subID}';

      UPDATE m_ppi_header_merger_Template
      SET USER_ID = '${userName}', Delegated_to = '${delegatedTo}', Process_Date = '${strDateNow}'
      WHERE ISNULL(user_approve, '') = ''
        AND PPI_ProductID = '${productID}'
        AND PPI_ProductInit = '${productInit}'
        AND PPI_ID = '${tag}'
        AND PPI_SubID_Utama = '${subID}';
    `;

      listMergerPPI.forEach((item) => {
        strSQL += `
        UPDATE m_PPI_Header_template
        SET ppi_revisi = '${revisiPPI}'
        WHERE PPI_ID = '${tag}'
          AND PPI_SubID = '${item.subID}'
          AND PPI_ProductID = '${productID}'
          AND PPI_ProductInit = ${productInit}
          AND tgl_berlaku IS NULL;

        UPDATE m_PPI_Header
        SET ppi_revisi = '${revisiPPI}'
        WHERE PPI_ID = '${tag}'
          AND PPI_SubID = '${item.subID}'
          AND PPI_ProductID = '${productID}'
          AND PPI_ProductInit = ${productInit};
      `;
      });
    }

    // Additional SQL statements
    const SQLdeleteOri = `
    UPDATE m_PPI_Detail
    SET USER_ID = '${userName}', Delegated_To = '${delegatedTo}', flag_update = 'Update For Delete'
    WHERE PPI_ID = '${tag}'
      AND PPI_SubID = '${subID}'
      AND PPI_ProductID = '${productID}'
      AND PPI_ProductInit = '0';

    DELETE FROM m_PPI_Detail
    WHERE PPI_ID = '${tag}'
      AND PPI_SubID = '${subID}'
      AND PPI_ProductID = '${productID}'
      AND PPI_ProductInit = 0;

    UPDATE m_PPI_Header
    SET USER_ID = '${userName}', Delegated_To = '${delegatedTo}', flag_update = 'Update For Delete'
    WHERE PPI_ID = '${tag}'
      AND PPI_SubID = '${subID}'
      AND PPI_ProductID = '${productID}'
      AND PPI_ProductInit = 0;

    DELETE FROM m_PPI_Header
    WHERE PPI_ID = '${tag}'
      AND PPI_SubID = '${subID}'
      AND PPI_ProductID = '${productID}'
      AND PPI_ProductInit = 0;

    UPDATE m_PPI_status
    SET USER_ID = '${userName}', Delegated_To = '${delegatedTo}', flag_update = 'Update For Delete'
    WHERE ppi_no = '${tag}';

    DELETE FROM m_PPI_status
    WHERE ppi_no = '${tag}';

    UPDATE m_PPI_Header_template
    SET item_Periode = '${strPeriode}', tgl_berlaku = '${strTglBerlaku}', user_approve = '${userName}', user_Delegated = '${delegatedTo}'
    WHERE PPI_ID = '${tag}'
      AND PPI_SubID = '${subID}'
      AND PPI_ProductID = '${productID}'
      AND PPI_ProductInit = 0
      AND tgl_berlaku IS NULL;

    UPDATE m_PPI_detail_template
    SET item_Periode = '${strPeriode}', tgl_berlaku = '${strTglBerlaku}', user_approve = '${userName}', user_Delegated = '${delegatedTo}'
    WHERE PPI_ID = '${tag}'
      AND PPI_SubID = '${subID}'
      AND PPI_ProductID = '${productID}'
      AND PPI_ProductInit = 0
      AND tgl_berlaku IS NULL;
  `;

    strSQL += SQLdeleteOri;

    const SQLInsertOri = `
      INSERT INTO m_PPI_Header (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_BatchSize, PPI_BatchSizeUnitID, PPI_Kemasan, PPI_Status, Process_Date, User_ID, Delegated_To, isActive, PPI_StatusUserID, PPI_StatusDate, PPI_StatusDelegated_To, status_default, PPI_Lot, flag_update, update_from, PPI_revisi, PPI_ED, pPI_batchsizekemasan, rendemen_min, default_kebutuhanbahan, PPI_Kemasan01)
      SELECT PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, CAST(PPI_BatchSize AS FLOAT), PPI_BatchSizeUnitID, PPI_Kemasan, CAST(PPI_Status AS FLOAT), '${strTglBerlaku}', '${userName}', '${delegatedTo}', isActive, PPI_StatusUserID, PPI_StatusDate, PPI_StatusDelegated_To, status_default, PPI_Lot, flag_update, update_from, '${revisiPPI}', ${ppi_ED}, ISNULL(pPI_batchsizekemasan, 0), ISNULL(rendemen_min, 0), default_kebutuhanbahan, PPI_Kemasan01
      FROM m_PPI_Header_Template
      WHERE ISNULL(item_Periode, '') = '${strPeriode}'
        AND PPI_ID = '${tag}'
        AND PPI_SubID = '${subID}'
        AND PPI_ProductID = '${productID}'
        AND PPI_ProductInit = 0;

      INSERT INTO m_PPI_Detail (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_SeqID, PPI_ItemID, PPI_QTY, PPI_UnitID, Process_Date, User_ID, Delegated_To)
      SELECT PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_SeqID, PPI_ItemID, PPI_QTY, PPI_UnitID, '${strTglBerlaku}', '${userName}', '${delegatedTo}'
      FROM m_PPI_Detail_Template
      WHERE ISNULL(item_Periode, '') = '${strPeriode}'
        AND PPI_ID = '${tag}'
        AND PPI_SubID = '${subID}'
        AND PPI_ProductID = '${productID}'
        AND PPI_ProductInit = 0;
    `;
    console.log({ SQLInsertOri });
    const SQLInsertTemp = `
      INSERT INTO m_PPI_Header_Template (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_BatchSize, PPI_BatchSizeUnitID, PPI_Kemasan, PPI_Status, Process_Date, User_ID, Delegated_To, isActive, PPI_StatusUserID, PPI_StatusDate, PPI_StatusDelegated_To, status_default, PPI_Lot, flag_update, update_from, item_Periode, tgl_berlaku, user_approve, user_Delegated, ppi_revisi, PPI_ED, pPI_batchsizekemasan, rendemen_min, default_kebutuhanbahan, PPI_Kemasan01)
      SELECT PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_BatchSize, PPI_BatchSizeUnitID, PPI_Kemasan, PPI_Status, Process_Date, User_ID, Delegated_To, isActive, PPI_StatusUserID, PPI_StatusDate, PPI_StatusDelegated_To, status_default, PPI_Lot, flag_update, update_from, NULL, NULL, NULL, NULL, '${revisiPPI}', '${ppi_ED}', ISNULL(pPI_batchsizekemasan, 0), ISNULL(rendemen_min, 0), default_kebutuhanbahan, PPI_Kemasan01
      FROM m_PPI_Header_Template
      WHERE ISNULL(item_Periode, '') = '${strPeriode}'
        AND PPI_ID = '${tag}'
        AND PPI_SubID = '${subID}'
        AND PPI_ProductID = '${productID}'
        AND PPI_ProductInit = 0;

      INSERT INTO m_PPI_Detail_Template (PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_SeqID, PPI_ItemID, PPI_QTY, PPI_UnitID, Process_Date, User_ID, Delegated_To, item_Periode, tgl_berlaku, user_approve, user_Delegated)
      SELECT PPI_ID, PPI_SubID, PPI_ProductID, PPI_ProductInit, PPI_SeqID, PPI_ItemID, PPI_QTY, PPI_UnitID, Process_Date, User_ID, Delegated_To, NULL, NULL, NULL, NULL
      FROM m_PPI_Detail_Template
      WHERE ISNULL(item_Periode, '') = '${strPeriode}'
        AND PPI_ID = '${tag}'
        AND PPI_SubID = '${subID}'
        AND PPI_ProductID = '${productID}'
        AND PPI_ProductInit = 0;
    `;
    strSQL += `${SQLInsertOri} ${SQLInsertTemp}`;

    // Check if all batches should be updated
    if (checkAllBatch) {
      strSQL += `
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
    } else {
      strSQL += `
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
      strSQL += `
        DELETE FROM m_ppi_detail_not_produksi
        WHERE PPI_ProductID = '${productID}';`;

      strSQL += `INSERT INTO m_ppi_detail_not_produksi (PPI_ID, PPI_ProductID, PPI_ProductInit, PPI_ItemID, Status_PPI, Process_Date, User_ID, Delegated_To, flag_update, Item_prcID, Priority)
        SELECT PPI_ID, PPI_ProductID, PPI_ProductInit, PPI_ItemID, Status_PPI, GETDATE(), '${userName}', '${delegatedTo}', NULL, Item_prcID, Priority
        FROM m_ppi_detail_not_produksi_temp;`;
    }

    await sequelizeMSQL.query(strSQL, {
      replacements: {
        userName,
        delegatedTo,
        tag,
      },
      // transaction,
    });

    // await transaction.commit();
    return {
      error: false,
      message: 'Master formula template approved successfully',
    };
  } catch (error) {
    console.error({ error });
    // await transaction.rollback();
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
    let { user_id, bagian_user, nama_user, joblevel_id_user } = req.user;

    const { listApprovePPI = [], listMergerPPI = [], checkAllBatch = 0, deptID = bagian_user, userName = user_id, delegatedTo, productID, productInit, tag, subID, revisiPPI, ED, dcoPPI_Owner } = req.body;

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



module.exports = { approveSPV, approveMGR, fnapproveSPV, fnApprove, checkApprovalLevel, exportStatusPembuat, createNewMasterFormulaTemplate, updateMasterFormulaTemplate, preApprove, deleteMasterFormulaTemplate };