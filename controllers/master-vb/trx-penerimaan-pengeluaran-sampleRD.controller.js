const { sequelizeMSQL } = require('../../config/config.sequelize.dbmssql');
const { getPagination, getPagingData } = require('../../helpers/pagination');
const ExcelJS = require("exceljs");
const { QueryTypes } = require('sequelize');
const moment = require('moment');
const User_Access = require('../../helpers/master-vb.helper');


async function getStockData(rak, barang = '') {

  if (!rak) throw new Error('Rak is required');

  let query = `
      SELECT DISTINCT
          A.PK_ID_Item,
          A.Itemid AS Kode_Barang,
          A.itemname,
          A.Rak,
          A.principle,
          A.supplier,
          A.Batchno,
          A.analisa,
          A.expDate,
          A.saldoawal + A.masuk - A.keluar AS SaldoAkhir
      FROM t_NP_Sample_Stock A
      WHERE A.rak = :rak
      AND (A.saldoawal + A.masuk - A.keluar) > 0
  `;

  if (barang !== '') {
      query += ` AND A.itemname LIKE :barang `;
  }

  query += ` ORDER BY A.itemname `;

  const replacements = { rak };
  if (barang !== '') {
      replacements.barang = `%${barang}%`;
  }

  try {
      const results = await sequelizeMSQL.query(query, {
          replacements,
          type: QueryTypes.SELECT
      });

      return results;
  } catch (error) {
      console.error('Error fetching stock data:', error);
      throw error;
  }
}

