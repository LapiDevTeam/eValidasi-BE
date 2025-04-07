const express = require("express");
const { authentication } = require("../../middlewares/authentication");
const masterRouter = express.Router();
const masterPembuatRouter = require("./master-pembuat");
const masterBahanAwalTemplate = require("./master-bahan-awal-template.routes");
const masterPemasokRouter = require("./master-pemasok");
const masterItemOri = require("./master-item-ori");
const masterItemBahanKemasTemplateRouter = require("./master-item-bahan-kemas-template");
const masterProductRouter = require("./master-product.routes");
const masterFormulaRouter = require("./master-formula.routes.");
const trxSampleRDRouter = require("./penerimaan-pengeluaran-sampleRD.routes");
const trxKoreksiStockRDRouter = require("./koreksi-stockRD.routes.js");
const reportRouter = require("./report.routes.js");

// masterRouter.use(authentication);

masterRouter.use("/pembuat", masterPembuatRouter);
masterRouter.use("/pemasok", masterPemasokRouter);
masterRouter.use("/product", masterProductRouter);
masterRouter.use("/item-ori", masterItemOri);
masterRouter.use(
  "/item-bahan-kemas-template",
  masterItemBahanKemasTemplateRouter
);
masterRouter.use("/item-bahan-awal-template", masterBahanAwalTemplate);
masterRouter.use("/formula", masterFormulaRouter );
masterRouter.use("/rdsample", trxSampleRDRouter );
masterRouter.use("/koreksi-stockrd", trxKoreksiStockRDRouter );
masterRouter.use("/report", reportRouter );

module.exports = masterRouter;
