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

    let {
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

      if (parseFloat(txtJum) <= 0 && txtTypeInput != 'Edit') return res.status(400).json({ message: 'Jumlah tidak boleh 0' });
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

      await transaction.commit();
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

      const page1 = rs || null;

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

      const footer = {
        NoDoc: "FO.RD.000073",
        Tanggal: "18/06/2021",
        Revisi: "02",
      }

      // console.log("Page 1:", page1);
      // console.log("Page 2:", page2);

      return res.status(200).json({ message: "Print successful", page1, page2, footer });
    } else {
      return res.status(404).json({ message: "Data tidak ada" });
    }
  } catch (error) {
    console.error('Error printing data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function loadGridMaster(req, res, next) {
  const dateNow = new Date();
  const convertedDate = moment(dateNow).format('YYYY-MM-DD');
  let { dtCari1, dtCari2 = convertedDate, txtcariProd } = req.query;

  // Mengurangi 30 hari dari dtCari2 jika dtCari1 tidak disediakan
  if (!dtCari1) {
    const thirtyDaysAgo = moment(dtCari2).subtract(30, 'days').toDate();
    dtCari1 = moment(thirtyDaysAgo).format('YYYYMMDD');
  } else {
    dtCari1 = moment(dtCari1).format('YYYYMMDD');
  }

  dtCari2 = moment(dtCari2).format('YYYYMMDD');

  try {
    const strTemp = `
      SELECT PKID, TypeInput, Tgl, KodeProd, NamaProd, formula, Note, ISNULL(batchsize, '') AS batchsize, ISNULL(batchSatuan, '') AS batchSatuan, ISNULL(batchKet, '') AS batchKet, ISNULL(expiredDate, '') AS expiredDate, NoPermintaan, TglTrial, TrialKe, PICPelaksana, fasilitas_trial, formula_sediaan, ISNULL(RH, 0) AS RH, ISNULL(Suhu, 0) AS Suhu
      FROM t_NP_Sample_keluar_m
      WHERE CONVERT(VARCHAR(8), Tgl, 112) BETWEEN '${dtCari1}' AND '${dtCari2}'
        AND (ISNULL(NamaProd, '') LIKE '%${txtcariProd}%' OR ISNULL(formula, '') LIKE '%${txtcariProd}%')
      ORDER BY Tgl
    `;

    const recTemp = await sequelizeMSQL.query(strTemp, { type: QueryTypes.SELECT });

    if (recTemp.length > 0) {
      const lvMaster = recTemp.map(item => ({
        PKID: item.PKID,
        TypeInput: item.TypeInput,
        Tgl: item.Tgl,
        KodeProd: item.KodeProd,
        NamaProd: item.NamaProd,
        formula: item.formula,
        Note: item.Note,
        batchsize: item.batchsize,
        batchSatuan: item.batchSatuan,
        batchKet: item.batchKet,
        expiredDate: moment(item.expiredDate).format('YYYY/MM/DD'),
        NoPermintaan: item.NoPermintaan,
        TglTrial: moment(item.TglTrial).format('YYYY/MM/DD'),
        TrialKe: item.TrialKe,
        PICPelaksana: item.PICPelaksana,
        fasilitas_trial: item.fasilitas_trial,
        formula_sediaan: item.formula_sediaan,
        RH: item.RH,
        Suhu: item.Suhu
      }));

      return res.status(200).json({ message: 'OK', data: lvMaster });
    } else {
      return res.status(404).json({ message: 'Data not found' });
    }
  } catch (error) {
    console.error('Error loading grid master:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function loadGriddetil(req, res, next) {
  const { txtIDTrans } = req.query;

  if (!txtIDTrans) {
    return res.status(400).json({ message: "txtIDTrans is required" });
  }

  try {
    const strTemp = `
      SELECT A.PKID, A.SubPKID, B.ItemID, B.ItemName, B.Principle, B.Supplier, B.batchno AS BatchLot, B.Analisa, B.rak AS KodeRak, A.Saldo, A.Qty, A.Note, A.UserID, A.Delegated_To, A.Process_date, B.satuan, B.ExpDate, B.PK_ID_Item
      FROM t_NP_Sample_keluar_d A
      LEFT JOIN t_NP_Sample_Stock B ON A.PK_ID_item = B.PK_ID_Item
      WHERE A.PKID = '${txtIDTrans}'
      ORDER BY 2
    `;

    const recTemp = await sequelizeMSQL.query(strTemp, { type: QueryTypes.SELECT });

    if (recTemp.length > 0) {
      const lvDetail = recTemp.map(item => ({
        PKID: item.PKID,
        SubPKID: item.SubPKID,
        ItemID: item.ItemID,
        ItemName: item.ItemName,
        Principle: item.Principle,
        Supplier: item.Supplier,
        BatchLot: item.BatchLot,
        Analisa: item.Analisa,
        KodeRak: item.KodeRak,
        Saldo: item.Saldo,
        Qty: item.Qty,
        Note: item.Note,
        UserID: item.UserID,
        Delegated_To: item.Delegated_To,
        Process_date: item.Process_date,
        satuan: item.satuan,
        ExpDate: moment(item.ExpDate).format('DD-MMM-YYYY'),
        PK_ID_Item: item.PK_ID_Item
      }));

      return res.status(200).json({ message: 'OK', data: lvDetail });
    } else {
      return res.status(404).json({ message: 'Data not found' });
    }
  } catch (error) {
    console.error('Error loading grid detail:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function searchByKodeBahan(req, res, next) {
  const { txtIDTrans, txtTypeOut, cboSediaan } = req.query;

  if (!txtIDTrans) {
    return res.status(400).json({ message: "Harap pilih transaksi keluar" });
  }

  if (txtTypeOut?.toUpperCase() !== "KOREKSI KELUAR" && txtTypeOut?.toUpperCase() !== "KELUAR (LAIN - LAIN)") {
    if (!cboSediaan) {
      return res.status(400).json({ message: "Harap pilih formula sediaan" });
    }
  }

  const strKode = req.query.strKode || null;
  const strName = req.query.strName || null;
  const strBatchNo = req.query.strBatchNo || null;
  const gStrListerTag = "Kode,Nama,Principle,Supplier,No Batch,No Analisa,Rak, Saldo, Satuan, PK ID Item";
  let strSQL = `
    SELECT DISTINCT A.ItemID, A.ItemName, A.Principle, A.Supplier, A.batchno, A.Analisa, A.rak, A.saldoawal + A.masuk - A.keluar AS saldo, A.satuan, A.PK_ID_Item
    FROM t_NP_Sample_Stock A
    WHERE (A.saldoawal + A.masuk - A.keluar) > 0
  `;

  if (strKode) {
    strSQL += ` AND A.itemid LIKE '${strKode}%'`;
  }

  if (strName) {
    strSQL += ` AND A.itemName LIKE '${strName}%'`;
  }

  if (strBatchNo) {
    strSQL += ` AND A.batchno LIKE '${strBatchNo}%'`;
  }

  try {
    const grecLister = await sequelizeMSQL.query(strSQL, { type: QueryTypes.SELECT });

    if (grecLister.length > 0) {
      return res.status(200).json({ message: "OK", data: grecLister });
    } else {
      return res.status(200).json({ message: "Data Belum Tersedia!", data: [] });
    }
  } catch (error) {
    console.error('Error executing search:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function searchNoPermintaan(req, res, next) {
  const { noPermintaan } = req.query;


  try {
    const strSQL = `
      SELECT
        no_permintaan,
        tgl_permintaan,
        dept,
        nama_barang,
        batch,
        principle,
        Supplier,
        alasan_permintaan
      FROM t_permintaan_jasa_NP
      WHERE ISNULL(no_permintaan, '') <> ''
      ${noPermintaan ? `AND no_permintaan LIKE :noPermintaan` : ''}
      ORDER BY tgl_permintaan DESC
    `;

    const grecLister = await sequelizeMSQL.query(strSQL, {
      replacements: { noPermintaan: `%${noPermintaan}%` },
      type: QueryTypes.SELECT
    });

    if (grecLister.length > 0) {
      return res.status(200).json({ message: "OK", data: grecLister });
    } else {
      return res.status(404).json({ message: "Data Belum Tersedia!" });
    }
  } catch (error) {
    console.error('Error searching no permintaan:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function fnIsApprove(pkid) {
  try {
    const sql = `
      SELECT TOP 1 ISNULL(apprid, '') AS appr
      FROM t_NP_Sample_keluar_m
      WHERE PKID LIKE :pkid
    `;

    const rs = await sequelizeMSQL.query(sql, {
      replacements: { pkid },
      type: QueryTypes.SELECT
    });

    if (rs.length > 0 && rs[0].appr !== '') {
      return true; // already approved
    } else {
      return false; // not approved
    }
  } catch (error) {
    console.error('Error checking approval status:', error);
    throw error;
  }
}

async function sbCekTombolPrint(req, res, next) {
  let { txtIDTrans } = req.query;

  if (!txtIDTrans) {
    return res.status(400).json({ message: "txtIDTrans is required" });
  }

  try {
    const { user_id , nama_user, inisial_user, jabatan_user, joblevel_id_user, bagian_user, delegated_to} = req.user;
    if (!user_id || user_id === '') return res.status(401).send('Unauthorized request');
    let fnUserLevel = joblevel_id_user;
    console.log({user: req.user});
    const isApproved = await fnIsApprove(txtIDTrans);

    const response = {
      btnPrintEnabled: false,
      CmdAddNewEnabled: true,
      btnSaveEnabled: true,
      btnDeleteDetailEnabled: true,
      cmdApproveEnabled: false
    };

    if (isApproved) {
      response.btnPrintEnabled = true;
      response.CmdAddNewEnabled = false;
      response.btnSaveEnabled = false;
      response.btnDeleteDetailEnabled = false;
    }

    if (fnUserLevel) {
      response.cmdApproveEnabled = !isApproved;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error checking button states:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// ---- HISTORY

async function getHistoryData(req, res, next) {
  const { PK_ID_Item, txtBatchno, txtNoAnalisa, txtRak } = req.query;

  if (!PK_ID_Item && !txtBatchno && !txtNoAnalisa && !txtRak) {
    return res.status(400).json({ message: "Harap pilih Kode Bahan" });
  }

  try {
    const strTemp = `EXEC spNPHistoryMich '${PK_ID_Item}'`;
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

async function findHistoryByKodeBahan(req, res, next) {
  const { itemID, itemName, batchno } = req.query;

  try {
    let strSQL = `
      SELECT A.ItemID, A.ItemName, Principle, Supplier, A.batchno AS BatchLot, A.Analisa, A.rak, A.saldoawal + A.masuk - A.keluar AS saldo, A.PK_ID_Item
      FROM t_NP_Sample_Stock A WHERE 1=1
    `;

    if (itemID) {
      strSQL += ` AND A.itemid LIKE '${itemID}%'`;
    }
    if (itemName) {
      strSQL += ` AND A.itemName LIKE '%${itemName}%'`;
    }

    if (batchno) {
      strSQL += ` AND A.batchno LIKE '%${batchno}%'`;
    }

    const grecLister = await sequelizeMSQL.query(strSQL, { type: QueryTypes.SELECT });

    if (grecLister.length > 0) {
      const selectedItem = grecLister|| []

      return res.status(200).json({ message: "OK", data: selectedItem });
    } else {
      return res.status(404).json({ message: "Data Belum Tersedia!" });
    }
  } catch (error) {
    console.error('Error finding data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function handleItemPrint(req, res, next) {
  const { itemID } = req.query;

  if (!itemID) {
    return res.status(400).json({ message: "Item ID is required" });
  }

  try {
    const strTemp = `
      SELECT DISTINCT B.ItemName, B.batchno AS batchlot, B.principle, B.expDate, B.itemid, B.Analisa, B.supplier, B.kelbahan
      FROM t_NP_Sample_masuk A
      RIGHT JOIN t_NP_Sample_Stock B ON A.PK_ID_item = B.PK_ID_item
      WHERE B.PK_ID_item = :itemID
    `;

    const recTemp = await sequelizeMSQL.query(strTemp, {
      replacements: { itemID },
      type: QueryTypes.SELECT
    });

    if (recTemp.length === 0) {
      return res.status(404).json({ message: "Data not found" });
    }

    const strKelompokBahan = recTemp[0]?.kelbahan?.toUpperCase();
    console.log({strKelompokBahan});

    switch (strKelompokBahan) {
      case "BAHAN KEMAS":
        return await sbPrint_BahanKemas(req, res, next);
      case "BAHAN BAKU AKTIF":
        return await sbPrint_BahanBakuAktif(req, res, next);
      case "BAHAN BAKU TAMBAHAN":
        return await sbPrint_BahanTambahan(req, res, next);
      default:
        return await sbPrint_BahanLain(req, res, next);
    }
  } catch (error) {
    console.error('Error handling item print:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function sbPrint_BahanKemas(req, res, next) {
  const { itemID, page, size } = req.query;

  if (!itemID) {
    return res.status(400).json({ message: "Item ID is required" });
  }

  const { limit, offset } = getPagination(page, size);

  try {
    const strTemp = `
      SELECT * FROM (
        SELECT
          B.ItemName,
          B.batchno AS batchlot,
          B.principle,
          B.expDate,
          B.itemid,
          B.Analisa,
          B.supplier,
          B.kelbahan,
          ROW_NUMBER() OVER (ORDER BY B.ItemName) AS row_num
        FROM t_NP_Sample_Stock B
        WHERE B.PK_ID_item = :itemID
      ) AS temp
      WHERE row_num BETWEEN :offset AND :offset + :limit
    `;

    const recTemp = await sequelizeMSQL.query(strTemp, {
      replacements: { itemID, limit, offset: offset + 1 },
      type: QueryTypes.SELECT
    });

    if (recTemp.length === 0) {
      return res.status(404).json({ message: "Data not found" });
    }

    const totalItems = await sequelizeMSQL.query(`
      SELECT COUNT(*) AS count
      FROM t_NP_Sample_Stock B
      WHERE B.PK_ID_item = :itemID
    `, {
      replacements: { itemID },
      type: QueryTypes.SELECT
    });

    const response = getPagingData(
      {
        rows: recTemp,
        count: totalItems[0].count,
      },
      page,
      limit
    );

    console.log("Printing Bahan Kemas...");
    response['footer'] = {
      NoDoc: "FO.RD.000020",
      Tanggal: "28/11/2019",
      Revisi: "01",
    }
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error printing Bahan Kemas:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function sbPrint_BahanBakuAktif(req, res, next) {
  const { itemID } = req.query;

  if (!itemID) {
    return res.status(400).json({ message: "Item ID is required" });
  }

  try {
    const strTemp = `
      SELECT DISTINCT
        B.ItemName,
        B.batchno AS batchlot,
        B.principle,
        B.expDate,
        B.itemid,
        B.Analisa,
        B.supplier,
        B.kelbahan
      FROM t_NP_Sample_Stock B
      WHERE B.PK_ID_item = :itemID
    `;

    const recTemp = await sequelizeMSQL.query(strTemp, {
      replacements: { itemID },
      type: QueryTypes.SELECT
    });

    if (recTemp.length === 0) {
      return res.status(404).json({ message: "Data not found" });
    }

    const reportData = recTemp[0];

    const historyQuery = `
      EXEC spNPHistory_Print :itemID
    `;

    const historyData = await sequelizeMSQL.query(historyQuery, {
      replacements: { itemID },
      type: QueryTypes.SELECT
    });

    const filteredData = historyData.filter(item => item.nomor);

    console.log("Printing Bahan Baku Aktif...");
    const footer = {
      NoDoc: "FO.RD.000040",
      Tanggal: "28/11/2019",
      Revisi: "01",
    }
    return res.status(200).json({ message: "Printing Bahan Baku Aktif...", header: reportData, data: filteredData, footer });
  } catch (error) {
    console.error('Error printing Bahan Baku Aktif:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function sbPrint_BahanTambahan(req, res, next) {
  const { itemID } = req.query;

  if (!itemID) {
    return res.status(400).json({ message: "Item ID is required" });
  }

  try {
    const strTemp = `
      SELECT DISTINCT
        B.ItemName,
        B.batchno AS batchlot,
        B.principle,
        B.expDate,
        B.itemid,
        B.Analisa,
        B.supplier,
        B.kelbahan
      FROM t_NP_Sample_Stock B
      WHERE B.PK_ID_item = :itemID
    `;

    const recTemp = await sequelizeMSQL.query(strTemp, {
      replacements: { itemID },
      type: QueryTypes.SELECT
    });

    if (recTemp.length === 0) {
      return res.status(404).json({ message: "Data not found" });
    }

    const reportData = recTemp[0];

    const historyQuery = `
      EXEC spNPHistory_Print :itemID
    `;

    const historyData = await sequelizeMSQL.query(historyQuery, {
      replacements: { itemID },
      type: QueryTypes.SELECT
    });

    const filteredData = historyData.filter(item => item.nomor);

    console.log("Printing Bahan Tambahan...");
    const footer = {
      NoDoc: "FO.000041",
      Tanggal: "28/11/2019",
      Revisi: "01",
    }
    return res.status(200).json({ message: "Printing Bahan Tambahan...", header: reportData, data: filteredData, footer });
  } catch (error) {
    console.log({ name: "sbPrint_BahanTambahan", error });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function sbPrint_BahanLain(req, res, next) {
  const { itemID } = req.query;

  if (!itemID) {
    return res.status(400).json({ message: "Item ID is required" });
  }

  try {
    const strTemp = `
      SELECT DISTINCT
        B.ItemName,
        B.batchno AS batchlot,
        B.principle,
        B.expDate,
        B.itemid,
        B.Analisa,
        B.supplier,
        B.kelbahan
      FROM t_NP_Sample_Stock B
      WHERE B.PK_ID_item = :itemID
    `;

    const recTemp = await sequelizeMSQL.query(strTemp, {
      replacements: { itemID },
      type: QueryTypes.SELECT
    });

    if (recTemp.length === 0) {
      return res.status(404).json({ message: "Data not found" });
    }

    const reportData = recTemp[0];
    const strKelompokBahan = reportData.kelbahan.trim().toUpperCase();

    let lblCat1 = 0;
    let lblCat2 = 0;
    let lblCat3 = 0;
    let lblCat4 = 0;

    if (strKelompokBahan === "FLAVOR/ESSENCE") {
      lblCat1 = 1;
    } else if (strKelompokBahan === "FRAGRENCE") {
      lblCat2 = 1;
    } else if (strKelompokBahan === "PEWARNA") {
      lblCat3 = 1;
    } else {
      lblCat4 = 1;
    }

    const historyQuery = `
      EXEC spNPHistory_Print :itemID
    `;

    const historyData = await sequelizeMSQL.query(historyQuery, {
      replacements: { itemID },
      type: QueryTypes.SELECT
    });

    const filteredData = historyData.filter(item => item.nomor);

    console.log("Printing Bahan Lain...");
    const footer = {
      NoDoc: "FO.000042",
      Tanggal: "28/11/2019",
      Revisi: "01",
    }
    return res.status(200).json({
      message: "Printing Bahan Lain...",
      header: reportData,
      data: filteredData,
      footer,
      categories: {
        lblCat1,
        lblCat2,
        lblCat3,
        lblCat4
      }
    });
  } catch (error) {
    console.log({ name: "sbPrint_BahanLain", error });
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// ---- PINDAH LOKASI

async function cmdRefreshData_pindahLokasi(req, res, next) {
  const { rak = '', txtFilter = '', page, size } = req.query;

  const { limit, offset } = getPagination(page, size);

  try {
    const strSQL = `
      SELECT * FROM (
        SELECT
          ROW_NUMBER() OVER (ORDER BY A.ItemName) AS row_num,
          A.ItemID,
          A.ItemName,
          A.Principle,
          A.Supplier,
          A.batchNo AS BatchLot,
          A.ExpDate,
          A.Analisa,
          A.rak,
          A.saldoawal + A.masuk - A.keluar AS saldo,
          A.PK_ID_Item
        FROM t_NP_Sample_Stock A
        WHERE A.saldoawal + A.masuk - A.keluar > 0
          AND A.rak LIKE :rak
          AND (A.ItemID LIKE :txtFilter OR A.ItemName LIKE :txtFilter)
      ) AS temp
      WHERE row_num BETWEEN :offset AND :offset + :limit
    `;

    const recTemp = await sequelizeMSQL.query(strSQL, {
      replacements: { rak: `%${rak}%`, txtFilter: `%${txtFilter}%`, limit, offset: offset + 1 },
      type: QueryTypes.SELECT
    });

    if (recTemp.length === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan!" });
    }

    const totalItemsQuery = `
      SELECT COUNT(*) AS count
      FROM t_NP_Sample_Stock A
      WHERE A.saldoawal + A.masuk - A.keluar > 0
        AND A.rak LIKE :rak
        AND (A.ItemID LIKE :txtFilter OR A.ItemName LIKE :txtFilter)
    `;

    const totalItemsResult = await sequelizeMSQL.query(totalItemsQuery, {
      replacements: { rak: `%${rak}%`, txtFilter: `%${txtFilter}%` },
      type: QueryTypes.SELECT
    });

    const totalItems = totalItemsResult[0].count;
    const response = getPagingData({ rows: recTemp, count: totalItems }, page, limit);

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error refreshing data:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function cmdReport_pindahLokasi(req, res, next) {
  const { cboRak, lvDetail } = req.body;

  if (!cboRak) {
    return res.status(400).json({ message: "Rak tujuan pindah, harap diisi!" });
  }

  if (!lvDetail || !Array.isArray(lvDetail) || lvDetail.length === 0) {
    return res.status(400).json({ message: "Harap cheklist data yang akan di pindahkan!" });
  }

  try {
    // const strPKID = await GetTerimaID_Keluar();
    // const strPKIDMasuk = await GetTerimaID();

    let SQLStr = '';
    let i = 0;
    lvDetail.forEach(item => {
      SQLStr += `
        UPDATE t_NP_Sample_Stock
        SET from_update = 'Pindah Rak', rak = :cboRak
        WHERE PK_ID_Item = :PK_ID_Item;
      `;
    });

    const replacements = lvDetail.map(item => ({
      cboRak,
      PK_ID_Item: item.PK_ID_Item
    }));

    await sequelizeMSQL.transaction(async (transaction) => {
      for (const replacement of replacements) {
        await sequelizeMSQL.query(SQLStr, {
          replacements: replacement,
          type: QueryTypes.UPDATE,
          transaction
        });
      }
    });

    return res.status(200).json({ message: "Data has been saved" });
  } catch (error) {
    console.error('Error moving stock:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// ---- ALERT

async function getExpiringSoonItems(req, res, next) {
  const { searchText = '', page, size, rawdata = '0', sort = 'A.expdate ASC' } = req.query;
  const { limit, offset } = getPagination(page, size);

  try {
    const strTemp1 = `
      SELECT DISTINCT
        A.typeinput,
        tanggal tglmasuk,
        A.rak AS koderak,
        A.itemid,
        A.itemName,
        A.principle,
        A.supplier,
        A.batchno AS batchlot,
        A.analisa,
        A.expdate,
        (A.saldoawal + A.masuk - A.keluar) AS stockAkhir,
        ROW_NUMBER() OVER (ORDER BY ${sort}) AS row_num
      FROM t_NP_Sample_Stock A
      LEFT JOIN t_NP_Sample_masuk B ON A.PK_ID_Item = B.PK_ID_Item
      WHERE A.expdate <= DATEADD(day, 10, GETDATE())
        AND (A.saldoawal + A.masuk - A.keluar) > 0
        ${searchText === '' ? '' : `AND A.itemName LIKE :searchText`}
    `;

    const recTemp1 = await sequelizeMSQL.query(strTemp1, {
      replacements: { searchText: `%${searchText}%` },
      type: QueryTypes.SELECT
    });

    const totalItemsQuery = `
      SELECT COUNT(*) AS count
      FROM t_NP_Sample_Stock A
      LEFT JOIN t_NP_Sample_masuk B ON A.PK_ID_Item = B.PK_ID_Item
      WHERE A.expdate <= DATEADD(day, 10, GETDATE())
        AND (A.saldoawal + A.masuk - A.keluar) > 0
        ${searchText === '' ? '' : `AND A.itemName LIKE :searchText`}
    `;

    const totalItemsResult = await sequelizeMSQL.query(totalItemsQuery, {
      replacements: { searchText: `%${searchText}%` },
      type: QueryTypes.SELECT
    });

    const totalItems = totalItemsResult[0].count;
    const response = getPagingData({ rows: recTemp1, count: totalItems }, page, limit);

    if (rawdata === '1') return recTemp1;

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error executing search:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}


// SUM DULU AKUMULASI SALDO AKHIR DARI PRINCIPLE DAN ITEMID YANG SAMA
async function getBelowMinStockItemsByItemIdAndPrinciple(req, res, next) {
  const { searchText = '', page = 0, size = 50, rawdata = '0' } = req.query;
  const { limit, offset } = getPagination(page, size);

  try {
    const strTemp2 = `
      SELECT
        A.itemid,
        MIN(A.itemName) AS itemName,
        A.principle,
        MIN(A.supplier) AS supplier,
        MIN(A.Analisa) AS Analisa,
        MIN(A.Expdate) AS Expdate,
        MIN(A.batchno) AS batchlot,
        MIN(A.minstock) AS minstock,
        SUM(A.saldoawal + A.masuk - A.keluar) AS stockAkhir
      FROM t_NP_Sample_Stock A
      WHERE (A.saldoawal + A.masuk - A.keluar) > 0
        ${searchText === '' ? '' : `AND A.itemName LIKE :searchText`}
      AND A.itemid IS NOT NULL AND A.itemid <> '' AND A.itemid <> 'NA' AND A.itemid <> '-'
      GROUP BY A.itemid, A.principle
      HAVING SUM(A.saldoawal + A.masuk - A.keluar) < MIN(A.minstock)
    `;

    const recTemp2 = await sequelizeMSQL.query(strTemp2, {
      replacements: { searchText: `%${searchText}%` },
      type: QueryTypes.SELECT
    });

    const totalItems = recTemp2.length;
    const pagedRows = recTemp2.slice(offset, offset + limit);
    const response = getPagingData({ rows: pagedRows, count: totalItems }, page, limit);

    if (rawdata === '1') return recTemp2;
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error executing search:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getBelowMinStockItems(req, res, next) {
  const { searchText = '', page = 0, size = 50, rawdata = '0' } = req.query;
  const { limit, offset } = getPagination(page, size);

  try {
    const strTemp2 = `
      SELECT DISTINCT
        A.itemid,
        A.itemName,
        A.principle,
        A.supplier,
        A.batchno AS batchlot,
        A.Analisa,
        A.Expdate,
        (A.saldoawal + A.masuk - A.keluar) AS stockAkhir,
        A.minstock,
        ROW_NUMBER() OVER (ORDER BY A.itemName) AS row_num
      FROM t_NP_Sample_Stock A
      LEFT JOIN t_NP_Sample_masuk B ON A.PK_ID_Item = B.PK_ID_Item
      WHERE (A.saldoawal + A.masuk - A.keluar) > 0
        AND (A.saldoawal + A.masuk - A.keluar) < A.minstock
        ${searchText === '' ? '' : `AND A.itemName LIKE :searchText`}
    `;

    const recTemp2 = await sequelizeMSQL.query(strTemp2, {
      replacements: { searchText: `%${searchText}%` },
      type: QueryTypes.SELECT
    });

    const totalItemsQuery = `
      SELECT COUNT(*) AS count
      FROM t_NP_Sample_Stock A
      LEFT JOIN t_NP_Sample_masuk B ON A.PK_ID_Item = B.PK_ID_Item
      WHERE (A.saldoawal + A.masuk - A.keluar) > 0
        AND (A.saldoawal + A.masuk - A.keluar) < A.minstock
        ${searchText === '' ? '' : `AND A.itemName LIKE :searchText`}
    `;

    const totalItemsResult = await sequelizeMSQL.query(totalItemsQuery, {
      replacements: { searchText: `%${searchText}%` },
      type: QueryTypes.SELECT
    });

    const totalItems = totalItemsResult[0].count;
    const response = getPagingData({ rows: recTemp2, count: totalItems }, page, limit);

    if (rawdata === '1') return recTemp2;
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error executing search:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function generateExcelReport(req, res, next) {
  const { size = 10000, page = 0, searchText = '' } = req.query;
  try {
    const workbook = new ExcelJS.Workbook();
    const currentDate = moment().format('YYYY-MMM-DD');

    // Create "Expired" sheet
    const expiredSheet = workbook.addWorksheet('Expired');
    expiredSheet.addRow(['Laporan Bahan Sudah Expired']);
    expiredSheet.addRow([`Tanggal Print : ${currentDate}`]);
    expiredSheet.addRow([]);
    expiredSheet.addRow([
      'Type Input', 'Tgl Masuk', 'Kode Rak', 'Kode Bahan', 'Nama Bahan', 'Principle', 'Supplier', 'Batch No', 'No Analisa', 'Expired Date', 'Stock Akhir'
    ]);

    // Set column widths
    expiredSheet.columns = [
      { width: 15 }, { width: 28 }, { width: 20 }, { width: 21 }, { width: 21 },
      { width: 16 }, { width: 17 }, { width: 18 }, { width: 14 }, { width: 11 }, { width: 11 }
    ];

    const mockReq = {
      query: {
        searchText,
        page,
        size,
        rawdata: '1',
        sort: 'A.expdate ASC' // Ensure sorting by Expired Date
      }
    };

    const mockRes = {
      status: (statusCode) => ({
        json: (data) => data
      })
    };

    const expiredData = await getExpiringSoonItems(mockReq, mockRes, next) || [];
    console.log({ mockRes, expiredData });

    // Sort the data by Expired Date
    expiredData.sort((a, b) => new Date(a.expdate) - new Date(b.expdate));

    expiredData.forEach((item, index) => {
      expiredSheet.addRow([
        item.typeinput, item.tglmasuk, item.koderak, item.itemid, item.itemName,
        item.principle, item.supplier, item.batchlot, item.analisa, item.expdate, item.stockAkhir
      ]);
    });

    // Apply border and style
    const expiredRange = expiredSheet.getRows(4, expiredData.length + 1);
    expiredRange.forEach(row => {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    expiredSheet.getRow(4).font = { bold: true, size: 12 };

    // Create "Stock Minimum" sheet
    const stockMinSheet = workbook.addWorksheet('Stock Minimum');
    stockMinSheet.addRow(['Laporan Bahan Stock Minimum']);
    stockMinSheet.addRow([`Tanggal Print : ${currentDate}`]);
    stockMinSheet.addRow([]);
    stockMinSheet.addRow([
      'Kode Bahan', 'Nama Bahan', 'Principle', 'Supplier', 'Batch No', 'No Analisa', 'Expired Date', 'Stock Akhir', 'Minimum Stock'
    ]);

    // Set column widths
    stockMinSheet.columns = [
      { width: 15 }, { width: 28 }, { width: 20 }, { width: 21 }, { width: 21 },
      { width: 16 }, { width: 17 }, { width: 18 }, { width: 14 }
    ];

    // Add data rows (replace with actual data)
    const stockMinData = await getBelowMinStockItems(mockReq, mockRes, next) || [];
    stockMinData.forEach((item, index) => {
      stockMinSheet.addRow([
        item.itemid, item.itemName, item.principle, item.supplier, item.batchlot,
        item.Analisa, item.Expdate, item.stockAkhir, item.minstock
      ]);
    });

    // Apply border and style
    const stockMinRange = stockMinSheet.getRows(4, stockMinData.length + 1);
    stockMinRange.forEach(row => {
      row.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    stockMinSheet.getRow(4).font = { bold: true, size: 12 };

    // Send the workbook as a response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel report:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// ---- FORMULA

async function searchProducts(req, res, next) {
  const { searchText } = req.query;

  if (!searchText) {
    return res.status(400).json({ message: "Harap isi Kode Produk, Nama produk atau Formula!" });
  }

  try {
    const strTemp = `
      SELECT PKID, Formula, Tgl, KodeProd, NamaProd, Note
      FROM t_NP_Sample_keluar_m
      WHERE KodeProd LIKE :searchText
        OR NamaProd LIKE :searchText
        OR Formula LIKE :searchText
    `;

    const recTemp = await sequelizeMSQL.query(strTemp, {
      replacements: { searchText: `%${searchText}%` },
      type: QueryTypes.SELECT
    });

    if (recTemp.length === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan!" });
    }

    return res.status(200).json({ message: "OK", data: recTemp });
  } catch (error) {
    console.error('Error executing search:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getDetailByPKID(req, res, next) {
  const { pkid } = req.query;

  if (!pkid) {
    return res.status(400).json({ message: "PKID is required" });
  }

  try {
    const strTemp = `
      SELECT A.tgl, A.Formula, C.ItemID, C.ItemName, C.Principle, C.Supplier, C.batchno AS BatchLot, C.Analisa, C.rak AS KodeRak, B.Qty, B.Note
      FROM t_NP_Sample_keluar_m A
      INNER JOIN t_NP_Sample_keluar_d B ON A.pkid = B.PKID
      LEFT JOIN t_NP_Sample_Stock C ON C.PK_ID_item = B.PK_ID_item
      WHERE A.PKID LIKE :pkid
      ORDER BY 1
    `;

    const recTemp = await sequelizeMSQL.query(strTemp, {
      replacements: { pkid },
      type: QueryTypes.SELECT
    });

    if (recTemp.length === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan!" });
    }

    return res.status(200).json({ message: "OK", data: recTemp });
  } catch (error) {
    console.error('Error executing search:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function exportProductDetailsToExcel(req, res, next) {
  const { searchText } = req.query;

  if (!searchText) {
    return res.status(400).json({ message: "Harap pilih Kode Produk" });
  }

  try {
    const strTemp = `
      SELECT PKID, Formula, Tgl
      FROM t_NP_Sample_keluar_m
      WHERE KodeProd LIKE :searchText
        OR NamaProd LIKE :searchText
        OR Formula LIKE :searchText
    `;

    const recTemp = await sequelizeMSQL.query(strTemp, {
      replacements: { searchText: `%${searchText}%` },
      type: QueryTypes.SELECT
    });

    if (recTemp.length === 0) {
      return res.status(404).json({ message: "Data tidak ditemukan!" });
    }

    const workbook = new ExcelJS.Workbook();
    const currentDate = new Date().toISOString().split('T')[0];

    for (const record of recTemp) {
      const { PKID, Formula, Tgl } = record;

      // Create a unique sheet name
      let sheetName = Formula || `Sheet${PKID}`;
      let sheetIndex = 1;
      while (workbook.getWorksheet(sheetName)) {
        sheetName = `${Formula || `Sheet${PKID}`}_${sheetIndex}`;
        sheetIndex++;
      }

      const worksheet = workbook.addWorksheet(sheetName);

      // Format the date
      const formattedDate = moment(Tgl).format('M/D/YYYY h:mm:ss A');

      // Add header rows
      worksheet.addRow([`Formula: ${Formula}`]);
      worksheet.addRow([`Tanggal: ${formattedDate}`]);
      worksheet.addRow([]);
      worksheet.addRow(['No', 'Nama Bahan', 'Kode Bahan', 'Principles', 'Supplier', 'No. Batch', 'No. Analisa', 'Jumlah Pengambilan', 'Harga Satuan', 'Biaya']);

      // Set column widths
      worksheet.columns = [
        { width: 6 }, { width: 28 }, { width: 20 }, { width: 21 }, { width: 21 },
        { width: 16 }, { width: 17 }, { width: 18 }, { width: 14 }, { width: 11 }
      ];

      // Fetch detail data
      const detailQuery = `
        SELECT C.ItemName, C.ItemID, C.Principle, C.Supplier, C.batchno AS BatchLot, C.Analisa, B.Qty
        FROM t_NP_Sample_keluar_m A
        INNER JOIN t_NP_Sample_keluar_d B ON A.PKID = B.PKID
        LEFT JOIN t_NP_Sample_Stock C ON C.PK_ID_item = B.PK_ID_item
        WHERE A.PKID LIKE :PKID
        ORDER BY A.Tgl
      `;

      const recTemp1 = await sequelizeMSQL.query(detailQuery, {
        replacements: { PKID },
        type: QueryTypes.SELECT
      });

      // Add detail rows
      recTemp1.forEach((item, index) => {
        worksheet.addRow([
          index + 1,
          item.ItemName,
          item.ItemID,
          item.Principle,
          item.Supplier,
          item.BatchLot,
          item.Analisa,
          item.Qty,
          '', // Harga Satuan (not provided in the query)
          ''  // Biaya (not provided in the query)
        ]);
      });

      // Apply border and style
      const rowCount = recTemp1.length > 21 ? recTemp1.length + 5 : 21;
      for (let i = 4; i <= rowCount; i++) {
        const row = worksheet.getRow(i);
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }

      worksheet.getRow(4).font = { bold: true, size: 12 };
    }

    // Send the workbook as a response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=product_details_${currentDate}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting product details to Excel:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  exportProductDetailsToExcel,
  searchProducts,
  getDetailByPKID,
  generateExcelReport,
  getExpiringSoonItems,
  getBelowMinStockItems,
  cmdReport_pindahLokasi,
  cmdRefreshData_pindahLokasi,
  findHistoryByKodeBahan,
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
  loadGridMaster,
  loadGriddetil,
  searchByKodeBahan,
  handleItemPrint,
  searchNoPermintaan,
  sbCekTombolPrint,
  getBelowMinStockItemsByItemIdAndPrinciple
};