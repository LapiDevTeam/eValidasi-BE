const express = require("express");
const trxSampleRDRouter = express.Router();

const { authentication } = require("../../middlewares/authentication");
const { getStockDataByRak, getRakNotEmpty, browseItem, cmdSimpanMasuk, cmdDeleteMasuk, getStockByDate, exportStockDataToExcel } = require("../../controllers/master-vb/trx-penerimaan-pengeluaran-sampleRD.controller");

trxSampleRDRouter.get("/rak", getStockDataByRak);
trxSampleRDRouter.get("/rak-export", exportStockDataToExcel);
trxSampleRDRouter.get("/rak-not-empty", getRakNotEmpty);
trxSampleRDRouter.get("/rak-item", authentication, browseItem);
trxSampleRDRouter.get("/stockbydate", getStockByDate);

trxSampleRDRouter.post("/masuk", authentication, cmdSimpanMasuk);
trxSampleRDRouter.delete("/masuk", authentication, cmdDeleteMasuk);


module.exports = trxSampleRDRouter