async function exportStockDataToExcel(req, res, next) {
  const { rak, barang = '' } = req.query;

  try {
    const stockData = await getStockData(rak, barang);

    if (!stockData || stockData.length === 0) {
      return res.status(404).json({ message: 'No data found' });
    }

    const currentDate = moment().format('DD-MMM-YYYY');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${rak}`);

    worksheet.addRow(["STOCK AKTUAL SAMPLE RD SYSTEM"]);
    worksheet.addRow([`Periode Cetak: ${currentDate}`]);
    worksheet.addRow([]);
    worksheet.addRow(["Rak: ", rak]);
    worksheet.addRow([]);

    // Add column headers to a specific row (e.g., row 6)
    worksheet.getRow(9).values = [
      'NO', 'PK_ID_Item', 'Kode Barang', 'Nama Barang', 'Kode Rak', 'Principle', 'Supplier', 'Batch No', 'No Analisa', 'Expired Date', 'Saldo Akhir'
    ];

    // Define worksheet columns (optional, for setting column widths)
    worksheet.columns = [
      { key: 'no', width: 5 },
      { key: 'PK_ID_Item', width: 15 },
      { key: 'Kode_Barang', width: 15 },
      { key: 'itemname', width: 50 },
      { key: 'Rak', width: 10 },
      { key: 'principle', width: 30 },
      { key: 'supplier', width: 30 },
      { key: 'Batchno', width: 15 },
      { key: 'analisa', width: 15 },
      { key: 'expDate', width: 15 },
      { key: 'SaldoAkhir', width: 15 }
    ];

    // Add stock data rows
    stockData.forEach((data, index) => {
      worksheet.addRow({
        no: index + 1,
        ...data
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=stock_data.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting stock data to Excel:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function fnGetRakNotEmpty() {
  let query = `
      SELECT DISTINCT rak FROM t_NP_Sample_Stock;
  `;

  try {
      const results = await sequelizeMSQL.query(query, {
          type: QueryTypes.SELECT
      });

      if (results.length > 0) {
          const promises = results.map(async (e) => {
              let queryEach = `
              SELECT Count(*) as total FROM t_NP_Sample_Stock WHERE rak = '${e.rak}'
              `;

              const resultsEach = await sequelizeMSQL.query(queryEach, {
                  type: QueryTypes.SELECT
              });

              return {
                  rak: e.rak,
                  total: resultsEach[0].total
              };
          });

          const detailedResults = await Promise.all(promises);
          return detailedResults;
      }
      return results;
  } catch (error) {
      console.error('Error fetching rak data:', error);
      throw error;
  }
}

async function GetTerimaID_Keluar() {
  try {
    const strSQL = "SELECT ISNULL(MAX(PKID), 0) + 1 AS TerimaID FROM t_NP_Sample_keluar_m";
    const rsNo = await sequelizeMSQL.query(strSQL, { type: QueryTypes.SELECT });
    if (rsNo.length > 0) {
      return rsNo[0].TerimaID;
    } else {
      return "";
    }
  } catch (error) {
    console.error('Error fetching TerimaID:', error);
    throw error;
  }
}

async function GetTerimaID() {
  const query = `
      SELECT ISNULL(MAX(PKID), 0) + 1 AS TerimaID
      FROM t_NP_Sample_masuk
  `;

  try {
      const results = await sequelizeMSQL.query(query, {
          type: QueryTypes.SELECT
      });

      if (results.length > 0) {
          return results[0].TerimaID;
      } else {
          return 1;
      }
  } catch (error) {
      console.error('Error fetching PK_ID_Item:', error);
      throw error;
  }
}

async function GetPKID() {
  const query = `
      SELECT ISNULL(MAX(PK_ID_item), 0) + 1 AS TerimaID
      FROM t_NP_Sample_Stock
  `;

  try {
      const results = await sequelizeMSQL.query(query, {
          type: QueryTypes.SELECT
      });

      if (results.length > 0) {
          return results[0].TerimaID;
      } else {
          return 1;
      }
  } catch (error) {
      console.error('Error fetching PK_ID_Item:', error);
      throw error;
  }
}

async function fnIsItemID(ItemID, ItemName, analisa, batchno, Principle, Supplier, rak) {
  const query = `
      SELECT COUNT(*) as jum
      FROM t_NP_Sample_Stock
      WHERE ItemID = :ItemID
      AND ItemName = :ItemName
      AND Analisa = :analisa
      AND batchno = :batchno
      AND Principle = :Principle
      AND Supplier = :Supplier
      AND Rak = :rak
  `;

  const replacements = { ItemID, ItemName, analisa, batchno, Principle, Supplier, rak };

  try {
      const results = await sequelizeMSQL.query(query, {
          replacements,
          type: QueryTypes.SELECT
      });

      return results[0].jum > 0; // true if data exists, false otherwise
  } catch (error) {
      console.error('Error checking item ID:', error);
      throw error;
  }
}

async function fnGetPKID_item(ItemID, ItemName, analisa, batchno, Principle, Supplier, rak) {
  const query = `
      SELECT TOP 1 PK_ID_Item
      FROM t_NP_Sample_Stock
      WHERE ItemID = :ItemID
      AND ItemName = :ItemName
      AND Analisa = :analisa
      AND batchno = :batchno
      AND Principle = :Principle
      AND Supplier = :Supplier
      AND rak = :rak
      ORDER BY PK_ID_Item
  `;

  const replacements = { ItemID, ItemName, analisa, batchno, Principle, Supplier, rak };

  try {
      const results = await sequelizeMSQL.query(query, {
          replacements,
          type: QueryTypes.SELECT
      });

      if (results.length === 0) {
          return "";
      } else {
          return results[0].PK_ID_Item.toString();
      }
  } catch (error) {
      console.error('Error fetching PK_ID_Item:', error);
      throw error;
  }
}

async function getStockDataByRak(req, res, next) {
  try {
      const { rak, barang } = req.query;
      if (!rak) return res.status(400).json({ message: 'Rak is required' });

      const results = await getStockData(rak, barang) || [];
      const resp = {
        message: 'OK',
        data: results
      }
      res.status(200).json(resp);
  } catch (error) {
      console.error('Error fetching stock data:', error);
      res.status(500).json({ message: 'Error fetching stock data' });
  }
}

async function getRakNotEmpty(req, res, next) {
  try {
      const results = await fnGetRakNotEmpty() || [];
      const resp = {
        message: 'OK',
        data: results
      }
      return res.status(200).json(resp);
  } catch (error) {
      console.error('Error fetching rak data:', error);
      return res.status(500).json({ message: 'Error fetching rak data' });
  }
}

async function browseItem(req, res, next) {
  try {
    const { user_id = '', delegated_to = '', nama_user = '', bagian_user } = req.user;
    if (!user_id || user_id === '') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { gudang, year = '', noMR = '', rak, type, kelompokBahan = 'BB' } = req.query;
    const scopeGudang = ['PC', 'RD'];

    if (!gudang || gudang === '' || !scopeGudang.includes(gudang) || !type || type === '' || !rak || rak === '') {
      return res.status(400).json({ message: 'Invalid request', request: req.query });
    }

    if (gudang === 'PC') {

      let strSQL;

      if (year === "" || !year) {
          // NORMAL Cari yang normal satu tahun terakhir
          strSQL = `SELECT MR_No, mr_seqid, MR_ItemID AS Kode_Bahan, Item_Name AS nama_bahan, ISNULL(Principle, '') AS Principle, ISNULL(Supplier, '') AS Supplier, DNC_BATCHNO,
                    MR_DNcNo AS NoAnalisa, ISNULL(ExpDate, '1900-01-01') AS ExpDate, MR_DNcQTY AS Qty, MR_itemUnit AS Unit, '' AS PKIDItem
                    FROM v_MI_BahanAwal_RD
                    WHERE mr_RDPKID IS NULL AND MR_No LIKE '%${noMR}%'`;
      } else {
          // BY YEAR cari berdasarkan tahun
          strSQL = `SELECT MR_No, mr_seqid, MR_ItemID AS Kode_Bahan, Item_Name AS nama_bahan, ISNULL(Principle, '') AS Principle, ISNULL(Supplier, '') AS Supplier, DNC_BATCHNO,
                    MR_DNcNo AS NoAnalisa, ISNULL(ExpDate, '1900-01-01') AS ExpDate, MR_DNcQTY AS Qty, MR_itemUnit AS Unit, '' AS PKIDItem
                    FROM v_MI_BahanAwal_RD_By_MR_year
                    WHERE mr_RDPKID IS NULL`;

          if (year && year !== "") {
              strSQL += ` AND MR_Year = ${year}`;
          }

          if (noMR && noMR !== "") {
              strSQL += ` AND MR_No LIKE '%${noMR}%'`;
          }

      }

      if (kelompokBahan === "BAHAN KEMAS") {
          strSQL += " AND Item_Type = 'BK'";
      } else {
          strSQL += " AND Item_Type = 'BB'";
      }

      strSQL += " ORDER BY MR_ItemID";

      const results = await sequelizeMSQL.query(strSQL, {
          type: QueryTypes.SELECT
      });

      if (results.length > 0) {
          return res.status(200).json({ message: 'OK', data: results });
      } else {
          return res.status(200).json({ message: 'Data not found' });
      }

    }

    if (gudang === 'RD') {
      let strSQL = `SELECT B.ItemID, B.ItemName, B.Principle, B.Supplier, B.batchno AS BatchLot, B.Analisa, ISNULL(B.ExpDate, '1900-01-01') AS ExpDate,
                  B.MinStock, B.satuan, B.rak, B.masuk + B.saldoawal - B.keluar AS saldo, B.PK_ID_Item, B.KelBahan
                  FROM t_NP_Sample_Stock B
                  WHERE B.typeinput LIKE '${type == 'Edit' ? '%' : type}' AND B.rak LIKE '${rak}'`;

      const results = await sequelizeMSQL.query(strSQL, {
          type: QueryTypes.SELECT
      });

      if (results.length > 0) {
        return res.status(200).json({ message: 'OK', data: results });
      } else {
        return res.status(200).json({ message: 'Data not found' });
      }
    }
    console.log('NOT FOUND');
    return res.status(200).json({ message: 'Data not found' });
  } catch (error) {
    console.log({ error });
    return res.status(500).json({ message: 'Internal server error', detail: error?.message });
  }
}

async function cmdSimpanMasuk(req, res, next) {
  const { user_id, delegated_to, nama_user, bagian_user } = req.user;
  const transaction = await sequelizeMSQL.transaction();
  try {
    if (!user_id || user_id === '') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const {
      txtID_trans,
      txtPKID_item,
      txtJum,
      txtNama_bhn,
      txtMin,
      txtExpDate,
      txtPrincl,
      txtSupp,
      lblLokasi,
      txtnotes,
      txtAlert,
      txtRemainDay,
      txtUkuran,
      txtKomposisi,
      sMRno,
      sMRSeq,
      txtNoBatch,
      txtKelompokBahan,
      txtKode_bhn,
      txtNoAnalisa,
      txtTypeInput,
      txtSatuan
    } = req.body;
    let stEdit = false;

    if (txtNoBatch.toUpperCase() !== txtNoBatch.Tag?.toUpperCase() || txtNoAnalisa.toUpperCase() !== txtNoAnalisa.Tag.toUpperCase()) {
      stEdit = true;
    }

    if (!txtKelompokBahan && !txtKode_bhn && !txtNoBatch && !txtNoAnalisa) {
      return res.status(400).json({ message: 'Harap isi bahan! (kode bahan, no batch dan no analisa harus di isi)' });
    }

    if (!txtTypeInput || !txtKelompokBahan) {
      return res.status(400).json({ message: 'Type Input, bahan dan kelompok harus di isi' });
    }

    if (!txtSatuan) {
      return res.status(400).json({ message: 'Satuan harap di isi' });
    }

    if (!txtID_trans) {
      if (!txtPKID_item) {
          if (await fnIsItemID(txtKode_bhn, txtNama_bhn, txtNoAnalisa, txtNoBatch, txtPrincl, txtSupp, lblLokasi.Caption)) {
              txtPKID_item = await fnGetPKID_item(txtKode_bhn, txtNama_bhn, txtNoAnalisa, txtNoBatch, txtPrincl, txtSupp, lblLokasi.Caption);
          }
      }

      if (parseFloat(txtJum) <= 0) return res.status(400).json({ message: 'Jumlah tidak boleh 0' });
      if (!txtNama_bhn) return res.status(400).json({ message: 'Harap isi nama barang' });
      if (parseFloat(txtMin) <= 0 && txtTypeInput !== "Koreksi Masuk") return res.status(400).json({ message: 'Min Stock tidak boleh 0' });

      if (txtTypeInput !== "Koreksi Masuk") {
          if (!txtNoBatch || !txtNoAnalisa) {
              return res.status(400).json({ message: 'Nomor batch dan No analisa harap diisi!' });
          }
      }

      if (new Date(txtExpDate) <= new Date("1900-01-01")) return res.status(400).json({ message: 'Harap cek Expirate date?' });

      const sTerimaID = await GetTerimaID();
      const sPK_IDITEM = txtPKID_item || await GetPKID();
      // return res.send({ sTerimaID, sPK_IDITEM });
      const SQL_tMasuk = `INSERT INTO t_NP_Sample_masuk (PKID, Tanggal, PK_ID_item, Jumlah, Note, apprSPV, apprSPVdate, UserID, Delegated_To, Process_date, flag_update)
                          VALUES ('${sTerimaID}', GETDATE(), '${sPK_IDITEM}', '${txtJum}', '${txtnotes}', NULL, NULL, '${user_id}', '${delegated_to}', GETDATE(), NULL)`;
      await sequelizeMSQL.query(SQL_tMasuk, { transaction });
      console.log('EXECUTED SQL_tMasuk INSERT');

      let SQL_tStock;
      if (!txtPKID_item) {
          SQL_tStock = `INSERT INTO t_NP_Sample_Stock (Periode, PK_ID_Item, ItemID, ItemName, Analisa, batchno, rak, saldoawal, masuk, keluar, UserID, Delegated_To, Process_date, BatchDate, Principle, Supplier, TypeInput, KelBahan, ExpDate, MinStock, satuan, Alert, RemainDay, Ukuran, Komposisi)
                        VALUES ('000000', '${sPK_IDITEM}', '${txtKode_bhn}', '${txtNama_bhn}', '${txtNoAnalisa}', '${txtNoBatch}', '${lblLokasi.Caption}', 0, '${parseFloat(txtJum)}', 0, '${user_id}', '${delegated_to}', GETDATE(), '${txtNoBatch.Tag}', '${txtPrincl}', '${txtSupp}', '${txtTypeInput}', '${txtKelompokBahan}', '${new Date(txtExpDate).toISOString().split('T')[0]}', '${parseFloat(txtMin)}', '${txtSatuan}', '${txtAlert}', '${txtRemainDay}', '${txtUkuran}', '${txtKomposisi}')`;
          await sequelizeMSQL.query(SQL_tStock, { transaction });
          console.log('EXECUTED SQL_tStock INSERT');
      } else {
          SQL_tStock = `UPDATE t_NP_Sample_Stock SET masuk = masuk + ${parseFloat(txtJum)}, UserID = '${user_id}', Delegated_To = '${delegated_to}', Process_date = GETDATE(), ExpDate = '${new Date(txtExpDate).toISOString().split('T')[0]}', MinStock = '${parseFloat(txtMin)}', satuan = '${txtSatuan}', Alert = '${txtAlert}', RemainDay = '${txtRemainDay}', Ukuran = '${txtUkuran}', Komposisi = '${txtKomposisi}' WHERE PK_ID_Item = '${sPK_IDITEM}'`;
          await sequelizeMSQL.query(SQL_tStock, { transaction });
          console.log('EXECUTED SQL_tStock UPDATE');
      }

      let sSave3 = '';
      if (txtTypeInput === "Internal" && sMRno && sMRSeq) {
          sSave3 = `UPDATE t_Bon_Keluar_Bahan_Awal_DNC SET mr_rdpkid = '${sTerimaID}' WHERE mr_no = '${sMRno}' AND mr_seqid = '${sMRSeq}' AND MR_DNcNo = '${txtNoAnalisa}'`;
          await sequelizeMSQL.query(sSave3, { transaction });
      }

      await transaction.rollback();
      return res.status(200).json({ message: 'OK', data: { sTerimaID, sPK_IDITEM } });
    }

    if (txtID_trans || txtID_trans !== '') {

      if (txtTypeInput === "Internal") {
        // if (!await User_Access("SAMPLE RD MASUK SIMPAN FORMULATOR")) {
        //   return res.status(403).json({ message: 'Maaf anda tidak dapat Access!', detail: 'No Access: SAMPLE RD MASUK SIMPAN FORMULATOR' });
        // }
      }

      if (txtTypeInput.startsWith("External") || txtTypeInput === "External Kompetitor") {
        // if (!await User_Access("SAMPLE RD MASUK SIMPAN ADMIN")) {
        //   return res.status(403).json({ message: 'Maaf anda tidak dapat Access!', detail: 'No Access: SAMPLE RD MASUK SIMPAN ADMIN' });
        // }
      }

      if (txtTypeInput === "Koreksi Masuk") {
        // if (!await User_Access("SAMPLE RD MASUK SIMPAN SPV")) {
        //   return res.status(403).json({ message: 'Maaf anda tidak dapat Access!', detail: 'No Access: SAMPLE RD MASUK SIMPAN SPV' });
        // }
      }

      const sSQL1 = `SELECT ISNULL(SUM(ISNULL(keluar, 0)), 0) AS jum FROM t_NP_Sample_Stock WHERE itemid = '${txtKode_bhn.Tag}' AND itemName LIKE '${txtNama_bhn.Tag}' AND batchno = '${txtNoBatch.Tag}' AND analisa = '${txtNoAnalisa.Tag}' AND rak = '${lblLokasi.Caption}'`;
      const rs = await sequelizeMSQL.query(sSQL1, { type: QueryTypes.SELECT });

      if (txtJum !== txtJum.Tag && parseFloat(rs[0]?.jum) > 0) {
        return res.status(400).json({ message: 'Sudah ada transaksi keluar', detail: 'Tidak bisa keluar barang' });
      }

      const sSQL1Update = `UPDATE t_NP_Sample_masuk SET ItemName='${txtNama_bhn}', ItemID='${txtKode_bhn}', BatchLot='${txtNoBatch}', Analisa='${txtNoAnalisa}', Principle='${txtPrincl}', Supplier='${txtSupp}', ExpDate='${new Date(txtExpDate).toISOString().split('T')[0]}', Alert='${txtAlert}', RemainDay='${txtRemainDay}', MinStock='${txtMin}', Note='${txtnotes}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date=GETDATE() WHERE itemid='${txtKode_bhn.Tag}' AND analisa='${txtNoAnalisa.Tag}' AND batchlot='${txtNoBatch.Tag}' AND koderak='${lblLokasi.Caption}'`;
      await sequelizeMSQL.query(sSQL1Update, { transaction });
      const sSQL3 = `UPDATE m_NP_Sample SET ItemID='${txtKode_bhn}', ItemName='${txtNama_bhn}', Principle='${txtPrincl}', Supplier='${txtSupp}', BatchLot='${txtNoBatch}', Analisa='${txtNoAnalisa}', ExpDate='${new Date(txtExpDate).toISOString().split('T')[0]}', MinStock='${txtMin}', satuan='${txtSatuan}', alert='${txtAlert}', remainday='${txtRemainDay}', ukuran='${txtUkuran}', komposisi='${txtKomposisi}', UserID='${user_id}', Delegated_To='${delegated_to}' WHERE ItemID='${txtKode_bhn.Tag}' AND BatchLot='${txtNoBatch.Tag}' AND Analisa='${txtNoAnalisa.Tag}'`;
      await sequelizeMSQL.query(sSQL3, { transaction });
      const sSQL5 = `
        UPDATE m_NP_Sample SET BatchLot='${txtNoBatch}', Analisa='${txtNoAnalisa}' WHERE ItemID='${txtKode_bhn.Tag}' AND ItemName='${txtNama_bhn.Tag}' AND BatchLot='${txtNoBatch.Tag}' AND Analisa='${txtNoAnalisa.Tag}';
        UPDATE t_NP_Sample_Stock SET ItemID='${txtKode_bhn}', ItemName='${txtNama_bhn}', batchno='${txtNoBatch}', Analisa='${txtNoAnalisa}' WHERE ItemID='${txtKode_bhn.Tag}' AND ItemName='${txtNama_bhn.Tag}' AND batchno='${txtNoBatch.Tag}' AND Analisa='${txtNoAnalisa.Tag}' AND rak='${lblLokasi.Caption}';
        UPDATE t_NP_Sample_keluar_d SET ItemID='${txtKode_bhn}', ItemName='${txtNama_bhn}', Principle='${txtPrincl}', Supplier='${txtSupp}', BatchLot='${txtNoBatch}', Analisa='${txtNoAnalisa}' WHERE ItemID='${txtKode_bhn.Tag}' AND ItemName='${txtNama_bhn.Tag}' AND BatchLot='${txtNoBatch.Tag}' AND Analisa='${txtNoAnalisa.Tag}' AND KodeRak='${lblLokasi.Caption}'
      `;
      await sequelizeMSQL.query(sSQL5, { transaction });
      await transaction.commit();

      return res.status(200).json({ message: 'OK', });
    }
  } catch (error) {
    console.log({ error });
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function cmdDeleteMasuk(req, res, next) {
  const { user_id, delegated_to } = req.user;
  const { txtID_trans, txtPKID_item, txtJum } = req.body;

  // if (!await User_Access("NP WAREHOUSE STOCK IN OUT")) {
  //   return res.status(403).json({ message: "Anda tidak memiliki akses" });
  // }

  if (!txtID_trans) {
    return res.status(400).json({ message: "Harap pilih item yang akan di hapus" });
  }

  try {
    const strTemp = `SELECT COUNT(*) as jum FROM t_NP_Sample_keluar_d WHERE PK_ID_Item = '${txtPKID_item}'`;
    const recTemp = await sequelizeMSQL.query(strTemp, { type: QueryTypes.SELECT });

    if (recTemp[0].jum > 0) {
      return res.status(400).json({ message: "Tidak bisa hapus karena sudah ada transaksi keluar" });
    }


    const transaction = await sequelizeMSQL.transaction();

    try {
      const sSQL1 = `
        UPDATE t_NP_Sample_masuk SET USERID='${user_id}', Delegated_To='${delegated_to}', flag_update='Update For Delete' WHERE PKID = '${txtID_trans}';
        DELETE FROM t_NP_Sample_masuk WHERE PKID = '${txtID_trans}';
      `;

      const sPK_ID_Item = (await sequelizeMSQL.query(`SELECT TOP 1 PK_ID_item FROM t_NP_Sample_masuk WHERE PKID = '${txtID_trans}'`, { type: QueryTypes.SELECT }))[0]?.PK_ID_item;

      const sSQL2 = `
        UPDATE t_NP_Sample_Stock SET masuk=masuk-${txtJum}, UserID='${user_id}', Delegated_To='${delegated_to}', Process_date=GETDATE() WHERE PK_ID_Item='${sPK_ID_Item}';
      `;

      const sSQL3 = `
        UPDATE t_Bon_Keluar_Bahan_Awal_detail SET mr_rdPKID = NULL
        FROM t_Bon_Keluar_Bahan_Awal_detail A
        INNER JOIN (SELECT TOP 1 * FROM t_Bon_Keluar_Bahan_Awal_detail WHERE mr_rdPKID = '${txtID_trans}') B
        ON A.MR_RDPKID = B.MR_RDPKID
        WHERE A.mr_rdPKID = '${txtID_trans}';
      `;

      await sequelizeMSQL.query(sSQL1 + sSQL2 + sSQL3, { transaction });

      await transaction.commit();
      return res.status(200).json({ message: "Data has been deleted" });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({ message: 'Internal ', detail: error?.message });
  }
}

async function cmdApproveMasuk(req, res, next) {
  const { user_id, delegated_to } = req.user;
  const { txtID_trans } = req.body;

  try {
    let sql = `
        UPDATE t_NP_Sample_masuk
        SET apprspv='${user_id}', apprDelegated='${delegated_to}', apprspvdate=GETDATE()
        WHERE PKID='${txtID_trans}'
      `;

    const result = await sequelizeMSQL.query(sql, { type: QueryTypes.UPDATE });

    if (result) {
      return res.status(200).json({ message: 'Data has been approved' });
    } else {
      return res.status(500).json({ message: 'Gagal Approve/Disapprove data!' });
    }
  } catch (error) {
    console.error('Error approving data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getStockByDate(req, res, next) {
  const { tgl1, tgl2, kdbrg = "", nmbrg = "", lblLokasi } = req.query;

  try {
    const strTemp = `
      SELECT A.PKID, B.TypeInput, B.KelBahan, A.Tanggal, B.Rak, B.ItemID, B.ItemName, B.Principle, B.Supplier, B.batchno, B.Analisa,
             REPLACE(CONVERT(CHAR(11), B.ExpDate, 106), ' ', '-') as ExpDate, B.Alert, B.RemainDay, A.Jumlah, B.MinStock, A.Note,
             A.apprSPV, A.apprSPVdate, A.UserID, A.Delegated_To, A.Process_date, B.kelbahan, B.satuan, B.ukuran, B.komposisi, B.PK_ID_Item
      FROM t_NP_Sample_masuk A
      LEFT JOIN t_NP_Sample_Stock B ON A.PK_ID_item = B.PK_ID_Item
      WHERE A.tanggal BETWEEN '${tgl1}' AND '${tgl2}'
        AND B.itemID LIKE '%${kdbrg}%'
        AND B.ItemName LIKE '%${nmbrg}%'
        AND B.rak = '${lblLokasi}'
      ORDER BY A.Tanggal
    `;

    const results = await sequelizeMSQL.query(strTemp, { type: QueryTypes.SELECT }) || [];
    return res.status(200).json({ message: 'OK', data: results });

  } catch (error) {
    console.error('Error fetching data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function btnSaveKeluar(req, res, next) {
  const { user_id, delegated_to } = req.user;
  const {
    txtIDTrans,
    txtBatchSize,
    txtTypeOut,
    txtNamaProd,
    txtKodeProd,
    txtFormula,
    cboSediaan,
    txtNoPermintaan,
    txtTglTrial,
    txtTrialKe,
    txtPIC,
    txtNote,
    txtBatchSatuan,
    txtBatchKet,
    txtExpiredDate,
    txtFasilitas_trial,
    txtRH,
    txtSuhu
  } = req.body;

  let strMsg = txtIDTrans ? " edit " : " input ";

  if (isNaN(txtBatchSize) || txtBatchSize.includes(",")) {
    return res.status(400).json({ message: "Tidak Bisa simpan karena Besar bets Trial, harus numeric" });
  }

  if (!txtTypeOut) {
    return res.status(400).json({ message: "Harap pilih Type Out" });
  }

  // if (txtTypeOut === "Sample") {
  //   if (!await User_Access("SAMPLE RD KELUAR SIMPAN ADMIN")) {
  //     return res.status(403).json({ message: "Anda tidak punya akses : SAMPLE RD KELUAR SIMPAN ADMIN" });
  //   }
  // } else {
  //   if (!await User_Access("SAMPLE RD KELUAR SIMPAN SPV")) {
  //     return res.status(403).json({ message: "Anda tidak punya akses : SAMPLE RD KELUAR SIMPAN SPV" });
  //   }
  // }

  if (txtTypeOut.toUpperCase() !== "KOREKSI KELUAR" && txtTypeOut.toUpperCase() !== "KELUAR (LAIN - LAIN)") {
    if (!txtNamaProd) return res.status(400).json({ message: "Data Nama Produk harap diisi" });
    if (!txtKodeProd) return res.status(400).json({ message: "Data Kode Produk harap diisi" });
    if (!txtFormula) return res.status(400).json({ message: "Data formula harap diisi" });
    if (!cboSediaan) return res.status(400).json({ message: "Harap pilih formula sediaan" });
    if (isNaN(txtBatchSize)) return res.status(400).json({ message: "besar bets trial harus numeric!" });
  }

  if (txtTypeOut === "Trial") {
    if (!txtKodeProd || !txtNamaProd || !txtFormula) {
      return res.status(400).json({ message: "Harap di isi Kode Produksi, Nama Produk dan Formula" });
    }
  } else if (txtTypeOut.toUpperCase() !== "KOREKSI KELUAR" && txtTypeOut.toUpperCase() !== "KELUAR (LAIN - LAIN)") {
    if (!txtNamaProd) return res.status(400).json({ message: "Nama Produk harap di isi" });
  }

  try {
    const transaction = await sequelizeMSQL.transaction();

    if (!txtIDTrans) {
      const sTransId = await GetTerimaID_Keluar();
      const sSave = `
        INSERT INTO t_NP_Sample_keluar_m (PKID, TypeInput, Tgl, KodeProd, NamaProd, NoPermintaan, TglTrial, TrialKe, PICPelaksana, formula, Note, UserID, Delegated_To, Process_date, batchsize, batchSatuan, batchKet, expiredDate, formula_sediaan, fasilitas_trial, RH, Suhu)
        VALUES ('${sTransId}', '${txtTypeOut}', GETDATE(), '${txtKodeProd}', '${txtNamaProd}', '${txtNoPermintaan}', '${txtTglTrial}', '${txtTrialKe}', '${txtPIC}', '${txtFormula}', '${txtNote}', '${user_id}', '${delegated_to}', GETDATE(), '${txtBatchSize}', '${txtBatchSatuan}', '${txtBatchKet}', '${txtExpiredDate}', '${cboSediaan}', '${txtFasilitas_trial}', '${txtRH}', '${txtSuhu}')
      `;
      await sequelizeMSQL.query(sSave, { transaction });
      await transaction.commit();
      return res.status(200).json({ message: "Data has been saved", data: { sTransId } });
    } else {
      console.log('MASUK ELSE -----------------------');

      // if (!await User_Access("NP WAREHOUSE STOCK IN OUT")) {
      //   return res.status(403).json({ message: "Anda tidak memiliki akses untuk edit data!" });
      // }

      const sSQL = `
        UPDATE t_NP_Sample_keluar_m
        SET TypeInput='${txtTypeOut}', KodeProd='${txtKodeProd}', NamaProd='${txtNamaProd}', NoPermintaan='${txtNoPermintaan}', TglTrial='${txtTglTrial}', TrialKe='${txtTrialKe}', PICPelaksana='${txtPIC}', formula='${txtFormula}', Note='${txtNote}', UserID='${user_id}', Delegated_To='${delegated_to}', Process_date=GETDATE(), batchsize='${txtBatchSize}', batchSatuan='${txtBatchSatuan}', batchKet='${txtBatchKet}', expiredDate='${txtExpiredDate}', formula_sediaan='${cboSediaan}', fasilitas_trial='${txtFasilitas_trial}', RH='${txtRH}', Suhu='${txtSuhu}'
        WHERE PKID='${txtIDTrans}'
      `;
      await sequelizeMSQL.query(sSQL, { transaction });
      await transaction.commit();
      return res.status(200).json({ message: "Data has been updated" });
    }
  } catch (error) {
    console.error('Error saving data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function cekForumulaExisting(req, res, next) {
  try {
    const { txtFormula } = req.query;
    if (txtFormula || txtFormula !== "") {
      const strSQL = `SELECT COUNT(*) AS jum FROM t_NP_Sample_keluar_m WHERE formula = '${txtFormula}'`;
      const rs = await sequelizeMSQL.query(strSQL, { type: QueryTypes.SELECT });
      if (rs[0].jum > 0) {
        return res.status(400).json({ message: `Formula ini sudah ada : ${txtFormula}.` });
      }
      return res.status(200).json({ message: 'OK' });
    }
  } catch (error) {
    console.log({error});
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function cmdApproveKeluar(req, res, next) {
  const { user_id, delegated_to } = req.user;

  if (!user_id || user_id === '') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { txtIDTrans } = req.body;

  if (!txtIDTrans || txtIDTrans === '') {
    return res.status(400).json({ message: "Sequence ID belum dipilih!" });
  }

  try {
    const sql = `
      UPDATE t_NP_Sample_keluar_m
      SET apprID_delegated = '${delegated_to}', apprid = '${user_id}', apprdate = GETDATE()
      WHERE PKID = '${txtIDTrans}'
    `;

    const result = await sequelizeMSQL.query(sql, { type: QueryTypes.UPDATE });

    if (result) {
      return res.status(200).json({ message: "Sukses Approve data!" });
    } else {
      return res.status(500).json({ message: "Gagal simpan data" });
    }
  } catch (error) {
    console.error('Error approving data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function cmdAddNewKeluar(req, res, next) {
  const { user_id, delegated_to } = req.user;

  if (!user_id || user_id === '') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const {
    txtIDTrans,
    txtBatchSize,
    txtTypeOut,
    txtNamaProd,
    txtKodeProd,
    txtFormula,
    cboSediaan,
    txtNoPermintaan,
    txtTglTrial,
    txtTrialKe,
    txtPIC,
    txtNote,
    txtBatchSatuan,
    txtBatchKet,
    txtExpiredDate,
    txtFasilitas_trial,
    txtRH,
    txtSuhu,
    txtQty,
    txtSaldo,
    txtIdSubtrans,
    txt_PK_ID_Item,
    txtNoteDetil
  } = req.body;

  if (!await User_Access("NP WAREHOUSE STOCK IN OUT", user_id)) {
    return res.status(403).json({ message: "Anda tidak memiliki akses" });
  }

  if (!txtIDTrans) {
    return res.status(400).json({ message: "Harap Pilih formula produk!" });
  }

  if (txtTypeOut === "Sample") {
    if (!await User_Access("SAMPLE RD KELUAR SIMPAN ADMIN" , user_id)) {
      return res.status(403).json({ message: "Anda tidak punya akses : SAMPLE RD KELUAR SIMPAN ADMIN" });
    }
  } else {
    if (!await User_Access("SAMPLE RD KELUAR SIMPAN SPV" , user_id)) {
      return res.status(403).json({ message: "Anda tidak punya akses : SAMPLE RD KELUAR SIMPAN SPV" });
    }
  }

  if (txtTypeOut.toUpperCase() !== "KOREKSI KELUAR" && txtTypeOut.toUpperCase() !== "KELUAR (LAIN - LAIN)") {
    if (!txtNamaProd) {
      return res.status(400).json({ message: "Harap isi nama produk!" });
    }
  }

  if (parseFloat(txtQty) > parseFloat(txtSaldo) || parseFloat(txtSaldo) <= 0) {
    return res.status(400).json({ message: "Jumlah keluar tidak boleh nol atau tidak boleh lebih besar dari stock!" });
  }

  if (parseFloat(txtQty) <= 0 || !txtQty) {
    return res.status(400).json({ message: "Masukan nilai Qty keluar nya" });
  }

  if (txtIdSubtrans) {
    return res.status(400).json({ message: "Tidak bisa tambah data, hapus kemudian tambah lagi" });
  }

  try {
    const transaction = await sequelizeMSQL.transaction();

    let sTransId = txtIDTrans || await GetTerimaID_Keluar();

    if (txtTypeOut === "Trial" || txtTypeOut === "Pilot") {
      if (!txtKodeProd || !txtNamaProd || !txtFormula) {
        return res.status(400).json({ message: "Harap di isi Kode Produksi, Nama Produk dan Formula" });
      }
    } else if (txtTypeOut.toUpperCase() !== "KOREKSI KELUAR" && txtTypeOut.toUpperCase() !== "KELUAR (LAIN - LAIN)") {
      if (!txtNamaProd) {
        return res.status(400).json({ message: "Nama Produk harap di isi" });
      }
    }

    if (!txtIDTrans && txtFormula) {
      const strSQL = `SELECT COUNT(*) AS jum FROM t_NP_Sample_keluar_m WHERE formula = '${txtFormula}'`;
      const rs = await sequelizeMSQL.query(strSQL, { type: QueryTypes.SELECT });
      if (rs[0].jum > 0) {
        return res.status(400).json({ message: `Formula ini sudah ada : ${txtFormula}` });
      }
    }

    const strSQL = `SELECT TOP 1 PKID FROM t_NP_Sample_keluar_m WHERE PKID = '${sTransId}'`;
    const rs = await sequelizeMSQL.query(strSQL, { type: QueryTypes.SELECT });

    if (rs.length === 0) {
      const sSave = `
        INSERT INTO t_NP_Sample_keluar_m (PKID, TypeInput, Tgl, KodeProd, NamaProd, NoPermintaan, TglTrial, TrialKe, PICPelaksana, formula, Note, UserID, Delegated_To, Process_date, batchsize, batchSatuan, batchKet, expiredDate)
        VALUES ('${sTransId}', '${txtTypeOut}', GETDATE(), '${txtKodeProd}', '${txtNamaProd}', '${txtNoPermintaan}', '${txtTglTrial}', '${txtTrialKe}', '${txtPIC}', '${txtFormula}', '${txtNote}', '${user_id}', '${delegated_to}', GETDATE(), '${txtBatchSize}', '${txtBatchSatuan}', '${txtBatchKet}', '${txtExpiredDate}')
      `;
      await sequelizeMSQL.query(sSave, { transaction });
    }

    const sSave2 = `
      INSERT INTO t_NP_Sample_keluar_d (PKID, PK_ID_item, Saldo, Qty, Note, UserID, Delegated_To, Process_date, flag_update)
      VALUES ('${sTransId}', '${txt_PK_ID_Item}', '${txtSaldo}', '${txtQty}', '${txtNoteDetil}', '${user_id}', '${delegated_to}', GETDATE(), NULL)
    `;

    const sSave3 = `
      UPDATE t_NP_Sample_Stock
      SET keluar = keluar + ABS(${parseFloat(txtQty)}), UserID = '${user_id}', Delegated_To = '${delegated_to}', Process_date = GETDATE()
      WHERE PK_ID_Item = '${txt_PK_ID_Item}'
    `;

    await sequelizeMSQL.query(sSave2, { transaction });
    await sequelizeMSQL.query(sSave3, { transaction });

    await transaction.commit();

    return res.status(200).json({ message: "Data has been saved", data: { sTransId } });
  } catch (error) {
    console.error('Error saving data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function btnDeleteDetail(req, res, next) {
  const { user_id, delegated_to } = req.user;
  const { txtIdSubtrans, txtIDTrans, txtTypeOut, txtQty, txt_PK_ID_Item } = req.body;

  if (!await User_Access("NP WAREHOUSE STOCK IN OUT", user_id)) {
    return res.status(403).json({ message: "Anda tidak memiliki akses" });
  }

  if (!txtIdSubtrans || !txtIDTrans) {
    return res.status(400).json({ message: "Anda harap pilih ID Trans dulu" });
  }

  if (txtTypeOut === "Sample") {
    if (!await User_Access("SAMPLE RD KELUAR SIMPAN ADMIN", user_id)) {
      return res.status(403).json({ message: "Anda tidak punya akses : SAMPLE RD KELUAR SIMPAN ADMIN" });
    }
  } else {
    if (!await User_Access("SAMPLE RD KELUAR SIMPAN SPV", user_id)) {
      return res.status(403).json({ message: "Anda tidak punya akses : SAMPLE RD KELUAR SIMPAN SPV" });
    }
  }

  try {
    const transaction = await sequelizeMSQL.transaction();

    let Vstat = false;

    const rs = await sequelizeMSQL.query(`SELECT COUNT(SubPKID) AS jum FROM t_NP_Sample_keluar_d WHERE PKID = '${txtIDTrans}'`, { type: QueryTypes.SELECT });
    if (rs[0].jum <= 1) {
      Vstat = true;
      const sSave1 = `
        UPDATE t_NP_Sample_keluar_m
        SET USERID='${user_id}', Delegated_To='${delegated_to}', flag_update='Update For Delete'
        WHERE PKID = '${txtIDTrans}';
        DELETE FROM t_NP_Sample_keluar_m WHERE PKID = '${txtIDTrans}'
      `;
      await sequelizeMSQL.query(sSave1, { transaction });
    }

    const sSave2 = `
      UPDATE t_NP_Sample_keluar_d
      SET USERID='${user_id}', Delegated_To='${delegated_to}', flag_update='Update For Delete'
      WHERE SubPKID = '${txtIdSubtrans}';
      DELETE FROM t_NP_Sample_keluar_d WHERE SubPKID = '${txtIdSubtrans}'
    `;

    const sSave3 = `
      UPDATE t_NP_Sample_Stock
      SET keluar = keluar - ABS(${parseFloat(txtQty)}), UserID = '${user_id}', Delegated_To = '${delegated_to}', Process_date = GETDATE()
      WHERE PK_ID_Item = '${txt_PK_ID_Item}'
    `;

    await sequelizeMSQL.query(sSave2, { transaction });
    await sequelizeMSQL.query(sSave3, { transaction });

    await transaction.commit();

    return res.status(200).json({ message: "Data has been deleted" });
  } catch (error) {
    console.error('Error deleting data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function btnPrint(req, res, next) {
  const { txtIDTrans, txtBatchSize, txtBatchKet } = req.body;

  if (!txtIDTrans) {
    return res.status(400).json({ message: "Sequence ID belum dipilih!" });
  }

  try {
    const rs = await sequelizeMSQL.query(`EXEC spt_rep_sampleFormula '${txtIDTrans}'`, { type: QueryTypes.SELECT });
    console.log({rs, asdasd: 'asasasas'});
    if (rs.length > 0) {
      const rsJum = rs.length;

      const page1 = rs[0] || null;

      if (!page1) return res.status(404).json({ message: "Data tidak ada" });

      const sSQL = `
        SELECT B.emp_Name AS user1, CASE WHEN A.Delegated_To = A.UserID THEN '' ELSE 'an. ' + C.emp_Name END AS user2,
               A.Process_date AS userDt, D.emp_Name AS apprMgr1,
               CASE WHEN A.apprID_delegated = A.apprID THEN '' ELSE 'an. ' + E.emp_Name END AS apprMgr2, A.apprDate
        FROM t_NP_Sample_keluar_m A
        LEFT JOIN m_employee B ON A.Delegated_To = B.emp_NIK
        LEFT JOIN m_employee C ON A.UserID = C.emp_NIK
        LEFT JOIN m_employee D ON A.apprID_delegated = D.emp_NIK
        LEFT JOIN m_employee E ON A.apprID = E.emp_NIK
        WHERE A.PKID = '${txtIDTrans}'
      `;
      const rs2 = await sequelizeMSQL.query(sSQL, { type: QueryTypes.SELECT });

      const page2 = {
        ttdSPV1: rs2[0].user1,
        ttdSPV2: rs2[0].user2,
        ttdSPVDt: new Date(rs2[0].userDt).toLocaleString(),
        ttdMGR1: rs2[0].apprMgr1,
        ttdMGR2: rs2[0].apprMgr2,
        ttdMGRDt: new Date(rs2[0].apprDate).toLocaleString(),
        lbl_JumTrial: `(${txtBatchSize} ${txtBatchKet})**`
      };

      // console.log("Page 1:", page1);
      // console.log("Page 2:", page2);

      return res.status(200).json({ message: "Print successful", page1, page2 });
    } else {
      return res.status(404).json({ message: "Data tidak ada" });
    }
  } catch (error) {
    console.error('Error printing data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getHistoryData(req, res, next) {
  const { txtKodeBahan, txtBatchno, txtNoAnalisa, txtRak } = req.query;

  if (!txtKodeBahan && !txtBatchno && !txtNoAnalisa && !txtRak) {
    return res.status(400).json({ message: "Harap pilih Kode Bahan" });
  }

  try {
    const strTemp = `EXEC spNPHistory '${txtKodeBahan}'`;
    const recTemp = await sequelizeMSQL.query(strTemp, { type: QueryTypes.SELECT });

    if (recTemp.length > 0) {
      return res.status(200).json({ message: "OK", data: recTemp });
    } else {
      return res.status(404).json({ message: "Data tidak ada" });
    }
  } catch (error) {
    console.error('Error retrieving data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}



module.exports = {
  btnPrint,
  getHistoryData,
  btnDeleteDetail,
  cmdAddNewKeluar,
  cmdApproveKeluar,
  btnSaveKeluar,
  cekForumulaExisting,
  exportStockDataToExcel,
  getStockDataByRak,
  getRakNotEmpty,
  browseItem,
  cmdSimpanMasuk,
  cmdDeleteMasuk,
  getStockByDate,
  cmdApproveMasuk,
};