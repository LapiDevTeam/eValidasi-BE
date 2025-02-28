const express = require("express");
const trxSampleRDRouter = express.Router();

const { authentication } = require("../../middlewares/authentication");
const { getStockDataByRak, getRakNotEmpty, browseItem, cmdSimpanMasuk, cmdDeleteMasuk, getStockByDate, exportStockDataToExcel, btnSaveKeluar, cekForumulaExisting, cmdApproveKeluar, cmdAddNewKeluar, btnDeleteDetail, btnPrint, getHistoryData, cmdApproveMasuk, findHistoryByKodeBahan, loadGridMaster, loadGriddetil, searchByKodeBahan, handleItemPrint, searchNoPermintaan, sbCekTombolPrint } = require("../../controllers/master-vb/trx-penerimaan-pengeluaran-sampleRD.controller");

trxSampleRDRouter.get("/rak", getStockDataByRak);
trxSampleRDRouter.get("/rak-export", exportStockDataToExcel);
trxSampleRDRouter.get("/rak-not-empty", getRakNotEmpty);
trxSampleRDRouter.get("/rak-item", authentication, browseItem);
trxSampleRDRouter.get("/stockbydate", getStockByDate);

trxSampleRDRouter.post("/masuk", authentication, cmdSimpanMasuk);
trxSampleRDRouter.delete("/masuk", authentication, cmdDeleteMasuk);
trxSampleRDRouter.post("/masuk-approve", authentication, cmdApproveMasuk);


trxSampleRDRouter.get("/keluar-no-permintaan", searchNoPermintaan);
trxSampleRDRouter.get("/keluar-grid-data", loadGridMaster);
trxSampleRDRouter.get("/keluar-grid-detail", loadGriddetil);
trxSampleRDRouter.get("/keluar-bahan", searchByKodeBahan);
trxSampleRDRouter.get("/keluar-cek-formula-exist", cekForumulaExisting);
trxSampleRDRouter.post("/keluar-save", authentication, btnSaveKeluar);
trxSampleRDRouter.post("/keluar-approve", authentication, cmdApproveKeluar);
trxSampleRDRouter.post("/keluar-detail", authentication, cmdAddNewKeluar);
trxSampleRDRouter.delete("/keluar-detail", authentication, btnDeleteDetail);
trxSampleRDRouter.get("/keluar-cekbutton", authentication, sbCekTombolPrint);

trxSampleRDRouter.post("/keluar-print", authentication, btnPrint);

trxSampleRDRouter.get("/history", getHistoryData);
trxSampleRDRouter.get("/history-bykodebahan", findHistoryByKodeBahan);
trxSampleRDRouter.get("/history-print", handleItemPrint);


module.exports = trxSampleRDRouter