const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { getPagination, getPagingData } = require('../../helpers/pagination');
const ExcelJS = require("exceljs");
const { QueryTypes } = require('sequelize');
const moment = require('moment');
const { fnGetStatusNo, fnGetUserApprNo, fnCekJobLevel, Get_DeptID, isApproverStatus, fnGetSeqID, fnCekRowCount, fnGetNewNoDoc, fnCekExist } = require('../../helpers/validation-rd.helper');
const MyError = require('../../helpers/errors');

async function sbCekButton(req, res, next) {
  const { user_id, delegated_to, joblevel_id_user, bagian_user } = req.user;
  if (user_id === '') throw new MyError(401, "Not Authentication");

  const { noDoc, userName = user_id } = req.query;

  if (!noDoc || !userName) {
    return res.status(400).json({ message: "No Doc and User Name are required" });
  }

  try {
    const strStatusNo = await fnGetStatusNo(noDoc);
    const deptID = await Get_DeptID(userName);
    const strUserApprNo = await fnGetUserApprNo(deptID, userName);
    const strJobLevel = await fnCekJobLevel(userName);

    let buttons = {
      CmdUpdate: false,
      cmdDelete: false,
      cmdPrint: false,
      cmdApprove: false,
      cmdReject: false,
      cmdAddNew: false
    };

    Disable_Button(buttons, 'CmdUpdate', 'cmdDelete', 'cmdPrint', 'cmdApprove', 'cmdReject');

    if (!deptID.startsWith("RD")) {
      return res.status(200).json({ buttons });
    }

    if (strJobLevel === "STF") {
      Enable_Button(buttons, 'cmdAddNew', 'CmdUpdate', 'cmdDelete');
      if (strStatusNo > 0) {
        Disable_Button(buttons, 'cmdApprove', 'cmdDelete', 'CmdUpdate');
      }
    } else if (strJobLevel === "SPV" && strStatusNo === 0) {
      Enable_Button(buttons, 'cmdAddNew', 'CmdUpdate', 'cmdDelete');
      if (strStatusNo > 0) {
        Disable_Button(buttons, 'cmdApprove', 'cmdDelete', 'CmdUpdate');
      }
    } else if (strUserApprNo === 1) {
      Enable_Button(buttons, 'cmdAddNew', 'CmdUpdate', 'cmdDelete', 'cmdApprove', 'cmdReject');
      if (strStatusNo > 0) {
        Disable_Button(buttons, 'cmdApprove', 'cmdDelete', 'CmdUpdate');
      }
    } else {
      Disable_Button(buttons, 'cmdAddNew', 'CmdUpdate', 'cmdDelete', 'cmdApprove', 'cmdReject');
    }

    if (strStatusNo >= 1 && strUserApprNo <= 2) {
      Enable_Button(buttons, 'cmdPrint');
    } else {
      Disable_Button(buttons, 'cmdPrint');
    }

    return res.status(200).json({ buttons });
  } catch (error) {
    console.error('Error checking button status:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

function Disable_Button(buttons, ...buttonNames) {
  buttonNames.forEach(buttonName => {
    if (buttons.hasOwnProperty(buttonName)) {
      buttons[buttonName] = false;
    }
  });
}

function Enable_Button(buttons, ...buttonNames) {
  buttonNames.forEach(buttonName => {
    if (buttons.hasOwnProperty(buttonName)) {
      buttons[buttonName] = true;
    }
  });
}

async function cmdFindData1(req, res, next) {
  try {
    // Get search input from user
    const strCari = req.query.strCari || '';
    const strBBBK = "RD";

    const vsql = `
      SELECT DISTINCT A.No_Doc, A.Tgl_doc, X.User_ID, X.process_date
      FROM T_Koreksi_RD AS A
      LEFT JOIN (
        SELECT A.*
        FROM t_koreksi_RD_Status A
        RIGHT JOIN (
          SELECT No_Doc, MAX(Approver_No) AS Approver_No
          FROM t_koreksi_RD_Status
          GROUP BY No_Doc
        ) B ON A.No_Doc = B.No_Doc AND A.Approver_No = B.Approver_No
      ) AS X ON A.no_Doc = X.no_doc
      WHERE A.No_Doc LIKE '%/${strBBBK}/KS'
        AND A.No_Doc LIKE :strCari
        AND ISNULL(X.isReject, 0) = 0
    `;

    const grecLister = await sequelizeMSQL.query(vsql, {
      replacements: { strCari: `%${strCari}%` },
      type: QueryTypes.SELECT
    });

    if (grecLister.length > 0) {
      const data = grecLister;

      return res.status(200).json(data);
    } else {
      return res.status(404).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    console.error('Error finding data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function cmdFindData2(req, res, next) {
  try {
    // Get search input from user
    const strCari = req.query.strCari || '';
    const noDoc = req.query.noDoc || '';

    const vsql = `
      SELECT DISTINCT A.PK_ID_Item, A.ItemID, A.ItemName, A.satuan, A.Analisa, A.batchno AS batchno, A.BatchDate, A.rak, A.saldoawal + A.masuk - A.keluar AS SaldoAkhir
      FROM t_NP_Sample_Stock A
      WHERE A.PK_ID_Item NOT IN (
        SELECT PK_ID_Item
        FROM T_Koreksi_RD
        WHERE No_Doc = :noDoc
      )
      AND (
        A.ItemID LIKE :strCari
        OR A.ItemName LIKE :strCari
        OR A.Analisa LIKE :strCari
        OR A.batchno LIKE :strCari
      )
      ORDER BY A.ItemName
    `;

    const grecLister = await sequelizeMSQL.query(vsql, {
      replacements: { strCari: `%${strCari}%`, noDoc },
      type: QueryTypes.SELECT
    });

    if (grecLister.length > 0) {
      const data = grecLister
      return res.status(200).json(data);
    } else {
      return res.status(404).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    console.error('Error finding data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function cmdDelete(req, res, next) {
  const { noDoc } = req.body;
  const { user_id, delegated_to } = req.user;

  if (!noDoc) {
    return res.status(400).json({ message: "Harap pilih data yang akan dihapus!" });
  }

  try {

        // Check if document has been approved
    const approvalCheckQuery = `
    SELECT TOP 1 No_Doc
    FROM t_koreksi_RD_Status
    WHERE No_Doc = :noDoc
    `;

    const approvalCheck = await sequelizeMSQL.query(approvalCheckQuery, {
      replacements: { noDoc },
      type: QueryTypes.SELECT
    });

    if (approvalCheck.length > 0) {
      return res.status(400).json({ message: "Dokumen ini telah disetujui dan tidak dapat dihapus!" });
    }

    const sqlUpdate = `
      UPDATE T_Koreksi_RD
      SET process_date = GETDATE(),
          USER_ID = :user_id,
          Delegated_To = :delegated_to,
          flag_update = 'Update For Delete'
      WHERE No_Doc = :noDoc
    `;

    const sqlDelete = `
      DELETE FROM T_Koreksi_RD
      WHERE No_Doc = :noDoc
    `;

    await sequelizeMSQL.transaction(async (transaction) => {
      await sequelizeMSQL.query(sqlUpdate, {
        replacements: { user_id, delegated_to, noDoc },
        type: QueryTypes.UPDATE,
        transaction
      });

      await sequelizeMSQL.query(sqlDelete, {
        replacements: { noDoc },
        type: QueryTypes.DELETE,
        transaction
      });
    });

    return res.status(200).json({ message: "Data has been deleted" });
  } catch (error) {
    console.error('Error deleting data:', error);
    return res.status(500).json({ message: 'Error deleting data!' });
  }
}

async function cmdApprove(req, res, next) {
  const { noDoc } = req.body;
  const { user_id, delegated_to } = req.user;

  if (!noDoc) {
    return res.status(400).json({ message: "Nomor Dokumen belum dipilih!" });
  }

  try {
    const deptID = await Get_DeptID(user_id);
    const vApp = await isApproverStatus(noDoc.trim(), deptID, "KoreksiRD", user_id);

    const deleteCheckQuery = `
    SELECT *
    FROM T_Koreksi_RD
    WHERE No_Doc = :noDoc
    `;

    const deleteCheck = await sequelizeMSQL.query(deleteCheckQuery, {
      replacements: { noDoc },
      type: QueryTypes.SELECT
    });

    if (!deleteCheck || deleteCheck.length === 0) {
      return res.status(404).json({ message: "Data Not Found!" });
    }


    if (vApp.UserLevel === 0) {
      return res.status(403).json({ message: "Anda tidak memiliki akses!" });
    }

    if (vApp.currStatusDoc == 0) {
      await sequelizeMSQL.transaction(async (transaction) => {
        // Step 1: Get approver information
        const approverQuery = `
          SELECT Appr_No, Appr_Identity
          FROM m_Approver_Lines
          WHERE Appr_ApplicationCode LIKE 'KoreksiRD'
            AND Appr_DeptID = :deptID
            AND Appr_ID LIKE :user_id
        `;

        const approverResults = await sequelizeMSQL.query(approverQuery, {
          replacements: { deptID, user_id },
          type: QueryTypes.SELECT,
          transaction
        });

        if (approverResults.length === 0) {
          throw new MyError(403, "Anda tidak memiliki akses!");
        }

        const approverIdentity = approverResults[0].Appr_Identity;
        let strSQL = "";

        // Step 2: Insert approval record
        strSQL += `
          INSERT INTO t_koreksi_RD_Status(No_Doc, Approver_No, isReject, Approver_Identity, Process_Date, User_ID, Delegated_To, Flag_Update, alasan_reject)
          VALUES('${noDoc}', '1', 0, '${approverIdentity}', GETDATE(), '${user_id}', '${delegated_to}', NULL, NULL);
        `;

        // Step 3: Get correction items from T_Koreksi_RD (matching the Grid view in VB)
        const itemsQuery = `
          SELECT A.PK_ID_Item, B.SaldoAkhir AS Saldo, A.Stock_Koreksi AS Qty, A.Keterangan AS Note
          FROM T_Koreksi_RD A
          LEFT JOIN (
            SELECT PK_ID_Item, saldoawal + masuk - keluar AS SaldoAkhir
            FROM t_NP_Sample_Stock
          ) B ON A.PK_ID_Item = B.PK_ID_Item
          WHERE A.No_Doc = :noDoc
        `;

        const itemResults = await sequelizeMSQL.query(itemsQuery, {
          replacements: { noDoc },
          type: QueryTypes.SELECT,
          transaction
        });

        // Step 4: Process stock adjustments
        let sNoMasuk = await fnGetLastNoMasuk();
        let sNoKeluar = await fnGetLastNoKeluar() + 1;
        let sFlag = 1;

        for (const item of itemResults) {
          const { PK_ID_Item, Saldo, Qty, Note } = item;

          if (parseFloat(Qty) > 0) {
            // Addition to stock (PENAMBAHAN STOCK in VB)
            sNoMasuk += 1;
            strSQL += `
              UPDATE t_NP_Sample_Stock
              SET masuk = masuk + ABS(${Qty})
              WHERE PK_ID_Item = '${PK_ID_Item}';

              INSERT INTO t_NP_Sample_masuk (PKID, Tanggal, PK_ID_item, Jumlah, Note, apprSPV, apprSPVdate, UserID, Delegated_To, Process_date, flag_update)
              VALUES('${sNoMasuk}', GETDATE(), '${PK_ID_Item}', ABS(${Qty}), 'Koreksi Masuk-${Note}', '${user_id}', GETDATE(), '${user_id}', '${delegated_to}', GETDATE(), NULL);
            `;
          } else {
            // Subtraction from stock (PENGURANGAN STOCK in VB)
            strSQL += `
              UPDATE t_NP_Sample_Stock
              SET keluar = keluar + ABS(${Qty})
              WHERE PK_ID_Item = '${PK_ID_Item}';
            `;

            // Generate header record only once
            if (sFlag === 1) {
              strSQL += `
                INSERT INTO t_NP_Sample_keluar_m(PKID, TypeInput, Tgl, KodeProd, NamaProd, NoPermintaan, TglTrial, TrialKe, PICPelaksana, formula, Note, UserID, Delegated_To, Process_date, batchsize, batchSatuan, batchKet, expiredDate, formula_sediaan, fasilitas_trial, RH, Suhu, apprID, apprDate, flag_update)
                VALUES('${sNoKeluar}', 'Koreksi Keluar', GETDATE(), NULL, NULL, '${noDoc}', NULL, NULL, NULL, NULL, 'Koreksi Keluar', '${user_id}', '${delegated_to}', GETDATE(), NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);
              `;
              sFlag += 1;
            }

            // Add detail record for each item
            strSQL += `
              INSERT INTO t_NP_Sample_keluar_d(PKID, PK_ID_item, Saldo, Qty, Note, UserID, Delegated_To, Process_date, flag_update)
              VALUES('${sNoKeluar}', '${PK_ID_Item}', '${Saldo || 0}', ABS(${Qty}), 'Koreksi Keluar-${Note}', '${user_id}', '${delegated_to}', GETDATE(), NULL);
            `;
          }
        }

        // Execute all SQL statements
        if (strSQL) {
          await sequelizeMSQL.query(strSQL, {
            type: QueryTypes.RAW,
            transaction,
            multipleStatements: true
          });
        }
      });

      return res.status(200).json({ message: "Data has been approved" });
    } else {
      return res.status(403).json({ message: "ANDA TIDAK MEMILIKI AKSES!" });
    }
  } catch (error) {
    console.error('Error approving data:', error);

    // If the error is a MyError, pass along its message
    if (error instanceof MyError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Error approving data!' });
  }
}

async function getDetailGrid(req, res, next) {
  const { noDoc } = req.query;

  if (!noDoc) {
    return res.status(400).json({ message: "No Doc is required" });
  }

  try {
    const query = `
      SELECT A.SeqID, A.PK_ID_item, B.ItemID AS Kode, B.ItemName AS Nama, B.Analisa AS No_Ref, B.batchno AS batchno, '' AS batch_date, B.rak, B.Satuan, A.Stock_eSystem, A.Stock_Fisik, A.Stock_Koreksi, A.Keterangan, A.Jumlah_kedatangan, A.Jumlah_Vat, A.persen_Koreksi
      FROM T_Koreksi_RD AS A
      LEFT JOIN t_NP_Sample_Stock AS B ON A.pk_ID_Item = B.PK_ID_Item
      WHERE A.No_Doc = :noDoc
      ORDER BY A.SeqID
    `;

    const recTemp = await sequelizeMSQL.query(query, {
      replacements: { noDoc },
      type: QueryTypes.SELECT
    });

    if (recTemp.length > 0) {
      return res.status(200).json(recTemp);
    } else {
      return res.status(404).json({ message: "Data Not Found!" });
    }
  } catch (error) {
    console.error('Error fetching grid data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getPrintData(req, res) {
  const { noDoc } = req.query;

  if (!noDoc) {
    return res.status(400).json({ message: "No Doc is required" });
  }

  try {
    // Query to get approval information
    const approvalQuery = `
      SELECT
        E.emp_Name AS SPV,
        CASE WHEN B.Delegated_To = B.User_ID THEN '' ELSE 'an. ' + F.emp_Name END AS SPVOri,
        B.Process_Date AS SPVDate,
        C.emp_Name AS MGR,
        CASE WHEN A.Delegated_To = A.User_ID THEN '' ELSE 'an. ' + D.emp_Name END AS MGROri,
        A.Process_Date AS MGRDate
      FROM t_koreksi_RD_Status A
      LEFT JOIN T_Koreksi_RD B ON A.No_Doc = B.No_Doc AND B.SeqID = (
        SELECT MAX(SeqID) FROM T_Koreksi_RD WHERE No_Doc = :noDoc
      )
      LEFT JOIN m_employee C ON C.emp_NIK = A.Delegated_To
      LEFT JOIN m_employee D ON D.emp_NIK = A.User_ID
      LEFT JOIN m_employee E ON E.emp_NIK = B.Delegated_To
      LEFT JOIN m_employee F ON F.emp_NIK = B.User_ID
      WHERE A.Approver_No = 1 AND A.No_Doc = :noDoc
    `;

    const [approvalInfo] = await sequelizeMSQL.query(approvalQuery, {
      replacements: { noDoc },
      type: QueryTypes.SELECT
    });

    if (!approvalInfo) {
      return res.status(404).json({ message: "Approval information not found" });
    }

    // Format dates
    const formattedApprovalInfo = {
      ...approvalInfo,
      SPVDate: approvalInfo.SPVDate
        ? moment.utc(approvalInfo.SPVDate).format('MMMM D, YYYY, [at] HH:mm:ss.SSS')
        : null,
      MGRDate: approvalInfo.MGRDate
        ? moment.utc(approvalInfo.MGRDate).format('MMMM D, YYYY, [at] HH:mm:ss.SSS')
        : null
    };

    console.log({SPVDate: formattedApprovalInfo.SPVDate, MGRDate: formattedApprovalInfo.MGRDate, BiasaSPV: approvalInfo.SPVDate, BiasaMGR: approvalInfo.MGRDate });

    // Query to get item details
    const itemsQuery = `
      SELECT
        A.SeqID,
        B.ItemID AS Kode,
        B.ItemName AS Nama,
        B.satuan,
        B.batchno AS No_Ref,
        A.Stock_eSystem,
        A.Stock_Fisik,
        A.Stock_Koreksi,
        A.Keterangan,
        A.Jumlah_kedatangan,
        A.Jumlah_Vat,
        A.persen_Koreksi
      FROM T_Koreksi_RD A
      LEFT JOIN t_NP_Sample_Stock B ON A.PK_ID_Item = B.PK_ID_Item
      WHERE A.No_Doc = :noDoc
      ORDER BY A.SeqID
    `;

    const items = await sequelizeMSQL.query(itemsQuery, {
      replacements: { noDoc },
      type: QueryTypes.SELECT
    });

    if (items.length === 0) {
      return res.status(404).json({ message: "No items found for this document" });
    }

    // Get document date
    const docDateQuery = `
      SELECT TOP 1 Tgl_Doc
      FROM T_Koreksi_RD
      WHERE No_Doc = :noDoc
    `;

    const [docInfo] = await sequelizeMSQL.query(docDateQuery, {
      replacements: { noDoc },
      type: QueryTypes.SELECT
    });

    const formattedDate = docInfo?.Tgl_Doc ? moment(docInfo.Tgl_Doc).format('DD MMM YYYY') : null;

    // Prepare the response
    const response = {
      document: {
        noDoc: noDoc,
        date: formattedDate
      },
      approvalInfo: formattedApprovalInfo,
      items: items
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching print data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function fnGetLastNoMasuk() {
  try {
    const query = `
      SELECT ISNULL(MAX(PKID), 0) AS lastNoMasuk
      FROM t_NP_Sample_masuk
    `;

    const results = await sequelizeMSQL.query(query, {
      type: QueryTypes.SELECT
    });

    if (results.length > 0) {
      return parseInt(results[0].lastNoMasuk, 10);
    } else {
      return 0;
    }
  } catch (error) {
    console.error('Error getting last No Masuk:', error);
    return 0;
  }
}

async function fnGetLastNoKeluar() {
  try {
    const query = `
      SELECT ISNULL(MAX(PKID), 0) AS lastNoKeluar
      FROM t_NP_Sample_keluar_m
    `;

    const results = await sequelizeMSQL.query(query, {
      type: QueryTypes.SELECT
    });

    if (results.length > 0) {
      return parseInt(results[0].lastNoKeluar, 10);
    } else {
      return 0;
    }
  } catch (error) {
    console.error('Error getting last No Keluar:', error);
    return 0;
  }
}

async function cmdSave(req, res, next) {
  let {
    noDoc,
    tglDoc,
    seqID,
    pkIDItem,
    stockESystem,
    stockFisik,
    stockKoreksi,
    keterangan,
    jumlahKedatangan = "0",
    jumlahVat = "0",
    persenKoreksi = "0"
  } = req.body;

  const { user_id, delegated_to } = req.user;

  try {
    stockESystem = parseFloat(stockESystem);
    stockFisik = parseFloat(stockFisik);
    stockKoreksi = parseFloat(stockKoreksi);
  } catch (error) {
    return res.status(400).json({ message: "Format input value harus angka!" });
  }

  stockKoreksi = parseFloat(stockFisik - stockESystem);

  if (parseFloat(stockKoreksi) === 0) {
    return res.status(400).json({ message: "Selisih tidak boleh Nol!" });
  }

  if (!keterangan || keterangan.length <= 3) {
    return res.status(400).json({ message: "Keterangan harap di isi!" });
  }

  try {
    let sql = "";

    if (!seqID || seqID === "") { // NEW Save
      if (!noDoc || noDoc === "") {
        noDoc = await fnGetNewNoDoc();
      } else {
        if (await fnCekExist(noDoc, pkIDItem)) {
          return res.status(400).json({ message: "Item sudah ada, tidak bisa double!, cek kembali Item dan No Analisa!" });
        }
      }

      sql = `
        INSERT INTO T_Koreksi_RD (No_Doc, Tgl_doc, SeqID, PK_ID_item, Stock_eSystem, Stock_Fisik, Stock_Koreksi, Keterangan, Jumlah_kedatangan, Jumlah_Vat, persen_Koreksi, Process_Date, User_ID, Delegated_To, flag_update)
        VALUES (:noDoc, :tglDoc, :strSeqID, :pkIDItem, :stockESystem, :stockFisik, CAST(:stockKoreksi AS DECIMAL(10,6)), :keterangan, :jumlahKedatangan, :jumlahVat, :persenKoreksi, GETDATE(), :user_id, :delegated_to, NULL)
      `;

      if (!(await fnCekRowCount(noDoc))) {
        return res.status(400).json({ message: "Maximal 9 row data!" });
      }
    } else { // EDIT
      if (!noDoc) {
        return res.status(400).json({ message: "No Doc is required for update!" });
      }

      sql = `
        UPDATE T_Koreksi_RD
        SET PK_ID_item = :pkIDItem,
            Stock_eSystem = :stockESystem,
            Stock_Fisik = :stockFisik,
            Stock_Koreksi = CAST(:stockKoreksi AS DECIMAL(10,6)),
            Keterangan = :keterangan,
            Jumlah_kedatangan = :jumlahKedatangan,
            Jumlah_Vat = :jumlahVat,
            persen_Koreksi = :persenKoreksi,
            Process_Date = GETDATE(),
            User_ID = :user_id,
            Delegated_To = :delegated_to,
            flag_update = NULL
        WHERE No_Doc = :noDoc AND SeqID = :seqID
      `;
    }

    if (!seqID || seqID === 0 || seqID === '') seqID = await fnGetSeqID(noDoc);
    console.log({seqID});
    await sequelizeMSQL.query(sql, {
      replacements: {
        noDoc,
        tglDoc: tglDoc ? moment(tglDoc).format('YYYY/MM/DD') : null,
        strSeqID: seqID,
        pkIDItem,
        stockESystem,
        stockFisik,
        stockKoreksi,
        keterangan,
        jumlahKedatangan,
        jumlahVat,
        persenKoreksi,
        user_id,
        delegated_to,
        seqID
      },
      type: QueryTypes.INSERT
    });

    return res.status(200).json({ message: "Data has been saved", noDoc });
  } catch (error) {
    console.error('Error saving data:', error);
    return res.status(500).json({ message: 'Error saving data!' });
  }
}

module.exports = {
  sbCekButton,
  cmdFindData1,
  cmdFindData2,
  cmdDelete,
  cmdApprove,
  getDetailGrid,
  cmdSave,
  getPrintData
};